import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';
import { ExportJob, ExportSettings, Clip, Track, Effect } from '../../shared/types';
import { CHUNK_DURATION_SECONDS, HardwareAccelType } from '../../shared/constants';
import { getFFmpegManager } from './ffmpegManager';
import { getEncoderForAccel } from './hardwareAcceleration';
import { createLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('ExportManager');

export interface ExportJobInternal extends ExportJob {
  tracks: Track[];
  tempFiles: string[];
}

export class ExportManager extends EventEmitter {
  private activeExports: Map<string, ExportJobInternal> = new Map();
  private exportQueue: ExportJobInternal[] = [];
  private maxConcurrentExports = 1;
  private runningExports = 0;
  private ffmpegManager = getFFmpegManager();

  /**
   * Start export job with smart rendering
   */
  async startExport(job: Omit<ExportJobInternal, 'status' | 'progress' | 'tempFiles'>): Promise<string> {
    const exportJob: ExportJobInternal = {
      ...job,
      id: uuidv4(),
      status: 'queued',
      progress: 0,
      tempFiles: [],
    };

    this.exportQueue.push(exportJob);
    this.emit('job-queued', exportJob);
    
    this.processQueue();
    
    return exportJob.id;
  }

  /**
   * Process export queue
   */
  private async processQueue() {
    while (this.runningExports < this.maxConcurrentExports && this.exportQueue.length > 0) {
      const job = this.exportQueue.shift();
      if (job) {
        this.runningExports++;
        this.executeExport(job).finally(() => {
          this.runningExports--;
          this.processQueue();
        });
      }
    }
  }

  /**
   * Execute export with smart rendering
   */
  private async executeExport(job: ExportJobInternal): Promise<void> {
    try {
      job.status = 'processing';
      job.startTime = Date.now();
      this.activeExports.set(job.id, job);
      this.emit('job-start', job);

      logger.info('Starting export', { jobId: job.id, output: job.outputPath });

      // Analyze clips to determine which need re-encoding
      const { clipsNeedingReencode, clipsForStreamCopy } = this.analyzeClips(job.tracks);

      if (clipsNeedingReencode.length === 0 && clipsForStreamCopy.length > 0) {
        // Fast path: stream copy only
        await this.exportWithStreamCopy(job, clipsForStreamCopy);
      } else {
        // Smart render: selective re-encoding
        await this.exportWithSmartRender(job, clipsNeedingReencode, clipsForStreamCopy);
      }

      job.status = 'completed';
      job.endTime = Date.now();
      job.progress = 100;
      
      logger.info('Export completed', { jobId: job.id, duration: job.endTime - job.startTime });
      this.emit('job-complete', job);
    } catch (error) {
      logger.error('Export failed', { jobId: job.id, error });
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('job-error', job, error);
    } finally {
      this.activeExports.delete(job.id);
      await this.cleanup(job);
    }
  }

  /**
   * Analyze clips to determine which need re-encoding
   */
  private analyzeClips(tracks: Track[]): {
    clipsNeedingReencode: Clip[];
    clipsForStreamCopy: Clip[];
  } {
    const clipsNeedingReencode: Clip[] = [];
    const clipsForStreamCopy: Clip[] = [];

    for (const track of tracks) {
      for (const clip of track.clips) {
        // Clip needs re-encoding if it has:
        // - Effects
        // - Transitions
        // - Transform/scaling
        // - Volume changes
        // - Trimming
        const needsReencode =
          clip.effects.length > 0 ||
          clip.transitions.in ||
          clip.transitions.out ||
          clip.transform ||
          clip.volume !== 1 ||
          clip.muted ||
          clip.trimStart > 0 ||
          clip.trimEnd !== clip.duration;

        if (needsReencode) {
          clipsNeedingReencode.push(clip);
        } else {
          clipsForStreamCopy.push(clip);
        }
      }
    }

    logger.info('Clip analysis', {
      needsReencode: clipsNeedingReencode.length,
      streamCopy: clipsForStreamCopy.length,
    });

    return { clipsNeedingReencode, clipsForStreamCopy };
  }

  /**
   * Export using stream copy (no re-encoding)
   */
  private async exportWithStreamCopy(job: ExportJobInternal, clips: Clip[]): Promise<void> {
    // Create concat file
    const concatFile = path.join(path.dirname(job.outputPath), `concat_${job.id}.txt`);
    const concatContent = clips.map((clip) => `file '${clip.mediaId}'`).join('\n');
    await fs.writeFile(concatFile, concatContent);
    job.tempFiles.push(concatFile);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy']) // Stream copy
        .output(job.outputPath)
        .on('progress', (progress) => {
          job.progress = Math.min(progress.percent || 0, 99);
          this.emit('job-progress', job);
        })
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .run();
    });
  }

  /**
   * Export with smart rendering (selective re-encoding)
   */
  private async exportWithSmartRender(
    job: ExportJobInternal,
    clipsNeedingReencode: Clip[],
    clipsForStreamCopy: Clip[]
  ): Promise<void> {
    const tempDir = path.join(path.dirname(job.outputPath), `temp_${job.id}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Process clips needing re-encoding
    const processedClips: string[] = [];
    let completedClips = 0;
    const totalClips = clipsNeedingReencode.length + clipsForStreamCopy.length;

    for (const clip of clipsNeedingReencode) {
      const tempOutput = path.join(tempDir, `clip_${clip.id}.mp4`);
      await this.processClip(clip, tempOutput, job.settings);
      processedClips.push(tempOutput);
      job.tempFiles.push(tempOutput);
      
      completedClips++;
      job.progress = Math.floor((completedClips / totalClips) * 90); // Reserve 10% for final concat
      this.emit('job-progress', job);
    }

    // Add stream copy clips
    for (const clip of clipsForStreamCopy) {
      processedClips.push(clip.mediaId);
      completedClips++;
    }

    // Concatenate all clips
    await this.concatenateClips(processedClips, job.outputPath, job.settings);
    
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  /**
   * Process individual clip with effects and transitions
   */
  private async processClip(clip: Clip, outputPath: string, settings: ExportSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(clip.mediaId);

      // Trimming
      if (clip.trimStart > 0) {
        command.seekInput(clip.trimStart);
      }
      command.duration(clip.duration);

      // Video codec
      const videoCodec = getEncoderForAccel(settings.hardwareAccel);
      command.videoCodec(videoCodec);
      command.videoBitrate(settings.videoBitrate);

      // Build video filters (including chroma key, color grading, filters)
      const videoFilters: string[] = this.buildClipFilters(clip);

      // Apply effects
      for (const effect of clip.effects) {
        const filterString = this.buildEffectFilter(effect);
        if (filterString) {
          videoFilters.push(filterString);
        }
      }

      // Apply transform
      if (clip.transform) {
        const transform = clip.transform;
        videoFilters.push(
          `scale=${transform.scaleX}*iw:${transform.scaleY}*ih`,
          `rotate=${transform.rotation}*PI/180`
        );
      }

      // Apply transitions
      if (clip.transition) {
        switch (clip.transition.type) {
          case 'fade':
            videoFilters.push(`fade=t=in:st=0:d=${clip.transition.duration}`);
            break;
          case 'dissolve':
            videoFilters.push(`fade=t=in:st=0:d=${clip.transition.duration}:alpha=1`);
            break;
          case 'wipe':
            videoFilters.push(`xfade=transition=wipeleft:duration=${clip.transition.duration}:offset=0`);
            break;
          case 'slide':
            videoFilters.push(`xfade=transition=slideleft:duration=${clip.transition.duration}:offset=0`);
            break;
          case 'zoom':
            videoFilters.push(`zoompan=z='min(zoom+0.0015,1.5)':d=${clip.transition.duration * 25}`);
            break;
        }
      }

      if (videoFilters.length > 0) {
        command.videoFilters(videoFilters);
      }

      // Audio
      command.audioCodec(settings.audioCodec);
      command.audioBitrate(settings.audioBitrate);

      if (clip.muted) {
        command.noAudio();
      } else if (clip.volume !== 1) {
        command.audioFilters(`volume=${clip.volume}`);
      }

      // Output
      command
        .output(outputPath)
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .run();
    });
  }

  /**
   * Build FFmpeg filter string for effect
   */
  private buildEffectFilter(effect: Effect): string | null {
    if (!effect.enabled) return null;

    const params = effect.parameters;

    switch (effect.type) {
      case 'brightness':
        return `eq=brightness=${params.value || 0}`;
      case 'contrast':
        return `eq=contrast=${params.value || 1}`;
      case 'saturation':
        return `eq=saturation=${params.value || 1}`;
      case 'hue':
        return `hue=h=${params.value || 0}`;
      case 'blur':
        return `boxblur=${params.radius || 5}`;
      case 'sharpen':
        return `unsharp=5:5:${params.amount || 1}`;
      case 'sepia':
        return `colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`;
      default:
        return null;
    }
  }

  /**
   * Build filters for clip including chroma key, color grading, filters
   */
  private buildClipFilters(clip: any): string[] {
    const filters: string[] = [];

    // Chroma key (green screen)
    if (clip.chromaKey?.enabled) {
      const color = clip.chromaKey.color.replace('#', '0x');
      const threshold = clip.chromaKey.threshold / 100;
      const smoothing = clip.chromaKey.smoothing / 100;
      filters.push(`chromakey=${color}:${threshold}:${smoothing}`);
    }

    // Color grading
    if (clip.brightness || clip.contrast || clip.saturation || clip.temperature) {
      const brightness = (clip.brightness || 0) / 100;
      const contrast = 1 + ((clip.contrast || 0) / 100);
      const saturation = 1 + ((clip.saturation || 0) / 100);
      filters.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
      
      // Temperature (cool to warm)
      if (clip.temperature) {
        const temp = clip.temperature / 100;
        if (temp > 0) {
          // Warm: increase red, decrease blue
          filters.push(`colorbalance=rs=${temp}:gs=0:bs=${-temp}`);
        } else {
          // Cool: decrease red, increase blue
          filters.push(`colorbalance=rs=${temp}:gs=0:bs=${-temp}`);
        }
      }
    }

    // Filters
    if (clip.filter && clip.filter !== 'none') {
      const intensity = (clip.filterIntensity || 100) / 100;
      switch (clip.filter) {
        case 'blur':
          filters.push(`boxblur=${5 * intensity}:1`);
          break;
        case 'sharpen':
          filters.push(`unsharp=5:5:${1.5 * intensity}:5:5:0`);
          break;
        case 'vintage':
          filters.push(`curves=vintage`);
          filters.push(`vignette=PI/4`);
          break;
        case 'sepia':
          filters.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`);
          break;
      }
    }

    // Opacity
    if (clip.opacity !== undefined && clip.opacity !== 100) {
      filters.push(`colorchannelmixer=aa=${clip.opacity / 100}`);
    }

    // Fade in/out
    if (clip.fadeIn) {
      filters.push(`fade=t=in:st=0:d=${clip.fadeIn}`);
    }
    if (clip.fadeOut) {
      const startTime = clip.duration - clip.fadeOut;
      filters.push(`fade=t=out:st=${startTime}:d=${clip.fadeOut}`);
    }

    return filters;
  }

  /**
   * Concatenate multiple clips into final output
   */
  private async concatenateClips(
    clipPaths: string[],
    outputPath: string,
    settings: ExportSettings
  ): Promise<void> {
    const concatFile = path.join(path.dirname(outputPath), `concat_${Date.now()}.txt`);
    const concatContent = clipPaths.map((p) => `file '${p}'`).join('\n');
    await fs.writeFile(concatFile, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .videoCodec(getEncoderForAccel(settings.hardwareAccel))
        .size(`${settings.width}x${settings.height}`)
        .fps(settings.fps)
        .videoBitrate(settings.videoBitrate)
        .audioCodec(settings.audioCodec)
        .audioBitrate(settings.audioBitrate)
        .output(outputPath)
        .on('error', (err) => {
          fs.unlink(concatFile).catch(() => {});
          reject(err);
        })
        .on('end', () => {
          fs.unlink(concatFile).catch(() => {});
          resolve();
        })
        .run();
    });
  }

  /**
   * Cancel export job
   */
  cancelExport(jobId: string): void {
    const job = this.activeExports.get(jobId);
    if (job) {
      job.status = 'cancelled';
      this.activeExports.delete(jobId);
      this.cleanup(job);
      this.emit('job-cancelled', job);
      logger.info('Export cancelled', { jobId });
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(job: ExportJobInternal): Promise<void> {
    for (const tempFile of job.tempFiles) {
      try {
        if (existsSync(tempFile)) {
          await fs.unlink(tempFile);
        }
      } catch (error) {
        logger.warn('Failed to cleanup temp file', { file: tempFile, error });
      }
    }
  }

  /**
   * Get active export count
   */
  getActiveExportCount(): number {
    return this.activeExports.size;
  }

  /**
   * Get queued export count
   */
  getQueuedExportCount(): number {
    return this.exportQueue.length;
  }
}

// Singleton instance
let exportManagerInstance: ExportManager | null = null;

export function getExportManager(): ExportManager {
  if (!exportManagerInstance) {
    exportManagerInstance = new ExportManager();
  }
  return exportManagerInstance;
}

export default ExportManager;
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { getHardwareAcceleration, detectHardwareAcceleration, HardwareAccelInfo } from './hardwareAcceleration';
import { FFmpegTask, FFmpegProgress } from '../../shared/types';
import { HardwareAccelType } from '../../shared/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('FFmpegManager');

// Set FFmpeg paths - cross-platform compatible for Windows and Linux
function getFFmpegPath(): string {
  // Try ffmpeg-static first
  if (ffmpegStatic && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }

  // Try dist folder (for packaged app)
  const ext = process.platform === 'win32' ? '.exe' : '';
  const distPath = path.join(app.getAppPath(), `../ffmpeg${ext}`);
  if (existsSync(distPath)) {
    return distPath;
  }

  // Try resources/app folder (for packaged app from ASAR)
  const resourcesPath = path.join(app.getAppPath(), `resources/app/ffmpeg${ext}`);
  if (existsSync(resourcesPath)) {
    return resourcesPath;
  }

  // Fallback to node_modules
  return path.join(app.getAppPath(), `node_modules/ffmpeg-static/ffmpeg${ext}`);
}

function getFFprobePath(): string {
  const isWin32 = process.platform === 'win32';
  const ext = isWin32 ? '.exe' : '';
  const binPath = isWin32 ? 'bin/win32/x64' : 'bin/linux/x64';
  
  // Try ffprobe-static first
  if (ffprobeStatic.path && existsSync(ffprobeStatic.path)) {
    return ffprobeStatic.path;
  }

  // Try dist/bin folder
  const distPath = path.join(app.getAppPath(), `../${binPath}/ffprobe${ext}`);
  if (existsSync(distPath)) {
    return distPath;
  }

  // Try resources/app folder
  const resourcesPath = path.join(app.getAppPath(), `resources/app/${binPath}/ffprobe${ext}`);
  if (existsSync(resourcesPath)) {
    return resourcesPath;
  }

  // Fallback to node_modules
  return path.join(app.getAppPath(), `node_modules/ffprobe-static/bin/${isWin32 ? 'win32/ia32' : 'linux/x64'}/ffprobe${ext}`);
}

const ffmpegPath = getFFmpegPath();
const ffprobePath = getFFprobePath();

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

logger.info('FFmpeg paths set', { ffmpegPath, ffprobePath });

export interface FFmpegOptions {
  hwAccel?: HardwareAccelType;
  preset?: string;
  crf?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  videoCodec?: string;
  audioCodec?: string;
  resolution?: { width: number; height: number };
  fps?: number;
  startTime?: number;
  duration?: number;
  filters?: string[];
  twoPass?: boolean;
}

class FFmpegManager extends EventEmitter {
  private activeTasks: Map<string, ChildProcess> = new Map();
  private taskQueue: FFmpegTask[] = [];
  private maxConcurrentTasks = 2;
  private runningTasks = 0;
  private hardwareAccelInfo: HardwareAccelInfo | null = null;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    try {
      this.hardwareAccelInfo = await detectHardwareAcceleration();
      logger.info('FFmpeg initialized', { hardware: this.hardwareAccelInfo });
    } catch (error) {
      logger.error('Failed to initialize FFmpeg', error);
    }
  }

  /**
   * Get media file information using ffprobe
   */
  public async getMediaInfo(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('Failed to probe media file', { filePath, error: err });
          reject(err);
          return;
        }

        // Detect file type based on extension
        const ext = path.extname(filePath).toLowerCase();
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.tiff', '.bmp', '.webp'];
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
        const audioExtensions = ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'];

        let type: 'video' | 'audio' | 'image' = 'video';
        if (imageExtensions.includes(ext)) {
          type = 'image';
        } else if (audioExtensions.includes(ext)) {
          type = 'audio';
        }

        // Extract relevant information
        const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams?.find(s => s.codec_type === 'audio');

        const mediaInfo = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: path.basename(filePath),
          path: filePath,
          type,
          duration: type === 'image' ? 5 : parseFloat(String(metadata.format?.duration || '0')),
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
          fps: type === 'video' ? this.parseFps(videoStream?.r_frame_rate) : 0,
          codec: videoStream?.codec_name || '',
          hasAudio: !!audioStream,
          fileSize: metadata.format?.size || 0,
          format: metadata.format?.format_name || '',
          createdAt: Date.now(),
          proxyStatus: 'none' as const,
        };

        resolve(mediaInfo);
      });
    });
  }

  /**
   * Parse frame rate string like "30/1" to number
   */
  private parseFps(fpsString?: string): number {
    if (!fpsString) return 30;
    const [num, den] = fpsString.split('/').map(Number);
    return den ? num / den : num;
  }

  /**
   * Validate FFmpeg installation
   */
  public async validateFFmpeg(): Promise<boolean> {
    try {
      await this.getFFmpegVersion();
      return true;
    } catch (error) {
      logger.error('FFmpeg validation failed', error);
      return false;
    }
  }

  /**
   * Get FFmpeg version
   */
  public async getFFmpegVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(ffmpegStatic as string, ['-version']);
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/ffmpeg version ([^\s]+)/);
          resolve(match ? match[1] : 'unknown');
        } else {
          reject(new Error('Failed to get FFmpeg version'));
        }
      });
    });
  }

  /**
   * Get hardware acceleration information
   */
  public getHardwareInfo(): HardwareAccelInfo | null {
    return this.hardwareAccelInfo;
  }

  /**
   * Build FFmpeg hardware acceleration arguments
   */
  private buildHwAccelArgs(hwAccel: HardwareAccelType): string[] {
    const args: string[] = [];
    
    switch (hwAccel) {
      case HardwareAccelType.NVENC:
        args.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda');
        break;
      case HardwareAccelType.QSV:
        args.push('-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv');
        break;
      case HardwareAccelType.VAAPI:
        args.push('-hwaccel', 'vaapi', '-hwaccel_output_format', 'vaapi', '-vaapi_device', '/dev/dri/renderD128');
        break;
      case HardwareAccelType.SOFTWARE:
      default:
        // No hardware acceleration
        break;
    }
    
    return args;
  }

  /**
   * Build video codec string based on hardware acceleration
   */
  private getVideoCodec(hwAccel: HardwareAccelType, defaultCodec = 'libx264'): string {
    switch (hwAccel) {
      case HardwareAccelType.NVENC:
        return 'h264_nvenc';
      case HardwareAccelType.QSV:
        return 'h264_qsv';
      case HardwareAccelType.VAAPI:
        return 'h264_vaapi';
      default:
        return defaultCodec;
    }
  }

  /**
   * Execute an FFmpeg command with progress tracking
   */
  public async executeCommand(
    taskId: string,
    inputPath: string,
    outputPath: string,
    options: FFmpegOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      // Hardware acceleration
      if (options.hwAccel && options.hwAccel !== HardwareAccelType.SOFTWARE) {
        const hwArgs = this.buildHwAccelArgs(options.hwAccel);
        hwArgs.forEach(arg => command.inputOptions(arg));
      }

      // Video codec
      const videoCodec = options.videoCodec || this.getVideoCodec(options.hwAccel || HardwareAccelType.SOFTWARE);
      command.videoCodec(videoCodec);

      // Audio codec
      if (options.audioCodec) {
        command.audioCodec(options.audioCodec);
      }

      // Resolution
      if (options.resolution) {
        command.size(`${options.resolution.width}x${options.resolution.height}`);
      }

      // FPS
      if (options.fps) {
        command.fps(options.fps);
      }

      // Bitrates
      if (options.videoBitrate) {
        command.videoBitrate(options.videoBitrate);
      }
      if (options.audioBitrate) {
        command.audioBitrate(options.audioBitrate);
      }

      // Preset and CRF
      if (options.preset) {
        command.outputOptions(`-preset ${options.preset}`);
      }
      if (options.crf !== undefined) {
        command.outputOptions(`-crf ${options.crf}`);
      }

      // Time range
      if (options.startTime !== undefined) {
        command.seekInput(options.startTime);
      }
      if (options.duration !== undefined) {
        command.duration(options.duration);
      }

      // Video filters
      if (options.filters && options.filters.length > 0) {
        command.videoFilters(options.filters);
      }

      // Output
      command.output(outputPath);

      // Progress tracking
      command.on('progress', (progress) => {
        const ffmpegProgress: FFmpegProgress = {
          percent: progress.percent || 0,
          currentTime: progress.timemark ? this.parseTimecode(progress.timemark) : 0,
          totalTime: 0, // Will be calculated from duration
          fps: progress.currentFps,
          speed: progress.currentKbps ? `${progress.currentKbps}kbps` : undefined,
        };
        
        this.emit('progress', taskId, ffmpegProgress);
      });

      // Error handling
      command.on('error', (err, stdout, stderr) => {
        logger.error('FFmpeg command failed', { taskId, error: err, stderr });
        this.activeTasks.delete(taskId);
        this.runningTasks--;
        this.processQueue();
        reject(err);
      });

      // Success
      command.on('end', () => {
        logger.info('FFmpeg command completed', { taskId });
        this.activeTasks.delete(taskId);
        this.runningTasks--;
        this.processQueue();
        resolve();
      });

      // Run the command
      try {
        command.run();
        this.activeTasks.set(taskId, command as any);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Parse timecode string to seconds
   */
  private parseTimecode(timecode: string): number {
    const parts = timecode.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Cancel an active task
   */
  public cancelTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.kill('SIGKILL');
      this.activeTasks.delete(taskId);
      this.runningTasks--;
      this.processQueue();
      logger.info('Task cancelled', { taskId });
    }
  }

  /**
   * Queue a task for execution
   */
  public queueTask(task: FFmpegTask): void {
    this.taskQueue.push(task);
    this.processQueue();
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    while (this.runningTasks < this.maxConcurrentTasks && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        this.runningTasks++;
        this.executeTask(task);
      }
    }
  }

  /**
   * Execute a queued task
   */
  private async executeTask(task: FFmpegTask): Promise<void> {
    try {
      this.emit('task-start', task);
      
      switch (task.type) {
        case 'proxy':
          // Handled by proxyGenerator
          break;
        case 'thumbnail':
          // Handled by thumbnailGenerator
          break;
        case 'waveform':
          // Handled by waveformGenerator
          break;
        case 'export':
          await this.executeCommand(task.id, task.inputPath, task.outputPath, task.options);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      this.emit('task-complete', task);
    } catch (error) {
      logger.error('Task execution failed', { task, error });
      this.emit('task-error', task, error);
    }
  }

  /**
   * Get number of running tasks
   */
  public getRunningTasksCount(): number {
    return this.runningTasks;
  }

  /**
   * Get number of queued tasks
   */
  public getQueuedTasksCount(): number {
    return this.taskQueue.length;
  }

  /**
   * Clear all tasks
   */
  public clearQueue(): void {
    this.taskQueue = [];
  }

  /**
   * Stop all active tasks
   */
  public stopAllTasks(): void {
    this.activeTasks.forEach((task, taskId) => {
      task.kill('SIGKILL');
    });
    this.activeTasks.clear();
    this.runningTasks = 0;
  }
}

// Singleton instance
let ffmpegManagerInstance: FFmpegManager | null = null;

export function getFFmpegManager(): FFmpegManager {
  if (!ffmpegManagerInstance) {
    ffmpegManagerInstance = new FFmpegManager();
  }
  return ffmpegManagerInstance;
}

export default FFmpegManager;
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';
import { PROXY_RESOLUTION_WIDTH, PROXY_RESOLUTION_HEIGHT } from '../../shared/constants';
import { HardwareAccelType } from '../../shared/constants';
import { getEncoderForAccel } from './hardwareAcceleration';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProxyGenerator');

export interface ProxyGeneratorOptions {
  inputPath: string;
  outputPath: string;
  quality?: 'low' | 'medium' | 'high';
  hwAccel?: HardwareAccelType;
}

export interface ProxyProgress {
  percent: number;
  currentTime: number;
  totalTime: number;
}

export class ProxyGenerator extends EventEmitter {
  private activeProxies: Map<string, any> = new Map();

  /**
   * Generate a proxy file for 4K video editing
   */
  async generateProxy(options: ProxyGeneratorOptions): Promise<string> {
    const { inputPath, outputPath, quality = 'medium', hwAccel = HardwareAccelType.SOFTWARE } = options;

    // Check if proxy already exists
    if (existsSync(outputPath)) {
      logger.info('Proxy already exists', { outputPath });
      return outputPath;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      // Quality settings
      const qualitySettings = this.getQualitySettings(quality);
      const videoCodec = getEncoderForAccel(hwAccel);

      const command = ffmpeg(inputPath)
        .videoCodec(videoCodec)
        .size(`${PROXY_RESOLUTION_WIDTH}x${PROXY_RESOLUTION_HEIGHT}`)
        .videoBitrate(qualitySettings.bitrate)
        .outputOptions([
          `-preset ${qualitySettings.preset}`,
          `-crf ${qualitySettings.crf}`,
        ])
        .audioCodec('aac')
        .audioBitrate('128k')
        .output(outputPath);

      // Hardware acceleration
      if (hwAccel !== HardwareAccelType.SOFTWARE) {
        command.inputOptions(this.getHwAccelOptions(hwAccel));
      }

      // Progress tracking
      command.on('progress', (progress) => {
        const proxyProgress: ProxyProgress = {
          percent: progress.percent || 0,
          currentTime: progress.timemark ? this.parseTimecode(progress.timemark) : 0,
          totalTime: 0,
        };
        this.emit('progress', inputPath, proxyProgress);
      });

      // Error handling
      command.on('error', (err) => {
        logger.error('Proxy generation failed', { inputPath, error: err });
        this.activeProxies.delete(inputPath);
        reject(err);
      });

      // Success
      command.on('end', () => {
        logger.info('Proxy generated successfully', { inputPath, outputPath });
        this.activeProxies.delete(inputPath);
        this.emit('complete', inputPath, outputPath);
        resolve(outputPath);
      });

      // Run command
      try {
        command.run();
        this.activeProxies.set(inputPath, command);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Cancel proxy generation
   */
  cancelProxy(inputPath: string): void {
    const command = this.activeProxies.get(inputPath);
    if (command) {
      command.kill('SIGKILL');
      this.activeProxies.delete(inputPath);
      logger.info('Proxy generation cancelled', { inputPath });
    }
  }

  /**
   * Get quality settings based on quality level
   */
  private getQualitySettings(quality: 'low' | 'medium' | 'high') {
    switch (quality) {
      case 'low':
        return { bitrate: '1M', crf: 28, preset: 'veryfast' };
      case 'high':
        return { bitrate: '4M', crf: 20, preset: 'medium' };
      case 'medium':
      default:
        return { bitrate: '2M', crf: 23, preset: 'fast' };
    }
  }

  /**
   * Get hardware acceleration options
   */
  private getHwAccelOptions(hwAccel: HardwareAccelType): string[] {
    switch (hwAccel) {
      case HardwareAccelType.NVENC:
        return ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'];
      case HardwareAccelType.QSV:
        return ['-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv'];
      case HardwareAccelType.VAAPI:
        return ['-hwaccel', 'vaapi', '-hwaccel_output_format', 'vaapi', '-vaapi_device', '/dev/dri/renderD128'];
      default:
        return [];
    }
  }

  /**
   * Parse timecode to seconds
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
   * Get number of active proxy generations
   */
  getActiveCount(): number {
    return this.activeProxies.size;
  }
}
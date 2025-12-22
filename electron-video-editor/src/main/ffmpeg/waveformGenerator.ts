import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import crypto from 'crypto';

const logger = createLogger('WaveformGenerator');

export interface WaveformOptions {
  audioPath: string;
  outputPath: string;
  width?: number;
  height?: number;
  colors?: {
    foreground?: string;
    background?: string;
  };
}

export class WaveformGenerator extends EventEmitter {
  /**
   * Generate audio waveform visualization
   */
  async generateWaveform(options: WaveformOptions): Promise<string> {
    const {
      audioPath,
      outputPath,
      width = 1920,
      height = 120,
      colors = { foreground: 'white', background: 'transparent' },
    } = options;

    // Check if waveform already exists
    if (existsSync(outputPath)) {
      logger.info('Waveform already exists', { outputPath });
      return outputPath;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const filter = [
        'aformat=channel_layouts=mono',
        `showwavespic=s=${width}x${height}:colors=${colors.foreground}`,
      ].join(',');

      ffmpeg(audioPath)
        .outputOptions([
          '-filter_complex',
          filter,
          '-frames:v',
          '1',
        ])
        .output(outputPath)
        .on('error', (err) => {
          logger.error('Waveform generation failed', { audioPath, error: err });
          reject(err);
        })
        .on('end', () => {
          logger.info('Waveform generated', { outputPath });
          this.emit('complete', audioPath, outputPath);
          resolve(outputPath);
        })
        .run();
    });
  }

  /**
   * Generate animated waveform (video)
   */
  async generateAnimatedWaveform(options: WaveformOptions & { duration: number }): Promise<string> {
    const {
      audioPath,
      outputPath,
      duration,
      width = 1920,
      height = 120,
      colors = { foreground: 'white', background: '0x00000000' },
    } = options;

    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const filter = [
        'aformat=channel_layouts=mono',
        `showwaves=s=${width}x${height}:mode=cline:colors=${colors.foreground}`,
      ].join(',');

      ffmpeg(audioPath)
        .outputOptions([
          '-filter_complex',
          filter,
          '-pix_fmt',
          'yuva420p', // Support transparency
        ])
        .duration(duration)
        .output(outputPath)
        .on('progress', (progress) => {
          this.emit('progress', audioPath, progress.percent || 0);
        })
        .on('error', (err) => {
          logger.error('Animated waveform generation failed', { audioPath, error: err });
          reject(err);
        })
        .on('end', () => {
          logger.info('Animated waveform generated', { outputPath });
          resolve(outputPath);
        })
        .run();
    });
  }

  /**
   * Extract audio peaks data for custom waveform rendering
   */
  async extractAudioPeaks(
    audioPath: string,
    sampleRate: number = 8000
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const peaks: number[] = [];
      
      ffmpeg(audioPath)
        .audioFilters(`aresample=${sampleRate}`)
        .audioCodec('pcm_s16le')
        .format('s16le')
        .on('error', (err) => {
          logger.error('Audio peak extraction failed', { audioPath, error: err });
          reject(err);
        })
        .pipe()
        .on('data', (chunk: Buffer) => {
          // Convert PCM data to peaks
          for (let i = 0; i < chunk.length; i += 2) {
            const sample = chunk.readInt16LE(i);
            peaks.push(Math.abs(sample) / 32768); // Normalize to 0-1
          }
        })
        .on('end', () => {
          logger.info('Audio peaks extracted', { samples: peaks.length });
          resolve(peaks);
        });
    });
  }

  /**
   * Generate waveform for specific time range
   */
  async generateWaveformSegment(
    audioPath: string,
    outputPath: string,
    startTime: number,
    duration: number,
    width: number = 1920,
    height: number = 120
  ): Promise<string> {
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .seekInput(startTime)
        .duration(duration)
        .outputOptions([
          '-filter_complex',
          `aformat=channel_layouts=mono,showwavespic=s=${width}x${height}`,
          '-frames:v',
          '1',
        ])
        .output(outputPath)
        .on('error', (err) => {
          logger.error('Waveform segment generation failed', { audioPath, error: err });
          reject(err);
        })
        .on('end', () => {
          logger.info('Waveform segment generated', { outputPath });
          resolve(outputPath);
        })
        .run();
    });
  }
}
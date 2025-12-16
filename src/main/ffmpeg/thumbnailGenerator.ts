import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';
import { THUMBNAIL_INTERVAL_SECONDS } from '../../shared/constants';
import { createLogger } from '../utils/logger';
import crypto from 'crypto';

const logger = createLogger('ThumbnailGenerator');

export interface ThumbnailOptions {
  videoPath: string;
  outputDir: string;
  timestamp?: number; // seconds
  width?: number;
  height?: number;
}

export class ThumbnailGenerator extends EventEmitter {
  /**
   * Generate a single thumbnail at specific timestamp
   */
  async generateThumbnail(options: ThumbnailOptions): Promise<string> {
    const { videoPath, outputDir, timestamp = 0, width = 160, height = 90 } = options;

    // Validate videoPath
    if (!videoPath || typeof videoPath !== 'string') {
      throw new Error(`Invalid videoPath: ${videoPath}`);
    }

    // Create unique filename
    const hash = crypto.createHash('md5').update(videoPath).digest('hex').substring(0, 8);
    const fileName = `thumb_${hash}_${Math.floor(timestamp)}.jpg`;
    const outputPath = path.join(outputDir, fileName);

    // Check if thumbnail already exists
    if (existsSync(outputPath)) {
      return outputPath;
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .outputOptions([
          '-vframes 1',
          '-q:v 2', // Quality (1-31, lower is better)
        ])
        .size(`${width}x${height}`)
        .output(outputPath)
        .on('error', (err) => {
          logger.error('Thumbnail generation failed', { videoPath, timestamp, error: err });
          reject(err);
        })
        .on('end', () => {
          logger.info('Thumbnail generated', { outputPath });
          resolve(outputPath);
        })
        .run();
    });
  }

  /**
   * Generate multiple thumbnails at regular intervals (1 per second)
   */
  async generateThumbnails(videoPath: string, outputDir: string, duration: number): Promise<string[]> {
    const thumbnails: string[] = [];
    const interval = THUMBNAIL_INTERVAL_SECONDS;
    const count = Math.floor(duration / interval);

    logger.info('Generating thumbnails', { videoPath, count });

    // Generate thumbnails in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < count; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, count); j++) {
        const timestamp = j * interval;
        batch.push(
          this.generateThumbnail({
            videoPath,
            outputDir,
            timestamp,
          })
        );
      }

      const batchResults = await Promise.allSettled(batch);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          thumbnails.push(result.value);
        }
      });

      // Emit progress
      const progress = Math.min(((i + batchSize) / count) * 100, 100);
      this.emit('progress', videoPath, progress);
    }

    this.emit('complete', videoPath, thumbnails);
    return thumbnails;
  }

  /**
   * Generate preview thumbnail (first frame)
   */
  async generatePreviewThumbnail(videoPath: string, outputDir: string): Promise<string> {
    return this.generateThumbnail({
      videoPath,
      outputDir,
      timestamp: 1, // 1 second in to avoid black frames
      width: 320,
      height: 180,
    });
  }

  /**
   * Pick best thumbnail candidates from video
   * Uses scene detection to find visually interesting frames
   */
  async pickBestThumbnails(
    videoPath: string,
    outputDir: string,
    count: number = 5
  ): Promise<string[]> {
    const outputPattern = path.join(outputDir, `best_thumb_%03d.jpg`);

    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-vf thumbnail',
          `-frames:v ${count}`,
          '-q:v 2',
        ])
        .output(outputPattern)
        .on('error', (err) => {
          logger.error('Best thumbnail picking failed', { videoPath, error: err });
          reject(err);
        })
        .on('end', async () => {
          // Read generated thumbnails
          const files = await fs.readdir(outputDir);
          const thumbnails = files
            .filter((f) => f.startsWith('best_thumb_'))
            .map((f) => path.join(outputDir, f));
          
          logger.info('Best thumbnails picked', { count: thumbnails.length });
          resolve(thumbnails);
        })
        .run();
    });
  }
}
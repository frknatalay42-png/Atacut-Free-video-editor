import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { app } from 'electron';
import { CACHE_DIR_NAME, THUMBNAILS_DIR, PROXIES_DIR, WAVEFORMS_DIR, LOGS_DIR } from '../../shared/constants';
import { createLogger } from '../utils/logger';
import crypto from 'crypto';

const logger = createLogger('CacheManager');

export class CacheManager {
  private cacheDir: string;
  private thumbnailsDir: string;
  private proxiesDir: string;
  private waveformsDir: string;
  private logsDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.cacheDir = path.join(userDataPath, CACHE_DIR_NAME);
    this.thumbnailsDir = path.join(this.cacheDir, THUMBNAILS_DIR);
    this.proxiesDir = path.join(this.cacheDir, PROXIES_DIR);
    this.waveformsDir = path.join(this.cacheDir, WAVEFORMS_DIR);
    this.logsDir = path.join(this.cacheDir, LOGS_DIR);
    
    this.initialize();
  }

  private async initialize() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      await fs.mkdir(this.proxiesDir, { recursive: true });
      await fs.mkdir(this.waveformsDir, { recursive: true });
      await fs.mkdir(this.logsDir, { recursive: true });
      logger.info('Cache directories initialized', { cacheDir: this.cacheDir });
    } catch (error) {
      logger.error('Failed to initialize cache directories', error);
    }
  }

  /**
   * Get cache directory paths
   */
  getPaths() {
    return {
      cache: this.cacheDir,
      thumbnails: this.thumbnailsDir,
      proxies: this.proxiesDir,
      waveforms: this.waveformsDir,
      logs: this.logsDir,
    };
  }

  /**
   * Generate cache key from file path
   */
  private generateCacheKey(filePath: string): string {
    return crypto.createHash('md5').update(filePath).digest('hex');
  }

  /**
   * Get thumbnail path for media file
   */
  getThumbnailPath(mediaId: string, timestamp?: number): string {
    const key = this.generateCacheKey(mediaId);
    const suffix = timestamp !== undefined ? `_${Math.floor(timestamp)}` : '';
    return path.join(this.thumbnailsDir, `${key}${suffix}.jpg`);
  }

  /**
   * Get proxy path for media file
   */
  getProxyPath(mediaId: string): string {
    const key = this.generateCacheKey(mediaId);
    return path.join(this.proxiesDir, `${key}_proxy.mp4`);
  }

  /**
   * Get waveform path for media file
   */
  getWaveformPath(mediaId: string): string {
    const key = this.generateCacheKey(mediaId);
    return path.join(this.waveformsDir, `${key}_waveform.png`);
  }

  /**
   * Check if cached item exists
   */
  exists(cachePath: string): boolean {
    return existsSync(cachePath);
  }

  /**
   * Get cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    try {
      let totalSize = 0;
      const dirs = [this.thumbnailsDir, this.proxiesDir, this.waveformsDir];

      for (const dir of dirs) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = statSync(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      logger.error('Failed to calculate cache size', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      await fs.rm(this.thumbnailsDir, { recursive: true, force: true });
      await fs.rm(this.proxiesDir, { recursive: true, force: true });
      await fs.rm(this.waveformsDir, { recursive: true, force: true });
      
      // Recreate directories
      await this.initialize();
      
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', error);
      throw error;
    }
  }

  /**
   * Clear thumbnails only
   */
  async clearThumbnails(): Promise<void> {
    try {
      await fs.rm(this.thumbnailsDir, { recursive: true, force: true });
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      logger.info('Thumbnails cleared');
    } catch (error) {
      logger.error('Failed to clear thumbnails', error);
      throw error;
    }
  }

  /**
   * Clear proxies only
   */
  async clearProxies(): Promise<void> {
    try {
      await fs.rm(this.proxiesDir, { recursive: true, force: true });
      await fs.mkdir(this.proxiesDir, { recursive: true });
      logger.info('Proxies cleared');
    } catch (error) {
      logger.error('Failed to clear proxies', error);
      throw error;
    }
  }

  /**
   * Clear waveforms only
   */
  async clearWaveforms(): Promise<void> {
    try {
      await fs.rm(this.waveformsDir, { recursive: true, force: true });
      await fs.mkdir(this.waveformsDir, { recursive: true });
      logger.info('Waveforms cleared');
    } catch (error) {
      logger.error('Failed to clear waveforms', error);
      throw error;
    }
  }

  /**
   * Clean old cache files (older than specified days)
   */
  async cleanOldCache(daysOld: number = 30): Promise<void> {
    try {
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      const dirs = [this.thumbnailsDir, this.proxiesDir, this.waveformsDir];
      let deletedCount = 0;

      for (const dir of dirs) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = statSync(filePath);
          
          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }

      logger.info('Old cache files cleaned', { deletedCount, daysOld });
    } catch (error) {
      logger.error('Failed to clean old cache', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalSize: number;
    thumbnailCount: number;
    proxyCount: number;
    waveformCount: number;
  }> {
    try {
      const [thumbnails, proxies, waveforms] = await Promise.all([
        fs.readdir(this.thumbnailsDir),
        fs.readdir(this.proxiesDir),
        fs.readdir(this.waveformsDir),
      ]);

      const totalSize = await this.getCacheSize();

      return {
        totalSize,
        thumbnailCount: thumbnails.length,
        proxyCount: proxies.length,
        waveformCount: waveforms.length,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return {
        totalSize: 0,
        thumbnailCount: 0,
        proxyCount: 0,
        waveformCount: 0,
      };
    }
  }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

export default CacheManager;
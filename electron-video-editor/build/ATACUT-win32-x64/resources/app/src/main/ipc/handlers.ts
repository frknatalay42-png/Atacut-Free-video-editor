import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';
import { getProjectManager } from '../storage/projectManager';
import { getExportManager } from '../ffmpeg/exportManager';
import { getCacheManager } from '../storage/cacheManager';
import { getRecoveryManager } from '../storage/recoveryManager';
import { getFFmpegManager } from '../ffmpeg/ffmpegManager';
import { ProxyGenerator } from '../ffmpeg/proxyGenerator';
import { ThumbnailGenerator } from '../ffmpeg/thumbnailGenerator';
import { WaveformGenerator } from '../ffmpeg/waveformGenerator';
import { detectHardwareAcceleration } from '../ffmpeg/hardwareAcceleration';
import { createLogger } from '../utils/logger';
import { Project, ExportJob, MediaFile } from '../../shared/types';

const logger = createLogger('IPCHandlers');

const projectManager = getProjectManager();
const exportManager = getExportManager();
const cacheManager = getCacheManager();
const recoveryManager = getRecoveryManager();
const ffmpegManager = getFFmpegManager();
const proxyGenerator = new ProxyGenerator();
const thumbnailGenerator = new ThumbnailGenerator();
const waveformGenerator = new WaveformGenerator();

export function setupIpcHandlers(mainWindow: BrowserWindow) {
  logger.info('Setting up IPC handlers');

  // ============================================================================
  // PROJECT MANAGEMENT
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.PROJECT_NEW, async (event, name: string, template?: string) => {
    try {
      return await projectManager.createProject(name, template);
    } catch (error) {
      logger.error('Failed to create project', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_OPEN, async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'Video Editor Projects', extensions: ['veproj'] }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return await projectManager.loadProject(result.filePaths[0]);
      }
      return null;
    } catch (error) {
      logger.error('Failed to open project', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_SAVE, async (event, project: Project, path?: string) => {
    try {
      return await projectManager.saveProject(project, path);
    } catch (error) {
      logger.error('Failed to save project', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_SAVE_AS, async (event, project: Project) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'Video Editor Projects', extensions: ['veproj'] }],
        defaultPath: project.name,
      });

      if (!result.canceled && result.filePath) {
        return await projectManager.saveProject(project, result.filePath);
      }
      return null;
    } catch (error) {
      logger.error('Failed to save project as', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_SNAPSHOT, async (event, project: Project) => {
    try {
      return await projectManager.createSnapshot(project);
    } catch (error) {
      logger.error('Failed to create snapshot', error);
      throw error;
    }
  });

  // ============================================================================
  // MEDIA MANAGEMENT
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.IMPORT_MEDIA_DIALOG, async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [
          { name: 'All Media', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'heic', 'tiff', 'mp3', 'wav', 'aac', 'm4a', 'ogg'] },
          { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'heic', 'tiff', 'bmp', 'webp'] },
          { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'] },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        // Get real media info using ffprobe
        logger.info('Importing files:', result.filePaths);
        const mediaFiles = await Promise.all(
          result.filePaths.map(async (filePath) => {
            try {
              logger.info('Getting media info for:', filePath);
              const mediaInfo = await ffmpegManager.getMediaInfo(filePath);
              logger.info('Media info retrieved:', { path: filePath, duration: mediaInfo.duration, type: mediaInfo.type });
              return {
                path: mediaInfo.path,
                name: mediaInfo.name,
                type: mediaInfo.type,
                duration: mediaInfo.duration,
                width: mediaInfo.width,
                height: mediaInfo.height,
                fps: mediaInfo.fps,
                codec: mediaInfo.codec,
                bitrate: 5000000, // Default bitrate
              };
            } catch (error) {
              logger.error('Failed to get media info for', filePath, error);
              // Fallback to basic info if ffprobe fails
              const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
              const ext = fileName.split('.').pop()?.toLowerCase() || '';
              logger.warn('Using fallback duration of 30s for:', fileName);
              return {
                path: filePath,
                name: fileName,
                type: ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) ? 'video' : 
                      ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : 'audio',
                duration: 30,
                width: 1920,
                height: 1080,
                fps: 30,
                codec: 'h264',
                bitrate: 5000000,
              };
            }
          })
        );

        return { success: true, data: mediaFiles };
      }

      return { success: false, data: [] };
    } catch (error) {
      logger.error('Failed to import media', error);
      return { success: false, data: [], error: (error as Error).message };
    }
  });

  // Original implementation with FFprobe (disabled for now)
  ipcMain.handle('IMPORT_MEDIA_DIALOG_FFPROBE', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [
          { name: 'All Media', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'heic', 'tiff', 'mp3', 'wav', 'aac', 'm4a', 'ogg'] },
          { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'heic', 'tiff', 'bmp', 'webp'] },
          { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'] },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        // Get media info for each file
        const mediaFiles = await Promise.all(
          result.filePaths.map(async (filePath) => {
            try {
              const info = await ffmpegManager.getMediaInfo(filePath);
              return {
                success: true,
                data: info
              };
            } catch (error) {
              logger.error(`Failed to get info for ${filePath}`, error);
              return {
                success: false,
                data: null
              };
            }
          })
        );
        
        return {
          success: true,
          data: mediaFiles.filter(f => f.success).map(f => f.data)
        };
      }
      return { success: false, data: [] };
    } catch (error) {
      logger.error('Failed to open media dialog', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_MEDIA_INFO, async (event, filePath: string) => {
    try {
      return await ffmpegManager.getMediaInfo(filePath);
    } catch (error) {
      logger.error('Failed to get media info', error);
      throw error;
    }
  });

  // Simple handler for drag-dropped files (mock version)
  ipcMain.handle('GET_VIDEO_INFO', async (event, filePath: string) => {
    try {
      // Get real media info using ffprobe
      const mediaInfo = await ffmpegManager.getMediaInfo(filePath);
      
      return {
        success: true,
        data: {
          path: mediaInfo.path,
          name: mediaInfo.name,
          type: mediaInfo.type,
          duration: mediaInfo.duration,
          width: mediaInfo.width,
          height: mediaInfo.height,
          fps: mediaInfo.fps,
          codec: mediaInfo.codec,
          bitrate: 5000000, // Default bitrate
        }
      };
    } catch (error) {
      logger.error('Failed to get video info', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ============================================================================
  // PROXY GENERATION
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.GENERATE_PROXY, async (event, mediaFile: MediaFile) => {
    try {
      const outputPath = cacheManager.getProxyPath(mediaFile.id);
      
      proxyGenerator.on('progress', (inputPath, progress) => {
        mainWindow.webContents.send(IPC_CHANNELS.PROXY_PROGRESS, mediaFile.id, progress);
      });

      const proxyPath = await proxyGenerator.generateProxy({
        inputPath: mediaFile.path,
        outputPath,
        quality: 'medium',
      });

      mainWindow.webContents.send(IPC_CHANNELS.PROXY_COMPLETE, mediaFile.id, proxyPath);
      return proxyPath;
    } catch (error) {
      logger.error('Failed to generate proxy', error);
      throw error;
    }
  });

  // ============================================================================
  // THUMBNAIL GENERATION
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.GENERATE_THUMBNAIL, async (event, data: any) => {
    try {
      // Support both old format (MediaFile) and new format ({ inputPath, outputDir, count })
      let videoPath: string;
      let outputDir: string;
      let mediaId: string | undefined;
      
      if (typeof data === 'object' && data.inputPath) {
        // New format: { inputPath, outputDir, count }
        videoPath = data.inputPath;
        outputDir = data.outputDir || cacheManager.getPaths().thumbnails;
        
        // Validate path
        if (!videoPath) {
          throw new Error('inputPath is required');
        }
        
        logger.info('Generating thumbnail for:', videoPath);
      } else if (typeof data === 'object' && data.path) {
        // Old format: MediaFile
        videoPath = data.path;
        outputDir = cacheManager.getPaths().thumbnails;
        mediaId = data.id;
      } else {
        throw new Error('Invalid thumbnail generation request format');
      }
      
      const thumbnailPath = await thumbnailGenerator.generatePreviewThumbnail(
        videoPath,
        outputDir
      );

      if (mediaId) {
        mainWindow.webContents.send(IPC_CHANNELS.THUMBNAIL_COMPLETE, mediaId, thumbnailPath);
      }
      
      return { success: true, data: [thumbnailPath] };
    } catch (error) {
      logger.error('Failed to generate thumbnail', { code: error.code });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTO_THUMBNAIL_PICKER, async (event, mediaFile: MediaFile) => {
    try {
      const outputDir = cacheManager.getPaths().thumbnails;
      const thumbnails = await thumbnailGenerator.pickBestThumbnails(
        mediaFile.path,
        outputDir,
        5
      );
      return thumbnails;
    } catch (error) {
      logger.error('Failed to pick best thumbnails', error);
      throw error;
    }
  });

  // ============================================================================
  // WAVEFORM GENERATION
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.GENERATE_WAVEFORM, async (event, mediaFile: MediaFile) => {
    try {
      const outputPath = cacheManager.getWaveformPath(mediaFile.id);
      
      const waveformPath = await waveformGenerator.generateWaveform({
        audioPath: mediaFile.path,
        outputPath,
      });

      mainWindow.webContents.send(IPC_CHANNELS.WAVEFORM_COMPLETE, mediaFile.id, waveformPath);
      return waveformPath;
    } catch (error) {
      logger.error('Failed to generate waveform', error);
      throw error;
    }
  });

  // ============================================================================
  // EXPORT
  // ============================================================================

  // Full export handler with FFmpeg rendering - IMPROVED VERSION
  ipcMain.handle('EXPORT_VIDEO', async (event, exportData: any) => {
    try {
      logger.info('🎬 Starting video export', { 
        clips: exportData.clips?.length, 
        settings: exportData.settings 
      });

      const path = require('path');
      const fs = require('fs').promises;
      const { existsSync, mkdirSync } = require('fs');
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegStatic = require('ffmpeg-static');
      const ffprobeStatic = require('ffprobe-static');
      
      // Set FFmpeg paths
      ffmpeg.setFfmpegPath(ffmpegStatic);
      ffmpeg.setFfprobePath(ffprobeStatic.path);

      // Ensure exports directory exists in app userData (correct location)
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      const exportsDir = path.join(userDataPath, 'exports');
      
      if (!existsSync(exportsDir)) {
        mkdirSync(exportsDir, { recursive: true });
      }

      // Create timestamped export file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const outputPath = path.join(exportsDir, `video-export-${timestamp}.mp4`);

      logger.info('📁 Export directory', { exportsDir, outputPath });

      if (!exportData.clips || exportData.clips.length === 0) {
        throw new Error('No clips to export');
      }

      // Normalize and validate clip paths - KEEP text clips for rendering
      const normalizedClips = exportData.clips
        .map((clip: any) => {
          // Handle text clips
          if (clip.isTextClip) {
            logger.info('✅ Text clip found', {
              text: clip.text,
              fontSize: clip.fontSize,
              fontFamily: clip.fontFamily,
              textColor: clip.textColor,
              duration: clip.duration,
            });
            return {
              isTextClip: true,
              text: clip.text,
              fontSize: clip.fontSize || 32,
              fontFamily: clip.fontFamily || 'Arial',
              textColor: clip.textColor || '#FFFFFF',
              textAlign: clip.textAlign || 'center',
              textPositionX: clip.textPositionX || 0,
              textPositionY: clip.textPositionY || 0,
              textAnimation: clip.textAnimation || 'none',
              textStrokeColor: clip.textStrokeColor,
              textStrokeWidth: clip.textStrokeWidth || 0,
              duration: clip.duration || 5,
              startTime: clip.startTime || 0,
            };
          }

          // Handle video clips
          let fsPath = clip.path || clip.mediaPath;
          
          // Validate we have a path
          if (!fsPath) {
            logger.warn('⚠️ Clip has no path', { clip });
            return null;
          }
          
          // Remove file:// protocol
          if (fsPath.startsWith('file:///')) {
            fsPath = decodeURI(fsPath.replace('file:///', ''));
          } else if (fsPath.startsWith('file://')) {
            fsPath = decodeURI(fsPath.replace('file://', ''));
          }

          // Validate file exists
          if (!existsSync(fsPath)) {
            logger.warn('⚠️ Clip file not found', { fsPath });
            return null;
          }

          // Calculate actual duration from trim points
          const trimStart = clip.trimStart || 0;
          const trimEnd = clip.trimEnd || clip.duration || 0;
          const actualDuration = trimEnd - trimStart;

          logger.info('✅ Valid clip', { 
            fsPath, 
            duration: clip.duration,
            trimStart,
            trimEnd,
            actualDuration,
            // Log all properties that will be applied
            volume: clip.volume,
            speed: clip.speed,
            opacity: clip.opacity,
            brightness: clip.brightness,
            contrast: clip.contrast,
            saturation: clip.saturation,
            filter: clip.filter,
            fadeIn: clip.fadeIn,
            fadeOut: clip.fadeOut,
            transition: clip.transition ? clip.transition.type : 'none',
            effects: clip.effects?.length || 0,
            keyframes: clip.keyframes?.length || 0,
          });
          return {
            path: fsPath,
            duration: clip.duration,
            trimStart: trimStart,
            trimEnd: trimEnd,
            actualDuration: actualDuration,
            // Video properties
            volume: clip.volume || 100,
            muted: clip.muted || false,
            speed: clip.speed || 1,
            opacity: clip.opacity || 100,
            // Color grading
            brightness: clip.brightness || 0,
            contrast: clip.contrast || 0,
            saturation: clip.saturation || 0,
            temperature: clip.temperature || 0,
            // Filters
            filter: clip.filter || 'none',
            filterIntensity: clip.filterIntensity || 0,
            // Fade
            fadeIn: clip.fadeIn || 0,
            fadeOut: clip.fadeOut || 0,
            // Transition
            transition: clip.transition,
            // Effects and keyframes
            effects: clip.effects || [],
            keyframes: clip.keyframes || [],
            // Chroma key
            chromaKey: clip.chromaKey,
          };
        })
        .filter((clip: any) => clip !== null);

      if (normalizedClips.length === 0) {
        throw new Error('No valid video or text clips found');
      }

      // Separate video and text clips, and filter out nulls
      const videoClips = normalizedClips.filter((c: any) => c && !c.isTextClip);
      const textClips = normalizedClips.filter((c: any) => c && c.isTextClip);

      if (videoClips.length === 0 && textClips.length === 0) {
        throw new Error('No valid clips found after filtering');
      }

      logger.info(`📹 Processing ${videoClips.length} video clips + ${textClips.length} text clips`);
      
      if (textClips.length > 0) {
        logger.info('📝 Text clips found:', textClips.map((t: any) => ({
          text: t.text,
          duration: t.duration,
          color: t.textColor,
          fontSize: t.fontSize,
        })));
      }

      return new Promise((resolve, reject) => {
        // Validate we have video clips
        if (videoClips.length === 0) {
          return reject(new Error('No video clips to export'));
        }

        // Create FFmpeg command
        const command = ffmpeg();

        // Add all VIDEO clips as inputs with trim applied
        videoClips.forEach((clip: any, index: number) => {
          logger.info(`Adding video input ${index}`, { 
            path: clip.path,
            trimStart: clip.trimStart,
            trimEnd: clip.trimEnd,
            actualDuration: clip.actualDuration
          });
          
          // Use -ss (seek) to start at trimStart, and limit with trimmed duration
          // This is more efficient than using trim filter
          command
            .input(clip.path)
            .inputOptions([
              '-ss', clip.trimStart.toString(),
              '-to', clip.trimEnd.toString(),
            ]);
        });

        // Build filter complex for concatenation with color grading
        const n = videoClips.length;

        // Helper to build color grading filter
        const buildColorFilter = (clip: any, inputLabel: string): string => {
          let filters = [];
          
          // Brightness: -100 to 100 -> 0.0 to 2.0
          if (clip.brightness) {
            const brightness = 1 + (clip.brightness / 100) * 0.5;
            filters.push(`eq=brightness=${brightness}`);
          }
          
          // Contrast: -100 to 100 -> 0.0 to 2.0
          if (clip.contrast) {
            const contrast = 1 + (clip.contrast / 100) * 0.5;
            filters.push(`eq=contrast=${contrast}`);
          }
          
          // Saturation: -100 to 100 -> 0.0 to 2.0
          if (clip.saturation) {
            const saturation = 1 + (clip.saturation / 100) * 0.5;
            filters.push(`eq=saturation=${saturation}`);
          }

          // Opacity via scale with alpha (if applicable)
          if (clip.opacity && clip.opacity < 100) {
            filters.push(`eval=init(f=0\\;):expr_option=${clip.opacity / 100}`);
          }

          // Speed adjustment via setpts filter
          if (clip.speed && clip.speed !== 1) {
            filters.push(`setpts=PTS/${clip.speed}`);
          }

          // Filter effects (blur, sharpen, vintage, sepia)
          if (clip.filter && clip.filter !== 'none') {
            const intensity = (clip.filterIntensity || 50) / 100;
            switch (clip.filter) {
              case 'blur':
                filters.push(`boxblur=${Math.round(intensity * 5)}`);
                break;
              case 'sharpen':
                filters.push(`unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=${intensity}`);
                break;
              case 'sepia':
                filters.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`);
                break;
              case 'vintage':
                filters.push(`split=2[a][b];[b]colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131[b];[a][b]blend=all_mode=screen:all_opacity=0.5`);
                break;
            }
          }

          if (filters.length === 0) {
            return inputLabel;
          }

          return filters.length > 0 
            ? `${inputLabel}${filters.map(f => f).join(',')}` 
            : inputLabel;
        };

        // Helper to add text overlay
        const buildTextOverlay = (textClips: any[]): string => {
          if (textClips.length === 0) return '';
          
          let textFilters = [];
          
          for (const textClip of textClips) {
            // Escape special characters in text for FFmpeg drawtext filter
            // The drawtext filter requires specific escaping for special chars
            let escapedText = (textClip.text || '')
              .replace(/\\/g, '\\\\')  // Backslash first
              .replace(/'/g, "\\'")    // Single quotes
              .replace(/:/g, '\\:')    // Colons
              .replace(/\[/g, '\\[')   // Brackets
              .replace(/\]/g, '\\]')
              .replace(/,/g, '\\,');   // Commas
            
            // Convert position to pixels (assuming 1920x1080)
            // Ensure textPositionX/Y are between 0-1
            let posX = textClip.textPositionX || 0.5;
            let posY = textClip.textPositionY || 0.5;
            
            // Clamp to valid range if needed
            posX = Math.max(0, Math.min(1, posX));
            posY = Math.max(0, Math.min(1, posY));
            
            const x = Math.round(1920 * posX);
            const y = Math.round(1080 * posY);
            
            // Build drawtext filter - remove fontname as it's not supported in all FFmpeg versions
            const fontSize = textClip.fontSize || 32;
            const fontColor = (textClip.textColor || '#FFFFFF').replace('#', '0x');
            const drawtext = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${x}:y=${y}`;
            
            logger.info('📝 Text overlay filter', { 
              text: textClip.text,
              fontSize,
              fontColor,
              position: { x, y },
              filter: drawtext
            });
            textFilters.push(drawtext);
          }
          
          const result = textFilters.join(',');
          logger.info('📝 Final text overlay filter', { filter: result, count: textFilters.length });
          return result;
        };

        if (n === 1) {
          // Single clip with color grading and text overlay
          logger.info('🎬 Single clip - applying effects and text');
          const clip = videoClips[0];
          const colorFilter = buildColorFilter(clip, '[0:v]');
          const textOverlay = buildTextOverlay(textClips);
          
          logger.info('📊 Single clip analysis', {
            hasColorFilter: colorFilter !== '[0:v]',
            hasText: textOverlay !== '',
            colorFilter,
            textOverlay
          });
          
          if (colorFilter === '[0:v]' && !textOverlay) {
            // No effects, direct transcode
            command
              .format('mp4')
              .videoCodec('libx264')
              .outputOptions([
                '-preset', 'medium',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-b:a', '192k',
              ])
              .output(outputPath);
          } else {
            // Apply effects and/or text
            // colorFilter returns something like: "[0:v]" or "[0:v]eq=brightness=0.5"
            // We need to label the output as [vout]
            const videoFilter = colorFilter === '[0:v]' 
              ? '[0:v]scale=1920:1080[vout]'  // No effects - just scale and label
              : `${colorFilter}[vout]`;        // Has effects - add output label
            
            if (textOverlay) {
              // Apply text overlay on top: [vout] -> drawtext -> [vout_final]
              const filter = `${videoFilter};[vout]${textOverlay}[vout_final]`;
              logger.info('🎨 Filter chain with text', { filter });
              command
                .complexFilter(filter)
                .format('mp4')
                .outputOptions([
                  '-map', '[vout_final]',
                  '-map', '0:a',
                  '-c:v', 'libx264',
                  '-preset', 'medium',
                  '-crf', '23',
                  '-pix_fmt', 'yuv420p',
                  '-c:a', 'aac',
                  '-b:a', '192k',
                ])
                .output(outputPath);
            } else {
              // Only color effects, no text
              command
                .complexFilter(videoFilter)
                .format('mp4')
                .outputOptions([
                  '-map', '[vout]',
                  '-map', '0:a',
                  '-c:v', 'libx264',
                  '-preset', 'medium',
                  '-crf', '23',
                  '-pix_fmt', 'yuv420p',
                  '-c:a', 'aac',
                  '-b:a', '192k',
                ])
                .output(outputPath);
            }
          }
        } else {
          // Multiple clips - concatenate with effects
          const videoFilterParts: string[] = [];
          const audioFilterParts: string[] = [];

          // Build video concat with color grading
          // IMPORTANT: Video inputs and concat filter must be in ONE chain (no semicolons between them)
          for (let i = 0; i < n; i++) {
            const clip = videoClips[i];
            const colorFilter = buildColorFilter(clip, `[${i}:v]`);
            videoFilterParts.push(`${colorFilter}`);
          }
          videoFilterParts.push(`concat=n=${n}:v=1:a=0[vout]`);
          // Join video parts with no separator - they form a single filter chain
          const videoFilter = videoFilterParts.join('');

          // Build audio concat
          for (let i = 0; i < n; i++) {
            audioFilterParts.push(`[${i}:a]`);
          }
          audioFilterParts.push(`concat=n=${n}:v=0:a=1[aout]`);
          // Join audio parts with no separator - they form a single filter chain
          const audioFilter = audioFilterParts.join('');

          // Combine video and audio filter chains with semicolon separator
          const filterComplex = `${videoFilter};${audioFilter}`;
          const textOverlay = buildTextOverlay(textClips);
          
          logger.info('🎬 Filter complex with effects and text', { 
            filterComplex,
            hasText: textClips.length > 0
          });

          // Build final filter with text if needed
          let finalFilter = filterComplex;
          if (textOverlay) {
            finalFilter = `${filterComplex};[vout]${textOverlay}[vout_final]`;
          }

          // Apply filter and output settings
          command
            .complexFilter(finalFilter)
            .format('mp4')
            .outputOptions([
              '-map', textOverlay ? '[vout_final]' : '[vout]',
              '-map', '[aout]',
              '-c:v', 'libx264',
              '-preset', 'medium',
              '-crf', '23',
              '-pix_fmt', 'yuv420p',
              '-c:a', 'aac',
              '-b:a', '192k',
            ])
            .output(outputPath);
        }

        // Progress tracking
        let lastProgress = 0;
        command.on('progress', (progress) => {
          const percent = Math.min(Math.round(progress.percent || 0), 100);
          if (percent > lastProgress) {
            lastProgress = percent;
            logger.info(`⏳ Export progress: ${percent}%`);
            mainWindow.webContents.send('export-progress', { percent });
          }
        });

        // Error handling
        command.on('error', (err) => {
          logger.error('❌ Export failed', { error: err.message });
          mainWindow.webContents.send('export-error', { error: err.message });
          reject(err);
        });

        // Completion
        command.on('end', () => {
          // Wait a bit for file to be flushed
          setTimeout(() => {
            // Verify file exists and has content
            if (existsSync(outputPath)) {
              const stats = require('fs').statSync(outputPath);
              logger.info('✅ Export completed', { 
                outputPath, 
                fileSize: stats.size,
                fileSizeKB: (stats.size / 1024).toFixed(2)
              });
              
              if (stats.size > 1000) { // At least 1KB
                mainWindow.webContents.send('export-complete', { outputPath });
                resolve({ 
                  success: true, 
                  outputPath,
                  message: `Video exported successfully to: ${outputPath}`
                });
              } else {
                logger.error('❌ Export file too small', { fileSize: stats.size });
                mainWindow.webContents.send('export-error', { error: 'Exported file is too small - encoding may have failed' });
                reject(new Error('File size invalid'));
              }
            } else {
              logger.error('❌ Export file not found', { outputPath });
              mainWindow.webContents.send('export-error', { error: 'Output file not found' });
              reject(new Error('Output file not created'));
            }
          }, 1000); // Wait 1 second for file flush
        });

        logger.info('▶️ Starting FFmpeg encoding...');
        command.run();
      });

    } catch (error) {
      logger.error('❌ Export error', { error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      mainWindow.webContents.send('export-error', { error: errorMessage });
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_START, async (event, exportJob: any) => {
    try {
      exportManager.on('job-progress', (job: ExportJob) => {
        mainWindow.webContents.send(IPC_CHANNELS.EXPORT_PROGRESS, job);
      });

      exportManager.on('job-complete', (job: ExportJob) => {
        mainWindow.webContents.send(IPC_CHANNELS.EXPORT_COMPLETE, job);
      });

      exportManager.on('job-error', (job: ExportJob, error: Error) => {
        mainWindow.webContents.send(IPC_CHANNELS.EXPORT_ERROR, job, error.message);
      });

      const jobId = await exportManager.startExport(exportJob);
      return jobId;
    } catch (error) {
      logger.error('Failed to start export', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_CANCEL, async (event, jobId: string) => {
    try {
      exportManager.cancelExport(jobId);
    } catch (error) {
      logger.error('Failed to cancel export', error);
      throw error;
    }
  });

  // ============================================================================
  // RECOVERY
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.RECOVERY_DATA_LOAD, async () => {
    try {
      return await recoveryManager.loadRecoveryData();
    } catch (error) {
      logger.error('Failed to load recovery data', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECOVERY_DATA_SAVE, async (event, project: Project) => {
    try {
      await recoveryManager.saveRecoveryData(project);
    } catch (error) {
      logger.error('Failed to save recovery data', error);
      throw error;
    }
  });

  // ============================================================================
  // HARDWARE & SETTINGS
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.HARDWARE_ACCEL_DETECT, async () => {
    try {
      return await detectHardwareAcceleration();
    } catch (error) {
      logger.error('Failed to detect hardware acceleration', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG_VALIDATE, async () => {
    try {
      return await ffmpegManager.validateFFmpeg();
    } catch (error) {
      logger.error('Failed to validate FFmpeg', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG_VERSION_GET, async () => {
    try {
      return await ffmpegManager.getFFmpegVersion();
    } catch (error) {
      logger.error('Failed to get FFmpeg version', error);
      throw error;
    }
  });

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.CACHE_CLEAR, async () => {
    try {
      await cacheManager.clearAll();
    } catch (error) {
      logger.error('Failed to clear cache', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CACHE_SIZE_GET, async () => {
    try {
      return await cacheManager.getCacheSize();
    } catch (error) {
      logger.error('Failed to get cache size', error);
      throw error;
    }
  });

  // ============================================================================
  // FILE DIALOGS
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.FILE_DIALOG_SAVE, async (event, options: any) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return result.canceled ? null : result.filePath;
    } catch (error) {
      logger.error('Failed to show save dialog', error);
      throw error;
    }
  });

  logger.info('IPC handlers setup complete');
}

export default setupIpcHandlers;
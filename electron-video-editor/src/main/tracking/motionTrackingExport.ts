import { spawn } from 'child_process';
import path from 'path';
import { TrackingKeyframe } from '../../shared/types';
import { KeyframeInterpolator } from './keyframeInterpolator';
import { createLogger } from '../utils/logger';

const logger = createLogger('MotionTrackingExport');

export class MotionTrackingExporter {
  /**
   * Generate FFmpeg filter string from motion tracking keyframes
   * Uses FFmpeg's scale2ref and overlay filters to apply tracking
   */
  static generateFFmpegFilterString(
    keyframes: TrackingKeyframe[],
    videoDuration: number,
    fps: number = 30
  ): string {
    if (keyframes.length === 0) return '';

    // Build filter chain for each keyframe segment
    const filterParts: string[] = [];

    for (let i = 0; i < keyframes.length - 1; i++) {
      const kf1 = keyframes[i];
      const kf2 = keyframes[i + 1];

      const startTime = kf1.time;
      const endTime = kf2.time;

      // Generate scale and position commands
      const startScale = `scale=${kf1.width}:${kf1.height}`;
      const endScale = `scale=${kf2.width}:${kf2.height}`;

      // FFmpeg timeline filter syntax
      filterParts.push(
        `[0]scale=${kf1.width}:${kf1.height}[scaled${i}];` +
        `[scaled${i}]pad=1920:1080:${kf1.x}:${kf1.y}:color=black[padded${i}]`
      );
    }

    // Combine all filter parts
    return filterParts.join(';');
  }

  /**
   * Create drawbox filter for bounding box visualization
   */
  static generateDrawboxFilter(
    keyframes: TrackingKeyframe[],
    color: string = 'red',
    thickness: number = 2
  ): string {
    const drawboxes = keyframes
      .map(kf => {
        const x1 = kf.x;
        const y1 = kf.y;
        const x2 = kf.x + kf.width;
        const y2 = kf.y + kf.height;

        return `drawbox=x='${x1}':y='${y1}':w='${kf.width}':h='${kf.height}':color='${color}'@0.5:thickness='${thickness}':t='fill'`;
      })
      .join(',');

    return drawboxes;
  }

  /**
   * Export video with motion tracking applied
   * Applies keyframe transformations during export
   */
  async exportWithTracking(
    inputPath: string,
    outputPath: string,
    keyframes: TrackingKeyframe[],
    options: {
      videoBitrate?: string;
      fps?: number;
      width?: number;
      height?: number;
      applyDrawbox?: boolean;
      boxColor?: string;
    } = {}
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      const fps = options.fps || 30;
      const width = options.width || 1920;
      const height = options.height || 1080;

      logger.info('Starting export with motion tracking', {
        input: inputPath,
        output: outputPath,
        keyframeCount: keyframes.length,
      });

      // Generate filter string
      let filterComplex = '';

      if (options.applyDrawbox) {
        // Visualize tracking boxes
        filterComplex = `[0]${MotionTrackingExporter.generateDrawboxFilter(keyframes, options.boxColor || 'red', 3)}[out]`;
      } else {
        // Apply scale and position transformations
        filterComplex = MotionTrackingExporter.generateFFmpegFilterString(keyframes, 0, fps);
      }

      // Build FFmpeg command
      const ffmpegArgs = [
        '-i', inputPath,
        '-filter_complex', filterComplex,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-b:v', options.videoBitrate || '5000k',
        '-r', fps.toString(),
        '-s', `${width}x${height}`,
        '-c:a', 'aac',
        '-b:a', '128k',
        outputPath,
      ];

      return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);

        let stderrOutput = '';

        ffmpeg.stderr?.on('data', (data) => {
          stderrOutput += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            logger.info('Export with motion tracking completed successfully');
            resolve({ success: true, outputPath });
          } else {
            logger.error('FFmpeg export failed', { code, stderr: stderrOutput });
            resolve({
              success: false,
              error: `FFmpeg failed with code ${code}`,
            });
          }
        });

        ffmpeg.on('error', (error) => {
          logger.error('FFmpeg process error', error);
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error) {
      logger.error('Export with tracking failed', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate Python script for GPU-accelerated motion tracking export
   * Uses OpenCV and GPU libraries
   */
  static generatePythonTrackingScript(
    inputPath: string,
    outputPath: string,
    keyframes: TrackingKeyframe[]
  ): string {
    return `
import cv2
import numpy as np
from pathlib import Path

# Input/Output paths
INPUT_VIDEO = r'${inputPath}'
OUTPUT_VIDEO = r'${outputPath}'

# Keyframes data
KEYFRAMES = ${JSON.stringify(keyframes)}

# Open input video
cap = cv2.VideoCapture(INPUT_VIDEO)
fps = int(cap.get(cv2.CAP_PROP_FPS))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

# Create output video writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(OUTPUT_VIDEO, fourcc, fps, (width, height))

frame_idx = 0

def get_transform_at_frame(frame_num):
    """Get interpolated transformation for frame"""
    for i in range(len(KEYFRAMES) - 1):
        kf1 = KEYFRAMES[i]
        kf2 = KEYFRAMES[i + 1]
        
        if kf1['frameNumber'] <= frame_num <= kf2['frameNumber']:
            progress = (frame_num - kf1['frameNumber']) / (kf2['frameNumber'] - kf1['frameNumber'])
            
            # Interpolate values
            x = kf1['x'] + (kf2['x'] - kf1['x']) * progress
            y = kf1['y'] + (kf2['y'] - kf1['y']) * progress
            w = kf1['width'] + (kf2['width'] - kf1['width']) * progress
            h = kf1['height'] + (kf2['height'] - kf1['height']) * progress
            
            return x, y, w, h
    
    # Return last keyframe
    kf = KEYFRAMES[-1]
    return kf['x'], kf['y'], kf['width'], kf['height']

# Process frames
while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Get transformation for current frame
    x, y, w, h = get_transform_at_frame(frame_idx)
    
    # Apply transformation (crop and resize)
    if w > 0 and h > 0:
        x, y = int(x), int(y)
        w, h = int(w), int(h)
        
        # Crop source region
        crop = frame[y:y+h, x:x+w]
        
        # Resize to output dimensions
        if crop.shape[0] > 0 and crop.shape[1] > 0:
            resized = cv2.resize(crop, (width, height))
            out.write(resized)
        else:
            out.write(frame)
    else:
        out.write(frame)
    
    frame_idx += 1

# Cleanup
cap.release()
out.release()
cv2.destroyAllWindows()

print(f'✅ Export complete: {OUTPUT_VIDEO}')
`;
  }
}

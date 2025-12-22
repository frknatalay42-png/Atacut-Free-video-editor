import { TrackingKeyframe } from '../../shared/types';

export class KeyframeInterpolator {
  /**
   * Calculate interpolated value between two keyframes
   */
  static interpolate(
    kf1: TrackingKeyframe,
    kf2: TrackingKeyframe,
    currentFrame: number,
    easing: string = 'linear'
  ): Partial<TrackingKeyframe> {
    const progress = (currentFrame - kf1.frameNumber) / (kf2.frameNumber - kf1.frameNumber);
    const easeProgress = this.easeValue(progress, easing);

    return {
      x: kf1.x + (kf2.x - kf1.x) * easeProgress,
      y: kf1.y + (kf2.y - kf1.y) * easeProgress,
      width: kf1.width + (kf2.width - kf1.width) * easeProgress,
      height: kf1.height + (kf2.height - kf1.height) * easeProgress,
      scaleX: kf1.scaleX + (kf2.scaleX - kf1.scaleX) * easeProgress,
      scaleY: kf1.scaleY + (kf2.scaleY - kf1.scaleY) * easeProgress,
      rotation: this.interpolateRotation(kf1.rotation, kf2.rotation, easeProgress),
    };
  }

  /**
   * Easing functions
   */
  private static easeValue(t: number, easing: string): number {
    const clampedT = Math.max(0, Math.min(1, t));

    switch (easing) {
      case 'ease-in':
        return clampedT * clampedT;
      case 'ease-out':
        return 1 - (1 - clampedT) * (1 - clampedT);
      case 'ease-in-out':
        return clampedT < 0.5
          ? 2 * clampedT * clampedT
          : -1 + (4 - 2 * clampedT) * clampedT;
      case 'cubic':
        return clampedT * clampedT * clampedT;
      case 'bounce':
        return this.easeBounce(clampedT);
      case 'elastic':
        return this.easeElastic(clampedT);
      case 'linear':
      default:
        return clampedT;
    }
  }

  /**
   * Bounce easing function
   */
  private static easeBounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  /**
   * Elastic easing function
   */
  private static easeElastic(t: number): number {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c5);
  }

  /**
   * Interpolate rotation (handle 360 degree wrapping)
   */
  private static interpolateRotation(from: number, to: number, t: number): number {
    let delta = to - from;

    // Handle shortest path
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    return from + delta * t;
  }

  /**
   * Get value at specific frame from keyframe array
   */
  static getValueAtFrame(
    keyframes: TrackingKeyframe[],
    frameNumber: number
  ): Partial<TrackingKeyframe> | null {
    if (keyframes.length === 0) return null;

    // Find surrounding keyframes
    let kf1 = keyframes[0];
    let kf2 = keyframes[0];

    for (let i = 0; i < keyframes.length; i++) {
      if (keyframes[i].frameNumber <= frameNumber) {
        kf1 = keyframes[i];
      }
      if (keyframes[i].frameNumber >= frameNumber && i > 0) {
        kf2 = keyframes[i];
        break;
      }
    }

    // If exact keyframe match
    if (kf1.frameNumber === frameNumber) {
      return kf1;
    }

    // If beyond last keyframe
    if (frameNumber > kf1.frameNumber && kf2.frameNumber === kf1.frameNumber) {
      return kf1;
    }

    // Interpolate between keyframes
    return this.interpolate(kf1, kf2, frameNumber, kf1.easing || 'linear');
  }

  /**
   * Apply transformation to canvas context
   */
  static applyTransform(
    ctx: CanvasRenderingContext2D,
    keyframe: Partial<TrackingKeyframe>,
    sourceWidth: number,
    sourceHeight: number
  ): void {
    if (!keyframe) return;

    // Translate to position
    ctx.translate(keyframe.x || 0, keyframe.y || 0);

    // Apply rotation around center
    if (keyframe.rotation !== undefined && keyframe.rotation !== 0) {
      ctx.rotate((keyframe.rotation * Math.PI) / 180);
    }

    // Apply scale
    ctx.scale(keyframe.scaleX || 1, keyframe.scaleY || 1);

    // Translate back for proper centering
    ctx.translate(-sourceWidth / 2, -sourceHeight / 2);
  }

  /**
   * Generate smooth keyframes from motion tracking data
   */
  static generateSmoothKeyframes(
    trackingBounds: Array<{ frameNumber: number; x: number; y: number; width: number; height: number }>,
    smoothingFactor: number = 0.3
  ): TrackingKeyframe[] {
    if (trackingBounds.length === 0) return [];

    const keyframes: TrackingKeyframe[] = [];

    for (let i = 0; i < trackingBounds.length; i++) {
      const bound = trackingBounds[i];

      // Apply smoothing by averaging with neighbors
      let smoothedX = bound.x;
      let smoothedY = bound.y;
      let smoothedWidth = bound.width;
      let smoothedHeight = bound.height;

      if (i > 0 && i < trackingBounds.length - 1) {
        const prev = trackingBounds[i - 1];
        const next = trackingBounds[i + 1];

        smoothedX = prev.x * smoothingFactor + bound.x * (1 - 2 * smoothingFactor) + next.x * smoothingFactor;
        smoothedY = prev.y * smoothingFactor + bound.y * (1 - 2 * smoothingFactor) + next.y * smoothingFactor;
        smoothedWidth =
          prev.width * smoothingFactor + bound.width * (1 - 2 * smoothingFactor) + next.width * smoothingFactor;
        smoothedHeight =
          prev.height * smoothingFactor + bound.height * (1 - 2 * smoothingFactor) + next.height * smoothingFactor;
      }

      keyframes.push({
        id: `kf-${i}`,
        trackId: '',
        frameNumber: bound.frameNumber,
        time: bound.frameNumber / 30, // Assuming 30fps
        x: smoothedX,
        y: smoothedY,
        width: smoothedWidth,
        height: smoothedHeight,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        easing: 'linear',
      });
    }

    return keyframes;
  }
}

/**
 * Animation player for keyframe sequences
 */
export class KeyframePlayer {
  private keyframes: TrackingKeyframe[] = [];
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private fps: number = 30;

  constructor(keyframes: TrackingKeyframe[], fps: number = 30) {
    this.keyframes = keyframes;
    this.fps = fps;
  }

  setKeyframes(keyframes: TrackingKeyframe[]): void {
    this.keyframes = keyframes;
  }

  play(): void {
    this.isPlaying = true;
  }

  pause(): void {
    this.isPlaying = false;
  }

  seek(frameNumber: number): void {
    this.currentFrame = frameNumber;
  }

  update(): Partial<TrackingKeyframe> | null {
    if (!this.isPlaying) return null;

    const value = KeyframeInterpolator.getValueAtFrame(this.keyframes, this.currentFrame);
    this.currentFrame++;

    return value;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getTotalFrames(): number {
    return this.keyframes.length > 0
      ? this.keyframes[this.keyframes.length - 1].frameNumber
      : 0;
  }
}

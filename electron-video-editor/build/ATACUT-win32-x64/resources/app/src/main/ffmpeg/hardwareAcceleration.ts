import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { HardwareAccelType } from '../../shared/constants';
import ffmpegStatic from 'ffmpeg-static';
import { createLogger } from '../utils/logger';

const execPromise = promisify(exec);
const logger = createLogger('HardwareAcceleration');

export interface HardwareAccelInfo {
  gpuAvailable: boolean;
  gpuName?: string;
  supportedAcceleration: HardwareAccelType[];
  recommendedAcceleration: HardwareAccelType;
  totalMemory: number;
  availableMemory: number;
}

/**
 * Detect available hardware acceleration options
 */
export async function detectHardwareAcceleration(): Promise<HardwareAccelInfo> {
  const supported: HardwareAccelType[] = [];
  let gpuName = '';
  let gpuAvailable = false;

  const platform = process.platform;
  const ffmpegPath = ffmpegStatic || 'ffmpeg';

  // Check NVENC (NVIDIA GPUs)
  if (await checkEncoder(ffmpegPath, 'h264_nvenc')) {
    supported.push(HardwareAccelType.NVENC);
    gpuAvailable = true;
    gpuName = await detectNvidiaGPU();
    logger.info('NVENC support detected', { gpuName });
  }

  // Check QSV (Intel Quick Sync Video)
  if (await checkEncoder(ffmpegPath, 'h264_qsv')) {
    supported.push(HardwareAccelType.QSV);
    if (!gpuAvailable) {
      gpuAvailable = true;
      gpuName = 'Intel Quick Sync Video';
    }
    logger.info('QSV support detected');
  }

  // Check VAAPI (Linux)
  if (platform === 'linux' && await checkEncoder(ffmpegPath, 'h264_vaapi')) {
    supported.push(HardwareAccelType.VAAPI);
    if (!gpuAvailable) {
      gpuAvailable = true;
      gpuName = 'VAAPI Hardware Encoder';
    }
    logger.info('VAAPI support detected');
  }

  // Software encoding is always supported
  supported.push(HardwareAccelType.SOFTWARE);

  // Determine recommended acceleration
  const recommended = supported.length > 1 ? supported[0] : HardwareAccelType.SOFTWARE;

  // Get system memory info
  const totalMemory = os.totalmem();
  const availableMemory = os.freemem();

  return {
    gpuAvailable,
    gpuName: gpuName || undefined,
    supportedAcceleration: supported,
    recommendedAcceleration: recommended,
    totalMemory: Math.round(totalMemory / (1024 * 1024 * 1024)), // GB
    availableMemory: Math.round(availableMemory / (1024 * 1024 * 1024)), // GB
  };
}

/**
 * Check if a specific encoder is available
 */
async function checkEncoder(ffmpegPath: string, encoder: string): Promise<boolean> {
  try {
    const { stdout } = await execPromise(`"${ffmpegPath}" -hide_banner -encoders`);
    return stdout.includes(encoder);
  } catch (error) {
    logger.error(`Failed to check encoder ${encoder}`, error);
    return false;
  }
}

/**
 * Detect NVIDIA GPU name
 */
async function detectNvidiaGPU(): Promise<string> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execPromise('wmic path win32_VideoController get name');
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Name'));
      const nvidiaGPU = lines.find(line => line.toLowerCase().includes('nvidia'));
      return nvidiaGPU?.trim() || 'NVIDIA GPU';
    } else if (process.platform === 'linux') {
      const { stdout } = await execPromise('nvidia-smi --query-gpu=name --format=csv,noheader');
      return stdout.trim() || 'NVIDIA GPU';
    } else if (process.platform === 'darwin') {
      // macOS - check system_profiler
      const { stdout } = await execPromise('system_profiler SPDisplaysDataType | grep Chipset');
      return stdout.trim().replace('Chipset Model:', '').trim() || 'NVIDIA GPU';
    }
  } catch (error) {
    logger.warn('Failed to detect NVIDIA GPU name', error);
  }
  return 'NVIDIA GPU';
}

/**
 * Get hardware acceleration based on user preference with fallback
 */
export function getHardwareAcceleration(
  preferred: HardwareAccelType,
  supported: HardwareAccelType[]
): HardwareAccelType {
  // If preferred is supported, use it
  if (supported.includes(preferred)) {
    return preferred;
  }

  // Fallback chain: NVENC -> QSV -> VAAPI -> SOFTWARE
  const fallbackChain = [
    HardwareAccelType.NVENC,
    HardwareAccelType.QSV,
    HardwareAccelType.VAAPI,
    HardwareAccelType.SOFTWARE,
  ];

  for (const accel of fallbackChain) {
    if (supported.includes(accel)) {
      logger.info(`Falling back to ${accel} from ${preferred}`);
      return accel;
    }
  }

  return HardwareAccelType.SOFTWARE;
}

/**
 * Get encoder name for hardware acceleration type
 */
export function getEncoderForAccel(accel: HardwareAccelType, codec: 'h264' | 'h265' = 'h264'): string {
  switch (accel) {
    case HardwareAccelType.NVENC:
      return codec === 'h265' ? 'hevc_nvenc' : 'h264_nvenc';
    case HardwareAccelType.QSV:
      return codec === 'h265' ? 'hevc_qsv' : 'h264_qsv';
    case HardwareAccelType.VAAPI:
      return codec === 'h265' ? 'hevc_vaapi' : 'h264_vaapi';
    case HardwareAccelType.SOFTWARE:
    default:
      return codec === 'h265' ? 'libx265' : 'libx264';
  }
}

/**
 * Check if system memory is sufficient for video editing
 */
export function checkMemorySufficiency(requiredGB: number): {
  sufficient: boolean;
  availableGB: number;
  warning?: string;
} {
  const availableGB = Math.round(os.freemem() / (1024 * 1024 * 1024));
  const sufficient = availableGB >= requiredGB;

  return {
    sufficient,
    availableGB,
    warning: !sufficient
      ? `Low memory: ${availableGB}GB available, ${requiredGB}GB recommended`
      : undefined,
  };
}
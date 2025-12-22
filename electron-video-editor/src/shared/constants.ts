// Application Constants
export const APP_NAME = 'Video Editor Pro';
export const APP_VERSION = '1.0.0';

// Performance & Memory
export const MAX_MEMORY_WARNING_GB = 8;
export const PROXY_RESOLUTION_WIDTH = 1280;
export const PROXY_RESOLUTION_HEIGHT = 720;
export const THUMBNAIL_INTERVAL_SECONDS = 1;
export const AUTO_SAVE_INTERVAL_MS = 30000; // 30 seconds
export const RECOVERY_SAVE_INTERVAL_MS = 60000; // 60 seconds
export const CHUNK_DURATION_SECONDS = 300; // 5 minutes for export chunking

// Timeline
export const DEFAULT_PIXELS_PER_SECOND = 10;
export const MIN_PIXELS_PER_SECOND = 1;
export const MAX_PIXELS_PER_SECOND = 100;
export const SNAP_THRESHOLD_PIXELS = 5;
export const DEFAULT_TRACK_HEIGHT = 60;
export const EXPANDED_TRACK_HEIGHT = 120;
export const TIMELINE_PADDING = 20;

// Edit Modes
export enum EditMode {
  RIPPLE = 'ripple',
  OVERWRITE = 'overwrite',
  INSERT = 'insert',
}

// Track Types
export enum TrackType {
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
}

// Playback
export const DEFAULT_FPS = 30;
export const PLAYBACK_UPDATE_INTERVAL_MS = 16; // ~60fps

// Export
export const DEFAULT_EXPORT_FORMAT = 'mp4';
export const DEFAULT_VIDEO_CODEC = 'libx264';
export const DEFAULT_AUDIO_CODEC = 'aac';

// Hardware Acceleration
export enum HardwareAccelType {
  NVENC = 'nvenc',
  QSV = 'qsv',
  VAAPI = 'vaapi',
  SOFTWARE = 'software',
}

// File Formats
export const VIDEO_FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm'] as const;
export const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
export const SUPPORTED_AUDIO_FORMATS = ['.mp3', '.wav', '.aac', '.m4a', '.ogg'];
export const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

// Transitions
export enum TransitionType {
  CROSSFADE = 'crossfade',
  FADE_IN = 'fade_in',
  FADE_OUT = 'fade_out',
  WIPE = 'wipe',
  SLIDE = 'slide',
  ZOOM = 'zoom',
  BLUR = 'blur',
}

export const DEFAULT_TRANSITION_DURATION = 1000; // milliseconds

// Effects
export enum EffectType {
  BRIGHTNESS = 'brightness',
  CONTRAST = 'contrast',
  SATURATION = 'saturation',
  SEPIA = 'sepia',
  VIGNETTE = 'vignette',
  LUT = 'lut',
  HUE = 'hue',
  BLUR = 'blur',
  SHARPEN = 'sharpen',
}

// Motion Tracking
export enum MotionTrackType {
  OBJECT = 'object',        // Track moving objects
  FACE = 'face',           // Track faces (for blurring/following)
  MOTION_VECTORS = 'motion', // General motion detection
  OPTICAL_FLOW = 'optical',  // Dense optical flow
}

export enum TrackingAnalysisStatus {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

// Clipboard
export const MAX_CLIPBOARD_HISTORY = 10;

// Cache
export const CACHE_PATH = `${process.env.HOME || process.env.USERPROFILE}/.video-editor-cache/`;
export const CACHE_DIR_NAME = '.video-editor-cache';
export const THUMBNAILS_DIR = 'thumbnails';
export const PROXIES_DIR = 'proxies';
export const WAVEFORMS_DIR = 'waveforms';
export const LOGS_DIR = 'logs';

// Project
export const PROJECT_FILE_EXTENSION = '.veproj';
export const PROJECT_VERSION = 1;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: 'Space',
  SPLIT: 'S',
  DELETE: 'Delete',
  UNDO: 'Control+Z',
  REDO: 'Control+Shift+Z',
  COPY: 'Control+C',
  PASTE: 'Control+V',
  CUT: 'Control+X',
  CLIPBOARD_HISTORY: 'Control+Shift+V',
  MUTE: 'M',
  SAVE: 'Control+S',
  EXPORT: 'Control+E',
  ZOOM_IN: 'Control+=',
  ZOOM_OUT: 'Control+-',
  FIT_TO_SCREEN: 'Control+0',
  FRAME_FORWARD: 'ArrowRight',
  FRAME_BACKWARD: 'ArrowLeft',
  JUMP_FORWARD: 'Control+ArrowRight',
  JUMP_BACKWARD: 'Control+ArrowLeft',
};

// Export Presets
export const EXPORT_PRESETS = {
    FOUR_K: {
        name: 'YouTube 4K',
        resolution: '3840x2160',
        width: 3840,
        height: 2160,
        fps: 30,
        videoBitrate: '40M',
        audioBitrate: '192k',
        format: 'mp4',
    },
    ONE_ZERO_EIGHTY_P: {
        name: 'YouTube 1080p',
        resolution: '1920x1080',
        width: 1920,
        height: 1080,
        fps: 30,
        videoBitrate: '8M',
        audioBitrate: '192k',
        format: 'mp4',
    },
    SOCIAL_MEDIA: {
        instagram: {
            feed: {
                name: 'Instagram Feed',
                resolution: '1080x1080',
                width: 1080,
                height: 1080,
                fps: 30,
                videoBitrate: '10M',
                audioBitrate: '128k',
                format: 'mp4',
            },
            story: {
                name: 'Instagram Story/Reels',
                resolution: '1080x1920',
                width: 1080,
                height: 1920,
                fps: 30,
                videoBitrate: '12M',
                audioBitrate: '128k',
                format: 'mp4',
            },
        },
        tiktok: {
            name: 'TikTok',
            resolution: '1080x1920',
            width: 1080,
            height: 1920,
            fps: 30,
            videoBitrate: '12M',
            audioBitrate: '128k',
            format: 'mp4',
        },
    },
};

export const TIMELINE_ZOOM_LEVELS = [0.5, 1, 2, 4, 8];

// Smart Cut
export const SMART_CUT_KEYWORDS = ['um', 'uh', 'like', 'you know', 'basically'];
export const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically'];
export const MIN_WORD_GAP_MS = 300;

// Audio
export const AUDIO_DUCKING_REDUCTION_DB = -15;
export const SILENCE_THRESHOLD_DB = -40;
export const SILENCE_DURATION_MS = 500;

export const AUTO_REFRAME_SAFE_AREA = {
    grid: 90,
};
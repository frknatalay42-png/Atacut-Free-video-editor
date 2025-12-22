import { ipcMain } from 'electron';

export const IPC_CHANNELS = {
    IMPORT_MEDIA: 'import-media',
    EXPORT_MEDIA: 'export-media',
    TRIM_CLIP: 'trim-clip',
    SPLIT_CLIP: 'split-clip',
    ADD_TEXT_OVERLAY: 'add-text-overlay',
    ADJUST_AUDIO_VOLUME: 'adjust-audio-volume',
    ADD_TRANSITION: 'add-transition',
    RENDER_PROJECT: 'render-project',
    GENERATE_PROXY: 'generate-proxy',
    GET_PROJECT_SNAPSHOT: 'get-project-snapshot',
    SAVE_PROJECT: 'save-project',
    LOAD_PROJECT: 'load-project',
    RECOVER_PROJECT: 'recover-project',
    GET_MEDIA_THUMBNAILS: 'get-media-thumbnails',
    GET_AUDIO_WAVEFORMS: 'get-audio-waveforms',
    CHECK_HARDWARE_ACCELERATION: 'check-hardware-acceleration',
    UPDATE_CLIP_PROPERTIES: 'update-clip-properties',
    CREATE_VERSION: 'create-version',
    DELETE_CLIP: 'delete-clip',
    MUTE_CLIP: 'mute-clip',
    UNMUTE_CLIP: 'unmute-clip',
    SMART_CUT: 'smart-cut',
    JUMP_CUT: 'jump-cut',
    AUTO_REFAME: 'auto-reframe',
    AUDIO_DUCKING: 'audio-ducking',
    EXPORT_PRESET_MANAGER: 'export-preset-manager',
    // Motion Tracking
    ANALYZE_MOTION: 'analyze-motion',
    CANCEL_MOTION_TRACKING: 'cancel-motion-tracking',
    GET_TRACKING_DATA: 'get-tracking-data',
    APPLY_TRACKING_KEYFRAMES: 'apply-tracking-keyframes',
};

export const setupIpcChannels = () => {
    // Setup IPC handlers here
    ipcMain.on(IPC_CHANNELS.IMPORT_MEDIA, (event, args) => {
        // Handle media import
    });

    ipcMain.on(IPC_CHANNELS.EXPORT_MEDIA, (event, args) => {
        // Handle media export
    });

    // Additional IPC handlers can be added here
};
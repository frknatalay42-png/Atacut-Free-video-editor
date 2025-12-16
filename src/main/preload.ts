import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipcChannels';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Project operations
  project: {
    new: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_NEW),
    open: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_OPEN, filePath),
    save: (project: any, filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_SAVE, project, filePath),
    openDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_DIALOG_OPEN),
    saveDialog: (defaultName: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_DIALOG_SAVE, defaultName),
  },

  // Media operations
  media: {
    importDialog: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_MEDIA_DIALOG),
    getInfo: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_MEDIA_INFO, filePath),
    generateProxy: (filePath: string, quality: string) => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_PROXY, filePath, quality),
    generateThumbnail: (filePath: string, time: number) => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_THUMBNAIL, filePath, time),
    generateWaveform: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_WAVEFORM, filePath),
    onProxyProgress: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.PROXY_PROGRESS, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PROXY_PROGRESS, listener);
    },
  },

  // Export operations
  export: {
    start: (project: any, settings: any) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_START, project, settings),
    cancel: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CANCEL, jobId),
    onProgress: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.EXPORT_PROGRESS, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EXPORT_PROGRESS, listener);
    },
    onComplete: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.EXPORT_COMPLETE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EXPORT_COMPLETE, listener);
    },
    onError: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.EXPORT_ERROR, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EXPORT_ERROR, listener);
    },
  },

  // Cache operations
  cache: {
    clearCache: () => ipcRenderer.invoke(IPC_CHANNELS.CACHE_CLEAR),
  },

  // Recovery operations
  recovery: {
    loadData: () => ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_DATA_LOAD),
    saveData: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_DATA_SAVE, data),
  },

  // Hardware acceleration
  hardware: {
    detect: () => ipcRenderer.invoke(IPC_CHANNELS.HARDWARE_ACCEL_DETECT),
  },

  // File system
  fs: {
    openDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_DIALOG_OPEN),
    saveDialog: (defaultName: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_DIALOG_SAVE, defaultName),
  },

  // Preferences
  preferences: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.PREFERENCES_GET, key),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.PREFERENCES_SET, key, value),
  },
});

// Also expose as electronAPI for consistency
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
});

// Type definitions for window.electron
declare global {
  interface Window {
    electronAPI: {
      project: {
        new: () => Promise<any>;
        open: (filePath: string) => Promise<any>;
        save: (project: any, filePath: string) => Promise<void>;
        openDialog: () => Promise<string | undefined>;
        saveDialog: (defaultName: string) => Promise<string | undefined>;
      };
      media: {
        importDialog: () => Promise<string[]>;
        getInfo: (filePath: string) => Promise<any>;
        generateProxy: (filePath: string, quality: string) => Promise<string>;
        generateThumbnail: (filePath: string, time: number) => Promise<string>;
        generateWaveform: (filePath: string) => Promise<string>;
        onProxyProgress: (callback: (data: any) => void) => () => void;
      };
      export: {
        start: (project: any, settings: any) => Promise<string>;
        cancel: (jobId: string) => Promise<void>;
        onProgress: (callback: (data: any) => void) => () => void;
        onComplete: (callback: (data: any) => void) => () => void;
        onError: (callback: (data: any) => void) => () => void;
      };
      cache: {
        clearCache: () => Promise<void>;
      };
      recovery: {
        loadData: () => Promise<any>;
        saveData: (data: any) => Promise<void>;
      };
      hardware: {
        detect: () => Promise<string>;
      };
      fs: {
        openDialog: () => Promise<string | undefined>;
        saveDialog: (defaultName: string) => Promise<string | undefined>;
      };
      preferences: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
      };
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      send: (channel: string, ...args: any[]) => void;
    };
    electron: {
      project: any;
      media: any;
      export: any;
      cache: any;
      recovery: any;
      hardware: any;
      fs: any;
      preferences: any;
    };
  }
}

export {};

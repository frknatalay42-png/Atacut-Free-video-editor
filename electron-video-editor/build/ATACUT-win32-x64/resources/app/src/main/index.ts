import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { existsSync } from 'fs';
import { setupIpcHandlers } from './ipc/handlers';
import { getRecoveryManager } from './storage/recoveryManager';
import { getProjectManager } from './storage/projectManager';
import { getCacheManager } from './storage/cacheManager';
import { createLogger } from './utils/logger';

const logger = createLogger('Main');
let mainWindow: BrowserWindow | null = null;

// Get the correct URL for loading the HTML depending on environment
function getMainWindowURL(): string {
  // In dev: __dirname = dist, so index.html is in dist/
  // In packaged: __dirname = resources/app/dist, so index.html is in resources/app/dist/
  const htmlPath = path.join(__dirname, 'index.html');
  
  if (existsSync(htmlPath)) {
    logger.info('Found index.html', { htmlPath });
    return `file://${htmlPath}`;
  }
  
  // Fallback - check parent directories
  const fallbacks = [
    path.join(__dirname, '..', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
  ];
  
  for (const fallback of fallbacks) {
    if (existsSync(fallback)) {
      logger.info('Found index.html in fallback', { fallback });
      return `file://${fallback}`;
    }
  }
  
  logger.error('Could not find index.html', { htmlPath, fallbacks });
  throw new Error(`Could not find index.html at ${htmlPath}`);
}

function getPreloadPath(): string {
  // In dev: __dirname = dist, so preload.js is in dist/
  // In packaged: __dirname = resources/app/dist, so preload.js is in resources/app/dist/
  const preloadPath = path.join(__dirname, 'preload.js');
  
  if (existsSync(preloadPath)) {
    logger.info('Found preload.js', { preloadPath });
    return preloadPath;
  }
  
  // Fallback - check parent directories
  const fallbacks = [
    path.join(__dirname, '..', 'preload.js'),
    path.join(app.getAppPath(), 'dist', 'preload.js'),
  ];
  
  for (const fallback of fallbacks) {
    if (existsSync(fallback)) {
      logger.info('Found preload.js in fallback', { fallback });
      return fallback;
    }
  }
  
  logger.error('Could not find preload.js', { preloadPath, fallbacks });
  throw new Error(`Could not find preload.js at ${preloadPath}`);
}

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

function createMainWindow() {
  logger.info('Creating main window');

  const preloadPath = getPreloadPath();
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#1e1e1e',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: true,
      sandbox: false,
    },
  });

  // Load the app
  const mainWindowURL = getMainWindowURL();
  mainWindow.loadURL(mainWindowURL);

  // Handle render process crashes
  mainWindow.webContents.on('crashed', () => {
    logger.error('Renderer process crashed');
    mainWindow?.reload();
  });

  // Handle loading errors
  mainWindow.webContents.on('failed-to-finish-load', () => {
    logger.error('Failed to finish loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, code, description) => {
    logger.error('Page failed to load', { code, description });
  });

  // Show window when ready, or after a timeout
  const showTimer = setTimeout(() => {
    logger.warn('ready-to-show timeout, showing window anyway');
    mainWindow?.show();
  }, 5000);

  mainWindow.once('ready-to-show', () => {
    clearTimeout(showTimer);
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Setup application menu
  setupMenu();

  // Setup IPC handlers
  setupIpcHandlers(mainWindow);

  logger.info('Main window created');
}

// ============================================================================
// APPLICATION MENU
// ============================================================================

function setupMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-project');
          },
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-open-project');
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-save-project');
          },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow?.webContents.send('menu-save-project-as');
          },
        },
        { type: 'separator' },
        {
          label: 'Import Media...',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow?.webContents.send('menu-import-media');
          },
        },
        { type: 'separator' },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu-export');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', accelerator: 'CmdOrCtrl+Shift+Z' },
        { type: 'separator' },
        { role: 'cut', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', accelerator: 'CmdOrCtrl+V' },
        {
          label: 'Paste from History',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            mainWindow?.webContents.send('menu-paste-history');
          },
        },
        { type: 'separator' },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => {
            mainWindow?.webContents.send('menu-delete');
          },
        },
      ],
    },
    {
      label: 'Timeline',
      submenu: [
        {
          label: 'Split Clip',
          accelerator: 'S',
          click: () => {
            mainWindow?.webContents.send('menu-split-clip');
          },
        },
        {
          label: 'Duplicate Clip',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            mainWindow?.webContents.send('menu-duplicate-clip');
          },
        },
        { type: 'separator' },
        {
          label: 'Ripple Mode',
          accelerator: 'R',
          click: () => {
            mainWindow?.webContents.send('menu-toggle-ripple');
          },
        },
        {
          label: 'Snapping',
          accelerator: 'Shift+S',
          click: () => {
            mainWindow?.webContents.send('menu-toggle-snapping');
          },
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            mainWindow?.webContents.send('menu-zoom-in');
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow?.webContents.send('menu-zoom-out');
          },
        },
      ],
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => {
            mainWindow?.webContents.send('menu-play-pause');
          },
        },
        {
          label: 'Jump to Start',
          accelerator: 'Home',
          click: () => {
            mainWindow?.webContents.send('menu-jump-start');
          },
        },
        {
          label: 'Jump to End',
          accelerator: 'End',
          click: () => {
            mainWindow?.webContents.send('menu-jump-end');
          },
        },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Smart Cut',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow?.webContents.send('menu-smart-cut');
          },
        },
        {
          label: 'Scene Detection',
          click: () => {
            mainWindow?.webContents.send('menu-scene-detection');
          },
        },
        { type: 'separator' },
        {
          label: 'Generate Proxies',
          click: () => {
            mainWindow?.webContents.send('menu-generate-proxies');
          },
        },
        { type: 'separator' },
        {
          label: 'Clear Cache...',
          click: () => {
            mainWindow?.webContents.send('menu-clear-cache');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/video-editor');
          },
        },
      ],
    },
  ];

  // Mac-specific menu modifications
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('menu-preferences');
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.on('ready', async () => {
  logger.info('App ready');

  // Initialize managers
  const recoveryManager = getRecoveryManager();
  const projectManager = getProjectManager();
  const cacheManager = getCacheManager();

  // Start auto-save
  recoveryManager.startAutoSave(() => {
    logger.info('Auto-saving project');
    // The recovery manager handles auto-save internally
    return projectManager.getCurrentProject();
  });

  // Clean old cache on startup
  await cacheManager.cleanOldCache();

  // Create main window
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', async () => {
  logger.info('App quitting');
  
  // Perform cleanup
  const recoveryManager = getRecoveryManager();
  recoveryManager.stopAutoSave();
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', error);
});
# Video Editor - Professional 4K Video Editing

A powerful desktop video editor optimized for 4K action-camera footage, built with **Electron + React + TypeScript + Zustand + FFmpeg**.

## 🎯 Features

### Core Editing
- **Multi-track Timeline**: Drag-and-drop video, audio, and text clips across unlimited tracks
- **Precise Trimming**: Frame-accurate trim handles on every clip
- **Smart Cut Tools**: Ripple, insert, and overwrite edit modes
- **Snapping**: Automatic alignment to playhead, clip edges, and markers
- **Zoom & Mini-map**: Timeline zoom (Ctrl+Scroll) with bird's-eye overview

### Performance & Optimization
- **Proxy Editing**: Automatic low-resolution proxies for smooth 4K playback
- **Hardware Acceleration**: NVENC (NVIDIA) / QSV (Intel) / VAAPI (Linux) support
- **Smart Rendering**: Re-encode only modified clips (10x faster exports)
- **Background Processing**: Non-blocking proxy/thumbnail generation

### Effects & Transitions
- **9 Built-in Effects**: Brightness, Contrast, Saturation, Blur, Sharpen, Vignette, Film Grain, Chromatic Aberration, LUT
- **7 Transitions**: Fade, Dissolve, Wipe, Slide, Zoom, Spin, Glitch
- **Drag-and-Drop**: Apply effects/transitions by dragging onto clips

### Export & Rendering
- **Social Media Presets**: YouTube 4K/1080p, Instagram Story/Post, TikTok, Twitter
- **Export Queue**: Batch export multiple projects simultaneously
- **Progress Tracking**: Real-time progress bars with time estimates
- **Smart Render Toggle**: Dramatically reduce export time for minor edits

### Smart Tools
- **Clipboard History**: 10-item visual clipboard with Ctrl+Shift+V
- **Auto-Save**: Automatic project backups every 60 seconds
- **Crash Recovery**: Resume from last saved state after crashes
- **Waveform Display**: Audio visualization on timeline clips

### Media Management
- **Drag Import**: Drag video files from file explorer to timeline
- **Search & Filter**: Find media by name, type, ratings, or tags
- **Favorites & Ratings**: 5-star rating system with favorites
- **Proxy Status**: Visual badges show proxy generation progress

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **FFmpeg** installed and available in PATH (or bundled via ffmpeg-static)
- **Windows / macOS / Linux**
- **Recommended**: NVIDIA GPU for hardware acceleration

### Installation

```powershell
# Clone the repository
git clone https://github.com/yourusername/electron-video-editor.git
cd electron-video-editor

# Install dependencies
npm install

# Build the project
npm run build

# Start the application
npm start
```

### Development Mode

```powershell
# Watch mode for hot-reloading
npm run dev

# In another terminal, start Electron
npm start
```

## 📖 Usage Guide

### Basic Workflow

1. **Import Media**
   - Click "Import" button or drag video files into Media Library
   - Proxies generate automatically for 4K files (toggle in Preferences)

2. **Build Timeline**
   - Drag clips from Media Library to Timeline tracks
   - Trim clips by dragging left/right edges
   - Move clips by dragging the clip body
   - Delete clips with `Delete` key

3. **Add Effects**
   - Open Effects Panel (left sidebar)
   - Drag effects onto clips in timeline
   - Adjust effect parameters in Properties Panel

4. **Export**
   - Click "Export" button
   - Select social media preset or custom settings
   - Enable Smart Render for faster exports
   - Click "Start Export" to add to queue

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `Left/Right Arrow` | Move playhead 1 frame |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+C` | Copy selected clips |
| `Ctrl+V` | Paste clips |
| `Ctrl+Shift+V` | Open clipboard history |
| `Delete` | Delete selected clips |
| `Ctrl+Scroll` | Zoom timeline |
| `Ctrl+S` | Save project |
| `Ctrl+O` | Open project |

### Edit Modes

- **Normal**: Default click-and-drag editing
- **Ripple**: Moving/trimming clips shifts all subsequent clips
- **Insert**: Pasting clips pushes existing clips forward
- **Overwrite**: Pasting clips replaces existing clips

## 🏗️ Architecture

### Technology Stack
- **Electron 28**: Cross-platform desktop framework
- **React 18**: UI rendering with Hooks
- **TypeScript 5**: Type-safe development
- **Zustand 4**: Lightweight state management with Immer
- **FFmpeg**: Video processing and encoding
- **Canvas API**: Real-time video preview rendering

### Project Structure
```
electron-video-editor/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # App entry, window management
│   │   ├── preload.ts     # IPC bridge (security boundary)
│   │   ├── ffmpeg/        # Video processing
│   │   ├── ipc/           # IPC handlers
│   │   └── storage/       # Project/cache/recovery
│   ├── renderer/          # React app
│   │   ├── App.tsx        # Main layout
│   │   ├── components/    # UI components
│   │   ├── store/         # Zustand stores
│   │   ├── hooks/         # Custom React hooks
│   │   └── styles/        # CSS files
│   └── shared/            # Types & constants
├── resources/             # Icons & presets
├── dist/                  # Built files
└── package.json           # Dependencies & scripts
```

### State Management
- **timelineStore**: Clips, tracks, playback state
- **mediaStore**: Imported files, proxies, metadata
- **exportStore**: Export queue, presets, progress
- **clipboardStore**: 10-item clipboard history
- **effectsStore**: Effects/transitions library
- **projectStore**: Project metadata, templates
- **preferencesStore**: User settings, theme

## 🎨 Customization

### Adding Export Presets
Edit `src/shared/constants.ts` → `EXPORT_PRESETS`:

```typescript
youtube_8k: {
  name: 'YouTube 8K',
  width: 7680,
  height: 4320,
  fps: 60,
  videoBitrate: '50M',
  audioBitrate: '320k',
  codec: 'libx265',
  preset: 'slow',
  format: 'mp4',
},
```

### Adding Effects
Edit `src/renderer/store/effectsStore.ts` → `effects`:

```typescript
{
  id: 'sepia',
  name: 'Sepia',
  type: 'color',
  parameters: {
    intensity: { value: 0.5, min: 0, max: 1 },
  },
}
```

### Themes
Edit `src/renderer/styles/themes.css` to modify dark/light/high-contrast themes.

## 🐛 Troubleshooting

### FFmpeg Not Found
```powershell
# Windows: Install via Chocolatey
choco install ffmpeg

# Or download from ffmpeg.org and add to PATH
```

### Slow 4K Playback
- Enable proxy editing in Preferences → Performance
- Lower proxy quality to "Low" (1Mbps)
- Ensure hardware acceleration is detected (check status bar)

### Export Failures
- Check disk space (exports require 2x final file size)
- Disable Smart Render if encountering codec issues
- View logs in `AppData/Roaming/electron-video-editor/logs/`

### Crash Recovery
- Relaunch app → Click "Recover Project" in splash screen
- Auto-save creates backups every 60 seconds

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Open a Pull Request

## 🙏 Acknowledgments

- **FFmpeg** - Video processing foundation
- **Electron** - Cross-platform framework
- **React** - UI library
- **Zustand** - State management
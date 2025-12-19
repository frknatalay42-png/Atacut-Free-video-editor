# 🎬 ATACUT - Professional Video Editor v1.0

A lightweight, powerful video editor built with Electron and FFmpeg. Create, edit, and export professional-quality videos with ease.

## 📥 Download

Choose your platform and download the latest version:

| Platform | Download | Version |
|----------|----------|---------|
| 🪟 **Windows** | [ATACUT-Setup.exe](https://github.com/yourusername/atacut/releases/latest) | Latest |
| 🐧 **Linux** | [ATACUT.AppImage](https://github.com/yourusername/atacut/releases/latest) or [.deb](https://github.com/yourusername/atacut/releases/latest) | Latest |

### Installation

**Windows:** Download `.exe` and double-click to install

**Linux (AppImage):**
```bash
chmod +x ATACUT-*.AppImage
./ATACUT-*.AppImage
```

**Linux (Debian/Ubuntu):**
```bash
sudo dpkg -i ATACUT-*.deb
```

---

## ✨ Features

### Core Editing
- **Multi-track Timeline** - Organize video and audio clips across multiple tracks
- **Drag & Drop Interface** - Intuitive clip management on timeline
- **Magnetic Snapping** - Clips automatically snap to nearby edges and markers (100ms threshold)
- **Trim & In-Out Points** - Precise clip editing down to millisecond accuracy
- **Copy/Paste/Duplicate** - Work with clips efficiently

### Color & Effects
- **Color Grading**
  - Brightness adjustment (-100 to +100)
  - Contrast control (-100 to +100)
  - Saturation adjustment (-100 to +100)
- **Filter Effects**
  - Blur (configurable intensity)
  - Sharpen (detail enhancement)
  - Sepia (warm vintage tone)
  - Vintage (retro color-shifted look)

### Text & Overlays
- **Text Overlays** - Add multiple text clips with custom properties
  - Font size (8-72px)
  - Color picker (RGB)
  - Position control (normalized 0-1 scale)
  - Duration control per clip
- **Text Rendering** - Text appears in exported videos

### Export
- **Format**: MP4 (H.264 video + AAC audio)
- **Resolution**: 1920×1080 (Full HD)
- **Hardware Acceleration**: NVIDIA NVENC, Intel QSV
- **All Effects Applied**: Color grading, filters, and text render in output

### Timeline Controls
- **Playback**: Play/pause, seek, frame-by-frame navigation
- **Markers**: Add markers for key points
- **Zoom**: Adjust timeline zoom level
- **Selection**: Single/multi-select, lasso selection
- **Context Menus**: Right-click operations (split, delete, etc.)

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Play/Pause | `Space` |
| Delete Clip | `Delete` |
| Split Clip | `Ctrl+S` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Shift+Z` or `Ctrl+Y` |
| Copy | `Ctrl+C` |
| Paste | `Ctrl+V` |
| Duplicate | `Ctrl+D` |
| Add Marker | `M` |
| Toggle Snap | `G` |
| Playhead Left | `←` (±33ms) or `Shift+←` (±1s) |
| Playhead Right | `→` (±33ms) or `Shift+→` (±1s) |
| Go to Start | `Home` |
| Go to End | `End` |

## 🚀 Getting Started

### Installation
1. Download `ATACUT-1.0-Setup.exe`
2. Run the installer
3. Launch ATACUT from Start Menu or Desktop shortcut

### First Export
1. **Add Media**: Click "Add Media" or drag files into the media library
2. **Create Clips**: Drag videos from media library onto timeline
3. **Edit**: Adjust color, add text, trim clips as needed
4. **Export**: Click "Export Video" and wait for processing
5. **Save**: Exported video is automatically saved to your user folder

### Export Output
Exported videos are saved to:
```
C:\Users\[YourUsername]\AppData\Roaming\Electron\exports\
```

## 💻 System Requirements

### Minimum
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4 GB
- **Disk**: 2 GB free space
- **Processor**: Intel i5 / AMD Ryzen 5 or equivalent

### Recommended
- **OS**: Windows 11 (64-bit)
- **RAM**: 8+ GB
- **Disk**: SSD with 5+ GB free space
- **GPU**: NVIDIA GPU for 2-3x faster export (NVENC support)
- **Processor**: Intel i7 / AMD Ryzen 7 or better

## 📊 Performance

- **Startup**: ~4 seconds
- **Build**: ~8-10 seconds (Webpack compilation)
- **Memory**: 150-250 MB normal, 400-500 MB during export
- **Export Speed**: ~1 minute video takes ~1 minute to export (with effects)
- **GPU Acceleration**: NVIDIA NVENC 2-3x faster than software encoding

## 🎯 Workflow Example

```
1. Load video file
   └─ Click "Add Media" → Select MP4/MOV file

2. Add to timeline
   └─ Drag from Media Library to timeline

3. Trim clip
   └─ Double-click → Set trim start/end points

4. Apply color grading
   └─ Adjust brightness +20, contrast +10

5. Add text overlay
   └─ Click "Add Text" → Position at bottom

6. Apply filter
   └─ Select clip → Choose "Sepia" filter

7. Export
   └─ Click "Export Video" → Wait for completion

8. Playback
   └─ Open exported file from exports folder
```

## 🐛 Troubleshooting

### Export Not Starting
- Ensure at least one video clip is on timeline
- Check that media files are accessible
- Verify at least 2 GB disk space is available

### Text Not Appearing
- Verify text duration spans the exported timeline
- Check text is positioned between 0-1 (not off-screen)
- Ensure font size is large enough (minimum 12px recommended)

### Slow Export
- Normal for complex timelines with multiple effects
- NVIDIA GPU acceleration can speed up 2-3x
- Try reducing number of filters/effects
- Close other applications to free RAM

### Missing Audio
- Check if audio track is muted (speaker icon)
- Verify source video has audio
- Try exporting a single clip to test

## 📁 File Locations

**Exported Videos**:
```
C:\Users\[YourUsername]\AppData\Roaming\Electron\exports\
```

**Project Files** (auto-saved):
```
C:\Users\[YourUsername]\Documents\VideoEditorProjects\
```

**Cache**:
```
C:\Users\[YourUsername]\AppData\Roaming\Electron\.video-editor-cache\
```

## 🔄 Updates

ATACUT is a standalone application. To update:
1. Download latest installer from release page
2. Run new installer (previous version will be replaced)
3. Your projects and exported videos remain untouched

## 📄 License

Commercial use licensed for personal and professional projects.

## 🤝 Support

For issues or feature requests, please include:
- Windows version (Settings → System → About)
- RAM available
- Steps to reproduce issue
- Screenshot if applicable

## 🎨 Credits

Built with:
- **Electron 28** - Desktop framework
- **React 18** - UI library
- **FFmpeg** - Video processing
- **TypeScript 5.3** - Type safety
- **Webpack 5** - Module bundling

## 📝 Version History

### v1.0 (December 15, 2025)
- ✅ Complete video editing suite
- ✅ Color grading (brightness, contrast, saturation)
- ✅ Filter effects (blur, sharpen, sepia, vintage)
- ✅ Text overlay support
- ✅ Multi-track timeline
- ✅ Magnetic snapping
- ✅ Hardware acceleration (NVIDIA NVENC, Intel QSV)
- ✅ MP4 export (H.264 + AAC)
- ✅ Professional UI
- ✅ Comprehensive keyboard shortcuts

---

**Made with ❤️ for video creators**

ATACUT v1.0 - Professional Video Editor

## 🚢 Download & Install (Windows)

1) Ga naar de Releases pagina:
   - https://github.com/frknatalay42-png/Atacut-Free-video-editor/releases

2) Download de installer:
   - Bestandsnaam: ATACUT-Setup-x64.exe (of vergelijkbaar)

3) Start de installatie:
   - Dubbelklik op het .exe-bestand
   - Kies installatielocatie (standaard is prima)
   - Klik “Installeren” en wacht tot de installatie voltooid is

4) Start ATACUT:
   - Via het Startmenu of het bureaubladpictogram

5) Eerste gebruik (aanbevolen):
   - Voeg media toe en maak een korte testexport om te verifiëren dat alles werkt

Opmerkingen:
- ATACUT ondersteunt Windows 10/11 (64-bit)
- Verwijderen kan via Instellingen → Apps → ATACUT → Verwijderen

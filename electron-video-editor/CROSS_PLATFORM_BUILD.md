# ATACUT - Cross-Platform Build Guide

Deze applicatie kan nu op **Windows** en **Linux** gebouwd en gedistribueerd worden.

## Prerequisites

- Node.js 16+ en npm
- Python 3.8+ (voor electron-builder)
- Voor Linux: `build-essential`, `libxss1`, `fakeroot`

### Linux-specifieke dependencies
```bash
sudo apt-get install -y build-essential libxss1 fakeroot libappindicator1 libindicator7 gconf2 gconf-service
```

## Building

### Development Mode
```bash
npm install
npm run dev        # Start in development mode
npm run build-and-start  # Build and start app
```

### Production Build

#### Voor Windows
```bash
npm run package-win
```
Dit genereert:
- `ATACUT-1.0.0.exe` - NSIS Installer
- `ATACUT-1.0.0 Setup.exe` - Draagbare versie

#### Voor Linux
```bash
npm run package-linux
```
Dit genereert:
- `ATACUT-1.0.0.AppImage` - AppImage pakket
- `ATACUT-1.0.0.deb` - Debian pakket (.deb)

#### Voor beide platforms tegelijk
```bash
npm run package
```

## Platform-specifieke Features

### Windows
- Directe hardwareacceleration (NVIDIA NVENC, Intel QSV)
- NSIS installer met custom installation directory
- Portable versie beschikbaar

### Linux
- VAAPI hardwareacceleration support
- AppImage voor universele distributie
- Debian pakket voor ubuntu/debian systemen
- Automatische desktop integration

## FFmpeg Binaries

Het build-proces kopieert automatisch de juiste FFmpeg binaries:
- **Windows**: FFmpeg en FFprobe .exe bestanden
- **Linux**: FFmpeg en FFprobe binaries zonder extensie

Deze worden automatisch gedetecteerd runtime afhankelijk van het platform.

## Installer Voorkeur

Gebruikers downloaden de installer voor hun platform:
- **Windows**: ATACUT-1.0.0.exe
- **Linux**: ATACUT-1.0.0.AppImage of ATACUT-1.0.0.deb

De installer detecteert automatisch het OS en installeert het juiste pakket.

## Troubleshooting

### FFmpeg binaries niet gevonden
Zorg ervoor dat `npm run copy-ffmpeg` succesvol eindigt tijdens de build.

### Linux AppImage permission denied
```bash
chmod +x ATACUT-*.AppImage
./ATACUT-*.AppImage
```

### Debian installatie errors
```bash
sudo apt-get install -f
sudo dpkg -i ATACUT-*.deb
```

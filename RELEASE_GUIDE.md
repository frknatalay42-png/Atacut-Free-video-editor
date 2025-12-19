# 🚀 Release Guide

Dit document beschrijft hoe je ATACUT releaseert naar GitHub zodat gebruikers kunnen kiezen welk platform ze willen.

## Workflow

### 1️⃣ Maak een Tag voor de Release

```bash
# Navigate to project root
cd /path/to/atacut

# Create a version tag (e.g., v1.0.0)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag to GitHub
git push origin v1.0.0
```

### 2️⃣ GitHub Actions Bouwt Automatisch

De workflow in `.github/workflows/build-release.yml` triggert automatisch wanneer je een tag pusht:

```
v1.0.0 tag pushed
        ↓
GitHub Actions starts
        ↓
┌─────────────────────────────────────┐
│  Windows Runner (windows-latest)    │
│  ✅ npm install                     │
│  ✅ npm run build                   │
│  ✅ npm run package                 │
│  → ATACUT-Setup.exe                 │
│  → ATACUT-Portable.exe              │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│  Linux Runner (ubuntu-latest)       │
│  ✅ npm install                     │
│  ✅ npm run build                   │
│  ✅ npm run package                 │
│  → ATACUT-x.x.x.AppImage            │
│  → ATACUT-x.x.x.deb                 │
└─────────────────────────────────────┘
        ↓
GitHub Release Created
├─ ATACUT-Setup.exe (Windows)
├─ ATACUT-Portable.exe (Windows)
├─ ATACUT-x.x.x.AppImage (Linux)
└─ ATACUT-x.x.x.deb (Linux)
```

### 3️⃣ GitHub Release Pagina

Gebruikers gaan naar: `github.com/yourusername/atacut/releases`

Ze zien:
```
🎬 ATACUT v1.0.0

Download for your platform:

🪟 Windows
- ATACUT-Setup.exe (Full installer)
- ATACUT-Portable.exe (No installation)

🐧 Linux
- ATACUT-x.x.x.AppImage (Universal)
- ATACUT-x.x.x.deb (Debian/Ubuntu)
```

Gebruiker kiest hun platform en downloadt!

---

## 📋 Checklist voor Release

Voordat je een release doet, zorg ervoor:

- [ ] `npm run build` werkt zonder errors
- [ ] `npm run package-win` genereert Windows installers
- [ ] `npm run package-linux` genereert Linux installers
- [ ] Version in `package.json` is updated
- [ ] `CHANGELOG.md` is bijgewerkt
- [ ] Alle commits zijn gepusht naar main branch
- [ ] GitHub Actions workflow is ingeschakeld

### Versioning

Gebruik semantic versioning:
- `v1.0.0` - Major release (breaking changes)
- `v1.1.0` - Minor release (new features)
- `v1.0.1` - Patch release (bug fixes)

---

## 🔧 Local Build (voor testing)

Wil je eerst lokaal testen voordat je release?

```bash
cd electron-video-editor

# Build for Windows
npm run package-win

# Build for Linux
npm run package-linux

# Output in build/ directory
```

---

## 📝 Release Notes Template

Wanneer GitHub Release aanmaakt, gebruik deze template:

```markdown
# 🎬 ATACUT v1.0.0

## ✨ Features
- ✅ Motion tracking (4 types: object, face, motion, optical flow)
- ✅ Cross-platform (Windows, Linux, macOS coming soon)
- ✅ Hardware acceleration (NVIDIA NVENC, Intel QSV, VAAPI)
- ✅ Multi-track editing with unlimited tracks
- ✅ Real-time preview and effects

## 🐛 Bug Fixes
- Fixed FFmpeg path detection on Linux
- Improved memory management for large videos
- Better error handling for export failures

## 📥 Installation

### Windows
Download `ATACUT-Setup.exe` and run installer

### Linux
```bash
chmod +x ATACUT-v1.0.0.AppImage
./ATACUT-v1.0.0.AppImage
```

Or install .deb:
```bash
sudo dpkg -i ATACUT-1.0.0.deb
```

## 🙏 Thank You
Thanks for using ATACUT! Report bugs on GitHub Issues.
```

---

## 🚨 Troubleshooting

### Build fails on GitHub Actions

1. Check logs: Actions tab → workflow run → build job
2. Common issues:
   - Missing dependencies: `npm install` failed
   - FFmpeg path wrong: Check `copy-ffmpeg.js`
   - File permissions: Linux build needs executable bits

### Installers not created

```bash
# Check if build succeeded
npm run build

# Then manually run:
npm run package-win   # Windows
npm run package-linux # Linux

# Should create in ./build/ directory
```

### Can't create tags

```bash
# Make sure you're on main branch
git checkout main

# Pull latest
git pull origin main

# Create tag
git tag -a v1.0.0 -m "Release 1.0.0"

# Push tag
git push origin v1.0.0
```

---

## 🔐 GitHub Token

GitHub Actions uses `GITHUB_TOKEN` automatically. Geen setup nodig!

---

## 📊 Release Versioning

Bijhouden in `package.json`:

```json
{
  "name": "atacut",
  "version": "1.0.0",
  "description": "Professional Video Editor"
}
```

Zelfde versie als je git tag!

---

## 🎉 Next Steps

1. Zet code op GitHub (als je nog niet gedaan hebt)
2. Enable GitHub Actions in repository settings
3. Create een tag: `git tag -a v1.0.0 -m "Release 1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions bouwt beide platforms automatisch
6. Releases pagina toont download links
7. Done! 🎊

---

**Made with ❤️ for video creators everywhere**

# 🎬 ATACUT - Installatie & Setup Handleiding

## Voor Eindgebruikers (Windows)

### ⚡ Snelle Installatie (aanbevolen)

1. **Download de installer**
   - Ga naar: [GitHub Releases](https://github.com/frknatalay42-png/Atacut-Free-video-editor/releases)
   - Download de `.exe` bestand (bijv. `ATACUT-1.1.8-Setup.exe`)
   - Dubbelklik op het bestand

2. **Volg de installatie wizard**
   - Kies de installatielocatie
   - Klik "Install"
   - Wacht tot de installatie compleet is

3. **Start ATACUT**
   - Na installatie verschijnt een desktop icon
   - Dubbelklik op de ATACUT icon
   - De applicatie start op

---

## Voor Ontwikkelaars (Lokale Setup)

### 📋 Vereisten

Installeer deze voordat je begint:

1. **Node.js 18+** (LTS aanbevolen)
   - Download van: https://nodejs.org/
   - Kies de "LTS" versie
   - Installeer en volg de wizard

2. **Git** (optioneel, voor repository klonen)
   - Download van: https://git-scm.com/
   - Installeer met standaard instellingen

### 🚀 Stap-voor-stap Setup

#### Stap 1: Repository klonen of downloaden

**Optie A: Met Git (aanbevolen)**
```bash
git clone https://github.com/frknatalay42-png/Atacut-Free-video-editor.git
cd Atacut-Free-video-editor/electron-video-editor
```

**Optie B: Zonder Git**
- Download ZIP vanaf GitHub
- Pak uit naar een map
- Open PowerShell/Terminal in de `electron-video-editor` map

#### Stap 2: Dependencies installeren

```bash
npm install
```

Dit installeert:
- Electron (desktop framework)
- React (UI library)
- FFmpeg/FFprobe (video processing)
- Alle andere benodigheden

⏱️ Dit kan 2-5 minuten duren

#### Stap 3: Lokaal testen (développement mode)

```bash
npm start
```

Dit:
- Bouwt de app
- Start Electron
- Opent ATACUT in een development window
- Handige voor testen en debugging

#### Stap 4: Productie build (installer maken)

```bash
npm run build
```

Dit genereert de `dist/` map met alle bestanden nodig voor verpakking.

#### Stap 5: Windows installer (.exe) bouwen

```bash
npx electron-builder --win nsis
```

Dit creëert:
- `build/ATACUT-Setup.exe` - Windows installer
- `build/ATACUT-portable.exe` - Portable versie (optioneel)

#### Stap 6: Installer gebruiken

- Het `.exe` bestand staat in de `build/` map
- Distribueer dit naar eindgebruikers
- Eindgebruikers voeren stap 1-2 uit van "Snelle Installatie"

---

## 🔧 Probleemoplossing

### Probleem: `npm install` faalt

**Oplossing:**
```bash
# Verwijder oude install
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json

# Herinstalleer
npm install
```

### Probleem: `npm start` werkt niet

**Oplossing:**
```bash
# Zorg dat je in de electron-video-editor map bent
cd electron-video-editor

# Herstart Node.js
npm run build
npm start
```

### Probleem: Icon wordt niet weergegeven in installer

**Oplossing:**
De `build-resources/icon.ico` en `convert-to-ico.js` zijn automatisch in het proces opgenomen. Dit hoeft niet handmatig ingesteld.

### Probleem: FFmpeg errors

**Oplossing:**
```bash
npm run copy-ffmpeg
```

Dit kopieert de FFmpeg binaries naar de juiste locatie.

---

## 📁 Mapstructuur

```
Atacut-Free-video-editor/
├── electron-video-editor/      # Hoofdapplicatie
│   ├── src/
│   │   ├── main/              # Electron main proces
│   │   ├── renderer/          # React UI
│   │   └── shared/            # Gedeelde code
│   ├── build-resources/
│   │   ├── icon.ico           # Windows icon
│   │   └── icon.png           # Source icon
│   ├── build/                 # Output map (gegenereerd)
│   ├── dist/                  # Webpack output (gegenereerd)
│   ├── package.json           # Dependencies
│   ├── electron-builder.config.js  # Packager config
│   └── convert-to-ico.js      # Icon converter script
├── .github/workflows/
│   └── release-windows.yml    # GitHub Actions workflow
└── README.md                  # Dit bestand
```

---

## 🛠️ Commando's Overzicht

| Commando | Doel |
|----------|------|
| `npm install` | Installeer dependencies |
| `npm start` | Start in development mode |
| `npm run build` | Bouw voor production |
| `npm run dev` | Watch mode (auto-rebuild) |
| `npx electron-builder --win nsis` | Maak Windows installer |
| `npm run copy-ffmpeg` | Kopieer FFmpeg binaries |

---

## 🌍 GitHub Actions (Automatische Releases)

De repository is ingesteld voor automatische Windows installer builds:

1. **Tag pushen:**
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

2. **GitHub Actions runt automatisch:**
   - Checkt je code uit
   - Installeert dependencies
   - Bouwt de app
   - Maakt de Windows installer
   - Publiceert naar Releases

3. **Eindgebruikers kunnen downloaden** van de Releases pagina

---

## ❓ Veelgestelde Vragen

**V: Kan ik ATACUT op Mac/Linux gebruiken?**
A: Ja! ATACUT werkt nu op **Windows, Linux en macOS**. Download de juiste installer:
   - Windows: `ATACUT-1.0.0.exe`
   - Linux: `ATACUT-1.0.0.AppImage` of `.deb`
   - macOS: Ondersteuning wordt toegevoegd

**V: Ondersteunt ATACUT multi-track editing?**
A: Ja! Je kunt:
   - Meerdere **Video tracks** toevoegen (rechter-klik in timeline)
   - **Audio tracks** apart bewerken
   - **Text overlays** op eigen track
   - **Effects tracks** voor speciale effecten
   - Tracks verwijderen (behalve de eerste)
   - Clips verslepen tussen tracks

**V: Waar zijn mijn project bestanden opgeslagen?**
A: `%APPDATA%/ATACUT/` op Windows (na installatie).

**V: Hoe help ik met ontwikkeling?**
A: Fork de repo, maak een branch, push changes, en open een Pull Request!

---

## 📞 Support

- Issues: https://github.com/frknatalay42-png/Atacut-Free-video-editor/issues
- Discussions: https://github.com/frknatalay42-png/Atacut-Free-video-editor/discussions

---

**Succes met ATACUT! 🎉**

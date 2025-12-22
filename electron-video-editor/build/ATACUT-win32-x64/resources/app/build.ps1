# Clean Build Script for ATACUT
Write-Host "🧹 Starting clean build..."

# 1. Clean
Write-Host "Step 1: Cleaning build artifacts..."
Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Build with webpack
Write-Host "Step 2: Building with webpack..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!"
    exit 1
}

# 3. Create build directory structure
Write-Host "Step 3: Creating build directory..."
$buildDir = "build\ATACUT-win32-x64"
mkdir -Force "$buildDir" | Out-Null

# 4. Copy electron files from dist/win-unpacked (if exists, otherwise build locally)
Write-Host "Step 4: Setting up electron framework..."

# First try to use npx electron to get the framework
# We'll create a minimal package to extract electron binaries
if (-not (Test-Path "dist/win-unpacked")) {
    # Use npx to download electron and extract it
    Write-Host "Downloading Electron framework..."
    npx @electron/get --version 28.3.3
}

# 5. Copy application files to build directory
Write-Host "Step 5: Copying application files..."
if (Test-Path "dist/win-unpacked") {
    Copy-Item "dist/win-unpacked/*" "$buildDir/" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Copied from dist/win-unpacked"
} else {
    Write-Host "⚠️  No dist/win-unpacked found, attempting to build with electron-builder..."
    npm run package
}

# 6. Verify build
Write-Host "Step 6: Verifying build..."
if (Test-Path "$buildDir/atacut.exe") {
    Write-Host "✅ Build successful!"
    Write-Host "📦 Executable: $buildDir\atacut.exe"
    Get-Item "$buildDir/atacut.exe" | Select-Object Name, Length
} else {
    Write-Host "❌ Build failed - atacut.exe not found"
    exit 1
}

Write-Host "✨ Build complete!"

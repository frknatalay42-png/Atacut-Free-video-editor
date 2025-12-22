const fs = require('fs');
const path = require('path');

const platform = process.platform;
const isWin32 = platform === 'win32';
const isLinux = platform === 'linux';

// Ensure ffmpeg executable is copied
if (isWin32) {
  // Windows build
  console.log('📦 Building for Windows...');
  
  // Create directories
  fs.mkdirSync('dist/bin/win32/x64', { recursive: true });
  
  // Copy FFmpeg
  try {
    fs.copyFileSync('node_modules/ffmpeg-static/ffmpeg.exe', 'dist/ffmpeg.exe');
    console.log('✅ Copied ffmpeg.exe');
  } catch (error) {
    console.error('⚠️ Could not copy ffmpeg.exe:', error.message);
  }
  
  // Copy FFprobe
  try {
    fs.copyFileSync(
      'node_modules/ffprobe-static/bin/win32/ia32/ffprobe.exe',
      'dist/bin/win32/x64/ffprobe.exe'
    );
    console.log('✅ Copied ffprobe.exe');
  } catch (error) {
    console.error('⚠️ Could not copy ffprobe.exe:', error.message);
  }
} else if (isLinux) {
  // Linux build
  console.log('📦 Building for Linux...');
  
  // Create directories
  fs.mkdirSync('dist/bin/linux/x64', { recursive: true });
  
  // Copy FFmpeg
  try {
    const ffmpegSource = 'node_modules/ffmpeg-static/ffmpeg';
    fs.copyFileSync(ffmpegSource, 'dist/ffmpeg');
    fs.chmodSync('dist/ffmpeg', 0o755);
    console.log('✅ Copied ffmpeg');
  } catch (error) {
    console.error('⚠️ Could not copy ffmpeg:', error.message);
  }
  
  // Copy FFprobe
  try {
    const ffprobeSource = 'node_modules/ffprobe-static/bin/linux/x64/ffprobe';
    fs.copyFileSync(ffprobeSource, 'dist/bin/linux/x64/ffprobe');
    fs.chmodSync('dist/bin/linux/x64/ffprobe', 0o755);
    console.log('✅ Copied ffprobe');
  } catch (error) {
    console.error('⚠️ Could not copy ffprobe:', error.message);
  }
} else {
  console.log('⚠️ Unsupported platform:', platform);
  console.log('Only Windows and Linux are supported at this time.');
}

console.log(`\n✨ FFmpeg binaries setup complete for ${platform}!`);

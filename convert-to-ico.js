// Proxy icon conversion script at repo root
// Delegates to electron-video-editor/convert-to-ico.js
try {
  require('path');
  require('./electron-video-editor/convert-to-ico.js');
} catch (err) {
  console.error('convert-to-ico proxy failed:', err && err.message ? err.message : err);
  process.exitCode = 0; // Do not fail CI if optional icon step fails
}

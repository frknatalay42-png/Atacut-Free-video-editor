const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Building ATACUT Portable Executable...\n');

try {
  // Use electron-packager to create portable app
  const electronVersion = require('../package.json').devDependencies.electron.replace('^', '');
  
  const cmd = `npx electron-packager . ATACUT --platform=win32 --arch=x64 --electron-version=${electronVersion} --asar=false --overwrite --out=build`;
  
  console.log(`Running: ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: __dirname + '/..' });
  
  console.log('\n✅ Build successful!');
  
  // Check if executable exists
  const exePath = path.join(__dirname, '../build/ATACUT-win32-x64/ATACUT.exe');
  if (fs.existsSync(exePath)) {
    const stats = fs.statSync(exePath);
    console.log(`\n📦 Executable: ${exePath}`);
    console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

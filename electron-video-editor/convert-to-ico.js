const fs = require('fs');
const path = require('path');

// Use sharp library if available, otherwise just copy PNG as ICO
try {
  const pngToIco = require('png-to-ico');
  
  const pngPath = path.join(__dirname, 'build-resources', 'icon.png');
  const icoPath = path.join(__dirname, 'build-resources', 'icon.ico');
  
  pngToIco(pngPath)
    .then(buf => {
      fs.writeFileSync(icoPath, buf);
      console.log('✅ icon.ico generated from PNG');
    })
    .catch(err => {
      console.error('❌ png-to-ico failed:', err.message);
      console.log('Falling back to existing icon.ico');
    });
} catch (e) {
  console.log('png-to-ico not installed, using existing icon.ico');
}

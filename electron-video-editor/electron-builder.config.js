module.exports = {
  appId: 'com.atacut.editor',
  productName: 'ATACUT',
  copyright: 'Copyright © 2025 - ATACUT Video Editor',
  asar: false,
  directories: {
    output: 'build',
    buildResources: 'build-resources'
  },
  files: [
    'dist/**/*',
    'package.json',
    'resources/**/*',
    'node_modules/**/*',
    '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
    '!**/node_modules/**/*.d.ts',
    '!**/node_modules/.bin',
    '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
    '!**/node_modules/**/{appveyor.yml,.travis.yml,circle.yml}'
  ],
  win: {
    target: ['nsis'],
    icon: 'build-resources/icon.ico',
    artifactName: 'ATACUT-Setup-${version}.${ext}'
  },
  nsis: {
    oneClick: true,
    allowElevation: true,
    allowToChangeInstallationDirectory: false,
    perMachine: false,
    createDesktopShortcut: true,
    shortcutName: 'ATACUT',
    installerIcon: 'build-resources/icon.ico',
    uninstallerIcon: 'build-resources/icon.ico',
    installerHeaderIcon: 'build-resources/icon.ico'
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'build-resources/icon.png',
    category: 'Video'
  },
  deb: {
    depends: ['libxss1', 'libappindicator1', 'libindicator7', 'gconf2', 'gconf-service'],
    category: 'Video'
  },
  appImage: {
    artifactName: '${name}-${version}.${ext}'
  }
};
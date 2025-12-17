module.exports = {
  appId: 'com.atacut.app',
  productName: 'ATACUT',
  copyright: 'Copyright © 2025 - ATACUT Video Editor',
  asar: false,
  asarUnpack: [],
  directories: {
    output: 'build',
    buildResources: 'resources'
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
    target: [
      'nsis'
    ],
    icon: false,
    certificateFile: null,
    certificatePassword: null,
    signingHashAlgorithms: ['sha256'],
    sign: null
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: false,
    uninstallerIcon: false
  }
};
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
    target: 'nsis',
    icon: 'build-resources/icon.ico'
  },
  nsis: {
    oneClick: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true
  }
};
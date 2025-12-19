#!/bin/bash
# release.sh - Build and create GitHub release

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh v1.0.0"
  exit 1
fi

echo "🚀 Building ATACUT $VERSION..."

# Navigate to project directory
cd electron-video-editor

# Clean previous builds
rm -rf build/

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building application..."
npm run build

echo "📦 Creating installers..."
npm run package

echo "✅ Build complete!"
echo ""
echo "📦 Created installers:"
ls -lh build/ATACUT-* 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'

echo ""
echo "🏷️ Tag and push:"
echo "   git tag -a $VERSION -m 'Release $VERSION'"
echo "   git push origin $VERSION"
echo ""
echo "GitHub Actions will automatically:"
echo "   ✅ Build both Windows and Linux"
echo "   ✅ Create GitHub Release"
echo "   ✅ Upload all installers"

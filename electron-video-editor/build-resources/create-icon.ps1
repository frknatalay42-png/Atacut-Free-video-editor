# Create a minimal valid PNG-based ICO file
# This is a 32x32 transparent PNG wrapped in ICO format

$outPath = ".\icon.ico"

# Minimal 32x32 PNG (transparent)
$pngHeader = @(
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A  # PNG signature
)

# IHDR chunk: 32x32, 8-bit RGBA
$ihdr = @(
    0x00, 0x00, 0x00, 0x0D,  # chunk length
    0x49, 0x48, 0x44, 0x52,  # IHDR
    0x00, 0x00, 0x00, 0x20,  # width: 32
    0x00, 0x00, 0x00, 0x20,  # height: 32
    0x08, 0x06, 0x00, 0x00, 0x00,  # bit depth, color type, compression, filter, interlace
    0x3E, 0x28, 0xCB, 0x34   # CRC
)

# Minimal IDAT (all transparent)
$idat = @(
    0x00, 0x00, 0x00, 0x0A,  # chunk length
    0x49, 0x44, 0x41, 0x54,  # IDAT
    0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
    0x0D, 0x0A, 0x2D, 0xB4   # CRC
)

# IEND chunk
$iend = @(
    0x00, 0x00, 0x00, 0x00,  # chunk length
    0x49, 0x45, 0x4E, 0x44,  # IEND
    0xAE, 0x42, 0x60, 0x82   # CRC
)

# Build PNG data
$pngData = $pngHeader + $ihdr + $idat + $iend

# ICO header for 1 image
$icoHeader = @(
    0x00, 0x00,              # Reserved
    0x01, 0x00,              # Type: 1 (ICO)
    0x01, 0x00               # Count: 1 image
)

# Image directory entry
$dirEntry = @(
    0x20,                    # width
    0x20,                    # height
    0x00,                    # color count
    0x00,                    # reserved
    0x01, 0x00,              # color planes
    0x20, 0x00,              # bits per pixel
    [byte]($pngData.Length -band 0xFF),
    [byte](($pngData.Length -shr 8) -band 0xFF),
    [byte](($pngData.Length -shr 16) -band 0xFF),
    [byte](($pngData.Length -shr 24) -band 0xFF),
    0x16, 0x00, 0x00, 0x00   # offset to image data
)

# Assemble final ICO
$ico = $icoHeader + $dirEntry + $pngData

[System.IO.File]::WriteAllBytes($outPath, $ico)
Write-Host "✅ Icon created: $outPath ($($(Get-Item $outPath).Length) bytes)"

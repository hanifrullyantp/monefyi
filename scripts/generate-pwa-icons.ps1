# Generate clean Monefyi icons: solid emerald (#10B981) + black M mark only.
# Removes lime inner square, black corner artifacts, and double-layer PWA icons.
#
# Usage: powershell -File scripts/generate-pwa-icons.ps1
# Then bump ?v= in app/index.html and app/public/manifest.webmanifest

Add-Type -AssemblyName System.Drawing

$IconVersion = '2026-07-25-logo'
$EmeraldHex = '#10B981'
$SourcePath = Join-Path $PSScriptRoot '..\app\icons\monefyi-logo-source.png'
$LegacySource = Join-Path $PSScriptRoot '..\app\icons\monefyi-logo.png'

if (!(Test-Path $SourcePath)) {
  Copy-Item -Path $LegacySource -Destination $SourcePath -Force
  Write-Host "Saved source copy: $SourcePath"
}

$Emerald = [System.Drawing.ColorTranslator]::FromHtml($EmeraldHex)
$Black = [System.Drawing.Color]::FromArgb(255, 0, 0, 0)

function Test-GreenBg([System.Drawing.Color]$c) {
  return ($c.G -ge 130 -and $c.R -ge 90 -and $c.B -le 130 -and $c.G -gt $c.B)
}

function Test-Black([System.Drawing.Color]$c) {
  return ($c.R -le 60 -and $c.G -le 60 -and $c.B -le 60)
}

function Test-MarkBlack([int]$x, [int]$y, [int]$w, [int]$h) {
  $nx = ($x / [double]$w) - 0.5
  $ny = ($y / [double]$h) - 0.5
  if ([Math]::Abs($nx) -gt 0.40 -and [Math]::Abs($ny) -gt 0.40) { return $false }
  return $true
}

function Get-GreenBounds([System.Drawing.Bitmap]$bmp) {
  $minX = $bmp.Width
  $minY = $bmp.Height
  $maxX = 0
  $maxY = 0
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $c = $bmp.GetPixel($x, $y)
      if (Test-GreenBg $c) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt $minX) {
    return @{ Left = 0; Top = 0; Width = $bmp.Width; Height = $bmp.Height }
  }
  return @{
    Left = $minX
    Top = $minY
    Width = ($maxX - $minX + 1)
    Height = ($maxY - $minY + 1)
  }
}

function New-CleanLogoBitmap {
  param(
    [int]$Size,
    [double]$MarkScale = 0.78
  )

  $src = [System.Drawing.Image]::FromFile((Resolve-Path $SourcePath))
  $srcBmp = New-Object System.Drawing.Bitmap $src.Width, $src.Height
  $sg = [System.Drawing.Graphics]::FromImage($srcBmp)
  $sg.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $sg.Dispose()
  $src.Dispose()

  $bounds = Get-GreenBounds $srcBmp
  $cropRect = New-Object System.Drawing.Rectangle $bounds.Left, $bounds.Top, $bounds.Width, $bounds.Height
  $crop = $srcBmp.Clone($cropRect, $srcBmp.PixelFormat)
  $srcBmp.Dispose()

  $out = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($Emerald)

  $markSize = [int]($Size * $MarkScale)
  $offsetX = [int](($Size - $markSize) / 2)
  $offsetY = [int](($Size - $markSize) / 2)

  for ($oy = 0; $oy -lt $markSize; $oy++) {
    $sy = [int]($oy / $markSize * $crop.Height)
    if ($sy -ge $crop.Height) { $sy = $crop.Height - 1 }
    for ($ox = 0; $ox -lt $markSize; $ox++) {
      $sx = [int]($ox / $markSize * $crop.Width)
      if ($sx -ge $crop.Width) { $sx = $crop.Width - 1 }
      $c = $crop.GetPixel($sx, $sy)
      if ((Test-Black $c) -and (Test-MarkBlack $sx $sy $crop.Width $crop.Height)) {
        $out.SetPixel(($offsetX + $ox), ($offsetY + $oy), $Black)
      }
    }
  }

  $crop.Dispose()
  $g.Dispose()
  return $out
}

function Save-Bitmap {
  param([System.Drawing.Bitmap]$Bmp, [string]$OutPath)
  $dir = Split-Path $OutPath
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $Bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Wrote $OutPath"
}

$root = Join-Path $PSScriptRoot '..'

$logo1024 = New-CleanLogoBitmap -Size 1024 -MarkScale 0.78
Save-Bitmap -Bmp $logo1024 -OutPath (Join-Path $root 'app\icons\monefyi-logo.png')
Save-Bitmap -Bmp $logo1024 -OutPath (Join-Path $root 'app\public\icons\monefyi-logo.png')
$logo1024.Dispose()

$sizes = @(
  @{ Name = 'icon-180.png'; Size = 180; Scale = 0.78 },
  @{ Name = 'icon-192.png'; Size = 192; Scale = 0.78 },
  @{ Name = 'icon-512.png'; Size = 512; Scale = 0.78 },
  @{ Name = 'icon-maskable-512.png'; Size = 512; Scale = 0.58 }
)

foreach ($spec in $sizes) {
  $bmp = New-CleanLogoBitmap -Size $spec.Size -MarkScale $spec.Scale
  Save-Bitmap -Bmp $bmp -OutPath (Join-Path $root ("app\icons\" + $spec.Name))
  Save-Bitmap -Bmp $bmp -OutPath (Join-Path $root ("app\public\icons\" + $spec.Name))
  $bmp.Dispose()
}

Write-Host "Done. Bump manifest/index icon ?v= to: $IconVersion"

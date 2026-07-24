/**
 * Generate opaque PWA icons from app/icons/monefyi-logo.png
 * (transparent/black logos appear blank on Windows Chrome installed shortcuts).
 *
 * Usage (PowerShell): powershell -File scripts/generate-pwa-icons.ps1
 * Bump ICON_VERSION in app/public/manifest.webmanifest + index.html after regenerating.
 */
Add-Type -AssemblyName System.Drawing

$IconVersion = '2026-07-24-pwa'
$BgHex = '#10B981'
$LogoPath = Join-Path $PSScriptRoot '..\app\icons\monefyi-logo.png'

function New-PwaIcon {
  param([string]$OutPath, [int]$Size, [double]$LogoScale = 0.68)
  $bg = [System.Drawing.ColorTranslator]::FromHtml($BgHex)
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'HighQuality'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear($bg)
  $logo = [System.Drawing.Image]::FromFile((Resolve-Path $LogoPath))
  $logoSize = [int]($Size * $LogoScale)
  $x = [int](($Size - $logoSize) / 2)
  $y = [int](($Size - $logoSize) / 2)
  $g.DrawImage($logo, $x, $y, $logoSize, $logoSize)
  $logo.Dispose()
  $dir = Split-Path $OutPath
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "Wrote $OutPath"
}

$root = Join-Path $PSScriptRoot '..'
$outs = @(
  @{ Path = 'app\icons\icon-192.png'; Size = 192; Scale = 0.68 },
  @{ Path = 'app\icons\icon-512.png'; Size = 512; Scale = 0.68 },
  @{ Path = 'app\icons\icon-maskable-512.png'; Size = 512; Scale = 0.52 },
  @{ Path = 'app\public\icons\icon-192.png'; Size = 192; Scale = 0.68 },
  @{ Path = 'app\public\icons\icon-512.png'; Size = 512; Scale = 0.68 },
  @{ Path = 'app\public\icons\icon-maskable-512.png'; Size = 512; Scale = 0.52 }
)
foreach ($o in $outs) {
  New-PwaIcon -OutPath (Join-Path $root $o.Path) -Size $o.Size -LogoScale $o.Scale
}
Write-Host "Done. Manifest icon ?v= should be: $IconVersion"

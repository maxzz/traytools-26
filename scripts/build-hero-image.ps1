<#
.SYNOPSIS
    Generates the README hero image: frontend/src/assets/previews/2026,08.10.26_1_hero_welcome.svg

.DESCRIPTION
    The hero is an SVG with a fully transparent background (it adapts to the
    viewer's light/dark theme via an embedded prefers-color-scheme style block).
    The nine screenshots from the previews folder are cropped to the tile
    aspect, scaled down, and embedded as base64 PNG data URIs, so the SVG is a
    single self-contained file that renders on GitHub (external <image> links
    are blocked by GitHub's CSP, which is why the images are embedded).

    Layout follows the prototype sketch: title + tagline on top, four tool
    tiles across the top, four across the bottom, and the dark Welcome page as
    a larger glowing tile in the center.

    Run from anywhere:  powershell -File scripts/build-hero-image.ps1
#>

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$repoRoot    = Split-Path -Parent $PSScriptRoot
$previewsDir = Join-Path $repoRoot 'frontend/src/assets/previews'
$outSvg      = Join-Path $previewsDir '2026,08.10.26_1_hero_welcome.svg'
$tempDir     = Join-Path $env:TEMP 'traytools-hero'
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# ---------------------------------------------------------------------------
# Layout constants (SVG user units; embedded rasters are rendered at 2x).
# ---------------------------------------------------------------------------
$tileW   = 345   # tile image size (display)
$tileH   = 216
$tilePad = 6
$frameW  = $tileW + 2 * $tilePad   # 357
$frameH  = $tileH + 2 * $tilePad   # 228
$topY    = 158
$bottomY = 848
$rowX    = @(40, 427, 814, 1201)

$centerW   = 480
$centerH   = 360
$centerPad = 8
$centerFX  = [int]((1600 - ($centerW + 2 * $centerPad)) / 2)   # 552
$centerFY  = 444

$tileAspect   = $tileW / $tileH      # ~1.597 (8:5)
$centerAspect = $centerW / $centerH  # 1.333 (4:3)

# Tiles in prototype order: top row A-D, bottom row E-H.
$tiles = @(
    @{ File = '2026,08.09.26_1_tab_copy-ops.png'; Caption = 'Copy operations'  }
    @{ File = '2026,08.09.26_2_tab_sync.png';     Caption = 'Sync folders'     }
    @{ File = '2026,08.09.26_3_tab_registry.png'; Caption = 'Registry editor'  }
    @{ File = '2026,08.09.26_4_tab_tools.png';    Caption = 'Tools menu'       }
    @{ File = '2026,08.09.26_5_tab_windows.png';  Caption = 'Windows tree'     }
    @{ File = '2026,08.09.26_6_tab_acitve.png';   Caption = 'Active monitor'   }
    @{ File = '2026,08.09.26_7_tab_trace.png';    Caption = 'Trace bits'       }
    @{ File = '2026,08.09.26_8_tab_options.png';  Caption = 'Settings'         }
)
$centerFile = '2026,08.08.26_0_tab_dark_mode.png'   # Welcome page, dark theme

# ---------------------------------------------------------------------------
# Crop to target aspect (anchored to the top for tall images) and resize.
# ---------------------------------------------------------------------------
function Convert-ToDataUri {
    param(
        [string]$Path,
        [double]$Aspect,
        [int]$OutW,
        [int]$OutH,
        [string]$OutPath
    )
    $src = [System.Drawing.Image]::FromFile($Path)
    try {
        $srcAspect = $src.Width / $src.Height
        if ($srcAspect -gt $Aspect) {
            # Too wide: crop left/right symmetrically.
            $cropW = [int]($src.Height * $Aspect)
            $cropH = $src.Height
            $cropX = [int](($src.Width - $cropW) / 2)
            $cropY = 0
        }
        else {
            # Too tall: keep the full width, crop from the top down.
            $cropW = $src.Width
            $cropH = [int]($src.Width / $Aspect)
            if ($cropH -gt $src.Height) { $cropH = $src.Height }
            $cropX = 0
            $cropY = 0
        }

        $bmp = [System.Drawing.Bitmap]::new($OutW, $OutH)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $dest = [System.Drawing.Rectangle]::new(0, 0, $OutW, $OutH)
                $srct = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropW, $cropH)
                $g.DrawImage($src, $dest, $srct, [System.Drawing.GraphicsUnit]::Pixel)
            }
            finally { $g.Dispose() }
            $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally { $bmp.Dispose() }
    }
    finally { $src.Dispose() }

    return 'data:image/png;base64,' + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($OutPath))
}

# ---------------------------------------------------------------------------
# Build the SVG.
# ---------------------------------------------------------------------------
$head = @'
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1140" viewBox="0 0 1600 1140" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" role="img" aria-label="Tray Tools 26 - overview of the application screens">
  <title>Tray Tools 26 - a Swiss Army knife for Windows power users</title>
  <defs>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="0.5" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1f2328" flood-opacity="0.16"/>
    </filter>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="#8b5cf6" flood-opacity="0.55"/>
    </filter>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="arrfill"/>
    </marker>
    <style>
      .title   { font-size: 64px; font-weight: 700; fill: url(#titleGrad); }
      .tag     { font-size: 24px; fill: #57606a; }
      .cap     { font-size: 21px; font-weight: 600; fill: #374151; }
      .frame   { fill: #ffffff; stroke: #d0d7de; stroke-width: 1; }
      .conn    { stroke: #9ca3af; stroke-width: 1.5; }
      .arrfill { fill: #9ca3af; }
      @media (prefers-color-scheme: dark) {
        .tag     { fill: #9198a1; }
        .cap     { fill: #c9d1d9; }
        .frame   { fill: #161b22; stroke: #3d444d; }
        .conn    { stroke: #6e7681; }
        .arrfill { fill: #6e7681; }
      }
    </style>
<!--CLIPS-->
  </defs>
  <text class="title" x="800" y="88" text-anchor="middle">Tray Tools 26</text>
  <text class="tag" x="800" y="130" text-anchor="middle">A Swiss Army knife for Windows power users</text>
'@

$tileFmt = @'
  <g>
    <rect class="frame" x="{0}" y="{1}" width="{2}" height="{3}" rx="10" filter="url(#soft)"/>
    <image x="{4}" y="{5}" width="{6}" height="{7}" preserveAspectRatio="none" clip-path="url(#clip{8})" href="{9}"/>
    <line class="conn" x1="{10}" y1="{11}" x2="{10}" y2="{12}" marker-end="url(#arr)"/>
    <text class="cap" x="{10}" y="{13}" text-anchor="middle">{14}</text>
  </g>
'@

$clips = [System.Text.StringBuilder]::new()
$body  = [System.Text.StringBuilder]::new()

for ($i = 0; $i -lt $tiles.Count; $i++) {
    $isTop = $i -lt 4
    $fx = $rowX[$i % 4]
    $fy = if ($isTop) { $topY } else { $bottomY }
    $ix = $fx + $tilePad
    $iy = $fy + $tilePad
    $cx = $fx + [int]($frameW / 2)
    $lineY1 = $fy + $frameH
    $lineY2 = $lineY1 + 14
    $capY   = $lineY2 + 26

    $src    = Join-Path $previewsDir $tiles[$i].File
    $scaled = Join-Path $tempDir "tile$i.png"
    $uri    = Convert-ToDataUri -Path $src -Aspect $tileAspect -OutW ($tileW * 2) -OutH ($tileH * 2) -OutPath $scaled

    [void]$clips.AppendLine(('    <clipPath id="clip{0}"><rect x="{1}" y="{2}" width="{3}" height="{4}" rx="6"/></clipPath>' -f $i, $ix, $iy, $tileW, $tileH))
    [void]$body.AppendLine(($tileFmt -f $fx, $fy, $frameW, $frameH, $ix, $iy, $tileW, $tileH, $i, $uri, $cx, $lineY1, $lineY2, $capY, $tiles[$i].Caption))
}

# Center tile: dark Welcome page with a glowing gradient frame.
$centerSrc    = Join-Path $previewsDir $centerFile
$centerScaled = Join-Path $tempDir 'tile-center.png'
$centerUri    = Convert-ToDataUri -Path $centerSrc -Aspect $centerAspect -OutW ($centerW * 2) -OutH ($centerH * 2) -OutPath $centerScaled
$cix = $centerFX + $centerPad
$ciy = $centerFY + $centerPad
$cfw = $centerW + 2 * $centerPad
$cfh = $centerH + 2 * $centerPad

[void]$clips.AppendLine(('    <clipPath id="clipC"><rect x="{0}" y="{1}" width="{2}" height="{3}" rx="9"/></clipPath>' -f $cix, $ciy, $centerW, $centerH))
[void]$body.AppendLine(('  <g>'))
[void]$body.AppendLine(('    <rect x="{0}" y="{1}" width="{2}" height="{3}" rx="14" fill="#0d1117" stroke="url(#glowGrad)" stroke-width="2.5" filter="url(#glow)"/>' -f $centerFX, $centerFY, $cfw, $cfh))
[void]$body.AppendLine(('    <image x="{0}" y="{1}" width="{2}" height="{3}" preserveAspectRatio="none" clip-path="url(#clipC)" href="{4}"/>' -f $cix, $ciy, $centerW, $centerH, $centerUri))
[void]$body.AppendLine(('  </g>'))

$svg = $head.Replace('<!--CLIPS-->', $clips.ToString().TrimEnd()) + "`n" + $body.ToString() + '</svg>' + "`n"

[System.IO.File]::WriteAllText($outSvg, $svg, [System.Text.UTF8Encoding]::new($false))

$sizeKB = [math]::Round((Get-Item $outSvg).Length / 1KB)
Write-Host "Wrote $outSvg ($sizeKB KB)"

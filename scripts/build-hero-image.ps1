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

    Layout follows the prototype sketch: title + tagline on top, the dark
    Welcome page as a larger glowing tile in the center, and the eight tool
    tiles arranged in a circle around it. Each tile has a plain straight line
    running from the rectangle toward the center image, and a caption label
    underneath the rectangle.

    Run from anywhere:  powershell -File scripts/build-hero-image.ps1
#>

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$repoRoot    = Split-Path -Parent $PSScriptRoot
$previewsDir = Join-Path $repoRoot 'frontend/src/assets/previews'
$outSvg      = Join-Path $previewsDir '2026,08.10.26_1_hero_welcome.svg'
$titleSvg    = Join-Path $repoRoot 'frontend/src/assets/icons/SVG/title-image.svg'
$tempDir     = Join-Path $env:TEMP 'traytools-hero'
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# ---------------------------------------------------------------------------
# Layout constants (SVG user units; embedded rasters are rendered at 2x).
# ---------------------------------------------------------------------------
$tileW   = 280   # tile image size (display)
$tileH   = 175
$tilePad = 6
$tileHW  = $tileW + 2 * $tilePad   # frame width  = 292
$tileHH  = $tileH + 2 * $tilePad   # frame height = 187

# Center tile shows the full Welcome screenshot, so its aspect ratio is
# preserved (no cropping): source is 571x622, displayed at 312x340.
$centerW   = 312
$centerH   = 340
$centerPad = 8
$centerHW  = $centerW + 2 * $centerPad   # 456
$centerHH  = $centerH + 2 * $centerPad   # 346

# Radial cluster geometry.
$ccX = 800          # circle center X (canvas center)
$ccY = 685          # circle center Y
$rx  = 560          # horizontal radius of the tile ring
$ry  = 400          # vertical radius of the tile ring

$centerFX = $ccX - [int]($centerHW / 2)   # 572
$centerFY = $ccY - [int]($centerHH / 2)   # 512

$tileAspect   = $tileW / $tileH      # 1.6
$centerAspect = $centerW / $centerH  # ~0.918, matches the source screenshot

# Tiles in tab order, placed clockwise starting at the top of the ring.
$diagX = [int]($rx * 0.7071)   # 396
$diagY = [int]($ry * 0.7071)   # 283
$tiles = @(
    @{ File = '2026,08.09.26_1_tab_copy-ops.png'; Caption = 'Copy operations';  CX = $ccX;          CY = ($ccY - $ry)    }   # N
    @{ File = '2026,08.09.26_2_tab_sync.png';     Caption = 'Sync folders';     CX = ($ccX + $diagX); CY = ($ccY - $diagY) }   # NE
    @{ File = '2026,08.09.26_3_tab_registry.png'; Caption = 'Registry editor';  CX = ($ccX + $rx);  CY = $ccY            }   # E
    @{ File = '2026,08.09.26_4_tab_tools.png';    Caption = 'Tools menu';       CX = ($ccX + $diagX); CY = ($ccY + $diagY) }   # SE
    @{ File = '2026,08.09.26_5_tab_windows.png';  Caption = 'Windows tree';     CX = $ccX;          CY = ($ccY + $ry)    }   # S
    @{ File = '2026,08.09.26_6_tab_acitve.png';   Caption = 'Active monitor';   CX = ($ccX - $diagX); CY = ($ccY + $diagY) }   # SW
    @{ File = '2026,08.09.26_7_tab_trace.png';    Caption = 'Trace bits';       CX = ($ccX - $rx);  CY = $ccY            }   # W
    @{ File = '2026,08.09.26_8_tab_options.png';  Caption = 'Settings';         CX = ($ccX - $diagX); CY = ($ccY - $diagY) }   # NW
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
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1240" viewBox="0 0 1600 1240" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" role="img" aria-label="Tray Tools 26 - overview of the application screens">
  <title>Tray Tools 26 - a Swiss Army knife for Windows power users</title>
  <defs>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1f2328" flood-opacity="0.16"/>
    </filter>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="#0ea5e9" flood-opacity="0.55"/>
    </filter>
    <style>
      .tag     { font-size: 24px; fill: #57606a; }
      .cap     { font-size: 21px; font-weight: 600; fill: #374151; }
      .frame   { fill: #ffffff; stroke: #d0d7de; stroke-width: 1; }
      .conn    { stroke: #9ca3af; stroke-width: 1.5; stroke-linecap: round; }
      @media (prefers-color-scheme: dark) {
        .tag     { fill: #9198a1; }
        .cap     { fill: #c9d1d9; }
        .frame   { fill: #161b22; stroke: #3d444d; }
        .conn    { stroke: #6e7681; }
      }
    </style>
<!--CLIPS-->
  </defs>
  <image x="590" y="26" width="420" height="79.5" href="<!--TITLE-->"/>
  <text class="tag" x="800" y="130" text-anchor="middle">A Swiss Army knife for Windows power users</text>
'@

$tileFmt = @'
  <g>
    <line class="conn" x1="{0}" y1="{1}" x2="{2}" y2="{3}"/>
    <rect class="frame" x="{4}" y="{5}" width="{6}" height="{7}" rx="10" filter="url(#soft)"/>
    <image x="{8}" y="{9}" width="{10}" height="{11}" preserveAspectRatio="none" clip-path="url(#clip{12})" href="{13}"/>
    <text class="cap" x="{14}" y="{15}" text-anchor="middle">{16}</text>
  </g>
'@

$clips = [System.Text.StringBuilder]::new()
$body  = [System.Text.StringBuilder]::new()

for ($i = 0; $i -lt $tiles.Count; $i++) {
    $cx = [double]$tiles[$i].CX
    $cy = [double]$tiles[$i].CY

    $fx = [int]$cx - [int]($tileHW / 2)
    $fy = [int]$cy - [int]($tileHH / 2)
    $ix = $fx + $tilePad
    $iy = $fy + $tilePad
    $capY = $fy + $tileHH + 34

    # Plain connector line: from the tile frame edge toward the center frame
    # edge along the radial direction, with an 8px gap at both ends.
    $dx  = $ccX - $cx
    $dy  = $ccY - $cy
    $len = [math]::Sqrt($dx * $dx + $dy * $dy)
    $ux  = $dx / $len
    $uy  = $dy / $len

    $t1 = [math]::Min(([int]($tileHW / 2)) / [math]::Abs($ux), ([int]($tileHH / 2)) / [math]::Abs($uy))
    $x1 = [int][math]::Round($cx + $ux * ($t1 + 8))
    $y1 = [int][math]::Round($cy + $uy * ($t1 + 8))

    $t2 = [math]::Min(([int]($centerHW / 2)) / [math]::Abs($ux), ([int]($centerHH / 2)) / [math]::Abs($uy))
    $x2 = [int][math]::Round($ccX - $ux * ($t2 + 8))
    $y2 = [int][math]::Round($ccY - $uy * ($t2 + 8))

    if ($uy -gt 0.99) {
        # Tile directly above the center: its caption sits on the spoke, so the
        # line starts below the caption instead of at the frame edge.
        $x1 = [int]$cx
        $y1 = $capY + 12
    }

    $src    = Join-Path $previewsDir $tiles[$i].File
    $scaled = Join-Path $tempDir "tile$i.png"
    $uri    = Convert-ToDataUri -Path $src -Aspect $tileAspect -OutW ($tileW * 2) -OutH ($tileH * 2) -OutPath $scaled

    [void]$clips.AppendLine(('    <clipPath id="clip{0}"><rect x="{1}" y="{2}" width="{3}" height="{4}" rx="6"/></clipPath>' -f $i, $ix, $iy, $tileW, $tileH))
    [void]$body.AppendLine(($tileFmt -f $x1, $y1, $x2, $y2, $fx, $fy, $tileHW, $tileHH, $ix, $iy, $tileW, $tileH, $i, $uri, [int]$cx, $capY, $tiles[$i].Caption))
}

# Center tile: dark Welcome page with a glowing gradient frame.
$centerSrc    = Join-Path $previewsDir $centerFile
$centerScaled = Join-Path $tempDir 'tile-center.png'
$centerUri    = Convert-ToDataUri -Path $centerSrc -Aspect $centerAspect -OutW ($centerW * 2) -OutH ($centerH * 2) -OutPath $centerScaled
$cix = $centerFX + $centerPad
$ciy = $centerFY + $centerPad

[void]$clips.AppendLine(('    <clipPath id="clipC"><rect x="{0}" y="{1}" width="{2}" height="{3}" rx="9"/></clipPath>' -f $cix, $ciy, $centerW, $centerH))
[void]$body.AppendLine(('  <g>'))
[void]$body.AppendLine(('    <rect x="{0}" y="{1}" width="{2}" height="{3}" rx="14" fill="#0d1117" stroke="#0ea5e9" stroke-width="2.5" filter="url(#glow)"/>' -f $centerFX, $centerFY, $centerHW, $centerHH))
[void]$body.AppendLine(('    <image x="{0}" y="{1}" width="{2}" height="{3}" preserveAspectRatio="none" clip-path="url(#clipC)" href="{4}"/>' -f $cix, $ciy, $centerW, $centerH, $centerUri))
[void]$body.AppendLine(('  </g>'))

$titleUri = 'data:image/svg+xml;base64,' + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($titleSvg))

$svg = $head.Replace('<!--CLIPS-->', $clips.ToString().TrimEnd()).Replace('<!--TITLE-->', $titleUri) + "`n" + $body.ToString() + '</svg>' + "`n"

[System.IO.File]::WriteAllText($outSvg, $svg, [System.Text.UTF8Encoding]::new($false))

$sizeKB = [math]::Round((Get-Item $outSvg).Length / 1KB)
Write-Host "Wrote $outSvg ($sizeKB KB)"

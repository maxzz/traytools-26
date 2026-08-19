<#
.SYNOPSIS
    Clones HID DP Git repositories listed in a text file into the current directory.

.DESCRIPTION
    Each repository is cloned from https://fre-eng-src3.hidglobal.com/scm/dp/<name>.git
    into a folder named after the repository. Existing folders are skipped.

.EXAMPLE
    cd C:\src\dp
    .\clone-dp-repos.ps1

.EXAMPLE
    .\clone-dp-repos.ps1 -NamesFile C:\Users\maxzz\Desktop\extracted_names.txt
#>
[CmdletBinding()]
param(
    [Parameter()]
    [string]$NamesFile = 'C:\Users\maxzz\Desktop\extracted_names.txt',

    [Parameter()]
    [string]$BaseUrl = 'https://fre-eng-src3.hidglobal.com/scm/dp'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error 'git is not on PATH. Install Git and try again.'
    exit 1
}

if (-not (Test-Path -LiteralPath $NamesFile)) {
    Write-Error "Names file not found: $NamesFile"
    exit 1
}

$repoNames = Get-Content -LiteralPath $NamesFile |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith('#') }

if ($repoNames.Count -eq 0) {
    Write-Error "No repository names found in $NamesFile"
    exit 1
}

$targetDir = (Get-Location).Path
Write-Host "Cloning $($repoNames.Count) repositories into $targetDir"
Write-Host "Remote base: $BaseUrl"
Write-Host ""

$cloned = 0
$skipped = 0
$failed = 0
$failedNames = @()

foreach ($name in $repoNames) {
    $dest = Join-Path $targetDir $name
    $url = "$BaseUrl/$name.git"

    if (Test-Path -LiteralPath $dest) {
        Write-Host "[SKIP] $name  (folder already exists)" -ForegroundColor Yellow
        $skipped++
        continue
    }

    Write-Host "[CLONE] $name" -ForegroundColor Cyan
    git clone $url $dest
    if ($LASTEXITCODE -eq 0) {
        $cloned++
    }
    else {
        Write-Host "[FAIL] $name  ($url)" -ForegroundColor Red
        $failed++
        $failedNames += $name
        if (Test-Path -LiteralPath $dest) {
            Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "Done. cloned=$cloned  skipped=$skipped  failed=$failed"

if ($failedNames.Count -gt 0) {
    Write-Host "Failed repositories:" -ForegroundColor Red
    $failedNames | ForEach-Object { Write-Host "  $_" }
    exit 1
}

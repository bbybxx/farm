<#
Simple push.ps1 - minimal ASCII-only script
Usage: .\push.ps1 "Commit message" [branch] [deploy]
If no args are provided the script will prompt interactively.
#>

param(
    [string]$Message,
    [string]$Branch,
    [string]$Deploy
)

function ErrExit([string]$msg, [int]$code = 1) {
    Write-Host $msg -ForegroundColor Red
    exit $code
}

# Prompt for missing values
if (-not $Message -or $Message -eq '') {
    $Message = Read-Host 'Commit message (required)'
    if (-not $Message -or $Message -eq '') { ErrExit 'No commit message provided.' 1 }
}

if (-not $Branch -or $Branch -eq '') {
    try { $curr = git rev-parse --abbrev-ref HEAD 2>$null | Out-String; $curr = $curr.Trim(); if (-not $curr -or $curr -eq '') { $curr = 'main' } } catch { $curr = 'main' }
    $branchInput = Read-Host ("Branch to push (Enter = $curr)")
    if ($branchInput -and $branchInput -ne '') { $Branch = $branchInput } else { $Branch = $curr }
}

if (-not $Deploy -or $Deploy -eq '') {
    $d = Read-Host 'Deploy to Vercel? (Y/n, Enter = Y)'
    if ($d -and $d.ToLower() -in @('n','no')) { $Deploy = 'no' } else { $Deploy = 'yes' }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { ErrExit 'git not found in PATH' 1 }

Write-Host 'Staging changes...'
$addOut = git add -A 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { ErrExit ("git add failed:`n$addOut") 1 }

Write-Host ("Committing: {0}" -f $Message)
$commitOut = git commit -m "$Message" 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Write-Host 'Commit returned non-zero (maybe no changes).' -ForegroundColor Yellow; Write-Host $commitOut -ForegroundColor Yellow } else { Write-Host 'Commit done.' -ForegroundColor Green }

Write-Host ("Pushing to origin/{0}..." -f $Branch)
$pushOut = git push origin $Branch 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { ErrExit ("git push failed:`n$pushOut") 1 }
Write-Host 'Push succeeded.' -ForegroundColor Green

if ($Deploy -and $Deploy.ToLower() -in @('no','false','skip')) { Write-Host 'Vercel deploy skipped.'; exit 0 }

Write-Host 'Attempting Vercel deploy...'
if (Get-Command vercel -ErrorAction SilentlyContinue) {
    $deployOut = & vercel --prod --confirm 2>&1 | Out-String; $code = $LASTEXITCODE
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    $deployOut = & npx --yes vercel --prod --confirm 2>&1 | Out-String; $code = $LASTEXITCODE
} else {
    Write-Host 'Vercel CLI not found. Install it or run deploy manually: vercel --prod --confirm'
    exit 0
}

if ($code -ne 0) { ErrExit ("Vercel deploy failed:`n$deployOut") 1 } else { Write-Host 'Vercel deploy finished.'; Write-Host $deployOut }

exit 0

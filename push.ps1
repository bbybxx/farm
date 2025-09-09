<#
Simple push.ps1 - minimal ASCII-only script
Usage: .\push.ps1 "Commit message" [branch] [deploy] [force]
If no args are provided the script will prompt interactively.
The optional fourth argument (or the -ForcePush switch) causes a non-interactive force-push.
#>

param(
    [string]$Message,
    [string]$Branch,
    [string]$Deploy,
    [switch]$ForcePush
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

# If user passed a fourth positional arg (e.g. push.ps1 "msg" main yes force)
if (-not $ForcePush -and $args.Count -ge 4) {
    $maybe = $args[3]
    if ($maybe -and $maybe.ToLower() -in @('force','--force','-f','yes')) { $ForcePush = $true }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { ErrExit 'git not found in PATH' 1 }

Write-Host 'Staging changes...'
$addOut = git add -A 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { ErrExit ("git add failed:`n$addOut") 1 }

Write-Host ("Committing: {0}" -f $Message)
$commitOut = git commit -m "$Message" 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Write-Host 'Commit returned non-zero (maybe no changes).' -ForegroundColor Yellow; Write-Host $commitOut -ForegroundColor Yellow } else { Write-Host 'Commit done.' -ForegroundColor Green }

Write-Host ("Pushing to origin/{0}..." -f $Branch)
# Respect explicit force flag if provided, otherwise try ordinary push and offer interactive fallback
if ($ForcePush) {
    $pushOut = & git push --force origin $Branch 2>&1 | Out-String
} else {
    $pushOut = & git push origin $Branch 2>&1 | Out-String
}
$pushCode = $LASTEXITCODE
if ($pushCode -ne 0) {
    if (-not $ForcePush) {
        Write-Host ("git push failed:`n$pushOut") -ForegroundColor Yellow
        try {
            $resp = Read-Host "Push failed. Force push to origin/$Branch? (y/N)"
        } catch {
            $resp = ''
        }
        if ($resp -and $resp.ToLower() -in @('y','yes')) {
            Write-Host 'Running force push...' -ForegroundColor Cyan
            $forceOut = & git push --force origin $Branch 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { ErrExit ("git force-push failed:`n$forceOut") 1 } else { Write-Host 'Force push succeeded.' -ForegroundColor Green }
        } else {
            ErrExit ("git push failed:`n$pushOut") 1
        }
    } else {
        ErrExit ("git push failed even with --force:`n$pushOut") 1
    }
} else {
    Write-Host 'Push succeeded.' -ForegroundColor Green
}

if ($Deploy -and $Deploy.ToLower() -in @('no','false','skip')) { Write-Host 'Vercel deploy skipped.'; exit 0 }

Write-Host 'Attempting Vercel deploy...'

# Prefer non-interactive token if provided
$vercelToken = $env:VERCEL_TOKEN
if ($vercelToken -and $vercelToken -ne '') { Write-Host 'Using VERCEL_TOKEN for non-interactive deploy.' -ForegroundColor Cyan }

if (Get-Command vercel -ErrorAction SilentlyContinue) {
    if ($vercelToken) {
        Write-Host 'Running: vercel --prod --confirm --token <VERCEL_TOKEN>' -ForegroundColor Cyan
        $deployOut = & vercel --prod --confirm --token $vercelToken 2>&1 | Out-String
    } else {
        Write-Host 'Running: vercel --prod --confirm' -ForegroundColor Cyan
        $deployOut = & vercel --prod --confirm 2>&1 | Out-String
    }
    $code = $LASTEXITCODE
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    if ($vercelToken) {
        Write-Host 'Running: npx vercel --prod --confirm --token <VERCEL_TOKEN>' -ForegroundColor Cyan
        $deployOut = & npx --yes vercel --prod --confirm --token $vercelToken 2>&1 | Out-String
    } else {
        Write-Host 'Running: npx vercel --prod --confirm' -ForegroundColor Cyan
        $deployOut = & npx --yes vercel --prod --confirm 2>&1 | Out-String
    }
    $code = $LASTEXITCODE
} else {
    Write-Host 'Vercel CLI not found. Install it (npm i -g vercel) or set VERCEL_TOKEN and use npx.' -ForegroundColor Yellow
    Write-Host 'Manual deploy tip: vercel --prod --confirm' -ForegroundColor Yellow
    exit 0
}

if ($code -ne 0) { ErrExit ("Vercel deploy failed:`n$deployOut") 1 } else { Write-Host 'Vercel deploy finished.'; Write-Host $deployOut }

exit 0

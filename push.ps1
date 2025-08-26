<#
push.ps1 — PowerShell helper for git: add, commit, push
Usage: .\push.ps1 "Commit message" [branch]
#>
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Message,

    [Parameter(Mandatory=$false, Position=1)]
    [string]$Branch
)

Set-StrictMode -Version Latest

function Write-ErrAndExit($msg, $code=1) {
    Write-Host $msg -ForegroundColor Red
    exit $code
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-ErrAndExit "git не найден в PATH. Установите git и убедитесь, что он доступен из терминала."
}

if (-not $Branch) {
    try {
        $Branch = git rev-parse --abbrev-ref HEAD 2>$null | Out-String
        $Branch = $Branch.Trim()
        if (-not $Branch) { $Branch = 'main' }
    } catch {
        $Branch = 'main'
    }
}

Write-Host "Staging changes..." -ForegroundColor Cyan
$add = git add -A 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Ошибка: git add завершился с ошибкой.`n$add" }

Write-Host "Committing with message: $Message" -ForegroundColor Cyan
$commit = git commit -m "$Message" 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Write-Host "Предупреждение: git commit вернул код ошибки (возможно, нет изменений). Попробую выполнить push." -ForegroundColor Yellow
} else {
    Write-Host "Commit выполнен." -ForegroundColor Green
}

Write-Host "Pushing to origin/$Branch..." -ForegroundColor Cyan
$push = git push origin $Branch 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Ошибка: git push завершился с ошибкой.`n$push" }

Write-Host "Push успешен." -ForegroundColor Green
exit 0

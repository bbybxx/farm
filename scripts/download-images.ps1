# Download images from FarmRPG API
param(
    [string]$OutputDir = "public/img/items",
    [switch]$ForceDownload
)

Write-Host "=== FarmRPG Image Downloader ===" -ForegroundColor Green

# Ensure output directory exists
$fullOutputDir = Join-Path $PSScriptRoot ".." $OutputDir
if (-not (Test-Path $fullOutputDir)) {
    New-Item -ItemType Directory -Path $fullOutputDir -Force | Out-Null
    Write-Host "Created directory: $fullOutputDir" -ForegroundColor Yellow
}

Write-Host "Output directory: $fullOutputDir" -ForegroundColor Cyan

# Fetch items from API
Write-Host "`nFetching items from buddy.farm API..." -ForegroundColor Yellow
$body = '{"query":"{ items { name image canCraft } }"}'
try {
    $result = Invoke-RestMethod -Uri 'https://api.buddy.farm/graphql' -Method Post -Body $body -ContentType 'application/json'
    $items = $result.data.items
    Write-Host "Total items in API: $($items.Count)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to fetch from API: $_" -ForegroundColor Red
    exit 1
}

# Filter items that need images
$itemsWithImages = $items | Where-Object { $_.image -and $_.image -ne '' }
Write-Host "Items with images: $($itemsWithImages.Count)" -ForegroundColor Green

# Download images
$downloaded = 0
$skipped = 0
$failed = 0

Write-Host "`nDownloading images..." -ForegroundColor Yellow

foreach ($item in $itemsWithImages) {
    $imagePath = $item.image
    $fileName = Split-Path $imagePath -Leaf
    $localPath = Join-Path $fullOutputDir $fileName
    
    # Check if file already exists
    if ((Test-Path $localPath) -and -not $ForceDownload) {
        $skipped++
        continue
    }
    
    try {
        $url = "https://farmrpg.com$imagePath"
        Invoke-WebRequest -Uri $url -OutFile $localPath -ErrorAction Stop
        $downloaded++
        if ($downloaded % 50 -eq 0) {
            Write-Host "Downloaded $downloaded images..." -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Failed to download: $fileName from $url" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Downloaded: $downloaded" -ForegroundColor Green
Write-Host "Skipped (already exists): $skipped" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "`nDone!" -ForegroundColor Green

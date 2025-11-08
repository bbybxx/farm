# Sync recipes from buddy.farm API to local files
Write-Host "=== Syncing Recipes from buddy.farm API ===" -ForegroundColor Green

# Fetch all items with recipes from API
Write-Host "`nFetching items from API..." -ForegroundColor Yellow
$body = '{"query":"{ items { name type canCraft craftingLevel recipeItems { ingredientItem { name type } quantity } image } }"}'
try {
    $result = Invoke-RestMethod -Uri 'https://api.buddy.farm/graphql' -Method Post -Body $body -ContentType 'application/json'
    $items = $result.data.items
    Write-Host "Total items fetched: $($items.Count)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to fetch from API: $_" -ForegroundColor Red
    exit 1
}

# Filter craftable items with recipes
$craftableItems = $items | Where-Object { $_.canCraft -eq $true -and $_.recipeItems -and $_.recipeItems.Count -gt 0 }
Write-Host "Craftable items with recipes: $($craftableItems.Count)" -ForegroundColor Green

# Build recipes-api.json structure
Write-Host "`nBuilding recipes-api.json structure..." -ForegroundColor Yellow
$recipesApi = [ordered]@{}
foreach ($item in ($craftableItems | Sort-Object name)) {
    $ingredients = [ordered]@{}
    foreach ($recipeItem in $item.recipeItems) {
        $ingredients[$recipeItem.ingredientItem.name] = $recipeItem.quantity
    }
    
    $recipesApi[$item.name] = [ordered]@{
        ingredients = $ingredients
        craftingLevel = $item.craftingLevel
        category = if ($item.type) { $item.type } else { "item" }
    }
}

# Build items-api.json structure
Write-Host "Building items-api.json structure..." -ForegroundColor Yellow
$itemsApi = [ordered]@{}
foreach ($item in ($items | Sort-Object name)) {
    $itemsApi[$item.name] = [ordered]@{
        name = $item.name
        type = if ($item.type) { $item.type } else { "item" }
        image = $item.image
        canCraft = $item.canCraft
        craftingLevel = $item.craftingLevel
    }
}

# Save files
$recipesApiPath = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "src\data") "recipes-api.json"
$itemsApiPath = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "src\data") "items-api.json"

Write-Host "`nSaving files..." -ForegroundColor Yellow

# Convert to JSON with proper formatting
$recipesJson = $recipesApi | ConvertTo-Json -Depth 10
$itemsJson = $itemsApi | ConvertTo-Json -Depth 10

# Save with UTF-8 encoding
[System.IO.File]::WriteAllText($recipesApiPath, $recipesJson, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($itemsApiPath, $itemsJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "Saved recipes-api.json ($($recipesApi.Count) recipes)" -ForegroundColor Green
Write-Host "Saved items-api.json ($($itemsApi.Count) items)" -ForegroundColor Green

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Recipes synced: $($recipesApi.Count)"
Write-Host "Items synced: $($itemsApi.Count)"
Write-Host "`nSync complete!" -ForegroundColor Green

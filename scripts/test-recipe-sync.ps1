# Test Recipe Update Service
Write-Host "=== Testing RecipeUpdateService ===" -ForegroundColor Green

# Get all recipes from API
Write-Host "`n1. Fetching all recipes from buddy.farm API..." -ForegroundColor Yellow

$apiUrl = $env:GRAPHQL_API_ENDPOINT
if (-not $apiUrl) {
    Write-Host "ERROR: GRAPHQL_API_ENDPOINT environment variable is not set" -ForegroundColor Red
    Write-Host "Please set it in your environment or GitHub Secrets" -ForegroundColor Red
    exit 1
}

$body = '{"query":"{ items { name type canCraft craftingLevel recipeItems { ingredientItem { name type } quantity } image } }"}'
try {
    $result = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType 'application/json'
    $items = $result.data.items
    Write-Host "Total items: $($items.Count)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# Filter craftable items
$craftableItems = $items | Where-Object { $_.canCraft -eq $true -and $_.recipeItems -and $_.recipeItems.Count -gt 0 }
Write-Host "Craftable items with recipes: $($craftableItems.Count)" -ForegroundColor Green

# Load current recipes from file
Write-Host "`n2. Loading current recipes-api.json..." -ForegroundColor Yellow
$currentRecipesPath = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "src\data") "recipes-api.json"
if (Test-Path $currentRecipesPath) {
    $currentRecipes = Get-Content $currentRecipesPath -Raw | ConvertFrom-Json
    $currentRecipeNames = $currentRecipes.PSObject.Properties.Name
    Write-Host "Current recipes in file: $($currentRecipeNames.Count)" -ForegroundColor Green
} else {
    Write-Host "ERROR: recipes-api.json not found!" -ForegroundColor Red
    exit 1
}

# Compare: Find new recipes in API
Write-Host "`n3. Comparing API vs local file..." -ForegroundColor Yellow
$apiRecipeNames = $craftableItems | ForEach-Object { $_.name }
$newRecipes = $apiRecipeNames | Where-Object { $_ -notin $currentRecipeNames }

if ($newRecipes.Count -gt 0) {
    Write-Host "NEW RECIPES FOUND IN API (not in local file):" -ForegroundColor Cyan
    $newRecipes | ForEach-Object {
        $recipe = $craftableItems | Where-Object { $_.name -eq $_ }
        Write-Host "  - $_ (Level $($recipe.craftingLevel))" -ForegroundColor Yellow
        $recipe.recipeItems | ForEach-Object {
            Write-Host "      $($_.quantity)x $($_.ingredientItem.name)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "No new recipes found. Local file is up to date!" -ForegroundColor Green
}

# Check for recipes in file but not in API (removed?)
$removedRecipes = $currentRecipeNames | Where-Object { $_ -notin $apiRecipeNames }
if ($removedRecipes.Count -gt 0) {
    Write-Host "`nRECIPES IN FILE BUT NOT IN API (possibly removed):" -ForegroundColor Magenta
    $removedRecipes | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Gray
    }
}

# Check 11th Leaf Centerpiece specifically
Write-Host "`n4. Checking 11th Leaf Centerpiece..." -ForegroundColor Yellow
$centerpiece = $craftableItems | Where-Object { $_.name -eq '11th Leaf Centerpiece' }
if ($centerpiece) {
    Write-Host "Found in API:" -ForegroundColor Green
    Write-Host "  Name: $($centerpiece.name)"
    Write-Host "  Crafting Level: $($centerpiece.craftingLevel)"
    Write-Host "  Image: $($centerpiece.image)"
    Write-Host "  Ingredients:"
    $centerpiece.recipeItems | ForEach-Object {
        Write-Host "    - $($_.quantity)x $($_.ingredientItem.name)"
    }
} else {
    Write-Host "NOT found in API!" -ForegroundColor Red
}

# Check if it's in local file
if ($currentRecipes.'11th Leaf Centerpiece') {
    Write-Host "`n  Found in local file:" -ForegroundColor Green
    Write-Host "  Crafting Level: $($currentRecipes.'11th Leaf Centerpiece'.craftingLevel)"
    Write-Host "  Ingredients:"
    $currentRecipes.'11th Leaf Centerpiece'.ingredients.PSObject.Properties | ForEach-Object {
        Write-Host "    - $($_.Value)x $($_.Name)"
    }
} else {
    Write-Host "  NOT found in local file!" -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "API Recipes: $($apiRecipeNames.Count)"
Write-Host "Local Recipes: $($currentRecipeNames.Count)"
Write-Host "New in API: $($newRecipes.Count)"
Write-Host "Removed from API: $($removedRecipes.Count)"

if ($newRecipes.Count -eq 0 -and $removedRecipes.Count -eq 0) {
    Write-Host "`nLocal file matches API perfectly!" -ForegroundColor Green
} else {
    Write-Host "`nDifferences found between API and local file" -ForegroundColor Yellow
}

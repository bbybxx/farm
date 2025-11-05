# Quest Data Explorer
# Simple script to explore quest data from the API

$dataFile = "quests-data-formatted.json"

if (-not (Test-Path $dataFile)) {
    Write-Host "Error: $dataFile not found!" -ForegroundColor Red
    exit
}

Write-Host "Loading quest data..." -ForegroundColor Cyan
$data = Get-Content $dataFile -Raw | ConvertFrom-Json
$questlines = $data.data.questlines

Write-Host "`n=== FarmRPG Quests Database ===" -ForegroundColor Green
Write-Host "Total Questlines: $($questlines.Count)"
Write-Host "Total Quests: $(($questlines | ForEach-Object { $_.steps.Count } | Measure-Object -Sum).Sum)"

# Interactive menu
do {
    Write-Host "`n=== Options ===" -ForegroundColor Yellow
    Write-Host "1. Search questline by name"
    Write-Host "2. View questline by ID"
    Write-Host "3. List top 10 questlines"
    Write-Host "4. Search quests by NPC"
    Write-Host "5. View quest statistics"
    Write-Host "0. Exit"
    
    $choice = Read-Host "`nEnter choice"
    
    switch ($choice) {
        "1" {
            $search = Read-Host "Enter questline name to search"
            $results = $questlines | Where-Object { $_.title -like "*$search*" }
            if ($results) {
                Write-Host "`nFound $($results.Count) questline(s):" -ForegroundColor Green
                $results | ForEach-Object {
                    Write-Host "  [$($_.id)] $($_.title) - $($_.steps.Count) quests"
                }
            } else {
                Write-Host "No questlines found." -ForegroundColor Red
            }
        }
        "2" {
            $id = Read-Host "Enter questline ID"
            $questline = $questlines | Where-Object { $_.id -eq [int]$id }
            if ($questline) {
                Write-Host "`n=== $($questline.title) ===" -ForegroundColor Green
                Write-Host "ID: $($questline.id)"
                Write-Host "Quests: $($questline.steps.Count)"
                Write-Host "Automatic: $($questline.automatic)"
                Write-Host "`nQuests in chain:"
                $questline.steps | Sort-Object order | ForEach-Object {
                    $quest = $_.quest
                    Write-Host "  $($_.order + 1). $($quest.cleanTitle) (by $($quest.npc))"
                }
            } else {
                Write-Host "Questline not found." -ForegroundColor Red
            }
        }
        "3" {
            Write-Host "`n=== Top 10 Longest Questlines ===" -ForegroundColor Green
            $questlines | Sort-Object { $_.steps.Count } -Descending | Select-Object -First 10 | ForEach-Object {
                Write-Host "  [$($_.id)] $($_.title) - $($_.steps.Count) quests"
            }
        }
        "4" {
            $npc = Read-Host "Enter NPC name"
            $allQuests = $questlines | ForEach-Object { $_.steps | ForEach-Object { $_.quest } }
            $results = $allQuests | Where-Object { $_.npc -like "*$npc*" }
            if ($results) {
                Write-Host "`nFound $($results.Count) quest(s) from NPCs matching '$npc':" -ForegroundColor Green
                $results | Select-Object -First 20 | ForEach-Object {
                    Write-Host "  - $($_.cleanTitle) (by $($_.npc))"
                }
                if ($results.Count -gt 20) {
                    Write-Host "  ... and $($results.Count - 20) more"
                }
            } else {
                Write-Host "No quests found." -ForegroundColor Red
            }
        }
        "5" {
            $allQuests = $questlines | ForEach-Object { $_.steps | ForEach-Object { $_.quest } }
            Write-Host "`n=== Quest Statistics ===" -ForegroundColor Green
            
            Write-Host "`nLevel Requirements:"
            Write-Host "  Max Farming: $(($allQuests | Measure-Object -Property requiredFarmingLevel -Maximum).Maximum)"
            Write-Host "  Max Fishing: $(($allQuests | Measure-Object -Property requiredFishingLevel -Maximum).Maximum)"
            Write-Host "  Max Crafting: $(($allQuests | Measure-Object -Property requiredCraftingLevel -Maximum).Maximum)"
            Write-Host "  Max Exploring: $(($allQuests | Measure-Object -Property requiredExploringLevel -Maximum).Maximum)"
            Write-Host "  Max Cooking: $(($allQuests | Measure-Object -Property requiredCookingLevel -Maximum).Maximum)"
            
            Write-Host "`nTop 5 NPCs:"
            $allQuests | Group-Object -Property npc | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
                Write-Host "  $($_.Name): $($_.Count) quests"
            }
        }
        "0" {
            Write-Host "Goodbye!" -ForegroundColor Cyan
        }
        default {
            Write-Host "Invalid choice." -ForegroundColor Red
        }
    }
} while ($choice -ne "0")

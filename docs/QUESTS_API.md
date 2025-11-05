# FarmRPG Quests API Documentation

## API Endpoint
`https://api.buddy.farm/graphql`

## Questlines Structure

### GraphQL Query
```graphql
query {
  questlines {
    id
    title
    image
    automatic
    steps {
      order
      quest {
        id
        npc
        npcImg
        title
        cleanTitle
        cleanDescription
        requiredSilver
        requiredFarmingLevel
        requiredFishingLevel
        requiredCraftingLevel
        requiredExploringLevel
        requiredCookingLevel
        requiredTowerLevel
        requiredItems {
          item {
            name
            image
          }
          quantity
        }
        rewardSilver
        rewardGold
        rewardItems {
          item {
            name
            image
          }
          quantity
        }
      }
    }
  }
}
```

### Response Structure

#### Questline Object
- `id`: Unique identifier for the quest chain
- `title`: Name of the quest chain
- `image`: Icon/image path for the quest chain
- `automatic`: Boolean indicating if the quest chain is automatic
- `steps`: Array of quest steps in the chain

#### Quest Step Object
- `order`: Order of the quest in the chain (0-indexed)
- `quest`: The actual quest data

#### Quest Object
- **Basic Info**
  - `id`: Unique quest identifier
  - `npc`: NPC name who gives the quest
  - `npcImg`: Path to NPC image
  - `title`: Quest title (with HTML)
  - `cleanTitle`: Quest title (plain text)
  - `cleanDescription`: Quest description (plain text)

- **Requirements**
  - `requiredSilver`: Amount of silver required
  - `requiredFarmingLevel`: Farming skill level required
  - `requiredFishingLevel`: Fishing skill level required
  - `requiredCraftingLevel`: Crafting skill level required
  - `requiredExploringLevel`: Exploring skill level required
  - `requiredCookingLevel`: Cooking skill level required
  - `requiredTowerLevel`: Tower level required
  - `requiredItems`: Array of items needed
    - `item.name`: Item name
    - `item.image`: Item image path
    - `quantity`: Amount required

- **Rewards**
  - `rewardSilver`: Silver reward amount
  - `rewardGold`: Gold reward amount
  - `rewardItems`: Array of item rewards
    - `item.name`: Item name
    - `item.image`: Item image path
    - `quantity`: Amount rewarded

## Example Quest Chain

"Sweet Tooth" quest chain (ID: 298):
- 3 quests given by George
- Requires Farming level 85, Cooking level 5
- Each quest requires 200 Sugar Cane
- Rewards include Gold Seed Bag, Hide, and Acorn Pie recipe

## Statistics (as of November 2025)

- **Total Questlines**: 296
- **Total Quests**: 1,999
- **All questlines are automatic** (automatic: true)

### Longest Quest Chains
1. "99 Bottles" - 99 quests
2. "Strange Companions" - 40 quests
3. "Far Away" - 36 quests
4. "A Way Back" - 33 quests

### Top Quest Givers (NPCs)
1. George - 193 quests
2. Vincent - 142 quests
3. Buddy - 125 quests
4. Rosalie - 125 quests
5. Lorn - 105 quests

### Notable Quests
- **Highest level requirements**: "Concessions To Be Made" series (Level 446 total)
- **Most item requirements**: "April Trout Brings May Flowers XXI" (69 items)
- **Biggest reward**: "April Trout Brings May Flowers XXIII" (69 items + 100B silver)

## Notes

- Quests in a chain are ordered by `steps[].order` field
- Level requirements are skill-specific (Farming, Fishing, Crafting, Exploring, Cooking, Tower)
- Item requirements include both regular items and special items
- Rewards can be silver, gold, items, or combinations
- Images are stored at relative paths (e.g., `/img/items/...`)
- All quest descriptions are HTML-cleaned in `cleanDescription` field
- NPC images are provided for each quest

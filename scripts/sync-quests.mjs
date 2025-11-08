#!/usr/bin/env node
// Sync quests from buddy.farm API to local files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Syncing Quests from buddy.farm API ===\n');

const API_URL = 'https://api.buddy.farm/graphql';
const API_QUERY = `
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
`;

// Fetch data from API
console.log('Fetching questlines from API...');
const response = await fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: API_QUERY }),
});

if (!response.ok) {
  console.error(`ERROR: API request failed with status ${response.status}`);
  process.exit(1);
}

const apiData = await response.json();

if (!apiData.data || !apiData.data.questlines) {
  console.error('ERROR: Invalid response structure from API');
  console.error(JSON.stringify(apiData, null, 2));
  process.exit(1);
}

const questlines = apiData.data.questlines;

console.log(`Total questlines fetched: ${questlines.length}`);

// Sort questlines by id
questlines.sort((a, b) => a.id - b.id);

// Sort steps within each questline by order
questlines.forEach(questline => {
  if (questline.steps) {
    questline.steps.sort((a, b) => a.order - b.order);
  }
});

// Build quests-api.json structure (same as API response)
const questsData = {
  data: {
    questlines: questlines
  }
};

// Write to quests-api.json
const questsApiPath = path.join(__dirname, '..', 'src', 'data', 'quests-api.json');
fs.writeFileSync(questsApiPath, JSON.stringify(questsData, null, 4), 'utf8');

console.log(`\nWritten ${questlines.length} questlines to quests-api.json`);

// Count total quests
let totalQuests = 0;
questlines.forEach(questline => {
  totalQuests += questline.steps?.length || 0;
});

console.log(`Total quests: ${totalQuests}`);
console.log('\n=== Sync Complete ===\n');

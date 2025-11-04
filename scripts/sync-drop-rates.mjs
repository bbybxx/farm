#!/usr/bin/env node
// Sync drop rates from buddy.farm API for explore locations
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Syncing Drop Rates from buddy.farm API ===\n');

const API_URL = 'https://api.buddy.farm/graphql';
const API_QUERY = `
  query {
    locations {
      id
      gameId
      name
      type
      dropRates {
        silverPerHit
        xpPerHit
        ironDepot
        manualFishing
        runecube
        items {
          item {
            name
          }
          rate
        }
      }
    }
  }
`;

// Fetch data from API
console.log('Fetching locations from API...');
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
const locations = apiData.data.locations;

console.log(`Total locations: ${locations.length}`);

// Filter only explore locations
const exploreLocations = locations.filter(loc => loc.type === 'explore');
console.log(`Explore locations: ${exploreLocations.length}\n`);

// Build drop rates structure
// Format: { "Location Name": { "Item Name": { rq0cs0, rq0cs1, rq1cs0, rq1cs1 } } }
const dropRatesData = {};

exploreLocations.forEach(location => {
  console.log(`Processing: ${location.name}`);
  
  const locationData = {};
  
  // Find variants: without and with runecube
  const withoutRunecube = location.dropRates.find(dr => !dr.runecube && !dr.manualFishing);
  const withRunecube = location.dropRates.find(dr => dr.runecube && !dr.manualFishing);
  
  if (!withoutRunecube || !withRunecube) {
    console.log(`  ⚠️  Missing drop rate variants, skipping`);
    return;
  }
  
  // Combine items from both variants
  const allItems = new Set([
    ...withoutRunecube.items.map(i => i.item.name),
    ...withRunecube.items.map(i => i.item.name)
  ]);
  
  allItems.forEach(itemName => {
    const baseRate = withoutRunecube.items.find(i => i.item.name === itemName)?.rate;
    const runecubeRate = withRunecube.items.find(i => i.item.name === itemName)?.rate;
    
    if (baseRate || runecubeRate) {
      locationData[itemName] = {
        // rq0cs0 = no runecube, no cinnamon (base rate from API)
        rq0cs0: baseRate || null,
        // rq0cs1 = no runecube, with cinnamon (base rate / 1.25)
        rq0cs1: baseRate ? baseRate / 1.25 : null,
        // rq1cs0 = with runecube, no cinnamon (runecube rate from API)
        rq1cs0: runecubeRate || null,
        // rq1cs1 = with runecube, with cinnamon (runecube rate / 1.25)
        rq1cs1: runecubeRate ? runecubeRate / 1.25 : null
      };
    }
  });
  
  if (Object.keys(locationData).length > 0) {
    dropRatesData[location.name] = locationData;
    console.log(`  ✅ Added ${Object.keys(locationData).length} items`);
  }
});

// Convert to old format (cidersPerDrop)
console.log('\nBuilding apple-cider-real-drop-rates.js...');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'apple-cider-real-drop-rates.js');

let jsContent = `// Auto-generated from buddy.farm API
// Drop rates in cidersPerDrop format (hits per drop)
// rq0cs0 = no runecube, no cinnamon sticks
// rq0cs1 = no runecube, with cinnamon sticks (+25% drops = rate/1.25)
// rq1cs0 = with runecube, no cinnamon sticks
// rq1cs1 = with runecube, with cinnamon sticks (+25% drops = rate/1.25)

export const APPLE_CIDER_REAL_DROP_RATES = {
  metadata: {
    version: "2.0.0",
    description: "Drop rates for explore locations from buddy.farm API",
    dataSource: "buddy.farm GraphQL API",
    lastUpdated: "${new Date().toISOString()}",
    variants: {
      rq0cs0: "Without Runecube, Without Cinnamon Sticks",
      rq0cs1: "Without Runecube, With Cinnamon Sticks (+25% drops)",
      rq1cs0: "With Runecube, Without Cinnamon Sticks",
      rq1cs1: "With Runecube, With Cinnamon Sticks (+25% drops)"
    }
  },

  locations: {\n`;

Object.entries(dropRatesData).forEach(([locationName, items]) => {
  jsContent += `    "${locationName}": {\n`;
  Object.entries(items).forEach(([itemName, rates]) => {
    jsContent += `      "${itemName}": {\n`;
    jsContent += `        rq0cs0: ${rates.rq0cs0 !== null ? rates.rq0cs0.toFixed(2) : 'null'},\n`;
    jsContent += `        rq0cs1: ${rates.rq0cs1 !== null ? rates.rq0cs1.toFixed(2) : 'null'},\n`;
    jsContent += `        rq1cs0: ${rates.rq1cs0 !== null ? rates.rq1cs0.toFixed(2) : 'null'},\n`;
    jsContent += `        rq1cs1: ${rates.rq1cs1 !== null ? rates.rq1cs1.toFixed(2) : 'null'}\n`;
    jsContent += `      },\n`;
  });
  jsContent += `    },\n`;
});

jsContent += `  }
};

export default APPLE_CIDER_REAL_DROP_RATES;
`;

fs.writeFileSync(outputPath, jsContent, 'utf8');
console.log(`✅ Saved apple-cider-real-drop-rates.js`);

// Also create the updated format (dropsPerCider)
console.log('\nBuilding apple-cider-real-drop-rates-updated.js...');
const outputPathUpdated = path.join(__dirname, '..', 'src', 'data', 'apple-cider-real-drop-rates-updated.js');

let jsContentUpdated = `// Auto-generated from buddy.farm API
// Drop rates in dropsPerCider format (drops per hit)
// rq0cs0 = no runecube, no cinnamon sticks
// rq0cs1 = no runecube, with cinnamon sticks (+25% drops = rate/1.25)
// rq1cs0 = with runecube, no cinnamon sticks
// rq1cs1 = with runecube, with cinnamon sticks (+25% drops = rate/1.25)

export const APPLE_CIDER_REAL_DROP_RATES_UPGRADED = {
  metadata: {
    version: "2.0.0",
    description: "Drop rates for explore locations from buddy.farm API (inverse format)",
    dataSource: "buddy.farm GraphQL API",
    lastUpdated: "${new Date().toISOString()}",
    variants: {
      rq0cs0: "Without Runecube, Without Cinnamon Sticks",
      rq0cs1: "Without Runecube, With Cinnamon Sticks (+25% drops)",
      rq1cs0: "With Runecube, Without Cinnamon Sticks",
      rq1cs1: "With Runecube, With Cinnamon Sticks (+25% drops)"
    }
  },

  locations: {\n`;

Object.entries(dropRatesData).forEach(([locationName, items]) => {
  jsContentUpdated += `    "${locationName}": {\n`;
  Object.entries(items).forEach(([itemName, rates]) => {
    jsContentUpdated += `      "${itemName}": {\n`;
    jsContentUpdated += `        rq0cs0: ${rates.rq0cs0 !== null ? (1 / rates.rq0cs0).toFixed(5) : 'null'},\n`;
    jsContentUpdated += `        rq0cs1: ${rates.rq0cs1 !== null ? (1 / rates.rq0cs1).toFixed(5) : 'null'},\n`;
    jsContentUpdated += `        rq1cs0: ${rates.rq1cs0 !== null ? (1 / rates.rq1cs0).toFixed(5) : 'null'},\n`;
    jsContentUpdated += `        rq1cs1: ${rates.rq1cs1 !== null ? (1 / rates.rq1cs1).toFixed(5) : 'null'}\n`;
    jsContentUpdated += `      },\n`;
  });
  jsContentUpdated += `    },\n`;
});

jsContentUpdated += `  }
};

export default APPLE_CIDER_REAL_DROP_RATES_UPGRADED;
`;

fs.writeFileSync(outputPathUpdated, jsContentUpdated, 'utf8');
console.log(`✅ Saved apple-cider-real-drop-rates-updated.js`);

// Summary
console.log('\n=== Summary ===');
console.log(`Explore locations synced: ${Object.keys(dropRatesData).length}`);
let totalItems = 0;
Object.values(dropRatesData).forEach(items => {
  totalItems += Object.keys(items).length;
});
console.log(`Total items with drop rates: ${totalItems}`);
console.log('\n✅ Drop rates sync complete!');

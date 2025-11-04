#!/usr/bin/env node
// Sync recipes from buddy.farm API to local files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Syncing Recipes from buddy.farm API ===\n');

const API_URL = 'https://api.buddy.farm/graphql';
const API_QUERY = `
  query {
    items {
      name
      type
      canCraft
      craftingLevel
      recipeItems {
        ingredientItem {
          name
        }
        quantity
      }
      image
    }
  }
`;

// Fetch data from API
console.log('Fetching data from API...');
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
const items = apiData.data.items;

console.log(`Total items fetched: ${items.length}`);

// Filter craftable items with recipes
const craftableItems = items.filter(item => 
  item.canCraft && item.recipeItems && item.recipeItems.length > 0
);

console.log(`Craftable items with recipes: ${craftableItems.length}`);

// Build recipes-api.json structure
console.log('\nBuilding recipes-api.json structure...');
const recipesApi = {};

// Sort items alphabetically
craftableItems.sort((a, b) => a.name.localeCompare(b.name));

craftableItems.forEach(item => {
  const ingredients = {};
  item.recipeItems.forEach(recipeItem => {
    ingredients[recipeItem.ingredientItem.name] = recipeItem.quantity;
  });
  
  recipesApi[item.name] = {
    ingredients: ingredients,
    craftingLevel: item.craftingLevel,
    category: item.type || 'item'
  };
});

// Build items-api.json structure
console.log('Building items-api.json structure...');
const itemsApi = {};

// Sort all items alphabetically
items.sort((a, b) => a.name.localeCompare(b.name));

items.forEach(item => {
  itemsApi[item.name] = {
    name: item.name,
    type: item.type || 'item',
    image: item.image,
    canCraft: item.canCraft,
    craftingLevel: item.craftingLevel
  };
});

// Save files
const recipesApiPath = path.join(__dirname, '..', 'src', 'data', 'recipes-api.json');
const itemsApiPath = path.join(__dirname, '..', 'src', 'data', 'items-api.json');

console.log('\nSaving files...');

fs.writeFileSync(recipesApiPath, JSON.stringify(recipesApi, null, 2), 'utf8');
fs.writeFileSync(itemsApiPath, JSON.stringify(itemsApi, null, 2), 'utf8');

console.log(`✅ Saved recipes-api.json (${Object.keys(recipesApi).length} recipes)`);
console.log(`✅ Saved items-api.json (${Object.keys(itemsApi).length} items)`);

// Summary
console.log('\n=== Summary ===');
console.log(`Recipes synced: ${Object.keys(recipesApi).length}`);
console.log(`Items synced: ${Object.keys(itemsApi).length}`);
console.log('\n✅ Sync complete!');

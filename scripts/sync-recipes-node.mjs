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
console.log('Building recipes-api.json structure...');

// Read existing recipes-api.json if it exists
const recipesApiPath = path.join(__dirname, '..', 'src', 'data', 'recipes-api.json');
let recipesApi = {};
if (fs.existsSync(recipesApiPath)) {
  recipesApi = JSON.parse(fs.readFileSync(recipesApiPath, 'utf8'));
  console.log(`Loaded ${Object.keys(recipesApi).length} existing recipes`);
}

// Sort items alphabetically
craftableItems.sort((a, b) => a.name.localeCompare(b.name));

// Add/update recipes from API (but don't remove existing ones)
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

console.log(`Total recipes after merge: ${Object.keys(recipesApi).length}`);

// Build items-api.json structure
console.log('Building items-api.json structure...');

// Read existing items-api.json if it exists
const itemsApiPath = path.join(__dirname, '..', 'src', 'data', 'items-api.json');
let itemsApi = {};
if (fs.existsSync(itemsApiPath)) {
  itemsApi = JSON.parse(fs.readFileSync(itemsApiPath, 'utf8'));
  console.log(`Loaded ${Object.keys(itemsApi).length} existing items`);
}

// Sort all items alphabetically
items.sort((a, b) => a.name.localeCompare(b.name));

// Add/update items from API (but don't remove existing ones)
items.forEach(item => {
  itemsApi[item.name] = {
    name: item.name,
    type: item.type || 'item',
    image: item.image,
    canCraft: item.canCraft,
    craftingLevel: item.craftingLevel
  };
});

console.log(`Total items after merge: ${Object.keys(itemsApi).length}`);

// Save files

console.log('\nSaving files...');

fs.writeFileSync(recipesApiPath, JSON.stringify(recipesApi, null, 2), 'utf8');
fs.writeFileSync(itemsApiPath, JSON.stringify(itemsApi, null, 2), 'utf8');

console.log(`Saved recipes-api.json (${Object.keys(recipesApi).length} recipes)`);
console.log(`Saved items-api.json (${Object.keys(itemsApi).length} items)`);

// Summary
console.log('\n=== Summary ===');
console.log(`Recipes synced: ${Object.keys(recipesApi).length}`);
console.log(`Items synced: ${Object.keys(itemsApi).length}`);
console.log('\nSync complete!');

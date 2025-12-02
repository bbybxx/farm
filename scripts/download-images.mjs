#!/usr/bin/env node
// Download item images from buddy.farm API
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Downloading Item Images from buddy.farm ===\n');

const API_URL = process.env.GRAPHQL_API_ENDPOINT;
if (!API_URL) {
  console.error('ERROR: GRAPHQL_API_ENDPOINT environment variable is not set');
  console.error('Please set it in your environment or GitHub Secrets');
  process.exit(1);
}
const API_QUERY = `
  query {
    items {
      name
      image
    }
  }
`;

const BASE_IMAGE_URL = 'https://farmrpg.com';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'img', 'items');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}\n`);
}

// Fetch data from API
console.log('Fetching item list from API...');
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

console.log(`Total items: ${items.length}\n`);

// Filter items with images
const itemsWithImages = items.filter(item => item.image && item.image.startsWith('/img/items/'));
console.log(`Items with images: ${itemsWithImages.length}\n`);

// Download function
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Download images
let downloaded = 0;
let skipped = 0;
let errors = 0;

console.log('Downloading images...\n');

for (const item of itemsWithImages) {
  const imageUrl = BASE_IMAGE_URL + item.image;
  // Remove query parameters from filename (e.g., "image.png?2" -> "image.png")
  const filename = path.basename(item.image.split('?')[0]);
  const filepath = path.join(OUTPUT_DIR, filename);

  // Skip if file already exists
  if (fs.existsSync(filepath)) {
    skipped++;
    continue;
  }

  try {
    await downloadImage(imageUrl, filepath);
    downloaded++;
    if (downloaded % 50 === 0) {
      console.log(`Downloaded ${downloaded} images...`);
    }
  } catch (error) {
    errors++;
    console.error(`Failed to download ${filename}: ${error.message}`);
  }
}

console.log('\n=== Summary ===');
console.log(`Downloaded: ${downloaded}`);
console.log(`Skipped (already exists): ${skipped}`);
console.log(`Errors: ${errors}`);
console.log(`Total files in directory: ${fs.readdirSync(OUTPUT_DIR).length}`);
console.log('\nImage download complete!');

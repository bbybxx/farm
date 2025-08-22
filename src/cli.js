#!/usr/bin/env node
// Minimal CLI for craft-calculator
// Usage examples:
//   node src/cli.js --item "Wooden Box" --amount 2 --perks "Artisan I,Resource Saver I" --format json

import { calculateAllResources } from './utils/calculator.js';
import recipes from './data/recipes.json' assert { type: 'json' };
import perksList from './data/perks.json' assert { type: 'json' };

function parseArgs(argv) {
  const args = {
    item: undefined,
    amount: 1,
    perks: [],
    format: 'table'
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--item' || a === '-i') args.item = argv[++i];
    else if (a === '--amount' || a === '-n') args.amount = parseInt(argv[++i], 10) || 1;
    else if (a === '--perks' || a === '-p') args.perks = (argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--format' || a === '-f') args.format = argv[++i] || 'table';
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Craft Calculator CLI\n\n` +
`Options:\n` +
`  -i, --item    Item name (required)\n` +
`  -n, --amount  Quantity to craft (default: 1)\n` +
`  -p, --perks   Comma-separated perk names\n` +
`                Known perks: ${perksList.join(', ')}\n` +
`  -f, --format  Output: table|json (default: table)\n` +
`  -h, --help    Show help\n` +
`\nExamples:\n` +
`  node src/cli.js -i "Wooden Box" -n 2\n` +
`  node src/cli.js -i "Wine" -n 3 -p "Artisan I,Resource Saver II" -f json\n`);
}

function printTable(result) {
  function entries(obj) { return Object.entries(obj).map(([k, v]) => ({ name: k, qty: v })); }
  const base = entries(result.base);
  const inter = entries(result.intermediate);
  console.log('=== Base Resources ===');
  console.table(base);
  console.log('=== Intermediate Resources ===');
  console.table(inter);
  console.log('Silver:', result.silver);
  console.log('XP:', result.xp);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.item) {
    printHelp();
    process.exit(args.item ? 0 : 1);
  }

  const item = args.item;
  const amount = Math.max(1, args.amount | 0);
  const perks = args.perks;

  if (!recipes[item]) {
    console.error(`Unknown item: ${item}`);
    const suggestions = Object.keys(recipes).filter(k => k.toLowerCase().includes(item.toLowerCase())).slice(0, 10);
    if (suggestions.length) console.error('Did you mean:', suggestions.join(', '));
    process.exit(2);
  }

  const result = calculateAllResources(item, amount, perks, recipes);
  if (args.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printTable(result);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

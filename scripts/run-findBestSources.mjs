import findBestSources from '../src/new-app/findBestSources.js'

async function run() {
  try {
    const opts = { activePerks: [], exploringMode: 'Apple Cider', ignoreIronNailsInFindSources: true }
    const res1 = findBestSources('Glass Bottle', 58, opts)
    const res2 = findBestSources('Model Ship', 58, opts)
    console.log('Glass Bottle\n', JSON.stringify(res1, null, 2))
    console.log('\nModel Ship\n', JSON.stringify(res2, null, 2))
  } catch (err) {
    console.error('Error running findBestSources:', err)
    process.exit(1)
  }
}

run()

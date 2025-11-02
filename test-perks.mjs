// Проверка инфо о Cinnamon Sticks seed
// Node.js 18+ has native fetch

const GRAPHQL_URL = 'https://api.buddy.farm/graphql';

// Запрос информации о seed
const seedQuery = `
  query {
    items(name: "Cinnamon Sticks") {
      name
      description
      type
      seedStats {
        seedGrowTime
        sellPrice
        useInPerk
        perkPower
      }
    }
    
    perks {
      name
      description
      image
      stats {
        stat
        statValue
      }
    }
  }
`;

async function checkSeedInfo() {
  console.log('🔍 Checking Cinnamon Sticks and perks info...\n');
  
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: seedQuery })
    });
    
    const data = await response.json();
    
    console.log('📦 Cinnamon Sticks info:');
    console.log(JSON.stringify(data.data?.items || [], null, 2));
    
    console.log('\n🎯 Perks info:');
    const perks = data.data?.perks || [];
    perks.forEach(perk => {
      console.log(`\n${perk.name}:`);
      console.log(`  Description: ${perk.description || 'N/A'}`);
      if (perk.stats && perk.stats.length > 0) {
        console.log(`  Stats:`);
        perk.stats.forEach(stat => {
          console.log(`    - ${stat.stat}: ${stat.statValue}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSeedInfo();

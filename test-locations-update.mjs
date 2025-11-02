// Проверка обновления локаций
// Node.js 18+ has native fetch

const GRAPHQL_URL = 'https://api.buddy.farm/graphql';

const query = `
  query {
    locations {
      name
      image
      baseDropRate
      dropRates {
        runecube
        seed {
          name
        }
        silverPerHit
        xpPerHit
        items {
          item {
            name
            type
            image
          }
          rate
        }
      }
    }
  }
`;

async function testLocationUpdate() {
  console.log('🔍 Testing location update from API...\n');
  
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    const locations = data.data?.locations || [];
    
    console.log(`✅ Received ${locations.length} locations\n`);
    
    // Ищем Small Spring с Pearl Berries
    const smallSpring = locations.find(loc => loc.name === 'Small Spring');
    
    if (smallSpring) {
      console.log('📍 Small Spring location:');
      console.log(`   - Base Drop Rate: ${smallSpring.baseDropRate}`);
      console.log(`   - Drop Rate Variants: ${smallSpring.dropRates.length}\n`);
      
      // Проверяем каждый вариант
      smallSpring.dropRates.forEach((dropRate, index) => {
        console.log(`   Variant ${index + 1} RAW:`, JSON.stringify({
          runecube: dropRate.runecube,
          seed: dropRate.seed,
          silverPerHit: dropRate.silverPerHit,
          xpPerHit: dropRate.xpPerHit
        }, null, 2));
        
        const rq = dropRate.runecube ? '1' : '0';
        const cs = dropRate.seed?.name === 'Cinnamon Sticks' ? '1' : '0';
        const key = `rq${rq}cs${cs}`;
        
        console.log(`   Variant ${index + 1} (${key}):`);
        console.log(`     - Runecube: ${dropRate.runecube}`);
        console.log(`     - Seed: ${dropRate.seed?.name || 'null'}`);
        console.log(`     - Items count: ${dropRate.items.length}`);
        
        // Сохраняем для сравнения
        global.variants.push({ index, dropRate });
        console.log('');
      });
      // Анализируем бонусы от перков
      if (global.variants && global.variants.length === 4) {
        console.log('\n🔬 Analyzing perk bonuses:\n');
        
        const testItems = ['Stone', 'Apple', 'Pearl Berries'];
        testItems.forEach(itemName => {
          const rates = global.variants.map(v => {
            const item = v.dropRate.items.find(i => i.item.name === itemName);
            return item ? item.rate : null;
          }).filter(r => r !== null);
          
          if (rates.length === 4) {
            console.log(`📦 ${itemName}:`);
            console.log(`   Variant 0 (base): ${rates[0].toFixed(2)}`);
            console.log(`   Variant 1: ${rates[1].toFixed(2)} (ratio: ${(rates[1] / rates[0]).toFixed(4)})`);
            console.log(`   Variant 2 (runecube): ${rates[2].toFixed(2)} (ratio: ${(rates[2] / rates[0]).toFixed(4)})`);
            console.log(`   Variant 3 (both): ${rates[3].toFixed(2)} (ratio: ${(rates[3] / rates[0]).toFixed(4)})`);
            
            // Проверяем гипотезу что variant 1 это cinnamon (25% бонус?)
            const cinnamonMultiplier = rates[1] / rates[0];
            console.log(`   💡 Variant 1/0 multiplier: ${cinnamonMultiplier.toFixed(4)}`);
            
            // Проверяем что variant 3 = variant 2 * cinnamon
            if (rates[2] > 0) {
              const expectedVariant3 = rates[2] * cinnamonMultiplier;
              const actualVariant3 = rates[3];
              const match = Math.abs(expectedVariant3 - actualVariant3) / actualVariant3 < 0.01;
              console.log(`   🧪 V3 expected: ${expectedVariant3.toFixed(2)}, actual: ${actualVariant3.toFixed(2)} ${match ? '✅' : '❌'}`);
            }
            console.log('');
          }
        });
      }
    } else {
      console.log('❌ Small Spring not found in locations');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

global.variants = [];
testLocationUpdate();

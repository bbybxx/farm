// Валидация конвертированных данных
// Node.js 18+ has native fetch

const GRAPHQL_URL = 'https://api.buddy.farm/graphql';

const query = `
  query {
    locations {
      name
      dropRates {
        runecube
        items {
          item { name }
          rate
        }
      }
    }
  }
`;

// Эталонные данные
const REFERENCE = {
  "Small Spring": {
    rq0cs0: {
      "Stone": { dropsPerCider: 104.65 },
      "Apple": { dropsPerCider: 14.16 },
      "Feathers": { dropsPerCider: 104.69 },
      "Wood": { dropsPerCider: 104.69 },
      "Snail": { dropsPerCider: 2.37 },
      "Small Chest 01": { cidersPerDrop: 6.08 }
    },
    rq0cs1: {
      "Stone": { dropsPerCider: 130.82 },
      "Apple": { dropsPerCider: 17.70 },
      "Feathers": { dropsPerCider: 130.87 }
    },
    rq1cs0: {
      "Stone": { dropsPerCider: 101.60 },
      "Apple": { dropsPerCider: 16.68 },
      "Feathers": { dropsPerCider: 101.56 }
    },
    rq1cs1: {
      "Stone": { dropsPerCider: 127.00 },
      "Apple": { dropsPerCider: 20.86 }
    }
  }
};

// Константы конвертации (как в RecipeUpdateService.js)
const BASE_APPLE_CIDER_EXPLORES = 1010;
const BASE_EE = 1.2;
const CINNAMON_MULTIPLIER = 1.25;

async function validateConversion() {
  console.log('🧪 Validating conversion algorithm...\n');
  
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    const locations = data.data?.locations || [];
    const smallSpring = locations.find(loc => loc.name === 'Small Spring');
    
    if (!smallSpring) {
      console.log('❌ Small Spring not found');
      return;
    }

    // Конвертируем данные как в RecipeUpdateService
    const converted = {
      rq0cs0: {},
      rq0cs1: {},
      rq1cs0: {},
      rq1cs1: {}
    };
    
    // Берём варианты 0 и 2
    [
      { index: 0, keys: ['rq0cs0', 'rq0cs1'] },
      { index: 2, keys: ['rq1cs0', 'rq1cs1'] }
    ].forEach(({ index, keys }) => {
      const dropRate = smallSpring.dropRates[index];
      if (!dropRate) return;
      
      dropRate.items.forEach(dropItem => {
        const itemName = dropItem.item?.name;
        if (!itemName || !dropItem.rate) return;
        
        const exploresPerDrop = dropItem.rate;
        const dropsPerCider = (BASE_APPLE_CIDER_EXPLORES * BASE_EE) / exploresPerDrop;
        const dropsPerCiderWithCinnamon = dropsPerCider * CINNAMON_MULTIPLIER;
        
        // Без Cinnamon
        if (dropsPerCider >= 1) {
          converted[keys[0]][itemName] = {
            dropsPerCider: Math.round(dropsPerCider * 100) / 100
          };
        } else {
          converted[keys[0]][itemName] = {
            cidersPerDrop: Math.round((1 / dropsPerCider) * 100) / 100
          };
        }
        
        // С Cinnamon
        if (dropsPerCiderWithCinnamon >= 1) {
          converted[keys[1]][itemName] = {
            dropsPerCider: Math.round(dropsPerCiderWithCinnamon * 100) / 100
          };
        } else {
          converted[keys[1]][itemName] = {
            cidersPerDrop: Math.round((1 / dropsPerCiderWithCinnamon) * 100) / 100
          };
        }
      });
    });
    
    // Сравниваем с эталоном
    console.log('📊 Comparison Results:\n');
    
    let totalChecks = 0;
    let passedChecks = 0;
    
    for (const variant of ['rq0cs0', 'rq0cs1', 'rq1cs0', 'rq1cs1']) {
      console.log(`\n=== ${variant} ===`);
      
      const ref = REFERENCE["Small Spring"][variant] || {};
      const conv = converted[variant] || {};
      
      // Проверяем каждый предмет из эталона
      for (const [itemName, refData] of Object.entries(ref)) {
        const convData = conv[itemName];
        
        if (!convData) {
          console.log(`  ❌ ${itemName}: MISSING in converted`);
          totalChecks++;
          continue;
        }
        
        totalChecks++;
        
        // Сравниваем значения
        if (refData.dropsPerCider) {
          const refVal = refData.dropsPerCider;
          const convVal = convData.dropsPerCider;
          const diff = Math.abs(convVal - refVal);
          const pass = diff < 1.5; // погрешность 1.5 drops/cider
          
          if (pass) passedChecks++;
          
          console.log(`  ${pass ? '✅' : '❌'} ${itemName}: ${convVal} vs ${refVal} (diff: ${diff.toFixed(2)})`);
        } else if (refData.cidersPerDrop) {
          const refVal = refData.cidersPerDrop;
          const convVal = convData.cidersPerDrop;
          const diff = Math.abs(convVal - refVal);
          const pass = diff < 0.5; // погрешность 0.5 ciders/drop
          
          if (pass) passedChecks++;
          
          console.log(`  ${pass ? '✅' : '❌'} ${itemName}: ${convVal} vs ${refVal} ciders/drop (diff: ${diff.toFixed(2)})`);
        }
      }
    }
    
    console.log(`\n\n📈 Summary: ${passedChecks}/${totalChecks} checks passed (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 All checks passed! Conversion algorithm is correct!');
    } else {
      console.log(`⚠️ ${totalChecks - passedChecks} checks failed. Review algorithm.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

validateConversion();

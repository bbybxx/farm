// Сравнение API данных с эталонными существующими данными
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

// Эталонные данные из apple-cider-real-drop-rates.js
const REFERENCE_DATA = {
  "Small Spring": {
    rq0cs0: {
      "Stone": { dropsPerCider: 104.65 },
      "Apple": { dropsPerCider: 14.16 },
      "Feathers": { dropsPerCider: 104.69 },
      "Wood": { dropsPerCider: 104.69 }
    },
    rq0cs1: {
      "Stone": { dropsPerCider: 130.82 },
      "Apple": { dropsPerCider: 17.70 },
      "Feathers": { dropsPerCider: 130.87 },
      "Wood": { dropsPerCider: 130.87 }
    },
    rq1cs0: {
      "Stone": { dropsPerCider: 101.60 },
      "Apple": { dropsPerCider: 16.68 },
      "Feathers": { dropsPerCider: 101.56 },
      "Wood": { dropsPerCider: 101.56 }
    },
    rq1cs1: {
      "Stone": { dropsPerCider: 127.00 },
      "Apple": { dropsPerCider: 20.86 },
      "Feathers": { dropsPerCider: 126.95 },
      "Wood": { dropsPerCider: 126.94 }
    }
  }
};

async function compareData() {
  console.log('🔍 Comparing API data with reference data...\n');
  
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
      console.log('❌ Small Spring not found in API');
      return;
    }

    console.log('📊 Small Spring Drop Rates Analysis\n');
    console.log(`Found ${smallSpring.dropRates.length} variants in API\n`);

    // Предполагаемая конвертация: 1 Apple Cider = 1010 explores (базовый)
    // Но нужно учесть EE (Exploring Effectiveness) перки
    
    const testItems = ['Stone', 'Apple', 'Feathers', 'Wood'];
    const baseAppleCiderExplores = 1010;
    
    // Найденный коэффициент ~1.188 = 1.2 (округлённо)
    // Это значит что эталонные данные используют EE = 1.2
    const EE_FACTOR = 1.2;
    
    console.log('\n🎯 Testing with EE factor 1.2:\n');
    
    smallSpring.dropRates.forEach((dropRate, variantIndex) => {
      if (variantIndex > 1) return; // проверим только первые 2
      
      console.log(`Variant ${variantIndex} (runecube: ${dropRate.runecube}):`);
      
      testItems.forEach(itemName => {
        const apiItem = dropRate.items.find(i => i.item.name === itemName);
        if (!apiItem) return;
        
        const apiRate = apiItem.rate;
        const converted = (baseAppleCiderExplores * EE_FACTOR) / apiRate;
        
        // Ищем эталон
        let refData = null;
        let refKey = null;
        for (const [key, items] of Object.entries(REFERENCE_DATA["Small Spring"])) {
          if (items[itemName]) {
            const keyRunecube = key.includes('rq1');
            const keyCinnamon = key.includes('cs1');
            if ((keyRunecube && dropRate.runecube) || (!keyRunecube && !dropRate.runecube)) {
              if (!keyCinnamon && !refData) { // берём вариант БЕЗ cinnamon
                refData = items[itemName].dropsPerCider;
                refKey = key;
              }
            }
          }
        }
        
        if (refData) {
          const match = Math.abs(converted - refData) < 1.0;
          console.log(`  ${itemName}: ${converted.toFixed(2)} vs ${refData} ${match ? '✅' : '❌'}`);
        }
      });
      console.log('');
    });
    
    // Попробуем найти правильный коэффициент
    console.log('🧪 Testing conversion factors:\n');
    
    smallSpring.dropRates.forEach((dropRate, variantIndex) => {
      console.log(`\n=== Variant ${variantIndex} (runecube: ${dropRate.runecube}) ===`);
      
      testItems.forEach(itemName => {
        const apiItem = dropRate.items.find(i => i.item.name === itemName);
        if (!apiItem) return;
        
        const apiRate = apiItem.rate; // explores per drop
        
        // Ищем в эталонных данных
        let refData = null;
        let refKey = null;
        
        for (const [key, items] of Object.entries(REFERENCE_DATA["Small Spring"])) {
          if (items[itemName]) {
            const keyRunecube = key.includes('rq1');
            if ((keyRunecube && dropRate.runecube) || (!keyRunecube && !dropRate.runecube)) {
              if (!refData) { // берём первое совпадение по runecube
                refData = items[itemName].dropsPerCider;
                refKey = key;
              }
            }
          }
        }
        
        if (refData) {
          // Вычисляем коэффициент: refData / (baseExplores / apiRate)
          const naiveDropsPerCider = baseAppleCiderExplores / apiRate;
          const conversionFactor = refData / naiveDropsPerCider;
          
          console.log(`${itemName}:`);
          console.log(`  API rate: ${apiRate.toFixed(2)} explores/drop`);
          console.log(`  Reference (${refKey}): ${refData} drops/cider`);
          console.log(`  Naive conversion: ${naiveDropsPerCider.toFixed(2)} drops/cider`);
          console.log(`  Required factor: ${conversionFactor.toFixed(4)}x`);
        }
      });
    });
    
    // Теперь анализируем паттерн Cinnamon Sticks
    console.log('\n\n🌿 Analyzing Cinnamon Sticks pattern:\n');
    
    testItems.forEach(itemName => {
      const ref = REFERENCE_DATA["Small Spring"];
      
      if (ref.rq0cs0[itemName] && ref.rq0cs1[itemName]) {
        const base = ref.rq0cs0[itemName].dropsPerCider;
        const withCinnamon = ref.rq0cs1[itemName].dropsPerCider;
        const cinnamonBonus = withCinnamon / base;
        
        console.log(`${itemName}:`);
        console.log(`  Base (rq0cs0): ${base}`);
        console.log(`  With Cinnamon (rq0cs1): ${withCinnamon}`);
        console.log(`  Cinnamon multiplier: ${cinnamonBonus.toFixed(6)}x (+${((cinnamonBonus - 1) * 100).toFixed(2)}%)`);
      }
    });
    
    // Проверяем для runecube тоже
    console.log('\n');
    testItems.forEach(itemName => {
      const ref = REFERENCE_DATA["Small Spring"];
      
      if (ref.rq1cs0[itemName] && ref.rq1cs1[itemName]) {
        const base = ref.rq1cs0[itemName].dropsPerCider;
        const withCinnamon = ref.rq1cs1[itemName].dropsPerCider;
        const cinnamonBonus = withCinnamon / base;
        
        console.log(`${itemName} (with Runecube):`);
        console.log(`  Base (rq1cs0): ${base}`);
        console.log(`  With Cinnamon (rq1cs1): ${withCinnamon}`);
        console.log(`  Cinnamon multiplier: ${cinnamonBonus.toFixed(6)}x (+${((cinnamonBonus - 1) * 100).toFixed(2)}%)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

compareData();

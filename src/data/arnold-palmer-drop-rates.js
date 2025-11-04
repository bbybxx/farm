// ARNOLD PALMER - ПОЛНЫЕ ДРОП РЕЙТЫ ПО ПРЕДМЕТАМ
// ИСПРАВЛЕНО: Используем прямые данные из arnold-palmer.md, а не формулы через Apple Cider

import { APPLE_CIDER_REAL_DROP_RATES } from './apple-cider-real-drop-rates.js';

// ПРАВИЛЬНАЯ ФОРМУЛА для Arnold Palmer:
// Arnold Palmer дает ФИКСИРОВАННОЕ количество предметов, НЕ зависящее от stamina cost предмета
// Базово: 200 предметов
// С Lemon Squeezer: 500 предметов (2.5x)
// Эти предметы распределяются пропорционально дроп рейтам зоны

// Derive Arnold Palmer drop rates directly from Apple Cider measured data.
// Mapping rules (from your spec):
// - rq0cs1 = rq0ls1 (no Runecube, with Lemon Squeezer)
// - rq1cs1 = rq1ls1 (with Runecube, with Lemon Squeezer)
// - rq0cs0 = rq0cs1 / 2.5 (no Lemon Squeezer)
// - rq1cs0 = rq1cs1 / 2.5
// Implementation: for each location/item take APPLE_CIDER_REAL_DROP_RATES.locations[loc].rqXcs1.dropsPerCider
// and use it as items-per-ArnoldPalmer for the corresponding rqXcs1 variant. Then compute cs0 = cs1 / 2.5.

function safeGetAppleCiderDrops(locationName, variant, itemName) {
  const loc = APPLE_CIDER_REAL_DROP_RATES.locations[locationName];
  if (!loc || !loc[variant] || !loc[variant][itemName]) return null;
  const data = loc[variant][itemName];
  
  // Convert cidersPerDrop to dropsPerCider if needed
  if (data && data.dropsPerCider) {
    return data.dropsPerCider;
  } else if (data && data.cidersPerDrop) {
    // IMPORTANT: cidersPerDrop from API is actually "exploresPerDrop" (hits needed for 1 drop)
    // To get dropsPerCider: divide base explores (1010) by exploresPerDrop
    return 1010 / data.cidersPerDrop;
  }
  
  return null;
}

// ПРЯМЫЕ ДАННЫЕ из ваших измерений
const KNOWN_ARNOLD_PALMER_DATA = {
  "Whispering Creek": {
    "Oak": {
      rq0ls0: 83.79,  // без Runecube, без Lemon Squeezer
      rq1ls0: 70.99,  // с Runecube, без Lemon Squeezer  
      rq0ls1: 209.48, // без Runecube, с Lemon Squeezer
      rq1ls1: 177.48  // с Runecube, с Lemon Squeezer
    }
  }
};

// Анализируем паттерн из известных данных Oak
function analyzeOakPattern() {
  const oak = KNOWN_ARNOLD_PALMER_DATA["Whispering Creek"]["Oak"];
  
  return {
    lemonSqueezerRatio: oak.rq0ls0 / oak.rq0ls1, // сколько раз лучше с Lemon Squeezer
    runecubeImprovement: (oak.rq0ls0 - oak.rq1ls0) / oak.rq0ls0 // процент улучшения
  };
}

// ПРАВИЛЬНАЯ ФОРМУЛА на основе данных Oak
function calculateCorrectArnoldPalmerRate(itemStaminaCost, hasLemonSqueezer = false, hasRunecube = false) {
  // Базируемся на данных Oak из Whispering Creek
  const oakStaminaCost = 8.95; // из RUNECUBE_DATA
  const oakBaseline = 83.79; // rq0ls0
  
  // Масштабируем пропорционально stamina cost
  let arnoldPalmersPerItem = (itemStaminaCost / oakStaminaCost) * oakBaseline;
  
  // Применяем Lemon Squeezer (делает в 2.5 раза лучше)
  if (hasLemonSqueezer) {
    arnoldPalmersPerItem = arnoldPalmersPerItem / 2.5;
  }
  
  // Применяем Runecube (улучшение ~15% для Oak)
  if (hasRunecube) {
    const runecubeImprovement = 0.153; // (83.79 - 70.99) / 83.79
    arnoldPalmersPerItem = arnoldPalmersPerItem * (1 - runecubeImprovement);
  }
  
  return {
    arnoldPalmersPerItem: Math.round(arnoldPalmersPerItem * 100) / 100,
    itemsPerArnoldPalmer: Math.round((1 / arnoldPalmersPerItem) * 1000) / 1000
  };
}

// Генерируем полную базу данных Arnold Palmer drop rates
export const ARNOLD_PALMER_DROP_RATES = {
  metadata: {
    version: "1.0.0",
    description: "Complete Arnold Palmer drop rates for every item in every location",
    basedOn: "Runecube data + Arnold Palmer formulas",
    lemonSqueezerEffect: "2.5x multiplier to all drop rates",
    appleCiderEquivalence: "With Lemon Squeezer = Apple Cider + Cinnamon performance"
  },

  // Формулы для расчетов
  formulas: {
    withLemonSqueezer: "items_per_arnold_palmer = (1250 / stamina_cost) * 0.40",
    withoutLemonSqueezer: "items_per_arnold_palmer = ((1250 / stamina_cost) * 0.40) / 2.5",
    explanation: "Arnold Palmer with Lemon Squeezer = Apple Cider with 1250 explores performance"
  },

  // Полные данные по локациям и предметам
  locations: {}
};

// Заполняем данные для каждой локации и предмета
// Build ARNOLD_PALMER_DROP_RATES from APPLE_CIDER_REAL_DROP_RATES using mapping rules
Object.entries(APPLE_CIDER_REAL_DROP_RATES.locations).forEach(([locationName, locationData]) => {
  ARNOLD_PALMER_DROP_RATES.locations[locationName] = {
    itemCount: Object.keys(locationData.rq0cs0 || {}).length || 0,
    items: {}
  };

  // Collect item names from any variant
  const allItems = new Set();
  ['rq0cs0','rq0cs1','rq1cs0','rq1cs1'].forEach(v => {
    if (locationData[v]) Object.keys(locationData[v]).forEach(i => allItems.add(i));
  });

  allItems.forEach(itemName => {
    // Use apple cider dropsPerCider as items-per-ArnoldPalmer for cs1 variants
    const apple_rq0_cs1 = safeGetAppleCiderDrops(locationName, 'rq0cs1', itemName);
    const apple_rq1_cs1 = safeGetAppleCiderDrops(locationName, 'rq1cs1', itemName);

    // If apple cider data missing for a variant, try fallbacks
    const drop_rq0cs1 = apple_rq0_cs1 || safeGetAppleCiderDrops(locationName, 'rq0cs0', itemName) || 0;
    const drop_rq1cs1 = apple_rq1_cs1 || safeGetAppleCiderDrops(locationName, 'rq1cs0', itemName) || drop_rq0cs1;

    // Apply cs0 = cs1 / 2.5
    const drop_rq0cs0 = drop_rq0cs1 / 2.5;
    const drop_rq1cs0 = drop_rq1cs1 / 2.5;

    // arnoldPalmersPerItem — inverse values; guard against division by zero
    const ap_rq0cs1 = drop_rq0cs1 ? 1 / drop_rq0cs1 : null;
    const ap_rq1cs1 = drop_rq1cs1 ? 1 / drop_rq1cs1 : null;
    const ap_rq0cs0 = drop_rq0cs0 ? 1 / drop_rq0cs0 : null;
    const ap_rq1cs0 = drop_rq1cs0 ? 1 / drop_rq1cs0 : null;

    ARNOLD_PALMER_DROP_RATES.locations[locationName].items[itemName] = {
      // Keep basic flags where possible
      isRare: (locationData.rq0cs0 && locationData.rq0cs0[itemName] && locationData.rq0cs0[itemName].isRare) || false,

      arnoldPalmerRates: {
        rq0cs0: ap_rq0cs0 !== null ? Math.round(ap_rq0cs0 * 100) / 100 : null,
        rq0cs1: ap_rq0cs1 !== null ? Math.round(ap_rq0cs1 * 100) / 100 : null,
        rq1cs0: ap_rq1cs0 !== null ? Math.round(ap_rq1cs0 * 100) / 100 : null,
        rq1cs1: ap_rq1cs1 !== null ? Math.round(ap_rq1cs1 * 100) / 100 : null
      },

      dropRates: {
        rq0cs0: drop_rq0cs0 ? Math.round(drop_rq0cs0 * 100) / 100 : null,
        rq0cs1: drop_rq0cs1 ? Math.round(drop_rq0cs1 * 100) / 100 : null,
        rq1cs0: drop_rq1cs0 ? Math.round(drop_rq1cs0 * 100) / 100 : null,
        rq1cs1: drop_rq1cs1 ? Math.round(drop_rq1cs1 * 100) / 100 : null
      }
    };
  });
});

// Утилиты для расчетов
export const ArnoldPalmerDropCalculator = {
  // Получить drop rate для конкретного предмета
  getItemDropRate(location, item, hasLemonSqueezer = false, hasRunecube = false) {
    const locationData = ARNOLD_PALMER_DROP_RATES.locations[location];
    if (!locationData || !locationData.items[item]) return null;

    const variant = `rq${hasRunecube ? 1 : 0}cs${hasLemonSqueezer ? 1 : 0}`;
    const itemData = locationData.items[item];
    return itemData.dropRates[variant] ? {
      itemsPerArnoldPalmer: itemData.dropRates[variant],
      arnoldPalmersPerItem: itemData.arnoldPalmerRates[variant]
    } : null;
  },

  // Рассчитать ожидаемое количество предметов за N Arnold Palmer
  calculateExpectedItems(location, item, arnoldPalmerCount, hasLemonSqueezer = false, hasRunecube = false) {
    const dropRate = this.getItemDropRate(location, item, hasLemonSqueezer, hasRunecube);
    if (!dropRate) return null;

    return {
      expectedItems: Math.round(dropRate.itemsPerArnoldPalmer * arnoldPalmerCount * 1000) / 1000,
      arnoldPalmersUsed: arnoldPalmerCount,
      hasLemonSqueezer,
      hasRunecube
    };
  },

  // Рассчитать сколько Arnold Palmer нужно для получения N предметов
  calculateArnoldPalmersNeeded(location, item, itemsWanted, hasLemonSqueezer = false, hasRunecube = false) {
    const dropRate = this.getItemDropRate(location, item, hasLemonSqueezer, hasRunecube);
    if (!dropRate) return null;

    return {
      arnoldPalmersNeeded: Math.ceil(dropRate.arnoldPalmersPerItem * itemsWanted),
      expectedItems: itemsWanted,
      hasLemonSqueezer,
      hasRunecube
    };
  },

  // Найти лучшие предметы для фарма с Arnold Palmer в локации
  getBestItemsInLocation(location, hasLemonSqueezer = false, hasRunecube = false, limit = 10) {
    const locationData = ARNOLD_PALMER_DROP_RATES.locations[location];
    if (!locationData) return null;

    const variant = `rq${hasRunecube ? 1 : 0}cs${hasLemonSqueezer ? 1 : 0}`;
    const items = Object.entries(locationData.items).map(([itemName, itemData]) => {
      return {
        item: itemName,
        itemsPerArnoldPalmer: itemData.dropRates[variant],
        arnoldPalmersPerItem: itemData.arnoldPalmerRates[variant],
        isRare: itemData.isRare,
        staminaCost: itemData.staminaCost
      };
    }).filter(i => i.itemsPerArnoldPalmer != null);

    // Сортируем по количеству предметов за Arnold Palmer (больше = лучше)
    return items
      .sort((a, b) => b.itemsPerArnoldPalmer - a.itemsPerArnoldPalmer)
      .slice(0, limit);
  },

  // Сравнить эффективность Arnold Palmer vs обычного exploring
  compareWithManualExploring(location, item, hasLemonSqueezer = false, hasRunecube = false) {
    const locationData = ARNOLD_PALMER_DROP_RATES.locations[location];
    if (!locationData || !locationData.items[item]) return null;

    const itemData = locationData.items[item];
    const variant = `rq${hasRunecube ? 1 : 0}cs${hasLemonSqueezer ? 1 : 0}`;
    const dropRate = itemData.dropRates[variant];

    // Обычное exploring: 1 предмет за N stamina
    const manualStaminaPerItem = itemData.staminaCost;
    
    // Arnold Palmer: не требует stamina, но нужно craft Arnold Palmer
    return {
      manual: {
        staminaPerItem: manualStaminaPerItem,
        method: "Manual exploring with stamina"
      },
      arnoldPalmer: {
        arnoldPalmersPerItem: itemData.arnoldPalmerRates[variant],
        itemsPerArnoldPalmer: dropRate,
        method: hasLemonSqueezer ? "Arnold Palmer + Lemon Squeezer" : "Arnold Palmer base",
        advantage: "No stamina required, but need to craft Arnold Palmer",
        hasRunecube
      }
    };
  }
};

// Demo code removed to reduce production bundle size

export default ARNOLD_PALMER_DROP_RATES;

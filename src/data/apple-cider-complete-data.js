// APPLE CIDER - COMPLETE MECHANICS DATABASE
// Собранные данные из библиотеки и API исследований

import { APPLE_CIDER_REAL_DROP_RATES_UPGRADED } from './apple-cider-real-drop-rates-updated.js';

const APPLE_CIDER_DATA = {
  // ===== БАЗОВАЯ ИНФОРМАЦИЯ =====
  basic: {
    id: 379,
    name: "Apple Cider",
    description: "Explore faster! Requires stamina.",
    craftingCost: 40, // apples
    baseExplores: 1010,
    baseStaminaRequired: 1010,
    dropRateBonus: 0.40 // sets drop rate to 0.40 in ALL zones
  },

  // ===== EXPLORING EFFECTIVENESS ФОРМУЛЫ =====
  exploringEffectiveness: {
    // Базовая формула без перков
    baseFormula: "1010 + (effectiveness * 10)",
    
    // С Cinnamon Sticks
    cinnamonSticksFormula: "1010 * 1.25 + (effectiveness * 12.5)",
    cinnamonSticksMinimum: 1263,
    
    // Таблица точных значений
    table: [
      { effectiveness: 1,  withoutCinnamon: 1010, withCinnamon: 1263 },
      { effectiveness: 2,  withoutCinnamon: 1020, withCinnamon: 1275 },
      { effectiveness: 3,  withoutCinnamon: 1030, withCinnamon: 1288 },
      { effectiveness: 4,  withoutCinnamon: 1040, withCinnamon: 1300 },
      { effectiveness: 5,  withoutCinnamon: 1050, withCinnamon: 1313 },
      { effectiveness: 6,  withoutCinnamon: 1060, withCinnamon: 1325 },
      { effectiveness: 7,  withoutCinnamon: 1070, withCinnamon: 1338 },
      { effectiveness: 8,  withoutCinnamon: 1080, withCinnamon: 1350 },
      { effectiveness: 9,  withoutCinnamon: 1090, withCinnamon: 1363 },
      { effectiveness: 10, withoutCinnamon: 1100, withCinnamon: 1375 },
      { effectiveness: 11, withoutCinnamon: 1110, withCinnamon: 1388 },
      { effectiveness: 12, withoutCinnamon: 1120, withCinnamon: 1400 },
      { effectiveness: 13, withoutCinnamon: 1130, withCinnamon: 1413 },
      { effectiveness: 14, withoutCinnamon: 1140, withCinnamon: 1425 },
      { effectiveness: 15, withoutCinnamon: 1150, withCinnamon: 1438 },
      { effectiveness: 16, withoutCinnamon: 1160, withCinnamon: 1450 },
      { effectiveness: 18, withoutCinnamon: 1180, withCinnamon: 1475 },
      { effectiveness: 20, withoutCinnamon: 1200, withCinnamon: 1500 },
      { effectiveness: 22, withoutCinnamon: 1220, withCinnamon: 1525 },
      { effectiveness: 24, withoutCinnamon: 1240, withCinnamon: 1550 },
      { effectiveness: 26, withoutCinnamon: 1260, withCinnamon: 1575 },
      { effectiveness: 28, withoutCinnamon: 1280, withCinnamon: 1600 },
      { effectiveness: 30, withoutCinnamon: 1300, withCinnamon: 1625 },
      { effectiveness: 32, withoutCinnamon: 1320, withCinnamon: 1650 },
      { effectiveness: 36, withoutCinnamon: 1360, withCinnamon: 1700 },
      { effectiveness: 40, withoutCinnamon: 1400, withCinnamon: 1750 },
      { effectiveness: 44, withoutCinnamon: 1440, withCinnamon: 1800 },
      { effectiveness: 48, withoutCinnamon: 1480, withCinnamon: 1850 },
      { effectiveness: 52, withoutCinnamon: 1520, withCinnamon: 1900 },
      { effectiveness: 56, withoutCinnamon: 1560, withCinnamon: 1950 },
      { effectiveness: 60, withoutCinnamon: 1600, withCinnamon: 2000 }
    ]
  },

  // ===== ПЕРКИ И БОНУСЫ =====
  perks: {
    cinnamonSticks: {
      name: "Cinnamon Sticks",
      effect: "+25% explores",
      minimum: 1263,
      formula: "base * 1.25"
    },
    
    wandererPerks: {
      wandererI: {
        name: "Wanderer I",
        effect: "Reduce stamina by 4%",
        reduction: 0.04
      },
      wandererII: {
        name: "Wanderer II", 
        effect: "Reduce stamina by 7%",
        reduction: 0.07
      },
      wandererIII: {
        name: "Wanderer III",
        effect: "Reduce stamina by 9%", 
        reduction: 0.09
      },
      wandererIV: {
        name: "Wanderer IV",
        effect: "Reduce stamina by 13%",
        reduction: 0.13
      },
      stacking: "additive", // 4% + 7% + 9% + 13% = 33% total
      maxReduction: 0.33, // when all 4 perks are active
      formula: "stamina * (1 - (0.04 + 0.07 + 0.09 + 0.13))"
    },
    
    sprintShoes: {
      sprintShoesI: {
        name: "Sprint Shoes I",
        effect: "Double exploring effectiveness bonus",
        formula: "effectiveness * 2"
      },
      sprintShoesII: {
        name: "Sprint Shoes II", 
        effect: "Double again (4x total with Sprint I)",
        formula: "effectiveness * 4 (with Sprint I)"
      }
    },
    
    neighNeigh: {
      name: "Neigh Neigh",
      effect: "Reduce stamina by 20%",
      reduction: 0.20,
      stacksWith: "Wanderer (multiplicative)",
      maxCombinedReduction: 0.464 // 46.4% with both
    }
  },

  // ===== MEALS =====
  meals: {
    cabbageStew: {
      name: "Cabbage Stew",
      effect: "Use 5 ciders per click",
      multiplier: 5
    },
    
    proteinBar: {
      name: "Protein Bar",
      effect: "Increase exploring effectiveness without cost increase",
      freeUses: 3,
      costAfter: "25 gold per use (+25 each time)"
    }
  },

  // ===== ZONE DROP RATES =====
  zoneDropRates: {
    // Базовые drop rates по зонам
    base: {
      "Highland Hills": { rate: 0.250, fraction: "1/4", exploresPerItem: 4.00 },
      "Whispering Creek": { rate: 0.267, fraction: "4/15", exploresPerItem: 3.75 },
      "Jundland Desert": { rate: 0.267, fraction: "4/15", exploresPerItem: 3.75 },
      "Cane Pole Ridge": { rate: 0.286, fraction: "2/7", exploresPerItem: 3.50 },
      "Forest": { rate: 0.333, fraction: "1/3", exploresPerItem: 3.00 },
      "Small Spring": { rate: 0.333, fraction: "1/3", exploresPerItem: 3.00 },
      "Misty Forest": { rate: 0.333, fraction: "1/3", exploresPerItem: 3.00 },
      "Black Rock Canyon": { rate: 0.333, fraction: "1/3", exploresPerItem: 3.00 },
      "Mount Banon": { rate: 0.333, fraction: "1/3", exploresPerItem: 3.00 },
      "Ember Lagoon": { rate: 0.333, fraction: "1/3", exploresPerItem: 3.00 },
      "Small Cave": { rate: 0.400, fraction: "2/5", exploresPerItem: 2.50 },
      "Haunted House": { rate: 0.375, fraction: "3/8", exploresPerItem: 2.67 }, // October event
      "Santa's Workshop": { rate: 0.429, fraction: "3/7", exploresPerItem: 2.33 }  // December event
    },
    
    // Apple Cider устанавливает фиксированный rate
    withAppleCider: 0.40,
    
    // Conversion factors для расчетов
    conversionFactors: {
      0.250: 2.000, // 1/4
      0.267: 1.875, // 4/15  
      0.286: 1.75,  // 2/7
      0.333: 1.5,   // 1/3
      0.400: 1.25   // 2/5
    }
  },

  // ===== ФОРМУЛЫ РАСЧЕТОВ =====
  calculations: {
    // Количество explores с Apple Cider
    explores: {
      withoutPerks: (effectiveness) => 1010 + (effectiveness * 10),
      withCinnamon: (effectiveness) => Math.round(1010 * 1.25 + (effectiveness * 12.5)),
      withSprintI: (effectiveness) => effectiveness * 2,
      withSprintII: (effectiveness) => effectiveness * 4 // с обоими Sprint
    },
    
    // Stamina consumption
    stamina: {
      base: (explores) => explores, // 1:1 ratio базово
      withWanderer: (base, wandererPerks = []) => {
        // wandererPerks - массив активных перков [1,2,3,4] или их части
        const reductions = {1: 0.04, 2: 0.07, 3: 0.09, 4: 0.13};
        const totalReduction = wandererPerks.reduce((sum, perk) => sum + reductions[perk], 0);
        return base * (1 - totalReduction);
      },
      withNeigh: (base) => base * 0.8, // -20%
      withBoth: (base, wandererPerks = [], hasNeigh = false) => {
        // Сначала применяем Wanderer (additive)
        const wandererReductions = {1: 0.04, 2: 0.07, 3: 0.09, 4: 0.13};
        const totalWandererReduction = wandererPerks.reduce((sum, perk) => sum + wandererReductions[perk], 0);
        let result = base * (1 - totalWandererReduction);
        
        // Потом Neigh Neigh (multiplicative)
        if (hasNeigh) result *= 0.8;
        
        return result;
      }
    },
    
    // Drop rate improvements
    dropRateImprovement: (baseZoneRate) => {
      return (0.40 - baseZoneRate) / baseZoneRate; // percentage improvement
    }
  },

  // ===== BUDDY.FARM КОРРЕКТИРОВКИ =====
  buddyFarmCorrections: {
    note: "Buddy.farm не учитывает Exploring Effectiveness в расчетах",
    assumedValues: {
      withoutCinnamon: 1000,
      withCinnamon: 1250
    },
    correctionFormula: "actualRate = buddyFarmRate * (yourExplores / 1250)",
    rareItemsFormula: "correctedRate = buddyFarmRate * (1250 / yourExplores)"
  },

  // ===== ПРИМЕРЫ РАСЧЕТОВ =====
  examples: {
    example1: {
      description: "Player with 24 exploring effectiveness, Sprint Shoes I+II, Cinnamon Sticks",
      calculations: {
        baseEffectiveness: 24,
        withSprintShoes: 24 * 4, // = 96
        explores: 1010 * 1.25 + (96 * 12.5), // = 1262.5 + 1200 = 2462.5 ≈ 2463
        staminaRequired: 2463,
        dropRateInAllZones: 0.40
      }
    },
    
    example2: {
      description: "Highland Hills (worst drop rate) improvement with Apple Cider",
      calculations: {
        manualDropRate: 0.250,
        ciderDropRate: 0.40,
        improvement: ((0.40 - 0.250) / 0.250) * 100, // = 60% improvement
        manualExploresPerItem: 4.0,
        ciderExploresPerItem: 2.5
      }
    }
  }
};

// ===== УТИЛИТЫ ДЛЯ РАСЧЕТОВ =====
const AppleCiderCalculator = {
  // Рассчитать количество explores
  calculateExplores(effectiveness, hasSprintI = false, hasSprintII = false, hasCinnamon = false) {
    let adjustedEffectiveness = effectiveness;
    
    if (hasSprintI) adjustedEffectiveness *= 2;
    if (hasSprintII) adjustedEffectiveness *= 2; // дополнительно x2
    
    if (hasCinnamon) {
      return Math.round(1010 * 1.25 + (adjustedEffectiveness * 12.5));
    } else {
      return 1010 + (adjustedEffectiveness * 10);
    }
  },
  
  // Рассчитать stamina consumption
  calculateStamina(explores, wandererPerks = [], hasNeigh = false) {
    let stamina = explores;
    
    // Wanderer reductions (additive: 4% + 7% + 9% + 13% = 33% max)
    const wandererReductions = {1: 0.04, 2: 0.07, 3: 0.09, 4: 0.13};
    const totalWandererReduction = wandererPerks.reduce((sum, perk) => sum + wandererReductions[perk], 0);
    stamina *= (1 - totalWandererReduction);
    
    // Neigh Neigh reduction (multiplicative)
    if (hasNeigh) {
      stamina *= 0.8;
    }
    
    return Math.round(stamina);
  },
  
  // Рассчитать drop rate improvement
  calculateDropImprovement(zoneName) {
    const baseRate = APPLE_CIDER_DATA.zoneDropRates.base[zoneName]?.rate || 0.333;
    const ciderRate = 0.40;
    return ((ciderRate - baseRate) / baseRate * 100).toFixed(1);
  },
  
  // Найти оптимальную зону для Apple Cider
  findBestZones() {
    const zones = APPLE_CIDER_DATA.zoneDropRates.base;
    const improvements = Object.entries(zones).map(([zone, data]) => ({
      zone,
      baseRate: data.rate,
      improvement: this.calculateDropImprovement(zone)
    }));
    
    return improvements.sort((a, b) => parseFloat(b.improvement) - parseFloat(a.improvement));
  }
};

const AppleCiderIntegration = {
  calculateAdjustedDropRates(effectiveness, hasSprintI = false, hasSprintII = false, hasCinnamon = false) {
    const explores = AppleCiderCalculator.calculateExplores(effectiveness, hasSprintI, hasSprintII, hasCinnamon);
    const scalingFactor = explores / APPLE_CIDER_DATA.basic.baseExplores;

    const adjustedDropRates = {};
    for (const location in APPLE_CIDER_REAL_DROP_RATES_UPGRADED.locations) {
      adjustedDropRates[location] = {};
      for (const variant in APPLE_CIDER_REAL_DROP_RATES_UPGRADED.locations[location]) {
        adjustedDropRates[location][variant] = {};
        for (const item in APPLE_CIDER_REAL_DROP_RATES_UPGRADED.locations[location][variant]) {
          const rate = APPLE_CIDER_REAL_DROP_RATES_UPGRADED.locations[location][variant][item];
          if (rate.dropsPerCider) {
            adjustedDropRates[location][variant][item] = {
              dropsPerCider: rate.dropsPerCider * scalingFactor
            };
          } else if (rate.cidersPerDrop) {
            adjustedDropRates[location][variant][item] = {
              cidersPerDrop: rate.cidersPerDrop / scalingFactor
            };
          }
        }
      }
    }
    return adjustedDropRates;
  }
};

// ===== ЭКСПОРТ =====
export { APPLE_CIDER_DATA, AppleCiderCalculator, AppleCiderIntegration };
// Default export for compatibility with modules that expect a default
export default APPLE_CIDER_DATA;

// CommonJS совместимость
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APPLE_CIDER_DATA, AppleCiderCalculator, AppleCiderIntegration };
}

// Demo code removed to reduce production bundle size

// ARNOLD PALMER - SEPARATE EXPLORING SYSTEM
// Полностью независим от Apple Cider и stamina

const ARNOLD_PALMER_DATA = {
  // ===== БАЗОВАЯ ИНФОРМАЦИЯ =====
  basic: {
    name: "Arnold Palmer",
    description: "Alternative exploring method, independent of stamina and Apple Cider perks",
    baseItems: 200, // items per use in exploring zones
    staminaRequired: false, // НЕ требует stamina!
    independentFromCider: true // не связан с Apple Cider перками
  },

  // ===== ПЕРКИ И БОНУСЫ =====
  perks: {
    lemonSqueezer: {
      name: "Lemon Squeezer",
      effect: "Increase items from 200 to 500",
      multiplier: 2.5, // 200 → 500
      baseWithPerk: 500
    }
  },

  // NEW: metadata for runecube-related perk
  runecube: {
    eagleEye: {
      name: 'Eagle Eye (Runecube)',
      effect: 'Improves Arnold Palmer drop rates when runecube-like bonus is active',
      approxImprovement: 0.153 // ~15.3% improvement observed on sample data
    }
  },

  // ===== MEALS =====
  meals: {
    quandaryChowder: {
      name: "Quandary Chowder",
      effect: "Makes lemonade and Arnold Palmer 10% more effective",
      duration: "5 minutes",
      bonus: 0.10, // +10%
      // С Lemon Squeezer: 500 * 1.10 = 550 items
      withLemonSqueezer: 550
    },

    lemonCreamPie: {
      name: "Lemon Cream Pie",
      effect: "Use 5x Arnold Palmer per click",
      multiplier: 5,
      description: "Explore faster with bulk Arnold Palmer usage"
    },

    lemonSeltzer: {
      name: "Lemon Seltzer",
      effect: "Arnold Palmer gives 50% more items",
      bonus: 0.50, // +50%
      duration: "50 uses",
      stackingWith: "Quandary Chowder (multiplicative)",
      
      // Расчеты с комбинациями
      calculations: {
        basePlus50: 300, // 200 * 1.5
        withLemonSqueezerPlus50: 750, // 500 * 1.5
        withBothMeals: 825, // 500 * 1.5 * 1.1 (Quandary multiplicative)
        
        // С Lemon Cream Pie (5x usage)
        withLemonCreamPie: {
          uses: 50, // действий
          totalArnoldPalmers: 250, // 50 * 5
          description: "50 actions × 5 Arnold Palmers = 250 uses with 50% bonus"
        }
      }
    }
  },

  // ===== ФОРМУЛЫ РАСЧЕТОВ =====
  calculations: {
    // Базовые items
    baseItems: (hasLemonSqueezer = false) => {
      return hasLemonSqueezer ? 500 : 200;
    },

    // С одним meal
    withSingleMeal: (base, mealBonus) => {
      return Math.round(base * (1 + mealBonus));
    },

    // С комбинацией meals (multiplicative)
    withCombinedMeals: (base, quandaryBonus = 0.10, lemonSeltzerBonus = 0.50) => {
      return Math.round(base * (1 + lemonSeltzerBonus) * (1 + quandaryBonus));
    },

    // Полный расчет с всеми бонусами
    maxItems: () => {
      const base = 500; // с Lemon Squeezer
      const withLemonSeltzer = base * 1.50; // +50%
      const withBothMeals = withLemonSeltzer * 1.10; // +10% Quandary
      return Math.round(withBothMeals); // = 825 items per Arnold Palmer
    }
  },

  // ===== ДРОП РЕЙТЫ ПО ЛОКАЦИЯМ =====
  dropRates: {
    // Arnold Palmer дроп рейты зависят от Lemon Squeezer перка
    formula: {
      withLemonSqueezer: "Identical to Apple Cider on unpumped (0) location with 1000 exploring effectiveness + Cinnamon Sticks",
      withoutLemonSqueezer: "Same as above but 2.5x less",
      comparison: "Arnold Palmer with Lemon Squeezer = Apple Cider (1000 explores + Cinnamon)"
    },

    // Базовые расчеты
    calculations: {
      appleCiderReference: {
        explores: 1000, // базовые explores Apple Cider
        cinnamonBonus: 1.25, // +25% от Cinnamon Sticks
        totalExplores: 1250, // 1000 * 1.25
        effectiveDropRate: "Same as 1250 explores per Apple Cider"
      },

      arnoldPalmerDropRates: {
        withLemonSqueezer: {
          description: "Drop rate identical to Apple Cider with 1250 explores",
          formula: "items_per_arnoldpalmer = items_per_1250_explores_applecider",
          baseItems: 500, // подтверждает это соотношение
          reference: "Equivalent to Apple Cider with Cinnamon Sticks on 0 exploring effectiveness location"
        },
        
        withoutLemonSqueezer: {
          description: "Drop rate = (Apple Cider with 1250 explores) / 2.5",
          formula: "items_per_arnoldpalmer = items_per_1250_explores_applecider / 2.5",
          baseItems: 200, // 500 / 2.5 = 200
          reference: "2.5x worse than Lemon Squeezer version"
        }
      }
    },

    // Эквиваленты по зонам
    zoneEquivalents: {
      "Highland Hills": {
        zoneDropRate: 0.250,
        appleCiderExplores: 1250, // с Cinnamon Sticks
        appleCiderItems: 1250 * 0.40, // = 500 (Apple Cider sets 0.40 rate)
        
        arnoldPalmerWithLemon: 500, // идентично Apple Cider
        arnoldPalmerWithoutLemon: 200, // в 2.5 раза меньше
        
        note: "Arnold Palmer with Lemon Squeezer = Apple Cider performance"
      },

      "Whispering Creek": {
        zoneDropRate: 0.267,
        appleCiderExplores: 1250,
        appleCiderItems: 1250 * 0.40, // = 500
        
        arnoldPalmerWithLemon: 500,
        arnoldPalmerWithoutLemon: 200
      },

      "Small Cave": {
        zoneDropRate: 0.400,
        appleCiderExplores: 1250,
        appleCiderItems: 1250 * 0.40, // = 500
        
        arnoldPalmerWithLemon: 500,
        arnoldPalmerWithoutLemon: 200,
        
        note: "Small Cave already has 0.40 rate, so Apple Cider gives no bonus here"
      }
    },

    // Важные выводы
    insights: {
      consistency: "Arnold Palmer drop rates FIXED regardless of zone (unlike manual exploring)",
      lemonSqueezerImportance: "Lemon Squeezer increases both items AND effective drop rate by 2.5x",
      appleCiderEquivalence: "Arnold Palmer + Lemon Squeezer = Apple Cider + Cinnamon on fresh location",
      advantage: "No exploring effectiveness or stamina perks needed for consistent performance"
    }
  },
  comparison: {
    appleCider: {
      requirement: "1000+ stamina",
      perksRequired: "Wanderer, Sprint Shoes, Cinnamon Sticks",
      dropRateBonus: "0.40 in all zones",
      explores: "1010-2000+ per use",
      staminaCost: "Variable with perks"
    },
    
    arnoldPalmer: {
      requirement: "No stamina needed",
      perksRequired: "Only Lemon Squeezer (optional)",
      dropRateBonus: "None (uses zone base rates)",
      items: "200-825 direct items",
      staminaCost: "None"
    },

    whenToUse: {
      appleCider: "High stamina, want drop rate boost, have stamina perks",
      arnoldPalmer: "No stamina, want guaranteed items, independent exploring"
    }
  },

  // ===== ПРИМЕРЫ РАСЧЕТОВ =====
  examples: {
    example1: {
      description: "Base Arnold Palmer usage",
      calculation: {
        items: 200,
        perks: "None",
        meals: "None"
      }
    },

    example2: {
      description: "Optimal Arnold Palmer setup",
      calculation: {
        basePerk: "Lemon Squeezer (+150%): 500 items",
        meal1: "Lemon Seltzer (+50%): 750 items", 
        meal2: "Quandary Chowder (+10%): 825 items",
        bulk: "Lemon Cream Pie (5x): 4,125 items per click"
      }
    },

    example3: {
      description: "Lemon Seltzer 50 uses with Lemon Cream Pie",
      calculation: {
        actions: 50,
        arnoldPalmersPerAction: 5,
        totalArnoldPalmers: 250,
        bonusItems: "125 extra Arnold Palmer worth",
        description: "Massive bulk exploring session"
      }
    }
  }
};

// ===== УТИЛИТЫ ДЛЯ РАСЧЕТОВ =====
const ArnoldPalmerCalculator = {
  // Рассчитать items за один Arnold Palmer
  calculateItems(hasLemonSqueezer = false, hasQuandary = false, hasLemonSeltzer = false) {
    let items = hasLemonSqueezer ? 500 : 200;
    
    if (hasLemonSeltzer) items *= 1.5;  // +50%
    if (hasQuandary) items *= 1.1;      // +10% multiplicative
    
    return Math.round(items);
  },

  // Рассчитать items с Lemon Cream Pie (5x)
  calculateBulkItems(hasLemonSqueezer = false, hasQuandary = false, hasLemonSeltzer = false) {
    const singleUse = this.calculateItems(hasLemonSqueezer, hasQuandary, hasLemonSeltzer);
    return singleUse * 5; // Lemon Cream Pie multiplier
  },

  // Сравнить эффективность дроп рейтов с Apple Cider
  compareDropRates(zone = "Highland Hills") {
    const zoneData = ARNOLD_PALMER_DATA.dropRates.zoneEquivalents[zone];
    
    if (!zoneData) {
      return { error: `Zone ${zone} not found in data` };
    }

    return {
      zone: zone,
      zoneBaseDropRate: zoneData.zoneDropRate,
      
      appleCider: {
        explores: zoneData.appleCiderExplores,
        dropRate: 0.40, // Apple Cider always sets to 0.40
        items: zoneData.appleCiderItems,
        description: "Apple Cider with Cinnamon Sticks on 0 exploring effectiveness"
      },
      
      arnoldPalmer: {
        withLemonSqueezer: {
          items: zoneData.arnoldPalmerWithLemon,
          equivalentDropRate: zoneData.arnoldPalmerWithLemon / zoneData.appleCiderExplores, // эквивалентный drop rate
          description: "Identical performance to Apple Cider reference"
        },
        withoutLemonSqueezer: {
          items: zoneData.arnoldPalmerWithoutLemon,
          equivalentDropRate: zoneData.arnoldPalmerWithoutLemon / zoneData.appleCiderExplores,
          description: "2.5x worse than Lemon Squeezer version"
        }
      },
      
      conclusion: zoneData.note || "Standard performance comparison"
    };
  },

  // Рассчитать эквивалентный drop rate Arnold Palmer
  calculateEquivalentDropRate(hasLemonSqueezer = false) {
    const appleCiderReference = 1250; // explores с Cinnamon Sticks
    const arnoldPalmerItems = hasLemonSqueezer ? 500 : 200;
    
    return {
      arnoldPalmerItems: arnoldPalmerItems,
      equivalentExplores: appleCiderReference,
      equivalentDropRate: arnoldPalmerItems / appleCiderReference,
      comparison: hasLemonSqueezer 
        ? "Same as Apple Cider with Cinnamon (0.40 effective rate)"
        : "2.5x worse (0.16 effective rate)"
    };
  },
};

// ===== ЭКСПОРТ =====
export { ARNOLD_PALMER_DATA, ArnoldPalmerCalculator };

// ===== ДЕМО =====
console.log('🍹 ARNOLD PALMER DATABASE LOADED');
console.log('📊 Sample calculations:');

const baseItems = ArnoldPalmerCalculator.calculateItems(false, false, false);
console.log(`Base Arnold Palmer: ${baseItems} items`);

const maxItems = ArnoldPalmerCalculator.calculateItems(true, true, true);
console.log(`Max Arnold Palmer: ${maxItems} items`);

const bulkItems = ArnoldPalmerCalculator.calculateBulkItems(true, true, true);
console.log(`Bulk (5x): ${bulkItems} items per click`);

console.log(`\n📈 Drop Rate Analysis:`);
const dropAnalysis = ArnoldPalmerCalculator.calculateEquivalentDropRate(true);
console.log(`With Lemon Squeezer: ${dropAnalysis.arnoldPalmerItems} items = ${dropAnalysis.equivalentDropRate.toFixed(3)} effective drop rate`);

const dropAnalysisBase = ArnoldPalmerCalculator.calculateEquivalentDropRate(false);
console.log(`Without Lemon Squeezer: ${dropAnalysisBase.arnoldPalmerItems} items = ${dropAnalysisBase.equivalentDropRate.toFixed(3)} effective drop rate`);

const zoneComparison = ArnoldPalmerCalculator.compareDropRates("Highland Hills");
console.log(`\n🎯 Highland Hills Comparison:`);
console.log(`Zone base rate: ${zoneComparison.zoneBaseDropRate}`);
console.log(`Apple Cider: ${zoneComparison.appleCider.items} items (${zoneComparison.appleCider.dropRate} rate)`);
console.log(`Arnold Palmer + Lemon: ${zoneComparison.arnoldPalmer.withLemonSqueezer.items} items (equivalent!)`);
console.log(`Arnold Palmer base: ${zoneComparison.arnoldPalmer.withoutLemonSqueezer.items} items`);

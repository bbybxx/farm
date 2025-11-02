# Location Drop Rates API Integration

## Overview
Реализована интеграция динамических drop rates для локаций из buddy.farm GraphQL API.

## Изменения

### 1. RecipeUpdateService.js
- **Добавлено**: `LOCATIONS_KEY = 'cachedApiLocations'` для хранения данных в localStorage
- **Расширен GraphQL query**: теперь запрашиваются locations с полной структурой dropRates
- **Обновлён fetchRecipes()**: возвращает `{items, locations}` вместо массива items
- **Обновлён processAndSaveRecipes()**: 
  - Принимает объект `{items, locations}` (с backward compatibility для старого формата)
  - Обрабатывает 4 варианта drop rates для каждой локации
  - Сохраняет location data в localStorage
- **Обновлён getCachedRecipes()**: возвращает `{recipes, items, locations}`
- **Обновлён updateRecipes()**: передаёт объект data вместо массива items

### 2. API Structure

**GraphQL Query:**
```graphql
locations {
  name
  image
  baseDropRate
  dropRates {
    runecube
    seed { name }
    silverPerHit
    xpPerHit
    items {
      item { name, type, image }
      rate
    }
  }
}
```

**API Response Structure:**
- Каждая локация имеет массив из 4 dropRates вариантов
- `dropRates[0,1]`: runecube=false (без Eagle Eye перка)
- `dropRates[2,3]`: runecube=true (с Eagle Eye перком)
- `seed=null` для всех вариантов (Cinnamon Sticks применяется формулой на фронте)
- `rate` = explores per drop (базовая метрика)

### 3. Data Format

**Saved to localStorage** (`cachedApiLocations`):
```javascript
{
  "Small Spring": {
    name: "Small Spring",
    image: "/img/...",
    baseDropRate: 0.333,
    dropRates: {
      rq0cs0: {  // variant 0 -> rq0cs0 (no runecube, no cinnamon)
        runecube: false,
        seed: null,
        silverPerHit: 10.13,
        xpPerHit: 15.01,
        items: {
          "Stone": {
            exploresPerDrop: 11.47,
            cidersPerDrop: 11.47  // для совместимости
          },
          "Pearl Berries": {
            exploresPerDrop: 44124.14,
            cidersPerDrop: 44124.14
          }
        }
      },
      rq0cs1: { ... },  // variant 1
      rq1cs0: { ... },  // variant 2  
      rq1cs1: { ... }   // variant 3
    }
  }
}
```

## Key Insights

### Perk Mechanics

1. **Eagle Eye (Runecube)**: 
   - Влияет на каждый предмет индивидуально и уникально
   - Пример: Stone rate меняется с 11.47 на 11.81 (+3%)
   - Пример: Apple rate меняется с 84.67 на 71.96 (-15% = более частый дроп!)
   - Пример: Pearl Berries с 44124 на 42052 (-4.7%)

2. **Cinnamon Sticks Seed**:
   - Не возвращается API (seed=null для всех вариантов)
   - Применяется как процентный бонус на фронте (~25%)
   - Формула: `withCinnamon = base × 1.25`

3. **Variants Duplication**:
   - Варианты 0 и 1 почти идентичны (разные снэпшоты данных)
   - Варианты 2 и 3 почти идентичны (разные снэпшоты данных)
   - Сохраняем все 4 для полноты данных

### Metrics Conversion

- **API metric**: `rate` = explores per drop
- **Old static data**: dropsPerCider (с учётом 1010 explores per Apple Cider)
- **Conversion** (будет на фронте):
  ```javascript
  dropsPerCider = (1010 × EE) / exploresPerDrop
  ```
  где EE = Exploring Effectiveness (зависит от перков)

## Testing

См. файлы:
- `test-locations-update.mjs` - проверка структуры данных
- `test-perks.mjs` - проверка информации о перках

## Next Steps

1. ✅ Обновить RecipeUpdateService для загрузки locations
2. ✅ Сохранить locations в localStorage  
3. ⏳ Интегрировать location data в UI компоненты
4. ⏳ Применить Apple Cider формулы для конвертации metrics
5. ⏳ Обновить LocationConfigPanel для отображения новых данных
6. ⏳ Добавить Pearl Berries и другие новые предметы в локации

## Files Changed

- `src/services/RecipeUpdateService.js` - основная логика
- `test-locations-update.mjs` - тестирование API
- `test-perks.mjs` - проверка перков
- `docs/LOCATION_DROP_RATES_UPDATE.md` - эта документация

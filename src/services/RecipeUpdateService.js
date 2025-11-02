import { normalizeItemRecord } from '../utils/itemImageUtils.js'

// Сервис для автоматического обновления рецептов из buddy.farm API
class RecipeUpdateService {
  constructor() {
    // Используем прокси в development и production (Vercel автоматически проксирует /api)
    this.API_URL = '/api/graphql'
    this.STORAGE_KEY = 'lastRecipeUpdate'
    this.RECIPES_KEY = 'cachedApiRecipes'
    this.ITEMS_KEY = 'cachedApiItems'
    this.LOCATIONS_KEY = 'cachedApiLocations'
    this._intervalId = null
    this._lastSuccessfulUrl = null
    this._nativeEnvironment = this._isNativeEnvironment()
    // Fallback endpoints - configure via environment variables
    // Contact FarmRPG developers for API access
    this._fallbackPublicEndpoints = [
      import.meta.env.VITE_API_ENDPOINT || '/api/graphql',
      'https://craft-calculator.com/api/graphql',
      'https://farmcraftcalculator.infy.uk/api/graphql'
    ]

    const envBase = (import.meta?.env?.VITE_API_BASE || '').trim() || null
    this._apiCandidates = this._createApiCandidates({ envBase })
    this.API_URL = this._apiCandidates[0] || this.API_URL

    // Интервалы обновления (в миллисекундах)
    this.REGULAR_INTERVAL = 3 * 24 * 60 * 60 * 1000 // 3 дня
    this.MONTHLY_INTERVAL = 1 * 24 * 60 * 60 * 1000 // 1 день в месяце (первое число)

    this.query = `
      query {
        items {
          name
          type
          canCraft
          craftingLevel
          recipeItems {
            ingredientItem {
              name
              type
            }
            quantity
          }
          image
        }
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
    `
  }

  _isNativeEnvironment() {
    // No longer using native app (Capacitor) - always return false
    // Keeping method for backward compatibility but it's not used in PWA
    try {
      if (typeof document !== 'undefined' && document.location && document.location.protocol === 'file:') {
        return true
      }
    } catch (error) {
      // ignore detection errors
    }
    return false
  }

  _normalizeBaseUrl(base) {
    if (!base) {
      return null
    }
    const trimmed = `${base}`.trim().replace(/\/$/, '')
    if (trimmed.endsWith('/graphql')) {
      return trimmed
    }
    return `${trimmed}/api/graphql`
  }

  _createApiCandidates({ envBase }) {
    const candidates = []
    const envCandidate = this._normalizeBaseUrl(envBase)

    if (!this._nativeEnvironment) {
      candidates.push('/api/graphql')
    }

    if (envCandidate) {
      candidates.push(envCandidate)
    }

    this._fallbackPublicEndpoints.forEach(endpoint => {
      const normalized = this._normalizeBaseUrl(endpoint)
      if (normalized) {
        candidates.push(normalized)
      }
    })

    return Array.from(new Set(candidates.filter(Boolean)))
  }

  // Проверяет доступность localStorage
  isStorageAvailable() {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return false;
    }
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Проверяет, нужно ли обновить рецепты
  shouldUpdate() {
    // В development режиме всегда обновляем для отладки
    if (import.meta.env.DEV) {
      console.log('🛠️ Development режим - принудительное обновление');
      return true;
    }
    
    if (!this.isStorageAvailable()) {
      // Если localStorage недоступен, обновляем только раз за сессию
      return !this._sessionUpdated;
    }
    
    const lastUpdate = window.localStorage.getItem(this.STORAGE_KEY);
    if (!lastUpdate) return true;

    const lastUpdateTime = new Date(lastUpdate);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdateTime.getTime();

    // Проверяем месячное обновление (первое число месяца)
    if (now.getDate() === 1 && lastUpdateTime.getMonth() !== now.getMonth()) {
      return timeDiff >= this.MONTHLY_INTERVAL;
    }

    // Проверяем обычное обновление каждые 3 дня
    return timeDiff >= this.REGULAR_INTERVAL;
  }

  // Получает рецепты из API
  async fetchRecipes() {
    try {
      // Логируем всегда для отладки в нативном приложении
      console.log('🔄 Обновляем рецепты из buddy.farm API...')
      console.log('🌐 Native environment:', this._nativeEnvironment)
      console.log('🌐 API candidates:', this._apiCandidates)
      console.log('🛠️ Development mode:', import.meta.env.DEV)

      const urlsToTry = [...(this._lastSuccessfulUrl ? [this._lastSuccessfulUrl] : []), ...this._apiCandidates]
      let lastError = null

      console.log('📋 URLs to try:', urlsToTry)

      for (const url of urlsToTry) {
        try {
          console.log('🔗 Trying URL:', url)
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: this.query })
          })

          console.log('📡 Response status:', response.status, 'url:', url)
          console.log('📡 Response ok:', response.ok)

          if (!response.ok) {
            const errorText = await response.text()
            const error = new Error(`HTTP error! status: ${response.status}, text: ${errorText}`)
            error.urlTried = url
            console.error('❌ HTTP error:', error)
            throw error
          }

          const data = await response.json()

          console.log('📦 Raw API response:', JSON.stringify(data).substring(0, 500))
          const responseInfo = {
            hasData: !!data.data,
            hasItems: !!(data.data?.items),
            itemsLength: data.data?.items?.length || 0,
            hasErrors: !!data.errors,
            url: url
          }
          console.log('📦 Response structure:', responseInfo)

          if (data.errors) {
            const error = new Error('GraphQL errors occurred')
            error.errors = data.errors
            error.urlTried = url
            console.error('❌ GraphQL errors:', data.errors)
            throw error
          }

          this._lastSuccessfulUrl = url

          const items = data.data?.items || []
          const locations = data.data?.locations || []
          
          console.log('✅ Items received:', items.length, 'via', url)
          console.log('✅ Locations received:', locations.length, 'via', url)
          console.log('🔍 First 5 items:', items.slice(0, 5).map(item => item.name) || [])
          console.log('🔍 First 3 locations:', locations.slice(0, 3).map(loc => loc.name) || [])

          if (items.length === 0) {
            console.warn('⚠️ API returned 0 items!')
          }
          
          if (locations.length === 0) {
            console.warn('⚠️ API returned 0 locations!')
          }

          return { items, locations }
        } catch (error) {
          lastError = error
          console.error('❌ Ошибка при запросе к', error.urlTried || url, ':', error)
        }
      }

      if (lastError) {
        console.error('❌ All URLs failed, last error:', lastError)
        throw lastError
      }

      throw new Error('All API endpoints failed')
    } catch (error) {
      console.error('❌ Ошибка при получении рецептов:', error)
      throw error
    }
  }

  // Обрабатывает и сохраняет рецепты и локации
  processAndSaveRecipes(data) {
    // Поддержка старого формата (массив items) и нового (объект с items и locations)
    const items = Array.isArray(data) ? data : (data?.items || [])
    const locations = Array.isArray(data) ? [] : (data?.locations || [])
    
    console.log('🔧 Processing recipes from', items?.length || 0, 'items')
    console.log('🔧 Processing locations:', locations?.length || 0, 'locations')
    
    if (!items || items.length === 0) {
      console.error('❌ No items to process!')
      return { recipes: {}, items: {}, locations: {} }
    }

    const recipes = {};
    const itemData = {};

    // Фильтруем только крафтимые предметы с рецептами
    const craftableItems = items.filter(item => 
      item.canCraft && 
      item.recipeItems && 
      item.recipeItems.length > 0
    );

    console.log('🔨 Craftable items found:', craftableItems.length)

    craftableItems.forEach(item => {
      // Создаем рецепт
      const recipe = {
        ingredients: {},
        craftingLevel: item.craftingLevel,
        category: item.type || 'item'
      };

      // Добавляем ингредиенты
      item.recipeItems.forEach(recipeItem => {
        recipe.ingredients[recipeItem.ingredientItem.name] = recipeItem.quantity;
      });

      recipes[item.name] = recipe;

      // Сохраняем данные о предмете
      itemData[item.name] = normalizeItemRecord(item.name, {
        name: item.name,
        type: item.type || 'item',
        image: item.image,
        canCraft: item.canCraft,
        craftingLevel: item.craftingLevel
      }, {
        previous: itemData[item.name]
      });
    });

    // Дополняем данные о предметах из всех items
    const allItemNames = new Set();
    Object.keys(recipes).forEach(name => allItemNames.add(name));
    Object.values(recipes).forEach(recipe => {
      Object.keys(recipe.ingredients).forEach(ingredient => {
        allItemNames.add(ingredient);
      });
    });

    items.forEach(item => {
      if (allItemNames.has(item.name)) {
        itemData[item.name] = normalizeItemRecord(item.name, {
          name: item.name,
          type: item.type || 'item',
          image: item.image,
          canCraft: item.canCraft,
          craftingLevel: item.craftingLevel
        }, {
          previous: itemData[item.name]
        });
      }
    });

    // Сортируем рецепты по алфавиту перед сохранением
    const sortedRecipes = {};
    const sortedKeys = Object.keys(recipes).sort((a, b) => {
      return a.localeCompare(b, 'ru', { 
        sensitivity: 'base',
        numeric: true,
        ignorePunctuation: true 
      });
    });
    
    sortedKeys.forEach(key => {
      sortedRecipes[key] = recipes[key];
    });

    // Также сортируем данные о предметах
    const sortedItemData = {};
    const sortedItemKeys = Object.keys(itemData).sort((a, b) => {
      return a.localeCompare(b, 'ru', { 
        sensitivity: 'base',
        numeric: true,
        ignorePunctuation: true 
      });
    });
    
    sortedItemKeys.forEach(key => {
      sortedItemData[key] = itemData[key];
    });

    // Обрабатываем локации
    const locationData = {};
    if (locations && locations.length > 0) {
      console.log('🗺️ Processing', locations.length, 'locations with drop rates')
      
      // Константы для конвертации API данных
      const BASE_APPLE_CIDER_EXPLORES = 1010;
      const BASE_EE = 1.2; // Базовый Exploring Effectiveness с перками
      const CINNAMON_MULTIPLIER = 1.25; // Cinnamon Sticks даёт +25%
      
      locations.forEach(location => {
        const locationName = location.name;
        locationData[locationName] = {
          name: locationName,
          image: location.image,
          baseDropRate: location.baseDropRate,
          dropRates: {}
        };
        
        // API возвращает 2 варианта (дублированные как 4):
        // - variants[0,1]: runecube=false (без Eagle Eye) - берём вариант 0
        // - variants[2,3]: runecube=true (с Eagle Eye) - берём вариант 2
        // Cinnamon Sticks вычисляется формулой: dropsPerCider × 1.25
        
        if (location.dropRates && Array.isArray(location.dropRates)) {
          // Берём только уникальные варианты: 0 (без runecube) и 2 (с runecube)
          const variants = [
            { index: 0, runecube: false, key: 'rq0cs0' },
            { index: 2, runecube: true, key: 'rq1cs0' }
          ];
          
          variants.forEach(({ index, runecube, key }) => {
            const dropRate = location.dropRates[index];
            if (!dropRate) return;
            
            // Базовый вариант без Cinnamon
            locationData[locationName].dropRates[key] = {
              runecube: runecube,
              items: {}
            };
            
            // Вариант с Cinnamon
            const keyWithCinnamon = key.replace('cs0', 'cs1');
            locationData[locationName].dropRates[keyWithCinnamon] = {
              runecube: runecube,
              cinnamon: true,
              items: {}
            };
            
            // Обрабатываем предметы
            if (dropRate.items && Array.isArray(dropRate.items)) {
              dropRate.items.forEach(dropItem => {
                const itemName = dropItem.item?.name;
                if (!itemName || !dropItem.rate) return;
                
                // Конвертация: API rate (explores/drop) → dropsPerCider
                const exploresPerDrop = dropItem.rate;
                const dropsPerCider = (BASE_APPLE_CIDER_EXPLORES * BASE_EE) / exploresPerDrop;
                const dropsPerCiderWithCinnamon = dropsPerCider * CINNAMON_MULTIPLIER;
                
                // Определяем формат (dropsPerCider или cidersPerDrop)
                // Если dropsPerCider < 1, используем cidersPerDrop
                if (dropsPerCider >= 1) {
                  locationData[locationName].dropRates[key].items[itemName] = {
                    dropsPerCider: Math.round(dropsPerCider * 100) / 100
                  };
                  locationData[locationName].dropRates[keyWithCinnamon].items[itemName] = {
                    dropsPerCider: Math.round(dropsPerCiderWithCinnamon * 100) / 100
                  };
                } else {
                  locationData[locationName].dropRates[key].items[itemName] = {
                    cidersPerDrop: Math.round((1 / dropsPerCider) * 100) / 100
                  };
                  locationData[locationName].dropRates[keyWithCinnamon].items[itemName] = {
                    cidersPerDrop: Math.round((1 / dropsPerCiderWithCinnamon) * 100) / 100
                  };
                }
              });
            }
          });
        }
      });
      
      console.log(`✅ Processed ${Object.keys(locationData).length} locations with drop rates`);
    }

    // Сохраняем в localStorage (если доступен)
    if (this.isStorageAvailable()) {
      window.localStorage.setItem(this.RECIPES_KEY, JSON.stringify(sortedRecipes));
      window.localStorage.setItem(this.ITEMS_KEY, JSON.stringify(sortedItemData));
      if (Object.keys(locationData).length > 0) {
        window.localStorage.setItem(this.LOCATIONS_KEY, JSON.stringify(locationData));
      }
      window.localStorage.setItem(this.STORAGE_KEY, new Date().toISOString());
    } else {
      // Сохраняем в памяти для текущей сессии
      this._sessionRecipes = sortedRecipes;
      this._sessionItems = sortedItemData;
      this._sessionLocations = locationData;
      this._sessionUpdated = true;
    }

    if (import.meta.env.DEV) {
      console.log(`✅ Обновлено ${Object.keys(sortedRecipes).length} рецептов`);
      console.log(`✅ Обновлено ${Object.keys(sortedItemData).length} предметов`);
      if (Object.keys(locationData).length > 0) {
        console.log(`✅ Обновлено ${Object.keys(locationData).length} локаций`);
      }
    }

    return { recipes: sortedRecipes, items: sortedItemData, locations: locationData };
  }

  // Получает кэшированные рецепты и локации
  getCachedRecipes() {
    try {
      // Если localStorage недоступен, используем данные из сессии
      if (!this.isStorageAvailable()) {
        return {
          recipes: this._sessionRecipes || {},
          items: this._sessionItems || {},
          locations: this._sessionLocations || {}
        };
      }
      
      const recipes = window.localStorage.getItem(this.RECIPES_KEY);
      const items = window.localStorage.getItem(this.ITEMS_KEY);
      const locations = window.localStorage.getItem(this.LOCATIONS_KEY);
      
      return {
        recipes: recipes ? JSON.parse(recipes) : {},
        items: items ? JSON.parse(items) : {},
        locations: locations ? JSON.parse(locations) : {}
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Ошибка при чтении кэша:', error);
      }
      return { recipes: {}, items: {}, locations: {} };
    }
  }

  // Основной метод для обновления рецептов
  async updateRecipes() {
    try {
      if (!this.shouldUpdate()) {
        if (import.meta.env.DEV) {
          console.log('📅 Обновление рецептов не требуется');
        }
        return this.getCachedRecipes();
      }

      const data = await this.fetchRecipes();
      const result = this.processAndSaveRecipes(data);
      
      if (import.meta.env.DEV) {
        console.log('✅ Рецепты успешно обновлены!');
      }

      return result;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Не удалось обновить рецепты, используем кэш:', error);
      }
      return this.getCachedRecipes();
    }
  }

  // Запускает автоматическое обновление
  startAutoUpdate(onUpdate) {
    const runUpdate = async () => {
      try {
        console.log('🔄 Starting API update...')
        const data = await this.updateRecipes();
        console.log('✅ API update successful, got data:', !!data)
        if (typeof onUpdate === 'function') {
          onUpdate(data);
        }
      } catch (error) {
        console.error('❌ API update failed:', error)
        if (typeof onUpdate === 'function') {
          const cached = this.getCachedRecipes();
          onUpdate({ ...cached, error: error.message || 'Unknown error' });
        }
      }
    };

    runUpdate();

    if (this._intervalId) {
      clearInterval(this._intervalId);
    }

    this._intervalId = setInterval(() => {
      runUpdate();
    }, 60 * 60 * 1000);

    console.log('🚀 Автообновление рецептов запущено');

    return () => {
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
    };
  }

  stopAutoUpdate() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  // Принудительное обновление
  async forceUpdate() {
    if (this.isStorageAvailable()) {
      window.localStorage.removeItem(this.STORAGE_KEY);
    } else {
      this._sessionUpdated = false;
    }
    return await this.updateRecipes();
  }

  // Получает информацию о последнем обновлении
  getUpdateInfo() {
    let lastUpdate = null;
    
    if (this.isStorageAvailable()) {
      lastUpdate = window.localStorage.getItem(this.STORAGE_KEY);
    }
    
    const cached = this.getCachedRecipes();
    
    return {
      lastUpdate: lastUpdate ? new Date(lastUpdate) : null,
      recipesCount: Object.keys(cached.recipes).length,
      itemsCount: Object.keys(cached.items).length,
      nextRegularUpdate: lastUpdate ? 
        new Date(new Date(lastUpdate).getTime() + this.REGULAR_INTERVAL) : null,
      storageAvailable: this.isStorageAvailable()
    };
  }
}

export default RecipeUpdateService;

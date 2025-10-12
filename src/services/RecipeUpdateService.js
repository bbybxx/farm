import { normalizeItemRecord } from '../utils/itemImageUtils.js'

// Сервис для автоматического обновления рецептов из buddy.farm API
class RecipeUpdateService {
  constructor() {
    // Используем прокси в development и production (Vercel автоматически проксирует /api)
    this.API_URL = '/api/graphql'
    this.STORAGE_KEY = 'lastRecipeUpdate'
    this.RECIPES_KEY = 'cachedApiRecipes'
    this.ITEMS_KEY = 'cachedApiItems'
    this._intervalId = null
    this._lastSuccessfulUrl = null
    this._nativeEnvironment = this._isNativeEnvironment()
    this._fallbackPublicEndpoints = [
      'https://api.buddy.farm/graphql',
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
      }
    `
  }

  _isNativeEnvironment() {
    try {
      const globalCapacitor = typeof window !== 'undefined'
        ? window.Capacitor
        : (typeof globalThis !== 'undefined' ? globalThis.Capacitor : undefined)
      if (globalCapacitor && typeof globalCapacitor.isNativePlatform === 'function') {
        return !!globalCapacitor.isNativePlatform()
      }
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
      if (import.meta.env.DEV) {
        console.log('🔄 Обновляем рецепты из buddy.farm API...')
        console.log('🌐 Основной URL:', this.API_URL)
        console.log('🛠️ Development mode:', import.meta.env.DEV)
      }

      const urlsToTry = [...(this._lastSuccessfulUrl ? [this._lastSuccessfulUrl] : []), ...this._apiCandidates]
      let lastError = null

      for (const url of urlsToTry) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: this.query })
          })

          if (import.meta.env.DEV) {
            console.log('📡 Response status:', response.status, 'url:', url)
            console.log('📡 Response ok:', response.ok)
          }

          if (!response.ok) {
            const errorText = import.meta.env.DEV ? await response.text() : null
            const error = new Error(`HTTP error! status: ${response.status}${errorText ? `, text: ${errorText}` : ''}`)
            error.urlTried = url
            throw error
          }

          const data = await response.json()

          if (data.errors) {
            const error = new Error('GraphQL errors occurred')
            error.errors = data.errors
            error.urlTried = url
            throw error
          }

          this._lastSuccessfulUrl = url

          if (import.meta.env.DEV) {
            console.log('✅ Items received:', data.data?.items?.length || 0, 'via', url)
            console.log('🔍 First 5 items:', data.data?.items?.slice(0, 5)?.map(item => item.name) || [])
          }

          return data.data.items
        } catch (error) {
          lastError = error
          if (import.meta.env.DEV) {
            console.error('❌ Ошибка при запросе к', error.urlTried || url, ':', error)
          }
        }
      }

      if (lastError) {
        throw lastError
      }

      throw new Error('All API endpoints failed')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Ошибка при получении рецептов:', error)
      }
      throw error
    }
  }

  // Обрабатывает и сохраняет рецепты
  processAndSaveRecipes(items) {
    const recipes = {};
    const itemData = {};

    // Фильтруем только крафтимые предметы с рецептами
    const craftableItems = items.filter(item => 
      item.canCraft && 
      item.recipeItems && 
      item.recipeItems.length > 0
    );

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

    // Сохраняем в localStorage (если доступен)
    if (this.isStorageAvailable()) {
      window.localStorage.setItem(this.RECIPES_KEY, JSON.stringify(sortedRecipes));
      window.localStorage.setItem(this.ITEMS_KEY, JSON.stringify(sortedItemData));
      window.localStorage.setItem(this.STORAGE_KEY, new Date().toISOString());
    } else {
      // Сохраняем в памяти для текущей сессии
      this._sessionRecipes = sortedRecipes;
      this._sessionItems = sortedItemData;
      this._sessionUpdated = true;
    }

    if (import.meta.env.DEV) {
      console.log(`✅ Обновлено ${Object.keys(sortedRecipes).length} рецептов`);
      console.log(`✅ Обновлено ${Object.keys(sortedItemData).length} предметов`);
    }

    return { recipes: sortedRecipes, items: sortedItemData };
  }

  // Получает кэшированные рецепты
  getCachedRecipes() {
    try {
      // Если localStorage недоступен, используем данные из сессии
      if (!this.isStorageAvailable()) {
        return {
          recipes: this._sessionRecipes || {},
          items: this._sessionItems || {}
        };
      }
      
    const recipes = window.localStorage.getItem(this.RECIPES_KEY);
    const items = window.localStorage.getItem(this.ITEMS_KEY);
      
      return {
        recipes: recipes ? JSON.parse(recipes) : {},
        items: items ? JSON.parse(items) : {}
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Ошибка при чтении кэша:', error);
      }
      return { recipes: {}, items: {} };
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

      const items = await this.fetchRecipes();
      const result = this.processAndSaveRecipes(items);
      
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
        const data = await this.updateRecipes();
        if (typeof onUpdate === 'function') {
          onUpdate(data);
        }
      } catch (error) {
        if (typeof onUpdate === 'function') {
          onUpdate(this.getCachedRecipes());
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

    if (import.meta.env.DEV) {
      console.log('🚀 Автообновление рецептов запущено');
    }

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

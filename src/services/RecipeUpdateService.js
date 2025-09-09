// Сервис для автоматического обновления рецептов из buddy.farm API
class RecipeUpdateService {
  constructor() {
    // Используем прокси в development и production (Vercel автоматически проксирует /api)
    // Но в нативных сборках (Capacitor / file://) относительные пути не работают —
    // переключаемся на явный полный URL. Можно задать VITE_API_BASE в окружении.
    const envBase = import.meta.env.VITE_API_BASE || null;
    const runningOnFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
    const isCapacitor = typeof window !== 'undefined' && (!!window.Capacitor || !!window.android);
    // Safe fallback: if VITE_API_BASE is not provided for native builds, try known public host
    const FALLBACK_PUBLIC_BASES = [
      'https://craft-calculator.com',
      'https://farmcraftcalculator.infy.uk'
    ];

    if (envBase && (runningOnFileProtocol || isCapacitor)) {
      this.API_URL = envBase.replace(/\/$/, '') + '/api/graphql';
    } else if (!envBase && (runningOnFileProtocol || isCapacitor)) {
      // pick first reachable fallback at runtime (optimistic). We still attempt a relative path if nothing available.
      this.API_URL = FALLBACK_PUBLIC_BASES[0] + '/api/graphql';
    } else {
      this.API_URL = '/api/graphql';
    }
    this.STORAGE_KEY = 'lastRecipeUpdate';
    this.RECIPES_KEY = 'cachedApiRecipes';
    this.ITEMS_KEY = 'cachedApiItems';
    
    // Интервалы обновления (в миллисекундах)
    this.REGULAR_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 дня
    this.MONTHLY_INTERVAL = 1 * 24 * 60 * 60 * 1000; // 1 день в месяце (первое число)
    
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
    `;
  }

  // Проверяет доступность localStorage
  isStorageAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
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
    
    const lastUpdate = localStorage.getItem(this.STORAGE_KEY);
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
        console.log('🔄 Обновляем рецепты из buddy.farm API...');
  console.log('🌐 Используемый URL:', this.API_URL);
        console.log('🛠️ Development mode:', import.meta.env.DEV);
      }
      
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: this.query })
      });

      if (import.meta.env.DEV) {
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
      }

      if (!response.ok) {
        if (import.meta.env.DEV) {
          const errorText = await response.text();
          console.error('❌ Response error text:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (import.meta.env.DEV) {
        console.log('📊 Raw response data:', data);
      }
      
      if (data.errors) {
        if (import.meta.env.DEV) {
          console.error('❌ Ошибки GraphQL:', data.errors);
        }
        throw new Error('GraphQL errors occurred');
      }

      if (import.meta.env.DEV) {
        console.log('✅ Items received:', data.data?.items?.length || 0);
        console.log('🔍 First 5 items:', data.data?.items?.slice(0, 5)?.map(item => item.name) || []);
      }

      return data.data.items;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Ошибка при получении рецептов:', error);
      }
      throw error;
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
      itemData[item.name] = {
        name: item.name,
        type: item.type || 'item',
        image: item.image,
        canCraft: item.canCraft,
        craftingLevel: item.craftingLevel
      };
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
      if (allItemNames.has(item.name) && !itemData[item.name]) {
        itemData[item.name] = {
          name: item.name,
          type: item.type || 'item',
          image: item.image,
          canCraft: item.canCraft,
          craftingLevel: item.craftingLevel
        };
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
      localStorage.setItem(this.RECIPES_KEY, JSON.stringify(sortedRecipes));
      localStorage.setItem(this.ITEMS_KEY, JSON.stringify(sortedItemData));
      localStorage.setItem(this.STORAGE_KEY, new Date().toISOString());
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

    return { recipes: sortedRecipes, itemData: sortedItemData };
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
      
      const recipes = localStorage.getItem(this.RECIPES_KEY);
      const items = localStorage.getItem(this.ITEMS_KEY);
      
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
  startAutoUpdate() {
    // Проверяем при запуске
    this.updateRecipes();

    // Устанавливаем интервал проверки каждый час
    setInterval(() => {
      if (this.shouldUpdate()) {
        this.updateRecipes();
      }
    }, 60 * 60 * 1000); // Проверяем каждый час

    if (import.meta.env.DEV) {
      console.log('🚀 Автообновление рецептов запущено');
    }
  }

  // Принудительное обновление
  async forceUpdate() {
    if (this.isStorageAvailable()) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      this._sessionUpdated = false;
    }
    return await this.updateRecipes();
  }

  // Получает информацию о последнем обновлении
  getUpdateInfo() {
    let lastUpdate = null;
    
    if (this.isStorageAvailable()) {
      lastUpdate = localStorage.getItem(this.STORAGE_KEY);
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

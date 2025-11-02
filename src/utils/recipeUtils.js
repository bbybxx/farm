// Утилиты для работы с API рецептами
import recipesAPI from '../data/recipes-api.json' with { type: 'json' };
import itemsAPI from '../data/items-api.json' with { type: 'json' };
import RecipeUpdateService from '../services/RecipeUpdateService.js';
import { sortItemsAlphabetically } from './sortingUtils.js';

// Создаем экземпляр сервиса обновлений
const updateService = new RecipeUpdateService();

/**
 * Объединяет локальные и API рецепты с учетом кэшированных данных
 */
export function getCombinedRecipes() {
  // Получаем кэшированные рецепты из сервиса
  const cached = updateService.getCachedRecipes();
  
  // Используем только API данные (приоритет кэш > статические API данные)
  const unsorted = {
    ...recipesAPI,
    ...cached.recipes
  };
  
  // Сортируем все рецепты по алфавиту (английская локаль для FarmRPG)
  const sorted = {};
  const keys = Object.keys(unsorted).sort((a, b) => {
    return a.localeCompare(b, 'en', { 
      sensitivity: 'base',
      numeric: true,
      ignorePunctuation: true 
    });
  });
  
  keys.forEach(key => {
    sorted[key] = unsorted[key];
  });
  
  return sorted;
}

/**
 * Получает информацию о предмете из API или локальных данных
 */
export function getItemInfo(itemName) {
  // Получаем кэшированные данные предметов
  const cached = updateService.getCachedRecipes();
  
  // Сначала проверяем кэшированные данные
  if (cached.items[itemName]) {
    return {
      name: itemName,
      type: cached.items[itemName].type,
      image: cached.items[itemName].image,
      canCraft: cached.items[itemName].canCraft,
      craftingLevel: cached.items[itemName].craftingLevel
    };
  }
  
  // Затем проверяем статические API данные
  if (itemsAPI[itemName]) {
    return {
      name: itemName,
      type: itemsAPI[itemName].type,
      image: itemsAPI[itemName].image,
      canCraft: itemsAPI[itemName].canCraft,
      craftingLevel: itemsAPI[itemName].craftingLevel
    };
  }
  
  // Если нет в API, возвращаем базовую информацию
  return {
    name: itemName,
    type: 'item',
    image: null,
    canCraft: false,
    craftingLevel: 1
  };
}

/**
 * Получает все доступные предметы для крафта
 */
export function getAllCraftableItems() {
  const combined = getCombinedRecipes();
  
  const items = Object.keys(combined).map(itemName => ({
    ...getItemInfo(itemName),
    ...combined[itemName]
  }));
  
  // Принудительная алфавитная сортировка
  const sorted = sortItemsAlphabetically(items);
  
  return sorted;
}

/**
 * Проверяет, есть ли рецепт для предмета
 */
export function hasRecipe(itemName) {
  const combined = getCombinedRecipes();
  return itemName in combined;
}

/**
 * Получает рецепт для предмета
 */
export function getRecipe(itemName) {
  const combined = getCombinedRecipes();
  return combined[itemName] || null;
}

/**
 * Получает все уникальные ингредиенты из всех рецептов
 */
export function getAllIngredients() {
  const combined = getCombinedRecipes();
  const ingredients = new Set();
  
  Object.values(combined).forEach(recipe => {
    Object.keys(recipe.ingredients || {}).forEach(ingredient => {
      ingredients.add(ingredient);
    });
  });
  
  return Array.from(ingredients).sort();
}

/**
 * Находит все рецепты, которые используют данный предмет как ингредиент
 */
export function findRecipesThatUse(itemName) {
  const combined = getCombinedRecipes();
  const recipes = [];
  
  Object.entries(combined).forEach(([recipeName, recipe]) => {
    if (recipe.ingredients && recipe.ingredients[itemName]) {
      recipes.push({
        name: recipeName,
        quantity: recipe.ingredients[itemName],
        ...getItemInfo(recipeName)
      });
    }
  });
  
  return recipes.sort((a, b) => a.name.localeCompare(b.name));
}

export default {
  getCombinedRecipes,
  getItemInfo,
  getAllCraftableItems,
  hasRecipe,
  getRecipe,
  getAllIngredients,
  findRecipesThatUse,
  updateService
};

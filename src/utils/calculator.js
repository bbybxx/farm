import { getCombinedRecipes } from './recipeUtils.js';

/**
 * Calculate the total resource saving percentage from perks
 */
export function getResourceSaverPercent(activePerks) {
  let total = 0;
  if (activePerks?.includes('Resource Saver I')) total += 0.10;
  if (activePerks?.includes('Resource Saver II')) total += 0.15;
  if (activePerks?.includes('Resource Saver III')) total += 0.20;
  return total;
}

/**
 * Calculate the total silver discount percentage from perks
 */
export function getSilverDiscountPercent(activePerks) {
  let total = 0;
  if (activePerks?.includes('Artisan I')) total += 0.05;
  if (activePerks?.includes('Artisan II')) total += 0.10;
  if (activePerks?.includes('Artisan III')) total += 0.15;
  if (activePerks?.includes('Artisan IV')) total += 0.20;
  if (activePerks?.includes('Toolbox I')) total += 0.10;
  if (activePerks?.includes('Steady Hands')) total += 0.10;
  return Math.min(total, 1.0); // Cap at 100%
}

/**
 * Calculate the total XP bonus percentage from perks
 */
export function getXPBonusPercent(activePerks) {
  let total = 0;
  if (activePerks?.includes('Crafting Primer')) total += 0.10;
  if (activePerks?.includes('Crafting Primer II')) total += 0.10;
  if (activePerks?.includes('Crafting Almanac')) total += 0.10;
  return Math.min(total, 1.0); // Cap at 100%
}

/**
 * Helper function to get ingredients from a recipe (supports both old and new formats)
 */
function getRecipeIngredients(recipe) {
  if (!recipe) return null;
  
  // Новый формат (API)
  if (recipe.ingredients) {
    return recipe.ingredients;
  }
  // Старый формат (локальные рецепты)
  if (recipe.из) {
    return recipe.из;
  }
  return null;
}

/**
 * A new, robust function to calculate all resources needed for crafting.
 * This version includes cycle detection to prevent infinite recursion.
 */
export function calculateAllResources(itemName, amount, activePerks, recipes = null) {
  // Если рецепты не переданы, используем объединенные рецепты
  if (!recipes) {
    recipes = getCombinedRecipes();
  }
  const resourceSaverPercent = getResourceSaverPercent(activePerks);
  const silverDiscount = getSilverDiscountPercent(activePerks);
  const xpBonus = getXPBonusPercent(activePerks);

  const totals = {
    base: {},
    intermediate: {},
    silver: 0,
    xp: 0,
  };

  const memo = {}; // Memoization cache

  function getMaterials(item, qty, path = []) {
    // Cycle detection
    if (path.includes(item)) {
      return {};
    }

    const recipe = recipes[item];

    // If it's a base material (no recipe), it's its own material.
    const ingredients = getRecipeIngredients(recipe);
    if (!recipe || !ingredients) {
      return { [item]: qty };
    }
    
    // If we have calculated this intermediate item before, we can scale the result
    if (memo[item]) {
        const materials = {};
        for (const [mat, perOneQty] of Object.entries(memo[item].materials)) {
            materials[mat] = (materials[mat] || 0) + perOneQty * qty;
        }
        totals.intermediate[item] = (totals.intermediate[item] || 0) + qty;
        totals.silver += memo[item].silverPerOne * qty;
        totals.xp += memo[item].xpPerOne * qty;
        return materials;
    }


    // It's a new intermediate item.
    const currentItemMaterials = {};
    let silverPerOne = 0;
    let xpPerOne = 0;

    if (recipe.Silver) {
      silverPerOne = Math.ceil(recipe.Silver * (1 - silverDiscount));
    }
    const xpAmount = recipe.XP || recipe['Crafting XP'] || 0;
    if (xpAmount > 0) {
      xpPerOne = Math.ceil(xpAmount * (1 + xpBonus));
    }

    // Recursively find materials for each component.
    for (const [component, componentQty] of Object.entries(ingredients)) {
      const subMaterials = getMaterials(component, componentQty, [...path, item]);
      for (const [subMat, subQty] of Object.entries(subMaterials)) {
        currentItemMaterials[subMat] = (currentItemMaterials[subMat] || 0) + subQty;
      }
    }
    
    // Cache the result for 1 unit of the item
    memo[item] = {
        materials: currentItemMaterials,
        silverPerOne,
        xpPerOne
    };

    // Add to totals for the current call
    totals.intermediate[item] = (totals.intermediate[item] || 0) + qty;
    totals.silver += silverPerOne * qty;
    totals.xp += xpPerOne * qty;

    const finalMaterials = {};
    for(const [mat, matQty] of Object.entries(currentItemMaterials)) {
        finalMaterials[mat] = matQty * qty;
    }

    return finalMaterials;
  }

  const topRecipe = recipes[itemName];
  if (!topRecipe) return totals;

  // Calculate costs for the top-level item itself
  if (topRecipe.Silver) {
    totals.silver += Math.ceil(topRecipe.Silver * (1 - silverDiscount)) * amount;
  }
  const topXpAmount = topRecipe.XP || topRecipe['Crafting XP'] || 0;
  if (topXpAmount > 0) {
    totals.xp += Math.ceil(topXpAmount * (1 + xpBonus)) * amount;
  }

  // Calculate required components for the top-level item, applying resource saver
  const topIngredients = getRecipeIngredients(topRecipe);
  if (topIngredients) {
    for (const [component, componentQty] of Object.entries(topIngredients)) {
      let neededQty = componentQty * amount;
      if (resourceSaverPercent > 0) {
        neededQty /= (1 + resourceSaverPercent);
      }
      
      const materials = getMaterials(component, Math.ceil(neededQty));
      
      for (const [mat, qty] of Object.entries(materials)) {
        totals.base[mat] = (totals.base[mat] || 0) + qty;
      }
    }
  }

  // Clean up: remove any base materials that are also listed as intermediate
  for (const key in totals.base) {
    if (totals.intermediate[key]) {
      delete totals.intermediate[key];
    }
  }
  
  // Round final values
  for (const key in totals.base) {
    totals.base[key] = Math.ceil(totals.base[key]);
  }

  return totals;
}

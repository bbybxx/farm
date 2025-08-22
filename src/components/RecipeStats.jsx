import { useState, useEffect } from 'react';
import { getAllCraftableItems, getCombinedRecipes } from '../utils/recipeUtils';
import './RecipeStats.css';

function RecipeStats() {
  const [stats, setStats] = useState({
    totalRecipes: 0,
    apiRecipes: 0,
    localRecipes: 0,
    maxLevel: 0
  });

  useEffect(() => {
    try {
      const craftableItems = getAllCraftableItems();
      const combinedRecipes = getCombinedRecipes();
      
      // Подсчитываем API рецепты (те, которые имеют поле ingredients)
      const apiCount = Object.values(combinedRecipes).filter(recipe => recipe.ingredients).length;
      // Локальные рецепты (те, которые имеют поле из)
      const localCount = Object.values(combinedRecipes).filter(recipe => recipe.из).length;
      
      // Находим максимальный уровень
      const maxLevel = Math.max(...craftableItems.map(item => item.craftingLevel || 1));

      setStats({
        totalRecipes: Object.keys(combinedRecipes).length,
        apiRecipes: apiCount,
        localRecipes: localCount,
        maxLevel
      });
    } catch (error) {
      console.error('Ошибка при загрузке статистики рецептов:', error);
    }
  }, []);

  return (
    <div className="recipe-stats">
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{stats.totalRecipes}</span>
          <span className="stat-label">Всего рецептов</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.apiRecipes}</span>
          <span className="stat-label">Из API</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.localRecipes}</span>
          <span className="stat-label">Локальных</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.maxLevel}</span>
          <span className="stat-label">Макс. уровень</span>
        </div>
      </div>
    </div>
  );
}

export default RecipeStats;

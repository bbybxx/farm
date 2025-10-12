import { useState, useEffect, useRef } from 'react';
import { calculateAllResources } from '../utils/calculator';
import { getAllCraftableItems, getCombinedRecipes } from '../utils/recipeUtils';
import { sortItemsAlphabetically } from '../utils/sortingUtils';
import PerksSidebar from './PerksSidebar';
import ItemDisplay from './ItemDisplay';
import itemsAPI from '../data/items-api.json' with { type: 'json' };
import './CalculatorForm.css';

function CalculatorForm({ onCalculate }) {
  console.log('🚀 CalculatorForm: Компонент рендерится');
  
  const [recipes, setRecipes] = useState({});
  const [perks, setPerks] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPerks, setSelectedPerks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Refs for dropdown handling
  const dropdownRef = useRef(null);
  const selectedItemRef = useRef(null);

  // Helper function to get primary ingredients (only direct components)
  const getPrimaryIngredients = (itemName, recipes) => {
    const recipe = recipes[itemName];
    if (!recipe || !recipe.ingredients) return [];
    return Object.keys(recipe.ingredients);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const perksModule = await import('../data/perks.json');
        const loadedPerks = perksModule.default || [];

        // Получаем объединенные рецепты и все крафтимые предметы
        const loadedRecipes = getCombinedRecipes();
        const craftableItems = getAllCraftableItems();

        // Получаем названия и принудительно сортируем их
        const itemNames = sortItemsAlphabetically(craftableItems.map(item => item.name));

        // Group perks by their effects
        const groupedPerks = loadedPerks.reduce((groups, perk) => {
          let group = 'Other';
          if (perk.includes('Resource Saver')) group = 'Resource Saver';
          else if (perk.includes('Artisan') || perk.includes('Toolbox') || perk.includes('Steady Hands')) group = 'Silver Discount';
          else if (perk.includes('Crafting Primer') || perk.includes('Crafting Almanac')) group = 'XP Bonus';
          
          if (!groups[group]) groups[group] = [];
          groups[group].push(perk);
          return groups;
        }, {});

        // Sort perks within each group
        Object.values(groupedPerks).forEach(perks => perks.sort());

        setRecipes(loadedRecipes);
        setPerks(Object.entries(groupedPerks));
        setItems(itemNames);
        setFilteredItems([]); // Изначально dropdown пустой
        if (itemNames.length > 0) {
          setSelectedItemName(itemNames[0]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        selectedItemRef.current && 
        !selectedItemRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Remove event listener on cleanup
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Обработчик отправки формы
  const handleSubmit = (e) => {
    e.preventDefault();

    // Use default amount of 1 if field is empty
    const calculationAmount = amount === '' ? 1 : Number(amount);

    // Рассчитываем все ресурсы
    const allResources = calculateAllResources(selectedItemName, calculationAmount, selectedPerks, recipes);

    console.log(`CalculatorForm - Рассчитанные ресурсы:`, allResources);

    // Передаем все данные в App.js
    onCalculate({
      targetItem: selectedItemName,
      result: {
        base: allResources.base,
        silver: allResources.silver,
        xp: allResources.xp
      },
      recipes: recipes,
      activePerks: selectedPerks,
      amount: calculationAmount,
      intermediateResources: allResources.intermediate
    });
  };

  // Обработчик изменения состояния чекбоксов перков
  const handlePerkChange = (perk) => {
    setSelectedPerks((prevSelectedPerks) =>
      prevSelectedPerks.includes(perk)
        ? prevSelectedPerks.filter((p) => p !== perk)
        : [...prevSelectedPerks, perk]
    );
  };

  // Обработчик изменения поискового запроса
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Filter items based on search query
    if (query.trim() === '') {
      setFilteredItems([]);
      setIsDropdownOpen(false);
    } else {
      const queryLower = query.toLowerCase();
      
      // Filter items by name or primary ingredients
      const filtered = items
        .filter(item => {
          // Direct name match
          if (item.toLowerCase().includes(queryLower)) return true;
          
          // Check primary ingredients only
          const primaryIngredients = getPrimaryIngredients(item, recipes);
          return primaryIngredients.some(ingredient => 
            ingredient.toLowerCase().includes(queryLower)
          );
        });
      
      // Принудительная сортировка результатов поиска
      const sortedFiltered = sortItemsAlphabetically(filtered).slice(0, 50);
      
      setFilteredItems(sortedFiltered);
      setIsDropdownOpen(sortedFiltered.length > 0);
    }
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    setSelectedItemName(item);
    setIsDropdownOpen(false);
  };

  // Toggle dropdown
  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  if (isLoading) {
    return <div>Loading data...</div>;
  }

  return (
    <div className="calculator-container">
      <form onSubmit={handleSubmit} className="calculator-form">
        <div className="form-group">
          <label>Item to craft:</label>
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search items..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <div className="custom-select">
            <div 
              className="selected-item"
              onClick={() => {
                if (selectedItemName) {
                  if (!isDropdownOpen) {
                    // При открытии dropdown показываем все предметы с принудительной сортировкой
                    const sortedItems = sortItemsAlphabetically(items);
                    setFilteredItems(sortedItems);
                  }
                  setIsDropdownOpen(!isDropdownOpen);
                }
              }}
            >
              {selectedItemName ? (
                <ItemDisplay itemName={selectedItemName} itemsData={itemsAPI} />
              ) : (
                'Select an item'
              )}
            </div>
            {isDropdownOpen && (
              <div className="dropdown-list" ref={dropdownRef}>
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <div 
                      key={item} 
                      className="dropdown-item"
                      onClick={() => handleItemSelect(item)}
                    >
                      <ItemDisplay itemName={item} itemsData={itemsAPI} />
                    </div>
                  ))
                ) : (
                  searchQuery.trim() !== '' && (
                    <div className="dropdown-item no-results">No items found</div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
        <div className="form-group">
          <label>Amount:</label>
          <input
            className="form-control"
            type="number"
            value={amount}
            min="1"
            placeholder="Enter amount (default: 1)"
            onChange={(e) => {
              // Allow empty string or numbers >= 1
              const newValue = e.target.value;
              if (newValue === '' || Number(newValue) >= 1) {
                setAmount(newValue);
              }
            }}
          />
        </div>
        <button type="submit" className="calculate-button" disabled={!selectedItemName}>
          Calculate
        </button>
      </form>
      <PerksSidebar
        perks={perks}
        selectedPerks={selectedPerks}
        onPerkChange={handlePerkChange}
      />
    </div>
  );
}

export default CalculatorForm;
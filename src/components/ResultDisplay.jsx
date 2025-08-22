import React, { useState, useEffect } from 'react';
import { getResourceYieldBonus, getSilverDiscountPercent, getXPBonusPercent } from '../utils/calculator';
import './ResultDisplay.css';

// Компонент для отображения отдельного ресурса и его компонентов
function ResourceItem({ name, quantity, recipes, activePerks, level = 0, isTargetItem = false, onPin, isPinned, pinnedResources, colorClass = 'color-0' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const recipe = recipes[name];
  const isCraftable = recipe && recipe.из;
  
  // Calculate yield bonus only for target item
  const yieldBonus = isTargetItem ? getResourceYieldBonus(activePerks) : 0;
  const effectiveQuantity = isTargetItem && yieldBonus > 0 ? 
    Math.ceil(quantity * (1 + yieldBonus)) : 
    quantity;

  // Generate a new color class for the next level
  const nextColorClass = isTargetItem ? 'color-0' : colorClass;
  
  // Generate a new color for sub-components if this is craftable
  const subComponentColorClass = isCraftable ? 
    `color-${(parseInt(colorClass.split('-')[1]) + 1) % 6}` : 
    colorClass;

  const handleClick = () => {
    if (isCraftable) {
      setIsExpanded(!isExpanded);
    }
  };

  const handlePin = (e) => {
    e.stopPropagation();
    onPin(name, effectiveQuantity);
  };

  return (
    <div className="resource-tree-item">
      <div 
        className={`resource-header ${isCraftable ? 'craftable' : ''} ${isPinned ? 'pinned' : ''} ${nextColorClass}`}
        onClick={handleClick}
      >
        {isCraftable && (
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        )}
        <span className="resource-name">{name}:</span>
        <span className="resource-quantity">{Math.ceil(effectiveQuantity)}</span>
        {isTargetItem && yieldBonus > 0 && (
          <span className="resource-bonus">(+{(yieldBonus * 100).toFixed(0)}%)</span>
        )}
        {!isTargetItem && (
          <button 
            className={`pin-button ${isPinned ? 'pinned' : ''}`} 
            onClick={handlePin}
            title={isPinned ? 'Unpin resource' : 'Pin resource'}
          >
            📌
          </button>
        )}
      </div>
      {isExpanded && isCraftable && (
        <div className="resource-components">
          {Object.entries(recipe.из).map(([component, componentQty]) => (
            <ResourceItem
              key={component}
              name={component}
              quantity={componentQty * quantity}
              recipes={recipes}
              activePerks={activePerks}
              level={level + 1}
              isTargetItem={false}
              onPin={onPin}
              isPinned={pinnedResources.some(r => r.name === component)}
              pinnedResources={pinnedResources}
              colorClass={subComponentColorClass}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultDisplay({ calculationResult }) {
  const { targetItem, result, activePerks, amount, recipes, intermediateResources } = calculationResult;
  const [pinnedResources, setPinnedResources] = useState([]);

  // Update pinned resources when perks or amount changes
  useEffect(() => {
    if (!result || !result.base) return;

    setPinnedResources(prevPinned => {
      return prevPinned.map(resource => {
        let newQuantity;

        // Check if it's in base resources
        if (result.base[resource.name]) {
          newQuantity = result.base[resource.name];
        }
        // Check if it's in intermediate resources
        else if (intermediateResources && intermediateResources[resource.name]) {
          newQuantity = intermediateResources[resource.name];
        }
        // If not found in current results, keep the original quantity
        else {
          newQuantity = resource.baseQuantity;
        }

        return {
          ...resource,
          baseQuantity: resource.baseQuantity,
          quantity: newQuantity
        };
      });
    });
  }, [result, intermediateResources]);

  // Get all perk effects
  const silverDiscount = getSilverDiscountPercent(activePerks);
  const xpBonus = getXPBonusPercent(activePerks);
  
  if (!targetItem || !result || Object.keys(result).length === 0) {
    return <div>Select an item and amount to craft</div>;
  }

  const handlePinResource = (name, quantity) => {
    setPinnedResources(prev => {
      const existingIndex = prev.findIndex(r => r.name === name);
      if (existingIndex >= 0) {
        return prev.filter(r => r.name !== name);
      } else {
        // Check if it's a base or intermediate resource
        const isBase = result.base && result.base[name];
        const isIntermediate = intermediateResources && intermediateResources[name];
        const actualQuantity = isBase ? result.base[name] : 
                              (isIntermediate && intermediateResources) ? intermediateResources[name] : 
                              quantity;

        return [...prev, { 
          name, 
          quantity: actualQuantity,
          baseQuantity: actualQuantity
        }];
      }
    });
  };

  return (
    <div className="result-display">
      <h3>Calculation results for {targetItem} (x{amount})</h3>

      {/* Закрепленные ресурсы */}
      {pinnedResources.length > 0 && (
        <div className="info-block pinned-resources">
          <h4>Pinned Resources:</h4>
          <ul className="pinned-list">
            {pinnedResources.map(({ name, quantity }) => (
              <li key={name}>
                <span className="resource-name">
                  {name}:
                </span>
                <span className="resource-quantity">{quantity}</span>
                <button 
                  className="pin-button pinned" 
                  onClick={() => handlePinResource(name, quantity)}
                  title="Unpin resource"
                >
                  📌
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Стоимость и опыт */}
      {(result.silver > 0 || result.xp > 0) && (
        <div className="info-block cost-section">
          <h4>Cost and Experience:</h4>
          <ul className="cost-list">
            {result.silver > 0 && (
              <li>
                <span className="cost-label">Silver:</span>
                <span className="cost-value">{result.silver}</span>
                {silverDiscount > 0 && <span className="cost-bonus">(-{(silverDiscount * 100).toFixed(0)}%)</span>}
              </li>
            )}
            {result.xp > 0 && (
              <li>
                <span className="cost-label">Experience:</span>
                <span className="cost-value">{result.xp}</span>
                {xpBonus > 0 && <span className="cost-bonus">(+{(xpBonus * 100).toFixed(0)}%)</span>}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Основные компоненты */}
      <div className="info-block resource-tree">
        <h4>Required Resources:</h4>
        <ResourceItem
          name={targetItem}
          quantity={amount}
          recipes={recipes}
          activePerks={activePerks}
          isTargetItem={true}
          onPin={handlePinResource}
          isPinned={pinnedResources.some(r => r.name === targetItem)}
          pinnedResources={pinnedResources}
          colorClass="color-0"
        />
      </div>

      {/* Информация о перках */}
      {(getResourceYieldBonus(activePerks) > 0 || silverDiscount > 0 || xpBonus > 0) && (
        <div className="info-block perks-section">
          <h4>Active Effects:</h4>
          <ul className="perks-list">
            {getResourceYieldBonus(activePerks) > 0 && (
              <li>Resource Yield Bonus: +{(getResourceYieldBonus(activePerks) * 100).toFixed(0)}%</li>
            )}
            {silverDiscount > 0 && (
              <li>Silver Discount: {(silverDiscount * 100).toFixed(0)}%</li>
            )}
            {xpBonus > 0 && (
              <li>XP Bonus: +{(xpBonus * 100).toFixed(0)}%</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ResultDisplay;

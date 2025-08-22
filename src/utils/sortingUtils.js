// Универсальная функция сортировки для всех списков предметов
export function sortItemsAlphabetically(items) {
  if (!items || !Array.isArray(items)) {
    return [];
  }
  
  // Если это массив строк (названий)
  if (typeof items[0] === 'string') {
    return [...items].sort((a, b) => {
      return a.localeCompare(b, 'en', { 
        sensitivity: 'base',
        numeric: true,
        ignorePunctuation: true
      });
    });
  }
  
  // Если это массив объектов с полем name
  return [...items].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, 'en', { 
      sensitivity: 'base',
      numeric: true,
      ignorePunctuation: true
    });
  });
}

// Принудительная сортировка ключей объекта
export function getSortedKeysFromObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  
  return Object.keys(obj).sort((a, b) => {
    return a.localeCompare(b, 'en', { 
      sensitivity: 'base',
      numeric: true,
      ignorePunctuation: true
    });
  });
}

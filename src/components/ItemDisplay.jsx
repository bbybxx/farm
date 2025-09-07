import React from 'react';

const ItemDisplay = ({ itemName, itemsData, children }) => {
  const item = itemsData[itemName];

  if (!item) {
    return <span>{itemName}{children}</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img
        src={item.image}
        alt={item.name}
        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
        onError={(e) => {
          e.target.src = '/img/placeholder.svg';
        }}
      />
      <span style={{ fontSize: '14px' }}>{item.name}</span>
      {children}
    </div>
  );
};

export default ItemDisplay;

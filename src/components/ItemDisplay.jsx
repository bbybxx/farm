import React, { useEffect, useMemo, useState, memo } from 'react';

const PLACEHOLDER_SRC = '/img/placeholder.svg';

// Static styles to avoid creating new objects on each render
const containerStyle = { display: 'flex', alignItems: 'center', gap: '8px' };
const imageBaseStyle = { width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 };
const imageClickableStyle = { ...imageBaseStyle, cursor: 'pointer' };
const linkStyle = { display: 'flex', lineHeight: 0 };
const nameContainerStyle = { fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', minWidth: 0 };

const buildImageSources = (item) => {
  if (!item) return [];

  const sourcesFromRecord = Array.isArray(item.imageSources) ? item.imageSources : [];
  if (sourcesFromRecord.length > 0) {
    return sourcesFromRecord;
  }

  const candidates = [item.image, item.imageFallback, item.imageRemote, item.imageLocal];
  const deduped = [];
  candidates.forEach((candidate) => {
    if (candidate && !deduped.includes(candidate)) {
      deduped.push(candidate);
    }
  });
  return deduped;
};

// Generate buddy.farm URL from item name
const getBuddyFarmUrl = (name) => {
  if (!name) return null;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return `https://buddy.farm/i/${slug}/`;
};

const ItemDisplay = memo(function ItemDisplay({ itemName, itemsData = {}, children, enableBuddyFarmLinks = false }) {
  // Special handling for Silver (currency, not an item)
  if (itemName === 'Silver') {
    return (
      <div style={containerStyle}>
        <img
          src="/img/items/silver.png"
          alt="Silver"
          title="Silver"
          style={imageBaseStyle}
          loading="lazy"
        />
        <span style={{ fontSize: '14px' }}>Silver</span>
        {children}
      </div>
    );
  }

  const item = itemsData[itemName];
  const sources = useMemo(
    () => buildImageSources(item), 
    [item?.image, item?.imageFallback, item?.imageRemote, item?.imageLocal]
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [itemName, sources.length]);

  if (!item) {
    return <span>{itemName}{children}</span>;
  }

  const currentSrc = sourceIndex >= 0 && sourceIndex < sources.length
    ? sources[sourceIndex]
    : PLACEHOLDER_SRC;

  const handleImageError = () => {
    setSourceIndex((prev) => {
      const nextIndex = prev + 1;
      return nextIndex < sources.length ? nextIndex : -1;
    });
  };

  const buddyFarmUrl = enableBuddyFarmLinks ? getBuddyFarmUrl(item.name) : null;

  const imageElement = (
    <img
      key={`${itemName}-${sourceIndex}`}
      src={currentSrc || PLACEHOLDER_SRC}
      alt={item.name}
      title={item.name}
      style={enableBuddyFarmLinks ? imageClickableStyle : imageBaseStyle}
      loading="lazy"
      onError={handleImageError}
    />
  );

  return (
    <div style={containerStyle}>
      {enableBuddyFarmLinks && buddyFarmUrl ? (
        <a 
          href={buddyFarmUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={linkStyle}
          title={`Open ${item.name} on buddy.farm`}
          onClick={(e) => e.stopPropagation()}
        >
          {imageElement}
        </a>
      ) : (
        imageElement
      )}
      <span style={nameContainerStyle}>
        <span>{item.name}</span>
        {children}
      </span>
    </div>
  );
});

export default ItemDisplay;

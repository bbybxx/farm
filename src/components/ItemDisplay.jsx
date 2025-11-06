import React, { useEffect, useMemo, useState } from 'react';

const PLACEHOLDER_SRC = '/img/placeholder.svg';

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

const ItemDisplay = ({ itemName, itemsData = {}, children, enableBuddyFarmLinks = false }) => {
  // Special handling for Silver (currency, not an item)
  if (itemName === 'Silver') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src="/img/items/silver.png"
          alt="Silver"
          title="Silver"
          style={{ width: '24px', height: '24px', objectFit: 'contain' }}
          loading="lazy"
        />
        <span style={{ fontSize: '14px' }}>Silver</span>
        {children}
      </div>
    );
  }

  const item = itemsData[itemName];
  const sources = useMemo(() => buildImageSources(item), [item]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [itemName, sources.length, item?.image, item?.imageFallback, item?.imageRemote, item?.imageLocal]);

  if (!item) {
    return <span>{itemName}{children}</span>;
  }

  const currentSrc = sourceIndex >= 0 && sourceIndex < sources.length
    ? sources[sourceIndex]
    : PLACEHOLDER_SRC;

  const handleImageError = () => {
    setSourceIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex < sources.length) {
        return nextIndex;
      }
      return -1;
    });
  };

  // Generate buddy.farm URL from item name
  const getBuddyFarmUrl = (name) => {
    if (!name) return null;
    // Convert item name to URL slug: lowercase, replace spaces with hyphens
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://buddy.farm/i/${slug}/`;
  };

  const buddyFarmUrl = enableBuddyFarmLinks ? getBuddyFarmUrl(item.name) : null;

  const imageElement = (
    <img
      key={`${itemName}-img-${currentSrc}`}
      src={currentSrc || PLACEHOLDER_SRC}
      alt={item.name}
      title={item.name}
      style={{ 
        width: '24px', 
        height: '24px', 
        objectFit: 'contain', 
        flexShrink: 0,
        cursor: enableBuddyFarmLinks ? 'pointer' : 'default'
      }}
      loading="lazy"
      onError={handleImageError}
    />
  );

  const handleLinkClick = (e) => {
    // Prevent event from bubbling up to parent handlers (craft chain navigation)
    e.stopPropagation();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {enableBuddyFarmLinks && buddyFarmUrl ? (
        <a 
          href={buddyFarmUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', lineHeight: 0 }}
          title={`Open ${item.name} on buddy.farm`}
          onClick={handleLinkClick}
        >
          {imageElement}
        </a>
      ) : (
        imageElement
      )}
      <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
        <span>{item.name}</span>
        {children}
      </span>
    </div>
  );
};

export default ItemDisplay;

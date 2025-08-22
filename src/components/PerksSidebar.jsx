import React, { useState } from 'react';
import './PerksSidebar.css';

function PerksSidebar({ perks, selectedPerks, onPerkChange }) {
  const [isActive, setIsActive] = useState(false);

  const toggleSidebar = () => {
    setIsActive(!isActive);
  };

  return (
    <>
      <button className="perks-toggle" onClick={toggleSidebar} title="Toggle perks">
        ☰
      </button>
    <div className={`perks-sidebar ${isActive ? 'active' : ''}`}>
      <div className="perks-sidebar-content">
        <button className="perks-close" onClick={toggleSidebar}>&times;</button>
        <h3>Perks</h3>
        <div className="perks-list">
          {perks.length > 0 ? perks.map(([group, groupPerks]) => (
            <div key={group} className="perk-group">
              <h4 className="perk-group-title">{group}</h4>
              {groupPerks.map((perk) => (
                <div key={perk} className="perk-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedPerks.includes(perk)}
                      onChange={() => onPerkChange(perk)}
                    />
                    {perk}
                  </label>
                </div>
              ))}
            </div>
          )) : (
            <p>No perks available</p>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default PerksSidebar;

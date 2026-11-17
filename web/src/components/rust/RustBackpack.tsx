import Icon from './Icon';
import { faSuitcase } from '@fortawesome/free-solid-svg-icons';
import React, { useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { Items } from '../../store/items';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import InventorySlot from '../inventory/InventorySlot';
import { bagBase } from './PlayerInventory';

/**
 * Ranuras de la mochila puesta (columna derecha, encima del suelo). Siempre abierta.
 * Son los slots del jugador que pasan del slot Mochila (base); sin mochila no hay ninguno y no se muestra.
 */
const RustBackpack: React.FC = () => {
  const inv = useAppSelector(selectLeftInventory);
  const [base, setBase] = useState(bagBase.current);
  useNuiEvent<{ base: number }>('rustBackpack', (d) => setBase(d.base));

  const extra = inv.items.filter((i) => i.slot > base);
  if (!extra.length) return null;

  const bp = inv.items.find((i) => i.slot === base);
  const label = (bp?.name && (bp.metadata?.label || Items[bp.name]?.label)) || 'Mochila';

  return (
    <div className="rust-backpack">
      <div className="rust-section-title">
        <span>
          <Icon icon={faSuitcase} /> {label}
        </span>
        <small>
          {extra.filter((i) => i.name).length}/{extra.length}
        </small>
      </div>
      <div className="rust-grid rust-grid-backpack">
        {extra.map((item) => (
          <InventorySlot
            key={`player-${inv.id}-${item.slot}`}
            item={item}
            inventoryType={inv.type}
            inventoryGroups={inv.groups}
            inventoryId={inv.id}
          />
        ))}
      </div>
    </div>
  );
};

export default RustBackpack;

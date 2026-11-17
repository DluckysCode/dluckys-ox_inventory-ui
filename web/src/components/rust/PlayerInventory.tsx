import React, { useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import InventorySlot from '../inventory/InventorySlot';
import { useDrop } from 'react-dnd';
import { fetchNui } from '../../utils/fetchNui';
import type { ClothDrag } from './RustClothing';

import { HOTBAR_SLOTS } from './constants';
// Slot Mochila actual, para quien lo necesite fuera de este componente (p. ej. la tienda)
export const bagBase = { current: 50 };

const PlayerInventory: React.FC<{
  controls?: React.ReactNode;
  below?: React.ReactNode;
  aside?: React.ReactNode;
}> = ({ controls, below, aside }) => {
  const inv = useAppSelector(selectLeftInventory);
  const isBusy = useAppSelector((state) => state.inventory.isBusy);

  // Soltar una prenda (arrastrada desde las ranuras de ropa) en el inventario = quitártela.
  // Si cayó sobre un slot vacío, ese slot ya se encargó; si no, va al primer slot libre del inventario principal.
  const [{ isOver }, drop] = useDrop<ClothDrag, void, { isOver: boolean }>(
    () => ({
      accept: 'CLOTH',
      collect: (m) => ({ isOver: m.isOver() }),
      drop: (source, monitor) => {
        if (monitor.didDrop()) return;
        fetchNui('rustClothesTakeOff', { kind: source.kind });
      },
    }),
    []
  );

  // Slot Mochila = último slot normal del jugador (lo manda Lua). Lo que pase de ahí son los slots de la mochila.
  const [base, setBase] = useState(50);
  useNuiEvent<{ base: number }>('rustBackpack', (d) => {
    setBase(d.base);
    bagBase.current = d.base;
  });

  // Barra rápida (1-6) e inventario principal; la ranura Mochila va con la ropa y sus ranuras extra
  // salen a la derecha, a la altura del inventario (RustBackpack, vía "aside")
  const hotbar = inv.items.filter((i) => i.slot <= HOTBAR_SLOTS);
  const main = inv.items.filter((i) => i.slot > HOTBAR_SLOTS && i.slot < base);

  const slot = (item: (typeof inv.items)[number]) => (
    <InventorySlot
      key={`player-${inv.id}-${item.slot}`}
      item={item}
      inventoryType={inv.type}
      inventoryGroups={inv.groups}
      inventoryId={inv.id}
    />
  );

  return (
    <div
      ref={(el) => {
        drop(el);
      }}
      className={`rust-player ${isOver ? 'cloth-over' : ''}`}
      style={{ pointerEvents: isBusy ? 'none' : 'auto' }}
    >
      <div className="rust-inv-section">
        <div className="rust-section-title rust-inv-title">
          <span>Inventario</span>
          {/* Cantidad / usar / dar / cerrar, en la misma línea, después de la palabra Inventario */}
          {controls}
          {/* Sin peso: el límite son las ranuras */}
          <small>
            {main.filter((i) => i.name).length}/{main.length}
          </small>
        </div>
        <div className="rust-grid rust-grid-main">{main.map(slot)}</div>
        {/* Panel derecho (mochila + crafteo rápido) anclado a la altura del inventario */}
        {aside && <div className="rust-inv-aside">{aside}</div>}
      </div>
      {/* El suelo, debajo del inventario */}
      {below}
      {/* Barra rápida (la ranura Mochila va con la ropa) */}
      <div className="rust-grid rust-grid-hotbar" title={`Teclas 1 - ${HOTBAR_SLOTS}`}>
        {hotbar.map(slot)}
      </div>
    </div>
  );
};

export default PlayerInventory;

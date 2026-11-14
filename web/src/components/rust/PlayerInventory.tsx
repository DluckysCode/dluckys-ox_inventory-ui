import Icon from './Icon';
import { faBoxOpen, faSuitcase } from '@fortawesome/free-solid-svg-icons';
import React, { useMemo, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { Items } from '../../store/items';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import InventorySlot from '../inventory/InventorySlot';
import WeightBar from '../utils/WeightBar';
import { getTotalWeight } from '../../helpers';
import { useDrop } from 'react-dnd';
import { fetchNui } from '../../utils/fetchNui';
import type { ClothDrag } from './RustClothing';
import { playZipper } from './sounds';

export const HOTBAR_SLOTS = 5;

const PlayerInventory: React.FC = () => {
  const inv = useAppSelector(selectLeftInventory);
  const isBusy = useAppSelector((state) => state.inventory.isBusy);

  const weight = useMemo(
    () => (inv.maxWeight !== undefined ? Math.floor(getTotalWeight(inv.items) * 1000) / 1000 : 0),
    [inv.maxWeight, inv.items]
  );

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
  useNuiEvent<{ base: number }>('rustBackpack', (d) => setBase(d.base));

  const hotbar = inv.items.filter((i) => i.slot <= HOTBAR_SLOTS);
  const main = inv.items.filter((i) => i.slot > HOTBAR_SLOTS && i.slot < base);
  const bpSlot = inv.items.find((i) => i.slot === base);
  const extra = inv.items.filter((i) => i.slot > base);
  const bpLabel = bpSlot?.name ? bpSlot.metadata?.label || Items[bpSlot.name]?.label : null;
  const used = extra.filter((i) => i.name).length;

  // La mochila sale cerrada cada vez que abres el inventario; click la abre/cierra con sonido de zíper
  const [bagOpen, setBagOpen] = useState(false);
  useNuiEvent('setupInventory', () => setBagOpen(false));
  const toggleBag = () => {
    if (!extra.length) return;
    playZipper(!bagOpen);
    setBagOpen(!bagOpen);
  };

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
      <div className="rust-section-title">
        <span>Inventario</span>
        {inv.maxWeight ? (
          <small>
            {weight / 1000}/{inv.maxWeight / 1000}kg
          </small>
        ) : null}
      </div>
      <WeightBar percent={inv.maxWeight ? (weight / inv.maxWeight) * 100 : 0} />
      <div className="rust-grid rust-grid-main">{main.map(slot)}</div>

      {extra.length > 0 && (
        <>
          <div className={`rust-bag-bar ${bagOpen ? 'open' : ''}`} onClick={toggleBag}>
            <span>
              <Icon icon={bagOpen ? faBoxOpen : faSuitcase} /> {bpLabel || 'Mochila'}
            </span>
            <small>
              {used}/{extra.length} · {bagOpen ? 'click para cerrar' : 'click para abrir'}
            </small>
          </div>
          {bagOpen && <div className="rust-grid rust-grid-backpack">{extra.map(slot)}</div>}
        </>
      )}

      <div className="rust-section-title rust-hotbar-title">
        <span>Barra rápida</span>
        <small>Teclas 1 - {HOTBAR_SLOTS} · Mochila</small>
      </div>
      <div className="rust-grid rust-grid-hotbar">
        {hotbar.map(slot)}
        {bpSlot && (
          <div className={`rust-bp-slot ${bpSlot.name ? '' : 'empty'}`} onClick={toggleBag}>
            {slot(bpSlot)}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInventory;

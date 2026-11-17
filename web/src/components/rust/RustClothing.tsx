import React, { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import useNuiEvent from '../../hooks/useNuiEvent';
import { fetchNui } from '../../utils/fetchNui';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import { DragSource } from '../../typings';
import { clothingIcon } from './clothingIcons';
import InventorySlot from '../inventory/InventorySlot';
import { bagBase } from './PlayerInventory';

type ClothingSlot = { id: string; label: string; side: 'left' | 'right'; image?: string; worn: boolean; accepts: string };
export type ClothDrag = DragSource & { kind: string };

const ClothingSlotBox: React.FC<{ slot: ClothingSlot; busy: boolean; setBusy: (b: boolean) => void }> = ({
  slot,
  busy,
  setBusy,
}) => {
  const [{ isOver }, drop] = useDrop<DragSource, void, { isOver: boolean }>(
    () => ({
      accept: 'SLOT',
      collect: (m) => ({ isOver: m.isOver() }),
      canDrop: (source) => source.inventory === 'player' && source.item.name === slot.accepts,
      drop: (source) => {
        setBusy(true);
        fetchNui('rustClothesEquip', { slot: source.item.slot, kind: slot.id }).finally(() => setBusy(false));
      },
    }),
    [slot.id, slot.accepts]
  );

  const takeOff = () => {
    if (!slot.worn || busy) return;
    setBusy(true);
    fetchNui('rustClothesTakeOff', { kind: slot.id }).finally(() => setBusy(false));
  };

  // Arrastrar la prenda hacia el inventario = quitártela
  const [{ isDragging }, drag] = useDrag<ClothDrag, void, { isDragging: boolean }>(
    () => ({
      type: 'CLOTH',
      item: { kind: slot.id, item: { name: 'prenda', slot: 0 }, inventory: 'clothing', image: clothingIcon(slot) },
      canDrag: () => slot.worn && !busy,
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [slot.id, slot.worn, busy]
  );

  return (
    <div className="rust-cloth" style={{ opacity: isDragging ? 0.4 : 1 }}>
      <div
        ref={(el) => {
          drag(drop(el));
        }}
        className={`rust-cloth-slot ${slot.worn ? 'worn' : ''} ${isOver ? 'over' : ''}`}
        style={{ backgroundImage: clothingIcon(slot) }}
        title={slot.worn ? 'Click para quitártela' : 'Arrastra una prenda aquí'}
        onClick={takeOff}
        onContextMenu={(e) => {
          e.preventDefault();
          takeOff();
        }}
      />
      <span>{slot.label}</span>
    </div>
  );
};

const RustClothing: React.FC = () => {
  const [slots, setSlots] = useState<ClothingSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const player = useAppSelector(selectLeftInventory);

  useNuiEvent<{ slots: ClothingSlot[] }>('rustClothing', (data) => setSlots(data.slots || []));

  const left = slots.filter((s) => s.side === 'left');
  const right = slots.filter((s) => s.side !== 'left');

  // Ranura Mochila = último slot normal del jugador (lo manda Lua). Va con la ropa porque se lleva puesta
  const [base, setBase] = useState(bagBase.current);
  useNuiEvent<{ base: number }>('rustBackpack', (d) => setBase(d.base));
  const bpSlot = player.items.find((i) => i.slot === base);

  // Mide dónde queda el hueco del personaje y se lo dice a la cámara (Lua), para que caiga justo entre las prendas
  const pedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pedRef.current;
    if (!el || !slots.length) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0) fetchNui('rustCamTarget', { x: (r.left + r.width / 2) / window.innerWidth });
  }, [slots.length]);

  return (
    // Nombre arriba; prendas en dos columnas con el personaje en medio (cámara del juego); Mochila al final
    <div className="rust-character">
      <div className="rust-name">{player.label}</div>
      <div className="rust-paperdoll">
        <div className="rust-cloth-col">
          {left.map((s) => (
            <ClothingSlotBox key={s.id} slot={s} busy={busy} setBusy={setBusy} />
          ))}
        </div>
        <div className="rust-ped-space" ref={pedRef} />
        <div className="rust-cloth-col">
          {right.map((s) => (
            <ClothingSlotBox key={s.id} slot={s} busy={busy} setBusy={setBusy} />
          ))}
          {bpSlot && (
            <div className="rust-cloth">
              <div className={`rust-bp-slot ${bpSlot.name ? '' : 'empty'}`}>
                <InventorySlot
                  item={bpSlot}
                  inventoryType={player.type}
                  inventoryGroups={player.groups}
                  inventoryId={player.id}
                />
              </div>
              <span>Mochila</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RustClothing;

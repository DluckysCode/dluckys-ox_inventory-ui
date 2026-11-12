import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import useNuiEvent from '../../hooks/useNuiEvent';
import { fetchNui } from '../../utils/fetchNui';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import { DragSource } from '../../typings';
import { clothingIcon } from './clothingIcons';

type ClothingSlot = { id: string; label: string; side: 'left' | 'right'; worn: boolean };
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
      canDrop: (source) => source.inventory === 'player' && source.item.name === 'prenda',
      drop: (source) => {
        setBusy(true);
        fetchNui('rustClothesEquip', { slot: source.item.slot, kind: slot.id }).finally(() => setBusy(false));
      },
    }),
    [slot.id]
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
      item: { kind: slot.id, item: { name: 'prenda', slot: 0 }, inventory: 'clothing', image: clothingIcon(slot.id) },
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
        style={{ backgroundImage: clothingIcon(slot.id) }}
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

  return (
    <div className="rust-character">
      <div className="rust-name">{player.label}</div>
      <div className="rust-name-sub">Equipo · click en una prenda para quitártela</div>
      <div className="rust-paperdoll">
        <div className="rust-cloth-col">
          {left.map((s) => (
            <ClothingSlotBox key={s.id} slot={s} busy={busy} setBusy={setBusy} />
          ))}
        </div>
        {/* espacio libre: aquí se ve tu personaje (cámara del juego) */}
        <div className="rust-ped-space" />
        <div className="rust-cloth-col">
          {right.map((s) => (
            <ClothingSlotBox key={s.id} slot={s} busy={busy} setBusy={setBusy} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RustClothing;

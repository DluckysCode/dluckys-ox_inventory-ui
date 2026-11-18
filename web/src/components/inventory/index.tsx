import React, { useRef, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import InventoryControl from './InventoryControl';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  refreshSlots,
  selectLeftInventory,
  selectRightInventory,
  setAdditionalMetadata,
  setupInventory,
} from '../../store/inventory';
import { useExitListener } from '../../hooks/useExitListener';
import type { Inventory as InventoryProps } from '../../typings';
import RightInventory from './RightInventory';
import SearchGear from '../rust/SearchGear';
import Tooltip from '../utils/Tooltip';
import { closeTooltip } from '../../store/tooltip';
import InventoryContext from './InventoryContext';
import { closeContextMenu } from '../../store/contextMenu';
import Fade from '../utils/transitions/Fade';
import PlayerInventory from '../rust/PlayerInventory';
import RustClothing from '../rust/RustClothing';
import RustCrafting from '../rust/RustCrafting';
import RustShop from '../rust/RustShop';
import CraftSoundPlayer from '../rust/CraftSoundPlayer';
import AdminPanel from '../rust/AdminPanel';
import RustRepair from '../rust/RustRepair';
import RustRecycler from '../rust/RustRecycler';
import RustTree from '../rust/RustTree';
import RustBackpack from '../rust/RustBackpack';

const Inventory: React.FC = () => {
  const [inventoryVisible, setInventoryVisible] = useState(false);
  // Vista: inventario, pantalla completa de crafteo o mesa de reparación (se abre con ox_target)
  const [view, setView] = useState<'inv' | 'craft' | 'repair' | 'recycle'>('inv');
  useNuiEvent('rustRepairOpen', () => setView('repair'));
  useNuiEvent('rustRecycleOpen', () => setView('recycle'));
  // Mesa de trabajo (ox_target -> Craftear): directo a la pantalla de crafteo
  useNuiEvent('rustCraftOpen', () => setView('craft'));
  const dispatch = useAppDispatch();
  const rightInventory = useAppSelector(selectRightInventory);
  const player = useAppSelector(selectLeftInventory);
  const lastRight = useRef<string | number | undefined>(undefined);

  useNuiEvent<boolean>('setInventoryVisible', setInventoryVisible);
  useNuiEvent<false>('closeInventory', () => {
    setInventoryVisible(false);
    dispatch(closeContextMenu());
    dispatch(closeTooltip());
  });
  useExitListener(setInventoryVisible);

  useNuiEvent<{
    leftInventory?: InventoryProps;
    rightInventory?: InventoryProps;
  }>('setupInventory', (data) => {
    dispatch(setupInventory(data));
    // El servidor a veces reenvía el mismo inventario mientras está abierto (p. ej. al sincronizar la mochila):
    // solo se vuelve a la vista de inventario cuando se abre de verdad o cambia el contenedor de la derecha
    const right = data.rightInventory;
    const changed = !inventoryVisible || (right && right.id !== lastRight.current);
    !inventoryVisible && setInventoryVisible(true);
    if (right) lastRight.current = right.id;
    if (changed) setView('inv');
  });

  useNuiEvent('refreshSlots', (data) => dispatch(refreshSlots(data)));

  useNuiEvent('displayMetadata', (data: Array<{ metadata: string; value: string }>) => {
    dispatch(setAdditionalMetadata(data));
  });

  // Solo tu inventario (o el suelo): ahí salen la ropa, el crafteo rápido y el suelo debajo.
  // En tiendas, carros, dumpsters, etc. el contenedor va a la derecha
  const personal = rightInventory.type === 'newdrop' || rightInventory.type === 'drop';

  return (
    <>
      <Fade in={inventoryVisible}>
        {/* Contenedores (stash, basurero, maletero, tienda…): sin ropa y todo centrado, como la mesa */}
        <div className={`rust-root view-${view} ${!personal && view === 'inv' ? 'centered' : ''}`}>
          {/* Izquierda: personaje con la mochila y la ropa debajo. Siempre montada (solo se oculta) */}
          <div className="rust-col rust-left">{personal && <RustClothing />}</div>

          {/* Centro: tu nombre arriba; abajo los botones, el inventario, el suelo y la barra rápida */}
          <div className="rust-col rust-center">
            {/* Con tu inventario el nombre va junto a la ropa; en contenedores/mesa (sin ropa) sale aquí */}
            <div className="rust-player-head">{!personal && <div className="rust-name">{player.label}</div>}</div>
            <PlayerInventory
              controls={view === 'inv' && <InventoryControl />}
              below={
                view === 'inv' &&
                personal && (
                  <div className="rust-ground">
                    <div className="rust-section-title">
                      <span>Suelo</span>
                      <small>
                        {rightInventory.items.filter((i) => i.name).length}/{rightInventory.items.length}
                      </small>
                    </div>
                    <RightInventory />
                    {/* Crafteo rápido a la derecha, a la misma altura que el suelo */}
                    <div className="rust-inv-aside">
                      <RustCrafting visible={inventoryVisible} mode="quick" />
                    </div>
                  </div>
                )
              }
              aside={view === 'inv' && personal && <RustBackpack />}
            />
          </div>

          {/* Derecha: el contenedor abierto (stash, tienda…) o la mesa de reparación.
              Con tu inventario, la mochila va a la altura del inventario y el crafteo rápido a la del suelo */}
          <div className="rust-col rust-right">
            {view === 'inv' && !personal && (
              <div className="rust-right-body">
                {rightInventory.type === 'player' && <SearchGear target={rightInventory.id} />}
                {rightInventory.type === 'shop' ? <RustShop /> : <RightInventory />}
              </div>
            )}
            {view === 'repair' && <RustRepair />}
            {view === 'recycle' && <RustRecycler />}
          </div>

          {view === 'craft' && (
            <div className="rust-craft-screen">
              <RustCrafting visible={inventoryVisible} />
            </div>
          )}

          <Tooltip />
          <InventoryContext />
        </div>
      </Fade>
      <CraftSoundPlayer />
      <AdminPanel />
      <RustTree />
    </>
  );
};

export default Inventory;

import React, { useEffect, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import InventoryControl from './InventoryControl';
import { useAppDispatch, useAppSelector } from '../../store';
import { refreshSlots, selectRightInventory, setAdditionalMetadata, setupInventory } from '../../store/inventory';
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

const Inventory: React.FC = () => {
  const [inventoryVisible, setInventoryVisible] = useState(false);
  const [rightTab, setRightTab] = useState<'craft' | 'container'>('craft');
  const dispatch = useAppDispatch();
  const rightInventory = useAppSelector(selectRightInventory);

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
    !inventoryVisible && setInventoryVisible(true);
    // Si abriste un maletero, guantera, stash, etc. se muestra ese contenedor; si no, el crafteo
    if (data.rightInventory) setRightTab(data.rightInventory.type === 'newdrop' ? 'craft' : 'container');
  });

  useNuiEvent('refreshSlots', (data) => dispatch(refreshSlots(data)));

  useNuiEvent('displayMetadata', (data: Array<{ metadata: string; value: string }>) => {
    dispatch(setAdditionalMetadata(data));
  });

  // Al tirar algo al suelo aparece el contenedor del suelo
  useEffect(() => {
    if (rightInventory.type === 'drop') setRightTab('container');
  }, [rightInventory.type, rightInventory.id]);

  // Solo tu inventario (o el suelo): ahí sale la ropa. En tiendas, carros, dumpsters, etc. no
  const personal = rightInventory.type === 'newdrop' || rightInventory.type === 'drop';
  const containerLabel = personal ? 'Suelo' : rightInventory.label || 'Contenedor';

  return (
    <>
      <Fade in={inventoryVisible}>
        <div className="rust-root">
          <div className="rust-col rust-left">
            {personal && <RustClothing />}
          </div>

          <div className="rust-col rust-center">
            <InventoryControl />
            <PlayerInventory />
          </div>

          <div className="rust-col rust-right">
            <div className="rust-right-tabs">
              <button className={rightTab === 'craft' ? 'active' : ''} onClick={() => setRightTab('craft')}>
                Crafteo
              </button>
              <button className={rightTab === 'container' ? 'active' : ''} onClick={() => setRightTab('container')}>
                {containerLabel}
              </button>
            </div>
            <div className="rust-right-body">
              {rightTab === 'craft' ? (
                <RustCrafting visible={inventoryVisible} />
              ) : (
                <>
                  {rightInventory.type === 'player' && <SearchGear target={rightInventory.id} />}
                  {rightInventory.type === 'shop' ? <RustShop /> : <RightInventory />}
                </>
              )}
            </div>
          </div>

          <Tooltip />
          <InventoryContext />
        </div>
      </Fade>
      <CraftSoundPlayer />
      <AdminPanel />
    </>
  );
};

export default Inventory;

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
import Icon from '../rust/Icon';
import { faArrowLeft, faArrowRight, faBoxOpen } from '@fortawesome/free-solid-svg-icons';

const Inventory: React.FC = () => {
  const [inventoryVisible, setInventoryVisible] = useState(false);
  // Panel derecho en la vista de inventario: crafteo rápido o contenedor
  const [rightTab, setRightTab] = useState<'craft' | 'container'>('craft');
  // Vista: inventario o pantalla completa de crafteo
  const [view, setView] = useState<'inv' | 'craft'>('inv');
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
    setView('inv');
    // Si abriste un maletero, guantera, stash, etc. se muestra ese contenedor; si no, el crafteo
    if (data.rightInventory) setRightTab(data.rightInventory.type === 'newdrop' ? 'craft' : 'container');
  });

  useNuiEvent('refreshSlots', (data) => dispatch(refreshSlots(data)));

  useNuiEvent('displayMetadata', (data: Array<{ metadata: string; value: string }>) => {
    dispatch(setAdditionalMetadata(data));
  });

  // Al tirar algo al suelo aparece el contenedor del suelo
  useEffect(() => {
    if (rightInventory.type === 'drop') {
      setRightTab('container');
      setView('inv');
    }
  }, [rightInventory.type, rightInventory.id]);

  // Solo tu inventario (o el suelo): ahí sale la ropa. En tiendas, carros, dumpsters, etc. no
  const personal = rightInventory.type === 'newdrop' || rightInventory.type === 'drop';
  const containerLabel = personal ? 'Suelo' : rightInventory.label || 'Contenedor';

  return (
    <>
      <Fade in={inventoryVisible}>
        <div className={`rust-root view-${view}`}>
          {/* Pestañas grandes arriba */}
          <div className="rust-topbar">
            <button
              className={view === 'inv' && rightTab === 'container' ? 'active' : ''}
              onClick={() => {
                setView('inv');
                setRightTab(rightTab === 'container' ? 'craft' : 'container');
              }}
            >
              <span>{containerLabel}</span>
              <Icon icon={faBoxOpen} />
            </button>
            <button onClick={() => setView(view === 'craft' ? 'inv' : 'craft')}>
              {view === 'craft' && <Icon icon={faArrowLeft} />}
              <span>{view === 'craft' ? 'Inventario' : 'Crafteo'}</span>
              {view === 'inv' && <Icon icon={faArrowRight} />}
            </button>
          </div>

          <div className="rust-col rust-left">
            {/* Siempre montada (solo se oculta en la vista crafteo) para no perder las prendas que manda Lua */}
            {personal && <RustClothing />}
          </div>

          <div className="rust-col rust-center">
            {view === 'inv' && <InventoryControl />}
            <PlayerInventory />
          </div>

          <div className="rust-col rust-right">
            {view === 'inv' && (
              <div className={`rust-right-body ${rightTab === 'craft' ? 'quick' : ''}`}>
                {rightTab === 'craft' ? (
                  <RustCrafting visible={inventoryVisible} mode="quick" />
                ) : (
                  <>
                    {rightInventory.type === 'player' && <SearchGear target={rightInventory.id} />}
                    {rightInventory.type === 'shop' ? <RustShop /> : <RightInventory />}
                  </>
                )}
              </div>
            )}
          </div>

          {view === 'craft' && (
            <div className="rust-craft-screen">
              <RustCrafting visible={inventoryVisible} mode="full" />
            </div>
          )}

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

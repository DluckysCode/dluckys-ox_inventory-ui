import React, { useState } from 'react';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import Icon from './Icon';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectLeftInventory, selectRightInventory } from '../../store/inventory';
import { buyItem } from '../../thunks/buyItem';
import { Items } from '../../store/items';
import { canPurchaseItem, getItemUrl, isSlotWithItem } from '../../helpers';
import { getRarity, rarityVar } from '../../helpers/rarity';
import { bagBase } from './PlayerInventory';
import { HOTBAR_SLOTS } from './constants';
import type { SlotWithItem } from '../../typings';

// Tienda estilo Rust: lista con "En venta", "Costo" y botón Comprar con cantidad
const RustShop: React.FC = () => {
  const shop = useAppSelector(selectRightInventory);
  const player = useAppSelector(selectLeftInventory);
  const dispatch = useAppDispatch();
  const [qty, setQty] = useState<Record<number, number>>({});

  // Dónde cae lo comprado: se apila si ya lo tienes; si no, primer hueco libre (inventario, luego barra rápida)
  const targetSlot = (item: SlotWithItem) => {
    const own = player.items.filter((s) => s.slot < bagBase.current);
    if (Items[item.name]?.stack) {
      const same = own.find((s) => s.name === item.name && !s.metadata?.durability);
      if (same) return same.slot;
    }
    const free = own.filter((s) => !s.name);
    return (free.find((s) => s.slot > HOTBAR_SLOTS) || free[0])?.slot;
  };

  const buy = (item: SlotWithItem, count: number) => {
    const toSlot = targetSlot(item);
    if (toSlot === undefined) return;
    dispatch(buyItem({ fromSlot: item.slot, fromType: shop.type, toSlot, toType: player.type, count }));
  };

  const items = shop.items.filter((s): s is SlotWithItem => isSlotWithItem(s));

  return (
    <div className="rust-shop">
      <div className="rust-shop-head">
        <span>En venta</span>
        <span>Costo</span>
        <span />
      </div>
      <div className="rust-shop-list">
        {items.map((item) => {
          const max = item.count === undefined ? 999 : item.count;
          const n = Math.min(qty[item.slot] || 1, Math.max(max, 1));
          const set = (v: number) => setQty({ ...qty, [item.slot]: Math.max(1, Math.min(max, v || 1)) });
          const label = item.metadata?.label || Items[item.name]?.label || item.name;
          const currency = item.currency || 'money';
          const ok = max > 0 && canPurchaseItem(item, { type: shop.type, groups: shop.groups });

          return (
            <div className={`rust-shop-row ${ok ? '' : 'off'}`} key={item.slot}>
              <div
                className="rust-shop-ico"
                data-rarity={getRarity(item.name, item.metadata)}
                style={{ backgroundImage: `url(${getItemUrl(item)})`, ...rarityVar(getRarity(item.name, item.metadata)) }}
                title={label}
              >
                {item.count !== undefined && <span className="stock">{item.count}</span>}
              </div>
              <div className="rust-shop-ico" style={{ backgroundImage: `url(${getItemUrl(currency)})` }} title={Items[currency]?.label}>
                <span className="price">x{((item.price || 0) * n).toLocaleString('en-us')}</span>
              </div>
              <div className="rust-shop-buy">
                <button className="buy" disabled={!ok} onClick={() => buy(item, n)}>
                  Comprar
                </button>
                <div className="qty">
                  <button onClick={() => set(n - 1)}>
                    <Icon icon={faMinus} />
                  </button>
                  <input value={n} onChange={(e) => set(parseInt(e.target.value))} />
                  <button onClick={() => set(n + 1)}>
                    <Icon icon={faPlus} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="rust-empty">No hay nada a la venta.</div>}
      </div>
    </div>
  );
};

export default RustShop;

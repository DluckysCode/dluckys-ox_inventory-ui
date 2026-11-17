import Icon from './Icon';
import { faArrowRightFromBracket, faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { fetchNui } from '../../utils/fetchNui';
import { getItemUrl, isSlotWithItem } from '../../helpers';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import { DragSource, SlotWithItem } from '../../typings';
import SprayCan from './SprayCan';

type Mat = { name: string; label: string; amount: number };
type Tint = { id: number; label: string; color: string };
type RepairData = {
  repair?: { default: Mat[]; items: Record<string, Mat[]> };
  skins?: { cost: Mat[]; tints: Tint[] };
};
// Objeto que está dentro de la mesa (lo guarda el servidor)
type BenchItem = { name: string; label: string; count: number; metadata?: Record<string, any> };
type Result = { ok: boolean; error?: string; item?: BenchItem };

// Mesa de reparación (se abre con ox_target): el objeto se pasa a la mesa, se repara o pinta, y se saca
const RustRepair: React.FC = () => {
  const items = useAppSelector(selectLeftInventory).items;
  const [data, setData] = useState<RepairData>({});
  const [item, setItem] = useState<BenchItem | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchNui<RepairData>('rustcraftGetRecipes').then((d) => d && setData(d));
    // si dejaste algo en la mesa la última vez, sigue ahí
    fetchNui<{ item?: BenchItem }>('rustRepairGet').then((d) => setItem(d?.item || null));
  }, []);

  // Materiales que llevas (para pintar el costo en verde/rojo)
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of items) if (isSlotWithItem(s)) c[s.name] = (c[s.name] || 0) + s.count;
    return c;
  }, [items]);

  // Llama al servidor; si devuelve el objeto de la mesa se actualiza
  const run = async (event: string, payload: unknown = {}) => {
    setMsg('');
    const res = await fetchNui<Result>(event, payload);
    if (!res?.ok) return setMsg(res?.error || 'No se pudo');
    if (res.item) setItem(res.item);
    return res;
  };

  const [{ isOver }, drop] = useDrop<DragSource, void, { isOver: boolean }>(
    () => ({
      accept: 'SLOT',
      collect: (m) => ({ isOver: m.isOver() }),
      canDrop: (source) => source.inventory === 'player',
      drop: (source) => {
        run('rustRepairPut', { slot: source.item.slot });
      },
    }),
    []
  );

  const take = async () => {
    if (item && (await run('rustRepairTake'))) setItem(null);
  };

  const durability = item?.metadata?.durability;
  const base = item ? data.repair?.items[item.name] || data.repair?.default || [] : [];
  const missing = typeof durability === 'number' ? (100 - durability) / 100 : 0;
  const repairCost = base.map((m) => ({ ...m, amount: Math.max(1, Math.ceil(m.amount * missing)) }));
  const canRepair =
    typeof durability === 'number' && durability < 100 && repairCost.every((c) => (counts[c.name] || 0) >= c.amount);

  const skinCost = data.skins?.cost || [];
  const canPaySkin = skinCost.every((c) => (counts[c.name] || 0) >= c.amount);
  const tint = item?.metadata?.tint ?? 0;
  const isWeapon = !!item && item.name.startsWith('WEAPON_');

  const cost = (list: Mat[]) =>
    list.map((c) => (
      <span key={c.name} className={(counts[c.name] || 0) >= c.amount ? 'ok' : 'bad'}>
        {c.amount} {c.label}
      </span>
    ));

  return (
    <div className="rust-repair">
      <div className="rust-section-title">
        <span>
          <Icon icon={faScrewdriverWrench} /> Mesa de reparación
        </span>
      </div>

      <div className="rust-repair-top">
        <div
          ref={(el) => {
            drop(el);
          }}
          className={`rust-repair-slot ${isOver ? 'over' : ''}`}
          style={item ? { backgroundImage: `url(${getItemUrl({ ...item, slot: 1, weight: 0 } as SlotWithItem)})` } : undefined}
        >
          {!item && (
            <span>
              <Icon icon={faScrewdriverWrench} />
              Arrastra aquí un arma o herramienta
            </span>
          )}
          {item && item.count > 1 && <b className="count">x{item.count}</b>}
        </div>

        {item && (
          <div className="rust-repair-info">
            <h3>{item.metadata?.label || item.label}</h3>
            {typeof durability === 'number' ? (
              <>
                <div className="dur">
                  <div style={{ width: `${durability}%` }} />
                </div>
                <small>Condición: {Math.floor(durability)}%</small>
              </>
            ) : (
              <small>Este objeto no se desgasta</small>
            )}
            <button className="rust-repair-take" onClick={take}>
              <Icon icon={faArrowRightFromBracket} /> Sacar al inventario
            </button>
          </div>
        )}
      </div>

      {item && typeof durability === 'number' && durability < 100 && (
        <div className="rust-repair-box">
          <div className="head">Reparar</div>
          <div className="cost">{cost(repairCost)}</div>
          <button className="rust-craft-btn" disabled={!canRepair} onClick={() => run('rustcraftRepair')}>
            Reparar
          </button>
        </div>
      )}

      {isWeapon && (data.skins?.tints.length ?? 0) > 0 && (
        <div className="rust-repair-box">
          <div className="head">
            Skins <small>{cost(skinCost)} por cambio</small>
          </div>
          <div className="rust-skins">
            {data.skins!.tints.map((t) => (
              <button
                key={t.id}
                className={`swatch ${tint === t.id ? 'on' : ''}`}
                disabled={tint === t.id || !canPaySkin}
                onClick={() => run('rustcraftSkin', { tint: t.id })}
              >
                <SprayCan color={t.color} id={t.id} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {msg && <div className="rust-msg">{msg}</div>}
    </div>
  );
};

export default RustRepair;

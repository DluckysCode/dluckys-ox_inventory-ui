import React, { useEffect, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { fetchNui } from '../../utils/fetchNui';

type Bench = { id: string; template: string; label: string; x: number; y: number; z: number };
type Template = { id: string; label: string };
type LootType = { id: string; label: string };
type LootPoint = { id: string; t: string; label: string; x: number; y: number; z: number };
type AdminData = { benches: Bench[]; templates: Template[]; lootTypes: LootType[]; loot: LootPoint[] };

const fmt = (p: { x: number; y: number; z: number }) => `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;

/** /inventory: colocar, mover o eliminar mesas y puntos de botín (solo admins) */
const AdminPanel: React.FC = () => {
  const [data, setData] = useState<AdminData | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useNuiEvent<AdminData | false>('rustAdmin', (d) => {
    setData(d || null);
    setConfirm(null);
  });

  const close = () => fetchNui('rustAdminClose');
  const act = (action: string, extra: Record<string, string>) => fetchNui('rustAdminAction', { action, ...extra });
  const remove = (action: string, id: string) => {
    if (confirm !== id) return setConfirm(id); // primer click pide confirmar
    setConfirm(null);
    act(action, { id });
  };

  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => e.code === 'Escape' && close();
    window.addEventListener('keyup', onKey);
    return () => window.removeEventListener('keyup', onKey);
  }, [data]);

  if (!data) return null;

  return (
    <div className="rust-admin">
      <div className="rust-admin-head">
        <span>Administrar mundo</span>
        <button onClick={close}>✕</button>
      </div>

      <div className="rust-section-title">
        <span>Mesas</span>
        <small>{data.benches.length} colocadas</small>
      </div>
      <div className="rust-admin-add">
        {data.templates.map((t) => (
          <button key={t.id} onClick={() => act('addBench', { template: t.id })}>
            + {t.label}
          </button>
        ))}
      </div>
      <div className="rust-list">
        {data.benches.map((b) => (
          <div className="rust-row" key={b.id}>
            <div className="info">
              <b>{b.label}</b>
              <small>{fmt(b)}</small>
            </div>
            <button onClick={() => act('moveBench', { id: b.id })}>Mover</button>
            <button className="alt" onClick={() => act('goto', { id: b.id })}>
              Ir
            </button>
            <button className="danger" onClick={() => remove('removeBench', b.id)}>
              {confirm === b.id ? '¿Seguro?' : 'Eliminar'}
            </button>
          </div>
        ))}
        {data.benches.length === 0 && <div className="rust-empty">No hay mesas colocadas.</div>}
      </div>

      <div className="rust-section-title">
        <span>Botín</span>
        <small>{data.loot.length} puntos fijos</small>
      </div>
      <div className="rust-admin-add">
        {data.lootTypes.map((t) => (
          <button key={t.id} onClick={() => act('addLoot', { type: t.id })}>
            + {t.label}
          </button>
        ))}
      </div>
      <div className="rust-list">
        {data.loot.map((p) => (
          <div className="rust-row" key={p.id}>
            <div className="info">
              <b>{p.label}</b>
              <small>{fmt(p)}</small>
            </div>
            <button onClick={() => act('moveLoot', { id: p.id })}>Mover</button>
            <button className="alt" onClick={() => act('goto', { id: p.id })}>
              Ir
            </button>
            <button className="danger" onClick={() => remove('removeLoot', p.id)}>
              {confirm === p.id ? '¿Seguro?' : 'Eliminar'}
            </button>
          </div>
        ))}
        {data.loot.length === 0 && (
          <div className="rust-empty">Todavía no colocaste puntos. Los de zonas al azar no aparecen aquí.</div>
        )}
      </div>

      <div className="rust-admin-help">
        Al colocar: <b>Rueda</b> gira · <b>Shift + rueda</b> gira fino · <b>Click</b> coloca · <b>Click derecho</b>{' '}
        cancela
      </div>
    </div>
  );
};

export default AdminPanel;

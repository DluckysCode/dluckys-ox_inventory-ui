import React, { useCallback, useEffect, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { fetchNui } from '../../utils/fetchNui';

// ---------- Tipos ----------
type Pos = { x: number; y: number; z: number };
type Opt = { id: string; label: string };
type Item = { name: string; label: string };
type World = {
  benches: (Pos & { id: string; template: string; label: string; h: number })[];
  templates: Opt[];
  boxTypes: Opt[];
  boxes: (Pos & { id: string; label: string; owner: string; ownerName?: string })[];
};
type Players = { players: { id: number; name: string }[]; items: Item[]; blueprints: string[] };
type Recipe = {
  name: string;
  label?: string;
  time: number;
  count: number;
  category: string;
  ingredients: Record<string, number>;
  level?: number;
  bench?: string;
  blueprint: boolean;
  disabled: boolean;
};
type Recipes = { recipes: Recipe[]; categories: Opt[]; benches: Opt[]; items: Item[] };
type LogEntry = { t: number; kind: string; player: string; text: string };
type Result = { ok: boolean; error?: string };

const TABS = [
  { id: 'world', label: 'Mundo' },
  { id: 'players', label: 'Jugadores' },
  { id: 'recipes', label: 'Recetas' },
  { id: 'log', label: 'Registro' },
];
const KINDS: Record<string, string> = {
  craft: 'Crafteo',
  recycle: 'Reciclaje',
  repair: 'Reparación',
  blueprint: 'Plano',
  box: 'Caja',
  admin: 'Admin',
};

const fmt = (p: Pos) => `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
const act = (action: string, extra: Record<string, unknown> = {}) =>
  fetchNui<Result>('rustAdminAction', { action, ...extra });
const stop = (e: React.KeyboardEvent) => e.stopPropagation();

/** Botón de eliminar que pide un segundo click */
const DeleteButton: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => {
  const [sure, setSure] = useState(false);
  return (
    <button className="danger" onClick={() => (sure ? onConfirm() : setSure(true))} onMouseLeave={() => setSure(false)}>
      {sure ? '¿Seguro?' : 'Eliminar'}
    </button>
  );
};

const Row: React.FC<{ title: string; sub?: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <div className="rust-row">
    <div className="info">
      <b>{title}</b>
      {sub && <small>{sub}</small>}
    </div>
    {children}
  </div>
);

const ItemList: React.FC<{ items: Item[] }> = ({ items }) => (
  <datalist id="rust-admin-items">
    {items.map((i) => (
      <option key={i.name} value={i.name}>
        {i.label}
      </option>
    ))}
  </datalist>
);

// ---------- Pestaña Mundo ----------
const WorldTab: React.FC<{ data: World; reload: () => void }> = ({ data, reload }) => {
  const [map, setMap] = useState(false);
  const run = async (action: string, extra: Record<string, unknown>) => {
    await act(action, extra);
    reload();
  };
  const goto = (p: Pos) => act('goto', p);

  return (
    <>
      <button className={`rust-admin-wide ${map ? 'on' : ''}`} onClick={() => act('map', { on: !map }).then(() => setMap(!map))}>
        🗺 {map ? 'Quitar del mapa' : 'Ver todo en el mapa (5 min)'}
      </button>

      <div className="rust-section-title">
        <span>Mesas</span>
        <small>{data.benches.length}</small>
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
          <Row key={b.id} title={b.label} sub={fmt(b)}>
            <button onClick={() => act('moveBench', { id: b.id, template: b.template, h: b.h })}>Mover</button>
            <button className="alt" onClick={() => goto(b)}>
              Ir
            </button>
            <DeleteButton onConfirm={() => run('removeBench', { id: b.id })} />
          </Row>
        ))}
      </div>

      <div className="rust-section-title">
        <span>Cajas</span>
        <small>{data.boxes.length}</small>
      </div>
      <div className="rust-admin-add">
        {data.boxTypes.map((t) => (
          <button key={t.id} onClick={() => act('addBox', { item: t.id })}>
            + {t.label} (a tu nombre)
          </button>
        ))}
      </div>
      <div className="rust-list">
        {data.boxes.map((b) => (
          <Row key={b.id} title={b.label} sub={`Dueño: ${b.ownerName || b.owner}${b.ownerName ? ' 🟢' : ''} · ${fmt(b)}`}>
            <button onClick={() => act('openBox', { id: b.id })}>Abrir</button>
            <button className="alt" onClick={() => goto(b)}>
              Ir
            </button>
            <DeleteButton onConfirm={() => run('removeBox', { id: b.id })} />
          </Row>
        ))}
      </div>
    </>
  );
};

// ---------- Pestaña Jugadores ----------
const PlayersTab: React.FC<{ data: Players; notify: (r: Result, ok: string) => void }> = ({ data, notify }) => {
  const [target, setTarget] = useState<number | ''>(data.players[0]?.id ?? '');
  const [item, setItem] = useState('');
  const [count, setCount] = useState(1);
  const [bp, setBp] = useState(data.blueprints[0] || '');
  const send = async (action: string, extra: Record<string, unknown>, ok: string) =>
    notify(await act(action, { target, ...extra }), ok);

  return (
    <>
      <ItemList items={data.items} />
      <div className="rust-section-title">
        <span>Jugador</span>
        <small>{data.players.length} conectados</small>
      </div>
      <div className="rust-list rust-players">
        {data.players.map((p) => (
          <div key={p.id} className={`rust-player-pick ${target === p.id ? 'sel' : ''}`} onClick={() => setTarget(p.id)}>
            <b>{p.id}</b> {p.name}
          </div>
        ))}
      </div>

      {target !== '' && (
        <>
          <button className="rust-admin-wide" onClick={() => send('viewPlayer', {}, '')}>
            🎒 Ver inventario de {data.players.find((p) => p.id === target)?.name || target}
          </button>

          <div className="rust-section-title">
            <span>Dar item</span>
          </div>
          <div className="rust-admin-form">
            <input list="rust-admin-items" placeholder="Item (ej. cloth)" value={item} onKeyDown={stop} onChange={(e) => setItem(e.target.value)} />
            <input type="number" value={count} onKeyDown={stop} onChange={(e) => setCount(+e.target.value)} />
            <button disabled={!item} onClick={() => send('giveItem', { item, count }, `Diste ${count}x ${item}`)}>
              Dar
            </button>
          </div>

          <div className="rust-section-title">
            <span>Planos</span>
          </div>
          <div className="rust-admin-form">
            <select value={bp} onChange={(e) => setBp(e.target.value)}>
              {data.blueprints.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <button disabled={!bp} onClick={() => send('giveBlueprint', { recipe: bp }, `Diste el plano de ${bp}`)}>
              Dar plano
            </button>
          </div>
          <div className="rust-admin-add">
            <button onClick={() => send('learnAll', {}, 'Ya conoce todos los planos')}>Enseñar todos</button>
            <button className="danger" onClick={() => send('resetBlueprints', {}, 'Planos reiniciados')}>
              Quitar todos
            </button>
          </div>
        </>
      )}
    </>
  );
};

// ---------- Pestaña Recetas ----------
const EMPTY: Recipe = { name: '', time: 5, count: 1, category: 'items', ingredients: {}, blueprint: false, disabled: false };

const RecipesTab: React.FC<{ data: Recipes; reload: () => void; notify: (r: Result, ok: string) => void }> = ({
  data,
  reload,
  notify,
}) => {
  const [edit, setEdit] = useState<(Recipe & { isNew?: boolean }) | null>(null);
  const [mats, setMats] = useState<{ item: string; n: number }[]>([]);

  const open = (r: Recipe, isNew = false) => {
    setEdit({ ...r, isNew });
    setMats(Object.entries(r.ingredients).map(([item, n]) => ({ item, n })));
  };

  const save = async () => {
    if (!edit) return;
    const ingredients: Record<string, number> = {};
    mats.forEach((m) => m.item && m.n > 0 && (ingredients[m.item] = m.n));
    const res = await act('saveRecipe', { ...edit, ingredients });
    notify(res, 'Receta guardada');
    if (res.ok) {
      setEdit(null);
      reload();
    }
  };

  if (edit) {
    const set = (k: keyof Recipe, v: unknown) => setEdit({ ...edit, [k]: v });
    return (
      <>
        <ItemList items={data.items} />
        <div className="rust-section-title">
          <span>{edit.isNew ? 'Nueva receta' : edit.label || edit.name}</span>
          <button className="rust-link" onClick={() => setEdit(null)}>
            ← Volver
          </button>
        </div>
        <div className="rust-admin-grid">
          <label>
            Item que da
            <input list="rust-admin-items" value={edit.name} disabled={!edit.isNew} onKeyDown={stop} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label>
            Cantidad que da
            <input type="number" value={edit.count} onKeyDown={stop} onChange={(e) => set('count', +e.target.value)} />
          </label>
          <label>
            Tiempo (s)
            <input type="number" value={edit.time} onKeyDown={stop} onChange={(e) => set('time', +e.target.value)} />
          </label>
          <label>
            Categoría
            <select value={edit.category} onChange={(e) => set('category', e.target.value)}>
              {data.categories
                .filter((c) => c.id !== 'all')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Nivel de mesa (0 = ninguna)
            <input type="number" value={edit.level || 0} onKeyDown={stop} onChange={(e) => set('level', +e.target.value)} />
          </label>
          <label>
            Mesa concreta
            <select value={edit.bench || ''} onChange={(e) => set('bench', e.target.value)}>
              <option value="">— Ninguna —</option>
              {data.benches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={edit.blueprint} onChange={(e) => set('blueprint', e.target.checked)} />
            Necesita plano
          </label>
          <label className="check">
            <input type="checkbox" checked={!edit.disabled} onChange={(e) => set('disabled', !e.target.checked)} />
            Activa
          </label>
        </div>

        <div className="rust-section-title">
          <span>Materiales</span>
          <button className="rust-link" onClick={() => setMats([...mats, { item: '', n: 1 }])}>
            + Añadir
          </button>
        </div>
        {mats.map((m, i) => (
          <div className="rust-admin-form" key={i}>
            <input
              list="rust-admin-items"
              placeholder="Item"
              value={m.item}
              onKeyDown={stop}
              onChange={(e) => setMats(mats.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))}
            />
            <input
              type="number"
              value={m.n}
              onKeyDown={stop}
              onChange={(e) => setMats(mats.map((x, j) => (j === i ? { ...x, n: +e.target.value } : x)))}
            />
            <button className="danger" onClick={() => setMats(mats.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        <button className="rust-admin-wide on" onClick={save}>
          Guardar receta
        </button>
      </>
    );
  }

  return (
    <>
      <button className="rust-admin-wide" onClick={() => open(EMPTY, true)}>
        + Nueva receta
      </button>
      <div className="rust-list rust-list-tall">
        {data.recipes.map((r) => (
          <Row
            key={r.name}
            title={`${r.label || r.name}${r.count > 1 ? ` x${r.count}` : ''}${r.disabled ? ' (desactivada)' : ''}`}
            sub={`${r.time}s · ${Object.entries(r.ingredients)
              .map(([i, n]) => `${n} ${i}`)
              .join(', ')}${r.level ? ` · mesa nv ${r.level}` : ''}${r.blueprint ? ' · plano' : ''}`}
          >
            <button onClick={() => open(r)}>Editar</button>
          </Row>
        ))}
      </div>
    </>
  );
};

// ---------- Pestaña Registro ----------
const LogTab: React.FC<{ data: { log: LogEntry[] }; reload: () => void }> = ({ data, reload }) => {
  const [kind, setKind] = useState('');
  const list = kind ? data.log.filter((e) => e.kind === kind) : data.log;
  return (
    <>
      <div className="rust-admin-form">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Todo</option>
          {Object.entries(KINDS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button onClick={reload}>Actualizar</button>
      </div>
      <div className="rust-list rust-list-tall">
        {list.length === 0 && <div className="rust-empty">Sin actividad todavía (se borra al reiniciar).</div>}
        {list.map((e, i) => (
          <div className="rust-log" key={i}>
            <span className="time">{new Date(e.t * 1000).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className={`kind k-${e.kind}`}>{KINDS[e.kind] || e.kind}</span>
            <span className="who">{e.player}</span>
            <span className="what">{e.text}</span>
          </div>
        ))}
      </div>
    </>
  );
};

// ---------- Panel ----------
/** /admininventory: mundo, jugadores, recetas y registro (solo admins) */
const AdminPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('world');
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (t: string) => {
    setData(null);
    setData(await fetchNui('rustAdminTab', { tab: t }));
  }, []);

  useNuiEvent<{ open: boolean; tab?: string }>('rustAdmin', (d) => {
    setOpen(d.open);
    if (d.open) {
      setTab(d.tab || 'world');
      load(d.tab || 'world');
    }
  });

  const close = () => fetchNui('rustAdminClose');
  const notify = (r: Result, ok: string) => {
    if (!ok && r.ok) return;
    setMsg({ ok: r.ok, text: r.ok ? ok : r.error || 'No se pudo' });
    setTimeout(() => setMsg(null), 3000);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.code === 'Escape' && close();
    window.addEventListener('keyup', onKey);
    return () => window.removeEventListener('keyup', onKey);
  }, [open]);

  if (!open) return null;
  const reload = () => load(tab);

  return (
    <div className="rust-admin">
      <div className="rust-admin-head">
        <span>Administrar inventario</span>
        <button onClick={close}>✕</button>
      </div>
      <div className="rust-right-tabs rust-admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => {
              setTab(t.id);
              load(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {msg && <div className={`rust-admin-msg ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</div>}
      {!data && <div className="rust-empty">Cargando…</div>}
      {data && tab === 'world' && <WorldTab data={data} reload={reload} />}
      {data && tab === 'players' && <PlayersTab data={data} notify={notify} />}
      {data && tab === 'recipes' && <RecipesTab data={data} reload={reload} notify={notify} />}
      {data && tab === 'log' && <LogTab data={data} reload={reload} />}
      {tab === 'world' && (
        <div className="rust-admin-help">
          Al colocar: <b>Rueda</b> gira · <b>Q</b> fija la posición · <b>Flechas</b> la mueven · <b>RePág/AvPág</b> altura ·{' '}
          <b>Shift</b> fino · <b>Click</b> coloca · <b>Click derecho</b> cancela
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

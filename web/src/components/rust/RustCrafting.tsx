import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { fetchNui } from '../../utils/fetchNui';
import { getItemUrl, isSlotWithItem } from '../../helpers';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import { Items } from '../../store/items';
import { SlotWithItem } from '../../typings';

type Mat = { name: string; label: string; amount: number };
type Ingredient = Mat & { have: number };
type RawRecipe = {
  id: number;
  name: string;
  label: string;
  description?: string;
  count: number;
  time: number;
  category: string;
  ingredients: Mat[];
  bench?: string;
  benchLabel?: string;
  level?: number;
  blueprint?: boolean;
  learned?: boolean;
};
type Recipe = Omit<RawRecipe, 'ingredients'> & { ingredients: Ingredient[] };
type Category = { id: string; label: string };
type Job = { id: number; name: string; label: string; amount: number; time: number; startedAt?: number };
type BenchState = { ids: Record<string, boolean>; level: number; repair: boolean; recycler: boolean };

const FAV_KEY = 'rustcraft:favs';
const loadFavs = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveFavs = (f: number[]) => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(f));
  } catch {
    /* sin almacenamiento */
  }
};

const img = (item: string | SlotWithItem) => `url(${getItemUrl(item)})`;
const maxCraftable = (r: Recipe) => r.ingredients.reduce((m, i) => Math.min(m, Math.floor(i.have / i.amount)), Infinity);
const fmtTime = (s: number) => {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
};
const itemLabel = (slot: SlotWithItem) => slot.metadata?.label || Items[slot.name]?.label || slot.name;

const RustCrafting: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [rawRecipes, setRawRecipes] = useState<RawRecipe[]>([]);
  const playerItems = useAppSelector(selectLeftInventory).items;
  const [categories, setCategories] = useState<Category[]>([]);
  const [cat, setCat] = useState('favs');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [favs, setFavs] = useState<number[]>(loadFavs);
  const [queue, setQueue] = useState<Job[]>([]);
  const [offset, setOffset] = useState(0);
  const [, setTick] = useState(0);
  const [bench, setBench] = useState<BenchState>({ ids: {}, level: 0, repair: false, recycler: false });
  const [repairCosts, setRepairCosts] = useState<{ default: Mat[]; items: Record<string, Mat[]> }>({
    default: [],
    items: {},
  });
  const [recycleTable, setRecycleTable] = useState<Record<string, Mat[]>>({});
  const [recycleQty, setRecycleQty] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const data = await fetchNui<{
      categories: Category[];
      recipes: RawRecipe[];
      bench?: BenchState;
      repair?: { default: Mat[]; items: Record<string, Mat[]> };
      recycle?: Record<string, Mat[]>;
      error?: string;
    }>('rustcraftGetRecipes');
    if (!data || data.error) {
      setMsg(data?.error || '');
      return;
    }
    if (data.bench) setBench(data.bench);
    if (data.repair) setRepairCosts({ default: data.repair.default || [], items: data.repair.items || {} });
    setRecycleTable(data.recycle || {});
    setCategories(data.categories || []);
    setRawRecipes(data.recipes || []);
    setSel((prev) => prev ?? data.recipes?.[0]?.id ?? null);
  }, []);

  // Las recetas se piden al servidor solo al abrir el inventario
  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  // Mesas cercanas en vivo (llegan cada vez que cambian)
  useNuiEvent<BenchState>('rustcraftBench', (state) => setBench(state));

  // Si te alejas de la mesa, sal de las pestañas de reparar/reciclar
  useEffect(() => {
    if ((cat === 'repair' && !bench.repair) || (cat === 'recycle' && !bench.recycler)) setCat('favs');
  }, [bench, cat]);

  // Los materiales se cuentan aquí con el inventario que ya tiene la interfaz
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const slot of playerItems) {
      if (isSlotWithItem(slot)) c[slot.name] = (c[slot.name] || 0) + slot.count;
    }
    return c;
  }, [playerItems]);

  const recipes = useMemo<Recipe[]>(
    () =>
      rawRecipes.map((r) => ({
        ...r,
        ingredients: r.ingredients.map((i) => ({ ...i, have: counts[i.name] || 0 })),
      })),
    [rawRecipes, counts]
  );

  useNuiEvent<{ queue: Job[]; serverTime: number }>('rustcraftQueue', (d) => {
    setQueue(d.queue || []);
    setOffset(d.serverTime - Date.now() / 1000);
  });

  useEffect(() => {
    if (!queue.some((j) => j.startedAt)) return;
    const t = setInterval(() => setTick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, [queue]);

  /** Motivo por el que no se puede craftear (o null si se puede) */
  const lockReason = (r: Recipe): string | null => {
    if (r.blueprint && !r.learned) return '📜 Necesitas aprender el plano';
    if (r.bench && !bench.ids[r.bench]) return `🔒 Requiere: ${r.benchLabel}`;
    if (r.level && bench.level < r.level) return `🔒 Requiere mesa de nivel ${r.level}`;
    return null;
  };
  const canMake = (r: Recipe) => (lockReason(r) ? 0 : Math.min(100, maxCraftable(r)));

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return recipes.filter((r) => {
      if (q && !r.label.toLowerCase().includes(q)) return false;
      if (cat === 'favs') return favs.length === 0 || favs.includes(r.id);
      return cat === 'all' || r.category === cat;
    });
  }, [recipes, cat, search, favs]);

  const recipe = recipes.find((r) => r.id === sel);
  const now = Date.now() / 1000 + offset;

  const totalLeft = queue.reduce((acc, j, i) => {
    const elapsed = i === 0 && j.startedAt ? now - j.startedAt : 0;
    return acc + j.time * j.amount - Math.min(elapsed, j.time);
  }, 0);

  const toggleFav = (id: number) => {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    setFavs(next);
    saveFavs(next);
  };

  const run = async (event: string, data: unknown) => {
    setMsg('');
    const res = await fetchNui<{ ok: boolean; error?: string }>(event, data);
    if (res && !res.ok) setMsg(res.error || 'No se pudo');
  };
  const craft = (id: number, amount: number) => run('rustcraftCraft', { id, amount });
  const cancel = (id: number) => fetchNui('rustcraftCancel', { id });

  // ---------- Reparar ----------
  const repairable = playerItems.filter(
    (s): s is SlotWithItem =>
      isSlotWithItem(s) &&
      typeof s.metadata?.durability === 'number' &&
      s.metadata.durability < 100 &&
      (repairCosts.items[s.name] || repairCosts.default).length > 0
  );
  const repairCost = (s: SlotWithItem) => {
    const missing = (100 - (s.metadata?.durability ?? 100)) / 100;
    return (repairCosts.items[s.name] || repairCosts.default).map((m) => {
      const amount = Math.max(1, Math.ceil(m.amount * missing));
      return { ...m, amount, have: counts[m.name] || 0 };
    });
  };

  // ---------- Reciclar ----------
  const recyclable = Object.keys(recycleTable).filter((name) => (counts[name] || 0) > 0);

  return (
    <div className="rust-craft">
      <div className="rust-tabs">
        <button className={cat === 'favs' ? 'active' : ''} onClick={() => setCat('favs')}>
          Favoritos
        </button>
        {categories.map((c) => (
          <button key={c.id} className={cat === c.id ? 'active' : ''} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
        {bench.repair && (
          <button className={`special ${cat === 'repair' ? 'active' : ''}`} onClick={() => setCat('repair')}>
            🔧 Reparar
          </button>
        )}
        {bench.recycler && (
          <button className={`special ${cat === 'recycle' ? 'active' : ''}`} onClick={() => setCat('recycle')}>
            ♻ Reciclar
          </button>
        )}
      </div>

      {cat === 'repair' && (
        <div className="rust-list">
          {repairable.length === 0 && <div className="rust-empty">No tienes nada que reparar.</div>}
          {repairable.map((s) => {
            const cost = repairCost(s);
            const can = cost.every((c) => c.have >= c.amount);
            return (
              <div className="rust-row" key={s.slot}>
                <span className="ico" style={{ backgroundImage: img(s) }} />
                <div className="info">
                  <b>{itemLabel(s)}</b>
                  <div className="dur">
                    <div style={{ width: `${s.metadata?.durability}%` }} />
                  </div>
                  <small>
                    {cost.map((c) => (
                      <span key={c.name} className={c.have >= c.amount ? 'ok' : 'bad'}>
                        {c.amount} {c.label}{' '}
                      </span>
                    ))}
                  </small>
                </div>
                <button disabled={!can} onClick={() => run('rustcraftRepair', { slot: s.slot })}>
                  Reparar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {cat === 'recycle' && (
        <div className="rust-list">
          {recyclable.length === 0 && <div className="rust-empty">No tienes nada que se pueda reciclar.</div>}
          {recyclable.map((name) => {
            const have = counts[name] || 0;
            const n = Math.min(recycleQty[name] || 1, have);
            return (
              <div className="rust-row" key={name}>
                <span className="ico" style={{ backgroundImage: img(name) }} />
                <div className="info">
                  <b>
                    {Items[name]?.label || name} <small>(tienes {have})</small>
                  </b>
                  <small>
                    Da:{' '}
                    {recycleTable[name].map((o) => (
                      <span key={o.name} className="ok">
                        {o.amount * n} {o.label}{' '}
                      </span>
                    ))}
                  </small>
                </div>
                <input
                  className="rust-row-qty"
                  value={n}
                  onChange={(e) =>
                    setRecycleQty({ ...recycleQty, [name]: Math.max(1, Math.min(have, parseInt(e.target.value) || 1)) })
                  }
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <button onClick={() => setRecycleQty({ ...recycleQty, [name]: have })}>Todo</button>
                <button onClick={() => run('rustcraftRecycle', { name, amount: n })}>Reciclar</button>
              </div>
            );
          })}
        </div>
      )}

      {cat !== 'repair' && cat !== 'recycle' && (
        <>
          <input
            className="rust-search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />

          <div className="rust-recipes">
            {list.map((r) => {
              const reason = lockReason(r);
              return (
                <div
                  key={r.id}
                  className={`rust-recipe ${canMake(r) > 0 ? 'can' : 'cant'} ${sel === r.id ? 'sel' : ''}`}
                  style={{ backgroundImage: img(r.name) }}
                  title={reason ? `${r.label} — ${reason}` : `${r.label} (click derecho = craftear 1)`}
                  onClick={() => {
                    setSel(r.id);
                    setQty(1);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!reason) craft(r.id, 1);
                  }}
                >
                  {favs.includes(r.id) && <span className="star">★</span>}
                  {reason && <span className="lock">{r.blueprint && !r.learned ? '📜' : '🔒'}</span>}
                </div>
              );
            })}
            {list.length === 0 && <div className="rust-empty">No hay recetas aquí.</div>}
          </div>

          {recipe && (
            <div className="rust-detail">
              <div className="rust-detail-head">
                <div className="rust-detail-icon" style={{ backgroundImage: img(recipe.name) }} />
                <div>
                  <h3>
                    {recipe.label}
                    {recipe.count > 1 ? ` x${recipe.count}` : ''}
                  </h3>
                  <p>{recipe.description || ''}</p>
                </div>
                <button
                  className={`rust-fav ${favs.includes(recipe.id) ? 'on' : ''}`}
                  onClick={() => toggleFav(recipe.id)}
                  title="Favorito"
                >
                  ★
                </button>
              </div>
              <div className="rust-ing head">
                <span />
                <span>Material</span>
                <span>Total</span>
                <span>Tienes</span>
              </div>
              {recipe.ingredients.map((i) => {
                const need = i.amount * qty;
                return (
                  <div className="rust-ing" key={i.name}>
                    <span className="ico" style={{ backgroundImage: img(i.name) }} />
                    <span>{i.label}</span>
                    <span>{need}</span>
                    <span className={i.have >= need ? 'ok' : 'bad'}>{i.have}</span>
                  </div>
                );
              })}
              <div className="rust-actions">
                <div className="rust-qty">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                  <input
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <button onClick={() => setQty((q) => Math.min(100, q + 1))}>+</button>
                </div>
                <button className="rust-craft-btn" disabled={canMake(recipe) < qty} onClick={() => craft(recipe.id, qty)}>
                  Craftear · {fmtTime(recipe.time * qty)}
                </button>
              </div>
              <button
                className="rust-craft-all"
                disabled={canMake(recipe) < 1}
                onClick={() => craft(recipe.id, canMake(recipe))}
              >
                Craftear todo ({canMake(recipe)})
              </button>
              {lockReason(recipe) && <div className="rust-bench-req">{lockReason(recipe)}</div>}
            </div>
          )}
        </>
      )}

      {msg && <div className="rust-msg">{msg}</div>}

      <div className="rust-section-title">
        <span>Cola de crafteo</span>
        {queue.length > 0 && <small>Tiempo total: {fmtTime(totalLeft)}</small>}
      </div>
      <div className="rust-queue">
        {queue.map((j) => {
          const left = j.startedAt ? Math.max(0, j.time - (now - j.startedAt)) : j.time;
          return (
            <div
              key={j.id}
              className="rust-job"
              style={{ backgroundImage: img(j.name) }}
              title={`Cancelar ${j.label}`}
              onClick={() => cancel(j.id)}
            >
              <span className="x">✕</span>
              <span className="n">x{j.amount}</span>
              <span className="t">{fmtTime(left)}</span>
              {j.startedAt && <div className="bar" style={{ width: `${(1 - left / j.time) * 100}%` }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RustCrafting;

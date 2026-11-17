import { getRarity, rarityVar } from '../../helpers/rarity';
import Icon from './Icon';
import { faLock, faMinus, faPlus, faRecycle, faStar, faStopwatch, faWrench, faXmark } from '@fortawesome/free-solid-svg-icons';
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

// Pantalla de crafteo completa (mesa de trabajo, ox_target -> Craftear) o crafteo rápido (inventario: solo lo básico)
const RustCrafting: React.FC<{ visible: boolean; mode?: 'full' | 'quick' }> = ({ visible, mode = 'full' }) => {
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
  // false hasta que llegan las recetas: evita que el crafteo rápido muestre "no tienes materiales" un instante
  const [loaded, setLoaded] = useState(false);
  const [recycleTable, setRecycleTable] = useState<Record<string, Mat[]>>({});
  const [recycleQty, setRecycleQty] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const data = await fetchNui<{
      categories: Category[];
      recipes: RawRecipe[];
      bench?: BenchState;
      recycle?: Record<string, Mat[]>;
      error?: string;
    }>('rustcraftGetRecipes');
    if (!data || data.error) {
      setMsg(data?.error || '');
      return;
    }
    if (data.bench) setBench(data.bench);
    setLoaded(true);
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
    if (cat === 'recycle' && !bench.recycler) setCat('favs');
  }, [bench, cat]);

  // Los materiales se cuentan aquí con el inventario que ya tiene la interfaz
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const slot of playerItems) {
      if (isSlotWithItem(slot)) c[slot.name] = (c[slot.name] || 0) + slot.count;
    }
    return c;
  }, [playerItems]);

  // Como en Rust: solo sale lo que ya desbloqueaste (y lo que no necesita plano)
  const recipes = useMemo<Recipe[]>(
    () =>
      rawRecipes
        .filter((r) => !r.blueprint || r.learned)
        .map((r) => ({
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
    if (r.bench && !bench.ids[r.bench]) return `Requiere: ${r.benchLabel}`;
    if (r.level && bench.level < r.level) return `Requiere mesa de nivel ${r.level}`;
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

  // Si la seleccionada no está en la lista (p. ej. sin desbloquear), se muestra la primera
  const recipe = recipes.find((r) => r.id === sel) ?? list[0];
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

  // ---------- Reciclar ----------
  const recyclable = Object.keys(recycleTable).filter((name) => (counts[name] || 0) > 0);

  // Recetas por categoría (para el número al lado de cada categoría)
  const catCount = (id: string) =>
    id === 'favs' ? favs.length : id === 'all' ? recipes.length : recipes.filter((r) => r.category === id).length;

  // Objetos en cola
  const jobs = queue.map((j) => {
    const left = j.startedAt ? Math.max(0, j.time - (now - j.startedAt)) : j.time;
    return (
      <div
        key={j.id}
        className="rust-job"
        style={{ backgroundImage: img(j.name) }}
        title={`Cancelar ${j.label}`}
        onClick={() => cancel(j.id)}
      >
        <span className="x"><Icon icon={faXmark} /></span>
        <span className="n">x{j.amount}</span>
        {/* Tiempo restante en una etiqueta verde (sin barra de progreso) */}
        <span className={`rust-time ${j.startedAt ? 'run' : ''}`}>
          <Icon icon={faStopwatch} /> {fmtTime(left)}
        </span>
      </div>
    );
  });

  // ---------- Crafteo rápido: solo lo básico (recetas sin mesa ni plano) ----------
  if (mode === 'quick') {
    // Lo que se está crafteando sale encima del mismo icono (tiempo + cantidad)
    const crafting: Record<string, { left: number; amount: number; run: boolean }> = {};
    queue.forEach((j) => {
      const left = j.startedAt ? Math.max(0, j.time - (now - j.startedAt)) : j.time;
      const c = crafting[j.name];
      if (c) c.amount += j.amount;
      else crafting[j.name] = { left, amount: j.amount, run: !!j.startedAt };
    });
    const basic = recipes.filter((r) => !r.level && !r.bench && !r.blueprint);
    // Se muestra si puedes craftearlo o si ya se está crafteando (aunque te quedes sin materiales)
    const ready = basic.filter((r) => canMake(r) > 0 || crafting[r.name]);
    return (
      <div className="rust-quick">
        <div className="rust-section-title">
          <span>Crafteo rápido</span>
        </div>
        {!loaded ? null : ready.length === 0 ? (
          <div className="rust-quick-empty">
            Lo básico (vendas, cuchillo…) se craftea aquí. Lo demás, en una mesa de trabajo.
          </div>
        ) : (
          <div className="rust-quick-grid">
            {ready.map((r) => {
              const c = crafting[r.name];
              return (
                <div
                  key={r.id}
                  className="rust-quick-item"
                  style={{ backgroundImage: img(r.name) }}
                  title={`${r.label} (click = craftear 1)`}
                  onClick={() => canMake(r) > 0 && craft(r.id, 1)}
                >
                  {c && (
                    <>
                      <span className={`rust-time ${c.run ? 'run' : ''}`}>
                        <Icon icon={faStopwatch} /> {fmtTime(c.left)}
                      </span>
                      <span className="n">x{c.amount}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {msg && <div className="rust-msg">{msg}</div>}
      </div>
    );
  }

  return (
    <div className="rust-craft full">
      <div className="rust-tabs">
        {/* Mesa que tienes cerca: desbloquea recetas hasta su nivel */}
        <div className={`rust-bench-level ${bench.level ? 'on' : ''}`}>
          <Icon icon={faWrench} /> {bench.level ? `Mesa nivel ${bench.level}` : 'Sin mesa cerca'}
        </div>
        <button className={cat === 'favs' ? 'active' : ''} onClick={() => setCat('favs')}>
          <span>Favoritos</span>
          <small>{catCount('favs') || ''}</small>
        </button>
        {categories.map((c) => (
          <button key={c.id} className={cat === c.id ? 'active' : ''} onClick={() => setCat(c.id)}>
            <span>{c.label}</span>
            <small>{catCount(c.id) || ''}</small>
          </button>
        ))}
        {bench.recycler && (
          <button className={`special ${cat === 'recycle' ? 'active' : ''}`} onClick={() => setCat('recycle')}>
            <Icon icon={faRecycle} /> Reciclar
          </button>
        )}
      </div>

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

      {cat !== 'recycle' && (
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
                  data-rarity={getRarity(r.name)}
                  style={{ backgroundImage: img(r.name), ...rarityVar(getRarity(r.name)) }}
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
                  {favs.includes(r.id) && <span className="star"><Icon icon={faStar} /></span>}
                  {reason && <span className="lock"><Icon icon={faLock} /></span>}
                  {r.level ? <span className={`lvl ${bench.level >= r.level ? 'ok' : ''}`}>Nv {r.level}</span> : null}
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
                  <h3 className="rarity-text" style={rarityVar(getRarity(recipe.name))}>
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
                  <Icon icon={faStar} />
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
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Icon icon={faMinus} /></button>
                  <input
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <button onClick={() => setQty((q) => Math.min(100, q + 1))}><Icon icon={faPlus} /></button>
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
              {lockReason(recipe) && (
                <div className="rust-bench-req">
                  <Icon icon={faLock} /> {lockReason(recipe)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {msg && <div className="rust-msg">{msg}</div>}

      <div className="rust-queue-wrap">
      <div className="rust-section-title rust-queue-title">
        <span>Cola de crafteo</span>
        {queue.length > 0 && <small>Tiempo total: {fmtTime(totalLeft)}</small>}
      </div>
      <div className="rust-queue">{jobs}</div>
      </div>
    </div>
  );
};

export default RustCrafting;

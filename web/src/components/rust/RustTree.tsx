import Icon from './Icon';
import { faCheck, faLock, faSitemap, faXmark } from '@fortawesome/free-solid-svg-icons';
import React, { useCallback, useEffect, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { fetchNui } from '../../utils/fetchNui';
import { getItemUrl } from '../../helpers';

type Node = {
  name: string;
  label: string;
  cost: number;
  after?: string;
  afterLabel?: string;
  afterLevel?: number;
  afterLearned: boolean;
  learned: boolean;
};
type TreeData = { level: number; currency: string; have: number; nodes: Node[]; error?: string };

// Árbol de desbloqueos de una mesa de trabajo (ox_target -> Desbloquear). UI propia, sin inventario.
const RustTree: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TreeData | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const d = await fetchNui<TreeData>('rustTreeGet');
    if (!d || d.error) {
      setMsg(d?.error || 'No se pudo abrir');
      setData(null);
      return;
    }
    setData(d);
  }, []);

  useNuiEvent('rustTreeOpen', () => {
    setOpen(true);
    setSel(null);
    setMsg('');
    load();
  });

  const close = useCallback(() => {
    setOpen(false);
    fetchNui('rustTreeClose');
  }, []);

  // ESC o Retroceso cierran el árbol
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Backspace') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const nodes = data?.nodes || [];
  const inTree = new Set(nodes.map((n) => n.name));
  // Raíces: nodos sin "after" o cuyo "after" es de otra mesa (sale como requisito)
  const roots = nodes.filter((n) => !n.after || !inTree.has(n.after));
  const childrenOf = (name: string) => nodes.filter((n) => n.after === name);
  const selected = nodes.find((n) => n.name === sel);

  const state = (n: Node) => (n.learned ? 'learned' : n.afterLearned ? 'available' : 'locked');

  const unlock = async (n: Node) => {
    setMsg('');
    const res = await fetchNui<{ ok: boolean; error?: string }>('rustTreeUnlock', { name: n.name });
    if (!res?.ok) return setMsg(res?.error || 'No se pudo');
    load();
  };

  // Nodo + sus hijos debajo, unidos con líneas
  const Branch: React.FC<{ node: Node }> = ({ node }) => {
    const kids = childrenOf(node.name);
    const s = state(node);
    return (
      <div className="rust-tree-branch">
        <div
          className={`rust-tree-node ${s} ${sel === node.name ? 'sel' : ''}`}
          style={{ backgroundImage: `url(${getItemUrl(node.name)})` }}
          title={node.label}
          onClick={() => setSel(node.name)}
        >
          {s === 'locked' && (
            <span className="lock">
              <Icon icon={faLock} />
            </span>
          )}
          {s === 'learned' ? (
            <span className="tag ok">
              <Icon icon={faCheck} />
            </span>
          ) : (
            <span className="tag">{node.cost}</span>
          )}
        </div>
        {kids.length > 0 && (
          <div className={`rust-tree-kids ${kids.length > 1 ? 'many' : ''}`}>
            {kids.map((k) => (
              <Branch key={k.name} node={k} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rust-tree">
      <div className="rust-tree-head">
        <h2>
          <Icon icon={faSitemap} /> Desbloqueos · Mesa nivel {data?.level ?? '-'}
        </h2>
        {data && (
          <span className="have">
            {data.have} {data.currency}
          </span>
        )}
        <button className="close" onClick={close} title="Cerrar (ESC)">
          <Icon icon={faXmark} />
        </button>
      </div>

      <div className="rust-tree-body">
        <div className="rust-tree-map">
          {roots.length === 0 && <div className="rust-empty">Esta mesa no tiene nada que desbloquear.</div>}
          {roots.map((r) => (
            <Branch key={r.name} node={r} />
          ))}
        </div>

        <div className="rust-tree-side">
          {selected ? (
            <>
              <div className="icon" style={{ backgroundImage: `url(${getItemUrl(selected.name)})` }} />
              <h3>{selected.label}</h3>
              {/* Requisito = haber desbloqueado otro nodo antes (no tener el objeto) */}
              {selected.after && (
                <small className={selected.afterLearned ? 'ok' : 'bad'}>
                  {selected.afterLearned ? 'Desbloqueado antes: ' : 'Primero desbloquea: '}
                  {selected.afterLabel}
                  {selected.afterLevel && selected.afterLevel !== data?.level
                    ? ` (mesa nivel ${selected.afterLevel})`
                    : ''}
                </small>
              )}
              {selected.learned ? (
                <div className="done">
                  <Icon icon={faCheck} /> Desbloqueado
                </div>
              ) : (
                <button
                  className="rust-craft-btn"
                  disabled={!selected.afterLearned || (data?.have ?? 0) < selected.cost}
                  onClick={() => unlock(selected)}
                >
                  Desbloquear · {selected.cost} {data?.currency}
                </button>
              )}
            </>
          ) : (
            <small>Elige un objeto del árbol para ver qué necesitas.</small>
          )}
          {msg && <div className="rust-msg">{msg}</div>}
        </div>
      </div>
    </div>
  );
};

export default RustTree;

import Icon from './Icon';
import { faPowerOff, faRecycle } from '@fortawesome/free-solid-svg-icons';
import React, { useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import useNuiEvent from '../../hooks/useNuiEvent';
import { fetchNui } from '../../utils/fetchNui';
import { getItemUrl } from '../../helpers';
import { DragSource, SlotWithItem } from '../../typings';

type RecSlot = { slot: number; name: string; label: string; count: number; metadata?: Record<string, any> } | false;
type RecState = { input: RecSlot[]; output: RecSlot[]; on: boolean; time: number };
type Result = { ok: boolean; error?: string; item?: RecState };

const EMPTY: RecState = { input: [], output: [], on: false, time: 5 };
const img = (s: Exclude<RecSlot, false>) => `url(${getItemUrl({ ...s, weight: 0 } as SlotWithItem)})`;

// Reciclador (ox_target): entrada -> encender -> salida. UI propia como la mesa de reparación
const RustRecycler: React.FC = () => {
  const [state, setState] = useState<RecState>(EMPTY);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchNui<RecState>('rustRecycleGet').then((d) => d && d.input && setState(d));
  }, []);
  // El servidor avisa cada vez que recicla algo o se apaga
  useNuiEvent<RecState>('rustRecycleUpdate', setState);

  const run = async (event: string, payload: unknown = {}) => {
    setMsg('');
    const res = await fetchNui<Result>(event, payload);
    if (!res?.ok) return setMsg(res?.error || 'No se pudo');
    if (res.item) setState(res.item);
  };

  // Soltar un objeto de tu inventario en la entrada
  const [{ isOver }, drop] = useDrop<DragSource, void, { isOver: boolean }>(
    () => ({
      accept: 'SLOT',
      collect: (m) => ({ isOver: m.isOver() }),
      canDrop: (source) => source.inventory === 'player',
      drop: (source) => {
        run('rustRecyclePut', { slot: source.item.slot });
      },
    }),
    []
  );

  const grid = (kind: 'in' | 'out', slots: RecSlot[]) =>
    Array.from({ length: 6 }, (_, i) => {
      const s = slots[i];
      return (
        <div
          key={i}
          className={`rust-rec-slot ${s ? 'full' : ''}`}
          style={s ? { backgroundImage: img(s) } : undefined}
          title={s ? `${s.label} · click para sacarlo` : undefined}
          onClick={() => s && run('rustRecycleTake', { kind, slot: s.slot })}
        >
          {s && s.count > 1 && <span className="n">x{s.count}</span>}
        </div>
      );
    });

  const hasInput = state.input.some(Boolean);

  return (
    <div className="rust-recycler">
      <div className="rust-section-title">
        <span>
          <Icon icon={faRecycle} /> Reciclador
        </span>
      </div>

      <div className="rust-rec-box">
        <div className="head">Entrada</div>
        <div
          ref={(el) => {
            drop(el);
          }}
          className={`rust-rec-grid ${isOver ? 'over' : ''}`}
        >
          {grid('in', state.input)}
        </div>
      </div>

      <div className="rust-rec-box">
        <div className="head">Salida</div>
        <div className="rust-rec-grid out">{grid('out', state.output)}</div>
      </div>

      <div className="rust-rec-box">
        <div className="head">Controles</div>
        <div className="rust-rec-controls">
          <button
            className={`rust-rec-power ${state.on ? 'on' : ''}`}
            disabled={!state.on && !hasInput}
            onClick={() => run('rustRecycleToggle', { on: !state.on })}
          >
            <Icon icon={faPowerOff} /> {state.on ? 'Apagar' : 'Encender'}
          </button>
          <p>
            {state.on
              ? `Reciclando… 1 unidad cada ${state.time}s.`
              : 'El reciclador está apagado. Mete objetos en la entrada y enciéndelo.'}
          </p>
        </div>
      </div>

      {msg && <div className="rust-msg">{msg}</div>}
    </div>
  );
};

export default RustRecycler;

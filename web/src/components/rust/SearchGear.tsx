import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import useNuiEvent from '../../hooks/useNuiEvent';
import { getItemUrl } from '../../helpers';

type Gear = { vest?: number; backpack?: { name: string; label: string } } | false;

/** Al registrar a otro jugador: su equipo puesto (chaleco y mochila) para quitárselo */
const SearchGear: React.FC<{ target: string }> = ({ target }) => {
  const [gear, setGear] = useState<Gear>(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => setGear((await fetchNui<Gear>('rustSearchGear', { target })) || false), [target]);

  useEffect(() => {
    load();
  }, [load]);

  // si su inventario cambia (alguien movió su mochila, etc.) se vuelve a revisar,
  // agrupando varios cambios seguidos en una sola consulta al servidor
  const timer = useRef<number | undefined>(undefined);
  useNuiEvent('refreshSlots', () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(load, 300);
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const takeOff = async (what: 'vest' | 'backpack') => {
    const res = await fetchNui<{ ok: boolean; error?: string }>('rustSearchTake', { target, what });
    setMsg(res && !res.ok ? res.error || 'No se pudo' : '');
    load();
  };

  if (!gear || (gear.vest === undefined && !gear.backpack)) return null;

  return (
    <div className="rust-gear">
      <div className="rust-section-title">
        <span>Equipo puesto</span>
        <small>Click para quitárselo</small>
      </div>
      <div className="rust-gear-list">
        {gear.vest !== undefined && (
          <div className="rust-gear-item" style={{ backgroundImage: `url(${getItemUrl('armour')})` }} onClick={() => takeOff('vest')}>
            <span>Chaleco · {gear.vest}%</span>
          </div>
        )}
        {gear.backpack && (
          <div
            className="rust-gear-item"
            style={{ backgroundImage: `url(${getItemUrl(gear.backpack.name)})` }}
            onClick={() => takeOff('backpack')}
          >
            <span>{gear.backpack.label}</span>
          </div>
        )}
      </div>
      {msg && <div className="rust-msg">{msg}</div>}
    </div>
  );
};

export default SearchGear;

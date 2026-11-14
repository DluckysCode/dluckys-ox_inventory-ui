import { useEffect } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import { startCraftSound, stopCraftSound } from './sounds';

// Siempre montado (aunque el inventario esté cerrado): suena mientras haya algo crafteándose
const CraftSoundPlayer: React.FC = () => {
  useNuiEvent<{ queue: { startedAt?: number }[] }>('rustcraftQueue', (d) => {
    if ((d.queue || []).some((j) => j.startedAt)) startCraftSound();
    else stopCraftSound();
  });

  useEffect(() => stopCraftSound, []);
  return null;
};

export default CraftSoundPlayer;

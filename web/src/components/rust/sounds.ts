// Sonido de la interfaz (archivo en ox_inventory/web/sounds/):
// - mecanico.mp3: en bucle mientras hay algo crafteándose

const VOLUME = 0.5; // 0.0 - 1.0

// La interfaz está en web/build/, los sonidos en web/sounds/
const url = (file: string) => `../sounds/${file}`;

let mechanic: HTMLAudioElement | null = null;

export const startCraftSound = () => {
  if (!mechanic) {
    mechanic = new Audio(url('mecanico.mp3'));
    mechanic.loop = true;
  }
  mechanic.volume = VOLUME;
  if (mechanic.paused) mechanic.play().catch(() => {});
};

export const stopCraftSound = () => {
  if (!mechanic) return;
  mechanic.pause();
  mechanic.currentTime = 0;
};

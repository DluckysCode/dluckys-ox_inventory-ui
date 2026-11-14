// Sonidos de la interfaz (archivos en ox_inventory/web/sounds/):
// - mecanico.mp3: en bucle mientras hay algo crafteándose
// - zipper.mp3:   al abrir / cerrar la mochila

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

/** Al cerrar suena un poco más rápido para diferenciarlo de abrir */
export const playZipper = (open: boolean) => {
  const zip = new Audio(url('zipper.mp3'));
  zip.volume = VOLUME;
  zip.playbackRate = open ? 1 : 1.2;
  zip.play().catch(() => {});
};

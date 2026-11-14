// Sonidos generados con Web Audio (sin archivos): mecánico mientras se craftea y zíper de la mochila.

const VOLUME = 0.35; // 0.0 - 1.0

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

const getCtx = () => {
  if (!ctx) {
    ctx = new AudioContext();
    // 30 ms de ruido blanco que se reutiliza para cada golpe
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

/** Golpe corto de ruido filtrado (base del trinquete y del zíper) */
const tick = (when: number, freq: number, q: number, length: number, volume: number) => {
  const ac = ctx!;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = q;
  const env = ac.createGain();
  env.gain.setValueAtTime(volume, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + length);
  src.connect(band).connect(env).connect(ac.destination);
  src.start(when);
  src.stop(when + length + 0.01);
};

const tone = (when: number, type: OscillatorType, freq: number, volume: number, length: number) => {
  const ac = ctx!;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(volume, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + length);
  osc.connect(g).connect(ac.destination);
  osc.start(when);
  osc.stop(when + length + 0.01);
};

// ---------------------------------------------------------------------
// Mecánico (llave de trinquete): ráfagas de 3-6 clicks con pausas al azar
// ---------------------------------------------------------------------
let timer: number | null = null;
let running = false;

const burst = () => {
  if (!running) return;
  const start = getCtx().currentTime + 0.02;
  const clicks = 3 + Math.floor(Math.random() * 4);
  const gap = 0.055 + Math.random() * 0.02;

  for (let i = 0; i < clicks; i++) {
    const t = start + i * gap;
    const s = 0.8 + Math.random() * 0.4;
    tick(t, 2600 + Math.random() * 900, 6, 0.025, VOLUME * s);
    tone(t, 'triangle', 1700 + Math.random() * 500, VOLUME * s * 0.25, 0.06); // resonancia metálica
  }
  // de vez en cuando, herramienta contra metal
  if (Math.random() < 0.2) {
    const t = start + clicks * gap + 0.08;
    [420, 760, 1130].forEach((f) => tone(t, 'sine', f * (0.95 + Math.random() * 0.1), VOLUME * 0.18, 0.25));
  }

  timer = window.setTimeout(burst, clicks * gap * 1000 + 250 + Math.random() * 450);
};

export const startCraftSound = () => {
  if (running) return;
  running = true;
  try {
    burst();
  } catch {
    running = false;
  }
};

export const stopCraftSound = () => {
  running = false;
  if (timer) window.clearTimeout(timer);
  timer = null;
};

// ---------------------------------------------------------------------
// Zíper: ~30 dientes rápidos; al abrir sube de tono, al cerrar baja
// ---------------------------------------------------------------------
export const playZipper = (open: boolean) => {
  try {
    const start = getCtx().currentTime + 0.01;
    const teeth = 30;
    for (let i = 0; i < teeth; i++) {
      const p = i / (teeth - 1);
      const t = start + 0.35 * (p * (0.7 + 0.3 * p)); // se acelera un poco al final
      const freq = open ? 3200 + p * 2200 : 5400 - p * 2200;
      tick(t, freq + Math.random() * 400, 3, 0.012, VOLUME * (0.5 + Math.random() * 0.3));
    }
  } catch {
    /* sin audio */
  }
};

// Sonido de "mecánico" (llave de trinquete) generado con Web Audio, sin archivos.
// Ráfagas de 3-6 clicks metálicos con pausas al azar, como alguien apretando tornillos.

const VOLUME = 0.35; // 0.0 - 1.0

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let timer: number | null = null;
let running = false;

const getCtx = () => {
  if (!ctx) {
    ctx = new AudioContext();
    // 30 ms de ruido blanco que se reutiliza para cada click
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

/** Un click metálico: ruido filtrado + un "ting" corto */
const click = (when: number, strength = 1) => {
  const ac = ctx!;
  const out = ac.createGain();
  out.gain.value = VOLUME * strength;
  out.connect(ac.destination);

  // golpe de los dientes del trinquete
  const src = ac.createBufferSource();
  src.buffer = noise;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2600 + Math.random() * 900;
  band.Q.value = 6;
  const env = ac.createGain();
  env.gain.setValueAtTime(1, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + 0.025);
  src.connect(band).connect(env).connect(out);
  src.start(when);
  src.stop(when + 0.03);

  // resonancia metálica
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 1700 + Math.random() * 500;
  const ring = ac.createGain();
  ring.gain.setValueAtTime(0.25, when);
  ring.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
  osc.connect(ring).connect(out);
  osc.start(when);
  osc.stop(when + 0.07);
};

/** Golpe más grave de vez en cuando (herramienta contra metal) */
const clank = (when: number) => {
  const ac = ctx!;
  const out = ac.createGain();
  out.gain.value = VOLUME * 0.6;
  out.connect(ac.destination);
  [420, 760, 1130].forEach((f) => {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f * (0.95 + Math.random() * 0.1);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.3, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
    osc.connect(g).connect(out);
    osc.start(when);
    osc.stop(when + 0.3);
  });
};

const burst = () => {
  if (!running) return;
  const ac = getCtx();
  const start = ac.currentTime + 0.02;
  const clicks = 3 + Math.floor(Math.random() * 4);
  const gap = 0.055 + Math.random() * 0.02;
  for (let i = 0; i < clicks; i++) click(start + i * gap, 0.8 + Math.random() * 0.4);
  if (Math.random() < 0.2) clank(start + clicks * gap + 0.08);

  const pause = clicks * gap * 1000 + 250 + Math.random() * 450;
  timer = window.setTimeout(burst, pause);
};

export const startCraftSound = () => {
  if (running) return;
  running = true;
  try {
    getCtx();
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

import { imagepath } from '../../store/imagepath';

// Icono de cada ranura de ropa: la imagen PNG de la prenda (image en data/rust_clothing.lua)
// o, si la ranura no tiene imagen, un dibujo de líneas (SVG en línea, no depende de archivos).
const paths: Record<string, string> = {
  vest: '<path d="M22 10v8l-8 6v30h36V24l-8-6v-8"/><path d="M22 10c2 8 18 8 20 0"/><path d="M20 34h24M20 44h24"/>',
  accessory: '<path d="M16 18c4 14 28 14 32 0"/><circle cx="32" cy="38" r="7"/><path d="M32 31v-4"/>',
  // cualquier otra ranura sin imagen
  default: '<path d="M24 12l-12 6-4 12 8 2v22h32V32l8-2-4-12-12-6"/><path d="M24 12c2 5 14 5 16 0"/>',
};

const cache: Record<string, string> = {};

const lineIcon = (id: string) => {
  if (!cache[id]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#e1ddd1" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${paths[id] || paths.default}</svg>`;
    cache[id] = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }
  return cache[id];
};

export const clothingIcon = (slot: { id: string; image?: string }) =>
  slot.image ? `url("${imagepath}/${slot.image}.png")` : lineIcon(slot.id);

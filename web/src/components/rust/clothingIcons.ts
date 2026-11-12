// Iconos de las ranuras de ropa (SVG en línea, no dependen de archivos)
const paths: Record<string, string> = {
  hat: '<path d="M14 40c0-12 8-22 18-22s18 10 18 22"/><path d="M8 42h48"/><path d="M20 30c4-2 20-2 24 0"/>',
  mask: '<path d="M14 22c6-4 30-4 36 0v10c0 12-8 20-18 20S14 44 14 32z"/><path d="M22 30h7M35 30h7"/><path d="M26 42c4 2 8 2 12 0"/>',
  jacket: '<path d="M24 10l-12 6-6 20 8 2v18h36V38l8-2-6-20-12-6"/><path d="M24 10c2 6 14 6 16 0"/><path d="M32 16v40"/>',
  shirt: '<path d="M24 12l-12 6-4 12 8 2v22h32V32l8-2-4-12-12-6"/><path d="M24 12c2 5 14 5 16 0"/>',
  vest: '<path d="M22 10v8l-8 6v30h36V24l-8-6v-8"/><path d="M22 10c2 8 18 8 20 0"/><path d="M20 34h24M20 44h24"/>',
  accessory: '<path d="M16 18c4 14 28 14 32 0"/><circle cx="32" cy="38" r="7"/><path d="M32 31v-4"/>',
  legs: '<path d="M18 8h28l4 48h-12l-6-30-6 30H14z"/><path d="M18 16h28"/>',
  bag: '<rect x="14" y="18" width="36" height="38" rx="6"/><path d="M24 18v-4a8 8 0 0116 0v4"/><path d="M22 34h20v10H22z"/>',
  shoes: '<path d="M8 40h18l4-4 10 6 14 2c2 0 3 2 3 4v4H8z"/><path d="M8 48h49"/><path d="M14 40V26h12v10"/>',
  glasses: '<circle cx="20" cy="34" r="9"/><circle cx="44" cy="34" r="9"/><path d="M29 33c2-2 4-2 6 0"/><path d="M11 32L6 24M53 32l5-8"/>',
};

export const clothingIcon = (id: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#e1ddd1" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${paths[id] || ''}</svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
};

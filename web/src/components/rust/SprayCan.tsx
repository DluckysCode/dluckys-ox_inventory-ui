import React from 'react';

/**
 * Lata de spray dibujada en SVG (propia, sin marcas). "color" pinta la tapa, la franja y la etiqueta.
 * El cuerpo es metálico (degradado gris) para que se vea como una lata real.
 */
const SprayCan: React.FC<{ color: string; id: number }> = ({ color, id }) => {
  const metal = `spray-metal-${id}`;
  const paint = `spray-paint-${id}`;
  const shine = `spray-shine-${id}`;
  return (
    <svg className="rust-spray" viewBox="0 0 64 100" aria-hidden="true">
      <defs>
        {/* Cuerpo metálico: oscuro en los bordes, claro en el centro */}
        <linearGradient id={metal} x1="0" x2="1">
          <stop offset="0" stopColor="#6f7377" />
          <stop offset="0.35" stopColor="#e9ecee" />
          <stop offset="0.6" stopColor="#c3c7ca" />
          <stop offset="1" stopColor="#5c6064" />
        </linearGradient>
        {/* Pintura con volumen: el mismo color con sombra a los lados */}
        <linearGradient id={paint} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.75" />
          <stop offset="0.4" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={shine} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sombra en el suelo */}
      <ellipse cx="32" cy="96" rx="20" ry="3" fill="#000" opacity="0.35" />

      {/* Boquilla */}
      <rect x="27" y="4" width="10" height="8" rx="2" fill="#d9dcde" stroke="#555" strokeWidth="0.8" />
      <rect x="35" y="6" width="4" height="2.4" rx="1" fill="#444" />

      {/* Tapa / hombro de la lata (color) */}
      <path d="M14 26 C14 16 50 16 50 26 Z" fill={`url(#${paint})`} stroke="#222" strokeWidth="0.8" />
      <rect x="22" y="11" width="20" height="8" rx="3" fill={`url(#${metal})`} stroke="#555" strokeWidth="0.8" />

      {/* Cuerpo metálico */}
      <rect x="14" y="26" width="36" height="66" rx="3" fill={`url(#${metal})`} stroke="#3a3d40" strokeWidth="0.9" />

      {/* Etiqueta y franjas del color */}
      <rect x="14" y="40" width="36" height="34" fill={`url(#${paint})`} />
      <rect x="14" y="36" width="36" height="2.5" fill={color} opacity="0.9" />
      <rect x="14" y="77" width="36" height="2.5" fill={color} opacity="0.9" />
      {/* Gota de pintura en la etiqueta */}
      <path d="M32 47 C28 53 26 56 26 59 A6 6 0 0 0 38 59 C38 56 36 53 32 47 Z" fill="#fff" opacity="0.85" />

      {/* Borde inferior y brillo */}
      <rect x="14" y="88" width="36" height="4" rx="2" fill="#4a4d50" />
      <rect x="22" y="26" width="7" height="62" fill={`url(#${shine})`} />
    </svg>
  );
};

export default SprayCan;

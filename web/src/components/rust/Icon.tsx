import React from 'react';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

/**
 * Icono de Font Awesome (gratis, CC BY 4.0) dibujado como SVG.
 * Se usan solo las definiciones de @fortawesome/free-solid-svg-icons, sin la librería base
 * (así la interfaz pesa ~80 KB menos).
 */
const Icon: React.FC<{ icon: IconDefinition }> = ({ icon }) => {
  const [width, height, , , path] = icon.icon;
  return (
    <svg className="rust-icon" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {(Array.isArray(path) ? path : [path]).map((d, i) => (
        <path key={i} fill="currentColor" d={d} />
      ))}
    </svg>
  );
};

export default Icon;

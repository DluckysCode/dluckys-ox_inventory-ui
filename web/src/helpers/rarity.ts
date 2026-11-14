import type React from 'react';
import { Items } from '../store/items';

// Rarezas: en data/items.lua pon rarity = 'uncommon' | 'rare' | 'epic' | 'legendary' (sin nada = común).
// Un item concreto puede cambiarla con metadata.rarity
export const RARITIES = {
  common: { label: 'Común', color: '#a3a7ab' },
  uncommon: { label: 'Poco común', color: '#5cb85c' },
  rare: { label: 'Raro', color: '#3d8bff' },
  epic: { label: 'Épico', color: '#a55eea' },
  legendary: { label: 'Legendario', color: '#f5b82e' },
} as const;

export type Rarity = keyof typeof RARITIES;

export const getRarity = (name?: string, metadata?: { rarity?: string }): Rarity => {
  const r = metadata?.rarity || (name ? Items[name]?.rarity : undefined);
  return r && r in RARITIES ? (r as Rarity) : 'common';
};

export const rarityVar = (r: Rarity) => ({ '--rarity': RARITIES[r].color }) as React.CSSProperties;

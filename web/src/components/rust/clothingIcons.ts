import { imagepath } from '../../store/imagepath';

/** Icono de cada ranura de ropa: la imagen de la prenda (image en data/rust_clothing.lua) o prenda.png */
export const clothingIcon = (slot: { image?: string }) => `url("${imagepath}/${slot.image || 'prenda'}.png")`;

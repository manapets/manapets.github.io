/**
 * Configuración global de la tienda.
 *
 * Los datos se editan desde el panel de administración: /admin → "Ajustes de la tienda".
 * El archivo con los valores es src/content/settings/store.json.
 * Este módulo lo expone con los nombres que ya usa el resto del sitio.
 */
import storeData from './content/settings/store.json';

const { discountCodes, ...store } = storeData;

export const STORE = store;

/** Códigos de descuento válidos (código en mayúsculas → tasa, ej: 0.1 = 10%). */
export const DISCOUNT_CODES: Record<string, number> = Object.fromEntries(
  discountCodes.map(({ code, rate }) => [code.trim().toUpperCase(), rate]),
);

export type Store = typeof STORE;

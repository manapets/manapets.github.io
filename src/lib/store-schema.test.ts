import { describe, it, expect } from 'vitest';
import { storeSchema } from './store-schema';
import store from '../content/settings/store.json';

describe('ajustes de la tienda', () => {
  it('src/content/settings/store.json es válido', () => {
    const result = storeSchema.safeParse(store);
    if (!result.success) {
      // Muestra el detalle del error para que sea fácil de corregir.
      throw new Error(`Ajustes inválidos: ${JSON.stringify(result.error.issues, null, 2)}`);
    }
    expect(result.success).toBe(true);
  });

  it('el teléfono de WhatsApp no tiene símbolos', () => {
    expect(store.whatsappPhone).toMatch(/^\d+$/);
  });

  it('rechaza un teléfono con "+" o espacios', () => {
    expect(storeSchema.safeParse({ ...store, whatsappPhone: '+54 9 261' }).success).toBe(false);
  });
});

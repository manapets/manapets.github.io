import { z } from 'astro/zod';

/**
 * Esquema de los "Ajustes de la tienda" (src/content/settings/store.json).
 *
 * Este archivo lo edita el panel de administración (/admin → Ajustes de la
 * tienda). El esquema se usa en los tests para detectar errores de tipeo antes
 * de compilar; el sitio lo lee desde src/config.ts.
 */
export const storeSchema = z.object({
  /** Nombre que aparece en el header, footer y mensajes de WhatsApp. */
  name: z.string().min(1),
  /** Frase corta que aparece bajo el nombre / en el hero. */
  tagline: z.string(),
  /** Descripción usada en metadatos SEO. */
  description: z.string(),
  /** Ciudad que se muestra en el pill del header. */
  city: z.string(),
  /** Dirección del depósito (retiro en persona). */
  address: z.string(),
  /** WhatsApp: código de país + área + número, sin "+", espacios ni guiones. */
  whatsappPhone: z.string().regex(/^\d{8,15}$/, 'whatsappPhone debe contener solo números (8 a 15 dígitos)'),
  /** Encabezado del mensaje de WhatsApp. {store} se reemplaza por el nombre. */
  whatsappGreeting: z.string(),
  /** Moneda por defecto (código ISO 4217). */
  currency: z.string().length(3),
  /** Locale para formatear precios y fechas. */
  locale: z.string().min(2),
  /** Email de contacto. Vacío = se oculta. */
  email: z.string(),
  /** Redes sociales. Vacío = se ocultan. */
  instagram: z.string(),
  facebook: z.string(),
  /** Nota de envío que aparece en el carrito. */
  shippingNote: z.string(),
  /** Objetivo de compra para el envío gratis (ARS). */
  freeShippingGoal: z.number().nonnegative(),
  /** Objetivo de compra para las cuotas sin interés (ARS). */
  installmentsGoal: z.number().nonnegative(),
  /** Cantidad de cuotas sin interés. */
  installmentsCount: z.number().int().positive(),
  /** Porcentaje de reintegro para la próxima compra (0.05 = 5%). */
  reintegroRate: z.number().nonnegative(),
  /** Códigos de descuento válidos. */
  discountCodes: z.array(
    z.object({
      code: z.string().min(1),
      rate: z.number().nonnegative(),
    }),
  ),
});

export type StoreSettings = z.infer<typeof storeSchema>;

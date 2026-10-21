import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { productSchema } from './lib/product-schema';

/**
 * Preguntas frecuentes.
 * Cada archivo .json dentro de src/content/faqs es una pregunta.
 * El campo `id` define el ancla de la URL (ej: /#faq-id) y el nombre del archivo.
 */
const faqs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faqs' }),
  schema: z.object({
    /** Identificador del ancla (sin espacios ni acentos). Ej: "envio-gratis" → /#faq-envio-gratis */
    id: z.string().min(1),
    /** Orden de aparición (menor primero). */
    order: z.number().int().nonnegative().default(0),
    /** La pregunta. */
    question: z.string().min(1),
    /** La respuesta. */
    answer: z.string().min(1),
  }),
});

/**
 * El panel de administración (/admin) guarda los campos vacíos como "" o null
 * y las listas vacías como []. Los tratamos como "sin valor" antes de validar,
 * así un producto guardado desde el panel sigue siendo válido.
 */
function pruneEmpty(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const items = value.map(pruneEmpty).filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }

  if (typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const item = pruneEmpty(raw);
      if (item !== undefined) clean[key] = item;
    }
    return clean;
  }

  return value;
}

/**
 * Colección de productos.
 * Cada archivo .json dentro de src/content/products es un producto.
 * El nombre del archivo (sin .json) es el "id" y se usa en la URL: /productos/<id>
 */
const products = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/products' }),
  schema: z.preprocess(pruneEmpty, productSchema),
});

export const collections = { products, faqs };

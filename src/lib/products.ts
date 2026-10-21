import type { CollectionEntry } from 'astro:content';
import {
  inCollection,
  matchesFilters,
  type CatalogFilters,
  type CatalogProduct,
  type CollectionSlug,
} from './catalog';

export type ProductEntry = CollectionEntry<'products'>;

/** Adaptador: entrada de la colección → datos de catálogo (con id incluido). */
export function toCatalogProduct(entry: ProductEntry): CatalogProduct {
  const data = entry.data;
  return {
    id: entry.id,
    name: data.name,
    brand: data.brand,
    species: data.species,
    category: data.category,
    foodType: data.foodType,
    price: data.price,
    compareAtPrice: data.compareAtPrice,
    bonusKg: data.bonusKg,
    tags: data.tags,
    featured: data.featured,
  };
}

/** Filtra entradas de la colección con los mismos filtros del catálogo. */
export function filterEntries(
  entries: ProductEntry[],
  filters: CatalogFilters = {},
): ProductEntry[] {
  return entries.filter((entry) => matchesFilters(toCatalogProduct(entry), filters));
}

/** Entradas que pertenecen a una colección. */
export function collectionEntries(
  entries: ProductEntry[],
  slug: CollectionSlug,
): ProductEntry[] {
  return entries.filter((entry) => inCollection(toCatalogProduct(entry), slug));
}

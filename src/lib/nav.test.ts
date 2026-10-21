import { describe, it, expect } from 'vitest';
import { COLLECTIONS, CATEGORIES, BRANDS, NAV } from './nav';
import { slugify, slugifyCategory } from './catalog';

describe('COLLECTIONS', () => {
  it('expone las tres colecciones esperadas con href coherente', () => {
    expect(COLLECTIONS.map((c) => c.slug)).toEqual(['novedades', 'mas-vendidos', 'liquidacion']);
    for (const collection of COLLECTIONS) {
      expect(collection.href).toBe(`/collections/${collection.slug}`);
    }
  });
});

describe('CATEGORIES y BRANDS', () => {
  it('los slugs coinciden con slugify del nombre', () => {
    for (const category of CATEGORIES) {
      expect(category.slug).toBe(slugify(category.name));
    }
    for (const brand of BRANDS) {
      expect(brand.slug).toBe(slugify(brand.name));
    }
  });
});

describe('NAV', () => {
  const links = NAV.flatMap((item) => [item, ...(item.children ?? [])]);

  it('los params cat/marca usan el slug canónico', () => {
    const paramLinks = links.filter((link) => link.href.includes('/productos/?'));
    expect(paramLinks.length).toBeGreaterThan(0);

    for (const link of paramLinks) {
      const params = new URLSearchParams(link.href.split('?')[1]);
      const cat = params.get('cat');
      const marca = params.get('marca');
      if (cat) {
        expect(slugifyCategory(cat)).toBe(cat);
        expect(CATEGORIES.map((c) => c.slug)).toContain(cat);
      }
      if (marca) {
        expect(slugifyCategory(marca)).toBe(marca);
        expect(BRANDS.map((b) => b.slug)).toContain(marca);
      }
    }
  });
});

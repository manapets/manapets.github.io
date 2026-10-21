import type { CollectionSlug } from './catalog';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavLink[];
}

export interface CollectionDef {
  slug: CollectionSlug;
  title: string;
  text: string;
  teaser: string;
  href: string;
  image: string;
}

export const COLLECTIONS: CollectionDef[] = [
  {
    slug: 'novedades',
    title: 'Novedades',
    text: 'Lo último que llegó al depósito de Guaymallén.',
    teaser: 'Lo último que llegó al depósito',
    href: '/collections/novedades',
    image: '/images/categories/gatos.svg',
  },
  {
    slug: 'mas-vendidos',
    title: 'Más vendidos',
    text: 'Los productos que todos nos piden.',
    teaser: 'Los que todos nos piden',
    href: '/collections/mas-vendidos',
    image: '/images/categories/perros.svg',
  },
  {
    slug: 'liquidacion',
    title: 'Liquidación',
    text: 'Ofertas con descuento que no vuelven. Hasta agotar stock.',
    teaser: 'Ofertas que no vuelven',
    href: '/collections/liquidacion',
    image: '/images/hero/hero-1.svg',
  },
];

export const NAV: NavItem[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Perros',
    href: '/perros',
    children: [
      { label: 'Alimentos Secos', href: '/productos/?especie=perro&cat=alimentos-secos' },
      { label: 'Alimentos Húmedos', href: '/productos/?especie=perro&cat=alimentos-humedos' },
      { label: 'Camas', href: '/productos/?especie=perro&cat=camas' },
      { label: 'Higiene', href: '/productos/?especie=perro&cat=higiene' },
      { label: 'Snacks', href: '/productos/?especie=perro&cat=snacks' },
    ],
  },
  {
    label: 'Gatos',
    href: '/gatos',
    children: [
      { label: 'Alimentos Secos', href: '/productos/?especie=gato&cat=alimentos-secos' },
      { label: 'Alimentos Húmedos', href: '/productos/?especie=gato&cat=alimentos-humedos' },
      { label: 'Camas', href: '/productos/?especie=gato&cat=camas' },
      { label: 'Piedras Sanitarias', href: '/productos/?especie=gato&cat=piedras-sanitarias' },
      { label: 'Rascadores', href: '/productos/?especie=gato&cat=rascadores' },
      { label: 'Snacks', href: '/productos/?especie=gato&cat=snacks' },
    ],
  },
  { label: 'Marcas', href: '/marcas' },
  { label: 'KGs de regalo', href: '/productos/?promo=kg' },
  { label: 'Liquidación', href: '/collections/liquidacion' },
];

export interface Brand {
  name: string;
  slug: string;
}

export const BRANDS: Brand[] = [
  { name: 'Royal Canin', slug: 'royal-canin' },
  { name: 'Agility', slug: 'agility' },
  { name: 'Sieger', slug: 'sieger' },
  { name: 'Old Prince', slug: 'old-prince' },
  { name: 'Ken L', slug: 'ken-l' },
  { name: 'Pro Plan', slug: 'pro-plan' },
  { name: 'Excellent', slug: 'excellent' },
  { name: 'Eukanuba', slug: 'eukanuba' },
  { name: 'Patitas', slug: 'patitas' },
];

export interface Category {
  name: string;
  slug: string;
}

export const CATEGORIES: Category[] = [
  { name: 'Alimentos Secos', slug: 'alimentos-secos' },
  { name: 'Alimentos Húmedos', slug: 'alimentos-humedos' },
  { name: 'Camas', slug: 'camas' },
  { name: 'Higiene', slug: 'higiene' },
  { name: 'Snacks', slug: 'snacks' },
  { name: 'Piedras Sanitarias', slug: 'piedras-sanitarias' },
  { name: 'Rascadores', slug: 'rascadores' },
];

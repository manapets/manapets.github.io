import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PRODUCTS_DIR = join(ROOT, 'src', 'content', 'products');
const IMAGES = join(ROOT, 'public', 'images');

const VIEWS = ['Frente', 'Lateral', 'Detalle'];

const NAVY = ['#0D2B3E', '#123A50', '#1D4C63'];
const ACCENTS = ['#F58A3C', '#5AE0D5', '#F26D6D', '#9B59B6', '#F1C40F'];
let paletteIndex = 0;
function nextPalette() {
  const base = NAVY[paletteIndex % NAVY.length];
  const accent = ACCENTS[paletteIndex % ACCENTS.length];
  paletteIndex++;
  return { base, accent };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** Huella de mascota: palma + 4 dedos. Forma propia, no replica ningún logo. */
function paw(cx, cy, r, fill) {
  const toes = [
    [cx - r * 0.95, cy - r * 0.95, r * 0.42],
    [cx - r * 0.35, cy - r * 1.35, r * 0.46],
    [cx + r * 0.35, cy - r * 1.35, r * 0.46],
    [cx + r * 0.95, cy - r * 0.95, r * 0.42],
  ];
  const parts = toes.map(([tx, ty, tr]) => `<circle cx="${tx}" cy="${ty}" r="${tr}" fill="${fill}"/>`);
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r * 0.95}" ry="${r * 0.8}" fill="${fill}"/>`);
  return parts.join('');
}

function svg({ width, height, brand, label, subtitle, base, accent }) {
  const c1 = base;
  const c2 = accent;
  const cx = width / 2;
  const cy = height / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="0.55" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M 72 0 L 0 0 0 72" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  ${paw(cx, cy - Math.min(width, height) * 0.16, Math.min(width, height) * 0.075, 'rgba(255,255,255,0.28)')}
  ${brand ? `<text x="${cx}" y="${cy + height * 0.05}" text-anchor="middle" font-family="Fredoka, Nunito, system-ui, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.055)}" font-weight="700" letter-spacing="4" fill="rgba(255,255,255,0.85)">${esc(brand.toUpperCase())}</text>` : ''}
  <text x="${cx}" y="${cy + height * 0.14}" text-anchor="middle" font-family="Fredoka, Nunito, system-ui, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.085)}" font-weight="800" fill="rgba(255,255,255,0.97)">${esc(label)}</text>
  ${subtitle ? `<text x="${cx}" y="${cy + height * 0.22}" text-anchor="middle" font-family="Fredoka, Nunito, system-ui, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.045)}" font-weight="500" fill="rgba(255,255,255,0.75)">${esc(subtitle)}</text>` : ''}
</svg>`;
}

// --- Imágenes de producto (una por vista) ---
await mkdir(join(IMAGES, 'products'), { recursive: true });
const files = (await readdir(PRODUCTS_DIR)).filter((f) => f.endsWith('.json'));
let count = 0;
for (const file of files) {
  const slug = file.replace(/\.json$/, '');
  const data = JSON.parse(await readFile(join(PRODUCTS_DIR, file), 'utf8'));
  const { base, accent } = nextPalette();
  for (let i = 0; i < VIEWS.length; i++) {
    const out = svg({
      width: 1200,
      height: 1200,
      brand: data.brand,
      label: data.name,
      subtitle: `Vista ${VIEWS[i]} · imagen de ejemplo`,
      base,
      accent,
    });
    await writeFile(join(IMAGES, 'products', `${slug}-${i + 1}.svg`), out, 'utf8');
    count++;
  }
}

// --- Imágenes del sitio (hero, promos, categorías) ---
const site = [
  { path: 'hero/hero-1.svg', width: 1600, height: 900, label: 'Alimento seco y húmedo', brand: 'Mana Pet Shop', subtitle: 'Hasta 25% OFF en marcas seleccionadas', base: '#0D2B3E', accent: '#F58A3C' },
  { path: 'hero/hero-2.svg', width: 1600, height: 900, label: 'Kgs de regalo', brand: 'Mana Pet Shop', subtitle: 'En alimentos seleccionados de 7,5kg y 15kg', base: '#123A50', accent: '#5AE0D5' },
  { path: 'promos/destacado-1.svg', width: 800, height: 800, label: 'Envío gratis', brand: 'Gran Mendoza', subtitle: 'En compras sobre $30.000', base: '#0D2B3E', accent: '#F1C40F' },
  { path: 'promos/destacado-2.svg', width: 800, height: 800, label: '3 cuotas sin interés', brand: 'Mercado Pago', subtitle: 'Sobre $150.000', base: '#1D4C63', accent: '#9B59B6' },
  { path: 'promos/kg-regalo.svg', width: 900, height: 700, label: 'Alimentos con kg de regalo', brand: 'Promo', subtitle: 'Aprovechá los combos', base: '#0D2B3E', accent: '#9B59B6' },
  { path: 'promos/reintegros.svg', width: 900, height: 700, label: 'Reintegros en cada compra', brand: 'Beneficio', subtitle: '5% para tu próxima compra', base: '#123A50', accent: '#5AE0D5' },
  { path: 'categories/perros.svg', width: 1000, height: 800, label: 'Perros', brand: 'Cachorro · Adulto · Senior', subtitle: '', base: '#0D2B3E', accent: '#F58A3C' },
  { path: 'categories/gatos.svg', width: 1000, height: 800, label: 'Gatos', brand: 'Cachorro · Adulto · Castrado', subtitle: '', base: '#1D4C63', accent: '#5AE0D5' },
];

for (const s of site) {
  const dir = dirname(join(IMAGES, s.path));
  await mkdir(dir, { recursive: true });
  await writeFile(join(IMAGES, s.path), svg(s), 'utf8');
  count++;
}

// --- Favicon propio (huella) ---
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0D2B3E"/>
  ${paw(32, 34, 8, '#5AE0D5')}
</svg>`;
await writeFile(join(ROOT, 'public', 'favicon.svg'), favicon, 'utf8');
count++;

console.log(`Generadas ${count} imágenes (${files.length} productos + sitio) en ${IMAGES}`);

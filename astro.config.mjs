// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * Hosts autorizados a servir el sitio.
 *
 * Necesario cuando se accede a través de un túnel (Cloudflare, ngrok, etc.) o
 * de un dominio propio: Vite bloquea los pedidos cuyo host no esté en la lista.
 * El punto inicial autoriza también los subdominios (ej: ".webbot.ar").
 *
 * Para agregar otro dominio, sumalo a esta lista.
 */
const ALLOWED_HOSTS = [
  'mamapetshop.webbot.ar',
  '.webbot.ar',
  'localhost',
  '127.0.0.1',
  '192.168.1.51',
];

// Cambiá `site` por tu dominio final (Netlify o custom domain).
// Se usa para sitemap, canonical URLs y metadatos.
export default defineConfig({
  site: 'https://manapets.github.io/',
  base: '/',
  output: 'static',
  compressHTML: true,
  server: {
    allowedHosts: ALLOWED_HOSTS,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

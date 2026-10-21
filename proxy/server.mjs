#!/usr/bin/env node
/**
 * Proxy OAuth para Decap CMS (backend "github") — ManáPets
 * ============================================================================
 *
 * POR QUÉ EXISTE ESTO
 * -------------------
 * El backend "github" de Decap CMS no puede hacer el login desde el navegador:
 * GitHub exige el `client_secret` para canjear el código OAuth por un token, y
 * un secret no puede estar en un archivo público del sitio.
 *
 * Decap resuelve esto con un proxy: abre una ventana emergente contra
 * `${base_url}/${auth_endpoint}` y este servicio devuelve el token con
 * postMessage. El secret queda acá, en el servidor, y nunca sale.
 *
 * PROTOCOLO (el mismo que usa Netlify Identity)
 * ---------------------------------------------
 *  1. El panel abre:  GET /auth?provider=github&site_id=<host del panel>&scope=repo
 *  2. Esta página le manda al panel el mensaje "authorizing:github" y después
 *     redirige a GitHub.
 *  3. GitHub vuelve a: GET /auth/callback?code=...&state=...
 *  4. Canjeamos el código por un token y le mandamos al panel el mensaje
 *     "authorization:github:success:{...token...}", que cierra la ventana.
 *
 * ENDPOINTS
 * ---------
 *   GET  /auth              abre el flujo de login
 *   GET  /auth/callback    回调 de GitHub: canjea el código y devuelve el token
 *   POST /auth/refresh      refresh token (GitHub no lo emite: responde 400)
 *   GET  /health            chequeo de vida
 *
 * CONFIGURACIÓN (variables de entorno)
 * ------------------------------------
 *   GITHUB_CLIENT_ID      Client ID de la OAuth App de GitHub   (obligatorio)
 *   GITHUB_CLIENT_SECRET  Client Secret de la OAuth App          (obligatorio)
 *   ALLOWED_ORIGINS       Origen(es) del panel, separados por coma.
 *                          Ej: https://manapets.github.io
 *                          (obligatorio: evita filtrar el token a otro sitio)
 *   PORT                  Puerto del servicio (por defecto 8082)
 *   BASE_URL              Origen público de ESTE proxy, sin slash final.
 *                          Ej: https://proxy.webbot.ar
 *                          Si no se define, se deduce del request.
 */

import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// --- Configuración -----------------------------------------------------------

/** Carga un archivo .env simple (KEY=VALOR) sin depender de ningún paquete. */
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(join(HERE, '.env'));

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const PORT = Number(process.env.PORT || 8082);
const BASE_URL = (process.env.BASE_URL || '').replace(/\/+$/, '');

/** Orígenes del panel authorised a recibir el token. */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const missing = [];
if (!CLIENT_ID) missing.push('GITHUB_CLIENT_ID');
if (!CLIENT_SECRET) missing.push('GITHUB_CLIENT_SECRET');
if (!ALLOWED_ORIGINS.length) missing.push('ALLOWED_ORIGINS');
if (missing.length) {
  console.error(
    `\x1b[1;31m✖ Faltan variables de entorno: ${missing.join(', ')}\x1b[0m\n` +
      '  Copiá proxy/.env.example a proxy/.env y completá los valores.\n',
  );
  process.exit(1);
}

const STATE_COOKIE = 'decap_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Base de la API de GitHub. Se puede cambiar para GitHub Enterprise
 * (https://github.ejemplo.com/api/v3) y para los tests.
 */
const GITHUB_API_BASE = (process.env.GITHUB_API_BASE || 'https://github.com').replace(/\/+$/, '');

// --- Utilidades --------------------------------------------------------------

const log = (...args) => console.log(new Date().toISOString(), ...args);
const logWarn = (...args) => console.warn(new Date().toISOString(), ...args);

/**
 * Normaliza el `site_id` que manda Decap a un origen completo.
 * Decap manda sólo el host ("manapets.github.io"), sin esquema.
 */
function normalizeOrigin(siteId) {
  if (!siteId) return null;
  const raw = siteId.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Resuelve el origen del panel a partir del `site_id` que manda Decap.
 *
 * Decap envía `site_id` = document.location.host SINPUERTO ("manapets.github.io",
 * "localhost"), así que no alcanza para saber el esquema ni el puerto.
 * Por eso buscamos cuál de los orígenes permitidos corresponde a ese host y
 * devolvemos ESE (con su esquema y puerto correctos), que es el único valor
 * seguro para usar como targetOrigin del postMessage.
 *
 * Devuelve null si el host no está en la lista blanca.
 */
function resolvePanelOrigin(siteId) {
  if (!siteId) return null;
  const raw = siteId.trim().replace(/\/+$/, '');
  const hostname = raw.replace(/^https?:\/\//i, '').split(':')[0].toLowerCase();
  if (!hostname) return null;

  // 1) coincidencia exacta
  for (const origin of ALLOWED_ORIGINS) {
    if (origin === raw) return origin;
    if (normalizeOrigin(origin) === normalizeOrigin(raw)) return origin;
  }

  // 2) coincidencia por hostname (ignora esquema y puerto)
  for (const origin of ALLOWED_ORIGINS) {
    try {
      if (new URL(origin).hostname.toLowerCase() === hostname) return origin;
    } catch {
      /* origen inválido en la config: se ignora */
    }
  }

  return null;
}

/** ¿El origen pedido está en la lista blanca? */
function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/** Genera un HTML con el script de postMessage y auto-cierre. */
function html({ origin, message, title, body, close = false }) {
  const payload = JSON.stringify(message);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f6f7f9;
        color: #1f2933;
      }
      .card {
        background: #fff;
        border: 1px solid #e4e7eb;
        border-radius: 12px;
        padding: 2rem 2.25rem;
        max-width: 30rem;
        text-align: center;
        box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
      }
      h1 { font-size: 1.15rem; margin: 0 0 .5rem; }
      p { margin: 0; color: #52606d; font-size: .9rem; }
      .err { color: #b91c1c; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${body}</p>
    </div>
    <script>
      (function () {
        var ORIGIN = ${JSON.stringify(origin)};
        var MESSAGE = ${payload};
        try {
          if (window.opener) {
            window.opener.postMessage(MESSAGE, ORIGIN);
          } else {
            document.querySelector('.card p').textContent =
              'No se encontró la ventana del panel. Volvé al panel y recargalo.';
            document.querySelector('.card h1').className = 'err';
          }
        } catch (e) {
          document.querySelector('.card p').textContent = 'Error: ' + e.message;
        }
        ${close ? 'setTimeout(function () { window.close(); }, 600);' : ''}
      })();
    </script>
  </body>
</html>
`;
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'SAMEORIGIN',
    ...headers,
  });
  res.end(payload);
}

function sendJson(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

/** Compara dos strings en tiempo constante. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

/**
 * Arma la cabecera Set-Cookie de la cookie de state.
 * El flag `Secure` sólo se pone si el request llegó por HTTPS: en local
 * (http://localhost) el navegador la descartaría y el login nunca cerraría.
 */
function stateCookie(value, req, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || Boolean(req.socket.encrypted);
  const attrs = [
    `${STATE_COOKIE}=${value}`,
    'Path=/auth',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

// --- Servidor ----------------------------------------------------------------

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    // --- Chequeo de vida -------------------------------------------------
    if (path === '/health') {
      return sendJson(res, 200, {
        ok: true,
        client_id: CLIENT_ID,
        allowed_origins: ALLOWED_ORIGINS,
        base_url: BASE_URL || `http://localhost:${PORT}`,
      });
    }

    // --- Refresh (GitHub no emite refresh tokens) ------------------------
    if (path === '/auth/refresh') {
      return sendJson(res, 400, {
        error: 'unsupported',
        message: 'GitHub OAuth Apps no emiten refresh_token. Volvé a iniciar sesión.',
      });
    }

    // --- Callback de GitHub ----------------------------------------------
    if (path === '/auth/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      const cookies = parseCookies(req);
      const expectedState = cookies[STATE_COOKIE];

      if (error) {
        return send(
          res,
          400,
          html({
            origin: BASE_URL || `http://localhost:${PORT}`,
            message: `authorization:github:error:${JSON.stringify({ message: url.searchParams.get('error_description') || error })}`,
            title: 'Login cancelado',
            body: 'Volvé al panel e intentá de nuevo.',
            close: true,
          }),
        );
      }

      if (!code) {
        return send(
          res,
          400,
          html({
            origin: BASE_URL || `http://localhost:${PORT}`,
            message: `authorization:github:error:${JSON.stringify({ message: 'Falta el código de autorización.' })}`,
            title: 'Login incompleto',
            body: 'Volvé al panel e intentá de nuevo.',
            close: true,
          }),
        );
      }

      if (!expectedState || !state || !safeEqual(expectedState, state)) {
        logWarn('callback con state inválido — posible CSRF, se rechaza.');
        return send(
          res,
          400,
          html({
            origin: BASE_URL || `http://localhost:${PORT}`,
            message: `authorization:github:error:${JSON.stringify({ message: 'State inválido (posible CSRF).' })}`,
            title: 'Login rechazado',
            body: 'La sesión de login venció o es inválida. Volvé a intentarlo.',
            close: true,
          }),
        );
      }

      // Canjeamos el código por un token (acá vive el client_secret).
      const redirectUri = `${BASE_URL || `http://localhost:${PORT}`}/auth/callback`;
      const tokenRes = await fetch(`${GITHUB_API_BASE}/login/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'manapets-decap-proxy',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenBody = await tokenRes.json().catch(() => ({}));

      if (!tokenRes.ok || tokenBody.error || !tokenBody.access_token) {
        logWarn('GitHub rechazó el canje:', tokenBody.error_description || tokenBody.error || tokenRes.status);
        return send(
          res,
          400,
          html({
            origin: BASE_URL || `http://localhost:${PORT}`,
            message: `authorization:github:error:${JSON.stringify({ message: tokenBody.error_description || tokenBody.error || 'No se pudo obtener el token.' })}`,
            title: 'GitHub rechazó el login',
            body: 'Revisá el Client ID / Client Secret y la Redirect URI de la OAuth App.',
            close: true,
          }),
        );
      }

      const payload = {
        token: tokenBody.access_token,
        provider: 'github',
        scope: tokenBody.scope || url.searchParams.get('scope') || 'repo',
      };

      log('login OK — token emitido para', url.searchParams.get('site_id') || 'panel');

      // La cookie de state ya se consumió: la borramos.
      return send(
        res,
        200,
        html({
          origin: BASE_URL || `http://localhost:${PORT}`,
          message: `authorization:github:success:${JSON.stringify(payload)}`,
          title: 'Listo',
          body: 'Ya podés cerrar esta ventana.',
          close: true,
        }),
        {
          'Set-Cookie': stateCookie('', req, 0),
        },
      );
    }

    // --- Inicio del flujo de login ---------------------------------------
    if (path === '/auth') {
      const provider = url.searchParams.get('provider') || 'github';
      const siteId = url.searchParams.get('site_id') || '';
      const scope = url.searchParams.get('scope') || 'repo';

      if (provider !== 'github') {
        return send(
          res,
          400,
          html({
            origin: BASE_URL || `http://localhost:${PORT}`,
            message: `authorization:${provider}:error:${JSON.stringify({ message: `Proveedor no soportado: ${provider}` })}`,
            title: 'Proveedor no soportado',
            body: 'Este proxy sólo maneja GitHub.',
            close: true,
          }),
        );
      }

      // El origen del panel tiene que estar en la lista blanca.
      const panelOrigin = resolvePanelOrigin(siteId);
      if (!isAllowedOrigin(panelOrigin)) {
        logWarn(`Origen no permitido: "${siteId}"`);
        return send(
          res,
          403,
          html({
            origin: BASE_URL || `http://localhost:${PORT}`,
            message: `authorization:github:error:${JSON.stringify({ message: 'Origen del panel no permitido.' })}`,
            title: 'Acceso denegado',
            body: 'Este panel no está autorizado a usar el proxy.',
            close: true,
          }),
        );
      }

      const state = randomBytes(24).toString('hex');
      const redirectUri = `${BASE_URL || `http://localhost:${PORT}`}/auth/callback`;

      const authorizeUrl = new URL(`${GITHUB_API_BASE}/login/oauth/authorize`);
      authorizeUrl.searchParams.set('client_id', CLIENT_ID);
      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
      authorizeUrl.searchParams.set('scope', scope);
      authorizeUrl.searchParams.set('state', state);
      authorizeUrl.searchParams.set('allow_signup', 'false');

      // Paso 1 del protocolo: avisarle al panel que la ventana se "autoriza".
      const handshake = `authorizing:${provider}`;

      const page = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Conectando con GitHub…</title>
    <style>
      body { margin:0; min-height:100vh; display:grid; place-items:center;
             font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;
             background:#f6f7f9; color:#1f2933; }
      .card { background:#fff; border:1px solid #e4e7eb; border-radius:12px;
              padding:2rem 2.25rem; max-width:30rem; text-align:center;
              box-shadow:0 1px 3px rgb(0 0 0 / 8%); }
      h1 { font-size:1.15rem; margin:0 0 .5rem; }
      p { margin:0; color:#52606d; font-size:.9rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Conectando con GitHub…</h1>
      <p>Te vamos a llevar a GitHub para autorizar el acceso.</p>
    </div>
    <script>
      (function () {
        var PANEL_ORIGIN = ${JSON.stringify(panelOrigin)};
        try {
          if (window.opener) {
            window.opener.postMessage(${JSON.stringify(handshake)}, PANEL_ORIGIN);
          }
        } catch (e) { /* el panel sigue igual */ }
        window.location.replace(${JSON.stringify(authorizeUrl.toString())});
      })();
    </script>
  </body>
</html>
`;

      return send(res, 200, page, {
        'Set-Cookie': stateCookie(state, req, Math.floor(STATE_TTL_MS / 1000)),
      });
    }

    return sendJson(res, 404, { error: 'not_found', path });
  } catch (err) {
    logWarn('error no manejado:', err && err.stack ? err.stack : err);
    return sendJson(res, 500, { error: 'internal_error', message: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  log(`Proxy OAuth de Decap escuchando en http://127.0.0.1:${PORT}`);
  log(`  base_url      : ${BASE_URL || '(se deduce del request)'}`);
  log(`  origenes      : ${ALLOWED_ORIGINS.join(', ')}`);
  log(`  client_id     : ${CLIENT_ID}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    log('cerrando…');
    server.close(() => process.exit(0));
  });
}

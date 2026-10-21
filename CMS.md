# Panel de administración (CMS)

Con el CMS cargás productos, cambiás precios, editás las preguntas frecuentes y los
ajustes de la tienda **desde el navegador**, sin tocar código.

El panel vive en:

```
https://<tu-dominio>/admin
```

Es un panel *git-based*: cada vez que guardás, hace un commit al repositorio de GitHub
y el sitio se vuelve a publicar solo. **No hay servidor ni base de datos**, es gratis.

---

## 1. Qué se puede editar

| Sección | Archivo | Incluye |
|---|---|---|
| **Productos** | `src/content/products/<id>.json` | Nombre, descripciones, precio, precio anterior, categoría, marca, especie, tipo de alimento, kilos de regalo, presentaciones/variantes con su stock, imágenes (1 a 3), destacado, disponible, etiqueta e tags |
| **Preguntas frecuentes** | `src/content/faqs/<id>.json` | Pregunta, respuesta, orden |
| **Ajustes de la tienda** | `src/content/settings/store.json` | Nombre, frase, descripción SEO, ciudad, dirección, WhatsApp, saludo del pedido, email, redes, nota de envío, envío gratis, cuotas, reintegro y códigos de descuento |

### Sobre la etiqueta «-15% OFF»

**No se carga a mano.** Se calcula sola comparando el *precio anterior*
(`compareAtPrice`) con el precio actual. Si querés que un producto muestre `-15% OFF`,
cargá un precio anterior que sea un 15% más alto que el precio.

El campo **Etiqueta sobre la imagen** (`badge`) es distinto: sirve para textos fijos
como `Nuevo`.

---

## 2. Puesta en marcha (una sola vez)

El panel es un CMS *git-based* sobre **Decap CMS**: cada guardado hace un commit
al repo y GitHub Actions vuelve a publicar el sitio.

Hay dos partes:

| Parte | Dónde vive | Qué es |
|---|---|---|
| El panel | `public/admin/` (estático, va a GitHub Pages) | La interfaz de edición |
| El proxy OAuth | `proxy/server.mjs` (Node, en tu servidor) | Canjea el código de GitHub por un token |

> **¿Por qué hace falta el proxy?** GitHub exige el `client_secret` para canjear
> el código OAuth por un token, y un secret no puede estar en un archivo
> público del sitio. Decap resuelve esto delegando el login a un proxy que vive
> en un servidor. (Netlify Identity hace lo mismo por vos, pero el sitio
> está en GitHub Pages, así que lo corrés vos.)

### Paso 1 — Publicar el sitio en GitHub Pages

```bash
git add .
git commit -m "Panel de administración"
git push origin main
```

El workflow `.github/workflows/deploy.yml` compila con Astro y publica en
`https://manapets.github.io/`. Tarda ~1 minuto.

> Hay **dos** workflows iguales (`deploy.yml` y `static.yml`) que compiten por
> el mismo deploy. Borra uno de los dos.

### Paso 2 — Crear la OAuth App en GitHub

GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**:

| Campo | Valor |
|---|---|
| Application name | `ManáPets Admin` |
| Homepage URL | `https://manapets.github.io` |
| Authorization callback URL | `https://proxy.webbot.ar/auth/callback` |

Anotá el **Client ID** y el **Client Secret**. El secret **nunca** va en el
panel ni en el repo: sólo en `proxy/.env` en el servidor.

### Paso 3 — Levantar el proxy en tu servidor

```bash
# 1. Subir el código (desde la carpeta del proyecto)
./deploy.sh                       # sincroniza src/, public/, proxy/ al servidor

# 2. En el servidor: configurar
cd ~/otra_tienda
cp proxy/.env.example proxy/.env
nano proxy/.env                   # completar CLIENT_ID, CLIENT_SECRET, BASE_URL, ALLOWED_ORIGINS

# 3. Levantar
./proxy.sh start
./proxy.sh check                  # prueba /health y /auth
```

`proxy/.env` queda fuera del repo (está en `.gitignore`).

### Paso 4 — Exponer el proxy con HTTPS

El proxy tiene que ser alcanzable desde internet por HTTPS (GitHub redirige
ahí el callback). Con un túnel de Cloudflare:

```yaml
# config del túnel (cloudflared)
ingress:
  - hostname: proxy.webbot.ar
    service: http://localhost:8082
  - hostname: mamapetshop.webbot.ar
    service: http://localhost:4321
```

Creá el registro DNS `proxy.webbot.ar` apuntando al túnel.

> **Alternativa sin DNS nuevo:** servir el proxy en el host que ya tenés y
> enrutar por path. En `public/admin/config.yml` poné
> `base_url: https://mamapetshop.webbot.ar` y en el túnel:
> ```yaml
>   - hostname: mamapetshop.webbot.ar
>     path: ^/auth(/.*)?$
>     service: http://localhost:8082
> ```

### Paso 5 — Apuntar el panel al proxy

En `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: manapets/manapets.github.io
  branch: main
  base_url: https://proxy.webbot.ar
  auth_endpoint: auth
```

`base_url` tiene que ser **exactamente** el origen público del proxy, sin barra
final. La Redirect URI de la OAuth App es `<base_url>/auth/callback`.

Volvé a subir el sitio (`git push`) y probá en **modo incógnito**:
`https://manapets.github.io/admin`.

### Errores frecuentes

| Síntoma | Causa |
|---|---|
| Pantalla en blanco, sin errores | El `<script>` de Decap está en el `<head>`. Va al final del `<body>`. |
| "Failed to load config.yml (404)" | Falta el `<link rel="cms-config-url">` con ruta **absoluta** (`/admin/config.yml`). |
| El popup de login se abre en `api.netlify.com` | Falta `base_url` / `auth_endpoint` en el `backend`. |
| El popup se abre en `https://api.github.com/https://github.com/...` | `auth_endpoint` no es un path, es una URL. Sólo `auth`. |
| "Origen del panel no permitido" | `ALLOWED_ORIGINS` en `proxy/.env` no coincide con el origen del panel. |
| 404 al volver de GitHub | La Redirect URI de la OAuth App no es `<base_url>/auth/callback`. |

### Paso 6 — Imágenes (opcional pero recomendado)

Por defecto las fotos se guardan dentro del repositorio, en `public/images/uploads/`.
Funciona, pero un catálogo grande infla el repositorio.

**Con Cloudinary (plan gratis) las fotos no tocan el repositorio** y se entregan
optimizadas:

1. Creá una cuenta gratis en [cloudinary.com](https://cloudinary.com).
2. En el panel de Cloudinary (arriba a la izquierda) copiá **Cloud name** y **API key**.
3. En `public/admin/config.yml`, descomentá el bloque `media_library` y pegá tus datos.
4. Guardá el cambio. Listo: al subir una imagen se abre la biblioteca de Cloudinary.

> La *API key* se puede exponer sin riesgo; lo que nunca hay que publicar es la
> **API secret** (`api_secret`). Ese dato no va acá.

---

## 3. Cómo trabajar en el día a día

- **Cargar un producto:** Productos → *Add Producto*. El *Nombre* define la dirección
  `/productos/<nombre-slugificado>`.
- **Cambiar un precio:** Productos → abrí el producto → cambiá el número → *Save*.
- **Poner en oferta:** cargá *Precio anterior* mayor al precio. La etiqueta del % y la
  colección *Liquidación* (si el descuento llega al 15%) aparecen solas.
- **Marcar «Nuevo»:** cargá *Etiqueta sobre la imagen* = `Nuevo` y agregá el tag *Novedad*.
- **Subir fotos:** en *Imágenes*, botón de subir o arrastrar. Hasta 3 por producto.
- **WhatsApp:** Ajustes de la tienda → *WhatsApp* (solo números, sin `+` ni espacios).
- **Borrar:** cada entrada tiene *Delete* (queda en el historial de Git y se puede recuperar).

Los cambios tardan **~1 minuto** en verse (GitHub Actions reconstruye el sitio).

---

## 4. Detalles técnicos

- **Motor:** [Decap CMS](https://decapcms.org) (`public/admin/index.html`), un panel
  estático que se configura con `public/admin/config.yml` y se autentica contra el
  backend `github`. El login delega el canje del secret en `proxy/server.mjs`.
  Como alternativa existe [Sveltia CMS](https://sveltiacms.app), más moderno, pero
  necesita el mismo proxy OAuth.
- **El `<script>` de Decap va al final del `<body>`:** Decap hace auto-init al
  evaluarse y necesita que `document.body` ya exista. En el `<head>` la
  inicialización revienta y la página queda en blanco **sin errores en la consola**.
- **Validación:** los productos se validan con Zod al compilar
  (`src/lib/product-schema.ts`) y los ajustes con `src/lib/store-schema.ts`
  (test en `src/lib/store-schema.test.ts`). Si algo queda mal, el build falla y el
  sitio no se rompe: GitHub Pages conserva la última versión publicada.
- **Campos vacíos:** el panel guarda los vacíos como `""`, `null` o `[]`; el sitio los
  interpreta como «sin valor» antes de validar (`pruneEmpty` en `src/content.config.ts`).
- **Rama:** `main`. Si preferís revisar los cambios antes de publicar, descomentá
  `publish_mode: editorial_workflow` en `public/admin/config.yml`.
- **Ruta del config:** `public/admin/index.html` declara
  `<link href="/admin/config.yml" rel="cms-config-url">`. Es a propósito: así el panel
  encuentra el config aunque entres a `/admin` **sin** la barra final (si usara la ruta
  relativa, la buscaría en `/config.yml` y daría «Failed to load config.yml (404)»).

### Qué NO hace el CMS

- **Los pedidos no se guardan** (el carrito vive en el navegador y el pedido se manda
  por WhatsApp).
- **El stock no se descuenta solo** al vender.
- **Los cambios no son instantáneos**: hay que esperar el rebuild de GitHub Pages (~1 min).

Eso requiere un backend real (base de datos + API), que es otro proyecto.

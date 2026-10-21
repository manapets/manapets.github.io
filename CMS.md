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

El panel es un CMS *git-based* sobre **[Sveltia CMS](https://sveltiacms.app)**: cada
guardado hace un commit al repo y GitHub Actions vuelve a publicar el sitio.

| Parte | Dónde vive | Qué es |
|---|---|---|
| El panel | `public/admin/` (estático, va a GitHub Pages) | La interfaz de edición |
| El login | Tu Personal Access Token de GitHub | La credencial que abre el panel |

> **No hace falta ninguna OAuth App, ni `client_secret`, ni proxy, ni servidor extra.**
> El panel entra con un **Personal Access Token** de GitHub: lo pegás una vez en el
> navegador y queda ahí. El token sólo lo usás vos, en tu navegador.
>
> ¿Por qué? GitHub exige el `client_secret` para canjear el código OAuth por un
> token, y eso obliga a levantar un servidor (proxy). El login por token evita
> ese paso: el token lo creás vos mismo en GitHub.

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

### Paso 2 — Crear el Personal Access Token

GitHub → **Settings** → **Developer settings** → **Personal access tokens** →
**Fine-grained tokens** → **Generate new token**:

| Campo | Valor |
|---|---|
| Token name | `ManáPets Admin` |
| Expiration | lo que prefieras (1 año está bien) |
| Repository access | Only select repositories → `manapets/manapets.github.io` |
| Contents | **Read and write** |
| Pull requests | **Read and write** (sólo si vas a usar Editorial Workflow) |

Copiá el token. **Aparece una sola vez**: guardalo en el gestor de contraseñas.

> Alternativa: un token clásico con el scope `repo` también sirve
> (Settings → Developer settings → Personal access tokens → Tokens (classic)).

### Paso 3 — Entrar al panel

1. Abrí `https://manapets.github.io/admin`
2. Presioná **Sign In Using Access Token**
3. Pegá el token y confirmá

El token queda guardado en el `localStorage` de tu navegador: la próxima vez
entrás directo.

### Paso 4 — Dar acceso a otra persona (opcional)

Cada persona que cargue productos necesita su propio token, y permiso de
escritura sobre el repo:

- GitHub → el repo → **Settings** → **Collaborators and teams** → **Add people**
  → rol **Write** (o Maintain).
- Esa persona crea su propio token (Paso 2) y entra con él.

---

### Editar el contenido sin salir de GitHub

El panel tiene un botón **Work with Local Repository**: si lo usás, Sveltia abre
un selector de carpeta y trabaja **directamente sobre tu carpeta local**, sin
token y sin conexión. Útil para probar cambios antes de subirlos.

---

### Errores frecuentes

| Síntoma | Causa |
|---|---|
| Pantalla en blanco, sin errores | El `<script>` del CMS está en el `<head>`. Va al final del `<body>`. |
| "Failed to load config.yml (404)" | Falta el `<link rel="cms-config-url">` con ruta **absoluta** (`/admin/config.yml`). |
| El login pide un token pero no entra | El token no tiene permiso de escritura sobre el repo, o le falta el alcance `repo` / permiso **Contents: Read and write**. |
| "Resource not accessible by personal access token" al publicar | Al token le falta el permiso **Pull requests: Read and write** (sólo con Editorial Workflow). |
| No aparece el botón de guardar | El token es de sólo lectura. |
| Aviso de Sveltia en la consola | No uses `type="module"` en el `<script>`: Sveltia no es un módulo ES. |

### Paso 5 — Imágenes (opcional pero recomendado)

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

- **Motor:** [Sveltia CMS](https://sveltiacms.app) (`public/admin/index.html`), un
  panel estático que se configura con `public/admin/config.yml`. Es el sucesor
  mantenido de Netlify/Decap CMS.
- **Login:** `backend.auth_methods: [token]` → Personal Access Token de GitHub.
  Sin OAuth App, sin `client_secret`, sin proxy y sin servidor extra.
- **El `<script>` va al final del `<body>`:** el CMS hace auto-init al evaluarse y
  necesita que `document.body` ya exista. En el `<head>` la inicialización
  revienta y la página queda en blanco **sin errores en la consola**.
- **Sin `type="module"`:** Sveltia no es un módulo ES y avisa por consola.
- **Validación:** los productos se validan con Zod al compilar
  (`src/lib/product-schema.ts`) y los ajustes con `src/lib/store-schema.ts`
  (test en `src/lib/store-schema.test.ts`). Si algo queda mal, el build falla y el
  sitio no se rompe: GitHub Pages conserva la última versión publicada.
- **Campos vacíos:** el panel guarda los vacíos como `""`, `null` o `[]`; el sitio los
  interpreta como «sin valor» antes de validar (`pruneEmpty` en `src/content.config.ts`).
- **Rama:** `main`. Si preferís revisar los cambios antes de publicar, descomentá
  `publish_mode: editorial_workflow` en `public/admin/config.yml`.
- **Campos vacíos:** `output.omit_empty_optional_fields: true` evita que se
  escriban en el JSON los campos opcionales que quedaron vacíos (lo que espera el
  schema Zod del sitio).
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

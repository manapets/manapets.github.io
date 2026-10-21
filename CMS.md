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

### Paso 1 — Subir el proyecto a GitHub

Desde la carpeta del proyecto:

```bash
git init -b main
git add .
git commit -m "Mana Pet Shop"
git remote add origin git@github.com:<tu-usuario>/mana-pet-shop.git
git push -u origin main
```

> `main` es la rama configurada en `public/admin/config.yml`. Si usás otra,
> actualizá `backend.branch` en ese archivo.

### Paso 2 — Publicar en Netlify

1. En [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Elegí GitHub y el repositorio. Netlify lee `netlify.toml` solo: no cambies nada
   (build `npm run build`, carpeta `dist`).
3. Publicá y anotá la dirección que te da (ej: `https://mana-pet-shop.netlify.app`).

### Paso 3 — Activar el acceso al panel

El panel usa el backend **github** de Decap: se inicia sesión con una cuenta de GitHub y cada editor debe tener permiso de **escritura** sobre el repositorio. No usa Netlify Identity ni Git Gateway, así que no hay upgrade ni invitaciones pagas.

En el sitio de Netlify:

1. **Project configuration → OAuth → Install provider → GitHub**
   - Netlify te pide crear una OAuth App en GitHub (https://github.com/settings/developers → New OAuth App).
   - La **Authorization callback URL** te la da Netlify en ese mismo paso.
   - Copiás el **Client ID** y **Client Secret** de GitHub a Netlify y guardás.
   (Esto habilita el botón “Continue with GitHub” en el panel.)

2. En GitHub, entrá al repo **webbotar/mamapetshop** → **Settings → Collaborators → Add people** y agregá a quien vaya a cargar productos, con rol **Write** (o Maintain).
   - Sin este paso, el panel te deja entrar pero no puede guardar cambios.

3. Probá: **https://mamapetshop.netlify.app/admin/** → *Continue with GitHub* → elegí tu cuenta → se abre el panel.

### Paso 4 — Imágenes (opcional pero recomendado)

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

Los cambios tardan **~40 segundos** en verse (Netlify reconstruye el sitio).

---

## 4. Detalles técnicos

- **Motor:** [Decap CMS](https://decapcms.org) (`public/admin/index.html`), un panel
  estático que se configura con `public/admin/config.yml` y se autentica con Netlify
  Identity + Git Gateway. Como alternativa existe [Sveltia CMS](https://sveltiacms.app),
  más moderno, pero **no soporta `git-gateway`**: exige el backend `github` y un proxy
  OAuth propio.
- **Validación:** los productos se validan con Zod al compilar
  (`src/lib/product-schema.ts`) y los ajustes con `src/lib/store-schema.ts`
  (test en `src/lib/store-schema.test.ts`). Si algo queda mal, el build falla y el
  sitio no se rompe: Netlify conserva la última versión publicada.
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
- **Los cambios no son instantáneos**: hay que esperar el rebuild de Netlify.

Eso requiere un backend real (base de datos + API), que es otro proyecto.

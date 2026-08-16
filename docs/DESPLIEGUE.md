# Despliegue

Notas para Julián sobre cómo se despliega este sitio y qué hay que vigilar.

## Hosting

**Cloudflare Workers** (assets estáticos), en el plan gratuito. Permite uso comercial sin restricción y las peticiones a archivos estáticos no consumen cuota.

No es Cloudflare Pages: el diseño original decía Pages, pero al crear el proyecto Cloudflare ofrece el flujo de Workers. Para un sitio solo-estático es equivalente y es el camino que Cloudflare recomienda hoy.

Ese flujo exige un `wrangler.jsonc` en la raíz del repo. Ya está creado. El campo `name` de ese archivo **debe coincidir** con el "Project name" del panel; si cambias uno, cambia el otro.

## Rama por defecto

El repositorio remoto usa **`master`** como rama por defecto, no `main`. Al conectar el repo en Cloudflare, la rama de producción que hay que seleccionar es `master`. Si Cloudflare la autodetecta mal (algunos flujos asumen `main` por defecto), corrígela a mano en la configuración del proyecto.

## Comando de build

Ahora mismo no hay CI: nada bloquea un despliegue con contenido inválido salvo lo que el propio build de Cloudflare ejecute. Por defecto Cloudflare correría solo `npm run build`, que no corre los 18 tests de Vitest.

Configura el comando de build en Cloudflare como:

```
npm test && npm run build
```

Así, si algún test falla, el build falla y el despliegue no se publica — el sitio en producción sigue siendo el último build bueno.

**Deploy command:** `npx wrangler deploy` (valor por defecto del panel, no hay que cambiarlo)

**Directorio de salida:** `dist`

### Sobre `npm run enlaces`

La verificación de enlaces (`linkinator`) **no** va en el comando de build. Revisa el HTML generado, donde las URL canónicas apuntan al dominio de producción; hasta que el sitio esté desplegado esas URL no resuelven y la verificación fallaría siempre, bloqueando justamente el primer despliegue. Córrela a mano después de desplegar:

```
npm run build && npm run enlaces
```

## Paso obligatorio antes del primer despliegue a producción

**Resuelto.** `astro.config.mjs` ya apunta a la URL real:

```js
site: 'https://pagina-seguros-johnjairo.jrseguros.workers.dev'
```

Se compone del nombre del proyecto (`pagina-seguros-johnjairo`) más el subdominio de la cuenta (`jrseguros.workers.dev`, visible en Workers & Pages → Account Details).

Vuelve a revisarlo solo si cambias el nombre del proyecto en Cloudflare — y en ese caso también hay que cambiar `name` en `wrangler.jsonc`.

Si este paso se salta, las URL canónicas (`<link rel="canonical">`), las etiquetas `og:url` / `og:image` y el `sitemap-index.xml` seguirán apuntando a un dominio que no es el real. No se nota a simple vista porque las páginas se ven y funcionan bien igual — el problema solo aparece cuando alguien comparte un enlace, cuando Google indexa el sitemap, o cuando se audita el SEO.

## Formsubmit (formulario de contacto)

El formulario de contacto usa Formsubmit apuntando al correo definido en `src/content/config/contacto.json` (campo `correo`). Formsubmit exige una activación única por dirección de correo: el primer envío que le llega no se entrega — en su lugar Formsubmit manda un correo de confirmación a esa dirección, y hay que hacer clic en el enlace de ese correo para activarla. Solo después de esa activación empiezan a llegar los envíos reales.

Mientras `contacto.json` tenga el correo de ejemplo (`johnjairo@ejemplo.com`) en vez del correo real de John Jairo, cualquier visitante que use el formulario solo va a ver el camino de error del formulario (que ya ofrece WhatsApp como alternativa) — el correo de ejemplo nunca se activó y no puede recibir nada.

Antes de anunciar el sitio como listo:

1. Actualiza `correo` en `contacto.json` con el correo real de John Jairo.
2. Haz un envío de prueba desde el formulario en producción.
3. Revisa esa bandeja de entrada y haz clic en el correo de confirmación de Formsubmit.
4. Vuelve a probar el formulario para confirmar que ahora sí llega el correo con los datos.

## Dominio propio

Un dominio propio (por ejemplo `jrseguros.com`) se conecta en Cloudflare sin costo adicional de Cloudflare — la única plata que se paga es el dominio en sí. Comprado en Cloudflare Registrar, un `.com` sale a precio de costo, alrededor de US$10,44/año.

Al conectar el dominio propio:

1. Regístralo o transfiérelo a Cloudflare Registrar (o solo apunta los DNS si ya está en otro proveedor).
2. Conéctalo como dominio personalizado del proyecto en Cloudflare.
3. **Actualiza `site` en `astro.config.mjs` otra vez**, esta vez al dominio propio (ej. `https://jrseguros.com`), y vuelve a desplegar. Hay que hacerlo cada vez que cambia el dominio "oficial" del sitio.

## Si un despliegue falla

Con el comando de build recomendado arriba, casi siempre la causa es contenido inválido guardado desde el panel (Pages CMS): un campo obligatorio vacío, un patrón que no cumple (por ejemplo el correo de contacto o el WhatsApp), una imagen referenciada que no existe en `src/assets/img/`, etc.

El sitio en vivo **no cambia** hasta que el build completo pase — un despliegue fallido no reemplaza el último bueno. Para diagnosticar:

1. Abre el log del build fallido en Cloudflare.
2. Busca el error de validación de zod (viene de los esquemas en `src/content.config.ts`): indica el archivo de contenido exacto y el campo que no cumple el esquema.
3. Corrige ese campo desde el panel o directamente en el archivo, y vuelve a desplegar.

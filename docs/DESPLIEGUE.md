# Despliegue

Notas para Julián sobre cómo se despliega este sitio y qué hay que vigilar.

## Hosting

Cloudflare Pages, en el plan gratuito. El plan gratuito permite uso comercial sin restricción, así que no hay que pasar a un plan de pago para operar el sitio de John Jairo.

## Rama por defecto

El repositorio remoto usa **`master`** como rama por defecto, no `main`. Al conectar el repo en Cloudflare Pages, la rama de producción que hay que seleccionar es `master`. Si Cloudflare la autodetecta mal (algunos flujos asumen `main` por defecto), corrígela a mano en la configuración del proyecto.

## Comando de build

Ahora mismo no hay CI: nada bloquea un despliegue con contenido inválido o con enlaces rotos salvo lo que el propio build de Cloudflare ejecute. Por defecto Cloudflare correría solo `npm run build`, que no corre los 22 tests de Vitest ni la verificación de enlaces (`npm run enlaces`).

Configura el comando de build en Cloudflare Pages como:

```
npm test && npm run build && npm run enlaces
```

Así, si algún test falla o `linkinator` encuentra un enlace roto en el sitio generado, el build falla y el despliegue no se publica — el sitio en producción sigue siendo el último build bueno.

**Directorio de salida:** `dist`

## Paso obligatorio antes del primer despliegue a producción

`astro.config.mjs` tiene:

```js
site: 'https://jrseguros.pages.dev'
```

Es una suposición del nombre del proyecto. Cloudflare Pages asigna el dominio `<nombre-del-proyecto>.pages.dev` según el nombre que le des al crear el proyecto (o que Cloudflare genere si hay colisión de nombre). Antes de considerar el sitio "en producción":

1. Crea o revisa el proyecto en Cloudflare Pages y confirma el subdominio `.pages.dev` real que te asignó.
2. Si no coincide exactamente con `https://jrseguros.pages.dev`, actualiza `site` en `astro.config.mjs` con el valor correcto.
3. Vuelve a desplegar.

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

Un dominio propio (por ejemplo `jrseguros.com`) se conecta en Cloudflare Pages sin costo adicional de Cloudflare — la única plata que se paga es el dominio en sí. Comprado en Cloudflare Registrar, un `.com` sale a precio de costo, alrededor de US$10,44/año.

Al conectar el dominio propio:

1. Regístralo o transfiérelo a Cloudflare Registrar (o solo apunta los DNS si ya está en otro proveedor).
2. Conéctalo como dominio personalizado del proyecto en Cloudflare Pages.
3. **Actualiza `site` en `astro.config.mjs` otra vez**, esta vez al dominio propio (ej. `https://jrseguros.com`), y vuelve a desplegar. Es el mismo paso que con el `.pages.yml` inicial — hay que hacerlo cada vez que cambia el dominio "oficial" del sitio.

## Si un despliegue falla

Con el comando de build recomendado arriba, casi siempre la causa es contenido inválido guardado desde el panel (Pages CMS): un campo obligatorio vacío, un patrón que no cumple (por ejemplo el correo de contacto o el WhatsApp), una imagen referenciada que no existe en `src/assets/img/`, etc.

El sitio en vivo **no cambia** hasta que el build completo pase — un despliegue fallido no reemplaza el último bueno. Para diagnosticar:

1. Abre el log del build fallido en Cloudflare Pages.
2. Busca el error de validación de zod (viene de los esquemas en `src/content/config.ts`): indica el archivo de contenido exacto y el campo que no cumple el esquema.
3. Corrige ese campo desde el panel o directamente en el archivo, y vuelve a desplegar.

Si el fallo viene de `npm run enlaces`, el log de `linkinator` señala la URL de origen y el enlace roto.

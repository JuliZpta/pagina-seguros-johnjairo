# JR Seguros — Sitio informativo con panel de administración

**Fecha:** 2026-08-15
**Estado:** Diseño aprobado, pendiente plan de implementación

---

## 1. Contexto y problema

John Jairo es asesor independiente de seguros en Colombia. Hoy tiene un sitio de
una sola página, estático, con todo el contenido escrito directamente en el HTML
(`index.html`, 273 líneas). Cambiar un número de teléfono, agregar un seguro o
publicar una promoción exige editar código y hacer push.

El sitio debe pasar a ser:

1. **Informativo y navegable** — un catálogo donde cada seguro tiene su propia página.
2. **Administrable sin código** — la novia de Julián publica novedades y edita
   contenido desde el celular.
3. **Visualmente propio** — hoy usa la paleta por defecto de Tailwind e Inter,
   la combinación más repetida de la web.

**Fuera de alcance (decidido explícitamente):** registro e inicio de sesión de
clientes. Se consideró y se descartó — no había un uso concreto que justificara
el costo ni el manejo de datos personales. El sitio es 100% público.

## 2. Restricciones

- **Costo: cero.** Sin tarjeta de crédito, sin cuotas que se agoten.
- La administradora no es desarrolladora, pero es cómoda con herramientas digitales.
- Debe poder administrarse desde un celular.
- El sitio no puede quedar roto por un error de contenido.

## 3. Decisiones de arquitectura

### 3.1 Stack

| Pieza | Elección | Costo |
|---|---|---|
| Generador | Astro (salida estática) | $0 |
| CMS | Pages CMS (`app.pagescms.org`) | $0 (MIT) |
| Hosting | Cloudflare Pages | $0 |
| Formulario | Formsubmit | $0 |
| Dominio (opcional, futuro) | Cloudflare Registrar | ~US$10,44/año a precio de costo |

### 3.2 Por qué se sale de Vercel

El plan Hobby de Vercel **prohíbe el uso comercial**. Sus Fair Use Guidelines
incluyen explícitamente "publicitar un producto o servicio" y "que a alguien le
paguen por crear el sitio". Un sitio que promociona los servicios de un asesor de
seguros cae en esa definición. Quedarse en Vercel de forma limpia exige el plan
Pro (~US$20/mes), lo que contradice la restricción de costo cero.

Cloudflare Pages permite uso comercial en su plan gratuito, con ancho de banda
ilimitado, 500 builds/mes y 20.000 archivos por sitio — holgado para este sitio.

### 3.3 Por qué Pages CMS y no un CMS con API (Sanity, Contentful)

Se evaluó Sanity, cuyo plan gratuito es generoso (20 usuarios, 10.000 documentos,
100 GB de assets y de ancho de banda). Se descartó por dos razones:

- **El contenido queda fuera del repo.** Con Pages CMS, todo vive en GitHub:
  versionado, respaldado y recuperable. Si el CMS desaparece mañana, el sitio
  sigue funcionando y el contenido sigue siendo nuestro.
- **Sin cuotas que se agoten.** En el plan gratuito de Sanity, superar una cuota
  bloquea esa funcionalidad hasta el mes siguiente.

El precio de esta decisión: publicar tarda ~40 s (el tiempo de rebuild) en vez de
ser instantáneo. Aceptable para la frecuencia de publicación de una asesoría.

### 3.4 Flujo de contenido

```
  Administradora (celular)          GitHub                    Visitante
        │                             │                           │
        ▼                             ▼                           ▼
  app.pagescms.org  ──commit──▶  repo JuliZpta  ──build──▶  Cloudflare Pages
   (panel, gratis)              (fuente de verdad)          (sitio estático)
                                       │
                                       └── también editable por Julián con código
```

El repo es la única fuente de verdad. Ambos editan lo mismo por vías distintas;
no hay sistemas paralelos que puedan desincronizarse.

El sitio se compila; no consulta nada en tiempo de ejecución. El visitante recibe
HTML estático: carga inmediata, nada que se caiga.

## 4. Modelo de contenido

```
src/content/
├── seguros/           un .md por seguro
├── novedades/         un .md por novedad
├── faq/               un .md por pregunta frecuente general
└── config/
    ├── contacto.json
    └── inicio.json
src/assets/img/        imágenes subidas desde el panel
```

**Nota técnica:** las imágenes van en `src/assets/`, **no** en `public/`. Astro
solo optimiza las imágenes que pasan por su pipeline; los archivos de `public/`
se copian tal cual, sin procesar. Ponerlas en `public/` haría que una foto de
celular de 4 MB le llegue de 4 MB al visitante, que es justo lo que la sección 8
promete evitar. En `.pages.yml`, el bloque `media` debe apuntar a `src/assets/img`.

### 4.1 Seguro

| Campo | Tipo | Obligatorio | Uso |
|---|---|---|---|
| `titulo` | string | sí | "Seguro de Vida" |
| `icono` | string | sí | Emoji para el menú y las tarjetas |
| `imagen` | image | no | Portada de la página de detalle |
| `resumen` | text | sí | 2 líneas, para tarjeta y desplegable |
| `coberturas` | list\<string\> | sí | Viñetas de qué cubre |
| `cuerpo` | rich-text | sí | Detalle largo |
| `preguntas` | list\<{pregunta, respuesta}\> | no | FAQ del seguro |
| `destacado` | boolean | sí | Si aparece en el inicio |
| `orden` | number | sí | Posición en el catálogo |

El nombre del archivo define la URL: `vida.md` → `/seguros/vida`.

`destacado` y `orden` existen para que la administradora reordene el catálogo y
decida qué sale en el inicio sin depender de Julián.

### 4.2 Novedad

`titulo` (string), `fecha` (date), `imagen` (image), `resumen` (text),
`cuerpo` (rich-text), `publicado` (boolean).

`publicado: false` permite dejar borradores a medio escribir sin que salgan al aire.

### 4.3 FAQ general

`pregunta` (string), `respuesta` (rich-text), `orden` (number).

Las FAQ operan en dos niveles: las específicas viven dentro de cada seguro (campo
`preguntas`), las generales en esta colección. Las de seguro son las que más
tráfico orgánico atraen, porque coinciden con cómo busca la gente.

### 4.4 Configuración

- `contacto.json` — `whatsapp`, `correo`, `ubicacion`, `horario`
- `inicio.json` — titular y subtítulo del hero, `estadisticas` (lista de
  `{numero, etiqueta}`), texto de "Sobre mí"

Estos archivos existen para sacar del código lo que hoy está incrustado en el
HTML y cambia con relativa frecuencia.

### 4.5 Configuración del CMS

Un archivo `.pages.yml` en la raíz del repo declara estas colecciones y sus
campos. Pages CMS lo lee por repositorio y por rama. La administradora ve
formularios con estos campos exactos — nunca Markdown crudo ni Git.

## 5. Estructura del sitio

| URL | Contenido |
|---|---|
| `/` | Hero, seguros destacados, últimas 3 novedades, contacto |
| `/seguros` | Catálogo completo |
| `/seguros/[slug]` | Detalle de cada seguro — generada automáticamente |
| `/novedades` | Listado de novedades publicadas |
| `/novedades/[slug]` | Novedad completa |
| `/conocenos` | Quién es John Jairo |
| `/preguntas-frecuentes` | FAQ generales |
| `/contacto` | Formulario, WhatsApp y datos |

### 5.1 Navegación

Header con: logo · **Seguros ▾** · Novedades · Conócenos · Contacto (botón).

El desplegable de "Seguros" muestra todos los seguros con icono, nombre y
resumen, más un enlace "Ver todos los seguros →" al catálogo.

**Requisito clave:** el desplegable se genera leyendo la colección `seguros`,
nunca a mano. Al crear un seguro nuevo en el panel, este debe aparecer
automáticamente en el menú, el catálogo, el inicio (si es `destacado`) y el
`sitemap.xml`, sin cambios de código.

En móvil el desplegable se convierte en acordeón dentro del menú hamburguesa.

## 6. Dirección visual

Se descartó el azul deliberadamente: prácticamente toda aseguradora del mercado
es azul (Sura, Bolívar, Allianz, Mapfre, AXA). Un asesor independiente que usa
esa paleta se lee como una versión pequeña de esas compañías — una comparación
que pierde.

**Dirección elegida: oscuro contemporáneo.**

| Rol | Color |
|---|---|
| Fondo profundo | `#08130F` |
| Fondo base | `#0E1F1A` |
| Borde / superficie | `#24463A` |
| Acento | `#4ADE9B` |
| Texto claro | `#F2F5F3` |
| Texto secundario | `#9FB3AB` |

Tipografía de titulares grande, peso 800, tracking negativo (`-0.035em`).
Bordes redondeados moderados (8 px). Bordes de contorno en vez de sombras
pesadas.

### 6.1 Hero con collage

Collage a todo el ancho como fondo del hero: una grilla CSS de 6–8 fotos en
blanco y negro, con un velo verde oscuro en degradado encima que garantiza el
contraste del texto.

**El collage es una grilla CSS, no un archivo de imagen.** Esto permite que se
reacomode en móvil sin cortar caras, que cada foto se optimice por separado, y
que reemplazar una foto sea cambiar un archivo.

Se implementa con imágenes de Unsplash (uso comercial permitido) y se
reemplazarán por fotografías reales de John Jairo cuando estén disponibles, sin
cambios de código.

**Riesgo asumido:** la dirección oscura puede leerse como fría para clientes
mayores, que son parte del público de seguros de vida. Se mitiga con el collage
—fotos de familias y personas reales— y con un tono de escritura cercano.

## 7. Captación de clientes

**WhatsApp es la acción principal** en todo el sitio; el formulario es la
alternativa. En Colombia el formulario convierte notablemente peor.

Cada seguro tiene un botón que abre WhatsApp con el mensaje ya redactado:
*"Hola John Jairo, me interesa el Seguro de Vehículo"*. Así él sabe de entrada de
qué le hablan y desde qué página llegó el cliente. Se implementa con enlaces
`wa.me`, sin backend.

El formulario sigue con Formsubmit, **corregido**: hoy envía a
`zapatajulian42@gmail.com` (`index.html:252`). Debe enviar al correo de John
Jairo, con copia a Julián para detectar fallas.

**Pendiente de Julián:** el WhatsApp y el correo reales. Los datos actuales son
de relleno (`+57 300 000 0000`, `johnjairo@ejemplo.com`, `index.html:187-194`).
No bloquea la implementación: quedan en `contacto.json` y se corrigen desde el
panel.

## 8. Manejo de errores

| Escenario | Comportamiento |
|---|---|
| Contenido incompleto (falta un campo obligatorio) | El build falla. El sitio en vivo **no cambia**. La administradora recibe el aviso; el visitante nunca ve una página rota. |
| Enlace interno roto (se borra un seguro enlazado) | Se detecta en el build, no en producción. |
| Formsubmit no responde | El formulario muestra el error y ofrece el botón de WhatsApp como alternativa. Ningún lead se pierde en silencio. |
| Foto de celular de 3–5 MB | Astro la optimiza en el build: WebP y varios tamaños. La administradora no necesita saber nada de esto. |

La validación se declara con el esquema de Content Collections de Astro. Fallar
el build es preferible a publicar contenido incompleto.

## 9. Estrategia de pruebas

La mayor parte del sitio es contenido, y ahí **el build ya es la prueba** — el
esquema valida cada archivo. Escribir tests de que "el título se renderiza" sería
ceremonia sin valor.

Se prueba lo que tiene lógica real:

1. **Generación de enlaces de WhatsApp** — el mensaje precargado corresponde al
   seguro correcto y está bien codificado en la URL.
2. **Orden y filtrado del catálogo** — `orden` se respeta; solo los `destacado`
   salen en el inicio.
3. **Filtrado de borradores** — las novedades con `publicado: false` no aparecen
   en ninguna página ni en el sitemap. Es el fallo más costoso de los tres.

Adicionalmente, el build de CI debe fallar ante enlaces internos rotos.

## 10. Plan de migración

1. Construir el sitio nuevo en una rama, sin tocar lo que está en vivo.
2. Conectar el repo a Cloudflare Pages y verificar en la URL `*.pages.dev`.
3. Validar contenido, formulario, enlaces de WhatsApp y visualización en móvil.
4. Cargar el contenido real y dar de alta a la administradora en Pages CMS
   (cuenta de GitHub + acceso de colaborador al repo).
5. Apagar el despliegue de Vercel.

Vercel permanece activo hasta el paso 5, de modo que no hay ventana de sitio
caído ni punto de no retorno.

**Dominio propio:** opcional y posterior. Conectarlo a Cloudflare Pages no tiene
costo adicional ni requiere cambios en el código, así que no es una decisión que
deba tomarse ahora.

## 11. Decisiones pendientes

- WhatsApp y correo reales de John Jairo (sección 7).
- Fotografías reales para el collage (sección 6.1). Se arranca con Unsplash.
- Nombre de dominio, si se decide comprarlo (sección 10).

Ninguna bloquea la implementación.

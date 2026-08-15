# JR Seguros — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el sitio estático de una página en un sitio informativo multipágina, administrable desde el celular sin tocar código, con costo cero.

**Architecture:** Astro genera un sitio 100 % estático a partir de archivos Markdown/JSON versionados en el repo. Pages CMS edita esos archivos vía GitHub y cada commit dispara un rebuild en Cloudflare Pages. No hay servidor, ni base de datos, ni autenticación.

**Tech Stack:** Astro 7.2.2 · Vitest 4 · Pages CMS · Cloudflare Pages · Formsubmit · Node 22

**Spec:** `docs/superpowers/specs/2026-08-15-jr-seguros-sitio-cms-design.md`

## Global Constraints

- **Astro 7.2.2**, salida estática (`output: 'static'`). Sin adaptador de servidor.
- **Node 22**, npm 10.
- Colecciones se definen en `src/content.config.ts` (NO `src/content/config.ts`, eliminado en Astro 5).
- Imports: `defineCollection` de `astro:content`, `glob` de `astro/loaders`, `z` de `astro/zod`.
- Renderizado de Markdown: `render(entry)` de `astro:content` (NO `entry.render()`).
- **Toda imagen de contenido vive en `src/assets/img/`.** Nunca en `public/` — Astro no optimiza `public/`.
- **Cero dependencias de pago.** Ninguna tarea puede introducir un servicio con tarjeta.
- **Todo el texto visible, en español.** Nombres de colecciones, campos y archivos de contenido, también en español.
- **WhatsApp es la acción principal** en toda página; el formulario es secundario.
- Paleta exacta (sección 6 del spec):
  | Rol | Hex |
  |---|---|
  | Fondo profundo | `#08130F` |
  | Fondo base | `#0E1F1A` |
  | Borde / superficie | `#24463A` |
  | Acento | `#4ADE9B` |
  | Texto claro | `#F2F5F3` |
  | Texto secundario | `#9FB3AB` |
- Titulares: peso 800, `letter-spacing: -0.035em`. Radio de borde: 8 px.
- Trabajar en la rama `diseno-sitio-cms`. No tocar `main` hasta el despliegue.

---

## Estructura de archivos

```
astro.config.mjs                 integraciones (sitemap), salida estática
vitest.config.ts                 getViteConfig de astro/config
package.json
.pages.yml                       configuración del CMS
src/
  content.config.ts              colecciones + esquemas zod
  content/
    seguros/*.md                 un archivo por seguro
    novedades/*.md               un archivo por novedad
    faq/*.md                     una por pregunta general
    config/contacto.json
    config/inicio.json
  assets/img/
    collage/                     8 fotos del hero
    seguros/                     portadas
    novedades/                   imágenes subidas por el CMS
  lib/
    whatsapp.ts                  construcción de enlaces wa.me
    seguros.ts                   orden y filtrado del catálogo
    novedades.ts                 filtrado de borradores
    imagenes.ts                  ruta del CMS → asset optimizable
    config.ts                    carga y valida los JSON de configuración
  layouts/
    Base.astro                   <html>, <head>, SEO, header, footer
  components/
    Header.astro                 nav + desplegable de seguros
    Footer.astro
    HeroCollage.astro
    TarjetaSeguro.astro
    TarjetaNovedad.astro
    BotonWhatsApp.astro
    ListaFAQ.astro
    FormularioContacto.astro
  styles/global.css              tokens de la paleta
  pages/
    index.astro
    seguros/index.astro
    seguros/[slug].astro
    novedades/index.astro
    novedades/[slug].astro
    conocenos.astro
    preguntas-frecuentes.astro
    contacto.astro
tests/
  whatsapp.test.ts
  seguros.test.ts
  novedades.test.ts
  imagenes.test.ts
```

**Responsabilidades:** cada módulo de `src/lib/` contiene lógica pura y testeable sin renderizar componentes. Los `.astro` solo consultan y presentan. Esa separación es lo que hace que la estrategia de pruebas del spec (§9) sea barata.

---

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `astro.config.mjs`, `vitest.config.ts`, `tsconfig.json`
- Create: `src/styles/global.css`
- Create: `src/pages/index.astro` (provisional)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nada.
- Produces: proyecto que compila con `npm run build` y corre tests con `npm test`. Tokens CSS `--fondo-profundo`, `--fondo`, `--borde`, `--acento`, `--texto`, `--texto-sec`.

- [ ] **Step 1: Inicializar el proyecto**

El repo ya tiene archivos (`index.html`, `style.css`, `img/`). Crear el proyecto Astro **en el mismo directorio sin borrarlos todavía** — se eliminan en la Task 9, cuando el inicio nuevo ya funciona.

```bash
cd /home/julianzapata/pagina-seguros-johnjairo
npm init -y
npm install astro@7.2.2
npm install -D vitest@4 @astrojs/sitemap linkinator
```

- [ ] **Step 2: Escribir `package.json`**

```json
{
  "name": "jr-seguros",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "enlaces": "linkinator dist --recurse --silent"
  }
}
```

Conservar las versiones que instaló npm en `dependencies`/`devDependencies`.

- [ ] **Step 3: Escribir `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jrseguros.pages.dev',
  output: 'static',
  integrations: [sitemap()],
});
```

`site` es obligatorio para que `@astrojs/sitemap` genere URLs absolutas. Se cambia cuando haya dominio propio.

- [ ] **Step 4: Escribir `vitest.config.ts`**

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Escribir `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 6: Escribir `src/styles/global.css`**

```css
:root {
  --fondo-profundo: #08130F;
  --fondo: #0E1F1A;
  --borde: #24463A;
  --acento: #4ADE9B;
  --texto: #F2F5F3;
  --texto-sec: #9FB3AB;
  --radio: 8px;
  --ancho: 1120px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--fondo);
  color: var(--texto);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 { font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; }

a { color: inherit; text-decoration: none; }

.contenedor { max-width: var(--ancho); margin: 0 auto; padding: 0 24px; }

.etiqueta {
  font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--acento);
}

.boton-principal {
  display: inline-block; background: var(--acento); color: var(--fondo-profundo);
  font-weight: 700; padding: 14px 24px; border-radius: var(--radio); border: none;
  cursor: pointer; font-size: 1rem;
}

.boton-secundario {
  display: inline-block; border: 1px solid var(--borde); color: var(--acento);
  font-weight: 600; padding: 13px 22px; border-radius: var(--radio);
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 7: Escribir `src/pages/index.astro` provisional**

```astro
---
import '../styles/global.css';
---
<html lang="es">
  <head><meta charset="utf-8" /><title>JR Seguros</title></head>
  <body><div class="contenedor"><h1>JR Seguros</h1></div></body>
</html>
```

- [ ] **Step 8: Añadir a `.gitignore`**

```
node_modules
dist
.astro
```

- [ ] **Step 9: Verificar que compila**

Run: `npm run build`
Expected: termina sin errores y crea `dist/index.html`.

- [ ] **Step 10: Verificar que Vitest arranca**

Run: `npx vitest run --passWithNoTests`
Expected: `No test files found` y código de salida 0.

`--passWithNoTests` es necesario solo en esta verificación: sin esa bandera Vitest sale con código 1 cuando no hay tests, y parecería que la configuración está rota. Desde la Task 3 en adelante ya hay tests y se usa `npm test` normal.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json astro.config.mjs vitest.config.ts tsconfig.json src/ .gitignore
git commit -m "feat: andamiaje Astro con Vitest y paleta base"
```

---

### Task 2: Colecciones de contenido y contenido semilla

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/seguros/{vida,hogar,vehiculo,empresarial,viaje}.md`
- Create: `src/content/novedades/bienvenida.md`
- Create: `src/content/faq/{cobras-por-asesorar,que-aseguradoras-manejas,como-reclamo}.md`
- Create: `src/content/config/contacto.json`, `src/content/config/inicio.json`
- Create: `src/lib/config.ts`

**Interfaces:**
- Consumes: nada.
- Produces: colecciones `seguros`, `novedades`, `faq` consultables con `getCollection()`. Tipos de entrada:
  - `seguro.data`: `{ titulo: string, icono: string, imagen?: string, resumen: string, coberturas: string[], preguntas: {pregunta: string, respuesta: string}[], destacado: boolean, orden: number }`
  - `novedad.data`: `{ titulo: string, fecha: Date, imagen?: string, resumen: string, publicado: boolean }`
  - `faq.data`: `{ pregunta: string, orden: number }`
  - `src/lib/config.ts` exporta `contacto` y `inicio` ya validados.

- [ ] **Step 1: Escribir `src/content.config.ts`**

`imagen` se declara como `z.string().optional()`, **no** con el helper `image()`. El helper resuelve rutas relativas al archivo Markdown, pero Pages CMS escribe la ruta con el prefijo `output` configurado (`/src/assets/img/...`), que `image()` no resuelve. La Task 6 construye el resolvedor.

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const seguros = defineCollection({
  loader: glob({ base: './src/content/seguros', pattern: '**/*.md' }),
  schema: z.object({
    titulo: z.string(),
    icono: z.string(),
    imagen: z.string().optional(),
    resumen: z.string(),
    coberturas: z.array(z.string()).min(1),
    preguntas: z.array(z.object({
      pregunta: z.string(),
      respuesta: z.string(),
    })).default([]),
    destacado: z.boolean(),
    orden: z.number(),
  }),
});

const novedades = defineCollection({
  loader: glob({ base: './src/content/novedades', pattern: '**/*.md' }),
  schema: z.object({
    titulo: z.string(),
    fecha: z.coerce.date(),
    imagen: z.string().optional(),
    resumen: z.string(),
    publicado: z.boolean().default(false),
  }),
});

const faq = defineCollection({
  loader: glob({ base: './src/content/faq', pattern: '**/*.md' }),
  schema: z.object({
    pregunta: z.string(),
    orden: z.number(),
  }),
});

export const collections = { seguros, novedades, faq };
```

- [ ] **Step 2: Crear los cinco seguros**

Los textos salen del `index.html` actual (líneas 107-160). `src/content/seguros/vida.md`:

```markdown
---
titulo: Seguro de Vida
icono: "❤️"
resumen: El futuro económico de tu familia asegurado, pase lo que pase.
coberturas:
  - Cobertura por fallecimiento
  - Incapacidad total y permanente
  - Enfermedades graves
preguntas:
  - pregunta: ¿Desde qué edad puedo tomarlo?
    respuesta: Desde los 18 años. Las condiciones cambian según la edad, y por eso conviene tomarlo joven.
destacado: true
orden: 1
---

Protege el futuro económico de tu familia en caso de fallecimiento o incapacidad.
Asegura que tus seres queridos tengan estabilidad cuando más lo necesiten.
```

`src/content/seguros/hogar.md`:

```markdown
---
titulo: Seguro de Hogar
icono: "🏠"
resumen: Tu casa y todo lo que hay adentro, protegido.
coberturas:
  - Incendio y explosión
  - Robo y hurto
  - Daños por agua
preguntas: []
destacado: true
orden: 2
---

Protege tu casa, apartamento y sus contenidos frente a incendios, robos, daños
por agua y mucho más. Tu hogar siempre seguro.
```

`src/content/seguros/vehiculo.md`:

```markdown
---
titulo: Seguro de Vehículo
icono: "🚗"
resumen: Carro o moto, con asistencia en carretera incluida.
coberturas:
  - Pérdida total y parcial
  - Responsabilidad civil
  - Asistencia en carretera
preguntas: []
destacado: true
orden: 3
---

Cubre tu carro o moto ante accidentes, robos y daños a terceros. Maneja con
tranquilidad sabiendo que estás protegido.
```

`src/content/seguros/empresarial.md`:

```markdown
---
titulo: Seguro Empresarial
icono: "💼"
resumen: Tu negocio, tus empleados y tus activos, respaldados.
coberturas:
  - Responsabilidad civil empresarial
  - Protección de activos
  - Seguro para empleados
preguntas: []
destacado: false
orden: 4
---

Protege tu negocio, empleados y activos. Ideal para pymes y emprendedores que
quieren operar con respaldo y tranquilidad.
```

`src/content/seguros/viaje.md`:

```markdown
---
titulo: Seguro de Viaje
icono: "✈️"
resumen: Viaja sin preocupaciones, dentro y fuera del país.
coberturas:
  - Gastos médicos en el exterior
  - Cancelación de vuelo
  - Pérdida de equipaje
preguntas: []
destacado: false
orden: 5
---

Viaja sin preocupaciones. Cubre gastos médicos, cancelaciones, pérdida de
equipaje y emergencias durante tu viaje.
```

- [ ] **Step 3: Crear una novedad semilla**

`src/content/novedades/bienvenida.md`:

```markdown
---
titulo: Estrenamos página web
fecha: 2026-08-15
resumen: Ahora puedes consultar todos los seguros y escribirme directo por WhatsApp.
publicado: true
---

Después de varios años asesorando familias y negocios en Colombia, tengo por fin
un lugar donde explicar con calma qué cubre cada seguro.

Si tienes dudas sobre cuál te conviene, escríbeme. La asesoría no te cuesta nada.
```

- [ ] **Step 4: Crear las FAQ generales**

`src/content/faq/cobras-por-asesorar.md`:

```markdown
---
pregunta: ¿Cobras por asesorarme?
orden: 1
---

No. La asesoría es gratuita. Yo recibo una comisión de la aseguradora cuando
tomas una póliza, así que a ti no te cuesta nada consultarme.
```

`src/content/faq/que-aseguradoras-manejas.md`:

```markdown
---
pregunta: ¿Con qué aseguradoras trabajas?
orden: 2
---

Trabajo con las principales aseguradoras del país. Eso me permite comparar
condiciones y precios entre varias, en vez de venderte una sola opción.
```

`src/content/faq/como-reclamo.md`:

```markdown
---
pregunta: Si me pasa algo, ¿tengo que hacer el reclamo solo?
orden: 3
---

No. Te acompaño en todo el proceso del siniestro. Esa es justamente la
diferencia entre comprar un seguro por internet y tener un asesor.
```

- [ ] **Step 5: Crear los archivos de configuración**

`src/content/config/contacto.json` — datos de relleno hasta que Julián entregue los reales (§11 del spec):

```json
{
  "whatsapp": "573000000000",
  "correo": "johnjairo@ejemplo.com",
  "ubicacion": "Colombia",
  "horario": "Lunes a sábado, 8:00 a.m. – 6:00 p.m."
}
```

`whatsapp` va en formato internacional sin `+`, sin espacios y sin guiones, porque se concatena directo en la URL `wa.me`.

`src/content/config/inicio.json`:

```json
{
  "heroTitulo": "Protege lo que más importa",
  "heroResaltado": "importa",
  "heroSubtitulo": "Comparo las aseguradoras del país y te digo cuál te sirve de verdad. La asesoría no te cuesta nada.",
  "heroInsignia": "10 años · +200 familias protegidas",
  "sobreMi": "Soy asesor de seguros comprometido con el bienestar de mis clientes. Mi misión es ofrecerte soluciones claras, honestas y adaptadas a tu situación real, sin tecnicismos ni complicaciones.",
  "estadisticas": [
    { "numero": "+200", "etiqueta": "Clientes satisfechos" },
    { "numero": "10+", "etiqueta": "Años de experiencia" },
    { "numero": "5", "etiqueta": "Tipos de seguros" },
    { "numero": "100%", "etiqueta": "Compromiso contigo" }
  ]
}
```

`heroResaltado` debe ser una subcadena de `heroTitulo`: el componente pinta esa palabra en color acento. Se valida en el paso siguiente.

- [ ] **Step 6: Escribir `src/lib/config.ts`**

```ts
import { z } from 'astro/zod';
import contactoJson from '../content/config/contacto.json';
import inicioJson from '../content/config/inicio.json';

const esquemaContacto = z.object({
  whatsapp: z.string().regex(/^\d{10,15}$/, 'whatsapp debe ser solo dígitos en formato internacional, sin + ni espacios'),
  correo: z.string().email(),
  ubicacion: z.string().min(1),
  horario: z.string().min(1),
});

const esquemaInicio = z.object({
  heroTitulo: z.string().min(1),
  heroResaltado: z.string().min(1),
  heroSubtitulo: z.string().min(1),
  heroInsignia: z.string().min(1),
  sobreMi: z.string().min(1),
  estadisticas: z.array(z.object({
    numero: z.string().min(1),
    etiqueta: z.string().min(1),
  })).min(1),
}).refine((d) => d.heroTitulo.includes(d.heroResaltado), {
  message: 'heroResaltado debe ser una parte exacta de heroTitulo',
  path: ['heroResaltado'],
});

export const contacto = esquemaContacto.parse(contactoJson);
export const inicio = esquemaInicio.parse(inicioJson);
```

`parse` lanza si el contenido es inválido, y como este módulo se importa durante el build, **el build falla y el sitio en vivo no cambia** — el comportamiento que pide la §8 del spec.

- [ ] **Step 7: Verificar que el contenido valida**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 8: Verificar que un contenido inválido rompe el build**

Cambiar temporalmente `"orden": 1` por `"orden": "primero"` en `src/content/seguros/vida.md`.

Run: `npm run build`
Expected: FALLA, con un mensaje de zod indicando que `orden` debe ser número.
Revertir el cambio y volver a compilar para confirmar que pasa.

- [ ] **Step 9: Commit**

```bash
git add src/content.config.ts src/content/ src/lib/config.ts
git commit -m "feat: colecciones de contenido con validación por esquema"
```

---

### Task 3: Módulo de enlaces de WhatsApp

**Files:**
- Create: `src/lib/whatsapp.ts`
- Test: `tests/whatsapp.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `enlaceWhatsApp(numero: string, mensaje: string): string`, `mensajeSeguro(titulo: string): string`.

- [ ] **Step 1: Escribir el test que falla**

`tests/whatsapp.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { enlaceWhatsApp, mensajeSeguro } from '../src/lib/whatsapp';

describe('enlaceWhatsApp', () => {
  it('construye la URL wa.me con el número y el mensaje codificado', () => {
    expect(enlaceWhatsApp('573001112233', 'Hola John Jairo'))
      .toBe('https://wa.me/573001112233?text=Hola%20John%20Jairo');
  });

  it('codifica tildes, eñes y signos de interrogación', () => {
    const url = enlaceWhatsApp('573001112233', '¿Cuánto cuesta el seguro de año?');
    expect(url).toContain('%C2%BF');
    expect(url).toContain('%C3%A1');
    expect(url).toContain('%C3%B1');
    expect(url).not.toContain(' ');
  });

  it('rechaza un número que no sea solo dígitos', () => {
    expect(() => enlaceWhatsApp('+57 300 111 2233', 'Hola')).toThrow(/dígitos/);
  });
});

describe('mensajeSeguro', () => {
  it('arma el mensaje mencionando el seguro exacto', () => {
    expect(mensajeSeguro('Seguro de Vehículo'))
      .toBe('Hola John Jairo, me interesa el Seguro de Vehículo. ¿Me puedes asesorar?');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/whatsapp.test.ts`
Expected: FALLA — no existe `src/lib/whatsapp.ts`.

- [ ] **Step 3: Escribir la implementación mínima**

`src/lib/whatsapp.ts`:

```ts
export function enlaceWhatsApp(numero: string, mensaje: string): string {
  if (!/^\d{10,15}$/.test(numero)) {
    throw new Error(`El número de WhatsApp debe ser solo dígitos en formato internacional: ${numero}`);
  }
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeSeguro(titulo: string): string {
  return `Hola John Jairo, me interesa el ${titulo}. ¿Me puedes asesorar?`;
}
```

`encodeURIComponent` codifica el espacio como `%20`, que es lo que espera `wa.me`.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/whatsapp.test.ts`
Expected: 4 tests PASAN.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp.ts tests/whatsapp.test.ts
git commit -m "feat: enlaces de WhatsApp con mensaje precargado por seguro"
```

---

### Task 4: Orden y filtrado del catálogo de seguros

**Files:**
- Create: `src/lib/seguros.ts`
- Test: `tests/seguros.test.ts`

**Interfaces:**
- Consumes: tipos de la colección `seguros` (Task 2).
- Produces: `ordenarSeguros(lista)`, `soloDestacados(lista)`. Ambas reciben y devuelven `SeguroBasico[]`, donde `SeguroBasico = { id: string, data: { orden: number, destacado: boolean, titulo: string } }`.

Se tipa con una interfaz mínima estructural para poder testear sin arrancar Astro.

- [ ] **Step 1: Escribir el test que falla**

`tests/seguros.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ordenarSeguros, soloDestacados, type SeguroBasico } from '../src/lib/seguros';

const muestra: SeguroBasico[] = [
  { id: 'viaje', data: { titulo: 'Seguro de Viaje', orden: 5, destacado: false } },
  { id: 'vida', data: { titulo: 'Seguro de Vida', orden: 1, destacado: true } },
  { id: 'vehiculo', data: { titulo: 'Seguro de Vehículo', orden: 3, destacado: true } },
  { id: 'hogar', data: { titulo: 'Seguro de Hogar', orden: 2, destacado: true } },
];

describe('ordenarSeguros', () => {
  it('ordena por el campo orden de menor a mayor', () => {
    expect(ordenarSeguros(muestra).map((s) => s.id))
      .toEqual(['vida', 'hogar', 'vehiculo', 'viaje']);
  });

  it('no muta el arreglo original', () => {
    const copia = [...muestra];
    ordenarSeguros(muestra);
    expect(muestra).toEqual(copia);
  });

  it('desempata alfabéticamente por título cuando el orden se repite', () => {
    const empate: SeguroBasico[] = [
      { id: 'b', data: { titulo: 'Zeta', orden: 1, destacado: true } },
      { id: 'a', data: { titulo: 'Alfa', orden: 1, destacado: true } },
    ];
    expect(ordenarSeguros(empate).map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('soloDestacados', () => {
  it('devuelve únicamente los destacados, ya ordenados', () => {
    expect(soloDestacados(muestra).map((s) => s.id))
      .toEqual(['vida', 'hogar', 'vehiculo']);
  });

  it('devuelve arreglo vacío si ninguno está destacado', () => {
    const ninguno = muestra.map((s) => ({ ...s, data: { ...s.data, destacado: false } }));
    expect(soloDestacados(ninguno)).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/seguros.test.ts`
Expected: FALLA — no existe `src/lib/seguros.ts`.

- [ ] **Step 3: Escribir la implementación mínima**

`src/lib/seguros.ts`:

```ts
export interface SeguroBasico {
  id: string;
  data: { titulo: string; orden: number; destacado: boolean };
}

export function ordenarSeguros<T extends SeguroBasico>(lista: T[]): T[] {
  return [...lista].sort((a, b) =>
    a.data.orden - b.data.orden || a.data.titulo.localeCompare(b.data.titulo, 'es')
  );
}

export function soloDestacados<T extends SeguroBasico>(lista: T[]): T[] {
  return ordenarSeguros(lista.filter((s) => s.data.destacado));
}
```

El desempate alfabético evita que dos seguros con el mismo `orden` cambien de posición entre builds — un error fácil de cometer desde el panel.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/seguros.test.ts`
Expected: 5 tests PASAN.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seguros.ts tests/seguros.test.ts
git commit -m "feat: orden y filtrado del catálogo de seguros"
```

---

### Task 5: Filtrado de novedades no publicadas

**Files:**
- Create: `src/lib/novedades.ts`
- Test: `tests/novedades.test.ts`

**Interfaces:**
- Consumes: tipos de la colección `novedades` (Task 2).
- Produces: `novedadesPublicadas(lista)`, `ultimasNovedades(lista, cantidad)`. Tipo `NovedadBasica = { id: string, data: { titulo: string, fecha: Date, publicado: boolean } }`.

Es el filtro más costoso si falla: publicaría un borrador a medio escribir.

- [ ] **Step 1: Escribir el test que falla**

`tests/novedades.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { novedadesPublicadas, ultimasNovedades, type NovedadBasica } from '../src/lib/novedades';

const muestra: NovedadBasica[] = [
  { id: 'vieja',    data: { titulo: 'Vieja',    fecha: new Date('2026-01-10'), publicado: true } },
  { id: 'borrador', data: { titulo: 'Borrador', fecha: new Date('2026-08-14'), publicado: false } },
  { id: 'nueva',    data: { titulo: 'Nueva',    fecha: new Date('2026-08-01'), publicado: true } },
  { id: 'media',    data: { titulo: 'Media',    fecha: new Date('2026-05-05'), publicado: true } },
];

describe('novedadesPublicadas', () => {
  it('excluye las que tienen publicado false', () => {
    expect(novedadesPublicadas(muestra).map((n) => n.id)).not.toContain('borrador');
  });

  it('ordena de más reciente a más antigua', () => {
    expect(novedadesPublicadas(muestra).map((n) => n.id))
      .toEqual(['nueva', 'media', 'vieja']);
  });

  it('devuelve vacío cuando no hay ninguna publicada', () => {
    const ninguna = muestra.map((n) => ({ ...n, data: { ...n.data, publicado: false } }));
    expect(novedadesPublicadas(ninguna)).toEqual([]);
  });
});

describe('ultimasNovedades', () => {
  it('recorta a la cantidad pedida', () => {
    expect(ultimasNovedades(muestra, 2).map((n) => n.id)).toEqual(['nueva', 'media']);
  });

  it('nunca incluye borradores aunque falte cupo', () => {
    expect(ultimasNovedades(muestra, 10).map((n) => n.id)).not.toContain('borrador');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/novedades.test.ts`
Expected: FALLA — no existe `src/lib/novedades.ts`.

- [ ] **Step 3: Escribir la implementación mínima**

`src/lib/novedades.ts`:

```ts
export interface NovedadBasica {
  id: string;
  data: { titulo: string; fecha: Date; publicado: boolean };
}

export function novedadesPublicadas<T extends NovedadBasica>(lista: T[]): T[] {
  return lista
    .filter((n) => n.data.publicado)
    .sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());
}

export function ultimasNovedades<T extends NovedadBasica>(lista: T[], cantidad: number): T[] {
  return novedadesPublicadas(lista).slice(0, cantidad);
}
```

`ultimasNovedades` delega en `novedadesPublicadas` en vez de repetir el filtro: así es imposible que una ruta olvide excluir borradores.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/novedades.test.ts`
Expected: 5 tests PASAN.

- [ ] **Step 5: Commit**

```bash
git add src/lib/novedades.ts tests/novedades.test.ts
git commit -m "feat: filtrado de novedades no publicadas"
```

---

### Task 6: Resolvedor de imágenes del CMS

**Files:**
- Create: `src/lib/imagenes.ts`
- Test: `tests/imagenes.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `normalizarRuta(ruta: string): string` y `resolverImagen(ruta?: string): ImageMetadata | undefined`.

**Por qué existe esta tarea.** El helper `image()` de Astro resuelve rutas *relativas al archivo Markdown*. Pages CMS escribe en el frontmatter el prefijo `output` configurado en `.pages.yml` (`/src/assets/img/foto.jpg`), que no es relativo. Sin este módulo, ninguna imagen subida desde el panel se optimizaría — y la §8 del spec quedaría incumplida.

`normalizarRuta` es lógica pura y se testea sola. `resolverImagen` usa `import.meta.glob`, que solo existe bajo Vite, por eso solo se prueba la parte pura.

- [ ] **Step 1: Escribir el test que falla**

`tests/imagenes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizarRuta } from '../src/lib/imagenes';

describe('normalizarRuta', () => {
  it('deja intacta una ruta absoluta desde la raíz del proyecto', () => {
    expect(normalizarRuta('/src/assets/img/foto.jpg')).toBe('/src/assets/img/foto.jpg');
  });

  it('antepone la barra si el CMS la omite', () => {
    expect(normalizarRuta('src/assets/img/foto.jpg')).toBe('/src/assets/img/foto.jpg');
  });

  it('reescribe rutas heredadas que apuntaban a public', () => {
    expect(normalizarRuta('/img/hero/hero-image.png')).toBe('/src/assets/img/hero/hero-image.png');
  });

  it('decodifica espacios codificados en el nombre del archivo', () => {
    expect(normalizarRuta('/src/assets/img/mi%20foto.jpg')).toBe('/src/assets/img/mi foto.jpg');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/imagenes.test.ts`
Expected: FALLA — no existe `src/lib/imagenes.ts`.

- [ ] **Step 3: Escribir la implementación mínima**

`src/lib/imagenes.ts`:

```ts
const BASE = '/src/assets/img';

export function normalizarRuta(ruta: string): string {
  let r = decodeURIComponent(ruta.trim());
  if (!r.startsWith('/')) r = `/${r}`;
  if (r.startsWith('/img/')) r = `${BASE}${r.slice('/img'.length)}`;
  return r;
}

const mapa = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/img/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true }
);

export function resolverImagen(ruta?: string): ImageMetadata | undefined {
  if (!ruta) return undefined;
  const clave = normalizarRuta(ruta);
  const modulo = mapa[clave];
  if (!modulo) {
    throw new Error(
      `No se encontró la imagen "${clave}". Verifica que exista en src/assets/img/ y que .pages.yml use output: /src/assets/img`
    );
  }
  return modulo.default;
}
```

Lanzar en vez de devolver `undefined` cuando la ruta no existe hace que un borrado accidental de imagen rompa el build, no la página en vivo — coherente con la §8.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/imagenes.test.ts`
Expected: 4 tests PASAN.

- [ ] **Step 5: Commit**

```bash
git add src/lib/imagenes.ts tests/imagenes.test.ts
git commit -m "feat: resolvedor de imágenes subidas desde el CMS"
```

---

### Task 7: Layout base, header con desplegable y footer

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/components/BotonWhatsApp.astro`

**Interfaces:**
- Consumes: `contacto` (Task 2), `enlaceWhatsApp`/`mensajeSeguro` (Task 3), `ordenarSeguros` (Task 4).
- Produces:
  - `Base.astro` — props `{ titulo: string, descripcion: string, imagen?: string }`, slot por defecto.
  - `BotonWhatsApp.astro` — props `{ mensaje: string, texto?: string, variante?: 'principal' | 'secundario' }`.

**Requisito clave (§5.1 del spec):** el desplegable se construye con `getCollection('seguros')`. Está prohibido escribir la lista a mano.

- [ ] **Step 1: Escribir `src/components/BotonWhatsApp.astro`**

```astro
---
import { contacto } from '../lib/config';
import { enlaceWhatsApp } from '../lib/whatsapp';

interface Props { mensaje: string; texto?: string; variante?: 'principal' | 'secundario'; }
const { mensaje, texto = 'Escríbeme por WhatsApp', variante = 'principal' } = Astro.props;
const url = enlaceWhatsApp(contacto.whatsapp, mensaje);
---
<a href={url} target="_blank" rel="noopener noreferrer"
   class={variante === 'principal' ? 'boton-principal' : 'boton-secundario'}>
  {texto}
</a>
```

- [ ] **Step 2: Escribir `src/components/Header.astro`**

```astro
---
import { getCollection } from 'astro:content';
import { ordenarSeguros } from '../lib/seguros';

const seguros = ordenarSeguros(await getCollection('seguros'));
const ruta = Astro.url.pathname;
---
<header class="cabecera">
  <div class="contenedor barra">
    <a href="/" class="marca">JR<span>.</span></a>

    <button class="hamburguesa" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú">
      <span></span><span></span><span></span>
    </button>

    <nav id="menu" class="menu">
      <div class="grupo">
        <button class="disparador" aria-expanded="false" aria-controls="panel-seguros">
          Seguros <span aria-hidden="true">▾</span>
        </button>
        <div id="panel-seguros" class="panel" hidden>
          <div class="panel-rejilla">
            {seguros.map((s) => (
              <a href={`/seguros/${s.id}`} class="panel-item">
                <span class="panel-icono" aria-hidden="true">{s.data.icono}</span>
                <span>
                  <strong>{s.data.titulo}</strong>
                  <small>{s.data.resumen}</small>
                </span>
              </a>
            ))}
          </div>
          <a href="/seguros" class="panel-pie">Ver todos los seguros →</a>
        </div>
      </div>

      <a href="/novedades" aria-current={ruta.startsWith('/novedades') ? 'page' : undefined}>Novedades</a>
      <a href="/conocenos" aria-current={ruta === '/conocenos' ? 'page' : undefined}>Conócenos</a>
      <a href="/preguntas-frecuentes" aria-current={ruta === '/preguntas-frecuentes' ? 'page' : undefined}>Preguntas frecuentes</a>
      <a href="/contacto" class="boton-principal">Contacto</a>
    </nav>
  </div>
</header>

<style>
  .cabecera { background: var(--fondo); border-bottom: 1px solid var(--borde); position: sticky; top: 0; z-index: 50; }
  .barra { display: flex; align-items: center; justify-content: space-between; padding-block: 14px; }
  .marca { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; }
  .marca span { color: var(--acento); }
  .menu { display: flex; align-items: center; gap: 24px; font-size: 0.95rem; }
  .menu > a { color: var(--texto-sec); }
  .menu > a:hover, .menu > a[aria-current='page'] { color: var(--texto); }
  .menu > a.boton-principal { color: var(--fondo-profundo); }
  .grupo { position: relative; }
  .disparador { background: none; border: none; color: var(--texto-sec); font: inherit; cursor: pointer; padding: 0; }
  .disparador[aria-expanded='true'] { color: var(--acento); }
  .panel {
    position: absolute; top: calc(100% + 14px); left: 50%; transform: translateX(-50%);
    width: min(560px, 90vw); background: #132A22; border: 1px solid var(--borde);
    border-radius: 12px; padding: 10px; box-shadow: 0 22px 45px rgba(0,0,0,.55);
  }
  .panel[hidden] { display: none; }
  .panel-rejilla { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .panel-item { display: flex; gap: 10px; padding: 11px; border-radius: var(--radio); }
  .panel-item:hover { background: #1C3B30; }
  .panel-icono { font-size: 1.15rem; }
  .panel-item strong { display: block; font-size: 0.92rem; }
  .panel-item small { display: block; color: var(--texto-sec); font-size: 0.78rem; margin-top: 2px; }
  .panel-pie { display: block; border-top: 1px solid var(--borde); margin-top: 8px; padding: 12px; color: var(--acento); font-size: 0.88rem; font-weight: 600; }
  .hamburguesa { display: none; flex-direction: column; gap: 4px; background: none; border: none; cursor: pointer; padding: 8px; }
  .hamburguesa span { width: 22px; height: 2px; background: var(--texto); }

  @media (max-width: 860px) {
    .hamburguesa { display: flex; }
    .menu {
      display: none; position: absolute; top: 100%; left: 0; right: 0;
      flex-direction: column; align-items: stretch; gap: 0;
      background: var(--fondo); border-bottom: 1px solid var(--borde); padding: 12px 24px 20px;
    }
    .menu.abierto { display: flex; }
    .menu > a, .disparador { padding: 14px 0; border-bottom: 1px solid var(--borde); text-align: left; width: 100%; }
    .menu > a.boton-principal { text-align: center; margin-top: 14px; border: none; }
    .panel { position: static; transform: none; width: 100%; box-shadow: none; background: transparent; border: none; padding: 0 0 0 8px; }
    .panel-rejilla { grid-template-columns: 1fr; }
  }
</style>

<script>
  const hamburguesa = document.querySelector<HTMLButtonElement>('.hamburguesa');
  const menu = document.querySelector<HTMLElement>('#menu');
  const disparador = document.querySelector<HTMLButtonElement>('.disparador');
  const panel = document.querySelector<HTMLElement>('#panel-seguros');

  hamburguesa?.addEventListener('click', () => {
    const abierto = menu?.classList.toggle('abierto') ?? false;
    hamburguesa.setAttribute('aria-expanded', String(abierto));
  });

  function alternarPanel(mostrar: boolean) {
    if (!panel || !disparador) return;
    panel.hidden = !mostrar;
    disparador.setAttribute('aria-expanded', String(mostrar));
  }

  disparador?.addEventListener('click', () => alternarPanel(panel?.hidden ?? true));

  document.addEventListener('click', (e) => {
    if (!panel || panel.hidden) return;
    const dentro = panel.contains(e.target as Node) || disparador?.contains(e.target as Node);
    if (!dentro) alternarPanel(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') alternarPanel(false);
  });
</script>
```

`aria-expanded`, `aria-controls` y el cierre con `Escape` no son adorno: sin ellos el menú es inutilizable con teclado o lector de pantalla.

- [ ] **Step 3: Escribir `src/components/Footer.astro`**

```astro
---
import { getCollection } from 'astro:content';
import { ordenarSeguros } from '../lib/seguros';
import { contacto } from '../lib/config';

const seguros = ordenarSeguros(await getCollection('seguros'));
const anio = new Date().getFullYear();
---
<footer class="pie">
  <div class="contenedor rejilla">
    <div>
      <div class="marca">JR<span>.</span></div>
      <p>Asesor profesional de seguros — {contacto.ubicacion}</p>
      <p class="horario">{contacto.horario}</p>
    </div>
    <div>
      <h3>Seguros</h3>
      <ul>{seguros.map((s) => <li><a href={`/seguros/${s.id}`}>{s.data.titulo}</a></li>)}</ul>
    </div>
    <div>
      <h3>Enlaces</h3>
      <ul>
        <li><a href="/novedades">Novedades</a></li>
        <li><a href="/conocenos">Conócenos</a></li>
        <li><a href="/preguntas-frecuentes">Preguntas frecuentes</a></li>
        <li><a href="/contacto">Contacto</a></li>
      </ul>
    </div>
  </div>
  <div class="contenedor copia">© {anio} JR Seguros. Todos los derechos reservados.</div>
</footer>

<style>
  .pie { background: var(--fondo-profundo); border-top: 1px solid var(--borde); padding-top: 48px; margin-top: 64px; }
  .rejilla { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 32px; padding-bottom: 32px; }
  .marca { font-size: 1.3rem; font-weight: 800; margin-bottom: 10px; }
  .marca span { color: var(--acento); }
  .pie p { color: var(--texto-sec); font-size: 0.9rem; }
  .horario { margin-top: 6px; font-size: 0.85rem; }
  .pie h3 { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--acento); margin-bottom: 12px; }
  .pie ul { list-style: none; display: grid; gap: 8px; }
  .pie li a { color: var(--texto-sec); font-size: 0.9rem; }
  .pie li a:hover { color: var(--texto); }
  .copia { border-top: 1px solid var(--borde); padding-block: 20px; color: var(--texto-sec); font-size: 0.82rem; }
  @media (max-width: 760px) { .rejilla { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 4: Escribir `src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props { titulo: string; descripcion: string; imagen?: string; }
const { titulo, descripcion, imagen } = Astro.props;
const tituloCompleto = titulo === 'JR Seguros' ? titulo : `${titulo} — JR Seguros`;
const canonica = new URL(Astro.url.pathname, Astro.site).href;
const og = imagen ? new URL(imagen, Astro.site).href : undefined;
---
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{tituloCompleto}</title>
    <meta name="description" content={descripcion} />
    <link rel="canonical" href={canonica} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={tituloCompleto} />
    <meta property="og:description" content={descripcion} />
    <meta property="og:url" content={canonica} />
    <meta property="og:locale" content="es_CO" />
    {og && <meta property="og:image" content={og} />}
    <meta name="twitter:card" content={og ? 'summary_large_image' : 'summary'} />
    <link rel="sitemap" href="/sitemap-index.xml" />
  </head>
  <body>
    <Header />
    <main><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 5: Conectar el layout al inicio provisional**

Reemplazar `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base titulo="JR Seguros" descripcion="Asesor profesional de seguros en Colombia.">
  <div class="contenedor"><h1>JR Seguros</h1></div>
</Base>
```

- [ ] **Step 6: Verificar visualmente**

Run: `npm run dev`
Abrir `http://localhost:4321`. Verificar:
- El desplegable "Seguros" abre y lista los 5 seguros con su icono y resumen.
- Cierra con `Escape` y al hacer clic afuera.
- A menos de 860 px aparece la hamburguesa y el panel se vuelve acordeón.
- El pie lista los 5 seguros.

- [ ] **Step 7: Verificar que compila**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/layouts/ src/components/ src/pages/index.astro
git commit -m "feat: layout base con header desplegable generado desde la colección"
```

---

### Task 8: Hero con collage

**Files:**
- Create: `src/components/HeroCollage.astro`
- Create: `src/assets/img/collage/` (8 fotos)

**Interfaces:**
- Consumes: `inicio` (Task 2), `BotonWhatsApp` (Task 7).
- Produces: `HeroCollage.astro` sin props; lee todo de `inicio.json`.

- [ ] **Step 1: Conseguir las 8 fotos**

Descargar de [Unsplash](https://unsplash.com) (licencia de uso comercial, sin atribución obligatoria) 8 fotos horizontales, mínimo 1200 px de ancho, con estos temas y nombres exactos:

```
src/assets/img/collage/familia.jpg
src/assets/img/collage/casa.jpg
src/assets/img/collage/carro.jpg
src/assets/img/collage/viaje.jpg
src/assets/img/collage/negocio.jpg
src/assets/img/collage/abuelos.jpg
src/assets/img/collage/ninos.jpg
src/assets/img/collage/moto.jpg
```

Buscar personas latinoamericanas donde sea posible. Se reemplazarán por fotos reales de John Jairo cuando estén disponibles (§11 del spec); los nombres de archivo no cambian, así que el reemplazo no toca código.

- [ ] **Step 2: Escribir `src/components/HeroCollage.astro`**

```astro
---
import { Image } from 'astro:assets';
import { inicio } from '../lib/config';
import BotonWhatsApp from './BotonWhatsApp.astro';

import familia from '../assets/img/collage/familia.jpg';
import casa from '../assets/img/collage/casa.jpg';
import carro from '../assets/img/collage/carro.jpg';
import viaje from '../assets/img/collage/viaje.jpg';
import negocio from '../assets/img/collage/negocio.jpg';
import abuelos from '../assets/img/collage/abuelos.jpg';
import ninos from '../assets/img/collage/ninos.jpg';
import moto from '../assets/img/collage/moto.jpg';

const fotos = [
  { src: familia, clase: 'grande' },
  { src: casa, clase: '' },
  { src: carro, clase: '' },
  { src: viaje, clase: '' },
  { src: negocio, clase: '' },
  { src: abuelos, clase: '' },
  { src: ninos, clase: 'ancha' },
  { src: moto, clase: '' },
];

const [antes, despues] = inicio.heroTitulo.split(inicio.heroResaltado);
---
<section class="hero">
  <div class="collage" aria-hidden="true">
    {fotos.map((f) => (
      <Image src={f.src} alt="" widths={[300, 600]} format="webp" quality={70} class={f.clase} loading="eager" />
    ))}
  </div>
  <div class="velo" aria-hidden="true"></div>

  <div class="contenedor texto">
    <p class="insignia">{inicio.heroInsignia}</p>
    <h1>{antes}<span>{inicio.heroResaltado}</span>{despues}</h1>
    <p class="sub">{inicio.heroSubtitulo}</p>
    <div class="acciones">
      <BotonWhatsApp mensaje="Hola John Jairo, quiero asesoría sobre seguros." />
      <a href="/seguros" class="boton-secundario">Ver seguros</a>
    </div>
  </div>
</section>

<style>
  .hero { position: relative; overflow: hidden; }
  .collage {
    position: absolute; inset: 0;
    display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(3, 1fr); gap: 3px;
  }
  .collage :global(img) { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); }
  .collage :global(.grande) { grid-column: span 2; grid-row: span 2; }
  .collage :global(.ancha) { grid-column: span 2; }
  .velo {
    position: absolute; inset: 0;
    background: linear-gradient(100deg, #08130Ff7 0%, #0E1F1Aef 42%, #0E1F1Ac0 72%, #0E1F1A99 100%);
  }
  .texto { position: relative; padding-block: 96px; }
  .insignia {
    display: inline-block; font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--acento); border: 1px solid var(--borde); padding: 6px 14px; border-radius: 99px; margin-bottom: 22px;
  }
  h1 { font-size: clamp(2.4rem, 6vw, 4rem); margin-bottom: 18px; }
  h1 span { color: var(--acento); }
  .sub { color: var(--texto-sec); font-size: 1.05rem; max-width: 32rem; margin-bottom: 30px; }
  .acciones { display: flex; gap: 12px; flex-wrap: wrap; }

  @media (max-width: 760px) {
    .collage { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(4, 1fr); }
    .velo { background: linear-gradient(180deg, #08130Fee 0%, #0E1F1Af5 60%, #0E1F1A 100%); }
    .texto { padding-block: 64px; }
  }
</style>
```

El `alt=""` y el `aria-hidden` son correctos: el collage es decorativo y describirlo solo estorbaría a un lector de pantalla.

- [ ] **Step 3: Montarlo en el inicio**

```astro
---
import Base from '../layouts/Base.astro';
import HeroCollage from '../components/HeroCollage.astro';
---
<Base titulo="JR Seguros" descripcion="Asesor profesional de seguros en Colombia. Asesoría gratuita en seguros de vida, hogar, vehículo, empresarial y viaje.">
  <HeroCollage />
</Base>
```

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`
Verificar: el titular se lee con claridad sobre las fotos, "importa" sale en verde acento, y en móvil el collage se reacomoda a 3 columnas sin que el texto pierda contraste.

- [ ] **Step 5: Verificar el peso de las imágenes**

Run: `npm run build && du -sh dist/_astro/*.webp | sort -h | tail -5`
Expected: ninguna imagen del collage supera ~150 KB. Si alguna se pasa, bajar `quality` o reducir el tamaño del original.

- [ ] **Step 6: Commit**

```bash
git add src/components/HeroCollage.astro src/assets/img/collage/ src/pages/index.astro
git commit -m "feat: hero con collage en mosaico"
```

---

### Task 9: Página de inicio completa

**Files:**
- Create: `src/components/TarjetaSeguro.astro`, `src/components/TarjetaNovedad.astro`
- Modify: `src/pages/index.astro`
- Delete: `index.html`, `style.css`, `img/`, `vercel.json`

**Interfaces:**
- Consumes: `soloDestacados` (Task 4), `ultimasNovedades` (Task 5), `resolverImagen` (Task 6), `inicio` (Task 2).
- Produces: `TarjetaSeguro.astro` con props `{ seguro }`; `TarjetaNovedad.astro` con props `{ novedad }`.

- [ ] **Step 1: Escribir `src/components/TarjetaSeguro.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
interface Props { seguro: CollectionEntry<'seguros'>; }
const { seguro } = Astro.props;
---
<a href={`/seguros/${seguro.id}`} class="tarjeta">
  <span class="icono" aria-hidden="true">{seguro.data.icono}</span>
  <h3>{seguro.data.titulo}</h3>
  <p>{seguro.data.resumen}</p>
  <span class="enlace">Conocer más →</span>
</a>

<style>
  .tarjeta {
    display: block; background: var(--fondo); border: 1px solid var(--borde);
    border-radius: 12px; padding: 24px; transition: border-color .18s, transform .18s;
  }
  .tarjeta:hover { border-color: var(--acento); transform: translateY(-2px); }
  .icono { font-size: 1.7rem; display: block; margin-bottom: 14px; }
  h3 { font-size: 1.12rem; margin-bottom: 8px; }
  p { color: var(--texto-sec); font-size: 0.92rem; margin-bottom: 16px; }
  .enlace { color: var(--acento); font-size: 0.88rem; font-weight: 600; }
  @media (prefers-reduced-motion: reduce) { .tarjeta:hover { transform: none; } }
</style>
```

- [ ] **Step 2: Escribir `src/components/TarjetaNovedad.astro`**

```astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { resolverImagen } from '../lib/imagenes';

interface Props { novedad: CollectionEntry<'novedades'>; }
const { novedad } = Astro.props;
const imagen = resolverImagen(novedad.data.imagen);
const fecha = novedad.data.fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
---
<a href={`/novedades/${novedad.id}`} class="tarjeta">
  {imagen && <Image src={imagen} alt="" widths={[400, 800]} format="webp" quality={75} class="portada" />}
  <div class="cuerpo">
    <time datetime={novedad.data.fecha.toISOString()}>{fecha}</time>
    <h3>{novedad.data.titulo}</h3>
    <p>{novedad.data.resumen}</p>
  </div>
</a>

<style>
  .tarjeta {
    display: block; border: 1px solid var(--borde); border-radius: 12px;
    overflow: hidden; background: var(--fondo); transition: border-color .18s;
  }
  .tarjeta:hover { border-color: var(--acento); }
  .portada { width: 100%; height: 160px; object-fit: cover; display: block; }
  .cuerpo { padding: 18px; }
  time { color: var(--acento); font-size: 0.75rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
  h3 { font-size: 1.02rem; margin: 8px 0; }
  p { color: var(--texto-sec); font-size: 0.9rem; }
</style>
```

- [ ] **Step 3: Escribir el inicio completo**

`src/pages/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import HeroCollage from '../components/HeroCollage.astro';
import TarjetaSeguro from '../components/TarjetaSeguro.astro';
import TarjetaNovedad from '../components/TarjetaNovedad.astro';
import BotonWhatsApp from '../components/BotonWhatsApp.astro';
import { soloDestacados } from '../lib/seguros';
import { ultimasNovedades } from '../lib/novedades';
import { inicio } from '../lib/config';

const todos = await getCollection('seguros');
const destacados = soloDestacados(todos);
const novedades = ultimasNovedades(await getCollection('novedades'), 3);
---
<Base titulo="JR Seguros" descripcion="Asesor profesional de seguros en Colombia. Asesoría gratuita en seguros de vida, hogar, vehículo, empresarial y viaje.">
  <HeroCollage />

  <section class="contenedor bloque">
    <p class="etiqueta">Mis productos</p>
    <h2>Seguros que ofrezco</h2>
    <div class="rejilla-seguros">
      {destacados.map((s) => <TarjetaSeguro seguro={s} />)}
    </div>
    <p class="centro">
      <a href="/seguros" class="boton-secundario">Ver los {todos.length} seguros →</a>
    </p>
  </section>

  <section class="contenedor bloque">
    <p class="etiqueta">Quién te asesora</p>
    <h2>Sobre John Jairo</h2>
    <p class="sobre">{inicio.sobreMi}</p>
    <div class="rejilla-stats">
      {inicio.estadisticas.map((e) => (
        <div class="stat"><strong>{e.numero}</strong><span>{e.etiqueta}</span></div>
      ))}
    </div>
    <p class="centro"><a href="/conocenos" class="boton-secundario">Conócelo mejor →</a></p>
  </section>

  {novedades.length > 0 && (
    <section class="contenedor bloque">
      <p class="etiqueta">Al día</p>
      <h2>Novedades</h2>
      <div class="rejilla-novedades">
        {novedades.map((n) => <TarjetaNovedad novedad={n} />)}
      </div>
    </section>
  )}

  <section class="contenedor bloque centro">
    <h2>¿No sabes cuál seguro necesitas?</h2>
    <p class="sobre">Cuéntame tu situación y juntos encontramos la mejor opción. La asesoría no te cuesta nada.</p>
    <BotonWhatsApp mensaje="Hola John Jairo, no sé qué seguro necesito. ¿Me puedes asesorar?" />
  </section>
</Base>

<style>
  .bloque { padding-block: 64px; }
  h2 { font-size: clamp(1.7rem, 4vw, 2.3rem); margin-block: 8px 26px; }
  .rejilla-seguros, .rejilla-novedades { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .rejilla-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 28px; }
  .stat { border: 1px solid var(--borde); border-radius: 12px; padding: 22px; text-align: center; }
  .stat strong { display: block; font-size: 1.9rem; font-weight: 800; color: var(--acento); letter-spacing: -0.03em; }
  .stat span { color: var(--texto-sec); font-size: 0.85rem; }
  .sobre { color: var(--texto-sec); max-width: 44rem; }
  .centro { text-align: center; margin-top: 26px; }
  .centro .sobre { margin-inline: auto; margin-bottom: 22px; }
  @media (max-width: 900px) { .rejilla-seguros, .rejilla-novedades { grid-template-columns: 1fr; } .rejilla-stats { grid-template-columns: repeat(2, 1fr); } }
</style>
```

`Ver los {todos.length} seguros` usa el conteo real: al crear un seguro nuevo desde el panel, el texto se actualiza solo.

- [ ] **Step 4: Verificar visualmente antes de borrar lo viejo**

Run: `npm run dev`
Verificar: se ven 3 seguros destacados, las 4 estadísticas, 1 novedad, y todos los botones de WhatsApp abren con el mensaje correcto.

- [ ] **Step 5: Eliminar el sitio antiguo**

Solo después de confirmar el paso anterior:

```bash
git rm -r index.html style.css img/ vercel.json
```

`vercel.json` se va porque el hosting pasa a Cloudflare (§3.2 del spec). `img/LEEME.md` desaparece con la carpeta: su función la cumple ahora el panel.

- [ ] **Step 6: Verificar que compila sin lo viejo**

Run: `npm run build && npm test`
Expected: build sin errores, 18 tests pasando.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: página de inicio completa y retiro del sitio estático anterior"
```

---

### Task 10: Catálogo y detalle de seguros

**Files:**
- Create: `src/pages/seguros/index.astro`, `src/pages/seguros/[slug].astro`
- Create: `src/components/ListaFAQ.astro`

**Interfaces:**
- Consumes: `ordenarSeguros` (Task 4), `resolverImagen` (Task 6), `mensajeSeguro` (Task 3).
- Produces: `ListaFAQ.astro` con props `{ preguntas: {pregunta: string, respuesta: string}[] }`. Rutas `/seguros` y `/seguros/[slug]`.

- [ ] **Step 1: Escribir `src/components/ListaFAQ.astro`**

```astro
---
interface Props { preguntas: { pregunta: string; respuesta: string }[]; }
const { preguntas } = Astro.props;
---
{preguntas.length > 0 && (
  <div class="faq">
    {preguntas.map((p) => (
      <details>
        <summary>{p.pregunta}</summary>
        <p>{p.respuesta}</p>
      </details>
    ))}
  </div>
)}

<style>
  .faq { display: grid; gap: 8px; }
  details { border: 1px solid var(--borde); border-radius: 12px; background: var(--fondo); }
  summary { padding: 18px; cursor: pointer; font-weight: 600; list-style: none; display: flex; justify-content: space-between; gap: 12px; }
  summary::after { content: '+'; color: var(--acento); font-size: 1.2rem; line-height: 1; }
  details[open] summary::after { content: '−'; }
  summary::-webkit-details-marker { display: none; }
  details p { padding: 0 18px 18px; color: var(--texto-sec); }
</style>
```

Se usa `<details>` nativo: funciona sin JavaScript y es accesible por defecto.

- [ ] **Step 2: Escribir `src/pages/seguros/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import TarjetaSeguro from '../../components/TarjetaSeguro.astro';
import BotonWhatsApp from '../../components/BotonWhatsApp.astro';
import { ordenarSeguros } from '../../lib/seguros';

const seguros = ordenarSeguros(await getCollection('seguros'));
---
<Base titulo="Seguros" descripcion="Todos los seguros que ofrece JR Seguros: vida, hogar, vehículo, empresarial y viaje. Asesoría gratuita en Colombia.">
  <section class="contenedor bloque">
    <p class="etiqueta">Mis productos</p>
    <h1>Todos los seguros</h1>
    <p class="intro">Cada seguro protege algo distinto. Entra al que te interese y te explico qué cubre, con qué condiciones y para quién sirve.</p>
    <div class="rejilla">
      {seguros.map((s) => <TarjetaSeguro seguro={s} />)}
    </div>
    <div class="cierre">
      <h2>¿No sabes cuál necesitas?</h2>
      <p>Cuéntame tu situación y te digo con honestidad qué te conviene.</p>
      <BotonWhatsApp mensaje="Hola John Jairo, no sé qué seguro necesito. ¿Me puedes asesorar?" />
    </div>
  </section>
</Base>

<style>
  .bloque { padding-block: 56px; }
  h1 { font-size: clamp(2rem, 5vw, 3rem); margin-block: 8px 14px; }
  .intro { color: var(--texto-sec); max-width: 42rem; margin-bottom: 34px; }
  .rejilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .cierre { text-align: center; margin-top: 56px; padding: 40px 24px; border: 1px solid var(--borde); border-radius: 16px; background: var(--fondo-profundo); }
  .cierre h2 { font-size: 1.6rem; margin-bottom: 10px; }
  .cierre p { color: var(--texto-sec); margin-bottom: 22px; }
  @media (max-width: 900px) { .rejilla { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 3: Escribir `src/pages/seguros/[slug].astro`**

```astro
---
import { getCollection, render, type CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import ListaFAQ from '../../components/ListaFAQ.astro';
import BotonWhatsApp from '../../components/BotonWhatsApp.astro';
import { ordenarSeguros } from '../../lib/seguros';
import { resolverImagen } from '../../lib/imagenes';
import { mensajeSeguro } from '../../lib/whatsapp';

export async function getStaticPaths() {
  const seguros = await getCollection('seguros');
  return seguros.map((seguro) => ({ params: { slug: seguro.id }, props: { seguro } }));
}

interface Props { seguro: CollectionEntry<'seguros'>; }
const { seguro } = Astro.props;
const { Content } = await render(seguro);
const portada = resolverImagen(seguro.data.imagen);

const otros = ordenarSeguros(await getCollection('seguros')).filter((s) => s.id !== seguro.id).slice(0, 3);
---
<Base titulo={seguro.data.titulo} descripcion={seguro.data.resumen}>
  <article class="contenedor bloque">
    <nav class="miga" aria-label="Ruta de navegación">
      <a href="/">Inicio</a> <span aria-hidden="true">/</span> <a href="/seguros">Seguros</a>
    </nav>

    <span class="icono" aria-hidden="true">{seguro.data.icono}</span>
    <h1>{seguro.data.titulo}</h1>
    <p class="resumen">{seguro.data.resumen}</p>

    {portada && <Image src={portada} alt={seguro.data.titulo} widths={[600, 1200]} format="webp" quality={78} class="portada" />}

    <div class="doble">
      <div class="prosa"><Content /></div>
      <aside class="lateral">
        <h2>Qué cubre</h2>
        <ul>{seguro.data.coberturas.map((c) => <li>{c}</li>)}</ul>
        <BotonWhatsApp mensaje={mensajeSeguro(seguro.data.titulo)} texto="Cotizar por WhatsApp" />
      </aside>
    </div>

    {seguro.data.preguntas.length > 0 && (
      <section class="preguntas">
        <h2>Preguntas frecuentes sobre este seguro</h2>
        <ListaFAQ preguntas={seguro.data.preguntas} />
      </section>
    )}

    <section class="otros">
      <h2>Otros seguros</h2>
      <div class="otros-rejilla">
        {otros.map((s) => (
          <a href={`/seguros/${s.id}`} class="otro">
            <span aria-hidden="true">{s.data.icono}</span> {s.data.titulo}
          </a>
        ))}
      </div>
    </section>
  </article>
</Base>

<style>
  .bloque { padding-block: 40px 64px; max-width: 62rem; }
  .miga { font-size: 0.85rem; color: var(--texto-sec); margin-bottom: 28px; }
  .miga a:hover { color: var(--acento); }
  .icono { font-size: 2.4rem; display: block; margin-bottom: 12px; }
  h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 12px; }
  .resumen { color: var(--texto-sec); font-size: 1.1rem; max-width: 40rem; margin-bottom: 30px; }
  .portada { width: 100%; border-radius: 16px; margin-bottom: 40px; }
  .doble { display: grid; grid-template-columns: 1.6fr 1fr; gap: 34px; align-items: start; }
  .prosa :global(p) { margin-bottom: 16px; color: var(--texto-sec); }
  .prosa :global(strong) { color: var(--texto); }
  .prosa :global(ul) { margin: 0 0 16px 20px; color: var(--texto-sec); }
  .lateral { border: 1px solid var(--borde); border-radius: 16px; padding: 24px; background: var(--fondo-profundo); position: sticky; top: 88px; }
  .lateral h2 { font-size: 0.78rem; letter-spacing: .14em; text-transform: uppercase; color: var(--acento); margin-bottom: 14px; }
  .lateral ul { list-style: none; display: grid; gap: 10px; margin-bottom: 22px; }
  .lateral li { color: var(--texto-sec); font-size: 0.92rem; padding-left: 20px; position: relative; }
  .lateral li::before { content: '✓'; position: absolute; left: 0; color: var(--acento); }
  .preguntas, .otros { margin-top: 56px; }
  .preguntas h2, .otros h2 { font-size: 1.5rem; margin-bottom: 18px; }
  .otros-rejilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .otro { border: 1px solid var(--borde); border-radius: 12px; padding: 16px; font-weight: 600; font-size: 0.92rem; }
  .otro:hover { border-color: var(--acento); }
  @media (max-width: 860px) {
    .doble { grid-template-columns: 1fr; }
    .lateral { position: static; }
    .otros-rejilla { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 4: Verificar que se generan las cinco páginas**

Run: `npm run build && ls dist/seguros/`
Expected: carpetas `vida`, `hogar`, `vehiculo`, `empresarial`, `viaje`, más `index.html`.

- [ ] **Step 5: Verificar el mensaje de WhatsApp por seguro**

Run: `npm run dev`, abrir `http://localhost:4321/seguros/vehiculo`
Verificar: el botón "Cotizar por WhatsApp" apunta a una URL cuyo texto decodificado dice *"Hola John Jairo, me interesa el Seguro de Vehículo. ¿Me puedes asesorar?"*.

- [ ] **Step 6: Commit**

```bash
git add src/pages/seguros/ src/components/ListaFAQ.astro
git commit -m "feat: catálogo y páginas de detalle de cada seguro"
```

---

### Task 11: Novedades

**Files:**
- Create: `src/pages/novedades/index.astro`, `src/pages/novedades/[slug].astro`

**Interfaces:**
- Consumes: `novedadesPublicadas` (Task 5), `TarjetaNovedad` (Task 9), `resolverImagen` (Task 6).
- Produces: rutas `/novedades` y `/novedades/[slug]`.

**Crítico:** `getStaticPaths` debe partir de `novedadesPublicadas`, no de `getCollection` directo. Si no, un borrador genera su página y queda accesible por URL aunque no esté enlazado.

- [ ] **Step 1: Escribir `src/pages/novedades/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import TarjetaNovedad from '../../components/TarjetaNovedad.astro';
import { novedadesPublicadas } from '../../lib/novedades';

const novedades = novedadesPublicadas(await getCollection('novedades'));
---
<Base titulo="Novedades" descripcion="Noticias, promociones y consejos sobre seguros de JR Seguros.">
  <section class="contenedor bloque">
    <p class="etiqueta">Al día</p>
    <h1>Novedades</h1>
    <p class="intro">Promociones, cambios en las pólizas y consejos prácticos.</p>

    {novedades.length === 0 ? (
      <p class="vacio">Todavía no hay novedades publicadas. Vuelve pronto.</p>
    ) : (
      <div class="rejilla">
        {novedades.map((n) => <TarjetaNovedad novedad={n} />)}
      </div>
    )}
  </section>
</Base>

<style>
  .bloque { padding-block: 56px; }
  h1 { font-size: clamp(2rem, 5vw, 3rem); margin-block: 8px 14px; }
  .intro { color: var(--texto-sec); margin-bottom: 34px; }
  .rejilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .vacio { color: var(--texto-sec); border: 1px dashed var(--borde); border-radius: 12px; padding: 40px; text-align: center; }
  @media (max-width: 900px) { .rejilla { grid-template-columns: 1fr; } }
</style>
```

El estado vacío importa: al principio habrá pocas novedades y una rejilla vacía se ve rota.

- [ ] **Step 2: Escribir `src/pages/novedades/[slug].astro`**

```astro
---
import { getCollection, render, type CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import BotonWhatsApp from '../../components/BotonWhatsApp.astro';
import { novedadesPublicadas } from '../../lib/novedades';
import { resolverImagen } from '../../lib/imagenes';

export async function getStaticPaths() {
  const publicadas = novedadesPublicadas(await getCollection('novedades'));
  return publicadas.map((novedad) => ({ params: { slug: novedad.id }, props: { novedad } }));
}

interface Props { novedad: CollectionEntry<'novedades'>; }
const { novedad } = Astro.props;
const { Content } = await render(novedad);
const portada = resolverImagen(novedad.data.imagen);
const fecha = novedad.data.fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
---
<Base titulo={novedad.data.titulo} descripcion={novedad.data.resumen}>
  <article class="contenedor bloque">
    <nav class="miga" aria-label="Ruta de navegación">
      <a href="/">Inicio</a> <span aria-hidden="true">/</span> <a href="/novedades">Novedades</a>
    </nav>
    <time datetime={novedad.data.fecha.toISOString()}>{fecha}</time>
    <h1>{novedad.data.titulo}</h1>
    {portada && <Image src={portada} alt={novedad.data.titulo} widths={[600, 1200]} format="webp" quality={78} class="portada" />}
    <div class="prosa"><Content /></div>
    <div class="cierre">
      <p>¿Tienes dudas sobre esto?</p>
      <BotonWhatsApp mensaje={`Hola John Jairo, vi la novedad "${novedad.data.titulo}" y quiero saber más.`} />
    </div>
  </article>
</Base>

<style>
  .bloque { padding-block: 40px 64px; max-width: 46rem; }
  .miga { font-size: 0.85rem; color: var(--texto-sec); margin-bottom: 24px; }
  .miga a:hover { color: var(--acento); }
  time { color: var(--acento); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 2.7rem); margin-block: 10px 26px; }
  .portada { width: 100%; border-radius: 16px; margin-bottom: 32px; }
  .prosa :global(p) { margin-bottom: 16px; color: var(--texto-sec); }
  .prosa :global(h2) { font-size: 1.4rem; margin: 32px 0 12px; }
  .prosa :global(ul) { margin: 0 0 16px 20px; color: var(--texto-sec); }
  .cierre { margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--borde); text-align: center; }
  .cierre p { color: var(--texto-sec); margin-bottom: 16px; }
</style>
```

- [ ] **Step 3: Verificar que los borradores no generan página**

Crear `src/content/novedades/prueba-borrador.md`:

```markdown
---
titulo: Borrador de prueba
fecha: 2026-08-15
resumen: Esta novedad no debe publicarse.
publicado: false
---

Contenido a medio escribir.
```

Run: `npm run build && ls dist/novedades/`
Expected: **NO** existe `dist/novedades/prueba-borrador/`. Solo aparece `bienvenida` e `index.html`.

- [ ] **Step 4: Verificar que tampoco está en el sitemap**

Run: `grep -c "prueba-borrador" dist/sitemap-0.xml || echo "0 coincidencias — correcto"`
Expected: 0 coincidencias.

- [ ] **Step 5: Borrar el borrador de prueba**

```bash
rm src/content/novedades/prueba-borrador.md
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/novedades/
git commit -m "feat: listado y detalle de novedades, excluyendo borradores"
```

---

### Task 12: Conócenos y preguntas frecuentes

**Files:**
- Create: `src/pages/conocenos.astro`, `src/pages/preguntas-frecuentes.astro`

**Interfaces:**
- Consumes: `inicio` y `contacto` (Task 2), colección `faq` (Task 2), `ListaFAQ` (Task 10).
- Produces: rutas `/conocenos` y `/preguntas-frecuentes`.

- [ ] **Step 1: Escribir `src/pages/conocenos.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import BotonWhatsApp from '../components/BotonWhatsApp.astro';
import { inicio, contacto } from '../lib/config';

const valores = [
  { titulo: 'Asesoría sin costo', texto: 'Consultarme no te cuesta nada. Cobro comisión de la aseguradora, no de ti.' },
  { titulo: 'Comparación honesta', texto: 'Trabajo con varias aseguradoras, así que puedo decirte cuál conviene de verdad.' },
  { titulo: 'Acompañamiento en el siniestro', texto: 'Cuando pasa algo, no te dejo solo con el trámite. Ahí es donde se nota tener asesor.' },
  { titulo: 'Respuesta rápida', texto: 'Un mensaje de WhatsApp basta. No tienes que pasar por un conmutador.' },
];
---
<Base titulo="Conócenos" descripcion="John Jairo, asesor independiente de seguros en Colombia con más de 10 años de experiencia.">
  <section class="contenedor bloque">
    <p class="etiqueta">Quién te asesora</p>
    <h1>Conócenos</h1>
    <p class="intro">{inicio.sobreMi}</p>

    <div class="rejilla-stats">
      {inicio.estadisticas.map((e) => (
        <div class="stat"><strong>{e.numero}</strong><span>{e.etiqueta}</span></div>
      ))}
    </div>

    <h2>Cómo trabajo</h2>
    <div class="rejilla-valores">
      {valores.map((v) => (
        <div class="valor"><h3>{v.titulo}</h3><p>{v.texto}</p></div>
      ))}
    </div>

    <div class="cierre">
      <h2>¿Hablamos?</h2>
      <p>{contacto.horario}</p>
      <BotonWhatsApp mensaje="Hola John Jairo, quiero conocer más sobre tu asesoría." />
    </div>
  </section>
</Base>

<style>
  .bloque { padding-block: 56px; max-width: 62rem; }
  h1 { font-size: clamp(2rem, 5vw, 3rem); margin-block: 8px 16px; }
  .intro { color: var(--texto-sec); font-size: 1.05rem; max-width: 44rem; margin-bottom: 36px; }
  h2 { font-size: 1.6rem; margin-block: 48px 20px; }
  .rejilla-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .stat { border: 1px solid var(--borde); border-radius: 12px; padding: 22px; text-align: center; }
  .stat strong { display: block; font-size: 1.9rem; font-weight: 800; color: var(--acento); letter-spacing: -0.03em; }
  .stat span { color: var(--texto-sec); font-size: 0.85rem; }
  .rejilla-valores { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .valor { border: 1px solid var(--borde); border-radius: 12px; padding: 24px; }
  .valor h3 { font-size: 1.05rem; margin-bottom: 8px; }
  .valor p { color: var(--texto-sec); font-size: 0.93rem; }
  .cierre { margin-top: 56px; padding: 40px 24px; border: 1px solid var(--borde); border-radius: 16px; background: var(--fondo-profundo); text-align: center; }
  .cierre h2 { margin-top: 0; }
  .cierre p { color: var(--texto-sec); margin-bottom: 22px; }
  @media (max-width: 860px) { .rejilla-stats { grid-template-columns: repeat(2, 1fr); } .rejilla-valores { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 2: Escribir `src/pages/preguntas-frecuentes.astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import Base from '../layouts/Base.astro';
import BotonWhatsApp from '../components/BotonWhatsApp.astro';

const entradas = (await getCollection('faq')).sort((a, b) => a.data.orden - b.data.orden);
const preguntas = await Promise.all(
  entradas.map(async (e) => ({ pregunta: e.data.pregunta, Contenido: (await render(e)).Content }))
);
---
<Base titulo="Preguntas frecuentes" descripcion="Respuestas a las dudas más comunes sobre seguros y asesoría en Colombia.">
  <section class="contenedor bloque">
    <p class="etiqueta">Dudas comunes</p>
    <h1>Preguntas frecuentes</h1>
    <p class="intro">Si tu pregunta no está aquí, escríbeme y te respondo.</p>

    <div class="faq">
      {preguntas.map(({ pregunta, Contenido }) => (
        <details>
          <summary>{pregunta}</summary>
          <div class="respuesta"><Contenido /></div>
        </details>
      ))}
    </div>

    <div class="cierre">
      <p>¿Tu pregunta no está aquí?</p>
      <BotonWhatsApp mensaje="Hola John Jairo, tengo una pregunta sobre seguros." />
    </div>
  </section>
</Base>

<style>
  .bloque { padding-block: 56px; max-width: 48rem; }
  h1 { font-size: clamp(2rem, 5vw, 3rem); margin-block: 8px 14px; }
  .intro { color: var(--texto-sec); margin-bottom: 34px; }
  .faq { display: grid; gap: 8px; }
  details { border: 1px solid var(--borde); border-radius: 12px; background: var(--fondo); }
  summary { padding: 18px; cursor: pointer; font-weight: 600; list-style: none; display: flex; justify-content: space-between; gap: 12px; }
  summary::after { content: '+'; color: var(--acento); font-size: 1.2rem; line-height: 1; }
  details[open] summary::after { content: '−'; }
  summary::-webkit-details-marker { display: none; }
  .respuesta { padding: 0 18px 18px; color: var(--texto-sec); }
  .respuesta :global(p) { margin-bottom: 10px; }
  .cierre { margin-top: 44px; text-align: center; }
  .cierre p { color: var(--texto-sec); margin-bottom: 16px; }
</style>
```

Aquí no se reusa `ListaFAQ.astro` porque estas respuestas son Markdown renderizado (`<Contenido />`), mientras que las de cada seguro son texto plano del frontmatter. Forzar un componente común obligaría a que reciba un componente como prop, lo que lo haría más difícil de leer que las 12 líneas duplicadas de estilo.

- [ ] **Step 3: Verificar**

Run: `npm run build && ls dist/conocenos/ dist/preguntas-frecuentes/`
Expected: cada una con su `index.html`.

Run: `npm run dev` y abrir ambas. Verificar que los acordeones abren y cierran, y que el enlace del header queda marcado como página actual.

- [ ] **Step 4: Commit**

```bash
git add src/pages/conocenos.astro src/pages/preguntas-frecuentes.astro
git commit -m "feat: páginas de Conócenos y Preguntas frecuentes"
```

---

### Task 13: Página de contacto con formulario

**Files:**
- Create: `src/components/FormularioContacto.astro`, `src/pages/contacto.astro`

**Interfaces:**
- Consumes: `contacto` (Task 2), `ordenarSeguros` (Task 4), `BotonWhatsApp` (Task 7).
- Produces: ruta `/contacto`.

**Corrección del spec (§7):** el `index.html` original enviaba a `zapatajulian42@gmail.com`. Ahora envía al correo de John Jairo (`contacto.correo`), con copia a Julián vía `_cc` para detectar fallas.

- [ ] **Step 1: Escribir `src/components/FormularioContacto.astro`**

```astro
---
import { getCollection } from 'astro:content';
import { contacto } from '../lib/config';
import { ordenarSeguros } from '../lib/seguros';
import { enlaceWhatsApp } from '../lib/whatsapp';

const seguros = ordenarSeguros(await getCollection('seguros'));
const destino = `https://formsubmit.co/ajax/${contacto.correo}`;
const urlRespaldo = enlaceWhatsApp(contacto.whatsapp, 'Hola John Jairo, intenté escribirte por la página pero el formulario falló.');
---
<form id="formulario" class="formulario" data-destino={destino}>
  <input type="hidden" name="_subject" value="Nuevo mensaje desde la página web — JR Seguros" />
  <input type="hidden" name="_cc" value="zapatajulian42@gmail.com" />
  <input type="hidden" name="_captcha" value="false" />
  <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" />

  <label>Tu nombre
    <input type="text" name="nombre" required autocomplete="name" />
  </label>

  <label>Tu teléfono o WhatsApp
    <input type="tel" name="telefono" required autocomplete="tel" />
  </label>

  <label>¿Qué seguro te interesa?
    <select name="seguro">
      <option value="">Selecciona una opción</option>
      {seguros.map((s) => <option value={s.data.titulo}>{s.data.titulo}</option>)}
      <option value="No sé, necesito asesoría">No sé, necesito asesoría</option>
    </select>
  </label>

  <label>Cuéntame un poco más (opcional)
    <textarea name="mensaje" rows="4"></textarea>
  </label>

  <button type="submit" class="boton-principal">Enviar mensaje</button>

  <p id="exito" class="aviso exito" hidden role="status">
    ✓ Mensaje enviado. John Jairo se pondrá en contacto contigo pronto.
  </p>
  <div id="error" class="aviso error" hidden role="alert">
    <p>No se pudo enviar el mensaje. Escríbele directo por WhatsApp:</p>
    <a href={urlRespaldo} target="_blank" rel="noopener noreferrer" class="boton-principal">Abrir WhatsApp</a>
  </div>
</form>

<style>
  .formulario { display: grid; gap: 16px; }
  label { display: grid; gap: 6px; font-size: 0.88rem; color: var(--texto-sec); }
  input, select, textarea {
    background: var(--fondo-profundo); border: 1px solid var(--borde); border-radius: var(--radio);
    padding: 13px 14px; color: var(--texto); font: inherit; font-size: 0.95rem; width: 100%;
  }
  input:focus, select:focus, textarea:focus { outline: 2px solid var(--acento); outline-offset: 1px; border-color: var(--acento); }
  textarea { resize: vertical; }
  button[disabled] { opacity: .6; cursor: progress; }
  .aviso { border-radius: var(--radio); padding: 14px; font-size: 0.92rem; }
  .exito { background: rgba(74,222,155,.12); color: var(--acento); font-weight: 600; text-align: center; }
  .error { background: rgba(255,120,90,.1); border: 1px solid rgba(255,120,90,.35); text-align: center; display: grid; gap: 12px; }
  .error p { color: #FFB4A2; }
</style>

<script>
  const formulario = document.querySelector<HTMLFormElement>('#formulario');
  const exito = document.querySelector<HTMLElement>('#exito');
  const error = document.querySelector<HTMLElement>('#error');
  const boton = formulario?.querySelector<HTMLButtonElement>('button[type="submit"]');

  formulario?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!boton || !exito || !error) return;

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Enviando...';
    exito.hidden = true;
    error.hidden = true;

    try {
      const respuesta = await fetch(formulario.dataset.destino!, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(formulario),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      exito.hidden = false;
      formulario.reset();
    } catch {
      error.hidden = false;
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
</script>
```

`_honey` es una trampa antispam: los bots la llenan, las personas no la ven. Reemplaza al captcha desactivado.

- [ ] **Step 2: Escribir `src/pages/contacto.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import FormularioContacto from '../components/FormularioContacto.astro';
import BotonWhatsApp from '../components/BotonWhatsApp.astro';
import { contacto } from '../lib/config';
---
<Base titulo="Contacto" descripcion="Escríbele a John Jairo por WhatsApp o déjale un mensaje. Asesoría gratuita en seguros.">
  <section class="contenedor bloque">
    <p class="etiqueta">Hablemos</p>
    <h1>¿Listo para proteger lo tuyo?</h1>
    <p class="intro">Sin compromisos y sin costo. La forma más rápida es WhatsApp.</p>

    <div class="doble">
      <div class="datos">
        <div class="destacado">
          <h2>La vía más rápida</h2>
          <p>Te respondo personalmente, normalmente el mismo día.</p>
          <BotonWhatsApp mensaje="Hola John Jairo, quiero asesoría sobre seguros." />
        </div>

        <dl>
          <div><dt>Correo</dt><dd><a href={`mailto:${contacto.correo}`}>{contacto.correo}</a></dd></div>
          <div><dt>Ubicación</dt><dd>{contacto.ubicacion}</dd></div>
          <div><dt>Horario</dt><dd>{contacto.horario}</dd></div>
        </dl>
      </div>

      <div class="caja">
        <h2>O déjame un mensaje</h2>
        <FormularioContacto />
      </div>
    </div>
  </section>
</Base>

<style>
  .bloque { padding-block: 56px; }
  h1 { font-size: clamp(2rem, 5vw, 3rem); margin-block: 8px 14px; }
  .intro { color: var(--texto-sec); margin-bottom: 38px; }
  .doble { display: grid; grid-template-columns: 1fr 1.15fr; gap: 24px; align-items: start; }
  .destacado { border: 1px solid var(--acento); border-radius: 16px; padding: 28px; background: rgba(74,222,155,.06); margin-bottom: 20px; }
  .destacado h2 { font-size: 1.25rem; margin-bottom: 8px; }
  .destacado p { color: var(--texto-sec); font-size: 0.93rem; margin-bottom: 20px; }
  dl { display: grid; gap: 16px; border: 1px solid var(--borde); border-radius: 16px; padding: 24px; }
  dt { font-size: 0.72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--acento); margin-bottom: 4px; }
  dd { color: var(--texto-sec); font-size: 0.95rem; }
  dd a:hover { color: var(--acento); }
  .caja { border: 1px solid var(--borde); border-radius: 16px; padding: 28px; background: var(--fondo-profundo); }
  .caja h2 { font-size: 1.25rem; margin-bottom: 20px; }
  @media (max-width: 900px) { .doble { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 3: Verificar el manejo de error**

Run: `npm run dev`, abrir `http://localhost:4321/contacto`.
En las herramientas de desarrollo, poner la red en modo sin conexión y enviar el formulario.
Expected: aparece el bloque rojo con el botón "Abrir WhatsApp"; el botón de enviar vuelve a estar activo. **Ningún lead se pierde en silencio** (§8 del spec).

- [ ] **Step 4: Verificar el envío real**

Restaurar la red y enviar una prueba.
Expected: aparece el mensaje verde de éxito. Formsubmit pide confirmar el correo destino la primera vez — revisar la bandeja de `contacto.correo` y activarlo.

- [ ] **Step 5: Commit**

```bash
git add src/components/FormularioContacto.astro src/pages/contacto.astro
git commit -m "feat: página de contacto con WhatsApp principal y formulario de respaldo"
```

---

### Task 14: Configuración del CMS y verificación de enlaces

**Files:**
- Create: `.pages.yml`
- Create: `docs/GUIA-PANEL.md`

**Interfaces:**
- Consumes: esquemas de la Task 2 (los campos deben coincidir exactamente).
- Produces: panel funcional en `app.pagescms.org`.

**Punto crítico:** `media.output` debe ser `/src/assets/img` para que `resolverImagen` (Task 6) encuentre los archivos. Si se pone `/img` o `/media`, ninguna imagen subida se resolverá.

- [ ] **Step 1: Escribir `.pages.yml`**

```yaml
media:
  input: src/assets/img
  output: /src/assets/img
  extensions: [jpg, jpeg, png, webp]

content:
  - name: seguros
    label: Seguros
    type: collection
    path: src/content/seguros
    view:
      fields: [titulo, destacado, orden]
    fields:
      - { name: titulo, label: Nombre del seguro, type: string, required: true }
      - { name: icono, label: Emoji, type: string, required: true, description: "Un solo emoji. Ejemplo: 🏠" }
      - { name: imagen, label: Imagen de portada, type: image }
      - { name: resumen, label: Resumen corto, type: text, required: true, description: "Dos líneas. Aparece en el menú y en las tarjetas." }
      - { name: coberturas, label: Qué cubre, type: string, list: true, required: true }
      - name: preguntas
        label: Preguntas frecuentes
        type: object
        list: true
        fields:
          - { name: pregunta, label: Pregunta, type: string, required: true }
          - { name: respuesta, label: Respuesta, type: text, required: true }
      - { name: destacado, label: Mostrar en el inicio, type: boolean, default: true }
      - { name: orden, label: Posición, type: number, required: true, description: "1 aparece primero." }
      - { name: body, label: Descripción completa, type: rich-text }

  - name: novedades
    label: Novedades
    type: collection
    path: src/content/novedades
    view:
      fields: [titulo, fecha, publicado]
      sort: [fecha]
    fields:
      - { name: titulo, label: Título, type: string, required: true }
      - { name: fecha, label: Fecha, type: date, required: true }
      - { name: imagen, label: Imagen, type: image }
      - { name: resumen, label: Resumen, type: text, required: true }
      - { name: publicado, label: Publicado, type: boolean, default: false, description: "Déjalo apagado mientras la escribes." }
      - { name: body, label: Contenido, type: rich-text }

  - name: faq
    label: Preguntas frecuentes
    type: collection
    path: src/content/faq
    view:
      fields: [pregunta, orden]
    fields:
      - { name: pregunta, label: Pregunta, type: string, required: true }
      - { name: orden, label: Posición, type: number, required: true }
      - { name: body, label: Respuesta, type: rich-text }

  - name: contacto
    label: Datos de contacto
    type: file
    path: src/content/config/contacto.json
    fields:
      - { name: whatsapp, label: WhatsApp, type: string, required: true, pattern: "^[0-9]{10,15}$", description: "Solo números, con indicativo y sin +. Ejemplo: 573001112233" }
      - { name: correo, label: Correo, type: string, required: true }
      - { name: ubicacion, label: Ubicación, type: string, required: true }
      - { name: horario, label: Horario de atención, type: string, required: true }

  - name: inicio
    label: Textos del inicio
    type: file
    path: src/content/config/inicio.json
    fields:
      - { name: heroTitulo, label: Titular principal, type: string, required: true }
      - { name: heroResaltado, label: Palabra en verde, type: string, required: true, description: "Debe ser una palabra que esté dentro del titular." }
      - { name: heroSubtitulo, label: Subtítulo, type: text, required: true }
      - { name: heroInsignia, label: Insignia superior, type: string, required: true }
      - { name: sobreMi, label: Texto de Sobre mí, type: text, required: true }
      - name: estadisticas
        label: Estadísticas
        type: object
        list: true
        fields:
          - { name: numero, label: Número, type: string, required: true }
          - { name: etiqueta, label: Descripción, type: string, required: true }
```

- [ ] **Step 2: Escribir `docs/GUIA-PANEL.md`**

```markdown
# Guía del panel — JR Seguros

## Entrar

1. Abre **app.pagescms.org** (guárdalo en la pantalla de inicio del celular).
2. Entra con tu cuenta de GitHub.
3. Elige el repositorio **pagina-seguros-johnjairo**.

## Publicar una novedad

1. Toca **Novedades** → **+**.
2. Llena título, fecha, resumen e imagen.
3. Escribe el contenido.
4. Activa **Publicado**. Si lo dejas apagado, se guarda pero nadie la ve.
5. Toca **Guardar**.

El cambio tarda **entre 40 segundos y un minuto** en verse en la web. Es normal:
la página se reconstruye cada vez. Recarga pasado ese tiempo.

## Agregar un seguro

Toca **Seguros** → **+**. Al guardar, aparece solo en el menú de arriba, en el
catálogo y en el pie de página. No hay que avisarle a nadie.

- **Posición**: 1 aparece de primero.
- **Mostrar en el inicio**: si lo apagas, sale solo en la página de Seguros.

## Cambiar el teléfono o el correo

**Datos de contacto**. El WhatsApp va sin `+`, sin espacios y sin guiones:
`573001112233`. Si lo escribes distinto, el sitio no se actualiza.

## Si algo no se actualiza

Casi siempre es un campo obligatorio vacío. La página web se queda como estaba
—no se rompe— hasta que se corrija. Avísale a Julián.

## Consejos para las fotos

- Sube la foto tal como sale del celular; el sistema la optimiza.
- Horizontales funcionan mejor que verticales.
- Nombres sin tildes ni espacios.
```

- [ ] **Step 3: Verificar el panel de verdad**

1. Subir la rama: `git push -u origin diseno-sitio-cms`
2. Entrar a `app.pagescms.org` con la cuenta **JuliZpta**, elegir el repo y la rama `diseno-sitio-cms`.
3. Editar el resumen de un seguro y guardar.
4. Confirmar que se creó un commit en la rama.
5. Subir una imagen a una novedad desde el panel y confirmar que el archivo aparece en `src/assets/img/` y que el frontmatter dice `/src/assets/img/<nombre>`.

Expected: el frontmatter usa exactamente ese prefijo. Si no, corregir `media.output` antes de seguir.

- [ ] **Step 4: Verificar que la imagen subida se optimiza**

```bash
git pull
npm run build
```
Expected: compila sin errores y la imagen aparece convertida en `dist/_astro/`. Si `resolverImagen` lanza, el prefijo de `.pages.yml` no coincide.

- [ ] **Step 5: Verificar que no hay enlaces rotos**

Run: `npm run build && npm run enlaces`
Expected: 0 enlaces rotos. Corregir cualquiera que aparezca.

- [ ] **Step 6: Commit**

```bash
git add .pages.yml docs/GUIA-PANEL.md
git commit -m "feat: configuración del panel de administración y guía de uso"
```

---

### Task 15: Despliegue en Cloudflare Pages

**Files:**
- Create: `docs/DESPLIEGUE.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: sitio en vivo en `*.pages.dev`.

- [ ] **Step 1: Correr la verificación completa**

```bash
npm test && npm run build && npm run enlaces
```
Expected: 18 tests pasando, build limpio, 0 enlaces rotos. **No continuar si algo falla.**

- [ ] **Step 2: Fusionar a `main`**

```bash
git checkout main
git merge diseno-sitio-cms
git push origin main
```

- [ ] **Step 3: Crear el proyecto en Cloudflare Pages**

1. Entrar a `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autorizar GitHub con la cuenta **JuliZpta** y elegir `pagina-seguros-johnjairo`.
3. Configuración de build:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Rama de producción: `main`
4. **Save and Deploy**.

- [ ] **Step 4: Verificar el sitio en vivo**

Abrir la URL `*.pages.dev` y comprobar:
- El desplegable de seguros abre y lleva a cada página.
- Las 5 páginas de seguros cargan.
- Los botones de WhatsApp abren con el mensaje correcto.
- El formulario envía y llega el correo.
- Se ve bien en celular.

- [ ] **Step 5: Actualizar `site` en la configuración**

Cambiar `site` en `astro.config.mjs` por la URL real asignada por Cloudflare, para que el sitemap y las URLs canónicas sean correctas.

```bash
git add astro.config.mjs
git commit -m "chore: apuntar site a la URL de producción"
git push
```

- [ ] **Step 6: Verificar el flujo completo desde el panel**

Pedirle a la administradora que publique una novedad de prueba desde el celular.
Expected: aparece en el sitio en menos de dos minutos. Este es el criterio de aceptación de todo el proyecto.

- [ ] **Step 7: Apagar Vercel**

Solo después de que el paso anterior funcione: eliminar el proyecto en el panel de Vercel.

- [ ] **Step 8: Escribir `docs/DESPLIEGUE.md`**

```markdown
# Despliegue

- **Hosting:** Cloudflare Pages, plan gratuito (uso comercial permitido).
- **Rama de producción:** `main`. Cada push reconstruye el sitio.
- **Comando de build:** `npm run build` · **Salida:** `dist`
- **Panel de contenido:** app.pagescms.org (los commits del panel también despliegan).

## Dominio propio

Cloudflare Pages → el proyecto → **Custom domains**. No tiene costo adicional;
solo se paga el dominio (~US$10,44/año un `.com` en Cloudflare Registrar,
a precio de costo y sin subida en la renovación).

Al conectarlo, actualizar `site` en `astro.config.mjs` para que el sitemap
apunte al dominio nuevo.

## Si un despliegue falla

Casi siempre es contenido inválido (un campo obligatorio vacío). El sitio en vivo
**no cambia** hasta que el build pase. Revisar el log en Cloudflare Pages: el
error de zod dice qué archivo y qué campo.
```

- [ ] **Step 9: Commit**

```bash
git add docs/DESPLIEGUE.md
git commit -m "docs: instrucciones de despliegue y dominio"
git push
```

---

## Verificación final

- [ ] `npm test` — 18 tests pasando
- [ ] `npm run build` — sin errores
- [ ] `npm run enlaces` — 0 enlaces rotos
- [ ] Las 5 páginas de seguros existen en `dist/seguros/`
- [ ] Ningún borrador aparece en `dist/` ni en el sitemap
- [ ] Los botones de WhatsApp llevan el mensaje correcto por seguro
- [ ] El formulario envía al correo de John Jairo y muestra el respaldo de WhatsApp si falla
- [ ] La administradora publicó una novedad desde el celular y salió al aire
- [ ] Vercel apagado

## Pendientes que no bloquean

Del §11 del spec, para resolver con Julián durante o después de la implementación:

1. **WhatsApp y correo reales de John Jairo** — hoy son de relleno en `contacto.json`. Se corrigen desde el panel, sin tocar código.
2. **Fotos reales para el collage** — se arranca con Unsplash. Reemplazar los 8 archivos de `src/assets/img/collage/` conservando los nombres.
3. **Dominio propio** — opcional, ver `docs/DESPLIEGUE.md`.

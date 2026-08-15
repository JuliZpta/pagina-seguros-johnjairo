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

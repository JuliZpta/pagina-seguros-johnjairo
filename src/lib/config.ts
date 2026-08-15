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

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

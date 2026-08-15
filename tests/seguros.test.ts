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

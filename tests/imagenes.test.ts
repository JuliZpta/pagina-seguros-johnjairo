import { describe, it, expect } from 'vitest';
import { normalizarRuta } from '../src/lib/imagenes';

describe('normalizarRuta', () => {
  it('deja intacta una ruta absoluta desde la raíz del proyecto', () => {
    expect(normalizarRuta('/src/assets/img/foto.jpg')).toBe('/src/assets/img/foto.jpg');
  });

  it('antepone la barra si el CMS la omite', () => {
    expect(normalizarRuta('src/assets/img/foto.jpg')).toBe('/src/assets/img/foto.jpg');
  });

  it('decodifica espacios codificados en el nombre del archivo', () => {
    expect(normalizarRuta('/src/assets/img/mi%20foto.jpg')).toBe('/src/assets/img/mi foto.jpg');
  });

  it('maneja una ruta con extensión en mayúscula, como las de fotos de celular', () => {
    expect(normalizarRuta('/src/assets/img/IMG_2043.JPG')).toBe('/src/assets/img/IMG_2043.JPG');
  });
});

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

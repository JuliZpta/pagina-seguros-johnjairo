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

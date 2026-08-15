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

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

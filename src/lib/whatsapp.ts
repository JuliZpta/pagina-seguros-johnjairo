export function enlaceWhatsApp(numero: string, mensaje: string): string {
  if (!/^\d{10,15}$/.test(numero)) {
    throw new Error(`El número de WhatsApp debe ser solo dígitos en formato internacional: ${numero}`);
  }
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeSeguro(titulo: string): string {
  return `Hola John Jairo, me interesa el ${titulo}. ¿Me puedes asesorar?`;
}

// === js/config.js ===
export const PUBLIC_API_URL = 'https://script.google.com/macros/s/AKfycbwufJ7V1wQTlChCVPltZnXVDDGmW_SfB6jUbbDObU6tLyTj-MGv5KvSc6eylUsojwQ9Dw/exec';
// Alias temporal para los modulos publicos existentes.
export const API_URL = PUBLIC_API_URL;
export const CARRITO_LOCAL_KEY = 'carritoMardant';
export const PRODUCTOS_POR_PAGINA = 21;
export const WHATSAPP_NUMBER = '5491139473925';
export const whatsappLink = (mensaje = '') =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

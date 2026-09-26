// === js/scripts_inicio.js ===
import { whatsappLink } from './config.js?v=5';
import { API_CACHE_TTL, cachedFetchJSON, getCachedJSON } from './api-client.js?v=7';
import { actualizarCarritoUI } from './carrito-utils.js?v=2';

const $ = (sel) => document.querySelector(sel);
const MAX_HOME_ITEMS = 4;
const MAX_ULTIMAS_ROTACION = 15;
const ROTACION_ULTIMAS_MS = 15000;

let ultimasLista15 = [];
let ultimasIndiceInicio = 0;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function numberValue(value) {
  const number = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
}

function trackAttrs({ id = '', name = '', price = '', category = '', source = '', cta = '' } = {}) {
  return [
    ['data-track-item-id', id],
    ['data-track-item-name', name],
    ['data-track-price', price],
    ['data-track-category', category],
    ['data-track-source', source],
    ['data-track-cta', cta]
  ]
    .map(([key, value]) => value !== undefined && value !== null && value !== ''
      ? `${key}="${escapeHtml(String(value))}"`
      : '')
    .join(' ');
}

function marcarSoloDesktop(lista) {
  return lista.map((p, i) => ({ ...p, soloDesktop: i === lista.length - 1 }));
}

function elegirBloqueRotativo(lista, max = MAX_HOME_ITEMS, { modo = 'dia', clave = '' } = {}) {
  const total = lista.length;
  if (!total) return [];

  const ahora = new Date();
  const base = (modo === 'hora')
    ? `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}-${ahora.getHours()}`
    : `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}`;

  const strSeed = `${base}|${clave}`;
  let seed = 0;
  for (let i = 0; i < strSeed.length; i += 1) {
    seed = (seed * 31 + strSeed.charCodeAt(i)) >>> 0;
  }

  const start = seed % total;
  const cantidad = Math.min(max, total);
  const resultado = [];
  for (let i = 0; i < cantidad; i += 1) {
    resultado.push(lista[(start + i) % total]);
  }
  return marcarSoloDesktop(resultado);
}

function estadoClass(texto) {
  const estado = String(texto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (estado.includes('AGOTADO') || estado.includes('SIN STOCK')) return 'estado-agotado';
  if (estado.includes('OFERTA')) return 'estado-oferta';
  if (estado.includes('PREVENTA')) return 'estado-preventa';
  if (estado.includes('DISPONIBLE')) return 'estado-disponible';
  return 'estado-neutro';
}

function productoAgotado(producto) {
  const estado = String(producto?.estado || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return estado.includes('AGOTADO') || estado.includes('SIN STOCK');
}

function normalizarLista(data, key = 'productos') {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.productos)) return data.productos;
  return [];
}


function renderUltimas() {
  const cont = $('#ultimas-importaciones');
  if (!cont) return;

  cont.innerHTML = '';
  if (!ultimasLista15.length) return;

  const total = ultimasLista15.length;
  const cantidad = Math.min(MAX_HOME_ITEMS, total);
  const visibles = [];

  for (let i = 0; i < cantidad; i += 1) {
    visibles.push({ ...ultimasLista15[(ultimasIndiceInicio + i) % total], soloDesktop: i === cantidad - 1 });
  }

  visibles.forEach((p) => {
    const nombre = String(p.nombre || '').trim();
    const precio = numberValue(p.precio);
    const estado = productoAgotado(p) ? 'AGOTADO' : 'DISPONIBLE';
    const cta = 'COMPRAR AHORA';
    const div = document.createElement('div');
    div.className = `producto${p.soloDesktop ? ' mostrar-solo-desktop' : ''}`;
    div.innerHTML = `
      <img src="${escapeHtml(p.imagen)}" alt="${escapeHtml(nombre)}" class="img" loading="lazy" referrerpolicy="no-referrer">
      <div class="nombre">${escapeHtml(nombre)}</div>
      <div class="precio">S/. ${precio.toFixed(2)}</div>
      <div class="estado ${estadoClass(estado)}">${estado}</div>
      <a href="${whatsappLink(`Hola, quiero comprar ahora este producto: ${nombre}`)}"
         class="boton"
         target="_blank"
         rel="noopener noreferrer"
         ${trackAttrs({ id: p.id, name: nombre, price: precio, category: p.categoria, source: 'home_ultimas', cta })}>${cta}</a>`;
    cont.appendChild(div);
  });
}

function setupUltimas(lista) {
  ultimasIndiceInicio = 0;
  ultimasLista15 = [...lista]
    .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0))
    .slice(0, MAX_ULTIMAS_ROTACION);
  renderUltimas();

  if (ultimasLista15.length > MAX_HOME_ITEMS) {
    setInterval(() => {
      ultimasIndiceInicio = (ultimasIndiceInicio + MAX_HOME_ITEMS) % ultimasLista15.length;
      renderUltimas();
    }, ROTACION_ULTIMAS_MS);
  }
}

function renderOfertas(lista) {
  const cont = $('#productos-oferta');
  if (!cont) return;
  cont.innerHTML = '';

  elegirBloqueRotativo(lista, MAX_HOME_ITEMS, { modo: 'hora', clave: 'ofertas' }).forEach((p) => {
    const nombre = String(p.nombre || '').trim();
    const precio = numberValue(p.precio);
    const oferta = numberValue(p.oferta);
    const agotado = productoAgotado(p);
    const estadoTexto = agotado ? 'AGOTADO' : 'OFERTA';
    const precioFinal = oferta || precio;
    const mensaje = agotado
      ? `Hola, quiero cotizar este producto agotado: ${nombre}`
      : `Hola, quiero aprovechar esta oferta: ${nombre}`;
    const cta = agotado ? 'COTIZAR PRODUCTO AGOTADO' : 'APROVECHAR OFERTA';
    const div = document.createElement('div');
    div.className = `producto${p.soloDesktop ? ' mostrar-solo-desktop' : ''}`;
    div.innerHTML = `
      <img src="${escapeHtml(p.imagen)}" alt="${escapeHtml(nombre)}" class="img" loading="lazy" referrerpolicy="no-referrer">
      <div class="nombre">${escapeHtml(nombre)}</div>
      <div class="precio">
        <span style="text-decoration:line-through;color:#bbb;">S/. ${precio.toFixed(2)}</span><br>
        <span class="precio-oferta">S/. ${precioFinal.toFixed(2)}</span>
      </div>
      <div class="estado ${estadoClass(estadoTexto)}">${estadoTexto}</div>
      <a href="${whatsappLink(mensaje)}"
         class="boton"
         target="_blank"
         rel="noopener noreferrer"
         ${trackAttrs({ id: p.id, name: nombre, price: precioFinal, category: p.categoria, source: 'home_ofertas', cta })}>${cta}</a>`;
    cont.appendChild(div);
  });
}

function renderPreventasHome(lista) {
  const cont = $('#productos-preventa');
  if (!cont) return;
  cont.innerHTML = '';

  elegirBloqueRotativo(lista, MAX_HOME_ITEMS, { modo: 'hora', clave: 'preventas' }).forEach((p) => {
    const nombre = String(p.nombre || p.descripcion || 'Preventa Dale Start').trim();
    const img = String(p.imagen || '').trim() || 'https://via.placeholder.com/300x300?text=Sin+imagen';
    const precio = numberValue(p.precio);
    const llegada = p['fecha aprox llegada argentina'] || 'Próximamente';
    const cta = 'RESERVAR CON S/ 15';
    const div = document.createElement('div');
    div.className = `producto${p.soloDesktop ? ' mostrar-solo-desktop' : ''}`;
    div.innerHTML = `
      <img src="${escapeHtml(img)}" alt="${escapeHtml(nombre)}" class="img" loading="lazy" referrerpolicy="no-referrer">
      <div class="nombre">${escapeHtml(nombre)}</div>
      <div class="precio">S/. ${precio.toFixed(2)}</div>
      <div class="estado estado-preventa">Llega: ${escapeHtml(llegada)}</div>
      <a href="${whatsappLink(`Hola, quiero reservar esta preventa con S/ 15: ${nombre}`)}"
         target="_blank"
         rel="noopener noreferrer"
         class="boton"
         ${trackAttrs({ id: p.id || nombre, name: nombre, price: precio, category: 'Preventa', source: 'home_preventas', cta })}>${cta}</a>`;
    cont.appendChild(div);
  });
}

function renderPedidosHome(lista) {
  const cont = $('#pedidos-disponibles');
  if (!cont) return;
  cont.innerHTML = '';

  const disponibles = lista
    .filter((p) => {
      const est = String(p.estado || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      return !est || est === 'DISPONIBLE' || est === 'DISPONIBLE A PEDIDO';
    })
    .sort((a, b) => Number(b.id ?? b.ID ?? 0) - Number(a.id ?? a.ID ?? 0));

  elegirBloqueRotativo(disponibles, MAX_HOME_ITEMS, { modo: 'hora', clave: 'pedidos' }).forEach((p) => {
    const id = String(p.id ?? p.ID ?? '').trim();
    const nombre = String(p.nombre || '').trim() || (id ? `Figura N° ${id}` : 'Figura sin nombre');
    const mensaje = p.nombre && String(p.nombre).trim()
      ? `Deseo pedir desde Japón este producto: ${nombre}`
      : `Deseo pedir desde Japón la figura N° ${id || 'sin ID'}`;
    const cta = 'PEDIR DESDE JAPÓN';
    const div = document.createElement('div');
    div.className = `producto${p.soloDesktop ? ' mostrar-solo-desktop' : ''}`;
    div.innerHTML = `
      <img src="${escapeHtml(p.imagen)}" alt="${escapeHtml(nombre)}" class="img" loading="lazy" referrerpolicy="no-referrer">
      <div class="nombre">${escapeHtml(nombre)}</div>
      <div class="estado ${estadoClass(p.estado || 'DISPONIBLE A PEDIDO')}">${escapeHtml(p.estado || 'DISPONIBLE A PEDIDO')}</div>
      <a href="${whatsappLink(mensaje)}"
         class="boton"
         target="_blank"
         rel="noopener noreferrer"
         ${trackAttrs({ id, name: nombre, category: 'Producto a pedido', source: 'home_pedidos', cta })}>${cta}</a>`;
    cont.appendChild(div);
  });
}

async function fetchHomeFallbackProgressive() {
  const loadSection = async (accion, options, render) => {
    try {
      const data = await cachedFetchJSON(accion, {
        ...options,
        staleWhileRevalidate: true,
        retries: 0,
        timeoutMs: 12000
      });
      render(data);
      return true;
    } catch (error) {
      console.warn(`No se pudo actualizar la sección ${accion}:`, error);
      return false;
    }
  };

  // Dos carriles recuperan solo el contenido principal. Japón se carga después
  // y nunca condiciona el resultado de este fallback.
  const results = await Promise.all([
    (async () => {
      const latest = await loadSection('productosPage', {
        ttl: API_CACHE_TTL.PRODUCTOS,
        cacheId: 'productos-page-v3',
        params: { page: 1, page_size: 15, sort: 'recientes', include_meta: '0' }
      }, data => setupUltimas(normalizarLista(data)));
      const offers = await loadSection('productosPage', {
        ttl: API_CACHE_TTL.PRODUCTOS,
        cacheId: 'productos-page-v3',
        params: { page: 1, page_size: 30, sort: 'oferta', include_meta: '0' }
      }, data => renderOfertas(normalizarLista(data)));
      return latest || offers;
    })(),
    (async () => {
      const presales = await loadSection('preventasPage', {
        ttl: API_CACHE_TTL.PREVENTAS,
        cacheId: 'preventas-page-v4',
        params: { page: 1, page_size: 24 }
      }, data => renderPreventasHome(normalizarLista(data)));
      const orders = await loadSection('pedidosDisponiblesPage', {
        ttl: API_CACHE_TTL.PEDIDOS_DISPONIBLES,
        cacheId: 'pedidos-page-v3',
        params: { page: 1, page_size: 24, sort: 'newest' }
      }, data => renderPedidosHome(normalizarLista(data)));
      return presales || orders;
    })()
  ]);

  if (!results.some(Boolean)) {
    throw new Error('No se pudo cargar ninguna sección de la portada');
  }
}

function renderCachedHomeSections() {
  const cachedSections = [
    {
      accion: 'productosPage',
      options: {
        ttl: API_CACHE_TTL.PRODUCTOS,
        cacheId: 'productos-page-v3',
        params: { page: 1, page_size: 15, sort: 'recientes', include_meta: '0' }
      },
      render: data => setupUltimas(normalizarLista(data))
    },
    {
      accion: 'productosPage',
      options: {
        ttl: API_CACHE_TTL.PRODUCTOS,
        cacheId: 'productos-page-v3',
        params: { page: 1, page_size: 30, sort: 'oferta', include_meta: '0' }
      },
      render: data => renderOfertas(normalizarLista(data))
    },
    {
      accion: 'preventasPage',
      options: {
        ttl: API_CACHE_TTL.PREVENTAS,
        cacheId: 'preventas-page-v4',
        params: { page: 1, page_size: 24 }
      },
      render: data => renderPreventasHome(normalizarLista(data))
    },
    {
      accion: 'pedidosDisponiblesPage',
      options: {
        ttl: API_CACHE_TTL.PEDIDOS_DISPONIBLES,
        cacheId: 'pedidos-page-v3',
        params: { page: 1, page_size: 24, sort: 'newest' }
      },
      render: data => renderPedidosHome(normalizarLista(data))
    }
  ];

  return cachedSections.reduce((rendered, section) => {
    const data = getCachedJSON(section.accion, { ...section.options, allowStale: true });
    if (!data) return rendered;
    section.render(data);
    return rendered + 1;
  }, 0);
}

async function loadHome() {
  renderCachedHomeSections();
  const cached = getCachedJSON('homeData', {
    ttl: API_CACHE_TTL.HOME_DATA,
    cacheId: 'home-data-v5',
    allowStale: true
  });
  if (cached?.ok) renderHome(cached);

  try {
    const data = await cachedFetchJSON('homeData', {
      ttl: API_CACHE_TTL.HOME_DATA,
      cacheId: 'home-data-v5',
      staleWhileRevalidate: true,
      retries: 0,
      timeoutMs: 12000
    });
    if (!data?.ok) throw new Error(data?.error || 'home_data_unavailable');
    renderHome(data);
  } catch (error) {
    console.warn('No se pudo cargar Home agregado; usando carga por secciones:', error);
    await fetchHomeFallbackProgressive();
  }
}

function renderHome(data) {
  const productosOrdenados = [...(data.productos || [])].sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
  const ofertasOrdenadas = [...(data.ofertas || [])].sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));

  setupUltimas((data.ultimas || productosOrdenados).length ? data.ultimas : productosOrdenados);
  renderOfertas(ofertasOrdenadas);
  renderPreventasHome(data.preventas || []);
  renderPedidosHome(data.pedidosDisponibles || []);
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof actualizarCarritoUI === 'function') {
    try { actualizarCarritoUI(); } catch (error) { console.error(error); }
  }

  loadHome()
    .catch((error) => console.error('Error cargando portada:', error));
});

const slides = document.querySelectorAll('.carrusel img');
const ind = $('#indicadores');
if (ind && slides.length) {
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'punto';
    dot.addEventListener('click', () => { idx = i; show(); });
    ind.appendChild(dot);
  });

  const puntos = document.querySelectorAll('.punto');
  let idx = 0;
  const show = () => {
    slides.forEach((slide, j) => slide.classList.toggle('activo', j === idx));
    puntos.forEach((dot, j) => dot.classList.toggle('activo', j === idx));
  };

  setInterval(() => { idx = (idx + 1) % slides.length; show(); }, 8000);
  show();
}
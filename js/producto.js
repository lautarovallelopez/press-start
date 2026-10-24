import { whatsappLink } from './config.js?v=5';
import { fetchJSON } from './api-client.js?v=7';
import {
  agregarAlCarrito,
  actualizarCarritoUI,
  mostrarMiniCarrito,
  actualizarContador,
  notificar
} from './carrito-utils.js?v=2';

const $ = (s) => document.querySelector(s);

document.addEventListener('DOMContentLoaded', () => {
  initMiniCarritoHover();
  actualizarCarritoUI();
  loadProducto();
});

function initMiniCarritoHover(){
  const carritoBtn = document.querySelector('.boton-carrito-flotante');
  const miniCarrito = document.getElementById('mini-carrito');
  if (!carritoBtn || !miniCarrito) return;

  carritoBtn.addEventListener('mouseenter', () => {
    mostrarMiniCarrito();
    miniCarrito.style.display = 'block';
  });
  carritoBtn.addEventListener('mouseleave', () =>
    setTimeout(() => (miniCarrito.style.display = 'none'), 400)
  );

  miniCarrito.addEventListener('mouseenter', () =>
    miniCarrito.style.display = 'block'
  );
  miniCarrito.addEventListener('mouseleave', () =>
    miniCarrito.style.display = 'none'
  );
}


async function loadProducto() {
  const id = new URLSearchParams(location.search).get('id');

  if (!id || !id.trim()) {
    showError('not-found');
    return;
  }

  try {
    const data = await fetchJSON('producto', {
      params: { id },
      retries: 1,
      timeoutMs: 12000
    });

    if (!data?.ok || !data.producto) {
      if (data?.error === 'not_found' || data?.error === 'producto_no_encontrado') {
        showError('not-found');
      } else if (data?.ok && !data.producto) {
        showError('not-found');
      } else {
        showError('connection');
      }
      return;
    }

    renderProducto(data.producto);

  } catch (error) {
    console.error('Error cargando producto:', error);
    showError('connection');
  }
}



function showError(tipo = 'not-found') {
  const loading = $('#pdp-loading');
  const box = $('#pdp-error');

  loading.style.display = 'none';
  $('#pdp').style.display = 'none';

  const esConexion = tipo === 'connection';

  box.innerHTML = `
    <div class="pdp-status-icon" aria-hidden="true">
      ${esConexion ? '⚠️' : '📦'}
    </div>

    <h2>
      ${esConexion
        ? '¡No pudimos cargar el producto!'
        : '¡No encontramos este producto!'}
    </h2>

    <p>
      ${esConexion
        ? 'Hubo un problema al consultar la información. Podés intentar nuevamente.'
        : 'El producto que buscás no está disponible o el enlace es incorrecto.'}
    </p>

    <div class="pdp-status-actions">
      ${esConexion ? `
        <button type="button" class="pdp-status-btn pdp-retry">
          ↻ Reintentar
        </button>
      ` : ''}

      <a href="./catalogo.html" class="pdp-status-btn">
        🛍️ Volver al catálogo
      </a>
    </div>
  `;

  box.style.display = 'block';

  box.querySelector('.pdp-retry')?.addEventListener('click', () => {
    box.style.display = 'none';
    loading.style.display = 'block';
    loadProducto();
  });
}


function setMeta(selector, value) {
  const el = document.head.querySelector(selector);
  if (el && value) el.setAttribute('content', value);
}

function setCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function updateProductMetadata({ nombre, id, categoria }) {
  const cleanName = nombre || 'Producto Dale Start';
  const title = `${cleanName} | Dale Start Argentina`;
  const description = `Consulta ${cleanName} en Dale Start Argentina. Productos oficiales de anime, figuras, peluches y coleccionables importados desde Japón.`;
  const url = `https://dalestart.com.ar${location.pathname}${id ? `?id=${encodeURIComponent(id)}` : ''}`;

  document.title = title;
  setCanonical(url);
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  if (categoria) setMeta('meta[property="product:category"]', categoria);
}

function renderProducto(p){
  $('#pdp-loading').style.display = 'none';
  $('#pdp-error').style.display = 'none';
  $('#pdp').style.display = 'block';

  const nombre = String(p.nombre || '').trim();
  const img = (p.imagen || '').trim();
  const id = String(p.id ?? '').trim();

  const precioNum = parseFloat(p.precio) || 0;
  const ofertaNum = parseFloat(p.oferta);
  const tieneOferta =
  String(p.etiqueta ?? '').trim().toUpperCase() === 'OFERTA' &&
  Number.isFinite(ofertaNum) &&
  ofertaNum > 0 &&
  ofertaNum < precioNum;
  const rawEstado = String(p.estado || '').toUpperCase();
  const estaAgotado = rawEstado.includes('SIN STOCK') || rawEstado.includes('AGOTADO');

  const estadoTxt = estaAgotado
    ? 'AGOTADO'
    : (tieneOferta ? 'OFERTA' : 'DISPONIBLE');

  const precioFinal = !estaAgotado && tieneOferta ? ofertaNum : precioNum;
  const categoria = [p.categoria, p.subcategoria].filter(Boolean).join(' - ');

  $('#pdp-nombre').textContent = nombre || 'Producto';
  $('#pdp-id').textContent = id ? `ID: ${id}` : '';
  $('#pdp-cat').textContent = p.categoria || '-';
  $('#pdp-sub').textContent = p.subcategoria || '-';
  updateProductMetadata({ nombre, id, categoria });

  const estadoEl = $('#pdp-estado');
  estadoEl.textContent = estadoTxt;
  $('#pdp').classList.toggle('pdp-is-agotado', estaAgotado);

  // Imagen
  const imgEl = $('#pdp-img');
  imgEl.src = img || 'https://via.placeholder.com/900x900?text=Sin+imagen';
  imgEl.alt = nombre;
  imgEl.referrerPolicy = 'no-referrer';

  // Precio
  const precioEl = $('#pdp-precio');
  if (!estaAgotado && tieneOferta){
    precioEl.innerHTML = `<span class="pdp-old">$ ${precioNum.toFixed(2)}</span> <span class="pdp-new">$ ${precioFinal.toFixed(2)}</span>`;
  } else {
    precioEl.textContent = `$ ${precioFinal.toFixed(2)}`;
  }

  // Botón carrito
  const addBtn = $('#pdp-add');
  addBtn.hidden = estaAgotado;
  addBtn.disabled = (estadoTxt === 'AGOTADO');
  addBtn.dataset.trackAction = 'add_to_cart';
  addBtn.dataset.trackItemId = id;
  addBtn.dataset.trackItemName = nombre;
  addBtn.dataset.trackPrice = precioFinal.toFixed(2);
  addBtn.dataset.trackCategory = categoria;
  addBtn.dataset.trackSource = 'producto_detalle';
  addBtn.dataset.trackCta = 'Añadir al carrito';
  addBtn.onclick = () => {
    if (estaAgotado) return;
    agregarAlCarrito({ ...p, precio: precioFinal });
    actualizarContador();
    notificar('✅ Producto añadido al carrito', 'success');
  };

  // Copy link
  $('#pdp-copy').hidden = estaAgotado;
  $('#pdp-copy').onclick = async () => {
    if (estaAgotado) return;
    try{
      await navigator.clipboard.writeText(location.href);
      notificar('🔗 Link copiado', 'success');
    }catch(_){
      notificar('No se pudo copiar el link (tu navegador lo bloqueó).', 'warning');
    }
  };

  // WhatsApp
  const msg = [
    '¡Hola! Quiero este producto:',
    `• ${nombre}`,
    id ? `• ID: ${id}` : null,
    `• Precio: $ ${precioFinal.toFixed(2)}`,
    `• Link: ${location.href}`
  ].filter(Boolean).join('\n');

  const waUrl = whatsappLink(estaAgotado ? [
    'Hola, quiero cotizar este producto agotado:',
    `- ${nombre}`,
    id ? `- ID: ${id}` : null,
    `- Link: ${location.href}`
  ].filter(Boolean).join('\n') : msg);
  const waBtn = $('#pdp-wa');
  waBtn.href = waUrl;
  waBtn.textContent = estaAgotado ? 'Cotizar producto agotado' : 'Pedir por WhatsApp';
  waBtn.classList.toggle('is-agotado', estaAgotado);
  waBtn.dataset.trackItemId = id;
  waBtn.dataset.trackItemName = nombre;
  waBtn.dataset.trackPrice = precioFinal.toFixed(2);
  waBtn.dataset.trackCategory = categoria;
  waBtn.dataset.trackSource = 'producto_detalle';
  waBtn.dataset.trackCta = waBtn.textContent;

  window.MardantTracking?.trackViewItem?.({
    item_id: id,
    item_name: nombre,
    item_category: categoria,
    price: precioFinal,
    source_section: 'producto_detalle'
  });
}

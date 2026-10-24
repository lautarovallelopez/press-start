import { CARRITO_LOCAL_KEY } from './config.js?v=5';
/* ----------------------------------------------------------
 * js/carrito-utils.js — utilidades compartidas (inicio + catálogo)
 * ---------------------------------------------------------- */

/* ====== API PÚBLICA (exportada) ====== */
export function agregarAlCarrito(prod) {
  const carrito = JSON.parse(localStorage.getItem(CARRITO_LOCAL_KEY) || '[]');

  const oferta = Number(prod.oferta);
  const precioBase = Number(prod.precio);
  const precioUnit = Number.isFinite(oferta) && oferta > 0 && oferta < precioBase
    ? oferta
    : (Number.isFinite(precioBase) ? precioBase : 0);

  carrito.push({
    id: String(prod.id ?? '').trim(), // <-- NUEVO (para link detalle)
    nombre: String(prod.nombre || '').trim(),
    precio: precioUnit,
    imagen: prod.imagen || 'https://via.placeholder.com/300x300?text=Sin+imagen',
  });

  localStorage.setItem(CARRITO_LOCAL_KEY, JSON.stringify(carrito));
  actualizarCarritoUI();
  notificar('✅ Producto añadido al carrito', 'success'); // (tu noti ya existe)
}

export function actualizarCarritoUI() {
  const carrito   = JSON.parse(localStorage.getItem(CARRITO_LOCAL_KEY) || '[]');
  const contador  = document.getElementById('contador-carrito');
  if (!contador) return;                         // la vista inicio.html no lo tiene

  contador.textContent   = carrito.length;
  contador.style.display = carrito.length ? 'inline-block' : 'none';
}



export function mostrarMiniCarrito() {
  const mini = document.getElementById('mini-carrito');
  if (!mini) return;

  const carrito = JSON.parse(
    localStorage.getItem(CARRITO_LOCAL_KEY) || '[]'
  );

  mini.innerHTML = '';

  if (!carrito.length) {
    mini.innerHTML = "<p style='color:#fff;'>Tu carrito está vacío</p>";
    return;
  }

  const cantidad = carrito.length;
  const tieneDescuento = cantidad >= 3;
  const factor = tieneDescuento ? 0.85 : 1;

  // Agrupar productos iguales
  const grupos = new Map();

  carrito.forEach(item => {
    const key = item.id
      ? `id:${item.id}`
      : `nombre:${item.nombre}`;

    if (!grupos.has(key)) {
      grupos.set(key, { ...item, cantidad: 0 });
    }

    grupos.get(key).cantidad++;
  });

  grupos.forEach(item => {
    const div = document.createElement('div');
    div.className = 'mini-carrito-item';

    const img = document.createElement('img');
    img.src = item.imagen;
    img.alt = item.nombre;
    img.referrerPolicy = 'no-referrer';

    const info = document.createElement('div');
    info.className = 'info';

    const nombre = document.createElement('div');
    nombre.textContent = item.nombre;
    info.appendChild(nombre);

    const precioOriginal = Number(item.precio) || 0;
    const precioFinal = precioOriginal * factor;

    if (tieneDescuento) {
      const anterior = document.createElement('del');
      anterior.textContent = `$ ${precioOriginal.toFixed(2)}`;
      anterior.style.color = '#aaa';
      anterior.style.marginRight = '8px';

      info.appendChild(anterior);
    }

    const precio = document.createElement('strong');
    precio.textContent = `$ ${precioFinal.toFixed(2)} x ${item.cantidad}`;
    precio.style.color = tieneDescuento ? '#66bb6a' : '#fff';

    info.appendChild(precio);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Eliminar producto del carrito');
    btn.textContent = 'x';
    btn.addEventListener('click', () => eliminarProductoMini(item.nombre));

    div.append(img, info, btn);
    mini.appendChild(div);
  });

  const totalOriginal = carrito.reduce(
    (s, p) => s + (Number(p.precio) || 0), 0
  );

  const totalFinal = totalOriginal * factor;

  const tot = document.createElement('div');
  tot.style.cssText =
    'color:#fff;text-align:right;margin-top:10px;font-weight:bold;';

  if (tieneDescuento) {
    tot.innerHTML = `
      <div style="color:#aaa;text-decoration:line-through;">
        $ ${totalOriginal.toFixed(2)}
      </div>
      <div style="color:#66bb6a;">
        Total 15% OFF: $ ${totalFinal.toFixed(2)}
      </div>
      <small style="color:#66bb6a;">
        Ahorrás $ ${(totalOriginal - totalFinal).toFixed(2)}
      </small>
    `;
  } else {
    tot.textContent = `Total: $ ${totalOriginal.toFixed(2)}`;
  }

  mini.appendChild(tot);
}



/* ====== API PRIVADA (helpers internos) ====== */
export function notificar(mensaje, tipo = 'success') {
  const tipos = {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FFC107'
  };
  
  const noti = document.createElement('div');
  noti.className = 'notificacion-flotante';
  noti.textContent = mensaje;
  noti.style.backgroundColor = tipos[tipo] || tipos.success;
  
  document.body.appendChild(noti);
  
  setTimeout(() => {
    noti.style.opacity = '0';
    setTimeout(() => noti.remove(), 300);
  }, 3000);
}

/* ====== helpers globales (window.*) ====== */
/* – los necesita el botón ✕ de cada línea del mini-carrito */
function eliminarProductoMini(nombre) {
  let carrito = JSON.parse(localStorage.getItem('carritoMardant') || '[]');
  const idx   = carrito.findIndex((p) => p.nombre === nombre);
  if (idx !== -1) carrito.splice(idx, 1);
  localStorage.setItem(CARRITO_LOCAL_KEY, JSON.stringify(carrito));
  actualizarCarritoUI();
  mostrarMiniCarrito();
}

window.eliminarProductoMini = eliminarProductoMini;

export const carrito = {
  obtener: () => JSON.parse(localStorage.getItem(CARRITO_LOCAL_KEY)) || [],
  guardar: (items) => localStorage.setItem(CARRITO_LOCAL_KEY, JSON.stringify(items)),
  limpiar: () => localStorage.removeItem(CARRITO_LOCAL_KEY)
};

export function actualizarContador() {
  const contadores = document.querySelectorAll('#contador-carrito');
  const cantidad = carrito.obtener().length;
  contadores.forEach(c => {
    c.textContent = cantidad;
    c.style.display = cantidad ? 'inline-block' : 'none';
  });
}

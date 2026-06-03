const API_URL = 'https://api-esperanza-backend.onrender.com';
let usuarioActual = null;
let modoActual = ''; 
let metodoEntregaSeleccionado = 'Domicilio';
let carritoProductos = []; 
let carritoVentas = [];    
let productosCache = [];   

// ==========================================
// 1. LOGIN Y NAVEGACIÓN
// ==========================================
async function iniciarSesion() {
    const correo = document.getElementById('login-correo').value;
    const password = document.getElementById('login-pass').value;
    try {
        const respuesta = await fetch(`${API_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });
        const data = await respuesta.json();
        if (data.exito) {
            usuarioActual = data.usuario;
            document.getElementById('nombre-usuario').innerText = `Hola, ${usuarioActual.nombre}`;
            document.getElementById('nav-usuario').classList.remove('oculto');
            document.getElementById('seccion-login').classList.add('oculto');
            document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
            cargarCatalogo();
        } else { alert("Credenciales incorrectas"); }
    } catch (error) { alert("Error de servidor"); }
}

function cerrarSesion() { location.reload(); }

function seleccionarActividad(actividad) {
    document.getElementById('seccion-seleccion-actividad').classList.add('oculto');
    document.getElementById('seccion-panel').classList.remove('oculto');
    document.getElementById('tab-comprar').classList.add('oculto');
    document.getElementById('tab-vender').classList.add('oculto');
    
    if (actividad === 'comprar') {
        document.getElementById('tab-comprar').classList.remove('oculto');
        document.getElementById('btn-flotante-ver-carrito').classList.remove('oculto');
    } else {
        document.getElementById('tab-vender').classList.remove('oculto');
        document.getElementById('btn-flotante-ver-carrito').classList.add('oculto');
        inicializarFormularioVentas();
    }
}

function regresarAlMenu() {
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('btn-flotante-ver-carrito').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
}

// ==========================================
// 2. SISTEMA DE RASTREO, MULTAS Y EDICIÓN
// ==========================================
function abrirMisPedidos() {
    document.getElementById('seccion-seleccion-actividad').classList.add('oculto');
    document.getElementById('seccion-mis-pedidos').classList.remove('oculto');
    cargarMisPedidos();
}

function regresarAlMenuDesdePedidos() {
    document.getElementById('seccion-mis-pedidos').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
}

async function cargarMisPedidos() {
    const contenedor = document.getElementById('lista-mis-pedidos');
    contenedor.innerHTML = '<p class="text-center text-muted mt-3">Sincronizando con el satélite... 🛰️</p>';
    
    try {
        const respuesta = await fetch(`${API_URL}/api/mis-pedidos/${usuarioActual.id_cliente}`);
        const pedidos = await respuesta.json();

        if (pedidos.length === 0) {
            contenedor.innerHTML = '<p class="text-center text-muted mt-4">Aún no has realizado pedidos.</p>';
            return;
        }

        contenedor.innerHTML = '';
        pedidos.forEach(ped => {
            const esCancelado = ped.estado === 'Cancelado';
            const colorEstado = esCancelado ? 'danger' : (ped.estado === 'Entregado' ? 'success' : 'primary');
            
            contenedor.innerHTML += `
                <div class="border rounded p-3 mb-3 bg-white shadow-sm" style="border-left: 5px solid var(--bs-${colorEstado}) !important;">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="badge bg-${colorEstado}">${ped.estado}</span>
                        <span class="text-muted small fw-bold">ID: ${ped.token_digital}</span>
                    </div>
                    <p class="mb-1 text-dark small"><strong>📍 Ubicación actual:</strong> ${ped.ubicacion}</p>
                    <p class="mb-1 text-muted small"><strong>Pago:</strong> ${ped.metodo_pago}</p>
                    <p class="mb-1 text-muted small"><strong>Envío:</strong> <span class="fw-bold text-dark">${ped.tipo_entrega}</span></p>
                    
                    ${parseFloat(ped.multa) > 0 ? `<div class="alert alert-danger p-2 mt-2 mb-0 small"><strong>⚠️ Multa aplicada:</strong> Q. ${parseFloat(ped.multa).toFixed(2)} por logística.</div>` : ''}
                    
                    ${!esCancelado && ped.estado === 'Preparando' ? `
                        <div class="mt-3 border-top pt-3 d-flex justify-content-end gap-2">
                            <button onclick="editarPedido(${ped.id_pedido})" class="btn btn-sm btn-outline-primary fw-bold">✏️ Editar Envío</button>
                            <button onclick="cancelarPedido(${ped.id_pedido})" class="btn btn-sm btn-outline-danger fw-bold">❌ Cancelar (Multa Q.25)</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    } catch (error) {
        contenedor.innerHTML = '<p class="text-danger text-center">Error al cargar el historial.</p>';
    }
}

async function cancelarPedido(idPedido) {
    const confirmar = confirm("🚨 ATENCIÓN: Al cancelar el pedido se aplicará una multa automática de Q. 25.00 a su estado de cuenta. ¿Desea continuar?");
    if(!confirmar) return;

    try {
        const respuesta = await fetch(`${API_URL}/api/cancelar-pedido`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_pedido: idPedido })
        });
        const data = await respuesta.json();
        if(respuesta.ok) { alert(data.mensaje); cargarMisPedidos(); } 
        else { alert("No se pudo cancelar."); }
    } catch(e) { alert("Error de red."); }
}

async function editarPedido(idPedido) {
    const nuevoEnvio = prompt("Editar Pedido.\n¿Cómo deseas recibir tu pedido?\nEscribe 'Domicilio' o 'Kiosco':");
    if(!nuevoEnvio) return; 
    let tipoFinal = '';
    if(nuevoEnvio.toLowerCase().includes('domicilio')) tipoFinal = 'A Domicilio';
    else if(nuevoEnvio.toLowerCase().includes('kiosco')) tipoFinal = 'Retiro en Kiosco';
    else return alert("⚠️ Opción no válida.");

    try {
        const respuesta = await fetch(`${API_URL}/api/editar-pedido`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_pedido: idPedido, nuevo_tipo_entrega: tipoFinal })
        });
        const data = await respuesta.json();
        if(respuesta.ok) { alert("✅ " + data.mensaje); cargarMisPedidos(); } 
        else { alert("No se pudo editar."); }
    } catch(e) { alert("Error de conexión."); }
}

// ==========================================
// 3. COMPRAS Y VENTAS
// ==========================================
async function cargarCatalogo() {
    const contenedor = document.getElementById('catalogo-productos');
    const respuesta = await fetch(`${API_URL}/api/productos`);
    productosCache = await respuesta.json();
    contenedor.innerHTML = '';
    productosCache.forEach(prod => {
        contenedor.innerHTML += `
            <div class="col-6 col-md-4">
                <div class="card-custom p-3 h-100 shadow-sm">
                    <h6 class="fw-bold text-dark">${prod.nombre}</h6>
                    <p class="text-success mb-1">Q. ${parseFloat(prod.precio_unitario).toFixed(2)}</p>
                    <p class="small text-muted mb-2">Stock: ${prod.stock_disponible}</p>
                    <input type="number" id="cant-${prod.id_producto}" class="form-control form-control-sm mb-2" value="1" min="1">
                    <button onclick="agregarAlCarrito(${prod.id_producto})" class="btn btn-sm btn-success w-100">Comprar</button>
                </div>
            </div>`;
    });
}

function agregarAlCarrito(id) {
    const cant = parseInt(document.getElementById(`cant-${id}`).value);
    const prod = productosCache.find(p => p.id_producto === id);
    const item = carritoProductos.find(i => i.id_producto === id);
    if(item) item.cantidad += cant;
    else carritoProductos.push({ ...prod, cantidad: cant });
    document.getElementById('badge-flotante-conteo').innerText = carritoProductos.length;
    alert("Producto agregado");
}

function irAlCarritoPestaña() {
    document.getElementById('tab-comprar').classList.add('oculto');
    document.getElementById('bloque-regresar-menu').classList.add('oculto'); 
    document.getElementById('btn-flotante-ver-carrito').classList.add('oculto'); 
    document.getElementById('tab-carrito-pantalla-aparte').classList.remove('oculto');
    
    const cont = document.getElementById('items-carrito-visual');
    cont.innerHTML = '';
    let total = 0;
    carritoProductos.forEach(i => {
        total += (i.precio_unitario * i.cantidad);
        cont.innerHTML += `<div class="d-flex justify-content-between border-bottom pb-2 mb-2">
            <span>${i.cantidad}x ${i.nombre}</span><span class="fw-bold">Q. ${(i.precio_unitario * i.cantidad).toFixed(2)}</span>
        </div>`;
    });
    document.getElementById('total-carrito').innerText = `Q. ${total.toFixed(2)}`;
}

function regresarAlCatalogo() {
    document.getElementById('tab-carrito-pantalla-aparte').classList.add('oculto');
    document.getElementById('tab-comprar').classList.remove('oculto');
    document.getElementById('btn-flotante-ver-carrito').classList.remove('oculto');
    document.getElementById('bloque-regresar-menu').classList.remove('oculto');
}

function prepararPasoCompraEntrega() {
    if(carritoProductos.length === 0) return alert("Carrito vacío");
    modoActual = 'COMPRA';
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

function inicializarFormularioVentas() {
    const sel = document.getElementById('venta-producto');
    sel.innerHTML = '';
    productosCache.forEach(p => sel.innerHTML += `<option value="${p.id_producto}">${p.nombre}</option>`);
}

function agregarProductoALaVenta() {
    const id = document.getElementById('venta-producto').value;
    const cant = document.getElementById('venta-cantidad').value;
    const nombre = document.getElementById('venta-producto').options[document.getElementById('venta-producto').selectedIndex].text;
    carritoVentas.push({ id_producto: id, cantidad: cant, nombre: nombre });
    document.getElementById('lista-productos-venta').innerHTML += `<p class="small mb-1 text-success fw-bold">✅ ${cant}x ${nombre}</p>`;
    document.getElementById('venta-cantidad').value = '';
}

function procesarPasoVentaUno() {
    if(carritoVentas.length === 0) return alert("Agrega productos");
    modoActual = 'VENTA';
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

function seleccionarMetodoEntregaVenta(metodo) {
    metodoEntregaSeleccionado = metodo;
    document.getElementById('opcion-domicilio').classList.toggle('seleccionada', metodo === 'Domicilio');
    document.getElementById('opcion-puntoventa').classList.toggle('seleccionada', metodo === 'Punto de Venta');
}

function regresarDesdeEntrega() {
    document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
    document.getElementById('seccion-panel').classList.remove('oculto');
}

// ==========================================
// 4. NUEVO: FLUJO DE RESUMEN Y CONFIRMACIÓN
// ==========================================
function mostrarResumenPedido() {
    document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
    document.getElementById('seccion-resumen-pedido').classList.remove('oculto');

    const listaItems = document.getElementById('lista-resumen-items');
    const labelTotal = document.getElementById('label-total-resumen');
    const valorTotal = document.getElementById('valor-total-resumen');
    
    document.getElementById('resumen-metodo-entrega').innerText = metodoEntregaSeleccionado;
    listaItems.innerHTML = '';
    let total = 0;

    if (modoActual === 'COMPRA') {
        document.getElementById('resumen-tipo-op').innerText = 'Adquisición de Insumos';
        document.getElementById('resumen-pago').innerText = 'Efectivo contra entrega';
        labelTotal.innerText = 'Total a Pagar:';

        carritoProductos.forEach(i => {
            const sub = i.precio_unitario * i.cantidad;
            total += sub;
            listaItems.innerHTML += `<div class="d-flex justify-content-between mb-2 pb-1 border-bottom border-light"><span><span class="text-muted">${i.cantidad}x</span> ${i.nombre}</span><span class="fw-bold">Q. ${sub.toFixed(2)}</span></div>`;
        });
        valorTotal.innerText = `Q. ${total.toFixed(2)}`;
        valorTotal.className = 'text-success fw-bold fs-4';
    } else {
        document.getElementById('resumen-tipo-op').innerText = 'Ofrecimiento de Cosecha';
        document.getElementById('resumen-pago').innerText = 'Pago sujeto a calidad en Kiosco';
        labelTotal.innerText = 'Total:';

        carritoVentas.forEach(i => {
            listaItems.innerHTML += `<div class="mb-1 text-dark">• <span class="fw-bold">${i.cantidad}x</span> ${i.nombre}</div>`;
        });
        valorTotal.innerText = 'Pendiente de Avalúo';
        valorTotal.className = 'text-primary fw-bold fs-6';
    }
}

function regresarDesdeResumen() {
    document.getElementById('seccion-resumen-pedido').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

async function confirmarFlujoFinal() {
    document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-info py-2 text-center small fw-bold">Procesando orden de forma segura... ⏳</div>';

    const payload = modoActual === 'COMPRA' ? 
        { id_cliente: usuarioActual.id_cliente, tipo_entrega: metodoEntregaSeleccionado, metodo_pago: 'Efectivo', carrito: carritoProductos } :
        { id_cliente: usuarioActual.id_cliente, kiosco_entrega: 'Central', metodo_recepcion: metodoEntregaSeleccionado, productos: carritoVentas };
    
    const endpoint = modoActual === 'COMPRA' ? '/api/checkout' : '/api/vender';
    
    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(res.ok) {
            document.getElementById('seccion-resumen-pedido').classList.add('oculto');
            document.getElementById('seccion-compra-exitosa').classList.remove('oculto');
            document.getElementById('token-exito').innerText = data.token;
            document.getElementById('alerta-resumen').innerHTML = '';
            carritoProductos = []; carritoVentas = [];
        } else { 
            document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2 text-center small">No se pudo procesar. Verifique el inventario.</div>';
        }
    } catch(e) { 
        document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2 text-center small">Error de red.</div>'; 
    }
}

function regresarAlMenuDesdeExito() {
    document.getElementById('seccion-compra-exitosa').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
}
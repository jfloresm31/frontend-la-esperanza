const API_URL = 'https://api-esperanza-backend.onrender.com';
let usuarioActual = null;
let modoActual = ''; 
let metodoEntregaSeleccionado = 'Domicilio';
let ubicacionFinal = ''; 
let carritoProductos = []; 
let carritoVentas = [];    
let productosCache = [];   

function obtenerImagen(nombre) {
    const n = nombre.toLowerCase();
    if(n.includes('tomate')) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=400&auto=format&fit=crop';
    if(n.includes('frijol')) return 'https://images.unsplash.com/photo-1551326844-4df70f78d0e9?q=80&w=400&auto=format&fit=crop';
    if(n.includes('cebolla')) return 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?q=80&w=400&auto=format&fit=crop';
    if(n.includes('papa')) return 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400&auto=format&fit=crop';
    if(n.includes('zanahoria')) return 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=400&auto=format&fit=crop';
    if(n.includes('chile') || n.includes('pimiento')) return 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=400&auto=format&fit=crop';
    if(n.includes('maiz') || n.includes('maíz')) return 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=400&auto=format&fit=crop';
    if(n.includes('limon') || n.includes('limón')) return 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Lemon_and_lime.jpg';
    if(n.includes('aguacate')) return 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=400&auto=format&fit=crop';
    if(n.includes('repollo')) return 'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?q=80&w=400&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=400&auto=format&fit=crop'; 
}

// ==========================================
// 1. SISTEMA DE LOGIN Y REGISTRO
// ==========================================
function mostrarRegistro() {
    document.getElementById('tarjeta-login').classList.add('oculto');
    document.getElementById('tarjeta-registro').classList.remove('oculto');
}

function mostrarLogin() {
    document.getElementById('tarjeta-registro').classList.add('oculto');
    document.getElementById('tarjeta-login').classList.remove('oculto');
}

async function registrarCuenta() {
    const nombre = document.getElementById('reg-nombre').value;
    const correo = document.getElementById('reg-correo').value;
    const password = document.getElementById('reg-pass').value;
    const alerta = document.getElementById('alerta-registro');

    if(!nombre || !correo || !password) return alerta.innerHTML = '<div class="alert alert-warning py-2 small">Llena todos los campos.</div>';
    
    alerta.innerHTML = '<div class="alert alert-info py-2 small">Creando cuenta...</div>';
    
    try {
        const respuesta = await fetch(`${API_URL}/api/registro`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, correo, password })
        });
        const data = await respuesta.json();
        
        if (respuesta.ok) {
            alerta.innerHTML = `<div class="alert alert-success py-2 small">${data.mensaje}</div>`;
            setTimeout(() => { mostrarLogin(); document.getElementById('login-correo').value = correo; }, 2000);
        } else {
            alerta.innerHTML = `<div class="alert alert-danger py-2 small">${data.error}</div>`;
        }
    } catch (error) { alerta.innerHTML = '<div class="alert alert-danger py-2 small">Error del servidor.</div>'; }
}

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

// ==========================================
// 2. NAVEGACIÓN Y MENÚ
// ==========================================
function seleccionarActividad(actividad) {
    document.getElementById('seccion-seleccion-actividad').classList.add('oculto');
    document.getElementById('seccion-panel').classList.remove('oculto');
    document.getElementById('tab-comprar').classList.add('oculto');
    document.getElementById('tab-vender').classList.add('oculto');
    document.getElementById('tab-carrito-pantalla-aparte').classList.add('oculto'); 
    
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
// 3. RASTREO DE PEDIDOS
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
    contenedor.innerHTML = '<p class="text-center text-muted mt-3">Cargando...</p>';
    try {
        const respuesta = await fetch(`${API_URL}/api/mis-pedidos/${usuarioActual.id_cliente}`);
        const pedidos = await respuesta.json();
        if (pedidos.length === 0) return contenedor.innerHTML = '<p class="text-center text-muted mt-4">No hay pedidos.</p>';

        contenedor.innerHTML = '';
        pedidos.forEach(ped => {
            const esCancelado = ped.estado === 'Cancelado';
            const colorEstado = esCancelado ? 'danger' : (ped.estado === 'Entregado' ? 'success' : 'primary');
            contenedor.innerHTML += `
                <div class="border rounded p-3 mb-3 bg-light shadow-sm" style="border-left: 5px solid var(--bs-${colorEstado}) !important;">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="badge bg-${colorEstado}">${ped.estado}</span>
                        <span class="text-muted small fw-bold">ID: ${ped.token_digital}</span>
                    </div>
                    <p class="mb-1 text-dark small"><strong>📍 Ubicación:</strong> ${ped.ubicacion}</p>
                    <p class="mb-1 text-muted small"><strong>Envío:</strong> <span class="fw-bold text-dark">${ped.tipo_entrega}</span></p>
                    ${parseFloat(ped.multa) > 0 ? `<div class="alert alert-danger p-2 mt-2 mb-0 small"><strong>⚠️ Multa aplicada:</strong> Q. ${parseFloat(ped.multa).toFixed(2)}</div>` : ''}
                    ${!esCancelado && ped.estado === 'Preparando' ? `
                        <div class="mt-3 border-top pt-3 text-end">
                            <button onclick="cancelarPedido(${ped.id_pedido})" class="btn btn-sm btn-outline-danger fw-bold">❌ Cancelar Pedido</button>
                        </div>
                    ` : ''}
                </div>`;
        });
    } catch (error) { contenedor.innerHTML = '<p class="text-danger text-center">Error.</p>'; }
}

async function cancelarPedido(idPedido) {
    if(!confirm("🚨 ATENCIÓN: Se aplicará una multa de Q. 25.00. ¿Continuar?")) return;
    try {
        const respuesta = await fetch(`${API_URL}/api/cancelar-pedido`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_pedido: idPedido })
        });
        if(respuesta.ok) { alert("Pedido Cancelado"); cargarMisPedidos(); } 
    } catch(e) { alert("Error de red."); }
}

// ==========================================
// 4. COMPRAS Y CARRITO EDITABLE
// ==========================================
async function cargarCatalogo() {
    const contenedor = document.getElementById('catalogo-productos');
    const respuesta = await fetch(`${API_URL}/api/productos`);
    productosCache = await respuesta.json();
    contenedor.innerHTML = '';
    productosCache.forEach(prod => {
        const imgUrl = obtenerImagen(prod.nombre); 
        contenedor.innerHTML += `
            <div class="col-6 col-md-4">
                <div class="card-custom h-100 shadow-sm overflow-hidden d-flex flex-column">
                    <img src="${imgUrl}" class="w-100" style="height: 120px; object-fit: cover;">
                    <div class="p-3 d-flex flex-column flex-grow-1">
                        <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">${prod.nombre}</h6>
                        <p class="text-success fw-bold mb-1">Q. ${parseFloat(prod.precio_unitario).toFixed(2)}</p>
                        <p class="small text-muted mb-2">Stock: ${prod.stock_disponible}</p>
                        <div class="mt-auto">
                            <button onclick="agregarAlCarrito(${prod.id_producto})" class="btn btn-sm btn-success w-100 fw-bold">🛒 Agregar</button>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

function agregarAlCarrito(id) {
    const prod = productosCache.find(p => p.id_producto === id);
    const item = carritoProductos.find(i => i.id_producto === id);
    if(item) {
        if(item.cantidad < prod.stock_disponible) item.cantidad += 1;
        else alert("Stock máximo alcanzado");
    } else {
        carritoProductos.push({ ...prod, cantidad: 1, imagen: obtenerImagen(prod.nombre) });
    }
    document.getElementById('badge-flotante-conteo').innerText = carritoProductos.length;
    alert("Producto agregado al carrito");
}

// NUEVO: Función para editar cantidades dentro del carrito
function cambiarCantidadCarrito(id, nuevaCantidad) {
    const cant = parseInt(nuevaCantidad);
    if(cant <= 0 || isNaN(cant)) return eliminarDelCarrito(id);
    
    const prodInfo = productosCache.find(p => p.id_producto === id);
    if(cant > prodInfo.stock_disponible) {
        alert(`Solo hay ${prodInfo.stock_disponible} disponibles en stock.`);
        return actualizarVistaCarrito(); 
    }
    
    const item = carritoProductos.find(i => i.id_producto === id);
    if(item) item.cantidad = cant;
    
    actualizarVistaCarrito();
}

function eliminarDelCarrito(id) {
    carritoProductos = carritoProductos.filter(i => i.id_producto !== id);
    document.getElementById('badge-flotante-conteo').innerText = carritoProductos.length;
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const cont = document.getElementById('items-carrito-visual');
    cont.innerHTML = '';
    let total = 0;
    
    if (carritoProductos.length === 0) {
        cont.innerHTML = '<p class="text-center text-muted">Tu carrito está vacío.</p>';
        document.getElementById('total-carrito').innerText = `Q. 0.00`;
        return;
    }

    carritoProductos.forEach(i => {
        const sub = i.precio_unitario * i.cantidad;
        total += sub;
        
        // Aquí agregamos el INPUT editable para la cantidad
        cont.innerHTML += `
            <div class="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                <div class="d-flex align-items-center gap-3 w-100">
                    <img src="${i.imagen}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                    <div style="flex-grow: 1;">
                        <span class="fw-bold d-block text-dark">${i.nombre}</span>
                        <div class="d-flex align-items-center mt-1">
                            <label class="small text-muted me-2 mb-0">Cant:</label>
                            <input type="number" class="form-control form-control-sm text-center" style="width: 60px;" value="${i.cantidad}" min="1" onchange="cambiarCantidadCarrito(${i.id_producto}, this.value)">
                        </div>
                    </div>
                </div>
                <div class="text-end d-flex flex-column justify-content-between align-items-end h-100">
                    <button onclick="eliminarDelCarrito(${i.id_producto})" class="btn text-danger p-0 fw-bold fs-5" style="background:none; border:none;">&times;</button>
                    <span class="fw-bold text-dark mt-2">Q. ${sub.toFixed(2)}</span>
                </div>
            </div>`;
    });
    document.getElementById('total-carrito').innerText = `Q. ${total.toFixed(2)}`;
}

function irAlCarritoPestaña() {
    document.getElementById('tab-comprar').classList.add('oculto');
    document.getElementById('bloque-regresar-menu').classList.add('oculto'); 
    document.getElementById('btn-flotante-ver-carrito').classList.add('oculto'); 
    document.getElementById('tab-carrito-pantalla-aparte').classList.remove('oculto');
    actualizarVistaCarrito();
}

function regresarAlCatalogo() {
    document.getElementById('tab-carrito-pantalla-aparte').classList.add('oculto');
    document.getElementById('tab-comprar').classList.remove('oculto');
    document.getElementById('btn-flotante-ver-carrito').classList.remove('oculto');
    document.getElementById('bloque-regresar-menu').classList.remove('oculto');
}

function prepararPasoCompraEntrega() {
    if(carritoProductos.length === 0) return alert("El carrito está vacío");
    modoActual = 'COMPRA';
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

// ==========================================
// 5. VENTAS 
// ==========================================
function inicializarFormularioVentas() {
    const sel = document.getElementById('venta-producto');
    sel.innerHTML = '<option value="" disabled selected>-- Elige un producto --</option>';
    productosCache.forEach(p => {
        sel.innerHTML += `<option value="${p.id_producto}" data-precio="${p.precio_unitario}">${p.nombre} (Aprox: Q. ${p.precio_unitario})</option>`;
    });
}

function agregarProductoALaVenta() {
    const select = document.getElementById('venta-producto');
    const id = select.value;
    const cant = document.getElementById('venta-cantidad').value;
    if(!id || !cant || cant <= 0) return alert("Selecciona producto y cantidad válida");
    
    const option = select.options[select.selectedIndex];
    const precio = parseFloat(option.getAttribute('data-precio'));
    const nombreLimpio = option.text.split(' (')[0]; 
    carritoVentas.push({ id_producto: id, cantidad: cant, nombre: nombreLimpio, precio: precio, imagen: obtenerImagen(nombreLimpio) });
    
    document.getElementById('lista-productos-venta').innerHTML += `<div class="small mb-1 text-success fw-bold">✅ ${cant}x ${nombreLimpio}</div>`;
    document.getElementById('venta-cantidad').value = '';
    select.selectedIndex = 0;
}

function procesarPasoVentaUno() {
    if(carritoVentas.length === 0) return alert("Agrega productos");
    modoActual = 'VENTA';
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

// ==========================================
// 6. FLUJO DE ENTREGA, RESUMEN (Y COBRO Q.25)
// ==========================================
function seleccionarMetodoEntregaVenta(metodo) {
    metodoEntregaSeleccionado = metodo;
    document.getElementById('opcion-domicilio').classList.toggle('seleccionada', metodo === 'Domicilio');
    document.getElementById('opcion-puntoventa').classList.toggle('seleccionada', metodo === 'Punto de Venta');

    if(metodo === 'Domicilio') {
        document.getElementById('div-direccion-domicilio').classList.remove('oculto');
        document.getElementById('div-seleccion-kiosco').classList.add('oculto');
    } else {
        document.getElementById('div-direccion-domicilio').classList.add('oculto');
        document.getElementById('div-seleccion-kiosco').classList.remove('oculto');
    }
}

function regresarDesdeEntrega() {
    document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
    document.getElementById('seccion-panel').classList.remove('oculto');
}

function mostrarResumenPedido() {
    if(metodoEntregaSeleccionado === 'Domicilio') {
        ubicacionFinal = document.getElementById('input-direccion-entrega').value.trim();
        if(!ubicacionFinal) return alert("Por favor, ingrese su dirección exacta.");
    } else {
        ubicacionFinal = document.getElementById('select-kiosco-entrega').value;
    }

    document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
    document.getElementById('seccion-resumen-pedido').classList.remove('oculto');

    const listaItems = document.getElementById('lista-resumen-items');
    const valorTotal = document.getElementById('valor-total-resumen');
    
    listaItems.innerHTML = '';
    let total = 0;

    if (modoActual === 'COMPRA') {
        carritoProductos.forEach(i => {
            const sub = i.precio_unitario * i.cantidad;
            total += sub;
            listaItems.innerHTML += `
                <div class="d-flex justify-content-between mb-2 pb-1 border-bottom">
                    <span>${i.cantidad}x ${i.nombre}</span>
                    <span class="fw-bold">Q. ${sub.toFixed(2)}</span>
                </div>`;
        });
        
        // ¡NUEVO! CÁLCULO DEL COSTO DE ENVÍO (Q. 25.00)
        if(metodoEntregaSeleccionado === 'Domicilio') {
            total += 25.00;
            listaItems.innerHTML += `
                <div class="d-flex justify-content-between mt-2 pt-2 border-top">
                    <span class="fw-bold text-dark">🚚 Costo de Envío a Domicilio</span>
                    <span class="fw-bold text-danger">+ Q. 25.00</span>
                </div>`;
        } else {
            listaItems.innerHTML += `
                <div class="d-flex justify-content-between mt-2 pt-2 border-top">
                    <span class="fw-bold text-dark">🏪 Retiro en Kiosco</span>
                    <span class="fw-bold text-success">Gratis</span>
                </div>`;
        }

        valorTotal.innerText = `Q. ${total.toFixed(2)}`;
    } else {
        carritoVentas.forEach(i => {
            const sub = i.precio * i.cantidad;
            total += sub;
            listaItems.innerHTML += `
                <div class="d-flex justify-content-between mb-2 pb-1 border-bottom">
                    <span>${i.cantidad}x ${i.nombre}</span>
                    <span class="text-success fw-bold">~ Q. ${sub.toFixed(2)}</span>
                </div>`;
        });
        valorTotal.innerText = `~ Q. ${total.toFixed(2)}`;
    }
}

function regresarDesdeResumen() {
    document.getElementById('seccion-resumen-pedido').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

async function confirmarFlujoFinal() {
    document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-info py-2 text-center small fw-bold">Procesando orden...</div>';

    const productosVentaPayload = carritoVentas.map(item => ({ id_producto: item.id_producto, cantidad_ofrecida: item.cantidad }));

    const payload = modoActual === 'COMPRA' ? 
        { id_cliente: usuarioActual.id_cliente, tipo_entrega: metodoEntregaSeleccionado, metodo_pago: 'Efectivo', carrito: carritoProductos, ubicacion_especifica: ubicacionFinal } :
        { id_cliente: usuarioActual.id_cliente, kiosco_entrega: ubicacionFinal, metodo_recepcion: metodoEntregaSeleccionado, productos: productosVentaPayload };
    
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
            carritoProductos = []; carritoVentas = [];
        } else { document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2">Error al procesar.</div>'; }
    } catch(e) { document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2">Error de red.</div>'; }
}

function regresarAlMenuDesdeExito() {
    document.getElementById('seccion-compra-exitosa').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
    window.scrollTo(0, 0);
}
const API_URL = 'https://api-esperanza-backend.onrender.com';
let usuarioActual = null;
let modoActual = ''; 
let metodoEntregaSeleccionado = 'Domicilio';
let ubicacionFinal = ''; 
let carritoProductos = []; 
let carritoVentas = [];    
let productosCache = [];   

// NUEVAS VARIABLES PARA AÑADIR A PEDIDOS EXISTENTES
let pedidoAEditar = null; 
let tokenPedidoAEditar = '';

function obtenerImagen(nombre) {
    const n = nombre.toLowerCase();
    if(n.includes('tomate')) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=400&auto=format&fit=crop';
    if(n.includes('frijol')) return 'https://images.unsplash.com/photo-1551326844-4df70f78d0e9?q=80&w=400&auto=format&fit=crop';
    if(n.includes('cebolla')) return 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?q=80&w=400&auto=format&fit=crop';
    if(n.includes('papa')) return 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400&auto=format&fit=crop';
    if(n.includes('zanahoria')) return 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=400&auto=format&fit=crop';
    if(n.includes('chile') || n.includes('pimiento')) return 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=400&auto=format&fit=crop';
    if(n.includes('maiz') || n.includes('maíz')) return 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=400&auto=format&fit=crop';
    if(n.includes('limon') || n.includes('limón')) return 'https://images.unsplash.com/photo-1590502593747-422e15307311?q=80&w=400&auto=format&fit=crop';
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
    if (pedidoAEditar) {
        const confirmar = confirm("Estás en modo edición de pedido. ¿Deseas salir sin agregar nada?");
        if (!confirmar) return;
        pedidoAEditar = null; tokenPedidoAEditar = ''; carritoProductos = [];
    }

    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('btn-flotante-ver-carrito').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
}

// ==========================================
// 3. RASTREO Y ANEXO A PEDIDOS (ADD-ON)
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
                        <div class="mt-3 border-top pt-3 d-flex flex-wrap justify-content-end gap-2">
                            <button onclick="activarModoEdicion(${ped.id_pedido}, '${ped.token_digital}')" class="btn btn-sm btn-outline-success fw-bold">➕ Agregar Insumos</button>
                            <button onclick="editarPedido(${ped.id_pedido})" class="btn btn-sm btn-outline-primary fw-bold">✏️ Editar Envío</button>
                            <button onclick="cancelarPedido(${ped.id_pedido})" class="btn btn-sm btn-outline-danger fw-bold">❌ Cancelar</button>
                        </div>
                    ` : ''}
                </div>`;
        });
    } catch (error) { contenedor.innerHTML = '<p class="text-danger text-center">Error.</p>'; }
}

// NUEVA FUNCIÓN: Envía al usuario al catálogo para agregar cosas a su pedido existente
function activarModoEdicion(idPedido, token) {
    pedidoAEditar = idPedido;
    tokenPedidoAEditar = token;
    carritoProductos = []; // Limpiamos el carrito
    
    alert(`💡 MODO ANEXO ACTIVADO\n\nVas a agregar insumos extra al pedido ${token}.\n\nSe usará tu mismo envío original sin cobrarte recargo adicional. Selecciona los nuevos productos.`);
    
    document.getElementById('seccion-mis-pedidos').classList.add('oculto');
    seleccionarActividad('comprar');
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

async function editarPedido(idPedido) {
    const nuevoEnvio = prompt("Editar Pedido.\n¿Escribe 'Domicilio' o 'Kiosco':");
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
    } catch(e) { alert("Error de conexión."); }
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
                            <input type="number" id="cant-${prod.id_producto}" class="form-control form-control-sm mb-2 text-center fw-bold" value="1" min="1" max="${prod.stock_disponible}">
                            <button onclick="agregarAlCarrito(${prod.id_producto})" class="btn btn-sm btn-success w-100 fw-bold">🛒 Agregar</button>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

function agregarAlCarrito(id) {
    const inputCantidad = document.getElementById(`cant-${id}`);
    const cant = parseInt(inputCantidad.value);
    if(isNaN(cant) || cant <= 0) return alert("Ingresa una cantidad válida.");

    const prod = productosCache.find(p => p.id_producto === id);
    const item = carritoProductos.find(i => i.id_producto === id);
    
    if(item) {
        if((item.cantidad + cant) <= prod.stock_disponible) item.cantidad += cant;
        else return alert(`Solo hay ${prod.stock_disponible} en stock.`);
    } else {
        if(cant <= prod.stock_disponible) carritoProductos.push({ ...prod, cantidad: cant, imagen: obtenerImagen(prod.nombre) });
        else return alert(`Solo hay ${prod.stock_disponible} en stock.`);
    }
    
    document.getElementById('badge-flotante-conteo').innerText = carritoProductos.length;
    inputCantidad.value = 1; 
    
    const btnFlotante = document.getElementById('btn-flotante-ver-carrito');
    btnFlotante.style.transform = 'scale(1.2)';
    setTimeout(() => btnFlotante.style.transform = 'scale(1)', 200);
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

function cambiarCantidadCarrito(idProducto, nuevaCantidad) {
    const cant = parseInt(nuevaCantidad);
    if(cant <= 0 || isNaN(cant)) return eliminarDelCarrito(idProducto);
    
    const prodInfo = productosCache.find(p => p.id_producto === idProducto);
    if(cant > prodInfo.stock_disponible) return alert(`Solo hay ${prodInfo.stock_disponible} en stock.`);
    
    const item = carritoProductos.find(i => i.id_producto === idProducto);
    if(item) item.cantidad = cant;
    
    actualizarVistaCarrito();
}

function eliminarDelCarrito(idProducto) {
    carritoProductos = carritoProductos.filter(i => i.id_producto !== idProducto);
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
        const subtotal = i.precio_unitario * i.cantidad;
        total += subtotal;
        
        cont.innerHTML += `
            <div class="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                <div class="d-flex align-items-center gap-3 w-100">
                    <img src="${i.imagen}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                    <div style="flex-grow: 1;">
                        <span class="fw-bold d-block text-dark mb-1">${i.nombre}</span>
                        <div class="d-flex align-items-center">
                            <button onclick="cambiarCantidadCarrito(${i.id_producto}, ${i.cantidad - 1})" class="btn btn-sm btn-outline-secondary px-2 py-0">-</button>
                            <input type="number" class="form-control form-control-sm text-center mx-1" style="width: 50px;" value="${i.cantidad}" readonly>
                            <button onclick="cambiarCantidadCarrito(${i.id_producto}, ${i.cantidad + 1})" class="btn btn-sm btn-outline-secondary px-2 py-0">+</button>
                        </div>
                    </div>
                </div>
                <div class="text-end d-flex flex-column align-items-end h-100">
                    <button onclick="eliminarDelCarrito(${i.id_producto})" class="btn text-danger p-0 fw-bold fs-5 mb-2" style="background:none; border:none;">&times;</button>
                    <span class="fw-bold text-dark">Q. ${subtotal.toFixed(2)}</span>
                </div>
            </div>`;
    });
    document.getElementById('total-carrito').innerText = `Q. ${total.toFixed(2)}`;
}

function prepararPasoCompraEntrega() {
    if(carritoProductos.length === 0) return alert("El carrito está vacío");
    
    // Si estamos editando un pedido existente, nos saltamos la pantalla de domicilio/kiosco
    if (pedidoAEditar) {
        modoActual = 'COMPRA_AGREGAR';
        document.getElementById('seccion-panel').classList.add('oculto');
        mostrarResumenPedido(); 
    } else {
        modoActual = 'COMPRA';
        document.getElementById('seccion-panel').classList.add('oculto');
        document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
    }
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
// 6. FLUJO DE ENTREGA Y RESUMEN FINAL
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
    if (modoActual !== 'COMPRA_AGREGAR') {
        if(metodoEntregaSeleccionado === 'Domicilio') {
            ubicacionFinal = document.getElementById('input-direccion-entrega').value.trim();
            if(!ubicacionFinal) return alert("Por favor, ingrese su dirección exacta.");
        } else {
            ubicacionFinal = document.getElementById('select-kiosco-entrega').value;
        }
        document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
    }

    document.getElementById('seccion-resumen-pedido').classList.remove('oculto');

    const listaItems = document.getElementById('lista-resumen-items');
    const valorTotal = document.getElementById('valor-total-resumen');
    listaItems.innerHTML = '';
    let total = 0;

    if (modoActual === 'COMPRA' || modoActual === 'COMPRA_AGREGAR') {
        
        // Ajustes visuales si es un anexo de orden
        if (modoActual === 'COMPRA_AGREGAR') {
            document.getElementById('resumen-tipo-op').innerText = `Agregando al Pedido ${tokenPedidoAEditar}`;
            document.getElementById('resumen-metodo-entrega').innerText = 'Método Original Conservado';
            document.getElementById('resumen-pago').innerText = 'Efectivo';
        } else {
            document.getElementById('resumen-tipo-op').innerText = 'Adquisición de Insumos';
            document.getElementById('resumen-metodo-entrega').innerText = metodoEntregaSeleccionado;
            document.getElementById('resumen-pago').innerText = 'Efectivo contra entrega';
        }

        carritoProductos.forEach(i => {
            const sub = i.precio_unitario * i.cantidad;
            total += sub;
            listaItems.innerHTML += `
                <div class="d-flex justify-content-between mb-2 pb-1 border-bottom">
                    <span>${i.cantidad}x ${i.nombre}</span>
                    <span class="fw-bold">Q. ${sub.toFixed(2)}</span>
                </div>`;
        });
        
        if(modoActual === 'COMPRA_AGREGAR') {
            listaItems.innerHTML += `
                <div class="d-flex justify-content-between mt-2 pt-2 border-top">
                    <span class="fw-bold text-dark">🚚 Costo de Envío</span>
                    <span class="fw-bold text-success">Ya cubierto en orden original</span>
                </div>`;
        } else if(metodoEntregaSeleccionado === 'Domicilio') {
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
        document.getElementById('resumen-tipo-op').innerText = 'Ofrecimiento de Cosecha';
        document.getElementById('resumen-metodo-entrega').innerText = metodoEntregaSeleccionado;
        carritoVentas.forEach(i => {
            const sub = i.precio * i.cantidad;
            total += sub;
            listaItems.innerHTML += `<div class="d-flex justify-content-between mb-2 pb-1 border-bottom"><span>${i.cantidad}x ${i.nombre}</span><span class="text-success fw-bold">~ Q. ${sub.toFixed(2)}</span></div>`;
        });
        valorTotal.innerText = `~ Q. ${total.toFixed(2)}`;
    }
}

function regresarDesdeResumen() {
    document.getElementById('seccion-resumen-pedido').classList.add('oculto');
    if (modoActual === 'COMPRA_AGREGAR') {
        irAlCarritoPestaña(); // Regresa al carrito directo
    } else {
        document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
    }
}

async function confirmarFlujoFinal() {
    document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-info py-2 text-center small fw-bold">Procesando de forma segura...</div>';

    let payload, endpoint;

    if (modoActual === 'COMPRA_AGREGAR') {
        payload = { id_pedido: pedidoAEditar, carrito: carritoProductos };
        endpoint = '/api/agregar-a-pedido';
    } else if (modoActual === 'COMPRA') {
        payload = { id_cliente: usuarioActual.id_cliente, tipo_entrega: metodoEntregaSeleccionado, metodo_pago: 'Efectivo', carrito: carritoProductos, ubicacion_especifica: ubicacionFinal };
        endpoint = '/api/checkout';
    } else {
        const productosVentaPayload = carritoVentas.map(item => ({ id_producto: item.id_producto, cantidad_ofrecida: item.cantidad }));
        payload = { id_cliente: usuarioActual.id_cliente, kiosco_entrega: ubicacionFinal, metodo_recepcion: metodoEntregaSeleccionado, productos: productosVentaPayload };
        endpoint = '/api/vender';
    }
    
    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(res.ok) {
            document.getElementById('seccion-resumen-pedido').classList.add('oculto');
            document.getElementById('seccion-compra-exitosa').classList.remove('oculto');
            
            if (modoActual === 'COMPRA_AGREGAR') {
                document.getElementById('titulo-exito').innerText = 'Insumos anexados con éxito';
                document.getElementById('token-exito').innerText = tokenPedidoAEditar;
                pedidoAEditar = null; tokenPedidoAEditar = '';
            } else {
                document.getElementById('titulo-exito').innerText = 'Procesado con éxito';
                document.getElementById('token-exito').innerText = data.token;
            }
            
            carritoProductos = []; carritoVentas = [];
            document.getElementById('alerta-resumen').innerHTML = '';
        } else { 
            document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2 text-center small">Error al procesar. Verifica inventario.</div>'; 
        }
    } catch(e) { document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2 text-center small">Error de red.</div>'; }
}

function regresarAlMenuDesdeExito() {
    document.getElementById('seccion-compra-exitosa').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
    document.getElementById('titulo-exito').innerText = 'Procesado con éxito'; // Reseteo de titulo
    window.scrollTo(0, 0);
}
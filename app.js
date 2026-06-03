const API_URL = 'https://api-esperanza-backend.onrender.com';
let usuarioActual = null;
let modoActual = ''; 
let metodoEntregaSeleccionado = 'Domicilio';
let carritoProductos = []; 
let carritoVentas = [];    
let productosCache = [];   

// ==========================================
// FUNCIÓN MÁGICA DE IMÁGENES
// ==========================================
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
    // Imagen por defecto si es un producto nuevo
    return 'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=400&auto=format&fit=crop'; 
}

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
    
    // AQUÍ ARREGLAMOS EL BUG: Nos aseguramos de ocultar todo antes de abrir la nueva pestaña
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
// 2. SISTEMA DE RASTREO Y EDICIÓN
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
// 3. COMPRAS (AHORA CON IMÁGENES)
// ==========================================
async function cargarCatalogo() {
    const contenedor = document.getElementById('catalogo-productos');
    const respuesta = await fetch(`${API_URL}/api/productos`);
    productosCache = await respuesta.json();
    contenedor.innerHTML = '';
    productosCache.forEach(prod => {
        const imgUrl = obtenerImagen(prod.nombre); // Llamamos a la magia
        
        contenedor.innerHTML += `
            <div class="col-6 col-md-4">
                <div class="card-custom h-100 shadow-sm overflow-hidden d-flex flex-column">
                    <img src="${imgUrl}" class="w-100" style="height: 120px; object-fit: cover;" alt="${prod.nombre}">
                    <div class="p-3 d-flex flex-column flex-grow-1">
                        <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">${prod.nombre}</h6>
                        <p class="text-success fw-bold mb-1">Q. ${parseFloat(prod.precio_unitario).toFixed(2)}</p>
                        <p class="small text-muted mb-2">Stock: ${prod.stock_disponible}</p>
                        <div class="mt-auto">
                            <input type="number" id="cant-${prod.id_producto}" class="form-control form-control-sm mb-2" value="1" min="1">
                            <button onclick="agregarAlCarrito(${prod.id_producto})" class="btn btn-sm btn-success w-100 fw-bold">Comprar</button>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

function agregarAlCarrito(id) {
    const cant = parseInt(document.getElementById(`cant-${id}`).value);
    const prod = productosCache.find(p => p.id_producto === id);
    const item = carritoProductos.find(i => i.id_producto === id);
    if(item) item.cantidad += cant;
    else carritoProductos.push({ ...prod, cantidad: cant, imagen: obtenerImagen(prod.nombre) });
    document.getElementById('badge-flotante-conteo').innerText = carritoProductos.length;
    
    // Pequeña animación visual para saber que se agregó
    const btnFlotante = document.getElementById('btn-flotante-ver-carrito');
    btnFlotante.style.transform = 'scale(1.2)';
    setTimeout(() => btnFlotante.style.transform = 'scale(1)', 200);
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
        cont.innerHTML += `
            <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                <div class="d-flex align-items-center gap-2">
                    <img src="${i.imagen}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
                    <span class="small"><span class="text-muted">${i.cantidad}x</span> <span class="fw-bold">${i.nombre}</span></span>
                </div>
                <span class="fw-bold text-dark">Q. ${(i.precio_unitario * i.cantidad).toFixed(2)}</span>
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
    if(carritoProductos.length === 0) return alert("El carrito está vacío");
    modoActual = 'COMPRA';
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

// ==========================================
// 4. VENTAS (AHORA CON PRECIOS APROXIMADOS)
// ==========================================
function inicializarFormularioVentas() {
    const sel = document.getElementById('venta-producto');
    sel.innerHTML = '<option value="" disabled selected>-- Elige un producto --</option>';
    productosCache.forEach(p => {
        // Le agregamos el precio unitario como referencia (data-precio)
        sel.innerHTML += `<option value="${p.id_producto}" data-precio="${p.precio_unitario}">${p.nombre} (Aprox: Q. ${p.precio_unitario})</option>`;
    });
}

function agregarProductoALaVenta() {
    const select = document.getElementById('venta-producto');
    const id = select.value;
    const cant = document.getElementById('venta-cantidad').value;
    
    if(!id || !cant || cant <= 0) return alert("Selecciona un producto y cantidad válida");
    
    const option = select.options[select.selectedIndex];
    const precio = parseFloat(option.getAttribute('data-precio'));
    const nombreLimpio = option.text.split(' (')[0]; // Quitamos el texto del precio para que se vea limpio
    const subtotal = precio * cant;

    carritoVentas.push({ id_producto: id, cantidad: cant, nombre: nombreLimpio, precio: precio, imagen: obtenerImagen(nombreLimpio) });
    
    document.getElementById('lista-productos-venta').innerHTML += `
        <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
            <span class="small">✅ <span class="fw-bold">${cant}x</span> ${nombreLimpio}</span>
            <span class="small text-success fw-bold">~ Q. ${subtotal.toFixed(2)}</span>
        </div>`;
        
    document.getElementById('venta-cantidad').value = '';
    select.selectedIndex = 0;
}

function procesarPasoVentaUno() {
    if(carritoVentas.length === 0) return alert("Agrega al menos un producto a tu lista de ventas.");
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
// 5. FLUJO DE RESUMEN Y CONFIRMACIÓN
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
            listaItems.innerHTML += `
                <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-light">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${i.imagen}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">
                        <span><span class="text-muted">${i.cantidad}x</span> <span class="fw-bold">${i.nombre}</span></span>
                    </div>
                    <span class="fw-bold text-dark">Q. ${sub.toFixed(2)}</span>
                </div>`;
        });
        valorTotal.innerText = `Q. ${total.toFixed(2)}`;
        valorTotal.className = 'text-success fw-bold fs-4';
    } else {
        document.getElementById('resumen-tipo-op').innerText = 'Ofrecimiento de Cosecha';
        document.getElementById('resumen-pago').innerText = 'Pago sujeto a calidad en Kiosco';
        labelTotal.innerText = 'Ganancia Estimada:';

        carritoVentas.forEach(i => {
            const sub = i.precio * i.cantidad;
            total += sub;
            listaItems.innerHTML += `
                <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-light">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${i.imagen}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">
                        <span><span class="text-muted">${i.cantidad}x</span> <span class="fw-bold">${i.nombre}</span></span>
                    </div>
                    <span class="fw-bold text-success">~ Q. ${sub.toFixed(2)}</span>
                </div>`;
        });
        valorTotal.innerText = `~ Q. ${total.toFixed(2)}`;
        valorTotal.className = 'text-primary fw-bold fs-5';
    }
}

function regresarDesdeResumen() {
    document.getElementById('seccion-resumen-pedido').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

async function confirmarFlujoFinal() {
    document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-info py-2 text-center small fw-bold">Procesando orden de forma segura... ⏳</div>';

    // 1. Traducimos la variable al nombre exacto que espera tu Base de Datos
    const productosVentaPayload = carritoVentas.map(item => ({
        id_producto: item.id_producto,
        cantidad_ofrecida: item.cantidad
    }));

    // 2. Rescatamos el kiosco que el usuario seleccionó
    const kioscoSeleccionado = document.getElementById('venta-kiosco').value || 'Kiosco Central';

    // 3. Armamos el paquete de datos correcto
    const payload = modoActual === 'COMPRA' ? 
        { id_cliente: usuarioActual.id_cliente, tipo_entrega: metodoEntregaSeleccionado, metodo_pago: 'Efectivo', carrito: carritoProductos } :
        { id_cliente: usuarioActual.id_cliente, kiosco_entrega: kioscoSeleccionado, metodo_recepcion: metodoEntregaSeleccionado, productos: productosVentaPayload };
    
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
            document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2 text-center small">No se pudo procesar. Hubo un error en el servidor.</div>';
        }
    } catch(e) { 
        document.getElementById('alerta-resumen').innerHTML = '<div class="alert alert-danger py-2 text-center small">Error de red.</div>'; 
    }
}
// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const API_URL = 'https://api-esperanza-backend.onrender.com';

let usuarioActual = null;
let modoActual = ''; // 'COMPRA' o 'VENTA'
let metodoEntregaSeleccionado = 'Domicilio';

// Estructuras de almacenamiento en memoria
let carritoProductos = []; // Carrito para COMPRAS
let carritoVentas = [];    // NUEVO: Carrito para VENTAS (Multiproducto)
let productosCache = [];   // Catálogo extraído del servidor

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN (LOGIN / LOGOUT)
// ==========================================
async function iniciarSesion() {
    const correo = document.getElementById('login-correo').value;
    const password = document.getElementById('login-pass').value;
    const alerta = document.getElementById('alerta-login');

    if (!correo || !password) {
        alerta.innerHTML = '<div class="alert alert-warning py-2 small">Por favor, completa todos los campos.</div>';
        return;
    }

    alerta.innerHTML = '<div class="alert alert-info py-2 small">Verificando credenciales...</div>';

    try {
        const respuesta = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });
        
        const data = await respuesta.json();

        if (respuesta.ok && data.exito) {
            usuarioActual = data.usuario;
            
            document.getElementById('nombre-usuario').innerText = `Hola, ${usuarioActual.nombre}`;
            document.getElementById('nav-usuario').classList.remove('oculto');
            
            document.getElementById('seccion-login').classList.add('oculto');
            document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
            
            cargarCatalogo();
            inicializarFormularioVentas(); // Prepara el select dinámico de ventas
        } else {
            alerta.innerHTML = `<div class="alert alert-danger py-2 small">${data.error || 'Credenciales incorrectas.'}</div>`;
        }
    } catch (error) {
        alerta.innerHTML = '<div class="alert alert-danger py-2 small">Error de conexión con el servidor.</div>';
    }
}

function cerrarSesion() {
    usuarioActual = null;
    carritoProductos = [];
    carritoVentas = [];
    productosCache = [];
    
    // Resetear visibilidad de vistas
    document.getElementById('nav-usuario').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
    document.getElementById('seccion-compra-exitosa').classList.add('oculto');
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('btn-flotante-ver-carrito').classList.add('oculto');
    
    // Mostrar Login y limpiar inputs
    document.getElementById('seccion-login').classList.remove('oculto');
    document.getElementById('login-correo').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('alerta-login').innerHTML = '';
    
    actualizarVistaCarrito();
    actualizarVistaCarritoVentas();
}

// ==========================================
// 2. NAVEGACIÓN Y MENÚ PRINCIPAL
// ==========================================
function seleccionarActividad(actividad) {
    document.getElementById('seccion-seleccion-actividad').classList.add('oculto');
    document.getElementById('seccion-panel').classList.remove('oculto');

    if (actividad === 'comprar') {
        document.getElementById('tab-comprar').classList.remove('oculto');
        document.getElementById('tab-vender').classList.add('oculto');
        document.getElementById('tab-carrito-pantalla-aparte').classList.add('oculto');
        document.getElementById('bloque-regresar-menu').classList.remove('oculto');
        document.getElementById('btn-flotante-ver-carrito').classList.remove('oculto');
    } else if (actividad === 'vender') {
        document.getElementById('tab-vender').classList.remove('oculto');
        document.getElementById('tab-comprar').classList.add('oculto');
        document.getElementById('tab-carrito-pantalla-aparte').classList.add('oculto');
        document.getElementById('btn-flotante-ver-carrito').classList.add('oculto');
        document.getElementById('bloque-regresar-menu').classList.remove('oculto');
        actualizarVistaCarritoVentas();
    }
}

function regresarAlMenu() {
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('btn-flotante-ver-carrito').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');
}

// ==========================================
// 3. GESTIÓN DEL CATÁLOGO DE PRODUCTOS (COMPRAS)
// ==========================================
async function cargarCatalogo() {
    const contenedor = document.getElementById('catalogo-productos');
    if (!contenedor) return;

    try {
        const respuesta = await fetch(`${API_URL}/api/productos`);
        productosCache = await respuesta.json();
        contenedor.innerHTML = ''; 

        if (productosCache.length === 0) {
            contenedor.innerHTML = '<p class="text-muted small text-center w-100">No hay productos disponibles en este momento.</p>';
            return;
        }

        productosCache.forEach(prod => {
            contenedor.innerHTML += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card-custom p-3 h-100 d-flex flex-column justify-content-between shadow-sm">
                        <div>
                            <h6 class="fw-bold mb-1" style="color: var(--color-principal); font-size: 1rem;">${prod.nombre}</h6>
                            <p class="text-success fw-bold mb-2" style="font-size: 1.1rem;">Q. ${parseFloat(prod.precio_unitario).toFixed(2)}</p>
                            <span class="badge bg-secondary producto-tag mb-3">Stock: ${prod.stock_disponible}</span>
                        </div>
                        <div class="input-group input-group-sm">
                            <input type="number" id="cant-${prod.id_producto}" class="form-control form-control-custom" value="1" min="1" max="${prod.stock_disponible}">
                            <button onclick="agregarAlCarrito(${prod.id_producto})" class="btn-principal py-1 px-3 fs-7" style="background-color: #1b4332;">Adquirir Insumo</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Sincronizar el selector de la pestaña vender por si ya cargó la caché
        inicializarFormularioVentas();
    } catch (error) {
        contenedor.innerHTML = '<p class="text-danger small text-center w-100">Error al actualizar catálogo.</p>';
    }
}

function agregarAlCarrito(idProducto) {
    const cantidadInput = document.getElementById(`cant-${idProducto}`);
    const cantidad = parseInt(cantidadInput.value);
    
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }

    const productoInfo = productosCache.find(p => p.id_producto === idProducto);
    if (!productoInfo) return;

    if (cantidad > productoInfo.stock_disponible) {
        alert(`No puedes agregar más del stock disponible (${productoInfo.stock_disponible}).`);
        return;
    }

    const itemExistente = carritoProductos.find(item => item.id_producto === idProducto);
    if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + cantidad;
        if (nuevaCantidad > productoInfo.stock_disponible) {
            alert(`La cantidad total en el carrito excede el stock disponible.`);
            return;
        }
        itemExistente.cantidad = nuevaCantidad;
    } else {
        carritoProductos.push({
            id_producto: idProducto,
            nombre: productoInfo.nombre,
            precio: parseFloat(productoInfo.precio_unitario),
            cantidad: cantidad
        });
    }

    cantidadInput.value = 1;
    actualizarVistaCarrito();
}

function eliminarDelCarrito(idProducto) {
    carritoProductos = carritoProductos.filter(item => item.id_producto !== idProducto);
    actualizarVistaCarrito();
}

// ==========================================
// 4. FLUJO DE COMPRAS: VISTA EXCLUSIVA DEL CARRITO
// ==========================================
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
    document.getElementById('bloque-regresar-menu').classList.remove('oculto');
    document.getElementById('btn-flotante-ver-carrito').classList.remove('oculto');
}

function actualizarVistaCarrito() {
    const contenedorVisual = document.getElementById('items-carrito-visual');
    const totalSpan = document.getElementById('total-carrito');
    const subtotalSpan = document.getElementById('carrito-subtotal');
    const badgeArticulos = document.getElementById('badge-total-articulos');
    const badgeFlotante = document.getElementById('badge-flotante-conteo');
    
    let totalAcumulado = 0;
    let conteoArticulos = 0;

    carritoProductos.forEach(item => {
        totalAcumulado += item.precio * item.cantidad;
        conteoArticulos += item.cantidad;
    });

    if (badgeFlotante) badgeFlotante.innerText = conteoArticulos;

    if (carritoProductos.length === 0) {
        if (contenedorVisual) {
            contenedorVisual.innerHTML = `
                <div class="text-center py-5 text-muted small">
                    🛒 Tu carrito está vacío.<br>Regresa al catálogo para agregar insumos.
                </div>`;
        }
        if (totalSpan) totalSpan.innerText = "Q. 0.00";
        if (subtotalSpan) subtotalSpan.innerText = "Q. 0.00";
        if (badgeArticulos) badgeArticulos.innerText = "0 artículos";
        return;
    }

    if (!contenedorVisual) return;
    contenedorVisual.innerHTML = '';

    carritoProductos.forEach(item => {
        const subtotal = item.precio * item.cantidad;

        let urlImagenPlaceholder = "https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=120&auto=format&fit=crop"; 
        if (item.nombre.toLowerCase().includes('tomate')) urlImagenPlaceholder = "https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=120&auto=format&fit=crop";
        if (item.nombre.toLowerCase().includes('frijol')) urlImagenPlaceholder = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=120&auto=format&fit=crop";

        contenedorVisual.innerHTML += `
            <div class="d-flex align-items-start justify-content-between mb-3 bg-light p-3 shadow-sm" style="border-radius: 12px; position: relative; border: 1px solid #e9ecef;">
                <div class="d-flex align-items-center gap-3">
                    <div style="position: relative; width: 58px; height: 58px; flex-shrink: 0;">
                        <img src="${urlImagenPlaceholder}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" alt="${item.nombre}">
                        <span class="badge rounded-circle bg-secondary d-flex align-items-center justify-content-center" 
                              style="position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; font-size: 0.75rem; padding: 0; border: 2px solid #ffffff;">
                            ${item.cantidad}
                        </span>
                    </div>
                    
                    <div style="line-height: 1.3;">
                        <span class="d-block fw-bold text-dark mb-1" style="font-size: 0.95rem;">
                            ${item.nombre}
                        </span>
                        <span class="text-muted d-block" style="font-size: 0.8rem;">Precio u: Q. ${item.precio.toFixed(2)}</span>
                        <span class="text-success d-inline-block mt-1" style="font-size: 0.75rem; font-weight: 500; background: #e8f5e9; padding: 1px 6px; border-radius: 4px;">⚡ Entrega rápida</span>
                    </div>
                </div>

                <div class="text-end d-flex flex-column justify-content-between align-items-end" style="height: 58px;">
                    <button class="btn-eliminar-item m-0 p-0" onclick="eliminarDelCarrito(${item.id_producto})" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#dc3545;">&times;</button>
                    <span class="fw-bold text-dark" style="font-size: 0.95rem;">Q. ${subtotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    });

    if (badgeArticulos) badgeArticulos.innerText = `${conteoArticulos} ${conteoArticulos === 1 ? 'artículo' : 'artículos'}`;
    if (subtotalSpan) subtotalSpan.innerText = `Q. ${totalAcumulado.toFixed(2)}`;
    if (totalSpan) totalSpan.innerText = `Q. ${totalAcumulado.toFixed(2)}`;
}

function ponerAlertaCompra(html) {
    const alerta = document.getElementById('alerta-compra');
    if (alerta) alerta.innerHTML = html;
}

function prepararPasoCompraEntrega() {
    if (!usuarioActual) return alert("Debes iniciar sesión primero.");
    
    if (carritoProductos.length === 0) {
        ponerAlertaCompra('<div class="alert alert-warning py-2 small">⚠️ El carrito está vacío. Agrega productos para continuar.</div>');
        return;
    }
    
    ponerAlertaCompra('');
    modoActual = 'COMPRA';
    
    const btnRegresar = document.getElementById('btn-regresar-entrega');
    if (btnRegresar) btnRegresar.innerText = "← Modificar mi Carrito";

    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

// ==========================================
// 5. NUEVO: FLUJO DE VENTAS MULTIPRODUCTO Y GANANCIAS ESTIMADAS
// ==========================================

// Rellena el select de productos en base a la base de datos de manera dinámica
function inicializarFormularioVentas() {
    const selectProducto = document.getElementById('venta-producto');
    if (!selectProducto || productosCache.length === 0) return;

    selectProducto.innerHTML = '<option value="" disabled selected>Seleccione un insumo/cosecha...</option>';
    productosCache.forEach(p => {
        // Usamos precio_compra si existe en tu DB, si no, usa precio_unitario por defecto
        const precioTasa = p.precio_compra || p.precio_unitario || 0;
        selectProducto.innerHTML += `<option value="${p.id_producto}" data-precio="${precioTasa}">${p.nombre} (Aprox: Q.${parseFloat(precioTasa).toFixed(2)})</option>`;
    });
}

// Agrega productos seleccionados al listado/carrito de ventas
function agregarProductoALaVenta() {
    const selectProducto = document.getElementById('venta-producto');
    const cantidadInput = document.getElementById('venta-cantidad');
    const alertaVenta = document.getElementById('alerta-venta');

    if (!selectProducto.value || !cantidadInput.value || parseInt(cantidadInput.value) <= 0) {
        alertaVenta.innerHTML = '<div class="alert alert-warning py-2 small">Seleccione un producto y digite una cantidad válida.</div>';
        return;
    }

    const idProducto = parseInt(selectProducto.value);
    const cantidad = parseInt(cantidadInput.value);
    const optionSeleccionada = selectProducto.options[selectProducto.selectedIndex];
    const nombreProducto = optionSeleccionada.text.split(' (')[0];
    const precioCompra = parseFloat(optionSeleccionada.getAttribute('data-precio'));

    const itemExistente = carritoVentas.find(item => item.id_producto === idProducto);
    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carritoVentas.push({
            id_producto: idProducto,
            nombre: nombreProducto,
            precio: precioCompra,
            cantidad: cantidad
        });
    }

    // Resetear inputs del formulario individual
    cantidadInput.value = '';
    selectProducto.selectedIndex = 0;
    alertaVenta.innerHTML = '';

    actualizarVistaCarritoVentas();
}

function eliminarDeLaVenta(idProducto) {
    carritoVentas = carritoVentas.filter(item => item.id_producto !== idProducto);
    actualizarVistaCarritoVentas();
}

// Renderiza los múltiples productos que el cliente desea vender y calcula su ganancia estimada
function actualizarVistaCarritoVentas() {
    const contenedorVentas = document.getElementById('lista-productos-venta');
    const gananciaTotalSpan = document.getElementById('ganancia-total-estimada');
    
    if (!contenedorVentas) return;
    contenedorVentas.innerHTML = '';

    let gananciaAcumulada = 0;

    if (carritoVentas.length === 0) {
        contenedorVentas.innerHTML = '<div class="text-center py-3 text-muted small">No ha agregado productos para vender todavía.</div>';
        if (gananciaTotalSpan) gananciaTotalSpan.innerText = "Q. 0.00";
        return;
    }

    carritoVentas.forEach(item => {
        const subtotalGanancia = item.precio * item.cantidad;
        gananciaAcumulada += subtotalGanancia;

        contenedorVentas.innerHTML += `
            <div class="d-flex justify-content-between align-items-center bg-white p-2 mb-2 shadow-sm visual-item-venta" style="border-radius: 8px; border-left: 4px solid #1b4332;">
                <div>
                    <span class="fw-bold text-dark small d-block">${item.nombre}</span>
                    <span class="text-muted extra-small" style="font-size: 0.75rem;">Cant: ${item.cantidad} x Q.${item.precio.toFixed(2)}</span>
                </div>
                <div class="text-end d-flex align-items-center gap-2">
                    <span class="fw-bold text-success small">Q. ${subtotalGanancia.toFixed(2)}</span>
                    <button onclick="eliminarDeLaVenta(${item.id_producto})" class="btn text-danger p-0 m-0 fw-bold" style="border:none; background:none;">&times;</button>
                </div>
            </div>
        `;
    });

    if (gananciaTotalSpan) {
        gananciaTotalSpan.innerText = `Q. ${gananciaAcumulada.toFixed(2)}`;
    }
}

// Valida el set multiproducto de ventas y da paso a la pantalla de selección de Kiosco/Entrega
function procesarPasoVentaUno() {
    if (!usuarioActual) return alert("Debes iniciar sesión primero.");
    const alerta = document.getElementById('alerta-venta');

    if (carritoVentas.length === 0) {
        alerta.innerHTML = '<div class="alert alert-warning py-2 small mb-3">Por favor agregue al menos un producto a la lista para vender.</div>';
        return;
    }

    const kiosco = document.getElementById('venta-kiosco').value;
    if (!kiosco) {
        alerta.innerHTML = '<div class="alert alert-warning py-2 small mb-3">Por favor seleccione el kiosco donde entregará su carga.</div>';
        return;
    }

    alerta.innerHTML = '';
    modoActual = 'VENTA';
    
    const btnRegresar = document.getElementById('btn-regresar-entrega');
    if (btnRegresar) btnRegresar.innerText = "← Modificar lista de cosecha";

    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-tipo-entrega-venta').classList.remove('oculto');
}

// ==========================================
// 6. CONTROL DE MÉTODOS DE ENTREGA Y CHECKOUT
// ==========================================
function seleccionarMetodoEntregaVenta(metodo) {
    metodoEntregaSeleccionado = metodo;
    const divDomicilio = document.getElementById('opcion-domicilio');
    const divPuntoVenta = document.getElementById('opcion-puntoventa');

    if (metodo === 'Domicilio') {
        if (divDomicilio) divDomicilio.classList.add('seleccionada');
        if (divPuntoVenta) divPuntoVenta.classList.remove('seleccionada');
    } else {
        if (divPuntoVenta) divPuntoVenta.classList.add('seleccionada');
        if (divDomicilio) divDomicilio.classList.remove('seleccionada');
    }
}

function confirmarFlujoFinal() {
    if (modoActual === 'COMPRA') {
        ejecutarCompraFinal();
    } else if (modoActual === 'VENTA') {
        ejecutarVentaFinal();
    }
}

async function ejecutarCompraFinal() {
    const alertaEntrega = document.getElementById('alerta-entrega-venta');
    alertaEntrega.innerHTML = '<div class="text-info small mb-2">Procesando orden de compra...</div>';

    const tipoEntregaFinal = (metodoEntregaSeleccionado === 'Domicilio') ? 'A Domicilio' : 'Retiro en Kiosco';
    const metodoPago = document.getElementById('metodo-pago').value;

    const carritoPayload = carritoProductos.map(item => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad
    }));

    try {
        const respuesta = await fetch(`${API_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_cliente: usuarioActual.id_cliente,
                tipo_entrega: tipoEntregaFinal,
                metodo_pago: metodoPago,
                total: 0, 
                carrito: carritoPayload
            })
        });
        
        const data = await respuesta.json();
        
        if (respuesta.ok) {
            document.getElementById('titulo-exito').innerText = "Su pedido ha sido procesado";
            document.getElementById('descripcion-exito').innerText = "Presente el siguiente código en el Kiosco seleccionado para retirar sus productos:";
            document.getElementById('token-exito').innerText = data.token || "CH-ORDER";
            
            alertaEntrega.innerHTML = '';
            carritoProductos = []; 
            actualizarVistaCarrito();

            document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
            document.getElementById('seccion-compra-exitosa').classList.remove('oculto');
            cargarCatalogo();
        } else {
            alertaEntrega.innerHTML = `<div class="text-danger small mb-2">${data.error || 'No se pudo procesar la compra.'}</div>`;
        }
    } catch (error) {
        alertaEntrega.innerHTML = '<div class="text-danger small mb-2">Error de red en la transacción.</div>';
    }
}

async function ejecutarVentaFinal() {
    const kiosco = document.getElementById('venta-kiosco').value;
    const alertaEntrega = document.getElementById('alerta-entrega-venta');

    alertaEntrega.innerHTML = '<div class="text-info small mb-2">Registrando oferta de cosecha...</div>';

    // NUEVO PAYLOAD: Mapeamos la lista completa de productos ofrecidos
    const listaVentasPayload = carritoVentas.map(item => ({
        id_producto: item.id_producto,
        cantidad_ofrecida: item.cantidad
    }));

    try {
        const respuesta = await fetch(`${API_URL}/api/vender`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_cliente: usuarioActual.id_cliente,
                kiosco_entrega: kiosco,
                metodo_recepcion: metodoEntregaSeleccionado,
                productos: listaVentasPayload // Enviamos el array completo al Backend multiproducto
            })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            document.getElementById('titulo-exito').innerText = "¡Venta Registrada Exitosamente!";
            document.getElementById('descripcion-exito').innerText = 
                `Presente el siguiente código al entregar su cosecha en el ${kiosco} para validar las condiciones físicas de los productos y procesar su pago respectivo:`;
            document.getElementById('token-exito').innerText = data.token || "VN-SHIELD";

            alertaEntrega.innerHTML = '';
            carritoVentas = []; // Limpiamos la lista de ventas procesada
            actualizarVistaCarritoVentas();

            document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
            document.getElementById('seccion-compra-exitosa').classList.remove('oculto');
        } else {
            alertaEntrega.innerHTML = `<div class="text-danger small mb-2">${data.error || 'No se pudo registrar la venta.'}</div>`;
        }
    } catch (error) {
        alertaEntrega.innerHTML = '<div class="text-danger small mb-2">Error de conexión con Render API.</div>';
    }
}

function regresarDesdeEntrega() {
    document.getElementById('seccion-tipo-entrega-venta').classList.add('oculto');
    document.getElementById('seccion-panel').classList.remove('oculto');
    
    if (modoActual === 'COMPRA') {
        document.getElementById('tab-carrito-pantalla-aparte').classList.remove('oculto');
        document.getElementById('tab-comprar').classList.add('oculto');
    } else {
        document.getElementById('tab-vender').classList.remove('oculto');
        document.getElementById('bloque-regresar-menu').classList.remove('oculto');
    }
}

function regresarAlMenuDesdeExito() {
    document.getElementById('seccion-compra-exitosa').classList.add('oculto');
    document.getElementById('seccion-seleccion-actividad').classList.remove('oculto');

    // Limpieza de campos base del formulario de venta
    document.getElementById('venta-kiosco').selectedIndex = 0;
    
    const alertaVenta = document.getElementById('alerta-venta');
    if (alertaVenta) alertaVenta.innerHTML = '';
}
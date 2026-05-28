// URL de tu API en Render
const API_URL = 'https://api-esperanza-backend.onrender.com';

// Variable global para guardar los datos del cliente logueado
let usuarioActual = null;

// ==========================================
// 1. SISTEMA DE LOGIN
// ==========================================
async function iniciarSesion() {
    const correo = document.getElementById('login-correo').value;
    const password = document.getElementById('login-pass').value;
    const alerta = document.getElementById('alerta-login');

    alerta.innerHTML = '<div class="alert alert-info">Verificando credenciales...</div>';

    try {
        const respuesta = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });
        
        const data = await respuesta.json();

        if (respuesta.ok && data.exito) {
            usuarioActual = data.usuario;
            // Mostrar nombre y ocultar login
            document.getElementById('nombre-usuario').innerText = `Hola, ${usuarioActual.nombre}`;
            document.getElementById('nav-usuario').classList.remove('oculto');
            document.getElementById('seccion-login').classList.add('oculto');
            document.getElementById('seccion-panel').classList.remove('oculto');
            
            cargarCatalogo(); // Cargar productos al entrar
        } else {
            alerta.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        }
    } catch (error) {
        alerta.innerHTML = '<div class="alert alert-danger">Error de conexión con el servidor.</div>';
    }
}

function cerrarSesion() {
    usuarioActual = null;
    document.getElementById('nav-usuario').classList.add('oculto');
    document.getElementById('seccion-panel').classList.add('oculto');
    document.getElementById('seccion-login').classList.remove('oculto');
    document.getElementById('login-pass').value = '';
    document.getElementById('alerta-login').innerHTML = '';
}

// ==========================================
// 2. NAVEGACIÓN ENTRE PESTAÑAS
// ==========================================
function cambiarTab(tab) {
    document.getElementById('tab-comprar').classList.add('oculto');
    document.getElementById('tab-vender').classList.add('oculto');
    document.getElementById('btn-tab-comprar').classList.remove('active', 'bg-success', 'text-white');
    document.getElementById('btn-tab-vender').classList.remove('active', 'bg-success', 'text-white');

    if(tab === 'comprar') {
        document.getElementById('tab-comprar').classList.remove('oculto');
        document.getElementById('btn-tab-comprar').classList.add('active', 'bg-success', 'text-white');
    } else {
        document.getElementById('tab-vender').classList.remove('oculto');
        document.getElementById('btn-tab-vender').classList.add('active', 'bg-success', 'text-white');
    }
}

// ==========================================
// 3. CATÁLOGO Y COMPRA
// ==========================================
async function cargarCatalogo() {
    try {
        const respuesta = await fetch(`${API_URL}/api/productos`);
        const productos = await respuesta.json();
        const contenedor = document.getElementById('catalogo-productos');
        contenedor.innerHTML = ''; 

        productos.forEach(prod => {
            contenedor.innerHTML += `
                <div class="col-md-6 mb-3">
                    <div class="card card-producto shadow-sm h-100">
                        <div class="card-body p-3">
                            <h6 class="fw-bold mb-1">${prod.nombre}</h6>
                            <p class="text-success fw-bold mb-2">Q. ${prod.precio_unitario}</p>
                            <span class="badge bg-secondary mb-3">Stock: ${prod.stock_disponible}</span>
                            
                            <div class="input-group input-group-sm">
                                <input type="number" id="cant-${prod.id_producto}" class="form-control" value="1" min="1" max="${prod.stock_disponible}">
                                <button onclick="comprarProducto(${prod.id_producto})" class="btn btn-success fw-bold">Comprar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        document.getElementById('catalogo-productos').innerHTML = '<p class="text-danger">Error cargando productos.</p>';
    }
}

async function comprarProducto(idProducto) {
    if (!usuarioActual) return alert("Debes iniciar sesión primero.");
    
    const cantidad = document.getElementById(`cant-${idProducto}`).value;
    const tipoEntrega = document.getElementById('tipo-entrega').value;
    const metodoPago = document.getElementById('metodo-pago').value;
    const alerta = document.getElementById('alerta-compra');
    
    alerta.innerHTML = '<div class="alert alert-info py-1 small">Procesando compra...</div>';

    try {
        const respuesta = await fetch(`${API_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_cliente: usuarioActual.id_cliente, // Enviamos el ID real del usuario conectado
                tipo_entrega: tipoEntrega,
                metodo_pago: metodoPago,
                total: 0, 
                carrito: [{ id_producto: idProducto, cantidad: cantidad }]
            })
        });
        
        const data = await respuesta.json();
        
        if (respuesta.ok) {
            alerta.innerHTML = `<div class="alert alert-success py-2 small fw-bold">✅ ¡Compra confirmada!<br>Token de Retiro: <span class="fs-5 text-dark">${data.token}</span></div>`;
            cargarCatalogo(); // Actualizar stock
        } else {
            alerta.innerHTML = `<div class="alert alert-danger py-1 small">${data.error}</div>`;
        }
    } catch (error) {
        alerta.innerHTML = `<div class="alert alert-danger py-1 small">Error en la transacción.</div>`;
    }
}

// ==========================================
// 4. VENDER COSECHA
// ==========================================
async function procesarVenta() {
    if (!usuarioActual) return alert("Debes iniciar sesión primero.");

    const producto = document.getElementById('venta-producto').value;
    const cantidad = document.getElementById('venta-cantidad').value;
    const kiosco = document.getElementById('venta-kiosco').value;
    const alerta = document.getElementById('alerta-venta');

    if (!producto || !cantidad) {
        alerta.innerHTML = '<div class="alert alert-warning py-2">Por favor llena todos los campos.</div>';
        return;
    }

    alerta.innerHTML = '<div class="alert alert-info py-2">Enviando solicitud...</div>';

    try {
        const respuesta = await fetch(`${API_URL}/api/vender`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_cliente: usuarioActual.id_cliente,
                producto_ofrecido: producto,
                cantidad_ofrecida: cantidad,
                kiosco_entrega: kiosco
            })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            alerta.innerHTML = `<div class="alert alert-success py-2 fw-bold">✅ ${data.mensaje}</div>`;
            document.getElementById('venta-producto').value = '';
            document.getElementById('venta-cantidad').value = '';
        } else {
            alerta.innerHTML = `<div class="alert alert-danger py-2">${data.error}</div>`;
        }
    } catch (error) {
        alerta.innerHTML = `<div class="alert alert-danger py-2">Error al procesar la venta.</div>`;
    }
}
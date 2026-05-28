// Conectamos el frontend con tu API segura en la nube
const API_URL = 'https://api-esperanza-backend.onrender.com';

// Función para cargar los productos
async function cargarCatalogo() {
    try {
        const respuesta = await fetch(`${API_URL}/api/productos`);
        const productos = await respuesta.json();
        const contenedor = document.getElementById('catalogo-productos');
        contenedor.innerHTML = ''; 

        productos.forEach(prod => {
            contenedor.innerHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-body">
                            <h5 class="card-title fw-bold">${prod.nombre}</h5>
                            <p class="text-muted mb-1">${prod.categoria}</p>
                            <h4 class="text-success">Q. ${prod.precio_unitario}</h4>
                            <span class="badge bg-secondary mb-3">Stock: ${prod.stock_disponible}</span>
                            
                            <div class="input-group">
                                <input type="number" id="cant-${prod.id_producto}" class="form-control" value="1" min="1" max="${prod.stock_disponible}">
                                <button onclick="comprarProducto(${prod.id_producto})" class="btn btn-success fw-bold">Comprar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        document.getElementById('catalogo-productos').innerHTML = '<p class="text-danger">Error de conexión con el servidor.</p>';
    }
}

// Función para procesar la compra
async function comprarProducto(idProducto) {
    const cantidad = document.getElementById(`cant-${idProducto}`).value;
    
    try {
        const respuesta = await fetch(`${API_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_cliente: 1, // Cliente de prueba
                tipo_entrega: 'Kiosco',
                metodo_pago: 'Efectivo',
                total: 0,
                carrito: [{ id_producto: idProducto, cantidad: cantidad }]
            })
        });
        
        const data = await respuesta.json();
        const alerta = document.getElementById('alerta-mensaje');
        
        if (respuesta.ok) {
            alerta.innerHTML = `<div class="alert alert-success fw-bold">¡Compra exitosa! Token de Retiro: ${data.token}</div>`;
            cargarCatalogo(); // Recarga el stock visualmente
        } else {
            alerta.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

cargarCatalogo();
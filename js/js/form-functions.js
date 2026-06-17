// ============================================
// VARIABLES GLOBALES
// ============================================
let recibosCache = [];
let idAEliminar = null;

// ============================================
// GUARDAR RECIBO
// ============================================
async function guardarRecibo() {
    const nombre = document.getElementById('txtNombre').value.trim();
    const cedula = document.getElementById('txtCedula').value.trim();
    
    if (!nombre || !cedula) {
        alert('⚠️ Complete al menos el nombre y la cédula antes de guardar');
        return;
    }
    
    // Recolectar datos del formulario
    const data = {
        nombre: nombre,
        estadoCivil: document.getElementById('ddlEstado').value,
        oficio: document.getElementById('txtOficio').value,
        direccion1: document.getElementById('txtDireccion').value,
        direccion2: document.getElementById('txtDireccion2').value,
        nacionalidad: document.getElementById('txtNacionalidad2').value,
        tipoIdentificacion: document.getElementById('ddlTipoId').value,
        numeroIdentificacion: cedula,
        celular: document.getElementById('txtCelular').value,
        telefono2: document.getElementById('txtTelefono2').value,
        email1: document.getElementById('txtEmail1').value,
        email2: document.getElementById('txtEmail2').value,
        montoLetras: document.getElementById('txtMonto').value,
        montoUSD: document.getElementById('txtMontoUSD').value,
        numeroCasa: document.getElementById('txtNumeroCasa').value,
        lote: document.getElementById('txtlote').value,
        tipoCasa: document.getElementById('ddltipocasa').value
    };
    
    try {
        const resultado = await ReciboAPI.guardar(data);
        alert('✅ Recibo guardado correctamente');
        console.log('Recibo guardado:', resultado);
    } catch (err) {
        alert('❌ Error al guardar: ' + err.message);
    }
}

// ============================================
// NUEVO RECIBO (limpiar y enfocar)
// ============================================
function nuevoRecibo() {
    if (confirm('¿Desea crear un nuevo recibo? Se perderán los datos actuales.')) {
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ============================================
// ABRIR CONSULTA
// ============================================
async function abrirConsulta() {
    const modal = new bootstrap.Modal(document.getElementById('modalConsulta'));
    modal.show();
    
    // Cargar recibos
    document.getElementById('tablaRecibos').innerHTML = `
        <tr><td colspan="6" class="text-center text-muted">
            <i class="bi bi-hourglass-split"></i> Cargando...
        </td></tr>`;
    
    try {
        recibosCache = await ReciboAPI.listar();
        renderizarRecibos(recibosCache);
    } catch (err) {
        document.getElementById('tablaRecibos').innerHTML = `
            <tr><td colspan="6" class="text-center text-danger">
                ❌ Error al cargar: ${err.message}
            </td></tr>`;
    }
}

// ============================================
// RENDERIZAR TABLA DE RECIBOS
// ============================================
function renderizarRecibos(lista) {
    const tbody = document.getElementById('tablaRecibos');
    document.getElementById('totalRecibos').textContent = `${lista.length} recibo(s)`;
    
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">
            No hay recibos para mostrar
        </td></tr>`;
        return;
    }
    
    tbody.innerHTML = lista.map(r => `
        <tr>
            <td><strong>${r.id}</strong></td>
            <td>${r.nombre || '-'}</td>
            <td>${r.numeroIdentificacion || '-'}</td>
            <td><span class="badge bg-secondary">${r.numeroCasa || '-'}</span></td>
            <td>$${r.montoUSD || '0'}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" 
                        onclick="editarRecibo(${r.id})" title="Editar">
                    <i class="bi bi-pencil-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" 
                        onclick="confirmarEliminar(${r.id}, '${(r.nombre || '').replace(/'/g, "\\'")}')" 
                        title="Eliminar">
                    <i class="bi bi-trash-fill"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// BUSCAR / FILTRAR
// ============================================
function filtrarRecibos() {
    const texto = document.getElementById('buscarRecibo').value.toLowerCase();
    const filtrados = recibosCache.filter(r => 
        (r.nombre || '').toLowerCase().includes(texto) ||
        (r.numeroIdentificacion || '').toLowerCase().includes(texto) ||
        (r.numeroCasa || '').toLowerCase().includes(texto)
    );
    renderizarRecibos(filtrados);
}

// ============================================
// EDITAR RECIBO
// ============================================
async function editarRecibo(id) {
    try {
        const r = await ReciboAPI.obtener(id);
        
        // Llenar el formulario con los datos
        document.getElementById('txtNombre').value = r.nombre || '';
        document.getElementById('ddlEstado').value = r.estadoCivil || '';
        document.getElementById('txtOficio').value = r.oficio || '';
        document.getElementById('txtDireccion').value = r.direccion1 || '';
        document.getElementById('txtDireccion2').value = r.direccion2 || '';
        document.getElementById('txtNacionalidad2').value = r.nacionalidad || '';
        document.getElementById('ddlTipoId').value = r.tipoIdentificacion || '';
        document.getElementById('txtCedula').value = r.numeroIdentificacion || '';
        document.getElementById('txtCelular').value = r.celular || '';
        document.getElementById('txtTelefono2').value = r.telefono2 || '';
        document.getElementById('txtEmail1').value = r.email1 || '';
        document.getElementById('txtEmail2').value = r.email2 || '';
        document.getElementById('txtMonto').value = r.montoLetras || '';
        document.getElementById('txtMontoUSD').value = r.montoUSD || '';
        document.getElementById('txtNumeroCasa').value = r.numeroCasa || '';
        document.getElementById('txtlote').value = r.lote || '';
        document.getElementById('ddltipocasa').value = r.tipoCasa || '';
        
        // Guardar ID para actualizar (opcional, si tu API soporta PUT)
        document.getElementById('Hoja1').dataset.editandoId = id;
        
        // Cerrar modal y scroll arriba
        bootstrap.Modal.getInstance(document.getElementById('modalConsulta')).hide();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        alert('✅ Recibo cargado. Modifique los datos y presione Guardar.');
    } catch (err) {
        alert('❌ Error al cargar: ' + err.message);
    }
}

// ============================================
// CONFIRMAR Y ELIMINAR
// ============================================
function confirmarEliminar(id, nombre) {
    idAEliminar = id;
    document.getElementById('reciboEliminarInfo').textContent = `#${id} - ${nombre}`;
    
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'));
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
        if (!idAEliminar) return;
        
        try {
            await ReciboAPI.eliminar(idAEliminar);
            alert('✅ Recibo eliminado');
            
            // Recargar lista
            recibosCache = recibosCache.filter(r => r.id !== idAEliminar);
            renderizarRecibos(recibosCache);
            
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
            idAEliminar = null;
        } catch (err) {
            alert('❌ Error al eliminar: ' + err.message);
        }
    });
});

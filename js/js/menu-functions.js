// ============================================
// VARIABLES GLOBALES
// ============================================
let recibosCache = [];
let idAEliminar = null;
let idEditando = null;

// ============================================
// 🔔 NOTIFICACIONES AMIGABLES (TOASTS)
// ============================================
function mostrarToast(mensaje, tipo = 'success') {
    // Crear el contenedor si no existe
    let contenedor = document.getElementById('toastContainer');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toastContainer';
        contenedor.className = 'toast-container position-fixed top-0 end-0 p-3';
        contenedor.style.zIndex = '9999';
        document.body.appendChild(contenedor);
    }
    
    const iconos = {
        success: 'bi-check-circle-fill',
        danger: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-bg-${tipo} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${iconos[tipo]} me-2"></i>
                    ${mensaje}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    contenedor.insertAdjacentHTML('beforeend', toastHTML);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    
    // Eliminar del DOM después de ocultarse
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// ============================================
// 💾 GUARDAR RECIBO (crear o actualizar)
// ============================================
async function guardarRecibo() {
    const nombre = document.getElementById('txtNombre').value.trim();
    const cedula = document.getElementById('txtCedula').value.trim();
    
    if (!nombre || !cedula) {
        mostrarToast('Complete al menos nombre y cédula', 'warning');
        document.getElementById('txtNombre').focus();
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
        tipoCasa: document.getElementById('ddltipocasa').value,
        bancoCliente: document.getElementById('txtBancoCliente').value,
        cuentaCliente: document.getElementById('txtCuentaCliente').value
    };
    
    try {
        // Verificar si estamos editando o creando
        if (idEditando) {
            // TODO: Si tu API soporta PUT, usa esto:
            // await ReciboAPI.actualizar(idEditando, data);
            // Por ahora, eliminamos y creamos uno nuevo
            await ReciboAPI.eliminar(idEditando);
            await ReciboAPI.guardar(data);
            mostrarToast('✅ Recibo actualizado correctamente', 'success');
            idEditando = null;
        } else {
            await ReciboAPI.guardar(data);
            mostrarToast('✅ Recibo guardado correctamente', 'success');
        }
    } catch (err) {
        mostrarToast('❌ Error: ' + err.message, 'danger');
    }
}

// ============================================
// 🆕 NUEVO RECIBO
// ============================================
function nuevoRecibo() {
    // Verificar si hay datos sin guardar
    const nombre = document.getElementById('txtNombre').value.trim();
    if (nombre && !confirm('¿Desea crear un nuevo recibo? Se perderán los datos actuales.')) {
        return;
    }
    
    resetForm();
    idEditando = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarToast('📝 Formulario listo para nuevo recibo', 'info');
}

// ============================================
// 🔍 ABRIR CONSULTA
// ============================================
async function abrirConsulta() {
    const modal = new bootstrap.Modal(document.getElementById('modalConsulta'));
    modal.show();
    
    document.getElementById('tablaRecibos').innerHTML = `
        <tr><td colspan="6" class="text-center text-muted py-4">
            <div class="spinner-border spinner-border-sm me-2"></div>
            Cargando recibos...
        </td></tr>`;
    
    try {
        recibosCache = await ReciboAPI.listar();
        renderizarRecibos(recibosCache);
    } catch (err) {
        document.getElementById('tablaRecibos').innerHTML = `
            <tr><td colspan="6" class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle-fill"></i>
                Error al cargar: ${err.message}
            </td></tr>`;
    }
}

// ============================================
// 📋 RENDERIZAR TABLA DE RECIBOS
// ============================================
function renderizarRecibos(lista) {
    const tbody = document.getElementById('tablaRecibos');
    document.getElementById('totalRecibos').textContent = `${lista.length} recibo(s)`;
    
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">
            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
            No hay recibos para mostrar
        </td></tr>`;
        return;
    }
    
    tbody.innerHTML = lista.map(r => `
        <tr>
            <td><span class="badge bg-primary">#${r.id}</span></td>
            <td><strong>${r.nombre || '-'}</strong></td>
            <td>${r.numeroIdentificacion || '-'}</td>
            <td><span class="badge bg-secondary">Casa ${r.numeroCasa || '-'}</span></td>
            <td class="text-success fw-bold">$${r.montoUSD || '0'}</td>
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
// 🔎 BUSCAR / FILTRAR
// ============================================
function filtrarRecibos() {
    const texto = document.getElementById('buscarRecibo').value.toLowerCase();
    const filtrados = recibosCache.filter(r => 
        (r.nombre || '').toLowerCase().includes(texto) ||
        (r.numeroIdentificacion || '').toLowerCase().includes(texto) ||
        (r.numeroCasa || '').toString().includes(texto)
    );
    renderizarRecibos(filtrados);
}

// ============================================
// ✏️ EDITAR RECIBO
// ============================================
async function editarRecibo(id) {
    try {
        const r = await ReciboAPI.obtener(id);
        
        // Llenar el formulario
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
        document.getElementById('txtBancoCliente').value = r.bancoCliente || '';
        document.getElementById('txtCuentaCliente').value = r.cuentaCliente || '';
        
        // Guardar ID para actualizar al guardar
        idEditando = id;
        
        // Cerrar modal y scroll arriba
        bootstrap.Modal.getInstance(document.getElementById('modalConsulta')).hide();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        mostrarToast(`📝 Editando recibo #${id} - ${r.nombre}`, 'info');
    } catch (err) {
        mostrarToast('❌ Error al cargar: ' + err.message, 'danger');
    }
}

// ============================================
// 🗑️ CONFIRMAR Y ELIMINAR
// ============================================
function confirmarEliminar(id, nombre) {
    idAEliminar = id;
    document.getElementById('reciboEliminarInfo').textContent = `#${id} - ${nombre}`;
    
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'), {
        backdrop: 'static',  // No se cierra al hacer clic fuera
        keyboard: false      // No se cierra con ESC
    });
    modal.show();
}

// ============================================
// 🎯 INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Botón confirmar eliminación
    document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
        if (!idAEliminar) return;
        
        const btn = document.getElementById('btnConfirmarEliminar');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';
        
        try {
            await ReciboAPI.eliminar(idAEliminar);
            mostrarToast('✅ Recibo eliminado', 'success');
            
            // Actualizar lista
            recibosCache = recibosCache.filter(r => r.id !== idAEliminar);
            renderizarRecibos(recibosCache);
            
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
            
            // Si estábamos editando este recibo, limpiar
            if (idEditando === idAEliminar) {
                idEditando = null;
            }
            
            idAEliminar = null;
        } catch (err) {
            mostrarToast('❌ Error al eliminar: ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash-fill"></i> Sí, eliminar';
        }
    });
    
    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        // Ctrl+S = Guardar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            guardarRecibo();
        }
        // Ctrl+P = Imprimir
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            window.print();
        }
        // Ctrl+N = Nuevo
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            nuevoRecibo();
        }
        // Ctrl+B = Buscar (consultar)
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            abrirConsulta();
        }
    });
});

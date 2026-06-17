// ============================================
// VARIABLES GLOBALES
// ============================================
// Inicializar en window si no existen
window.recibosCache = window.recibosCache || [];
window.idAEliminar = window.idAEliminar || null;
window.idEditando = window.idEditando || null;

// ============================================
// 🔔 NOTIFICACIONES AMIGABLES (TOASTS)
// ============================================
function mostrarToast(mensaje, tipo = 'success') {
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
    
    // Helper para obtener valores
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? (el.value || '') : '';
    };
    
    // Helper para campos requeridos (envía "N/A" si está vacío)
    const req = (id) => {
        const v = val(id).trim();
        return v || 'N/A';
    };
    
    // Helper para convertir a número decimal (0 si vacío)
    const dec = (id) => {
        const v = val(id).replace(/[^0-9.-]/g, '');
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    };
    
    // Helper para convertir a número entero (null si vacío)
    const intOrNull = (id) => {
        const v = val(id);
        if (!v) return null;
        const n = parseInt(v, 10);
        return isNaN(n) ? null : n;
    };
    
    // Helper para convertir fecha a ISO o null
    const fechaOrNull = (id) => {
        const v = val(id);
        return v || null;
    };
    
    // ✅ DATOS CON TIPOS CORRECTOS
    const data = {
        // Strings normales
        nombre: nombre,
        estadoCivil: val('ddlEstado'),
        oficio: val('txtOficio'),
        direccion1: val('txtDireccion'),
        direccion2: val('txtDireccion2'),
        nacionalidad: val('txtNacionalidad2'),
        tipoIdentificacion: val('ddlTipoId'),
        numeroIdentificacion: cedula,
        celular: val('txtCelular'),
        telefono2: val('txtTelefono2'),
        email1: val('txtEmail1'),
        email2: val('txtEmail2'),
        montoLetras: val('txtMonto'),
        numeroCasa: val('txtNumeroCasa'),
        lote: val('txtlote'),
        tipoCasa: val('ddltipocasa'),
        bancoCliente: val('txtBancoCliente'),
        cuentaCliente: val('txtCuentaCliente'),
        
        // ⚠️ CAMPOS REQUERIDOS (enviar "N/A" si están vacíos)
        precioLetras: req('TextBox0'),
        duenoCuenta: req('txtDueñoCuenta'),
        cuentaExterior: req('txtCuentaExterior'),
        nombreBanco: req('txtNombreBanco'),
        aba: req('txtABA'),
        swift: req('txtSWIFT'),
        direccionBanco: req('txtDireccionBanco'),
        
        // Decimales (NO nullable en C#)
        montoUsd: dec('txtMontoUSD'),
        precioUsd: dec('TextBox0'),
        
        // Decimales nullable
        montoReserva: val('txtmonto1') ? dec('txtmonto1') : null,
        montoContrato: val('TextBox2') ? dec('TextBox2') : null,
        montoCuota: val('TextBox3') ? dec('TextBox3') : null,
        montoExtraordinario: val('TextBox4') ? dec('TextBox4') : null,
        montoDescuento: val('txtreduceprecio') ? dec('txtreduceprecio') : null,
        
        // Enteros nullable
        diaPagoCuota: intOrNull('txtnumcuota'),
        diaFirma: intOrNull('ddldia'),
        mesFirma: (() => {
            const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const mesTexto = val('ddlmes');
            const idx = meses.indexOf(mesTexto);
            return idx >= 0 ? idx + 1 : null;
        })(),
        anoFirma: intOrNull('ddlano'),
        
        // Fechas nullable
        fechaReserva: fechaOrNull('fechaReserva'),
        fechaContrato: fechaOrNull('fechaContrato'),
        
        // Booleano
        aplicaDescuento: document.getElementById('chbxAplicar')?.checked || false,
        
        // Fecha de creación
        fechaCreacion: new Date().toISOString()
    };
    
    console.log('📤 Datos a enviar:', data);
    
    try {
        if (window.idEditando) {
            await ReciboAPI.eliminar(window.idEditando);
            await ReciboAPI.guardar(data);
            mostrarToast('✅ Recibo actualizado correctamente', 'success');
            window.idEditando = null;
        } else {
            await ReciboAPI.guardar(data);
            mostrarToast('✅ Recibo guardado correctamente', 'success');
        }
    } catch (err) {
        mostrarToast('❌ Error: ' + err.message, 'danger');
        console.error('Error completo:', err);
    }
}

// ============================================
// 🆕 NUEVO RECIBO
// ============================================
function nuevoRecibo() {
    const nombre = document.getElementById('txtNombre').value.trim();
    if (nombre && !confirm('¿Desea crear un nuevo recibo? Se perderán los datos actuales.')) {
        return;
    }
    
    resetForm();
    window.idEditando = null;
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
        window.recibosCache = await ReciboAPI.listar();
        renderizarRecibos(window.recibosCache);
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
    const filtrados = window.recibosCache.filter(r => 
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
        
        window.idEditando = id;
        
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
    window.idAEliminar = id;
    document.getElementById('reciboEliminarInfo').textContent = `#${id} - ${nombre}`;
    
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmar'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
}

// ============================================
// 🎯 INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
        if (!window.idAEliminar) return;
        
        const btn = document.getElementById('btnConfirmarEliminar');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';
        
        try {
            await ReciboAPI.eliminar(window.idAEliminar);
            mostrarToast('✅ Recibo eliminado', 'success');
            
            window.recibosCache = window.recibosCache.filter(r => r.id !== window.idAEliminar);
            renderizarRecibos(window.recibosCache);
            
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
            
            if (window.idEditando === window.idAEliminar) {
                window.idEditando = null;
            }
            
            window.idAEliminar = null;
        } catch (err) {
            mostrarToast('❌ Error al eliminar: ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash-fill"></i> Sí, eliminar';
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            guardarRecibo();
        }
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            window.print();
        }
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            nuevoRecibo();
        }
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            abrirConsulta();
        }
    });
});

// ============================================
// VARIABLES GLOBALES
// ============================================
/* global ReciboAPI, mostrarToast */

let idEditando = null;
let recibosCache = [];
let idAEliminar = null;
let modoVisualizacion = false; // true = solo lectura, false = edición

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
// 💾 GUARDAR RECIBO
// ============================================
async function guardarRecibo() {
    const nombre = document.getElementById('txtNombre').value.trim();
    const cedula = document.getElementById('txtCedula').value.trim();
    
    if (!nombre || !cedula) {
        mostrarToast('Complete al menos nombre y cédula', 'warning');
        document.getElementById('txtNombre').focus();
        return;
    }
    
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? (el.value || '') : '';
    };
    
    const req = (id) => {
        const v = val(id).trim();
        return v || 'N/A';
    };
    
    const dec = (id) => {
        const v = val(id).replace(/[^0-9.-]/g, '');
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    };
    
    const intOrNull = (id) => {
        const v = val(id);
        if (!v) return null;
        const n = parseInt(v, 10);
        return isNaN(n) ? null : n;
    };
    
    const fechaOrNull = (id) => {
        const v = val(id);
        return v || null;
    };
    
    const data = {
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
        precioLetras: req('TextBox0'),
        duenoCuenta: req('txtDueñoCuenta'),
        cuentaExterior: req('txtCuentaExterior'),
        nombreBanco: req('txtNombreBanco'),
        aba: req('txtABA'),
        swift: req('txtSWIFT'),
        direccionBanco: req('txtDireccionBanco'),
        montoUsd: dec('txtMontoUSD'),
        precioUsd: dec('TextBox0'),
        montoReserva: val('txtmonto1') ? dec('txtmonto1') : null,
        montoContrato: val('TextBox2') ? dec('TextBox2') : null,
        montoCuota: val('TextBox3') ? dec('TextBox3') : null,
        montoExtraordinario: val('TextBox4') ? dec('TextBox4') : null,
        montoDescuento: val('txtreduceprecio') ? dec('txtreduceprecio') : null,
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
        fechaReserva: fechaOrNull('fechaReserva'),
        fechaContrato: fechaOrNull('fechaContrato'),
        aplicaDescuento: document.getElementById('chbxAplicar')?.checked || false,
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
    modoVisualizacion = false;
    habilitarFormulario(true);
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
        <tr><td colspan="7" class="text-center text-muted py-4">
            <div class="spinner-border spinner-border-sm me-2"></div>
            Cargando recibos...
        </td></tr>`;
    
    try {
        recibosCache = await ReciboAPI.listar();
        renderizarRecibos(recibosCache);
    } catch (err) {
        document.getElementById('tablaRecibos').innerHTML = `
            <tr><td colspan="7" class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle-fill"></i>
                Error al cargar: ${err.message}
            </td></tr>`;
    }
}

// ============================================
//  RENDERIZAR TABLA DE RECIBOS (con 3 botones)
// ============================================
function renderizarRecibos(lista) {
    const tbody = document.getElementById('tablaRecibos');
    document.getElementById('totalRecibos').textContent = `${lista.length} recibo(s)`;
    
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
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
            <td class="text-success fw-bold">$${r.montoUsd || '0'}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-info me-1" 
                        onclick="visualizarRecibo(${r.id})" title="Visualizar">
                    <i class="bi bi-eye-fill"></i>
                </button>
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
// 👁️ VISUALIZAR RECIBO (solo lectura)
// ============================================
async function visualizarRecibo(id) {
    try {
        const r = await ReciboAPI.obtener(id);
        cargarDatosEnFormulario(r);
        modoVisualizacion = true;
        habilitarFormulario(false); // Deshabilitar todos los campos
        
        bootstrap.Modal.getInstance(document.getElementById('modalConsulta')).hide();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        mostrarToast(`👁️ Visualizando recibo #${id} - ${r.nombre}`, 'info');
    } catch (err) {
        mostrarToast('❌ Error al cargar: ' + err.message, 'danger');
    }
}

// ============================================
// ✏️ EDITAR RECIBO (modo edición)
// ============================================
async function editarRecibo(id) {
    try {
        const r = await ReciboAPI.obtener(id);
        cargarDatosEnFormulario(r);
        modoVisualizacion = false;
        habilitarFormulario(true); // Habilitar todos los campos
        
        window.idEditando = id;
        
        bootstrap.Modal.getInstance(document.getElementById('modalConsulta')).hide();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        mostrarToast(` Editando recibo #${id} - ${r.nombre}`, 'info');
    } catch (err) {
        mostrarToast('❌ Error al cargar: ' + err.message, 'danger');
    }
}

// ============================================
// 📥 CARGAR TODOS LOS DATOS EN EL FORMULARIO
// ============================================
function cargarDatosEnFormulario(r) {
    // Helper para establecer valores de forma segura
    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };
    
    const setSelect = (id, value) => {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
    };
    
    const setDate = (id, value) => {
        const el = document.getElementById(id);
        if (el && value) {
            if (value.includes('T')) {
                el.value = value.split('T')[0];
            } else {
                el.value = value;
            }
        }
    };
    
    const setCheckbox = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = value || false;
    };
    
    // Datos personales
    setVal('txtNombre', r.nombre);
    setSelect('ddlEstado', r.estadoCivil);
    setVal('txtOficio', r.oficio);
    setVal('txtDireccion', r.direccion1);
    setVal('txtDireccion2', r.direccion2);
    setVal('txtNacionalidad2', r.nacionalidad);
    setSelect('ddlTipoId', r.tipoIdentificacion);
    setVal('txtCedula', r.numeroIdentificacion);
    setVal('txtCelular', r.celular);
    setVal('txtTelefono2', r.telefono2);
    setVal('txtEmail1', r.email1);
    setVal('txtEmail2', r.email2);
    
    // Montos
    setVal('txtMonto', r.montoLetras);
    setVal('txtMontoUSD', r.montoUsd || '0');
    
    // ✅ CASA: Sincronizar dropdown con el valor guardado
    const numeroCasa = r.numeroCasa || '';
    setVal('txtNumeroCasa', numeroCasa);
    setVal('txtlote', r.lote);
    setSelect('ddltipocasa', r.tipoCasa);
    
    // ✅ Sincronizar el dropdown de casa número
    const ddlCasa = document.getElementById('ddlcasaNumero');
    if (ddlCasa && numeroCasa) {
        // Buscar la opción que coincida con el valor guardado
        const opciones = Array.from(ddlCasa.options);
        const opcionEncontrada = opciones.find(opt => opt.value === numeroCasa || opt.text === numeroCasa);
        
        if (opcionEncontrada) {
            ddlCasa.value = opcionEncontrada.value;
            console.log('✅ Dropdown de casa sincronizado:', numeroCasa);
        } else {
            console.warn('️ No se encontró la opción para casa:', numeroCasa);
        }
    }
    
    // Precio
    setVal('TextBox0', r.precioLetras);
    
    // Fechas de pago
    setDate('fechaReserva', r.fechaReserva);
    setVal('txtmonto1', r.montoReserva);
    setDate('fechaContrato', r.fechaContrato);
    setVal('TextBox2', r.montoContrato);
    setVal('txtnumcuota', r.diaPagoCuota);
    setVal('TextBox3', r.montoCuota);
    setVal('TextBox4', r.montoExtraordinario);
    
    // Descuento
    setCheckbox('chbxAplicar', r.aplicaDescuento);
    setVal('txtreduceprecio', r.montoDescuento);
    
    // Mostrar/ocultar panel de descuento
    const pnlDescuento = document.getElementById('pnlMensajeDescuento');
    if (pnlDescuento) {
        pnlDescuento.style.display = r.aplicaDescuento ? 'block' : 'none';
    }
    
    // Banco cliente
    setVal('txtBancoCliente', r.bancoCliente);
    setVal('txtCuentaCliente', r.cuentaCliente);
    setVal('txtDueñoCuenta', r.duenoCuenta);
    setVal('txtCuentaExterior', r.cuentaExterior);
    setVal('txtNombreBanco', r.nombreBanco);
    setVal('txtABA', r.aba);
    setVal('txtSWIFT', r.swift);
    setVal('txtDireccionBanco', r.direccionBanco);
    
    // Fecha de firma
    setVal('ddldia', r.diaFirma);
    if (r.mesFirma) {
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        setSelect('ddlmes', meses[r.mesFirma - 1]);
    }
    setVal('ddlano', r.anoFirma);
    
    console.log('✅ Datos cargados en formulario:', r);
}

// ============================================
//  HABILITAR/DESHABILITAR FORMULARIO
// ============================================
function habilitarFormulario(habilitar) {
    const elementos = document.querySelectorAll('input, select, textarea');
    elementos.forEach(el => {
        if (el.id !== 'txtNumeroCasa' && el.id !== 'txtlote') { // Estos siempre son readonly
            el.disabled = !habilitar;
        }
    });
    
    // Cambiar estilo visual
    const formulario = document.getElementById('Hoja1');
    if (formulario) {
        if (habilitar) {
            formulario.classList.remove('modo-visualizacion');
        } else {
            formulario.classList.add('modo-visualizacion');
        }
    }
}

// ============================================
// 🗑️ CONFIRMAR Y ELIMINAR
// ============================================
function confirmarEliminar(id, nombre) {
    idAEliminar = id;
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
        if (!idAEliminar) return;
        
        const btn = document.getElementById('btnConfirmarEliminar');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';
        
        try {
            await ReciboAPI.eliminar(idAEliminar);
            mostrarToast('✅ Recibo eliminado', 'success');
            
            recibosCache = recibosCache.filter(r => r.id !== idAEliminar);
            renderizarRecibos(recibosCache);
            
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
            
            if (window.idEditando === idAEliminar) {
                window.idEditando = null;
            }
            
            idAEliminar = null;
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

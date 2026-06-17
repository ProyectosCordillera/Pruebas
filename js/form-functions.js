// ============================================
// FORM-FUNCTIONS.JS
// Solo funciones del formulario (no del menú)
// ============================================

// ============================================
// 🧹 LIMPIAR FORMULARIO
// ============================================
function resetForm() {
    // Limpiar campos de texto
    const camposTexto = [
        'txtNombre', 'txtOficio', 'txtDireccion', 'txtDireccion2',
        'txtNacionalidad2', 'txtCedula', 'txtCelular', 'txtTelefono2',
        'txtEmail1', 'txtEmail2', 'txtMonto', 'txtMontoUSD',
        'txtNumeroCasa', 'txtlote', 'txtBancoCliente', 'txtCuentaCliente',
        'txtDueñoCuenta', 'txtCuentaExterior', 'txtNombreBanco',
        'txtABA', 'txtSWIFT', 'txtDireccionBanco', 'TextBox0',
        'txtmonto1', 'TextBox2', 'TextBox3', 'TextBox4', 'txtreduceprecio'
    ];
    
    camposTexto.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = '';
    });
    
    // Resetear selectores a su valor por defecto
    const selectores = ['ddlEstado', 'ddlTipoId', 'ddltipocasa', 'ddlcasaNumero', 'ddldia', 'ddlmes', 'ddlano'];
    selectores.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.selectedIndex = 0;
    });
    
    // Resetear campos de fecha
    const fechas = ['fechaReserva', 'fechaContrato'];
    fechas.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = '';
    });
    
    // Resetear checkbox
    const chbAplicar = document.getElementById('chbxAplicar');
    if (chbAplicar) chbAplicar.checked = false;
    
    // Ocultar panel de descuento
    const pnlDescuento = document.getElementById('pnlMensajeDescuento');
    if (pnlDescuento) pnlDescuento.style.display = 'none';
    
    // Resetear número de cuota
    const numCuota = document.getElementById('txtnumcuota');
    if (numCuota) numCuota.value = '';
    
    console.log('🧹 Formulario limpiado');
}

// ============================================
// ➡️ MOVER AL SIGUIENTE CAMPO (conectados)
// ============================================
function moveToNext(element, event) {
    // Si presiona Enter o llena el campo, pasa al siguiente
    if (event.key === 'Enter' || element.value.length >= element.maxLength) {
        const inputs = Array.from(document.querySelectorAll('.connected-input'));
        const index = inputs.indexOf(element);
        if (index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    }
}

// ============================================
// ⬅️ MOVER AL CAMPO ANTERIOR (conectados)
// ============================================
function moveToPrevious(element, event) {
    // Si presiona Backspace en campo vacío, va al anterior
    if (event.key === 'Backspace' && element.value.length === 0) {
        const inputs = Array.from(document.querySelectorAll('.connected-input'));
        const index = inputs.indexOf(element);
        if (index > 0) {
            inputs[index - 1].focus();
        }
    }
}

// ============================================
// 📅 LLENAR FECHA ACTUAL EN CAMPOS DE FECHA
// ============================================
function llenarFechaActual() {
    const hoy = new Date();
    const dia = hoy.getDate().toString().padStart(2, '0');
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const anio = hoy.getFullYear();
    const fechaISO = `${anio}-${mes}-${dia}`;
    
    const fechaReserva = document.getElementById('fechaReserva');
    if (fechaReserva && !fechaReserva.value) {
        fechaReserva.value = fechaISO;
    }
}

// ============================================
// 🎯 INICIALIZACIÓN DEL FORMULARIO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Llenar fecha actual al cargar
    llenarFechaActual();
    
    // Checkbox de descuento
    const chbAplicar = document.getElementById('chbxAplicar');
    const pnlDescuento = document.getElementById('pnlMensajeDescuento');
    
    if (chbAplicar && pnlDescuento) {
        chbAplicar.addEventListener('change', function() {
            pnlDescuento.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    console.log('✅ Formulario inicializado');
});

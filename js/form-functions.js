// ============================================
// FORM-FUNCTIONS.JS
// Funciones del formulario: dropdowns, fechas, navegación
// ============================================

// ============================================
// 🎯 INICIALIZACIÓN PRINCIPAL
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    initCasaDropdown();
    setDefaultDates();
    llenarDropdownsFecha();
    setupDiscountCheckbox();
    setupCasaChangeHandler();
    setupDropdownReplication('ddlcasaNumero', 'txtNumeroCasa');
    console.log('✅ Formulario inicializado');
});

// ============================================
// 🏠 INICIALIZAR DROPDOWN DE CASAS (1-65)
// ============================================
function initCasaDropdown() {
    const ddl = document.getElementById("ddlcasaNumero");
    if (!ddl) return;
    
    // Limpiar opciones existentes excepto la primera
    const primeraOpcion = ddl.querySelector('option[value=""]');
    ddl.innerHTML = '';
    if (primeraOpcion) ddl.appendChild(primeraOpcion);
    
    // Agregar casas del 1 al 65 con formato FF-XX
    for (let i = 1; i <= 65; i++) {
        const num = i.toString().padStart(2, '0');
        ddl.innerHTML += `<option value="FF-${num}">FF-${num}</option>`;
    }
}

// ============================================
// 🔗 REPLICAR DROPDOWN A TEXTBOX
// ============================================
function setupDropdownReplication(dropdownId, textboxId) {
    var select = document.getElementById(dropdownId);
    var input = document.getElementById(textboxId);
    
    if (select && input) {
        select.addEventListener('change', function() {
            input.value = select.options[select.selectedIndex].text;
        });
        
        if (select.selectedIndex >= 0) {
            input.value = select.options[select.selectedIndex].text;
        }
    } else {
        console.error('No se encontraron los controles: ' + dropdownId + ' o ' + textboxId);
    }
}

// ============================================
// 📅 ESTABLECER FECHAS POR DEFECTO
// ============================================
function setDefaultDates() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    const fechaReserva = document.getElementById('fechaReserva');
    if (fechaReserva && !fechaReserva.value) {
        fechaReserva.value = formattedDate;
    }
    
    const contractDate = new Date();
    contractDate.setDate(today.getDate() + 7);
    
    const fechaContrato = document.getElementById('fechaContrato');
    if (fechaContrato && !fechaContrato.value) {
        fechaContrato.value = contractDate.toISOString().split('T')[0];
    }
}

// ============================================
// 📅 LLENAR DROPDOWNS DE FECHA (día, mes, año)
// ============================================
function llenarDropdownsFecha() {
    const dias = Array.from({length: 31}, (_, i) => (i + 1).toString());
    
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const añoActual = new Date().getFullYear();
    const anios = Array.from({length: 10}, (_, i) => (añoActual - 2 + i).toString());
    
    function llenarSelect(idSelect, opciones, valorPorDefecto = null) {
        const select = document.getElementById(idSelect);
        if (!select) return;
        
        const placeholder = select.firstElementChild;
        select.innerHTML = '';
        if (placeholder) select.appendChild(placeholder);
        
        opciones.forEach(opcion => {
            const option = document.createElement('option');
            option.value = opcion;
            option.textContent = opcion;
            select.appendChild(option);
        });
        
        if (valorPorDefecto !== null) {
            const optionDefault = select.querySelector(`option[value="${valorPorDefecto}"]`);
            if (optionDefault) select.value = valorPorDefecto;
        }
    }
    
    const hoy = new Date();
    const diaHoy = hoy.getDate().toString();
    const mesHoy = meses[hoy.getMonth()];
    const anoHoy = hoy.getFullYear().toString();
    
    llenarSelect('ddldia', dias, diaHoy);
    llenarSelect('ddlmes', meses, mesHoy);
    llenarSelect('ddlano', anios, anoHoy);
}

// ============================================
// 💰 CONFIGURAR CHECKBOX DE DESCUENTO
// ============================================
function setupDiscountCheckbox() {
    const checkbox = document.getElementById('chbxAplicar');
    const panel = document.getElementById('pnlMensajeDescuento');
    
    if (!checkbox || !panel) return;
    
    checkbox.addEventListener('change', function() {
        panel.style.display = this.checked ? 'block' : 'none';
    });
    
    panel.style.display = checkbox.checked ? 'block' : 'none';
}

// ============================================
// 🏡 ACTUALIZAR LOTE SEGÚN CASA SELECCIONADA
// ============================================
function setupCasaChangeHandler() {
    const ddlcasaNumero = document.getElementById('ddlcasaNumero');
    const txtlote = document.getElementById('txtlote');
    
    if (!ddlcasaNumero || !txtlote) return;
    
    ddlcasaNumero.addEventListener('change', function() {
        var fincaValue = this.value;
        var numeroFinca = parseInt(fincaValue.replace('FF-', ''), 10);
        
        if (isNaN(numeroFinca)) {
            txtlote.value = "";
            return;
        }
        
        if (numeroFinca === 1) {
            txtlote.value = "110 m²";
        } else if (numeroFinca >= 2 && numeroFinca <= 7) {
            txtlote.value = "119 m²";
        } else if (numeroFinca >= 8 && numeroFinca <= 10) {
            txtlote.value = "110 m²";
        } else if (numeroFinca >= 11 && numeroFinca <= 15) {
            txtlote.value = "119 m²";
        } else if (numeroFinca === 16) {
            txtlote.value = "110 m²";
        } else if (numeroFinca >= 17 && numeroFinca <= 32) {
            txtlote.value = "112 m²";
        } else if (numeroFinca >= 33 && numeroFinca <= 47) {
            txtlote.value = "110 m²";
        } else if (numeroFinca >= 48 && numeroFinca <= 64) {
            txtlote.value = "110 m²";
        } else if (numeroFinca === 65) {
            txtlote.value = "150 m²";
        } else {
            txtlote.value = "";
        }
    });
    
    if (ddlcasaNumero.value) {
        ddlcasaNumero.dispatchEvent(new Event('change'));
    }
}

// ============================================
// ➡️ MOVER AL SIGUIENTE CAMPO (dirección)
// ============================================
function moveToNext(currentInput, event) {
    const nextInput = document.getElementById('txtDireccion2');
    if (currentInput.value.length >= currentInput.maxLength) {
        nextInput.focus();
    }
}

// ============================================
// ⬅️ MOVER AL CAMPO ANTERIOR (dirección)
// ============================================
function moveToPrevious(currentInput, event) {
    const prevInput = document.getElementById('txtDireccion');
    if (event.key === 'Backspace' && currentInput.selectionStart === 0 && currentInput.value === '') {
        event.preventDefault();
        prevInput.focus();
        prevInput.selectionStart = prevInput.value.length;
        prevInput.selectionEnd = prevInput.value.length;
    }
}

// ============================================
// 🧹 LIMPIAR FORMULARIO
// ============================================
function resetForm() {
    if (confirm('¿Está seguro que desea limpiar todo el formulario? Se perderán todos los datos ingresados.')) {
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.type !== 'checkbox' && element.type !== 'radio') {
                if (!element.readOnly) {
                    element.value = '';
                }
            } else {
                element.checked = false;
            }
        });
        
        setDefaultDates();
        
        const panel = document.getElementById('pnlMensajeDescuento');
        if (panel) panel.style.display = 'none';
        
        const txtlote = document.getElementById('txtlote');
        if (txtlote) txtlote.value = '';
        
        const txtNumeroCasa = document.getElementById('txtNumeroCasa');
        if (txtNumeroCasa) txtNumeroCasa.value = '';
        
        const ddlCasa = document.getElementById('ddlcasaNumero');
        if (ddlCasa) ddlCasa.selectedIndex = 0;
        
        console.log('🧹 Formulario limpiado');
    }
}

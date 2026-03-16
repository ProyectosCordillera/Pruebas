// ============================================
// FUNCIONES DE INICIALIZACIÓN Y FORMULARIO
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    // Inicializar dropdown de casas
    initCasaDropdown();
    
    // Establecer fechas por defecto
    setDefaultDates();
    
    // Configurar checkbox de descuento
    setupDiscountCheckbox();
    
    // Configurar evento de cambio de casa
    setupCasaChangeHandler();
    
    // Replicar valor del dropdown de casa al campo de texto
    setupDropdownReplication('ddlcasaNumero', 'txtNumeroCasa');
});

// Función para inicializar el dropdown de casas
function initCasaDropdown() {
    const ddl = document.getElementById("ddlcasaNumero");
    if (!ddl) return;
    
    for (let i = 1; i <= 65; i++) {
        const num = i.toString().padStart(2, '0');
        ddl.innerHTML += `<option value="FF-${num}">FF-${num}</option>`;
    }
}

// Función para configurar la replicación de dropdown a textbox
function setupDropdownReplication(dropdownId, textboxId) {
    var select = document.getElementById(dropdownId);
    var input = document.getElementById(textboxId);
    
    if (select && input) {
        select.addEventListener('change', function() {
            input.value = select.options[select.selectedIndex].text;
        });
        
        // Inicializar con el valor por defecto si existe
        if (select.selectedIndex >= 0) {
            input.value = select.options[select.selectedIndex].text;
        }
    } else {
        console.error('No se encontraron los controles: ' + dropdownId + ' o ' + textboxId);
    }
}

// Establecer fechas por defecto
function setDefaultDates() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('fechaReserva').value = formattedDate;
    
    // Establecer fecha de contrato para 7 días después
    const contractDate = new Date();
    contractDate.setDate(today.getDate() + 7);
    document.getElementById('fechaContrato').value = contractDate.toISOString().split('T')[0];
}

// Configurar checkbox de descuento
function setupDiscountCheckbox() {
    const checkbox = document.getElementById('chbxAplicar');
    const panel = document.getElementById('pnlMensajeDescuento');
    
    if (!checkbox || !panel) return;
    
    checkbox.addEventListener('change', function() {
        panel.style.display = this.checked ? 'block' : 'none';
    });
    
    // Inicializar estado del panel
    panel.style.display = checkbox.checked ? 'block' : 'none';
}

// Configurar evento para actualizar campos según la casa seleccionada
function setupCasaChangeHandler() {
    const ddlcasaNumero = document.getElementById('ddlcasaNumero');
    const txtlote = document.getElementById('txtlote');
    
    if (!ddlcasaNumero || !txtlote) return;
    
    ddlcasaNumero.addEventListener('change', function() {
        var fincaValue = this.value;
        
        // Extraer el número del formato "FF-XX"
        var numeroFinca = parseInt(fincaValue.replace('FF-', ''), 10);
        
        // Validar que sea un número válido
        if (isNaN(numeroFinca)) {
            txtlote.value = "";
            return;
        }
        
        // Lógica condicional usando comparaciones numéricas
        if (numeroFinca === 1) {
            txtlote.value = "110 m²";
        } else if (numeroFinca >= 2 && numeroFinca <= 7) {
            txtlote.value = "119 m²";
        } else if (numeroFinca >= 8 && numeroFinca <= 10) {
            txtlote.value = "110 m²";
        } else if (numeroFinca >= 11 && numeroFinca <= 15) {
            txtlote.value = "119 m²";
        } else if (numeroFinca >= 16 && numeroFinca <= 16) {
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
    
    // Si hay un valor preseleccionado, actualizar el lote
    if (ddlcasaNumero.value) {
        ddlcasaNumero.dispatchEvent(new Event('change'));
    }
}

// Funciones para navegación entre campos de dirección
function moveToNext(currentInput, event) {
    const nextInput = document.getElementById('txtDireccion2');
    
    // Solo saltar al siguiente campo cuando se alcanza el máximo de caracteres
    if (currentInput.value.length >= currentInput.maxLength) {
        nextInput.focus();
    }
}

function moveToPrevious(currentInput, event) {
    const prevInput = document.getElementById('txtDireccion');
    
    // Si se presiona Backspace al inicio del segundo input
    if (event.key === 'Backspace' && currentInput.selectionStart === 0 && currentInput.value === '') {
        event.preventDefault();
        prevInput.focus();
        prevInput.selectionStart = prevInput.value.length;
        prevInput.selectionEnd = prevInput.value.length;
    }
}

// Función para limpiar el formulario
function resetForm() {
    if (confirm('¿Está seguro que desea limpiar todo el formulario? Se perderán todos los datos ingresados.')) {
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.type !== 'checkbox' && element.type !== 'radio') {
                element.value = '';
            } else {
                element.checked = false;
            }
        });
        
        // Restablecer fechas
        setDefaultDates();
        
        // Restablecer panel de descuento
        document.getElementById('pnlMensajeDescuento').style.display = 'none';
        
        // Restablecer campo de lote
        document.getElementById('txtlote').value = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    
    // 🔹 Listas con los datos
    const dias = Array.from({length: 31}, (_, i) => (i + 1).toString());
    
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const añoActual = new Date().getFullYear();
    const anios = Array.from({length: 10}, (_, i) => (añoActual - 2 + i).toString()); 
    // Genera desde (añoActual-2) hasta (añoActual+7), ajusta según necesites

    // 🔹 Función para llenar un select desde un array
    function llenarSelect(idSelect, opciones, valorPorDefecto = null) {
        const select = document.getElementById(idSelect);
        if (!select) return;
        
        // Conservar la primera opción (placeholder)
        const placeholder = select.firstElementChild;
        select.innerHTML = '';
        if (placeholder) select.appendChild(placeholder);
        
        // Agregar opciones
        opciones.forEach(opcion => {
            const option = document.createElement('option');
            option.value = opcion;
            option.textContent = opcion;
            select.appendChild(option);
        });
        
        // Seleccionar valor por defecto si existe
        if (valorPorDefecto !== null && select.querySelector(`option[value="${valorPorDefecto}"]`)) {
            select.value = valorPorDefecto;
        }
    }

    // 🔹 Obtener fecha actual
    const hoy = new Date();
    const diaHoy = hoy.getDate().toString();
    const mesHoy = meses[hoy.getMonth()]; // 0 = Enero
    const anoHoy = hoy.getFullYear().toString();

    // 🔹 Llenar dropdowns y seleccionar fecha actual
    llenarSelect('ddldia', dias, diaHoy);
    llenarSelect('ddlmes', meses, mesHoy);
    llenarSelect('ddlano', anios, anoHoy);

});

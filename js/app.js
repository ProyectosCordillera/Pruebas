// ============================================
// ESTADO GLOBAL
// ============================================
let datosObra = null;
let datosProceso = null;
let resultadoAnalisis = null;

// ============================================
// UTILIDADES
// ============================================
const formatearMonto = (n) => {
    if (n === null || n === undefined || isNaN(n)) return '0.00';
    return new Intl.NumberFormat('es-CR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n);
};

const parsearMonto = (str) => {
    if (!str) return 0;
    // Limpiar: quitar comas, espacios, símbolos de moneda
    const limpio = String(str).replace(/[₡,\s]/g, '').trim();
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
};

const log = (msg, data) => {
    console.log(`[Analizador] ${msg}`, data !== undefined ? data : '');
};

// ============================================
// PARSER: OBRA.TXT (CORREGIDO PARA FORMATO REAL)
// ============================================
function parsearObra(texto) {
    log('Iniciando parseo de obra.txt');
    const lineas = texto.split('\n').filter(l => l.trim());
    log(`Total líneas en obra: ${lineas.length}`);
    
    const categorias = [];
    let categoriaActual = null;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        const campos = linea.split('\t');
        
        // Buscar el índice donde está "Monto Total" (el header se repite en cada línea)
        const idxMontoTotal = campos.findIndex(c => c && c.trim() === 'Monto Total');
        
        if (idxMontoTotal < 0) {
            log(`Línea ${i} sin "Monto Total": ${linea.substring(0, 50)}`);
            continue;
        }
        
        // Después de "Monto Total" viene el contenido variable
        const resto = campos.slice(idxMontoTotal + 1).map(c => c && c.trim());
        
        // Detectar si es línea de categoría o de movimiento
        // Categoría: empieza con código numérico seguido de nombre en texto
        // Movimiento: empieza con SALIDA, SALIDA M.O., o DEVOLUCIÓN
        
        const primerCampo = resto[0];
        
        if (['SALIDA', 'SALIDA M.O.', 'DEVOLUCIÓN', 'DEVOLUCIÃ"ÓN', 'DEVOLUCIÃ“N'].includes(primerCampo)) {
            // Es un MOVIMIENTO
            // Formato: TIPO | CODIGO | FECHA | CANTIDAD | UNIDAD | MONTO_TOTAL | MONTO_UNITARIO
            const tipo = primerCampo;
            const codigo = resto[1];
            const fecha = resto[2];
            const cantidad = parsearMonto(resto[3]);
            const unidad = resto[4];
            const montoTotal = parsearMonto(resto[5]);
            
            log(`  Movimiento: ${tipo} #${codigo} fecha=${fecha} monto=${montoTotal}`);
            
            if (categoriaActual) {
                categoriaActual.movimientos.push({
                    tipo, codigo, fecha, cantidad, unidad, montoTotal
                });
            } else {
                log(`  ⚠️ Movimiento sin categoría previa: #${codigo}`);
            }
        } else if (/^\d+$/.test(primerCampo)) {
            // Es una CATEGORÍA
            // Formato: CODIGO | NOMBRE | CANTIDAD | UNIDAD | MONTO_UNITARIO | MONTO_TOTAL
            const codigo = primerCampo;
            const nombre = resto[1];
            const cantidad = parsearMonto(resto[2]);
            const unidad = resto[3];
            const montoUnitario = parsearMonto(resto[4]);
            const montoTotal = parsearMonto(resto[5]);
            
            log(`  Categoría: ${codigo} - ${nombre} (total: ${montoTotal})`);
            
            categoriaActual = {
                codigo,
                nombre,
                cantidad,
                unidad,
                montoUnitario,
                montoTotal,
                movimientos: []
            };
            categorias.push(categoriaActual);
        }
    }

    const totalGeneral = categorias.reduce((s, c) => s + c.montoTotal, 0);
    log(`Parseo obra completado: ${categorias.length} categorías, total: ${totalGeneral}`);
    
    return { categorias, totalGeneral };
}

// ============================================
// PARSER: PROCESO.TXT (CORREGIDO PARA FORMATO REAL)
// ============================================
function parsearProceso(texto) {
    log('Iniciando parseo de proceso.txt');
    const lineas = texto.split('\n').filter(l => l.trim());
    log(`Total líneas en proceso: ${lineas.length}`);
    
    const asientos = [];
    let totalDebitos = 0, totalCreditos = 0, saldoFinal = 0;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        const campos = linea.split('\t');
        
        // Buscar el índice donde está "Saldo" (el header se repite en cada línea)
        const idxSaldo = campos.findIndex(c => c && c.trim() === 'Saldo');
        
        if (idxSaldo < 0) {
            log(`Línea ${i} sin "Saldo": ${linea.substring(0, 50)}`);
            continue;
        }
        
        // Después de "Saldo" viene el contenido variable
        const resto = campos.slice(idxSaldo + 1).map(c => c && c.trim());
        
        // Detectar tipo de línea
        const primerCampo = resto[0];
        
        // Línea de totales de la cuenta
        if (primerCampo === '06-02-01-04-01') {
            // Formato: CODIGO | DESCRIPCION | DEBITOS | CREDITOS | SALDO
            totalDebitos = parsearMonto(resto[2]);
            totalCreditos = parsearMonto(resto[3]);
            saldoFinal = parsearMonto(resto[4]);
            log(`  Totales cuenta: deb=${totalDebitos} cred=${totalCreditos} saldo=${saldoFinal}`);
            continue;
        }
        
        // Línea de asiento: debe empezar con fecha DD-MM-YYYY
        if (/^\d{2}-\d{2}-\d{4}$/.test(primerCampo)) {
            const fecha = primerCampo;
            const numero = resto[1];
            const descripcion = resto[2];
            const debitos = parsearMonto(resto[3]);
            const creditos = parsearMonto(resto[4]);
            const saldo = parsearMonto(resto[5]);
            
            log(`  Asiento: ${fecha} #${numero} - ${descripcion.substring(0, 40)}... deb=${debitos} cred=${creditos}`);
            
            asientos.push({
                fecha, numero, descripcion, debitos, creditos, saldo
            });
        }
    }

    log(`Parseo proceso completado: ${asientos.length} asientos, saldo final: ${saldoFinal}`);
    
    return { asientos, totalDebitos, totalCreditos, saldoFinal };
}

// ============================================
// MOTOR DE COMPARACIÓN
// ============================================
function compararArchivos(obra, proceso) {
    log('Iniciando comparación...');
    const reqObra = new Map();
    
    // Extraer requisiciones de obra
    for (const cat of obra.categorias) {
        for (const mov of cat.movimientos) {
            const key = mov.codigo;
            if (!reqObra.has(key)) {
                reqObra.set(key, {
                    codigo: mov.codigo,
                    tipo: mov.tipo,
                    fecha: mov.fecha,
                    categoria: cat.nombre,
                    montoObra: 0,
                    montoProceso: 0
                });
            }
            reqObra.get(key).montoObra += mov.montoTotal;
        }
    }

    log(`Requisiciones en obra: ${reqObra.size}`);

    // Extraer requisiciones de proceso
    for (const asiento of proceso.asientos) {
        const match = asiento.descripcion.match(/REQUISICION #(\d+)|DEVOLUCION #(\d+)/i);
        if (match) {
            const codigo = match[1] || match[2];
            const esDevolucion = /DEVOLUCION/i.test(asiento.descripcion);
            const monto = esDevolucion ? asiento.creditos : asiento.debitos;
            const montoConSigno = esDevolucion ? -monto : monto;

            if (reqObra.has(codigo)) {
                reqObra.get(codigo).montoProceso += montoConSigno;
            } else {
                reqObra.set(codigo, {
                    codigo,
                    tipo: esDevolucion ? 'DEVOLUCIÓN' : 'SALIDA',
                    fecha: asiento.fecha,
                    categoria: 'Sin categoría en obra',
                    montoObra: 0,
                    montoProceso: montoConSigno
                });
            }
        }
    }

    log(`Total requisiciones únicas: ${reqObra.size}`);

    // Clasificar resultados
    const coincidencias = [];
    const diferencias = [];
    let totalDiferencia = 0;

    for (const [_, req] of reqObra) {
        req.diferencia = Math.abs(req.montoObra - req.montoProceso);
        if (req.diferencia < 0.02) {
            coincidencias.push(req);
        } else {
            diferencias.push(req);
            totalDiferencia += (req.montoProceso - req.montoObra);
        }
    }

    log(`Coincidencias: ${coincidencias.length}, Diferencias: ${diferencias.length}`);

    // Asientos especiales (sin requisición)
    const asientosEspeciales = proceso.asientos.filter(a => 
        !/REQUISICION|DEVOLUCION/i.test(a.descripcion)
    );
    log(`Asientos especiales: ${asientosEspeciales.length}`);

    return {
        requisiciones: Array.from(reqObra.values()),
        coincidencias,
        diferencias,
        totalDiferencia,
        asientosEspeciales,
        totalObra: obra.totalGeneral,
        totalProceso: proceso.saldoFinal
    };
}

// ============================================
// RENDERIZADO
// ============================================
function renderizarResultados(resultado) {
    const divResultados = document.getElementById('resultados');
    if (!divResultados) {
        alert('Error: no se encontró el contenedor de resultados. Revisa el HTML.');
        return;
    }
    
    divResultados.style.display = 'block';
    divResultados.classList.add('animacion-carga');

    document.getElementById('totalObra').textContent = '₡' + formatearMonto(resultado.totalObra);
    document.getElementById('totalProceso').textContent = '₡' + formatearMonto(resultado.totalProceso);
    document.getElementById('totalDiferencia').textContent = '' + formatearMonto(resultado.totalDiferencia);
    document.getElementById('totalCuadradas').textContent = 
        `${resultado.coincidencias.length} / ${resultado.requisiciones.length}`;

    const cardDiff = document.getElementById('cardDiferencia');
    cardDiff.className = 'card shadow-sm h-100 ' + 
        (Math.abs(resultado.totalDiferencia) < 1 ? 'text-bg-success' : 'text-bg-warning');

    // Resumen
    document.getElementById('contenidoResumen').innerHTML = `
        <div class="alerta-info mb-3">
            <h6><i class="bi bi-info-circle"></i> Resumen del Análisis</h6>
            <p class="mb-1">• <strong>Total reportado en OBRA:</strong> ₡${formatearMonto(resultado.totalObra)}</p>
            <p class="mb-1">• <strong>Saldo final en PROCESO:</strong> ₡${formatearMonto(resultado.totalProceso)}</p>
            <p class="mb-1">• <strong>Diferencia global:</strong> ₡${formatearMonto(resultado.totalDiferencia)}</p>
            <p class="mb-0">• <strong>Asientos especiales (planillas, CCSS, intereses):</strong> 
                ${resultado.asientosEspeciales.length}</p>
        </div>
        ${resultado.asientosEspeciales.length > 0 ? `
        <h6 class="mt-4">Asientos sin requisición directa:</h6>
        <div class="table-responsive">
            <table class="table table-sm table-striped">
                <thead><tr><th>Fecha</th><th>Descripción</th><th>Débitos</th><th>Créditos</th></tr></thead>
                <tbody>
                    ${resultado.asientosEspeciales.map(a => `
                        <tr>
                            <td>${a.fecha}</td>
                            <td>${a.descripcion}</td>
                            <td class="monto-positivo">${a.debitos ? '₡'+formatearMonto(a.debitos) : '-'}</td>
                            <td class="monto-negativo">${a.creditos ? ''+formatearMonto(a.creditos) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : ''}
    `;

    // Coincidencias
    document.getElementById('contenidoCuadradas').innerHTML = `
        <div class="alert alert-success">
            <i class="bi bi-check-circle"></i> 
            <strong>${resultado.coincidencias.length}</strong> requisiciones cuadran exactamente.
        </div>
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead><tr>
                    <th>Código</th><th>Tipo</th><th>Fecha</th><th>Categoría</th>
                    <th class="text-end">Monto Obra</th><th class="text-end">Monto Proceso</th>
                </tr></thead>
                <tbody>
                    ${resultado.coincidencias.map(r => `
                        <tr>
                            <td><strong>#${r.codigo}</strong></td>
                            <td>${r.tipo}</td>
                            <td>${r.fecha}</td>
                            <td>${r.categoria}</td>
                            <td class="text-end">₡${formatearMonto(r.montoObra)}</td>
                            <td class="text-end">₡${formatearMonto(r.montoProceso)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Diferencias
    document.getElementById('contenidoDiferencias').innerHTML = resultado.diferencias.length === 0 ?
        `<div class="alert alert-success"><i class="bi bi-check-circle"></i> ¡No hay diferencias!</div>` :
        `<div class="alerta-danger mb-3">
            <i class="bi bi-exclamation-triangle"></i> 
            <strong>${resultado.diferencias.length}</strong> requisiciones presentan diferencias.
        </div>
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead><tr>
                    <th>Código</th><th>Tipo</th><th>Fecha</th><th>Categoría</th>
                    <th class="text-end">Obra</th><th class="text-end">Proceso</th>
                    <th class="text-end">Diferencia</th>
                </tr></thead>
                <tbody>
                    ${resultado.diferencias.map(r => `
                        <tr>
                            <td><strong>#${r.codigo}</strong></td>
                            <td>${r.tipo}</td>
                            <td>${r.fecha}</td>
                            <td>${r.categoria}</td>
                            <td class="text-end">₡${formatearMonto(r.montoObra)}</td>
                            <td class="text-end">₡${formatearMonto(r.montoProceso)}</td>
                            <td class="text-end monto-negativo">${formatearMonto(r.diferencia)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    
    log('Resultados renderizados en el DOM');
}

// ============================================
// EXPORTACIÓN
// ============================================
function exportarCSV() {
    if (!resultadoAnalisis) return;
    let csv = 'Codigo,Tipo,Fecha,Categoria,Monto Obra,Monto Proceso,Diferencia,Estado\n';
    for (const r of resultadoAnalisis.requisiciones) {
        const estado = r.diferencia < 0.02 ? 'OK' : 'DIFERENCIA';
        csv += `${r.codigo},"${r.tipo}","${r.fecha}","${r.categoria}",${r.montoObra.toFixed(2)},${r.montoProceso.toFixed(2)},${r.diferencia.toFixed(2)},${estado}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analisis_contable.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function exportarJSON() {
    if (!resultadoAnalisis) return;
    const blob = new Blob([JSON.stringify(resultadoAnalisis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analisis_contable.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    log('=== DOM Cargado ===');
    
    const fileObra = document.getElementById('fileObra');
    const fileProceso = document.getElementById('fileProceso');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnExportarCSV = document.getElementById('btnExportarCSV');
    const btnExportarJSON = document.getElementById('btnExportarJSON');
    const divResultados = document.getElementById('resultados');

    // Verificar que todos los elementos existan
    const elementos = { fileObra, fileProceso, btnAnalizar, btnLimpiar, divResultados };
    for (const [nombre, elem] of Object.entries(elementos)) {
        if (!elem) {
            console.error(`❌ Elemento "${nombre}" NO encontrado en el DOM`);
        } else {
            log(`✅ Elemento "${nombre}" encontrado`);
        }
    }

    if (!fileObra || !fileProceso || !btnAnalizar) {
        alert('Error: No se encontraron los elementos necesarios en el HTML. Revisa los IDs.');
        return;
    }

    // Validar archivos
    function validarArchivos() {
        const archivosListos = fileObra.files.length > 0 && fileProceso.files.length > 0;
        btnAnalizar.disabled = !archivosListos;
        log(`Validación: Obra=${fileObra.files.length} archivos, Proceso=${fileProceso.files.length} archivos -> Botón ${archivosListos ? 'HABILITADO' : 'DESHABILITADO'}`);
    }

    fileObra.addEventListener('change', () => {
        log(`Archivo obra seleccionado: ${fileObra.files[0]?.name} (${fileObra.files[0]?.size} bytes)`);
        validarArchivos();
    });
    
    fileProceso.addEventListener('change', () => {
        log(`Archivo proceso seleccionado: ${fileProceso.files[0]?.name} (${fileProceso.files[0]?.size} bytes)`);
        validarArchivos();
    });

    // Botón Analizar
    btnAnalizar.addEventListener('click', async function() {
        log('🔵 Click en Analizar');
        
        try {
            if (!fileObra.files[0] || !fileProceso.files[0]) {
                alert('Por favor selecciona ambos archivos primero.');
                return;
            }

            btnAnalizar.disabled = true;
            btnAnalizar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Analizando...';

            log('Leyendo archivos...');
            const textoObra = await fileObra.files[0].text();
            const textoProceso = await fileProceso.files[0].text();

            log(`Texto obra: ${textoObra.length} caracteres, ${textoObra.split('\n').length} líneas`);
            log(`Texto proceso: ${textoProceso.length} caracteres, ${textoProceso.split('\n').length} líneas`);

            log('Parseando obra...');
            datosObra = parsearObra(textoObra);
            log(`Resultado obra: ${datosObra.categorias.length} categorías`);

            log('Parseando proceso...');
            datosProceso = parsearProceso(textoProceso);
            log(`Resultado proceso: ${datosProceso.asientos.length} asientos`);

            log('Comparando...');
            resultadoAnalisis = compararArchivos(datosObra, datosProceso);

            log('Renderizando...');
            renderizarResultados(resultadoAnalisis);
            
            log('✅ Análisis completado exitosamente');
        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error al procesar: ' + error.message + '\n\nRevisa la consola (F12) para más detalles.');
        } finally {
            btnAnalizar.disabled = false;
            btnAnalizar.innerHTML = '<i class="bi bi-gear"></i> Analizar Archivos';
        }
    });

    // Botón Limpiar
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            log('Limpiando todo...');
            fileObra.value = '';
            fileProceso.value = '';
            if (divResultados) divResultados.style.display = 'none';
            btnAnalizar.disabled = true;
            datosObra = null;
            datosProceso = null;
            resultadoAnalisis = null;
            log('✅ Limpieza completada');
        });
    }

    // Exportación
    if (btnExportarCSV) btnExportarCSV.addEventListener('click', exportarCSV);
    if (btnExportarJSON) btnExportarJSON.addEventListener('click', exportarJSON);

    log('=== Inicialización completada ===');
});

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
    const limpio = String(str).replace(/[₡,\s]/g, '').trim();
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
};

// ============================================
// PARSER: OBRA.TXT (CORREGIDO)
// ============================================
function parsearObra(texto) {
    console.log('[OBRA] Iniciando parseo...');
    const lineas = texto.split('\n').filter(l => l.trim());
    console.log(`[OBRA] Total líneas: ${lineas.length}`);
    
    const categorias = [];
    let categoriaActual = null;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        const campos = linea.split('\t');
        
        // Buscar "Monto Total" para encontrar el inicio del contenido variable
        const idxMontoTotal = campos.findIndex(c => c && c.trim() === 'Monto Total');
        if (idxMontoTotal < 0) continue;
        
        // El contenido viene después de "Monto Total"
        const contenido = campos.slice(idxMontoTotal + 1);
        
        // Buscar el primer campo significativo (que no sea info repetida)
        let idxInicio = 0;
        for (let j = 0; j < contenido.length; j++) {
            const val = contenido[j] && contenido[j].trim();
            if (val && !val.includes('COSTOS DE OBRA') && !val.includes('Monto:') && 
                !val.includes('COSTOS DE PROYECTO') && !val.includes('ALTAMIRA') &&
                val !== 'Movimiento' && val !== 'Código' && val !== 'Fecha' &&
                val !== 'Cantidad' && val !== 'Unidad' && val !== 'Monto Total' &&
                val !== 'Monto Unitario' && val !== 'Detalle') {
                idxInicio = j;
                break;
            }
        }
        
        const primerCampo = contenido[idxInicio] && contenido[idxInicio].trim();
        
        if (!primerCampo) continue;
        
        // Detectar si es movimiento o categoría
        if (['SALIDA', 'SALIDA M.O.', 'DEVOLUCIÓN', 'DEVOLUCIÃ"ÓN', 'DEVOLUCIÃ"ÓN'].includes(primerCampo)) {
            // MOVIMIENTO: TIPO | CODIGO | FECHA | CANTIDAD | UNIDAD | MONTO_TOTAL | MONTO_UNITARIO
            const tipo = primerCampo;
            const codigo = contenido[idxInicio + 1] && contenido[idxInicio + 1].trim();
            const fecha = contenido[idxInicio + 2] && contenido[idxInicio + 2].trim();
            const cantidadStr = contenido[idxInicio + 3] && contenido[idxInicio + 3].trim();
            const unidad = contenido[idxInicio + 4] && contenido[idxInicio + 4].trim();
            const montoTotalStr = contenido[idxInicio + 5] && contenido[idxInicio + 5].trim();
            
            const cantidad = parsearMonto(cantidadStr);
            const montoTotal = parsearMonto(montoTotalStr);
            
            if (categoriaActual) {
                categoriaActual.movimientos.push({
                    tipo, codigo, fecha, cantidad, unidad, montoTotal
                });
                console.log(`[OBRA] Movimiento: ${tipo} #${codigo} fecha=${fecha} monto=${montoTotal}`);
            }
        } else if (/^\d+$/.test(primerCampo)) {
            // CATEGORÍA: CODIGO | NOMBRE | CANTIDAD | UNIDAD | MONTO_UNITARIO | MONTO_TOTAL
            const codigo = primerCampo;
            const nombre = contenido[idxInicio + 1] && contenido[idxInicio + 1].trim();
            const cantidadStr = contenido[idxInicio + 2] && contenido[idxInicio + 2].trim();
            const unidad = contenido[idxInicio + 3] && contenido[idxInicio + 3].trim();
            const montoUnitarioStr = contenido[idxInicio + 4] && contenido[idxInicio + 4].trim();
            const montoTotalStr = contenido[idxInicio + 5] && contenido[idxInicio + 5].trim();
            
            const cantidad = parsearMonto(cantidadStr);
            const montoUnitario = parsearMonto(montoUnitarioStr);
            const montoTotal = parsearMonto(montoTotalStr);
            
            categoriaActual = {
                codigo, nombre, cantidad, unidad, montoUnitario, montoTotal, movimientos: []
            };
            categorias.push(categoriaActual);
            console.log(`[OBRA] Categoría: ${codigo} - ${nombre} (total: ${montoTotal})`);
        }
    }

    const totalGeneral = categorias.reduce((s, c) => s + c.montoTotal, 0);
    console.log(`[OBRA] Parseo completado: ${categorias.length} categorías, total: ${totalGeneral}`);
    
    return { categorias, totalGeneral };
}

// ============================================
// PARSER: PROCESO.TXT (CORREGIDO)
// ============================================
function parsearProceso(texto) {
    console.log('[PROCESO] Iniciando parseo...');
    const lineas = texto.split('\n').filter(l => l.trim());
    console.log(`[PROCESO] Total líneas: ${lineas.length}`);
    
    const asientos = [];
    let totalDebitos = 0, totalCreditos = 0, saldoFinal = 0;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        const campos = linea.split('\t');
        
        // Buscar "Saldo" para encontrar el inicio del contenido variable
        const idxSaldo = campos.findIndex(c => c && c.trim() === 'Saldo');
        if (idxSaldo < 0) continue;
        
        // El contenido viene después de "Saldo"
        const contenido = campos.slice(idxSaldo + 1);
        
        // Buscar el primer campo significativo
        let idxInicio = 0;
        for (let j = 0; j < contenido.length; j++) {
            const val = contenido[j] && contenido[j].trim();
            if (val && !val.includes('Total') && !val.includes('Acumulado') && 
                val !== 'Cuenta Contable' && val !== 'Descripción' && 
                val !== 'Débitos' && val !== 'Créditos') {
                idxInicio = j;
                break;
            }
        }
        
        const primerCampo = contenido[idxInicio] && contenido[idxInicio].trim();
        
        if (!primerCampo) continue;
        
        // Línea de totales de la cuenta
        if (primerCampo === '06-02-01-04-01') {
            // CODIGO | DESCRIPCION | DEBITOS | CREDITOS | SALDO
            totalDebitos = parsearMonto(contenido[idxInicio + 2]);
            totalCreditos = parsearMonto(contenido[idxInicio + 3]);
            saldoFinal = parsearMonto(contenido[idxInicio + 4]);
            console.log(`[PROCESO] Totales: deb=${totalDebitos} cred=${totalCreditos} saldo=${saldoFinal}`);
            continue;
        }
        
        // Asiento: FECHA | NUMERO | DESCRIPCION | DEBITOS | CREDITOS | SALDO
        if (/^\d{2}-\d{2}-\d{4}$/.test(primerCampo)) {
            const fecha = primerCampo;
            const numero = contenido[idxInicio + 1] && contenido[idxInicio + 1].trim();
            const descripcion = contenido[idxInicio + 2] && contenido[idxInicio + 2].trim();
            const debitos = parsearMonto(contenido[idxInicio + 3]);
            const creditos = parsearMonto(contenido[idxInicio + 4]);
            const saldo = parsearMonto(contenido[idxInicio + 5]);
            
            asientos.push({
                fecha, numero, descripcion, debitos, creditos, saldo
            });
            console.log(`[PROCESO] Asiento: ${fecha} #${numero} - ${descripcion.substring(0, 40)}...`);
        }
    }

    console.log(`[PROCESO] Parseo completado: ${asientos.length} asientos, saldo final: ${saldoFinal}`);
    
    return { asientos, totalDebitos, totalCreditos, saldoFinal };
}

// ============================================
// MOTOR DE COMPARACIÓN
// ============================================
function compararArchivos(obra, proceso) {
    console.log('[COMPARACIÓN] Iniciando...');
    const reqMap = new Map();
    
    // Extraer de obra
    for (const cat of obra.categorias) {
        for (const mov of cat.movimientos) {
            const key = mov.codigo;
            if (!reqMap.has(key)) {
                reqMap.set(key, {
                    codigo: mov.codigo,
                    tipo: mov.tipo,
                    fecha: mov.fecha,
                    categoria: cat.nombre,
                    montoObra: 0,
                    montoProceso: 0
                });
            }
            reqMap.get(key).montoObra += mov.montoTotal;
        }
    }

    // Extraer de proceso
    for (const asiento of proceso.asientos) {
        const match = asiento.descripcion.match(/REQUISICION #(\d+)|DEVOLUCION #(\d+)/i);
        if (match) {
            const codigo = match[1] || match[2];
            const esDevolucion = /DEVOLUCION/i.test(asiento.descripcion);
            const monto = esDevolucion ? asiento.creditos : asiento.debitos;
            const montoConSigno = esDevolucion ? -monto : monto;

            if (reqMap.has(codigo)) {
                reqMap.get(codigo).montoProceso += montoConSigno;
            } else {
                reqMap.set(codigo, {
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

    const coincidencias = [];
    const diferencias = [];
    let totalDiferencia = 0;

    for (const [_, req] of reqMap) {
        req.diferencia = Math.abs(req.montoObra - req.montoProceso);
        if (req.diferencia < 0.02) {
            coincidencias.push(req);
        } else {
            diferencias.push(req);
            totalDiferencia += (req.montoProceso - req.montoObra);
        }
    }

    const asientosEspeciales = proceso.asientos.filter(a => 
        !/REQUISICION|DEVOLUCION/i.test(a.descripcion)
    );

    console.log(`[COMPARACIÓN] Total: ${reqMap.size}, Coincidencias: ${coincidencias.length}, Diferencias: ${diferencias.length}`);

    return {
        requisiciones: Array.from(reqMap.values()),
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
    console.log('[RENDER] Iniciando...');
    const divResultados = document.getElementById('resultados');
    if (!divResultados) {
        alert('Error: No se encontró el div "resultados"');
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

    document.getElementById('contenidoResumen').innerHTML = `
        <div class="alerta-info mb-3">
            <h6><i class="bi bi-info-circle"></i> Resumen del Análisis</h6>
            <p class="mb-1">• <strong>Total OBRA:</strong> ₡${formatearMonto(resultado.totalObra)}</p>
            <p class="mb-1">• <strong>Total PROCESO:</strong> ₡${formatearMonto(resultado.totalProceso)}</p>
            <p class="mb-1">• <strong>Diferencia:</strong> ₡${formatearMonto(resultado.totalDiferencia)}</p>
            <p class="mb-0">• <strong>Asientos especiales:</strong> ${resultado.asientosEspeciales.length}</p>
        </div>
        ${resultado.asientosEspeciales.length > 0 ? `
        <h6 class="mt-4">Asientos sin requisición:</h6>
        <div class="table-responsive">
            <table class="table table-sm table-striped">
                <thead><tr><th>Fecha</th><th>Descripción</th><th>Débitos</th><th>Créditos</th></tr></thead>
                <tbody>
                    ${resultado.asientosEspeciales.map(a => `
                        <tr>
                            <td>${a.fecha}</td>
                            <td>${a.descripcion}</td>
                            <td class="monto-positivo">${a.debitos ? '₡'+formatearMonto(a.debitos) : '-'}</td>
                            <td class="monto-negativo">${a.creditos ? '₡'+formatearMonto(a.creditos) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : ''}
    `;

    document.getElementById('contenidoCuadradas').innerHTML = `
        <div class="alert alert-success">
            <i class="bi bi-check-circle"></i> 
            <strong>${resultado.coincidencias.length}</strong> requisiciones cuadran.
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

    document.getElementById('contenidoDiferencias').innerHTML = resultado.diferencias.length === 0 ?
        `<div class="alert alert-success"><i class="bi bi-check-circle"></i> ¡Sin diferencias!</div>` :
        `<div class="alerta-danger mb-3">
            <i class="bi bi-exclamation-triangle"></i> 
            <strong>${resultado.diferencias.length}</strong> con diferencias.
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
    
    console.log('[RENDER] Completado');
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
    console.log('=== DOM Cargado ===');
    
    const fileObra = document.getElementById('fileObra');
    const fileProceso = document.getElementById('fileProceso');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnExportarCSV = document.getElementById('btnExportarCSV');
    const btnExportarJSON = document.getElementById('btnExportarJSON');

    if (!fileObra || !fileProceso || !btnAnalizar) {
        console.error('❌ Faltan elementos en el DOM');
        return;
    }

    console.log('✅ Elementos encontrados');

    function validarArchivos() {
        const listos = fileObra.files.length > 0 && fileProceso.files.length > 0;
        btnAnalizar.disabled = !listos;
        console.log(`Archivos: Obra=${fileObra.files.length}, Proceso=${fileProceso.files.length} -> ${listos ? 'HABILITADO' : 'DESHABILITADO'}`);
    }

    fileObra.addEventListener('change', () => {
        console.log(`Archivo obra: ${fileObra.files[0]?.name}`);
        validarArchivos();
    });
    
    fileProceso.addEventListener('change', () => {
        console.log(`Archivo proceso: ${fileProceso.files[0]?.name}`);
        validarArchivos();
    });

    btnAnalizar.addEventListener('click', async function() {
        console.log('🔵 Click en ANALIZAR');
        
        try {
            if (!fileObra.files[0] || !fileProceso.files[0]) {
                alert('Selecciona ambos archivos');
                return;
            }

            btnAnalizar.disabled = true;
            btnAnalizar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Analizando...';

            const textoObra = await fileObra.files[0].text();
            const textoProceso = await fileProceso.files[0].text();

            console.log(`Textos leídos: Obra=${textoObra.length} chars, Proceso=${textoProceso.length} chars`);

            datosObra = parsearObra(textoObra);
            datosProceso = parsearProceso(textoProceso);

            resultadoAnalisis = compararArchivos(datosObra, datosProceso);

            renderizarResultados(resultadoAnalisis);
            
            console.log('✅ Análisis completado');
        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error: ' + error.message);
        } finally {
            btnAnalizar.disabled = false;
            btnAnalizar.innerHTML = '<i class="bi bi-gear"></i> Analizar Archivos';
        }
    });

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            console.log('Limpiando...');
            fileObra.value = '';
            fileProceso.value = '';
            document.getElementById('resultados').style.display = 'none';
            btnAnalizar.disabled = true;
            datosObra = datosProceso = resultadoAnalisis = null;
        });
    }

    if (btnExportarCSV) btnExportarCSV.addEventListener('click', exportarCSV);
    if (btnExportarJSON) btnExportarJSON.addEventListener('click', exportarJSON);

    console.log('=== Inicialización completada ===');
});

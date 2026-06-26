// ============================================
// ESTADO GLOBAL
// ============================================
let datosObra = null;
let datosProceso = null;
let resultadoAnalisis = null;
let metadatosObra = null;

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
// EXTRAER METADATOS
// ============================================
function extraerMetadatos(texto) {
    const primeraLinea = texto.split('\n')[0];
    if (!primeraLinea) return null;
    
    const campos = primeraLinea.split('\t');
    
    const idxProyecto = campos.findIndex(c => c && c.trim() === 'Proyecto:');
    const idxObra = campos.findIndex(c => c && c.trim() === 'Obra:');
    
    const proyecto = idxProyecto >= 0 ? campos[idxProyecto + 1] : 'N/A';
    const obra = idxObra >= 0 ? campos[idxObra + 1] : 'N/A';
    
    let nombreObra = 'N/A';
    if (idxObra >= 0 && campos[idxObra + 2]) {
        nombreObra = campos[idxObra + 2].replace(/COSTOS DE OBRA\s*/i, '').trim();
        if (!nombreObra) nombreObra = campos[idxObra + 2].trim();
    }
    
    return {
        proyecto: proyecto ? proyecto.trim() : 'N/A',
        obra: obra ? obra.trim() : 'N/A',
        nombreObra: nombreObra || 'N/A'
    };
}

function actualizarTituloProyecto(meta) {
    const spanInfo = document.getElementById('infoProyecto');
    if (!spanInfo || !meta) return;
    
    spanInfo.innerHTML = `
        <i class="bi bi-building"></i> 
        Proyecto <strong>${meta.proyecto}</strong> - 
        Obra <strong>${meta.obra}</strong> (${meta.nombreObra})
    `;
    
    document.title = `Analizador Contable - Proyecto ${meta.proyecto} - Obra ${meta.obra}`;
}

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
        
        // Buscar "Monto Total\t" para encontrar el inicio del contenido variable
        const idxMontoTotal = linea.indexOf('Monto Total\t');
        if (idxMontoTotal < 0) continue;
        
        // Buscar "\tMovimiento\t" o la segunda "Monto Total" para encontrar el final
        let idxFin = linea.indexOf('\tMovimiento\t', idxMontoTotal);
        if (idxFin < 0) {
            idxFin = linea.indexOf('Monto Total', idxMontoTotal + 1);
        }
        if (idxFin < 0) continue;
        
        // Extraer contenido variable
        const contenidoVariable = linea.substring(idxMontoTotal + 'Monto Total\t'.length, idxFin);
        const campos = contenidoVariable.split('\t').map(c => c.trim()).filter(c => c);
        
        if (campos.length < 6) continue;
        
        const primerCampo = campos[0];
        
        // Lista de tipos de movimiento
        const tiposMovimiento = ['SALIDA', 'SALIDA M.O.', 'DEVOLUCIÓN', 'DEVOLUCION', 
                                  'DEVOLUCIÃ"N', 'DEVOLUCIÃ"ÓN', 'DEVOLUCIÃ“N'];
        
        if (tiposMovimiento.includes(primerCampo)) {
            // Es un MOVIMIENTO
            const tipo = primerCampo;
            const codigo = campos[1];
            const fecha = campos[2];
            const cantidad = parsearMonto(campos[3]);
            const unidad = campos[4];
            
            // Para SALIDA M.O. el monto total está en campos[6]
            // Para SALIDA normal y DEVOLUCIÓN está en campos[5]
            let montoTotal;
            if (tipo === 'SALIDA M.O.') {
                montoTotal = parsearMonto(campos[6]);
            } else {
                montoTotal = parsearMonto(campos[5]);
            }
            
            console.log(`[OBRA] Movimiento: ${tipo} #${codigo} fecha=${fecha} monto=${montoTotal}`);
            
            if (categoriaActual) {
                categoriaActual.movimientos.push({
                    tipo, codigo, fecha, cantidad, unidad, montoTotal
                });
            }
        } else if (/^\d+$/.test(primerCampo)) {
            // Es una CATEGORÍA
            const codigo = primerCampo;
            const nombre = campos[1];
            const cantidad = parsearMonto(campos[2]);
            const unidad = campos[3];
            const montoUnitario = parsearMonto(campos[4]);
            const montoTotal = parsearMonto(campos[5]);
            
            console.log(`[OBRA] Categoría: ${codigo} - ${nombre} (total: ${montoTotal})`);
            
            categoriaActual = {
                codigo, nombre, cantidad, unidad, montoUnitario, montoTotal, movimientos: []
            };
            categorias.push(categoriaActual);
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
        
        // Buscar "Saldo\t" para encontrar el inicio del contenido variable
        const idxSaldo = linea.indexOf('Saldo\t');
        if (idxSaldo < 0) continue;
        
        // Buscar "\tTotal Saldo Anterior:" para encontrar el final
        const idxFin = linea.indexOf('\tTotal Saldo Anterior:');
        if (idxFin < 0) continue;
        
        // Extraer contenido variable
        const contenidoVariable = linea.substring(idxSaldo + 'Saldo\t'.length, idxFin);
        const campos = contenidoVariable.split('\t').map(c => c.trim());
        
        if (campos.length < 5) continue;
        
        const primerCampo = campos[0];
        
        // Línea de totales de la cuenta
        if (primerCampo === '06-02-01-04-01') {
            // CODIGO | DESCRIPCION | DEBITOS | CREDITOS | SALDO
            totalDebitos = parsearMonto(campos[2]);
            totalCreditos = parsearMonto(campos[3]);
            saldoFinal = parsearMonto(campos[4]);
            console.log(`[PROCESO] Totales: deb=${totalDebitos} cred=${totalCreditos} saldo=${saldoFinal}`);
            continue;
        }
        
        // Asiento: FECHA | NUMERO | DESCRIPCION | [vacío] | DEBITOS | CREDITOS | SALDO
        if (/^\d{2}-\d{2}-\d{4}$/.test(primerCampo)) {
            const fecha = primerCampo;
            const numero = campos[1];
            const descripcion = campos[2];
            // campos[3] está vacío, los montos están en [4], [5], [6]
            const debitos = parsearMonto(campos[4]);
            const creditos = parsearMonto(campos[5]);
            const saldo = parsearMonto(campos[6]);
            
            console.log(`[PROCESO] Asiento: ${fecha} #${numero} - ${descripcion.substring(0, 40)}... deb=${debitos} cred=${creditos}`);
            
            asientos.push({
                fecha, numero, descripcion, debitos, creditos, saldo
            });
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

    console.log(`[COMPARACIÓN] Requisiciones en obra: ${reqMap.size}`);

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

    console.log(`[COMPARACIÓN] Total requisiciones únicas: ${reqMap.size}`);

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

    console.log(`[COMPARACIÓN] Coincidencias: ${coincidencias.length}, Diferencias: ${diferencias.length}`);

    const asientosEspeciales = proceso.asientos.filter(a => 
        !/REQUISICION|DEVOLUCION/i.test(a.descripcion)
    );
    console.log(`[COMPARACIÓN] Asientos especiales: ${asientosEspeciales.length}`);

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
    document.getElementById('totalDiferencia').textContent = '₡' + formatearMonto(resultado.totalDiferencia);
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
                            <td class="text-end monto-negativo">₡${formatearMonto(r.diferencia)}</td>
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

            metadatosObra = extraerMetadatos(textoObra);
            if (metadatosObra) {
                actualizarTituloProyecto(metadatosObra);
            }

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
            metadatosObra = null;
            
            const spanInfo = document.getElementById('infoProyecto');
            if (spanInfo) {
                spanInfo.innerHTML = 'Sin archivos cargados';
            }
            document.title = 'Analizador Contable';
        });
    }

    if (btnExportarCSV) btnExportarCSV.addEventListener('click', exportarCSV);
    if (btnExportarJSON) btnExportarJSON.addEventListener('click', exportarJSON);

    console.log('=== Inicialización completada ===');
});

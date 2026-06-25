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
    if (n === null || n === undefined || isNaN(n)) return '-';
    return new Intl.NumberFormat('es-CR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n);
};

const parsearMonto = (str) => {
    if (!str) return 0;
    const limpio = String(str).replace(/[^\d.-]/g, '');
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
};

// ============================================
// PARSER: OBRA.TXT (CORREGIDO)
// ============================================
function parsearObra(texto) {
    const lineas = texto.split('\n').filter(l => l.trim());
    const categorias = [];
    let categoriaActual = null;

    for (const linea of lineas) {
        const campos = linea.split('\t').map(c => c.trim());
        
        // Buscar el tipo de registro (SALIDA, SALIDA M.O., DEVOLUCIÓN, o categoría)
        const idxTipo = campos.findIndex(c => 
            c === 'SALIDA' || c === 'SALIDA M.O.' || c === 'DEVOLUCIÓN' || c === 'DEVOLUCIÃ"ÓN'
        );

        if (idxTipo > 0) {
            // Es una línea de movimiento
            const tipo = campos[idxTipo];
            const codigo = campos[idxTipo + 1];
            const fecha = campos[idxTipo + 2];
            const cantidad = parsearMonto(campos[idxTipo + 3]);
            const unidad = campos[idxTipo + 4];
            const montoTotal = parsearMonto(campos[idxTipo + 5]);

            if (categoriaActual) {
                categoriaActual.movimientos.push({
                    tipo, codigo, fecha, cantidad, unidad, montoTotal
                });
            }
        } else {
            // Es una línea de categoría - buscar el código numérico después de "Monto Total"
            const idxMontoTotal = campos.findIndex(c => c === 'Monto Total');
            if (idxMontoTotal > 0) {
                const codigo = campos[idxMontoTotal + 1];
                const nombre = campos[idxMontoTotal + 2];
                const cantidad = parsearMonto(campos[idxMontoTotal + 3]);
                const unidad = campos[idxMontoTotal + 4];
                const montoUnitario = parsearMonto(campos[idxMontoTotal + 5]);
                const montoTotal = parsearMonto(campos[idxMontoTotal + 6]);

                // Solo crear categoría si el código es numérico y no es un header
                if (/^\d+$/.test(codigo) && !['Movimiento', 'Código', 'Fecha'].includes(codigo)) {
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
        }
    }

    const totalGeneral = categorias.reduce((s, c) => s + c.montoTotal, 0);
    return { categorias, totalGeneral };
}

// ============================================
// PARSER: PROCESO.TXT (CORREGIDO)
// ============================================
function parsearProceso(texto) {
    const lineas = texto.split('\n').filter(l => l.trim());
    const asientos = [];
    let totalDebitos = 0, totalCreditos = 0, saldoFinal = 0;

    for (const linea of lineas) {
        const campos = linea.split('\t').map(c => c.trim());
        
        // Buscar la fecha (formato DD-MM-YYYY)
        const idxFecha = campos.findIndex(c => /^\d{2}-\d{2}-\d{4}$/.test(c));
        
        if (idxFecha > 0) {
            const fecha = campos[idxFecha];
            const numero = campos[idxFecha + 1];
            const descripcion = campos[idxFecha + 2];
            
            // Buscar Débitos, Créditos y Saldo después de la descripción
            // La estructura es: ...descripcion [vacío] debitos creditos saldo...
            const debitos = parsearMonto(campos[idxFecha + 4]);
            const creditos = parsearMonto(campos[idxFecha + 5]);
            const saldo = parsearMonto(campos[idxFecha + 6]);

            asientos.push({
                fecha,
                numero,
                descripcion,
                debitos,
                creditos,
                saldo
            });
        } else if (campos[0] === '06-02-01-04-01') {
            // Línea de totales de la cuenta
            totalDebitos = parsearMonto(campos[2]);
            totalCreditos = parsearMonto(campos[3]);
            saldoFinal = parsearMonto(campos[4]);
        }
    }

    return { asientos, totalDebitos, totalCreditos, saldoFinal };
}

// ============================================
// MOTOR DE COMPARACIÓN
// ============================================
function compararArchivos(obra, proceso) {
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

    // Extraer requisiciones de proceso
    for (const asiento of proceso.asientos) {
        const match = asiento.descripcion.match(/REQUISICION #(\d+)|DEVOLUCION #(\d+)/);
        if (match) {
            const codigo = match[1] || match[2];
            const esDevolucion = asiento.descripcion.includes('DEVOLUCION');
            const monto = esDevolucion ? -asiento.creditos : asiento.debitos;

            if (reqObra.has(codigo)) {
                reqObra.get(codigo).montoProceso += monto;
            } else {
                reqObra.set(codigo, {
                    codigo,
                    tipo: esDevolucion ? 'DEVOLUCIÓN' : 'SALIDA',
                    fecha: asiento.fecha,
                    categoria: 'Sin categoría en obra',
                    montoObra: 0,
                    montoProceso: monto
                });
            }
        }
    }

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

    // Asientos especiales
    const asientosEspeciales = proceso.asientos.filter(a => 
        !a.descripcion.includes('REQUISICION') && 
        !a.descripcion.includes('DEVOLUCION')
    );

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
    document.getElementById('resultados').style.display = 'block';
    document.getElementById('resultados').classList.add('animacion-carga');

    document.getElementById('totalObra').textContent = '₡' + formatearMonto(resultado.totalObra);
    document.getElementById('totalProceso').textContent = '₡' + formatearMonto(resultado.totalProceso);
    document.getElementById('totalDiferencia').textContent = '₡' + formatearMonto(resultado.totalDiferencia);
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
            <p class="mb-1">• <strong>Diferencia global:</strong> ${formatearMonto(resultado.totalDiferencia)}</p>
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
                            <td class="monto-negativo">${a.creditos ? '₡'+formatearMonto(a.creditos) : '-'}</td>
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
// INICIALIZACIÓN - EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado correctamente');
    
    const fileObra = document.getElementById('fileObra');
    const fileProceso = document.getElementById('fileProceso');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnExportarCSV = document.getElementById('btnExportarCSV');
    const btnExportarJSON = document.getElementById('btnExportarJSON');

    if (!fileObra || !fileProceso || !btnAnalizar) {
        console.error('No se encontraron los elementos del DOM');
        return;
    }

    // Validar archivos cargados
    function validarArchivos() {
        const archivosListos = fileObra.files.length > 0 && fileProceso.files.length > 0;
        btnAnalizar.disabled = !archivosListos;
        console.log('Archivos listos:', archivosListos, '- Obra:', fileObra.files.length, '- Proceso:', fileProceso.files.length);
    }

    // Event listeners para carga de archivos
    fileObra.addEventListener('change', validarArchivos);
    fileProceso.addEventListener('change', validarArchivos);

    // Botón Analizar
    btnAnalizar.addEventListener('click', async function() {
        console.log('Iniciando análisis...');
        try {
            const textoObra = await fileObra.files[0].text();
            const textoProceso = await fileProceso.files[0].text();

            console.log('Archivos leídos correctamente');
            console.log('Texto obra length:', textoObra.length);
            console.log('Texto proceso length:', textoProceso.length);

            datosObra = parsearObra(textoObra);
            datosProceso = parsearProceso(textoProceso);
            
            console.log('Parseo completado');
            console.log('Categorías obra:', datosObra.categorias.length);
            console.log('Asientos proceso:', datosProceso.asientos.length);

            resultadoAnalisis = compararArchivos(datosObra, datosProceso);
            
            console.log('Comparación completada');
            console.log('Requisiciones:', resultadoAnalisis.requisiciones.length);
            console.log('Coincidencias:', resultadoAnalisis.coincidencias.length);
            console.log('Diferencias:', resultadoAnalisis.diferencias.length);

            renderizarResultados(resultadoAnalisis);
            console.log('Resultados renderizados');
        } catch (error) {
            console.error('Error al procesar:', error);
            alert('Error al procesar los archivos: ' + error.message);
        }
    });

    // Botón Limpiar
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            console.log('Limpiando...');
            fileObra.value = '';
            fileProceso.value = '';
            document.getElementById('resultados').style.display = 'none';
            btnAnalizar.disabled = true;
            datosObra = null;
            datosProceso = null;
            resultadoAnalisis = null;
        });
    }

    // Botones de exportación
    if (btnExportarCSV) {
        btnExportarCSV.addEventListener('click', exportarCSV);
    }
    if (btnExportarJSON) {
        btnExportarJSON.addEventListener('click', exportarJSON);
    }

    console.log('Event listeners configurados correctamente');
});

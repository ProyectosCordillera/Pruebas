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
// PARSER: OBRA.TXT
// ============================================
function parsearObra(texto) {
    const lineas = texto.split('\n').filter(l => l.trim());
    const categorias = [];
    let categoriaActual = null;

    for (const linea of lineas) {
        const campos = linea.split('\t').map(c => c.trim());
        if (campos.length < 10) continue;

        // Detectar si es línea de categoría
        const esCategoria = campos.some((c, i) => 
            /^\d+$/.test(c) && campos[i+1] && !/^\d/.test(campos[i+1]) && 
            !['HRS','UND'].includes(campos[i+1])
        );

        if (esCategoria) {
            const idxCodigo = campos.findIndex(c => /^\d+$/.test(c));
            if (idxCodigo > 0) {
                categoriaActual = {
                    codigo: campos[idxCodigo],
                    nombre: campos[idxCodigo + 1],
                    cantidad: parsearMonto(campos[idxCodigo + 2]),
                    unidad: campos[idxCodigo + 3],
                    montoUnitario: parsearMonto(campos[idxCodigo + 4]),
                    montoTotal: parsearMonto(campos[idxCodigo + 5]),
                    movimientos: []
                };
                categorias.push(categoriaActual);
            }
        } else if (categoriaActual) {
            // Línea de movimiento
            const idxMov = campos.findIndex(c => 
                ['SALIDA', 'SALIDA M.O.', 'DEVOLUCIÓN', 'DEVOLUCIÃ"ÓN'].includes(c)
            );
            if (idxMov > 0) {
                const tipo = campos[idxMov];
                const codigo = campos[idxMov + 1];
                const fecha = campos[idxMov + 2];
                const cantidad = parsearMonto(campos[idxMov + 3]);
                const unidad = campos[idxMov + 4];
                const montoTotal = parsearMonto(campos[idxMov + 6]);

                categoriaActual.movimientos.push({
                    tipo, codigo, fecha, cantidad, unidad, montoTotal
                });
            }
        }
    }

    const totalGeneral = categorias.reduce((s, c) => s + c.montoTotal, 0);
    return { categorias, totalGeneral };
}

// ============================================
// PARSER: PROCESO.TXT
// ============================================
function parsearProceso(texto) {
    const lineas = texto.split('\n').filter(l => l.trim());
    const asientos = [];
    let totalDebitos = 0, totalCreditos = 0, saldoFinal = 0;

    for (const linea of lineas) {
        const campos = linea.split('\t').map(c => c.trim());
        if (campos.length < 5) continue;

        if (campos[0] === 'Cuenta Contable') continue;
        if (campos[0].startsWith('Total')) continue;

        if (campos[0] === '06-02-01-04-01') {
            totalDebitos = parsearMonto(campos[2]);
            totalCreditos = parsearMonto(campos[3]);
            saldoFinal = parsearMonto(campos[4]);
            continue;
        }

        const fecha = campos[0];
        if (!/^\d{2}-\d{2}-\d{4}$/.test(fecha)) continue;

        asientos.push({
            fecha,
            numero: campos[1],
            descripcion: campos[2],
            debitos: parsearMonto(campos[3]),
            creditos: parsearMonto(campos[4]),
            saldo: parsearMonto(campos[5])
        });
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
                            <td class="text-end monto-negativo">₡${formatearMonto(r.diferencia)}</td>
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
    descargar(csv, 'analisis_contable.csv', 'text/csv');
}

function exportarJSON() {
    if (!resultadoAnalisis) return;
    descargar(JSON.stringify(resultadoAnalisis, null, 2), 'analisis_contable.json', 'application/json');
}

function descargar(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const fileObra = document.getElementById('fileObra');
    const fileProceso = document.getElementById('fileProceso');
    const btnAnalizar = document.getElementById('btnAnalizar');

    const validarArchivos = () => {
        btnAnalizar.disabled = !(fileObra.files.length && fileProceso.files.length);
    };

    fileObra.addEventListener('change', validarArchivos);
    fileProceso.addEventListener('change', validarArchivos);

    btnAnalizar.addEventListener('click', async () => {
        try {
            const textoObra = await fileObra.files[0].text();
            const textoProceso = await fileProceso.files[0].text();

            datosObra = parsearObra(textoObra);
            datosProceso = parsearProceso(textoProceso);
            resultadoAnalisis = compararArchivos(datosObra, datosProceso);

            renderizarResultados(resultadoAnalisis);
        } catch (error) {
            alert('Error al procesar los archivos: ' + error.message);
            console.error(error);
        }
    });

    document.getElementById('btnLimpiar').addEventListener('click', () => {
        fileObra.value = '';
        fileProceso.value = '';
        document.getElementById('resultados').style.display = 'none';
        btnAnalizar.disabled = true;
        datosObra = datosProceso = resultadoAnalisis = null;
    });

    document.getElementById('btnExportarCSV').addEventListener('click', exportarCSV);
    document.getElementById('btnExportarJSON').addEventListener('click', exportarJSON);
});

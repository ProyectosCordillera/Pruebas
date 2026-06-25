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
    cardDiff.className = 'card shadow-sm h

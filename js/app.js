function parsearObra(texto) {
    console.log('[OBRA] Iniciando parseo...');
    const lineas = texto.split('\n').filter(l => l.trim());
    console.log(`[OBRA] Total líneas: ${lineas.length}`);
    
    const categorias = [];
    let categoriaActual = null;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        
        const idxMontoTotal1 = linea.indexOf('Monto Total');
        if (idxMontoTotal1 < 0) continue;
        
        const idxMontoTotal2 = linea.indexOf('Monto Total', idxMontoTotal1 + 1);
        
        let contenidoVariable;
        if (idxMontoTotal2 > 0) {
            contenidoVariable = linea.substring(idxMontoTotal1 + 'Monto Total'.length, idxMontoTotal2);
        } else {
            const idxMovimiento = linea.indexOf('Movimiento', idxMontoTotal1);
            if (idxMovimiento > 0) {
                contenidoVariable = linea.substring(idxMontoTotal1 + 'Monto Total'.length, idxMovimiento);
            } else {
                continue;
            }
        }
        
        const campos = contenidoVariable.split('\t').map(c => c.trim()).filter(c => c);
        
        if (campos.length < 6) continue;
        
        const primerCampo = campos[0];
        
        const tiposMovimiento = ['SALIDA', 'SALIDA M.O.', 'DEVOLUCIÓN', 'DEVOLUCION', 
                                  'DEVOLUCIÃ"N', 'DEVOLUCIÃ“N', 'DEVOLUCIÃ"ÓN'];
        
        if (tiposMovimiento.includes(primerCampo)) {
            const tipo = primerCampo;
            const codigo = campos[1];
            const fecha = campos[2];
            const cantidad = parsearMonto(campos[3]);
            const unidad = campos[4];
            
            // CORRECCIÓN: Para SALIDA M.O. el monto total está en campos[6], no en el último
            // Para SALIDA normal está en campos[5]
            let montoTotal;
            if (tipo === 'SALIDA M.O.') {
                montoTotal = parsearMonto(campos[6]); // ← CAMBIO AQUÍ
            } else if (tipo.startsWith('DEVOLUCI')) {
                montoTotal = parsearMonto(campos[6]); // ← CAMBIO AQUÍ
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

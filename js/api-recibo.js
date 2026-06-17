// ============================================
// API ADAPTER - RECIBO RESERVA
// ============================================

const API_RECIBO_URLS = [
    // ✅ Puerto 8443 con HTTPS y subruta APIRESERVAPOOL (tu API)
    'https://pcordillera.duckdns.org:8443/APIRESERVAPOOL/api/reciboreservas',
    
    // ⚠️ HTTP local (solo si la página es HTTP)
    ...(window.location.protocol === 'http:' ? [
        'http://192.168.1.69:8081/api/reciboreservas'
    ] : [])
];

let API_RECIBO_BASE = null;

async function getReciboApiBase() {
    if (API_RECIBO_BASE) return API_RECIBO_BASE;

    for (const url of API_RECIBO_URLS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            
            const res = await fetch(url, { 
                method: 'GET', 
                mode: 'cors',
                signal: controller.signal 
            });
            clearTimeout(timeout);
            
            if (res.ok) {
                API_RECIBO_BASE = url;
                console.log('✅ API Recibo conectada:', url);
                return url;
            }
        } catch (err) {
            console.warn(`❌ Falló: ${url} -`, err.message);
        }
    }

    throw new Error('❌ No hay conexión con API Recibo');
}

const ReciboAPI = {
    async guardar(data) {
        const baseUrl = await getReciboApiBase();
        const response = await fetch(`${baseUrl}/guardar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al guardar');
        return await response.json();
    },

    async obtener(id) {
        const baseUrl = await getReciboApiBase();
        const response = await fetch(`${baseUrl}/${id}`);
        if (!response.ok) throw new Error('No se pudo obtener');
        return await response.json();
    },

    async listar() {
        const baseUrl = await getReciboApiBase();
        const response = await fetch(baseUrl);
        if (!response.ok) throw new Error('Error listando');
        return await response.json();
    },

    async eliminar(id) {
        const baseUrl = await getReciboApiBase();
        const response = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error eliminando');
        return true;
    }
};

window.ReciboAPI = ReciboAPI;
console.log('✅ ReciboAPI lista');

// ============================================
// API ADAPTER - RECIBO RESERVA
// ============================================

const API_RECIBO_URLS = [
    // ✅ HTTPS en puerto 443 (principal) - SIN Mixed Content
    'https://pcordillera.duckdns.org/api/reciboreservas',
    
    // ✅ HTTPS en puerto 8443 (alternativo)
    'https://pcordillera.duckdns.org:8443/api/reciboreservas',
    
    // ⚠️ HTTP local (solo si la página también es HTTP)
    ...(window.location.protocol === 'http:' ? [
        'http://192.168.1.69:8081/api/reciboreservas',
        'http://170.84.108.45:8081/api/reciboreservas'
    ] : [])
];

let API_RECIBO_BASE = null;

// --------------------------------------------
// 🔌 Buscar URL funcional
// --------------------------------------------
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
            if (err.name === 'AbortError') {
                console.warn(`⏱️ Timeout: ${url}`);
            } else {
                console.warn(`❌ Falló: ${url} -`, err.message);
            }
        }
    }

    throw new Error('❌ No hay conexión con API Recibo. Verifica que IIS esté corriendo.');
}

// --------------------------------------------
// 📦 OBJETO PRINCIPAL
// --------------------------------------------
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

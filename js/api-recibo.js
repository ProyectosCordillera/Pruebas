// ============================================
// API ADAPTER - RECIBO RESERVA
// ============================================

const API_RECIBO_URLS = [
    'https://pcordillera.duckdns.org:8443/APIRESERVAPOOL/api/reciboreservas',
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
        console.log('📤 Enviando datos:', data);
        
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try {
                const errorData = await response.text();
                console.error('🔴 Respuesta del servidor:', errorData);
                errorMsg += ': ' + errorData;
            } catch (e) {
                console.error('🔴 No se pudo leer el error');
            }
            throw new Error(errorMsg);
        }
        
        // ✅ Manejar respuesta que puede ser JSON o texto
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return { mensaje: text };
        }
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

// ============================================
// API ADAPTER - RECIBO RESERVA
// ============================================

const API_RECIBO_URLS = [
    'https://pcordillera.duckdns.org/api-casas/api/recibo',
    'https://170.84.108.45/api-casas/api/recibo',
    'https://192.168.1.69/api-casas/api/recibo'
];

let API_RECIBO_BASE = null;

// --------------------------------------------
// 🔌 Buscar URL funcional
// --------------------------------------------
async function getReciboApiBase() {
    if (API_RECIBO_BASE) return API_RECIBO_BASE;

    for (const url of API_RECIBO_URLS) {
        try {
            const res = await fetch(url, { method: 'GET', mode: 'cors' });
            if (res.ok) {
                API_RECIBO_BASE = url;
                console.log('✅ API Recibo:', url);
                return url;
            }
        } catch {}
    }

    throw new Error('❌ No hay conexión con API Recibo');
}

// --------------------------------------------
// 📦 OBJETO PRINCIPAL
// --------------------------------------------
const ReciboAPI = {

    // 💾 GUARDAR
    async guardar(data) {
        const baseUrl = await getReciboApiBase();

        const response = await fetch(`${baseUrl}/guardar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Error al guardar');
        }

        return await response.json();
    },

    // 🔍 OBTENER POR ID
    async obtener(id) {
        const baseUrl = await getReciboApiBase();

        const response = await fetch(`${baseUrl}/${id}`);

        if (!response.ok) {
            throw new Error('No se pudo obtener');
        }

        return await response.json();
    },

    // 📋 LISTAR
    async listar() {
        const baseUrl = await getReciboApiBase();

        const response = await fetch(`${baseUrl}/listar`);

        if (!response.ok) {
            throw new Error('Error listando');
        }

        return await response.json();
    },

    // 🗑️ ELIMINAR
    async eliminar(id) {
        const baseUrl = await getReciboApiBase();

        const response = await fetch(`${baseUrl}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Error eliminando');
        }

        return true;
    }
};

// --------------------------------------------
// 🌍 GLOBAL
// --------------------------------------------
window.ReciboAPI = ReciboAPI;

console.log('✅ ReciboAPI lista');

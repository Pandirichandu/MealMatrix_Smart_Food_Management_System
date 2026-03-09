const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';

export const api = {
    async login(email, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return res.json();
    },

    async getAdminStats(token) {
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'x-auth-token': token }
        });
        return res.json();
    },

    async getOwnerDashboard(token) {
        const res = await fetch(`${API_URL}/owner/dashboard`, {
            headers: { 'x-auth-token': token }
        });
        return res.json();
    }
};

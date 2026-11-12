/*
 * Cliente HTTP/WebSocket del backend EMJI.
 * La dirección puede configurarse antes de cargar este archivo con
 * window.EMJI_BACKEND_URL; por defecto usa el puerto 3100 del mismo host.
 */
class BackendClient {
    static TOKEN_KEY = "emji.backend.token";
    static BASE_URL = (typeof window !== "undefined" && window.EMJI_BACKEND_URL)
        ? window.EMJI_BACKEND_URL
        : `http://${typeof location !== "undefined" ? location.hostname : "localhost"}:3100`;

    static token() {
        try { return localStorage.getItem(this.TOKEN_KEY) || ""; }
        catch (_) { return ""; }
    }

    static setToken(token) {
        try {
            if (token) localStorage.setItem(this.TOKEN_KEY, token);
            else localStorage.removeItem(this.TOKEN_KEY);
        } catch (_) {}
    }

    static async request(path, options = {}) {
        const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
        const token = this.token();
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${this.BASE_URL}${path}`, {
            ...options, headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Backend: HTTP ${response.status}`);
        return payload;
    }

    static async register(username, password) {
        const result = await this.request("/api/register", {
            method: "POST", body: { username, password }
        });
        this.setToken(result.token);
        return result.user;
    }

    static async login(username, password) {
        const result = await this.request("/api/login", {
            method: "POST", body: { username, password }
        });
        this.setToken(result.token);
        return result.user;
    }

    static logout() { this.setToken(""); }
    static me() { return this.request("/api/me"); }
    static saveProfile(profile) {
        return this.request("/api/profile", { method: "PUT", body: profile });
    }
    static submitScore(score) {
        return this.request("/api/scores", { method: "POST", body: { score } });
    }
    static ranking() { return this.request("/api/ranking"); }
    static rooms() { return this.request("/api/rooms"); }
    static createRoom(name, maxPlayers = 2) {
        return this.request("/api/rooms", { method: "POST", body: { name, maxPlayers } });
    }
    static joinRoom(id) {
        return this.request(`/api/rooms/${encodeURIComponent(id)}/join`, { method: "POST", body: {} });
    }
    static leaveRoom(id) {
        return this.request(`/api/rooms/${encodeURIComponent(id)}/leave`, { method: "POST", body: {} });
    }

    static connectRoom(roomId, handlers = {}) {
        const token = this.token();
        if (!token) throw new Error("Iniciá sesión para conectarte a una sala.");
        const scheme = this.BASE_URL.startsWith("https:") ? "wss:" : "ws:";
        const host = this.BASE_URL.replace(/^https?:/, "");
        const socket = new WebSocket(`${scheme}${host}/ws?token=${encodeURIComponent(token)}&room=${encodeURIComponent(roomId)}`);
        socket.onopen = () => handlers.onOpen && handlers.onOpen(socket);
        socket.onmessage = event => {
            let data;
            try { data = JSON.parse(event.data); } catch (_) { return; }
            if (handlers.onMessage) handlers.onMessage(data, socket);
        };
        socket.onerror = error => handlers.onError && handlers.onError(error);
        socket.onclose = event => handlers.onClose && handlers.onClose(event);
        return socket;
    }
}

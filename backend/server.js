/*
 * EMJI Multiplayer Backend
 * Node.js >= 22.5 (node:sqlite) + ws
 *
 * El host ejecuta la simulación de combate en su PC. Este servidor autentica,
 * administra salas y retransmite mensajes entre host y clientes; no simula el
 * combate ni confía en puntajes enviados sin validar identidad.
 */
"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.GAME_BACKEND_PORT || 3100);
const HOST = process.env.GAME_BACKEND_HOST || "0.0.0.0";
const DB_FILE = process.env.GAME_DB_FILE || `${__dirname}/emji.sqlite`;
const TOKEN_SECRET = process.env.GAME_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;
const MAX_BODY = 128 * 1024;

if (TOKEN_SECRET.length < 32) {
    console.warn("[EMJI] Definí GAME_TOKEN_SECRET con al menos 32 caracteres antes de exponer el backend a internet.");
}

const db = new DatabaseSync(DB_FILE);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    robot_name TEXT NOT NULL DEFAULT 'RF-01',
    loadout_json TEXT NOT NULL DEFAULT '{}',
    program_code TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK(score >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting',
    max_players INTEGER NOT NULL DEFAULT 2,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS room_members (
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('host','client')),
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(room_id, user_id)
);
`);

const q = {
    userByKey: db.prepare("SELECT * FROM users WHERE username_key = ?"),
    userById: db.prepare("SELECT * FROM users WHERE id = ?"),
    insertUser: db.prepare(`INSERT INTO users
        (id,username,username_key,password_salt,password_hash) VALUES (?,?,?,?,?)`),
    updateProfile: db.prepare(`UPDATE users SET robot_name=?,loadout_json=?,program_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`),
    ranking: db.prepare(`SELECT u.username,u.robot_name,COUNT(s.id) gamesPlayed,COALESCE(MAX(s.score),0) highScore,COALESCE(SUM(s.score),0) totalScore
        FROM users u LEFT JOIN scores s ON s.user_id=u.id
        GROUP BY u.id ORDER BY highScore DESC,totalScore DESC,u.username COLLATE NOCASE LIMIT 100`),
    addScore: db.prepare("INSERT INTO scores(user_id,score) VALUES (?,?)"),
    createRoom: db.prepare("INSERT INTO rooms(id,name,host_user_id,max_players) VALUES (?,?,?,?)"),
    addMember: db.prepare("INSERT OR IGNORE INTO room_members(room_id,user_id,role) VALUES (?,?,?)"),
    roomById: db.prepare("SELECT * FROM rooms WHERE id=?"),
    roomMember: db.prepare("SELECT * FROM room_members WHERE room_id=? AND user_id=?"),
    roomList: db.prepare(`SELECT r.id,r.name,r.status,r.max_players,r.created_at,u.username host,
        (SELECT COUNT(*) FROM room_members m WHERE m.room_id=r.id) players
        FROM rooms r JOIN users u ON u.id=r.host_user_id
        WHERE r.status='waiting' ORDER BY r.created_at DESC LIMIT 50`),
    members: db.prepare(`SELECT u.id,u.username,u.robot_name,m.role FROM room_members m
        JOIN users u ON u.id=m.user_id WHERE m.room_id=? ORDER BY m.joined_at`)
};

function json(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": process.env.GAME_CORS_ORIGIN || "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => {
            data += chunk;
            if (Buffer.byteLength(data) > MAX_BODY) {
                reject(Object.assign(new Error("Cuerpo demasiado grande"), { status: 413 }));
                req.destroy();
            }
        });
        req.on("end", () => {
            try { resolve(data ? JSON.parse(data) : {}); }
            catch (_) { reject(Object.assign(new Error("JSON inválido"), { status: 400 })); }
        });
        req.on("error", reject);
    });
}

function normalizeUsername(value) {
    return String(value || "").trim().normalize("NFKC");
}
function usernameKey(value) {
    return normalizeUsername(value).toLocaleLowerCase("en-US");
}
function passwordHash(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString("hex");
}
function signToken(user) {
    const payload = Buffer.from(JSON.stringify({
        sub: user.id, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    })).toString("base64url");
    const signature = crypto.createHmac("sha256", TOKEN_SECRET)
        .update(payload).digest("base64url");
    return `${payload}.${signature}`;
}
function verifyToken(token) {
    if (!token || typeof token !== "string") return null;
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = crypto.createHmac("sha256", TOKEN_SECRET)
        .update(payload).digest();
    let received;
    try { received = Buffer.from(signature, "base64url"); } catch (_) { return null; }
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!data.sub || data.exp < Date.now() / 1000) return null;
        return data.sub;
    } catch (_) { return null; }
}
function bearer(req) {
    const header = req.headers.authorization || "";
    return header.startsWith("Bearer ") ? header.slice(7) : "";
}
function publicUser(user) {
    return {
        id: user.id, username: user.username, robotName: user.robot_name,
        loadout: safeJson(user.loadout_json, {}), programCode: user.program_code || ""
    };
}
function safeJson(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
}
function requireUser(req) {
    const id = verifyToken(bearer(req));
    return id ? q.userById.get(id) : null;
}
function validateProfile(body) {
    const robotName = String(body.robotName || "RF-01").trim().slice(0, 24) || "RF-01";
    const loadout = body.loadout && typeof body.loadout === "object" ? body.loadout : {};
    const programCode = String(body.programCode || "");
    if (programCode.length > 50000) throw Object.assign(new Error("El programa supera el tamaño permitido"), { status: 413 });
    return { robotName, loadout, programCode };
}
const roomSockets = new Map();

function broadcastRoom(roomId, data, except = null) {
    const clients = roomSockets.get(roomId);
    if (!clients) return;
    const payload = JSON.stringify(data);
    for (const peer of clients) {
        if (peer !== except && peer.readyState === WebSocket.OPEN)
            peer.send(payload);
    }
}

async function handle(req, res) {
    if (req.method === "OPTIONS") return json(res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const path = url.pathname;

    try {
        if (req.method === "GET" && path === "/api/health")
            return json(res, 200, { ok: true, service: "emji-game-backend", sqlite: true });

        if (req.method === "POST" && (path === "/api/register" || path === "/api/login")) {
            const body = await readBody(req);
            const username = normalizeUsername(body.username);
            const password = String(body.password || "");
            if (!/^[\p{L}\p{N}_ -]{3,18}$/u.test(username))
                return json(res, 400, { error: "El usuario debe tener entre 3 y 18 caracteres." });
            if (password.length < 8 || password.length > 128)
                return json(res, 400, { error: "La contraseña debe tener entre 8 y 128 caracteres." });

            let user = q.userByKey.get(usernameKey(username));
            if (path === "/api/register") {
                if (user) return json(res, 409, { error: "Ese nombre de usuario ya existe." });
                const id = crypto.randomUUID();
                const salt = crypto.randomBytes(16).toString("hex");
                q.insertUser.run(id, username, usernameKey(username), salt, passwordHash(password, salt));
                user = q.userById.get(id);
            } else {
                if (!user) return json(res, 401, { error: "Usuario o contraseña incorrectos." });
                const actual = Buffer.from(passwordHash(password, user.password_salt), "hex");
                const expected = Buffer.from(user.password_hash, "hex");
                if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected))
                    return json(res, 401, { error: "Usuario o contraseña incorrectos." });
            }
            return json(res, 200, { token: signToken(user), user: publicUser(user) });
        }

        const user = requireUser(req);
        if (!user) return json(res, 401, { error: "Iniciá sesión para continuar." });

        if (req.method === "GET" && path === "/api/me")
            return json(res, 200, { user: publicUser(user) });

        if (req.method === "PUT" && path === "/api/profile") {
            const body = await readBody(req);
            const profile = validateProfile(body);
            q.updateProfile.run(profile.robotName, JSON.stringify(profile.loadout), profile.programCode, user.id);
            return json(res, 200, { saved: true });
        }

        if (req.method === "GET" && path === "/api/ranking")
            return json(res, 200, { ranking: q.ranking.all() });

        if (req.method === "POST" && path === "/api/scores") {
            const body = await readBody(req);
            const score = Math.floor(Number(body.score));
            if (!Number.isSafeInteger(score) || score < 0 || score > 100000000)
                return json(res, 400, { error: "Puntaje inválido." });
            q.addScore.run(user.id, score);
            return json(res, 201, { saved: true });
        }

        if (req.method === "GET" && path === "/api/rooms")
            return json(res, 200, { rooms: q.roomList.all() });

        if (req.method === "POST" && path === "/api/rooms") {
            const body = await readBody(req);
            const id = crypto.randomUUID();
            const name = String(body.name || `${user.username} · Sala`).trim().slice(0, 32) || "Sala";
            const maxPlayers = Math.max(2, Math.min(8, Number(body.maxPlayers) || 2));
            q.createRoom.run(id, name, user.id, maxPlayers);
            q.addMember.run(id, user.id, "host");
            return json(res, 201, { room: q.roomById.get(id), role: "host" });
        }

        const joinMatch = path.match(/^\/api\/rooms\/([a-f0-9-]+)\/join$/i);
        if (req.method === "POST" && joinMatch) {
            const room = q.roomById.get(joinMatch[1]);
            if (!room || room.status !== "waiting") return json(res, 404, { error: "Sala no disponible." });
            const members = q.members.all(room.id);
            if (!members.some(member => member.id === user.id) && members.length >= room.max_players)
                return json(res, 409, { error: "La sala está completa." });
            q.addMember.run(room.id, user.id, room.host_user_id === user.id ? "host" : "client");
            return json(res, 200, { room, members: q.members.all(room.id) });
        }

        const leaveMatch = path.match(/^\/api\/rooms\/([a-f0-9-]+)\/leave$/i);
        if (req.method === "POST" && leaveMatch) {
            const room = q.roomById.get(leaveMatch[1]);
            if (room && room.host_user_id === user.id) {
                db.prepare("UPDATE rooms SET status='closed' WHERE id=?").run(leaveMatch[1]);
                db.prepare("DELETE FROM room_members WHERE room_id=?").run(leaveMatch[1]);
            } else {
                db.prepare("DELETE FROM room_members WHERE room_id=? AND user_id=?").run(leaveMatch[1], user.id);
            }
            return json(res, 200, { left: true });
        }

        return json(res, 404, { error: "Ruta no encontrada." });
    } catch (error) {
        console.error("[EMJI API]", error);
        return json(res, error.status || 500, { error: error.status ? error.message : "Error interno del servidor." });
    }
}

const server = http.createServer((req, res) => {
    handle(req, res);
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== "/ws") return socket.destroy();

    const userId = verifyToken(url.searchParams.get("token"));
    const roomId = url.searchParams.get("room");
    const room = roomId && q.roomById.get(roomId);
    const member = room && userId && q.roomMember.get(roomId, userId);
    if (!userId || !room || !member) return socket.destroy();

    wss.handleUpgrade(req, socket, head, ws => {
        ws.userId = userId;
        ws.roomId = roomId;
        ws.role = member.role;
        wss.emit("connection", ws, req);
    });
});

wss.on("connection", ws => {
    if (!roomSockets.has(ws.roomId)) roomSockets.set(ws.roomId, new Set());
    roomSockets.get(ws.roomId).add(ws);
    ws.send(JSON.stringify({
        type: "room:connected", room: q.roomById.get(ws.roomId),
        members: q.members.all(ws.roomId), role: ws.role
    }));
    broadcastRoom(ws.roomId, {
        type: "room:peer-joined", userId: ws.userId, role: ws.role,
        members: q.members.all(ws.roomId)
    }, ws);

    ws.on("message", raw => {
        let message;
        try { message = JSON.parse(raw.toString()); } catch (_) { return; }
        if (!message || typeof message.type !== "string") return;

        // Host Relay: el cliente envía inputs al host; el host emite estado
        // autoritativo. El backend solo retransmite, no ejecuta el juego.
        if (ws.role === "host") {
            const allowed = new Set(["state", "fight:start", "fight:phase", "program:ready", "chat"]);
            if (!allowed.has(message.type)) return;
            broadcastRoom(ws.roomId, {
                type: message.type, from: ws.userId, payload: message.payload ?? null
            }, ws);
        } else {
            const allowed = new Set(["input", "chat", "program:submit", "ready"]);
            if (!allowed.has(message.type)) return;
            const host = [...(roomSockets.get(ws.roomId) || [])].find(peer => peer.role === "host" && peer.readyState === WebSocket.OPEN);
            if (host) host.send(JSON.stringify({
                type: message.type, from: ws.userId, payload: message.payload ?? null
            }));
        }
    });

    ws.on("close", () => {
        const peers = roomSockets.get(ws.roomId);
        if (peers) {
            peers.delete(ws);
            if (!peers.size) roomSockets.delete(ws.roomId);
        }
        broadcastRoom(ws.roomId, { type: "room:peer-left", userId: ws.userId });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`[EMJI] Backend escuchando en http://${HOST}:${PORT}`);
});

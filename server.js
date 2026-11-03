/*
 * R/F Control Server
 * Sirve el juego y conecta el celular (mando) con la PC por la red local.
 *
 * Uso:
 *   node server.js
 *
 * Luego:
 *   PC:     http://localhost:3000/index.html
 *   Celular:http://<IP-DE-LA-PC>:3000/controller.html
 */

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav"
};

const gameClients = new Set();
const controllerClients = new Set();
let latestState = null;

function clamp(value) {
    const number = Number(value);

    if (!Number.isFinite(number))
        return 0;

    return Math.max(-1, Math.min(1, number));
}

function statusPayload() {
    return {
        gameConnected: gameClients.size > 0,
        controllers: controllerClients.size
    };
}

function sendEvent(res, event, data) {
    try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
    catch (error) {
        // El cliente se desconectó; el set se limpia en el cierre.
    }
}

function broadcast(clients, event, data) {
    for (const res of clients)
        sendEvent(res, event, data);
}

function broadcastStatus() {
    broadcast(controllerClients, "status", statusPayload());
}

function readBody(req, callback) {
    let body = "";

    req.on("data", chunk => {
        body += chunk;

        if (body.length > 8192) {
            req.destroy();
            body = "";
        }
    });

    req.on("end", () => callback(body));
}

function sendText(res, status, body, extra = {}) {
    res.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        ...extra
    });
    res.end(body);
}

function openEvents(req, res, role) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*"
    });

    res.write("retry: 1000\n\n");

    const clients = role === "game" ? gameClients : controllerClients;
    clients.add(res);

    sendEvent(res, "status", statusPayload());

    if (role === "controller" && latestState !== null)
        sendEvent(res, "state", latestState);

    let cleaned = false;
    const cleanup = () => {
        if (cleaned)
            return;

        cleaned = true;
        clients.delete(res);

        if (role === "game") {
            latestState = null;
            broadcast(controllerClients, "state", { scene: "idle", t: Date.now() });
        }

        broadcastStatus();
    };

    req.on("close", cleanup);
    req.on("error", cleanup);
    res.on("close", cleanup);
    res.on("error", cleanup);

    broadcastStatus();
}

// Los archivos se leen una sola vez al arrancar. La carpeta vive en OneDrive
// y la primera lectura de un archivo puede tardar decenas de segundos; si eso
// pasa durante una carga del navegador, los scripts terminan abortados.
const staticFiles = new Map();

function preloadStaticFiles(dir = ROOT) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".") || entry.name === "node_modules")
            continue;

        const absolute = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            preloadStaticFiles(absolute);
            continue;
        }

        if (!entry.isFile())
            continue;

        const relative = "/" + path.relative(ROOT, absolute).split(path.sep).join("/");
        const extension = path.extname(absolute).toLowerCase();

        try {
            staticFiles.set(relative, {
                type: MIME[extension] || "application/octet-stream",
                cache: (extension === ".html" || extension === ".js" || extension === ".json")
                    ? "no-store"
                    : "public, max-age=300",
                body: fs.readFileSync(absolute)
            });
        }
        catch (error) {
            console.error(`No se pudo precargar ${relative}:`, error.message);
        }
    }
}

function serveStatic(req, res, pathname) {
    let relative = decodeURIComponent(pathname);

    if (relative === "/" || relative === "")
        relative = "/index.html";

    const file = staticFiles.get(relative);

    if (!file) {
        sendText(res, 404, "No encontrado");
        return;
    }

    const headers = {
        "Content-Type": file.type,
        "Content-Length": file.body.length,
        "Cache-Control": file.cache
    };

    if (req.method === "HEAD") {
        res.writeHead(200, headers);
        res.end();
        return;
    }

    res.writeHead(200, headers);
    res.end(file.body);
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;

    if (pathname === "/events") {
        const role = url.searchParams.get("role") === "game" ? "game" : "controller";
        openEvents(req, res, role);
        return;
    }

    if (pathname === "/control" && req.method === "POST") {
        readBody(req, body => {
            let data = {};

            try {
                data = JSON.parse(body);
            }
            catch (error) {
                data = {};
            }

            broadcast(gameClients, "control", {
                x: clamp(data.x),
                y: clamp(data.y),
                fire: data.fire === true,
                shield: data.shield === true
            });

            res.writeHead(204, {
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*"
            });
            res.end();
        });
        return;
    }

    if (pathname === "/game-state" && req.method === "POST") {
        readBody(req, body => {
            try {
                latestState = JSON.parse(body);
            }
            catch (error) {
                latestState = null;
            }

            if (latestState !== null)
                broadcast(controllerClients, "state", latestState);

            res.writeHead(204, {
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*"
            });
            res.end();
        });
        return;
    }

    if (pathname === "/status") {
        sendText(res, 200, JSON.stringify(statusPayload()), {
            "Content-Type": "application/json; charset=utf-8"
        });
        return;
    }

    if (pathname === "/mando" || pathname === "/remote") {
        res.writeHead(302, { "Location": "/controller.html" });
        res.end();
        return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Método no permitido");
        return;
    }

    serveStatic(req, res, pathname);
});

function lanAddresses() {
    const addresses = [];

    for (const interfaces of Object.values(os.networkInterfaces())) {
        for (const info of interfaces || []) {
            if (info.family === "IPv4" && !info.internal)
                addresses.push(info.address);
        }
    }

    return addresses;
}

const keepAlive = setInterval(() => {
    for (const clients of [gameClients, controllerClients]) {
        for (const res of clients) {
            try {
                res.write(": ping\n\n");
            }
            catch (error) {
                // El cierre del socket limpia el cliente.
            }
        }
    }
}, 15000);

keepAlive.unref();

const preloadStartedAt = Date.now();
preloadStaticFiles();
const preloadMs = Date.now() - preloadStartedAt;

server.on("error", error => {
    if (error.code === "EADDRINUSE") {
        console.error(`\nEl puerto ${PORT} ya está en uso.`);
        console.error(`Cerrá el otro proceso o usá otro puerto: PORT=3001 node server.js\n`);
    }
    else {
        console.error("Error del servidor:", error);
    }

    process.exitCode = 1;
});

server.listen(PORT, "0.0.0.0", () => {
    const addresses = lanAddresses();
    const phoneHost = addresses[0] || "localhost";

    console.log("");
    console.log("============================================================");
    console.log("  R/F CONTROL SERVER  //  MANDO MÓVIL");
    console.log("============================================================");
    console.log(`  Juego en la PC :  http://localhost:${PORT}/index.html`);
    console.log(`  Mando celular  :  http://${phoneHost}:${PORT}/controller.html`);
    console.log(`  Archivos       :  ${staticFiles.size} en memoria (${preloadMs} ms)`);

    if (addresses.length > 1) {
        for (const address of addresses.slice(1))
            console.log(`  Alternativa    :  http://${address}:${PORT}/controller.html`);
    }

    console.log("");
    console.log("  PC y celular deben estar en la misma red Wi-Fi.");
    console.log("  Si Windows pregunta, permití el acceso a la red privada.");
    console.log("  Ctrl+C para detener el servidor.");
    console.log("============================================================");
    console.log("");
});

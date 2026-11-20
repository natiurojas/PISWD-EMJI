const WebSocket = require("ws");

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("Falta ADMIN_TOKEN. Configurá una variable de entorno segura antes de iniciar.");
  process.exit(1);
}

const server = new WebSocket.Server({ host: HOST, port: PORT });
const clients = new Map(); // socket -> { role, name, id }
const pending = new Map(); // requestId -> { socket, name, id }
let activeController = null;
let nextId = 1;

function send(socket, packet) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(packet));
  }
}

function broadcastAdmins(packet) {
  for (const [socket, info] of clients) {
    if (info.role === "admin") send(socket, packet);
  }
}

function sendSnapshot(socket) {
  const waiting = [...pending.values()].map(p => ({
    id: p.id, requestId: p.requestId, name: p.name
  }));
  const connected = [...clients.values()]
    .filter(c => c.role === "controller")
    .map(c => ({ id: c.id, name: c.name, active: activeController === c.id }));

  send(socket, {
    type: "dashboard_state",
    pending: waiting,
    controllers: connected,
    activeController
  });
}

function removeController(socket) {
  const info = clients.get(socket);
  if (!info || info.role !== "controller") return;

  for (const [requestId, request] of pending) {
    if (request.socket === socket) pending.delete(requestId);
  }

  if (activeController === info.id) activeController = null;
  broadcastAdmins({ type: "controller_disconnected", id: info.id, name: info.name });
  broadcastAdmins({ type: "dashboard_state",
    pending: [...pending.values()].map(p => ({ id: p.id, requestId: p.requestId, name: p.name })),
    controllers: [...clients.values()].filter(c => c.role === "controller")
      .map(c => ({ id: c.id, name: c.name, active: activeController === c.id })),
    activeController
  });
}

server.on("connection", socket => {
  const id = String(nextId++);
  clients.set(socket, { role: "unregistered", name: `CLIENT-${id}`, id });

  socket.on("message", raw => {
    let packet;
    try { packet = JSON.parse(raw.toString()); } catch { return; }
    if (!packet || typeof packet.type !== "string") return;

    const info = clients.get(socket);
    if (!info) return;

    // Every connection must identify itself before sending other messages.
    if (packet.type === "hello") {
      if (info.role !== "unregistered") return;

      if (packet.role === "admin") {
        if (typeof packet.token !== "string" || packet.token !== ADMIN_TOKEN) {
          send(socket, { type: "auth_result", ok: false, message: "Token de administrador incorrecto." });
          socket.close(1008, "Unauthorized");
          return;
        }
        info.role = "admin";
        info.name = "ADMIN";
        send(socket, { type: "auth_result", ok: true });
        sendSnapshot(socket);
        console.log("Panel administrador conectado");
        return;
      }

      if (packet.role === "controller") {
        info.role = "controller";
        const name = typeof packet.name === "string" ? packet.name.trim().slice(0, 24) : "";
        info.name = name || `JUGADOR-${id}`;
        send(socket, { type: "hello_result", ok: true, id: info.id });
        console.log(`${info.name} conectado; esperando solicitud`);
        return;
      }

      if (packet.role === "game") {
        info.role = "game";
        send(socket, { type: "hello_result", ok: true, id: info.id });
        console.log("Cliente de juego conectado");
        return;
      }

      send(socket, { type: "error", message: "Rol desconocido." });
      return;
    }

    if (info.role === "unregistered") return;

    if (info.role === "controller" && packet.type === "request_control") {
      if ([...pending.values()].some(p => p.socket === socket) || activeController === info.id) {
        send(socket, { type: "request_status", status: activeController === info.id ? "approved" : "pending" });
        return;
      }

      if (activeController !== null) {
        send(socket, { type: "request_status", status: "busy", message: "Ya hay un jugador controlando." });
        return;
      }

      const requestId = `${Date.now()}-${info.id}`;
      const request = { socket, name: info.name, id: info.id, requestId };
      pending.set(requestId, request);
      send(socket, { type: "request_status", status: "pending" });
      broadcastAdmins({ type: "control_request", requestId, id: info.id, name: info.name });
      return;
    }

    if (info.role === "admin" && packet.type === "decision") {
      const request = pending.get(String(packet.requestId));
      if (!request) {
        send(socket, { type: "decision_result", ok: false, message: "La solicitud ya no está disponible." });
        return;
      }

      pending.delete(String(packet.requestId));
      const accept = packet.accept === true && activeController === null &&
        request.socket.readyState === WebSocket.OPEN;

      if (accept) {
        activeController = request.id;
        send(request.socket, { type: "control_result", approved: true, message: "¡Conexión autorizada!" });
        broadcastAdmins({ type: "controller_approved", id: request.id, name: request.name });
        send(socket, { type: "decision_result", ok: true });
      } else {
        send(request.socket, { type: "control_result", approved: false, message: "El administrador rechazó la solicitud." });
        broadcastAdmins({ type: "controller_rejected", id: request.id, name: request.name });
        send(socket, { type: "decision_result", ok: true });
      }
      sendSnapshotToAllAdmins();
      return;
    }

    if (info.role === "admin" && packet.type === "disconnect_controller") {
      if (activeController === String(packet.id)) {
        const controller = [...clients.entries()].find(([, c]) => c.id === activeController);
        if (controller) {
          send(controller[0], { type: "control_revoked", message: "El administrador finalizó tu sesión." });
        }
        activeController = null;
        broadcastAdmins({ type: "controller_disconnected", id: String(packet.id), name: controller?.[1].name || "Jugador" });
        sendSnapshotToAllAdmins();
      }
      return;
    }

    if (info.role === "controller" && packet.type === "input") {
      if (activeController !== info.id) return; // Unapproved clients cannot control the game.

      const m = packet.movement || {};
      const clean = {
        type: "input",
        movement: {
          x: Math.max(-1, Math.min(1, Number(m.x) || 0)),
          y: Math.max(-1, Math.min(1, Number(m.y) || 0))
        },
        shoot: packet.shoot === true,
        shield: packet.shield === true,
        boost: packet.boost === true
      };

      for (const [client, clientInfo] of clients) {
        if (clientInfo.role === "game" && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(clean));
        }
      }
    }
  });

  socket.on("close", () => {
    removeController(socket);
    const info = clients.get(socket);
    if (info?.role === "admin") console.log("Panel administrador desconectado");
    clients.delete(socket);
  });

  socket.on("error", err => console.error("WebSocket:", err.message));
});

function sendSnapshotToAllAdmins() {
  for (const [socket, info] of clients) {
    if (info.role === "admin") sendSnapshot(socket);
  }
}

server.on("listening", () => {
  console.log(`WebSocket escuchando en ws://${HOST}:${PORT}`);
});

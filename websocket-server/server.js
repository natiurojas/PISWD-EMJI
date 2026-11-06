const WebSocket = require("ws");
const server = new WebSocket.Server({ host: "0.0.0.0", port: 8080 });

server.on("connection", socket => {
  console.log("Cliente conectado");
  socket.on("message", raw => {
    let packet;
    try { packet = JSON.parse(raw.toString()); } catch { return; }
    if (packet.type !== "input") return;
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
    // Broadcast to browser/game clients only; never reflect to sender.
    for (const client of server.clients) {
      if (client !== socket && client.readyState === WebSocket.OPEN)
        client.send(JSON.stringify(clean));
    }
  });
  socket.on("close", () => console.log("Cliente desconectado"));
});

console.log("WebSocket escuchando en ws://0.0.0.0:8080");

class RoomsScene extends Scene {
    constructor() {
        super();
        this.name = "RoomsScene";
        this.type = "UI";
        this.localRooms = [];
        this.notice = "Las salas son una maqueta local: todavía no hay conexión multijugador.";
    }

    static preload() {
        return [
            "./Assets/dialog.png", "./Assets/Ratcon/greet.png", "./Assets/Ratcon/happy.png",
            "./Assets/Ratcon/point_right.png", "./Assets/Ratcon/sad.png", "./Assets/Fonts/Minecraft.ttf"
        ];
    }

    onStart() {
        this.addChild(new RobotFightBackdrop());
        RFUI.heading(this, "SALAS DE COMBATE", "Prepará una partida: interfaz lista para conectar el multijugador más adelante");

        RFUI.panel(this, 28, 103, 474, 370, "#0A1C2A", "#24495B", 1, "RoomsListPanel");
        RFUI.label(this, "SALAS DISPONIBLES", 45, 118, 9, RFUI.COLORS.cyan);
        RFUI.label(this, "ESTADO", 423, 118, 7, RFUI.COLORS.muted);
        this.roomList = new Node();
        this.roomList.name = "RoomList";
        this.addChild(this.roomList);
        this.renderRooms();

        RFUI.panel(this, 521, 103, 251, 370, "#0A1C2A", "#24495B", 1, "RoomDetailPanel");
        RFUI.label(this, "CENTRO DE RED", 538, 118, 9, RFUI.COLORS.purple);
        RFUI.label(this, "La conexión online todavía", 539, 155, 8, RFUI.COLORS.white);
        RFUI.label(this, "no está implementada.", 539, 171, 8, RFUI.COLORS.white);
        RFUI.label(this, "Por ahora podés explorar la", 539, 211, 7, RFUI.COLORS.muted);
        RFUI.label(this, "interfaz y crear una sala de", 539, 226, 7, RFUI.COLORS.muted);
        RFUI.label(this, "prueba en este navegador.", 539, 241, 7, RFUI.COLORS.muted);
        RFUI.panel(this, 539, 270, 213, 1, "#24495B", "#24495B", 0);
        RFUI.label(this, "PRÓXIMOS PASOS", 539, 285, 7, RFUI.COLORS.cyan);
        RFUI.label(this, "- Lobby y jugadores", 539, 307, 7, RFUI.COLORS.muted);
        RFUI.label(this, "- Sincronización de robots", 539, 326, 7, RFUI.COLORS.muted);
        RFUI.label(this, "- Motor de partidas online", 539, 345, 7, RFUI.COLORS.muted);
        RFUI.button(this, "+ CREAR SALA LOCAL", 539, 392, 212, 43, () => this.createLocalRoom(), {
            fontSize: 8, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan
        });

        this.noticeLabel = RFUI.label(this, this.notice, 31, 486, 8, RFUI.COLORS.orange, { maxWidth: 730 });
        this.dialog = new RatconDialogBox("Estas salas son demostraciones locales. No vas a conectarte a jugadores reales todavía.", "greet", {
            width: 395, height: 63, bubbleOffset: 65, mascotScale: 0.15, textSize: 7
        });
        this.dialog.pos = new Vector2(270, 495);
        this.addChild(this.dialog);
        RFUI.button(this, "< VOLVER AL MENÚ", 28, 536, 172, 42, () => Scene.change(new MainMenu()), { fontSize: 9 });
    }

    renderRooms() {
        for (const child of [...this.roomList.children]) this.roomList.removeChild(child);
        const rooms = [
            { name: "ARENA DE PRUEBA", players: "1 / 4", status: "PREVIEW", color: RFUI.COLORS.purple },
            { name: "CIRCUITO NEÓN", players: "2 / 4", status: "PREVIEW", color: RFUI.COLORS.purple },
            ...this.localRooms
        ];
        rooms.slice(0, 3).forEach((room, i) => {
            const y = 145 + i * 91;
            RFUI.panel(this.roomList, 43, y, 443, 77, "#0D2434", "#24495B", 1, `RoomCard${i}`);
            RFUI.label(this.roomList, room.name, 57, y + 12, 9, RFUI.COLORS.white);
            RFUI.label(this.roomList, `PILOTOS  ${room.players}`, 57, y + 34, 7, RFUI.COLORS.muted);
            RFUI.label(this.roomList, room.status, 412, y + 12, 7, room.color || RFUI.COLORS.purple, { width: 61, align: RIGHT });
            RFUI.button(this.roomList, "VER", 405, y + 40, 65, 26, () => {
                this.notice = "Vista previa seleccionada. La unión a partidas online se habilitará cuando exista servidor.";
                this.noticeLabel.setText(this.notice);
                this.dialog.setMessage(`La sala ${room.name} es solo una vista previa por ahora. ¡El multijugador viene después!`, "point_right");
            }, { fontSize: 7, color: "#102B3B", hoverColor: "#174556", border: "#3B6070" });
        });
    }

    createLocalRoom() {
        const n = this.localRooms.length + 1;
        this.localRooms.push({
            name: `SALA LOCAL ${String(n).padStart(2, "0")}`,
            players: "1 / 4", status: "LOCAL", color: RFUI.COLORS.green
        });
        this.notice = "Sala local creada en esta pantalla. No se publicó en internet ni admite conexiones.";
        this.noticeLabel.setText(this.notice);
        this.dialog.setMessage("¡Listo! Creé una sala local de demostración. Todavía no puede recibir otros jugadores.", "happy");
        this.renderRooms();
    }
}

class RoomsScene extends Scene {
    constructor() {
        super();
        this.name = "RoomsScene";
        this.type = "UI";
        this.rooms = [];
        this.notice = "Conectando con el servidor de salas...";
        this.roomList = new Node();
        this.roomList.name = "RoomList";
    }

    static preload() {
        return [
            "./Assets/dialog.png", "./Assets/Ratcon/greet.png", "./Assets/Ratcon/happy.png",
            "./Assets/Ratcon/point_right.png", "./Assets/Ratcon/sad.png", "./Assets/Fonts/Minecraft.ttf"
        ];
    }

    onStart() {
        this.addChild(new RobotFightBackdrop());
        RFUI.heading(this, "SALAS DE COMBATE", "Creá una sala o unite a otro piloto mediante el servidor");
        RFUI.panel(this, 28, 103, 474, 370, "#0A1C2A", "#24495B", 1, "RoomsListPanel");
        RFUI.label(this, "SALAS DISPONIBLES", 45, 118, 9, RFUI.COLORS.cyan);
        RFUI.label(this, "PILOTOS", 423, 118, 7, RFUI.COLORS.muted);
        this.addChild(this.roomList);
        this.noticeLabel = RFUI.label(this, this.notice, 31, 486, 8, RFUI.COLORS.orange, { maxWidth: 730 });

        RFUI.panel(this, 521, 103, 251, 370, "#0A1C2A", "#24495B", 1, "RoomDetailPanel");
        RFUI.label(this, "HOST RELAY", 538, 118, 9, RFUI.COLORS.purple);
        RFUI.label(this, "El creador de la sala", 539, 155, 8, RFUI.COLORS.white);
        RFUI.label(this, "ejecuta la simulación.", 539, 171, 8, RFUI.COLORS.white);
        RFUI.label(this, "El backend autentica y", 539, 211, 7, RFUI.COLORS.muted);
        RFUI.label(this, "retransmite mensajes entre", 539, 226, 7, RFUI.COLORS.muted);
        RFUI.label(this, "los participantes.", 539, 241, 7, RFUI.COLORS.muted);
        RFUI.panel(this, 539, 270, 213, 1, "#24495B", "#24495B", 0);
        RFUI.label(this, "SALA PARA 2 A 8 PILOTOS", 539, 285, 7, RFUI.COLORS.cyan);
        RFUI.button(this, "+ CREAR SALA", 539, 392, 212, 43,
            () => this.createRoom(), {
                fontSize: 8, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan
            });
        RFUI.button(this, "< VOLVER AL MENÚ", 28, 536, 172, 42,
            () => Scene.change(new MainMenu()), { fontSize: 9 });

        this.refreshRooms();
    }

    setNotice(message, color = RFUI.COLORS.orange) {
        this.notice = message;
        this.noticeLabel.setText(message);
        this.noticeLabel.color = new Color(color);
    }

    async refreshRooms() {
        try {
            const result = await BackendClient.rooms();
            this.rooms = result.rooms || [];
            this.renderRooms();
            this.setNotice(`${this.rooms.length} sala(s) esperando jugadores.`, RFUI.COLORS.green);
        } catch (error) {
            this.rooms = [];
            this.renderRooms();
            this.setNotice(`No se pudo consultar el servidor: ${error.message}`);
        }
    }

    renderRooms() {
        for (const child of [...this.roomList.children])
            this.roomList.removeChild(child);

        if (!this.rooms.length) {
            RFUI.label(this.roomList, "No hay salas abiertas. ¡Podés crear la primera!", 265, 270, 8, RFUI.COLORS.muted, { align: CENTER, width: 420 });
            return;
        }

        this.rooms.slice(0, 3).forEach((room, i) => {
            const y = 145 + i * 91;
            RFUI.panel(this.roomList, 43, y, 443, 77, "#0D2434", "#24495B", 1, `RoomCard${i}`);
            RFUI.label(this.roomList, room.name, 57, y + 12, 9, RFUI.COLORS.white);
            RFUI.label(this.roomList, `HOST  ${room.host || "Piloto"}  ·  ${room.players}/${room.max_players}`, 57, y + 34, 7, RFUI.COLORS.muted);
            RFUI.label(this.roomList, "ABIERTA", 412, y + 12, 7, RFUI.COLORS.green, { width: 61, align: RIGHT });
            RFUI.button(this.roomList, "UNIRSE", 397, y + 40, 76, 26,
                () => this.joinRoom(room), {
                    fontSize: 7, color: "#102B3B", hoverColor: "#174556", border: RFUI.COLORS.cyan
                });
        });
    }

    async createRoom() {
        try {
            const result = await BackendClient.createRoom("Sala de " + (User.load()?.name || "Piloto"), 2);
            this.setNotice("Sala creada. Preparando conexión como host...", RFUI.COLORS.green);
            await Scene.change(new RoomLobbyScene(result.room, "host"));
        } catch (error) {
            this.setNotice(`No se pudo crear la sala: ${error.message}`);
        }
    }

    async joinRoom(room) {
        try {
            await BackendClient.joinRoom(room.id);
            await Scene.change(new RoomLobbyScene(room, "client"));
        } catch (error) {
            this.setNotice(`No se pudo entrar: ${error.message}`);
        }
    }
}

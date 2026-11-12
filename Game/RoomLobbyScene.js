class RoomLobbyScene extends Scene {
    constructor(room, role = "client") {
        super();
        this.name = "RoomLobbyScene";
        this.type = "UI";
        this.room = room;
        this.role = role;
        this.socket = null;
        this.members = [];
        this.ready = false;
        this.statusText = "Conectando...";
        this._built = false;
        this._leaving = false;
        this.opponentProgram = null;
        this.opponentLoadout = null;
        this.opponentName = null;
    }

    static preload() {
        return ["./Assets/dialog.png", "./Assets/Ratcon/greet.png", "./Assets/Ratcon/happy.png", "./Assets/Fonts/Minecraft.ttf"];
    }

    onStart() {
        if (this._built) {
            if (!this.socket || this.socket.readyState === WebSocket.CLOSED)
                this.connect();
            return;
        }
        this._built = true;
        this.addChild(new RobotFightBackdrop());
        RFUI.heading(this, this.room.name || "SALA DE COMBATE", "Lobby online · Host Relay");
        RFUI.panel(this, 65, 112, 670, 350, "#0A1C2A", "#24495B", 1, "LobbyPanel");
        RFUI.label(this, `ROL: ${this.role === "host" ? "HOST" : "CLIENTE"}`, 90, 140, 10, RFUI.COLORS.cyan);
        RFUI.label(this, `ID: ${this.room.id}`, 90, 166, 7, RFUI.COLORS.muted);
        this.statusLabel = RFUI.label(this, this.statusText, 90, 196, 8, RFUI.COLORS.orange);
        RFUI.label(this, "PILOTOS CONECTADOS", 90, 235, 9, RFUI.COLORS.purple);
        this.membersHost = new Node();
        this.addChild(this.membersHost);

        RFUI.button(this, "EDITAR PROGRAMA", 90, 375, 180, 44,
            () => Scene.change(new RAssemblyEditor(null, { returnScene: this })),
            { fontSize: 8, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan });
        this.readyButton = RFUI.button(this, this.ready ? "LISTO ✓" : "MARCARME LISTO", 285, 375, 180, 44,
            () => this.setReady(),
            { fontSize: 8, color: "#164A42", hoverColor: "#1D6659", border: RFUI.COLORS.green });
        if (this.role === "host") {
            RFUI.button(this, "INICIAR", 480, 375, 180, 44,
                () => this.startMatch(),
                { fontSize: 9, color: "#392B1C", hoverColor: "#624522", border: RFUI.COLORS.orange });
        }
        RFUI.button(this, "SALIR", 28, 536, 120, 42,
            () => this.leave(), { fontSize: 9 });

        this.connect();
    }

    setStatus(message, color = RFUI.COLORS.orange) {
        this.statusText = message;
        if (this.statusLabel) {
            this.statusLabel.setText(message);
            this.statusLabel.color = new Color(color);
        }
    }

    renderMembers() {
        for (const child of [...this.membersHost.children])
            this.membersHost.removeChild(child);
        this.members.forEach((member, i) => {
            RFUI.label(this.membersHost,
                `${member.role === "host" ? "★ HOST" : "PILOTO"}  ${member.username}  ·  ${member.robot_name || "RF-01"}`,
                100, 260 + i * 25, 8, member.role === "host" ? RFUI.COLORS.cyan : RFUI.COLORS.white);
        });
    }

    connect() {
        try {
            this.socket = BackendClient.connectRoom(this.room.id, {
                onOpen: () => this.setStatus("Conectado al relay.", RFUI.COLORS.green),
                onMessage: message => {
                    if (message.type === "room:connected" || message.type === "room:peer-joined") {
                        if (message.members) this.members = message.members;
                        this.renderMembers();
                    } else if (message.type === "room:peer-left") {
                        this.members = this.members.filter(member => member.id !== message.userId);
                        this.renderMembers();
                    } else if (message.type === "ready") {
                        const member = this.members.find(item => item.id === message.from);
                        if (member && message.payload && message.payload.robotName)
                            member.robot_name = message.payload.robotName;
                        this.renderMembers();
                        this.setStatus("Otro piloto está listo para combatir.", RFUI.COLORS.green);
                    } else if (message.type === "program:submit") {
                        this.opponentProgram = message.payload?.programCode || "";
                        this.opponentLoadout = message.payload?.loadout || {};
                        this.opponentName = message.payload?.robotName || "INVITADO";
                        this.setStatus("Programa y configuración del otro piloto recibidos por el host.", RFUI.COLORS.green);
                    } else if (message.type === "fight:start") {
                        if (this.role !== "host") {
                            const payload = message.payload || {};
                            this.setStatus("El host inició el combate. Entrando a la arena...", RFUI.COLORS.green);
                            Scene.change(new PvPFightScene({
                                role: "client", socket: this.socket, room: this.room,
                                localProgram: payload.clientProgram || "",
                                remoteProgram: payload.hostProgram || "",
                                localLoadout: payload.clientLoadout || {},
                                remoteLoadout: payload.hostLoadout || {}
                            }));
                        }
                    }
                },
                onError: () => this.setStatus("Error de conexión WebSocket."),
                onClose: () => this.setStatus("Conexión con la sala cerrada.")
            });
        } catch (error) {
            this.setStatus(error.message);
        }
    }

    async setReady() {
        try {
            const loadout = RobotLoadout.load();
            const programCode = (() => {
                try { return localStorage.getItem("emji.rassembly.program") || ""; }
                catch (_) { return ""; }
            })();
            await BackendClient.saveProfile({
                robotName: loadout.name || "RF-01", loadout, programCode
            });
            this.ready = true;
            if (this.readyButton && this.readyButton.label) {
                this.readyButton.label.text = "LISTO ✓";
                this.readyButton.label.mustBeRerendered = true;
            }
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: "program:submit",
                    payload: { robotName: loadout.name || "RF-01", loadout, programCode }
                }));
                this.socket.send(JSON.stringify({
                    type: "ready", payload: { robotName: loadout.name || "RF-01" }
                }));
            }
            this.setStatus("Robot y programa guardados. Avisé que estás listo.", RFUI.COLORS.green);
        } catch (error) {
            this.setStatus(`No se pudo guardar la preparación: ${error.message}`);
        }
    }

    startMatch() {
        if (this.role !== "host") return;
        if (!this.ready) {
            this.setStatus("Editá y guardá tu programa, luego marcate como listo.");
            return;
        }
        if (this.members.length < 2) {
            this.setStatus("Esperá a que se conecte otro piloto.");
            return;
        }
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.setStatus("El host necesita una conexión activa para iniciar.");
            return;
        }
        if (!this.opponentProgram || !this.opponentLoadout) {
            this.setStatus("Esperá a que el otro piloto guarde su programa y se marque listo.");
            return;
        }
        const loadout = RobotLoadout.load();
        let programCode = "";
        try { programCode = localStorage.getItem("emji.rassembly.program") || ""; } catch (_) {}
        const payload = {
            hostLoadout: loadout, hostProgram: programCode,
            clientLoadout: this.opponentLoadout, clientProgram: this.opponentProgram,
            roomId: this.room.id
        };
        this.socket.send(JSON.stringify({ type: "fight:start", payload }));
        this.setStatus("Iniciando combate PvP autoritativo...", RFUI.COLORS.green);
        Scene.change(new PvPFightScene({
            role: "host", socket: this.socket, room: this.room,
            localProgram: programCode, remoteProgram: this.opponentProgram,
            localLoadout: loadout, remoteLoadout: this.opponentLoadout
        }));
    }

    async leave() {
        this._leaving = true;
        if (this.socket) this.socket.close();
        try { await BackendClient.leaveRoom(this.room.id); } catch (_) {}
        Scene.change(new RoomsScene());
    }

    exit() {
        // Al volver temporalmente al editor conservamos el socket abierto.
        if (this._leaving && this.socket) this.socket.close();
        super.exit();
    }
}

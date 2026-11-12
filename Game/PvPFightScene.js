class PvPFightScene extends FightScene {
    constructor(options = {}) {
        // Reutiliza la base de combate de FightScene (mundo, física visual y
        // convenciones de sprites). El host conserva la autoridad de la simulación.
        super(null, null, "ai");
        this.name = "PvPFightScene";
        this.type = "World";
        this.role = options.role || "client";
        this.socket = options.socket || null;
        this.room = options.room || {};
        this.localProgram = options.localProgram || "";
        this.remoteProgram = options.remoteProgram || "";
        this.localLoadout = options.localLoadout || RobotLoadout.load();
        this.remoteLoadout = options.remoteLoadout || {};
        this.localName = this.localLoadout.name || "HOST";
        this.remoteName = this.remoteLoadout.name || "INVITADO";
        this.isHost = this.role === "host";
        this.state = null;
        this.sides = {};
        this.projectiles = [];
        this.projectileViews = [];
        this.elapsed = 0;
        this.snapshotTimer = 0;
        this.finished = false;
        this.lastStateAt = 0;
    }

    static preload() {
        return ["./Assets/arena.jpeg", "./Assets/Nave00.png", "./Assets/Fonts/Minecraft.ttf"];
    }

    onStart() {
        const bg = new Sprite();
        bg.img = AssetManager.getImage("./Assets/arena.jpeg");
        bg.size = new Vector2(800, 600);
        this.addChild(bg);

        RFUI.heading(this, "COMBATE MULTIJUGADOR", `HOST RELAY · SALA ${this.room.id || ""}`);
        RFUI.panel(this, 22, 90, 756, 400, "#081B29", "#24495B", 1, "PvPArena");
        this.leftName = RFUI.label(this, this.localName, 40, 103, 9, RFUI.COLORS.cyan);
        this.rightName = RFUI.label(this, this.remoteName, 760, 103, 9, RFUI.COLORS.orange, { align: RIGHT, width: 250 });
        this.leftHp = RFUI.label(this, "100 HP", 40, 127, 8, RFUI.COLORS.white);
        this.rightHp = RFUI.label(this, "100 HP", 760, 127, 8, RFUI.COLORS.white, { align: RIGHT, width: 250 });
        this.status = RFUI.label(this, this.isHost ? "Simulación autoritativa ejecutándose en el host." : "Esperando estado autoritativo del host...", 400, 515, 8, RFUI.COLORS.green, { align: CENTER, width: 700 });
        RFUI.button(this, "ABANDONAR", 28, 545, 140, 36, () => this.leave(), { fontSize: 8 });

        this.localNode = new Node();
        this.remoteNode = new Node();
        this.addChild(this.localNode);
        this.addChild(this.remoteNode);
        // Misma representación de unidades que FightScene: sprites de nave
        // anidados en nodos móviles, en vez de rectángulos independientes.
        this.localShape = new Sprite();
        this.localShape.name = "LocalRobotSprite";
        this.localShape.img = AssetManager.getImage("./Assets/Nave00.png");
        this.localShape.scale = new Vector2(0.17, 0.17);
        this.localNode.addChild(this.localShape);

        this.remoteShape = new Sprite();
        this.remoteShape.name = "RemoteRobotSprite";
        this.remoteShape.img = AssetManager.getImage("./Assets/Nave00.png");
        this.remoteShape.scale = new Vector2(0.17, 0.17);
        this.remoteShape.flip = true;
        this.remoteNode.addChild(this.remoteShape);
        this.projectileLayer = new Node();
        this.addChild(this.projectileLayer);
        this.localShieldRing = new FightShieldRing();
        this.remoteShieldRing = new FightShieldRing();
        this.addChild(this.localShieldRing);
        this.addChild(this.remoteShieldRing);

        if (this.isHost) this.initializeAuthority();
        else this.renderSnapshot(this.state);
        if (this.socket) {
            this.previousMessageHandler = this._socketHandler;
            this._socketHandler = event => this.handleSocketMessage(event);
            this.socket.addEventListener("message", this._socketHandler);
            this.socket.addEventListener("close", () => {
                if (!this.finished) this.status.setText("Conexión con el host perdida.");
            });
        }
    }

    createSide(id, source, loadout, x, y, facing) {
        const stats = RobotLoadout.stats({ ...RobotLoadout.defaults(), ...(loadout || {}) });
        const side = {
            id, name: loadout?.name || (id === "local" ? this.localName : this.remoteName),
            x, y, facing, hp: stats.hp, maxHp: stats.hp, stats,
            shield: 0, shieldCooldown: 0, fireCooldown: 0, move: { x: 0, y: 0, time: 0 },
            robot: null, failed: false
        };
        const robot = new RAssemblyRobot(source || this.defaultProgram());
        side.robot = robot;
        const register = (names, fn) => names.forEach(name => robot.registerModule(name, fn));
        register(["DETECTAR_ENEMIGO", "RADAR_DETECTAR", "RADAR"], () => {
            const enemy = this.sides[id === "local" ? "remote" : "local"];
            const d = Math.hypot(enemy.x - side.x, enemy.y - side.y);
            robot.setBuiltinVariables({
                ENEMIGO_CERCA: d < stats.radar, ENEMIGO_DETECTADO: d < stats.radar,
                DISTANCIA: Math.round(d), VIDA: side.hp, VIDA_MAXIMA: side.maxHp,
                ESCUDO_ACTIVO: side.shield > 0, ESCUDO_COOLDOWN: side.shieldCooldown,
                ENERGIA: 100
            });
        });
        register(["DISPARAR", "CAÑON_DISPARAR"], () => this.shoot(side));
        register(["ACTIVAR_ESCUDO", "ESCUDO_ACTIVAR"], () => {
            if (side.shieldCooldown <= 0) { side.shield = stats.shield; side.shieldCooldown = 4; }
        });
        register(["MOVER_IZQUIERDA"], () => this.move(side, -1, 0));
        register(["MOVER_DERECHA"], () => this.move(side, 1, 0));
        register(["MOVER_ARRIBA"], () => this.move(side, 0, -1));
        register(["MOVER_ABAJO"], () => this.move(side, 0, 1));
        register(["MOVER"], () => this.move(side, side.facing, 0));
        register(["ACERCARSE"], () => {
            const enemy = this.sides[id === "local" ? "remote" : "local"];
            const d = Math.max(1, Math.hypot(enemy.x-side.x, enemy.y-side.y));
            this.move(side, (enemy.x-side.x)/d, (enemy.y-side.y)/d);
        });
        register(["ALEJARSE"], () => {
            const enemy = this.sides[id === "local" ? "remote" : "local"];
            const d = Math.max(1, Math.hypot(enemy.x-side.x, enemy.y-side.y));
            this.move(side, (side.x-enemy.x)/d, (side.y-enemy.y)/d);
        });
        register(["ESQUIVAR"], () => this.move(side, 0, id === "local" ? -1 : 1));
        register(["REPARAR"], () => { side.hp = Math.min(side.maxHp, side.hp + 10); });
        register(["RECARGAR_ENERGIA", "GIRAR", "IMPRIMIR"], () => {});
        try {
            robot.compile();
            robot.vm.instructionsPerFrame = Math.max(1, stats.cpu);
        } catch (error) {
            side.failed = true;
            console.error(`[PvP] ${side.name}:`, error);
        }
        return side;
    }

    defaultProgram() {
        return `IMPORTAR "DETECTAR_ENEMIGO"\nIMPORTAR "DISPARAR"\nMIENTRAS VERDADERO HACER\n LLAMAR DETECTAR_ENEMIGO\n SI ENEMIGO_CERCA ENTONCES\n  LLAMAR DISPARAR\n FIN\nFIN`;
    }

    initializeAuthority() {
        this.sides.local = this.createSide("local", this.localProgram, this.localLoadout, 115, 280, 1);
        this.sides.remote = this.createSide("remote", this.remoteProgram, this.remoteLoadout, 635, 280, -1);
        this.syncNodes();
        this.broadcastSnapshot(true);
    }

    move(side, x, y) {
        const length = Math.max(1, Math.hypot(x, y));
        side.move = { x: x / length, y: y / length, time: 0.35 };
    }

    shoot(side) {
        if (side.fireCooldown > 0 || side.hp <= 0) return;
        side.fireCooldown = Math.max(0.25, 0.72 - side.stats.cpu * 0.012);
        const enemy = this.sides[side.id === "local" ? "remote" : "local"];
        const dx = enemy.x - side.x, dy = enemy.y - side.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        this.projectiles.push({
            owner: side.id, x: side.x + 20, y: side.y + 20,
            vx: dx / d * 420, vy: dy / d * 420,
            damage: Math.max(1, side.stats.damage), life: 2
        });
    }

    stepAuthority(dt) {
        this.elapsed += dt;
        for (const side of Object.values(this.sides)) {
            side.fireCooldown = Math.max(0, side.fireCooldown - dt);
            side.shieldCooldown = Math.max(0, side.shieldCooldown - dt);
            side.shield = Math.max(0, side.shield - dt);
            if (side.move.time > 0) {
                side.x = Math.max(40, Math.min(718, side.x + side.move.x * side.stats.speed * 24 * dt));
                side.y = Math.max(145, Math.min(445, side.y + side.move.y * side.stats.speed * 24 * dt));
                side.move.time -= dt;
            }
            if (!side.failed && side.robot?.vm?.running) {
                try {
                    const enemy = this.sides[side.id === "local" ? "remote" : "local"];
                    const d = Math.hypot(enemy.x-side.x, enemy.y-side.y);
                    side.robot.setBuiltinVariables({
                        ENEMIGO_CERCA: d <= side.stats.radar,
                        ENEMIGO_DETECTADO: d <= side.stats.radar,
                        DISTANCIA: Math.round(d), VIDA: side.hp, VIDA_MAXIMA: side.maxHp,
                        ESCUDO_ACTIVO: side.shield > 0, ESCUDO_COOLDOWN: side.shieldCooldown,
                        ENERGIA: 100
                    });
                    side.robot.vm.update();
                    if (!side.robot.vm.running && side.robot.vm.program) {
                        side.robot.vm.variables = {};
                        side.robot.vm.load(side.robot.vm.program);
                    }
                } catch (error) { side.failed = true; }
            }
        }
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            const target = this.sides[p.owner === "local" ? "remote" : "local"];
            if (Math.hypot(target.x + 20 - p.x, target.y + 20 - p.y) < 27) {
                const reduction = target.shield > 0 ? 0.8 : 0;
                target.hp = Math.max(0, target.hp - p.damage * (1 - reduction));
                this.projectiles.splice(i, 1);
            } else if (p.life <= 0 || p.x < 0 || p.x > 800 || p.y < 0 || p.y > 600) {
                this.projectiles.splice(i, 1);
            }
        }
        if (this.sides.local.hp <= 0 || this.sides.remote.hp <= 0) {
            this.finished = true;
            const winner = this.sides.local.hp > 0 ? "local" : "remote";
            const localScore = winner === "local" ? 1000 + Math.floor(this.sides.local.hp) * 5 : 100;
            const remoteScore = winner === "remote" ? 1000 + Math.floor(this.sides.remote.hp) * 5 : 100;
            const myScore = this.isHost ? localScore : remoteScore;
            if (!this._scoreSubmitted && typeof BackendClient !== "undefined" && BackendClient.token()) {
                this._scoreSubmitted = true;
                BackendClient.submitScore(myScore).catch(error => console.warn("[PvP] No se pudo guardar el puntaje:", error.message));
            }
            this.status.setText(`Combate finalizado · Ganador: ${this.sides[winner].name}`);
            if (this.socket?.readyState === WebSocket.OPEN)
                this.socket.send(JSON.stringify({ type: "fight:phase", payload: { phase: "finished", winner, scores: { local: localScore, remote: remoteScore } } }));
        }
        this.syncNodes();
        this.syncProjectileViews(this.projectiles);
        this.snapshotTimer += dt;
        if (this.snapshotTimer >= 0.05) {
            this.snapshotTimer = 0;
            this.broadcastSnapshot();
        }
    }

    syncNodes() {
        const l = this.sides.local, r = this.sides.remote;
        if (!l || !r) return;
        this.localNode.pos = new Vector2(l.x, l.y);
        this.remoteNode.pos = new Vector2(r.x, r.y);
        this.leftHp.setText(`${Math.ceil(l.hp)} / ${l.maxHp} HP`);
        this.rightHp.setText(`${Math.ceil(r.hp)} / ${r.maxHp} HP`);
        this.localShieldRing.pos = new Vector2(l.x + 20, l.y + 20);
        this.remoteShieldRing.pos = new Vector2(r.x + 20, r.y + 20);
        this.localShieldRing.visible = l.shield > 0;
        this.remoteShieldRing.visible = r.shield > 0;
        this.leftName.setText(l.name);
        this.rightName.setText(r.name);
    }

    syncProjectileViews(projectiles) {
        while (this.projectileViews.length < projectiles.length) {
            const view = RFUI.panel(this.projectileLayer, 0, 0, 9, 5, RFUI.COLORS.cyan, RFUI.COLORS.white, 1);
            this.projectileViews.push(view);
        }
        while (this.projectileViews.length > projectiles.length) {
            const view = this.projectileViews.pop();
            if (view.parent) view.parent.removeChild(view);
        }
        projectiles.forEach((p, i) => {
            this.projectileViews[i].pos = new Vector2(p.x, p.y);
            this.projectileViews[i].color = new Color(p.owner === "local" ? RFUI.COLORS.cyan : RFUI.COLORS.orange);
        });
    }

    makeSnapshot() {
        return {
            elapsed: this.elapsed, finished: this.finished,
            sides: Object.fromEntries(Object.entries(this.sides).map(([id, s]) => [id, {
                name: s.name, x: s.x, y: s.y, hp: s.hp, maxHp: s.maxHp, shield: s.shield
            }])),
            projectiles: this.projectiles.map(p => ({ x: p.x, y: p.y, owner: p.owner }))
        };
    }

    broadcastSnapshot(force = false) {
        if (!this.isHost || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify({ type: "state", payload: this.makeSnapshot() }));
    }

    renderSnapshot(snapshot) {
        if (!snapshot?.sides) return;
        this.state = snapshot;
        const l = snapshot.sides.local, r = snapshot.sides.remote;
        if (!l || !r) return;
        this.localNode.pos = new Vector2(l.x, l.y);
        this.remoteNode.pos = new Vector2(r.x, r.y);
        this.leftName.setText(l.name); this.rightName.setText(r.name);
        this.leftHp.setText(`${Math.ceil(l.hp)} / ${l.maxHp} HP`);
        this.rightHp.setText(`${Math.ceil(r.hp)} / ${r.maxHp} HP`);
        this.localShieldRing.pos = new Vector2(l.x + 20, l.y + 20);
        this.remoteShieldRing.pos = new Vector2(r.x + 20, r.y + 20);
        this.localShieldRing.visible = l.shield > 0;
        this.remoteShieldRing.visible = r.shield > 0;
        this.syncProjectileViews(snapshot.projectiles || []);
        this.status.setText(snapshot.finished ? "Combate finalizado." : "Sincronizando estado del host...");
        if (snapshot.finished) this.finished = true;
    }

    handleSocketMessage(event) {
        let msg;
        try { msg = JSON.parse(event.data); } catch (_) { return; }
        if (msg.type === "state" && !this.isHost) this.renderSnapshot(msg.payload);
        if (msg.type === "fight:phase" && msg.payload?.phase === "finished") {
            this.status.setText(`Combate finalizado · Ganador: ${msg.payload.winner}`);
            if (!this._scoreSubmitted && typeof BackendClient !== "undefined" && BackendClient.token()) {
                this._scoreSubmitted = true;
                const won = msg.payload.winner === "remote";
                BackendClient.submitScore(won ? (msg.payload.scores?.remote || 1000) : (msg.payload.scores?.remote || 100))
                    .catch(error => console.warn("[PvP] No se pudo guardar el puntaje:", error.message));
            }
        }
    }

    tick(dt) {
        if (this.isHost && !this.finished) this.stepAuthority(Math.min(dt, 0.05));
    }

    leave() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN)
            this.socket.send(JSON.stringify({ type: this.isHost ? "fight:phase" : "input", payload: { phase: "leave" } }));
        if (this.socket) this.socket.close();
        BackendClient.leaveRoom(this.room.id).catch(() => {});
        Scene.change(new RoomsScene());
    }

    exit() {
        if (this.socket && this._socketHandler)
            this.socket.removeEventListener("message", this._socketHandler);
        super.exit();
    }
}

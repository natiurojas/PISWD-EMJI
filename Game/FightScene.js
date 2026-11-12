class FightShieldRing extends Node {
    constructor() { super(); this.name = "FightShieldRing"; this.size = new Vector2(1, 1); this.visible = false; }
    draw() {
        if (!this.visible) return;
        push(); translate(this.globalPosX, this.globalPosY); noFill(); stroke(60, 220, 255, 190); strokeWeight(3);
        ellipse(0, 0, 92, 92); stroke(150, 245, 255, 90); strokeWeight(1); ellipse(0, 0, 104, 104); pop();
    }
}

class FightScene extends Scene {
    constructor(source = null, levelId = null, controlMode = "ai") {
        super();
        this.type = "World";
        this.name = "FightScene";
        this.source = source;
        this.levelId = levelId;
        this.controlMode = controlMode;
        this.manualInput = { x: 0, y: 0, shoot: false, shield: false, boost: false };
        this.manualSocket = null;
        this.manualConnected = false;
        this.level = GameLevels.get(levelId);
        this.time = 0;
        this.finished = false;
        this.victory = false;
        this.programFailed = false;
        this.playerX = 150;
        this.playerY = 300;
        this.enemyX = 620;
        this.enemyY = 280;
        this.playerMoveTimer = 0;
        this.playerFireCooldown = 0;
        this.playerShieldTimer = 0;
        this.playerShieldCooldown = 0;
        this.playerEvasionTimer = 0;
        this.playerRepairCooldown = 0;
        this.playerLaserTimer = 0;
        this.enemyLaserTimer = 0;
        this.enemyFireTimer = this.level.openingDelay ?? 1.4;
        this.enemyBurstLeft = 0;
        this.enemyBurstTimer = 0;
        this.damageDealt = 0;
        this.score = 0;
        this.projectiles = [];
        this.robotMove = { x: 0, y: 0, time: 0 };
        this.energy = 100;
    }

    static preload() {
        return [
            "./Assets/arena.jpeg",
            "./Assets/Nave00.png",
            "./Assets/Fonts/Minecraft.ttf",
            ...GameLevels.imagePaths()
        ];
    }

    onStart() {
        if (typeof AudioPlayer !== "undefined") AudioPlayer.play("battleStart");
        const loadout = typeof RobotLoadout !== "undefined"
            ? RobotLoadout.load()
            : null;

        this.robotName = loadout && loadout.name
            ? loadout.name
            : (typeof User !== "undefined" && User.load() ? User.load().name : "RF-01");

        this.stats = typeof RobotLoadout !== "undefined"
            ? RobotLoadout.stats(loadout)
            : {
                hp: 105,
                armor: 3,
                speed: 6,
                cannons: 2,
                damage: 20,
                radar: 250,
                shield: 2,
                cpu: 10
            };

        this.playerMaxHp = this.stats.hp;
        this.playerHp = this.playerMaxHp;
        this.enemyMaxHp = this.level.hp;
        this.enemyHp = this.enemyMaxHp;

        const arena = new Sprite();
        arena.name = "Arena";
        arena.img = AssetManager.getImage("./Assets/arena.jpeg");
        arena.size = new Vector2(Game.instance.width, Game.instance.height);
        this.addChild(arena);

        this.playerShip = new Sprite();
        this.playerShip.name = "PlayerShip";
        this.playerShip.img = AssetManager.getImage("./Assets/Nave00.png");
        this.playerShip.scale = new Vector2(0.17, 0.17);
        this.playerWidth = this.playerShip.size.x * this.playerShip.scale.x;
        this.playerHeight = this.playerShip.size.y * this.playerShip.scale.y;

        this.playerNode = new Node();
        this.playerNode.name = "PlayerNode";
        this.playerNode.pos = new Vector2(this.playerX, this.playerY);
        this.playerNode.addChild(this.playerShip);
        this.addChild(this.playerNode);

        this.enemyShip = new Sprite();
        this.enemyShip.name = "EnemyShip";
        this.enemyShip.img = AssetManager.getImage(this.level.image);
        this.enemyShip.scale = new Vector2(this.level.battleScale, this.level.battleScale);
        this.enemyShip.flip = true;
        this.enemyWidth = this.enemyShip.size.x * this.enemyShip.scale.x;
        this.enemyHeight = this.enemyShip.size.y * this.enemyShip.scale.y;

        this.enemyNode = new Node();
        this.enemyNode.name = "EnemyNode";
        this.enemyNode.pos = new Vector2(this.enemyX, this.enemyY);
        this.enemyNode.addChild(this.enemyShip);
        this.addChild(this.enemyNode);

        this.shieldRing = new FightShieldRing();
        this.addChild(this.shieldRing);

        this.playerLaser = this.createLaser("playerLaser", RFUI.COLORS.cyan);
        this.enemyLaser = this.createLaser("enemyLaser", RFUI.COLORS.red);

        this.buildHud();
        if (this.controlMode === "manual") this.setupManualControl();
        else this.setupRobot();

        const blackScreen = new Panel();
        blackScreen.size = new Vector2(Game.instance.width, Game.instance.height);
        blackScreen.color = new Color("#000000");
        blackScreen.colorA = 255;

        const blackScreenAnim = new Animation();
        blackScreenAnim
            .setFrames(36)
            .to(
                1,
                24,
                blackScreen,
                {
                    colorA: {
                        from: 255,
                        to: 0
                    }
                },
                "LINEAR"
            )
            .onFinish = () => {
                blackScreen.visible = false;
            };

        this.addChild(blackScreen);
        blackScreenAnim.play();
    }

    setupManualControl() {
        this.programStatus.setText("MODO MANUAL // Conectá Android por WebSocket");
        this.manualStatus = RFUI.label(this, "WS: DESCONECTADO", 400, 77, 8, RFUI.COLORS.orange, { align: CENTER, width: 320 });
        RFUI.button(this, "CONECTAR ANDROID", 320, 535, 160, 38, () => this.connectManualController(), {
            fontSize: 8, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan
        });
        RFUI.button(this, "VOLVER", 28, 535, 105, 38, () => {
            this.closeManualSocket();
            Scene.change(new MainMenu());
        }, { fontSize: 8 });
        this.connectManualController();
    }

    connectManualController() {
        const defaultUrl = `ws://${location.hostname || "localhost"}:8080`;
        const url = prompt("Dirección WebSocket del servidor (ej. ws://192.168.1.20:8080):", defaultUrl);
        if (!url) return;
        try {
            this.closeManualSocket();
            this.manualSocket = new WebSocket(url);
            this.manualSocket.onopen = () => {
                this.manualConnected = true;
                this.manualStatus.setText("WS: ANDROID CONECTADO");
                this.manualStatus.color = new Color(RFUI.COLORS.green);
            };
            this.manualSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type !== "input") return;
                    const m = data.movement || {};
                    this.manualInput.x = Math.max(-1, Math.min(1, Number(m.x) || 0));
                    this.manualInput.y = Math.max(-1, Math.min(1, Number(m.y) || 0));
                    this.manualInput.shoot = data.shoot === true;
                    this.manualInput.shield = data.shield === true;
                    this.manualInput.boost = data.boost === true;
                } catch (error) { console.warn("Paquete de control inválido", error); }
            };
            this.manualSocket.onclose = () => {
                this.manualConnected = false;
                if (this.manualStatus) {
                    this.manualStatus.setText("WS: DESCONECTADO");
                    this.manualStatus.color = new Color(RFUI.COLORS.orange);
                }
                this.manualInput = { x: 0, y: 0, shoot: false, shield: false, boost: false };
            };
            this.manualSocket.onerror = () => {
                if (this.manualStatus) this.manualStatus.setText("WS: ERROR DE CONEXIÓN");
            };
        } catch (error) { this.manualStatus.setText("URL WebSocket inválida"); }
    }

    closeManualSocket() {
        if (this.manualSocket) {
            this.manualSocket.onclose = null;
            this.manualSocket.close();
            this.manualSocket = null;
        }
        this.manualConnected = false;
    }

    setupRobot() {
        const defaultSource = `
            IMPORTAR "DETECTAR_ENEMIGO"
            IMPORTAR "DISPARAR"

            VAR enemigo = 0

            LLAMAR DETECTAR_ENEMIGO

            SI enemigo == 1 ENTONCES
                LLAMAR DISPARAR
            FIN
        `;

        this.robot = new RAssemblyRobot(this.source || defaultSource);
        this.robot.loadout = typeof RobotLoadout !== "undefined"
            ? RobotLoadout.load()
            : null;
        this.robot.robotStats = this.stats;

        this.robot.registerModule("DETECTAR_ENEMIGO", (robot, vm) => this.detectEnemy(vm));
        this.robot.registerModule("RADAR_DETECTAR", (robot, vm) => this.detectEnemy(vm));
        this.robot.registerModule("RADAR", (robot, vm) => this.detectEnemy(vm));
        this.robot.registerModule("DISPARAR", () => this.playerShoot());
        this.robot.registerModule("CAÑON_DISPARAR", () => this.playerShoot());
        this.robot.registerModule("ACTIVAR_ESCUDO", () => this.activateShield());
        this.robot.registerModule("ESCUDO_ACTIVAR", () => this.activateShield());
        this.robot.registerModule("MOVER", () => this.playerMove());
        this.robot.registerModule("MOVER_IZQUIERDA", () => this.moveRobot(-1, 0));
        this.robot.registerModule("MOVER_DERECHA", () => this.moveRobot(1, 0));
        this.robot.registerModule("MOVER_ARRIBA", () => this.moveRobot(0, -1));
        this.robot.registerModule("MOVER_ABAJO", () => this.moveRobot(0, 1));
        this.robot.registerModule("ACERCARSE", () => this.moveTowardEnemy(1));
        this.robot.registerModule("ALEJARSE", () => this.moveTowardEnemy(-1));
        this.robot.registerModule("ESQUIVAR", () => {
            this.playerEvasionTimer = Math.max(this.playerEvasionTimer, 1.1);
        });
        this.robot.registerModule("REPARAR", () => {
            if (this.playerRepairCooldown <= 0) {
                this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 12);
                this.playerRepairCooldown = 5;
                this.updateHud();
            }
        });
        this.robot.registerModule("RECARGAR_ENERGIA", () => {
            this.energy = Math.min(100, this.energy + 18);
        });
        this.robot.registerModule("GIRAR", () => {});
        this.robot.registerModule("IMPRIMIR", () => {});

        try {
            this.robot.compile();
            this.robot.vm.instructionsPerFrame = Math.max(1, this.stats.cpu);
        }
        catch (error) {
            this.failProgram(error.message);
        }
    }

    buildHud() {
        RFUI.panel(this, 0, 0, 800, 58, "#07111F", "#24495B", 1, "HudBar");
        RFUI.panel(this, 0, 57, 800, 1, this.level.color, this.level.color, 0, "HudAccent");

        RFUI.label(
            this,
            `${this.level.name}  //  ${this.level.enemy}`,
            400,
            7,
            9,
            this.level.color,
            { align: CENTER, width: 600 }
        );

        RFUI.label(this, this.robotName || "RF-01", 28, 8, 8, RFUI.COLORS.white);
        this.playerHpLabel = RFUI.label(
            this,
            "",
            268,
            19,
            7,
            RFUI.COLORS.white,
            { align: RIGHT, width: 240 }
        );

        this.playerHpBg = RFUI.panel(
            this,
            28,
            33,
            240,
            9,
            "#102B3D",
            "#24495B",
            1,
            "PlayerHpBackground"
        );

        this.playerHpFill = new Panel();
        this.playerHpFill.name = "PlayerHpFill";
        this.playerHpFill.pos = new Vector2(29, 34);
        this.playerHpFill.size = new Vector2(238, 7);
        this.playerHpFill.color = new Color(RFUI.COLORS.green);
        this.playerHpFill.borderSize = 0;
        this.addChild(this.playerHpFill);

        RFUI.label(
            this,
            this.level.enemy,
            772,
            8,
            8,
            RFUI.COLORS.white,
            { align: RIGHT, width: 240 }
        );

        this.enemyHpLabel = RFUI.label(
            this,
            "",
            532,
            19,
            7,
            RFUI.COLORS.white,
            { width: 240 }
        );

        this.enemyHpBg = RFUI.panel(
            this,
            532,
            33,
            240,
            9,
            "#102B3D",
            "#24495B",
            1,
            "EnemyHpBackground"
        );

        this.enemyHpFill = new Panel();
        this.enemyHpFill.name = "EnemyHpFill";
        this.enemyHpFill.pos = new Vector2(533, 34);
        this.enemyHpFill.size = new Vector2(238, 7);
        this.enemyHpFill.color = new Color(this.level.color);
        this.enemyHpFill.borderSize = 0;
        this.addChild(this.enemyHpFill);

        this.timerLabel = RFUI.label(
            this,
            "0.0s",
            400,
            21,
            8,
            RFUI.COLORS.muted,
            { align: CENTER, width: 120 }
        );

        this.shieldLabel = RFUI.label(
            this,
            "",
            400,
            43,
            7,
            RFUI.COLORS.cyan,
            { align: CENTER, width: 280 }
        );

        this.programStatus = RFUI.label(
            this,
            "",
            28,
            63,
            7,
            RFUI.COLORS.red,
            { maxWidth: 744 }
        );

        this.updateHud();
    }

    createLaser(name, color) {
        const laser = new Panel();
        laser.name = name;
        laser.size = new Vector2(1, 3);
        laser.color = new Color(color);
        laser.colorA = 230;
        laser.borderSize = 0;
        laser.visible = false;
        this.addChild(laser);
        return laser;
    }

    detectEnemy(vm) {
        const distance = this.distance();
        const range = Math.max(220, this.stats.radar);
        const detected = this.enemyHp > 0 && distance <= range;

        if (this.robot) this.robot.setBuiltinVariables(this.getEnvironmentVariables(detected, distance));
    }

    getEnvironmentVariables(detected = this.enemyHp > 0 && this.distance() <= this.stats.radar, distance = this.distance()) {
        return {
            ENEMIGO_CERCA: Boolean(detected), ENEMIGO_DETECTADO: Boolean(detected),
            DISTANCIA: Math.round(distance), VIDA: this.playerHp, VIDA_MAXIMA: this.playerMaxHp,
            ESCUDO_ACTIVO: this.playerShieldTimer > 0, ESCUDO_COOLDOWN: Number(this.playerShieldCooldown.toFixed(2)),
            ENERGIA: Math.round(this.energy)
        };
    }

    moveRobot(x, y) {
        this.robotMove.x = x; this.robotMove.y = y; this.robotMove.time = 0.22;
    }

    moveTowardEnemy(direction = 1) {
        const playerCenterX = this.playerX + this.playerWidth / 2;
        const playerCenterY = this.playerY + this.playerHeight / 2;
        const enemyCenterX = this.enemyX + this.enemyWidth / 2;
        const enemyCenterY = this.enemyY + this.enemyHeight / 2;
        const dx = enemyCenterX - playerCenterX;
        const dy = enemyCenterY - playerCenterY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        this.moveRobot((dx / distance) * direction, (dy / distance) * direction);
    }

    playerShoot() {
        if (this.finished || this.playerFireCooldown > 0)
            return;

        if (this.distance() > Math.max(260, this.stats.radar))
            return;

        this.playerFireCooldown = Math.max(0.24, 0.65 - this.stats.cpu * 0.015);

        const damage = Math.max(
            1,
            this.stats.damage + Math.floor(this.stats.cannons * 2) - this.level.armor
        );

        this.spawnProjectile(damage);
        if (typeof AudioPlayer !== "undefined") AudioPlayer.play("laser");

        this.showLaser(
            this.playerLaser,
            this.playerX,
            this.playerY,
            this.playerWidth,
            this.playerHeight,
            this.enemyX,
            this.enemyY,
            this.enemyWidth,
            this.enemyHeight
        );

        this.playerLaserTimer = 0.08;

        if (this.enemyHp <= 0)
            this.finish(true);
    }

    spawnProjectile(damage) {
        const projectile = new Panel();
        projectile.name = "PlayerProjectile";
        projectile.size = new Vector2(10, 5);
        projectile.color = new Color(RFUI.COLORS.cyan);
        projectile.borderSize = 0;

        // Apunta al centro actual del enemigo en lugar de avanzar siempre
        // horizontalmente. Esto mantiene el disparo alineado con el objetivo
        // aunque el robot y el enemigo estén a distintas alturas.
        const startX = this.playerX + this.playerWidth * 0.5;
        const startY = this.playerY + this.playerHeight * 0.5;
        const targetX = this.enemyX + this.enemyWidth * 0.5;
        const targetY = this.enemyY + this.enemyHeight * 0.5;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const length = Math.max(1, Math.hypot(dx, dy));
        const speed = 520;

        projectile.pos = new Vector2(startX, startY);
        this.addChild(projectile);
        this.projectiles.push({
            node: projectile,
            x: startX, y: startY,
            vx: (dx / length) * speed,
            vy: (dy / length) * speed,
            damage
        });
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.node.pos = new Vector2(p.x, p.y);

            const hit =
                p.x + p.node.size.x >= this.enemyX &&
                p.x <= this.enemyX + this.enemyWidth &&
                p.y + p.node.size.y >= this.enemyY &&
                p.y <= this.enemyY + this.enemyHeight;

            if (hit) {
                this.enemyHp = Math.max(0, this.enemyHp - p.damage);
                this.damageDealt += p.damage;
                this.removeChild(p.node);
                this.projectiles.splice(i, 1);
                if (this.enemyHp <= 0) this.finish(true);
            } else if (
                p.x < -20 || p.x > 820 ||
                p.y < -20 || p.y > 620
            ) {
                this.removeChild(p.node);
                this.projectiles.splice(i, 1);
            }
        }
    }

    activateShield() {
        if (this.finished || this.playerShieldCooldown > 0)
            return;
        if (typeof AudioPlayer !== "undefined") AudioPlayer.play("shield");

        this.playerShieldTimer = this.stats.shield;
        this.playerShieldCooldown = 4.5;
    }

    playerMove() {
        if (this.finished)
            return;

        this.playerMoveTimer = 0.35;
        this.playerEvasionTimer = Math.max(this.playerEvasionTimer, 1.2);
    }

    enemyShoot() {
        if (this.finished)
            return;

        this.showLaser(
            this.enemyLaser,
            this.enemyX,
            this.enemyY,
            this.enemyWidth,
            this.enemyHeight,
            this.playerX,
            this.playerY,
            this.playerWidth,
            this.playerHeight
        );

        this.enemyLaserTimer = 0.08;

        if (this.playerEvasionTimer > 0 && Math.random() < (this.level.evasionChance ?? 0.35))
            return;

        if (this.playerShieldTimer > 0)
            return;

        const damage = Math.max(
            1,
            this.level.damage - Math.floor(this.stats.armor / 2)
        );

        this.playerHp = Math.max(0, this.playerHp - damage);

        if (this.playerHp <= 0)
            this.finish(false);
    }

    showLaser(laser, fromX, fromY, fromW, fromH, toX, toY, toW, toH) {
        const startX = fromX + fromW / 2;
        const startY = fromY + fromH / 2;
        const endX = toX + toW / 2;
        const endY = toY + toH / 2;
        const dx = endX - startX;
        const dy = endY - startY;

        laser.pos = new Vector2(startX, startY);
        laser.size = new Vector2(Math.hypot(dx, dy), 3);
        laser.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
        laser.visible = true;
    }

    distance() {
        const playerCenterX = this.playerX + this.playerWidth / 2;
        const playerCenterY = this.playerY + this.playerHeight / 2;
        const enemyCenterX = this.enemyX + this.enemyWidth / 2;
        const enemyCenterY = this.enemyY + this.enemyHeight / 2;

        return Math.hypot(enemyCenterX - playerCenterX, enemyCenterY - playerCenterY);
    }

    tick(dt) {
        if (this.finished)
            return;

        this.time += dt;

        this.playerFireCooldown = Math.max(0, this.playerFireCooldown - dt);
        this.playerShieldCooldown = Math.max(0, this.playerShieldCooldown - dt);
        this.playerShieldTimer = Math.max(0, this.playerShieldTimer - dt);
        this.playerEvasionTimer = Math.max(0, this.playerEvasionTimer - dt);
        this.playerRepairCooldown = Math.max(0, this.playerRepairCooldown - dt);
        this.playerLaserTimer = Math.max(0, this.playerLaserTimer - dt);
        this.enemyLaserTimer = Math.max(0, this.enemyLaserTimer - dt);

        if (this.controlMode === "manual") {
            const speed = this.stats.speed * (this.manualInput.boost ? 34 : 22);
            this.playerX = Math.max(35, Math.min(735 - this.playerWidth, this.playerX + this.manualInput.x * speed * dt));
            this.playerY = Math.max(90, Math.min(490 - this.playerHeight, this.playerY + this.manualInput.y * speed * dt));
            if (this.manualInput.shoot && this.playerFireCooldown <= 0) this.playerShoot();
            if (this.manualInput.shield && !this._manualShieldWasDown) this.activateShield();
            this._manualShieldWasDown = this.manualInput.shield;
        } else {
            if (this.playerMoveTimer > 0) {
                const targetX = Math.max(90, Math.min(360, this.enemyX - 110));
                const direction = Math.sign(targetX - this.playerX);
                this.playerX += direction * this.stats.speed * 22 * dt;
                this.playerMoveTimer -= dt;
            }
            if (this.robotMove.time > 0) {
                const speed = this.stats.speed * 35 * dt;
                this.playerX = Math.max(35, Math.min(735 - this.playerWidth, this.playerX + this.robotMove.x * speed));
                this.playerY = Math.max(90, Math.min(490 - this.playerHeight, this.playerY + this.robotMove.y * speed));
                this.robotMove.time -= dt;
            }
        }
        this.enemyY = 280 + Math.sin(this.time * 2.2 + 1) * 70;

        const desiredEnemyX = Math.max(260, Math.min(620, this.playerX + 180));
        const enemyDelta = desiredEnemyX - this.enemyX;

        if (Math.abs(enemyDelta) > 1)
            this.enemyX += Math.sign(enemyDelta) * Math.min(Math.abs(enemyDelta), this.level.speed * dt);

        this.updateProjectiles(dt);
        this.playerNode.pos = new Vector2(this.playerX, this.playerY);
        //this.enemyNode.pos = new Vector2(this.enemyX, this.enemyY);
        this.enemyNode.posX = this.enemyX;
        this.enemyNode.posY = this.enemyY;
        this.shieldRing.pos = new Vector2(this.playerX + this.playerWidth / 2, this.playerY + this.playerHeight / 2);
        this.shieldRing.visible = this.playerShieldTimer > 0;

        this.enemyFireTimer -= dt;

        if (this.enemyBurstTimer > 0)
            this.enemyBurstTimer = Math.max(0, this.enemyBurstTimer - dt);

        if (this.enemyFireTimer <= 0) {
            this.enemyFireTimer = this.level.fireRate;
            this.enemyBurstLeft = Math.max(0, (this.level.burst ?? 1) - 1);
            this.enemyBurstTimer = this.level.burstGap ?? 0.16;
            this.enemyShoot();
        }

        if (this.enemyBurstLeft > 0 && this.enemyBurstTimer <= 0) {
            this.enemyBurstLeft--;
            this.enemyBurstTimer = this.level.burstGap ?? 0.16;
            this.enemyShoot();
        }

        if (this.finished)
            return;

        if (this.playerLaserTimer <= 0)
            this.playerLaser.visible = false;

        if (this.enemyLaserTimer <= 0)
            this.enemyLaser.visible = false;

        if (this.controlMode !== "manual") this.runProgram();

        if (this.finished)
            return;

        this.updateHud();
    }

    runProgram() {
        if (this.programFailed || !this.robot)
            return;

        try {
            this.robot.setBuiltinVariables(this.getEnvironmentVariables());
            this.robot.vm.update();

            if (!this.robot.vm.running && this.robot.vm.program) {
                this.robot.vm.variables = {};
                this.robot.vm.load(this.robot.vm.program);
            }
        }
        catch (error) {
            this.failProgram(error.message);
        }
    }

    failProgram(message) {
        this.programFailed = true;

        if (this.robot && this.robot.vm)
            this.robot.vm.running = false;

        if (this.programStatus)
            this.programStatus.setText(`ERROR DE PROGRAMA: ${message}`);
    }

    updateHud() {
        const playerRatio = this.playerMaxHp > 0
            ? Math.max(0, Math.min(1, this.playerHp / this.playerMaxHp))
            : 0;

        const enemyRatio = this.enemyMaxHp > 0
            ? Math.max(0, Math.min(1, this.enemyHp / this.enemyMaxHp))
            : 0;

        this.playerHpFill.size = new Vector2(238 * playerRatio, 7);
        this.playerHpFill.color = new Color(
            playerRatio > 0.5
                ? RFUI.COLORS.green
                : playerRatio > 0.25
                    ? RFUI.COLORS.orange
                    : RFUI.COLORS.red
        );

        this.enemyHpFill.size = new Vector2(238 * enemyRatio, 7);

        this.playerHpLabel.setText(`${Math.ceil(this.playerHp)} / ${this.playerMaxHp}`);
        this.enemyHpLabel.setText(`${Math.ceil(this.enemyHp)} / ${this.enemyMaxHp}`);
        this.timerLabel.setText(`${this.time.toFixed(1)}s`);

        if (this.playerShieldTimer > 0)
            this.shieldLabel.setText(`ESCUDO ACTIVO  ${this.playerShieldTimer.toFixed(1)}s`);
        else if (this.playerEvasionTimer > 0)
            this.shieldLabel.setText("MANIOBRA EVASIVA");
        else if (this.playerShieldCooldown > 0)
            this.shieldLabel.setText(`ESCUDO RECARGANDO  ${this.playerShieldCooldown.toFixed(1)}s`);
        else
            this.shieldLabel.setText("");
    }

    finish(victory) {
        if (this.finished)
            return;

        this.finished = true;
        this.victory = victory;
        this.closeManualSocket();

        if (this.robot && this.robot.vm)
            this.robot.vm.running = false;

        this.playerLaser.visible = false;
        this.enemyLaser.visible = false;

        if (victory) {
            GameLevels.complete(this.level.id);
            this.score = Math.round(
                this.damageDealt +
                this.level.reward +
                Math.max(0, 90 - this.time) * 4 +
                this.playerHp * 2
            );
        }
        else {
            this.score = Math.round(this.damageDealt * 0.5);
        }

        if (typeof AudioPlayer !== "undefined")
            AudioPlayer.play(victory ? "victory" : "defeat");
        if (typeof User !== "undefined")
            User.recordScore(this.score);
        if (typeof BackendClient !== "undefined" && BackendClient.token()) {
            BackendClient.submitScore(this.score)
                .catch(error => console.warn("[EMJI] No se pudo guardar el puntaje online:", error.message));
        }

        this.showResult();
    }

    showResult() {
        const nextLevel = GameLevels.next(this.level.id);
        const accent = this.victory ? RFUI.COLORS.green : RFUI.COLORS.red;

        const overlay = RFUI.panel(
            this,
            0,
            0,
            800,
            600,
            "#03080E",
            "#03080E",
            0,
            "ResultOverlay"
        );
        overlay.colorA = 230;

        RFUI.panel(this, 170, 108, 460, 404, "#07141F", accent, 1, "ResultFrame");
        RFUI.panel(this, 170, 108, 460, 4, accent, accent, 0, "ResultAccent");

        RFUI.label(
            this,
            this.victory ? "VICTORIA" : "NAVE DESTRUIDA",
            400,
            139,
            30,
            accent,
            { align: CENTER, width: 400 }
        );

        RFUI.label(
            this,
            `${this.level.name}  //  ${this.level.enemy}`,
            400,
            191,
            9,
            RFUI.COLORS.muted,
            { align: CENTER, width: 420 }
        );

        RFUI.label(
            this,
            `PUNTAJE: ${this.score}`,
            400,
            221,
            17,
            RFUI.COLORS.orange,
            { align: CENTER, width: 420 }
        );

        let message = "La nave enemiga sigue en pie. Revisá tu programa e intentá otra vez.";

        if (this.victory)
            message = nextLevel
                ? "Sector despejado. El siguiente nivel está disponible."
                : "Campaña completada. Todos los sectores fueron despejados.";

        RFUI.label(
            this,
            message,
            400,
            257,
            8,
            RFUI.COLORS.white,
            { align: CENTER, maxWidth: 380 }
        );

        let buttonY = 316;

        if (this.victory && nextLevel) {
            RFUI.button(
                this,
                "SIGUIENTE NIVEL",
                250,
                buttonY,
                300,
                50,
                () => Scene.change(new FightScene(this.source, nextLevel.id)),
                {
                    name: "NextLevelButton",
                    fontSize: 10,
                    color: "#123A48",
                    hoverColor: "#195466",
                    border: RFUI.COLORS.green
                }
            );

            buttonY += 60;
        }

        RFUI.button(
            this,
            "REINTENTAR",
            250,
            buttonY,
            300,
            44,
            () => Scene.change(new FightScene(this.source, this.level.id)),
            {
                name: "RetryButton",
                fontSize: 9,
                color: "#123A48",
                hoverColor: "#195466",
                border: RFUI.COLORS.cyan
            }
        );

        buttonY += 54;

        RFUI.button(
            this,
            "VOLVER A NIVELES",
            250,
            buttonY,
            300,
            44,
            () => Scene.change(new LevelsScene()),
            {
                name: "BackToLevelsButton",
                fontSize: 9,
                color: "#191F3D",
                hoverColor: "#2C3560",
                border: RFUI.COLORS.purple
            }
        );
    }
}

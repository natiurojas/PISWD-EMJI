class MainMenu extends Scene {
    constructor() {
        super();
        this.type = "UI";
        this.name = "MainMenu";
        this.elapsed = 0;
    }

    static preload() {
        return [
            "./Assets/Nave00.png", "./Assets/dialog.png", "./Assets/Fonts/Minecraft.ttf",
            "./Assets/Ratcon/greet.png", "./Assets/Ratcon/happy.png", "./Assets/Ratcon/blink.png",
            "./Assets/Ratcon/point_right.png", "./Assets/Ratcon/point_up.png", "./Assets/Ratcon/sad.png"
        ];
    }

    onStart() {
        this.addChild(new RobotFightBackdrop());

        // Franja de marca superior.
        RFUI.panel(this, 28, 22, 4, 28, RFUI.COLORS.cyan, RFUI.COLORS.cyan, 0, "BrandAccent");
        RFUI.label(this, "R/F  //  ROBOT COMBAT LAB", 42, 21, 10, RFUI.COLORS.cyan);
        RFUI.label(this, "BUILD. CODE. SURVIVE.", 42, 39, 8, RFUI.COLORS.muted);
        RFUI.label(this, "BETA 0.4", 718, 26, 8, RFUI.COLORS.purple, { width: 55, align: RIGHT });

        RFUI.label(this, "ROBOT", 42, 82, 38, RFUI.COLORS.white);
        RFUI.label(this, "FIGHT", 42, 122, 38, RFUI.COLORS.cyan);
        RFUI.label(this, "NO ES SUERTE. ES CÓDIGO.", 45, 177, 12, RFUI.COLORS.orange);
        RFUI.label(this, "Disena una nave modular. Programa su IA con RAssembly.", 45, 201, 9, RFUI.COLORS.muted);
        RFUI.label(this, "Y despues... que hable el código.", 45, 218, 9, RFUI.COLORS.muted);

        // Pequeña ficha de sistema: comunica los pilares del juego.
        RFUI.panel(this, 42, 258, 340, 88, "#0B2030", "#24495B", 1, "CoreFeatures");
        RFUI.label(this, "TU ROBOT. TUS REGLAS.", 57, 272, 10, RFUI.COLORS.white);
        RFUI.label(this, "CPU", 58, 300, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "RAM", 143, 300, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "MÓDULOS", 223, 300, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "EJECUCIÓN", 58, 317, 7, RFUI.COLORS.muted);
        RFUI.label(this, "LÍMITES", 143, 317, 7, RFUI.COLORS.muted);
        RFUI.label(this, "COMBATE", 223, 317, 7, RFUI.COLORS.muted);
        RFUI.panel(this, 128, 298, 1, 35, "#24495B", "#24495B", 0);
        RFUI.panel(this, 207, 298, 1, 35, "#24495B", "#24495B", 0);

        // Botonera principal.
        RFUI.label(this, "CENTRO DE MANDO", 44, 367, 8, RFUI.COLORS.muted);
        RFUI.button(this, "PROGRAMAR", 42, 389, 163, 45, () => Scene.change(new RAssemblyEditor()), {
            name: "PlayButton", fontSize: 10, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan
        });
        RFUI.button(this, "PERSONALIZAR", 215, 389, 167, 45, () => Scene.change(new RobotWorkshopScene()), {
            name: "WorkshopButton", fontSize: 9, color: "#191F3D", hoverColor: "#2C3560", border: RFUI.COLORS.purple
        });
        RFUI.button(this, "NIVELES", 42, 444, 110, 43, () => Scene.change(new LevelsScene()), {
            name: "LevelsButton", fontSize: 10, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan
        });
        RFUI.button(this, "PUNTUACIONES", 160, 444, 120, 43, () => Scene.change(new ScoresScene()), {
            name: "ScoresButton", fontSize: 7, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan
        });
        RFUI.button(this, "OPCIONES", 288, 444, 94, 43, () => Scene.change(new SettingsScene()), {
            name: "SettingsButton", fontSize: 8, color: "#191F3D", hoverColor: "#2C3560", border: RFUI.COLORS.purple
        });
        RFUI.label(this, "VERSIÓN ESCOLAR  •  MULTIJUGADOR EN PREPARACIÓN", 43, 511, 7, RFUI.COLORS.muted);
        RFUI.label(this, "RAssembly convierte tus bloques en decisiones de combate.", 43, 530, 8, RFUI.COLORS.muted);

        // Tarjeta ilustrada de la nave.
        RFUI.panel(this, 420, 91, 335, 286, "#091A29", "#1D465B", 1, "ShipShowcase");
        RFUI.label(this, "UNIDAD DE PRUEBA // RF-01", 438, 108, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "CHASIS MODULAR", 438, 126, 7, RFUI.COLORS.muted);
        const ship = new Sprite();
        ship.name = "ShipPreview";
        ship.img = AssetManager.getImage("./Assets/Nave00.png");
        ship.scale = new Vector2(0.35, 0.35);
        ship.pos = new Vector2(502, 150);
        this.addChild(ship);
        // Retícula y lectura ficticia puramente decorativas.
        RFUI.panel(this, 445, 307, 285, 1, "#24495B", "#24495B", 0);
        RFUI.label(this, "CPU  10 C/T", 444, 322, 8, RFUI.COLORS.white);
        RFUI.label(this, "RAM  20 BLOQUES", 555, 322, 8, RFUI.COLORS.white);
        RFUI.label(this, "ESTADO // LISTO", 444, 344, 8, RFUI.COLORS.green);
        RFUI.label(this, "PREVIEW DE HANGAR", 603, 344, 7, RFUI.COLORS.muted);

        this.ratconDialog = new RatconDialogBox(
            "¡Buenas, piloto! Arma tu nave, escribi la estrategia y deja que RAssembly haga el resto.",
            "point_right",
            { width: 312, height: 87, bubbleOffset: 82, mascotScale: 0.19, textSize: 9 }
        );
        this.ratconDialog.pos = new Vector2(389, 408);
        this.addChild(this.ratconDialog);

        // Puntitos luminosos en los bordes del panel de hangar.
        this.statusDot = RFUI.panel(this, 736, 105, 5, 5, RFUI.COLORS.green, RFUI.COLORS.green, 0, "StatusDot");
        this.statusPulse = 0;
    }

    tick(dt) {
        this.elapsed += dt;
        this.statusPulse += dt;
        if (this.statusDot && RFUI.animationsEnabled()) this.statusDot.color = new Color(Math.sin(this.statusPulse * 3) > 0 ? RFUI.COLORS.green : "#2B6C5A");
        if (this.ratconDialog && Math.floor(this.elapsed / 9) % 2 === 1 && !this._ratconSecondMessage) {
            this._ratconSecondMessage = true;
            this.ratconDialog.setMessage("Tip: el radar detecta; tu programa decide cuándo disparar o activar el escudo.", "happy");
        } else if (Math.floor(this.elapsed / 9) % 2 === 0) {
            this._ratconSecondMessage = false;
            if (this.ratconDialog && this.ratconDialog._message !== "¡Buenas, piloto! Armá tu nave, escribí la estrategia y dejá que RAssembly haga el resto.") {
                this.ratconDialog.setMessage("¡Buenas, piloto! Armá tu nave, escribí la estrategia y dejá que RAssembly haga el resto.", "point_right");
            }
        }
    }
}

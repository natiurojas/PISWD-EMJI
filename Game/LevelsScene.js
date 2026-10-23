class LevelsScene extends Scene {
    constructor() {
        super();
        this.type = "UI";
        this.name = "LevelsScene";
        this.levels = GameLevels.list();
        this.progress = GameLevels.loadProgress();
    }

    static preload() {
        return [
            "./Assets/Fonts/Minecraft.ttf",
            ...GameLevels.imagePaths()
        ];
    }

    onStart() {
        this.addChild(new RobotFightBackdrop());

        RFUI.heading(
            this,
            "CAMPAÑA",
            "Elegí un sector, programá tu nave y sobreviví al combate."
        );

        const completed = this.progress.completed.length;
        RFUI.label(
            this,
            `PROGRESO  ${completed} / ${this.levels.length}`,
            770,
            29,
            9,
            RFUI.COLORS.orange,
            { align: RIGHT, width: 150 }
        );

        for (let i = 0; i < this.levels.length; i++)
            this.buildLevelCard(this.levels[i], i);

        RFUI.button(
            this,
            "EDITOR LIBRE",
            28,
            520,
            180,
            42,
            () => Scene.change(new RAssemblyEditor()),
            {
                name: "FreeEditorButton",
                fontSize: 9,
                color: "#123A48",
                hoverColor: "#195466",
                border: RFUI.COLORS.cyan
            }
        );

        RFUI.button(
            this,
            "SALAS",
            218,
            520,
            120,
            42,
            () => Scene.change(new RoomsScene()),
            {
                name: "RoomsButton",
                fontSize: 9,
                color: "#191F3D",
                hoverColor: "#2C3560",
                border: RFUI.COLORS.purple
            }
        );

        RFUI.button(
            this,
            "VOLVER AL MENÚ",
            620,
            520,
            152,
            42,
            () => Scene.change(new MainMenu()),
            {
                name: "BackButton",
                fontSize: 8,
                color: "#191F3D",
                hoverColor: "#2C3560",
                border: RFUI.COLORS.purple
            }
        );

        RFUI.label(
            this,
            "Completá un nivel para desbloquear el siguiente.",
            30,
            574,
            7,
            RFUI.COLORS.muted
        );
    }

    buildLevelCard(level, index) {
        const x = 28;
        const y = 92 + index * 134;
        const width = 744;
        const height = 124;
        const unlocked = GameLevels.isUnlocked(level.id);
        const completed = this.progress.completed.includes(level.id);

        RFUI.panel(
            this,
            x,
            y,
            width,
            height,
            unlocked ? "#0B2030" : "#08151F",
            unlocked ? level.color : "#24495B",
            1,
            `LevelCard${level.number}`
        );

        RFUI.panel(
            this,
            x,
            y,
            4,
            height,
            unlocked ? level.color : "#315063",
            unlocked ? level.color : "#315063",
            0,
            `LevelAccent${level.number}`
        );

        RFUI.label(
            this,
            `NIVEL ${String(level.number).padStart(2, "0")}`,
            48,
            y + 12,
            8,
            unlocked ? level.color : RFUI.COLORS.muted
        );

        RFUI.label(
            this,
            level.name,
            48,
            y + 28,
            12,
            unlocked ? RFUI.COLORS.white : "#718898"
        );

        RFUI.label(
            this,
            level.description,
            48,
            y + 50,
            7,
            RFUI.COLORS.muted,
            { maxWidth: 390 }
        );

        RFUI.label(
            this,
            `HP ${level.hp}   ·   DAÑO ${level.damage}   ·   BLINDAJE ${level.armor}   ·   ${level.reward} PTS`,
            48,
            y + 74,
            7,
            unlocked ? RFUI.COLORS.cyanLight : "#5C7284"
        );

        let status = "BLOQUEADO // COMPLETÁ EL NIVEL ANTERIOR";
        let statusColor = RFUI.COLORS.muted;

        if (completed) {
            status = "COMPLETADO // PODÉS REJUGARLO";
            statusColor = RFUI.COLORS.green;
        }
        else if (unlocked) {
            status = "DISPONIBLE // PROGRAMÁ TU NAVE";
            statusColor = RFUI.COLORS.cyan;
        }

        RFUI.label(this, status, 48, y + 97, 7, statusColor);

        const ship = new Sprite();
        ship.name = `LevelShip${level.number}`;
        ship.img = AssetManager.getImage(level.image);
        ship.scale = new Vector2(level.previewScale, level.previewScale);
        ship.pos = new Vector2(462, y + 22);
        if (!unlocked) ship.colorA = 75;
        this.addChild(ship);

        RFUI.label(
            this,
            "AMENAZA",
            520,
            y + 12,
            7,
            unlocked ? level.color : "#5C7284",
            { align: CENTER, width: 80 }
        );

        const button = RFUI.button(
            this,
            unlocked ? (completed ? "REJUGAR" : "JUGAR") : "BLOQUEADO",
            622,
            y + 76,
            128,
            36,
            unlocked
                ? () => Scene.change(new RAssemblyEditor(level.id))
                : null,
            {
                name: `LevelButton${level.number}`,
                fontSize: 9,
                color: unlocked ? "#123A48" : "#0A1C2A",
                hoverColor: "#195466",
                border: unlocked ? level.color : "#315063"
            }
        );

        if (!unlocked) {
            button.disabled = true;
            button.label.color = new Color("#5C7284");
        }
    }
}

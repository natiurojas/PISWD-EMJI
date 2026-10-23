class ScoresScene extends Scene {
    constructor() {
        super();
        this.type = "UI";
        this.name = "ScoresScene";
    }

    static preload() {
        return [
            "./Assets/dialog.png", "./Assets/Ratcon/greet.png",
            "./Assets/Ratcon/happy.png", "./Assets/Ratcon/sad.png",
            "./Assets/Fonts/Minecraft.ttf"
        ];
    }

    onStart() {
        this.addChild(new RobotFightBackdrop());
        RFUI.heading(
            this,
            "TABLA DE PUNTUACIONES",
            "Ranking de pilotos por mejor puntaje en este dispositivo"
        );

        RFUI.panel(this, 28, 103, 744, 372, "#0A1C2A", "#24495B", 1, "ScoresTablePanel");
        RFUI.label(this, "POS", 58, 118, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "PILOTO", 100, 118, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "PARTIDAS", 552, 118, 8, RFUI.COLORS.cyan, { align: RIGHT });
        RFUI.label(this, "MEJOR", 644, 118, 8, RFUI.COLORS.cyan, { align: RIGHT });
        RFUI.label(this, "TOTAL", 748, 118, 8, RFUI.COLORS.cyan, { align: RIGHT });
        RFUI.panel(this, 42, 139, 716, 1, "#24495B", "#24495B", 0);

        const ranking = User.getRanking().slice(0, 8);
        const active = User.load();
        const posColors = [RFUI.COLORS.orange, "#E0E6EA", RFUI.COLORS.cyan];

        if (ranking.length === 0) {
            RFUI.label(
                this,
                "Todavía no hay usuarios registrados.",
                400,
                250,
                11,
                RFUI.COLORS.muted,
                { align: CENTER }
            );
        }
        else {
            ranking.forEach((user, index) => {
                const y = 150 + index * 40;
                const isActive = active !== null && active.name === user.name;

                RFUI.panel(
                    this,
                    42,
                    y,
                    716,
                    36,
                    isActive
                        ? "#123A48"
                        : (index % 2 === 0 ? "#0D2434" : "#0A1F2D"),
                    "#24495B",
                    0,
                    `ScoreRow${index + 1}`
                );

                RFUI.label(this, String(index + 1), 58, y + 11, 8, posColors[index] ?? RFUI.COLORS.muted);
                RFUI.label(
                    this,
                    user.name,
                    100,
                    y + 11,
                    8,
                    isActive ? RFUI.COLORS.cyan : RFUI.COLORS.white
                );
                RFUI.label(this, String(user.gamesPlayed), 552, y + 11, 8, RFUI.COLORS.white, { align: RIGHT });
                RFUI.label(this, String(user.highScore), 644, y + 11, 8, RFUI.COLORS.orange, { align: RIGHT });
                RFUI.label(this, String(user.totalScore), 748, y + 11, 8, RFUI.COLORS.white, { align: RIGHT });
            });
        }

        const summary = active === null
            ? "Sin sesión activa"
            : `Piloto activo: ${active.name}  ·  Mejor: ${active.highScore}  ·  Partidas: ${active.gamesPlayed}`;

        RFUI.label(
            this,
            summary,
            31,
            486,
            8,
            RFUI.COLORS.orange,
            { maxWidth: 730 }
        );

        RFUI.label(
            this,
            "Los puntajes se guardan automáticamente en este navegador.",
            220,
            545,
            7,
            RFUI.COLORS.muted
        );

        RFUI.button(
            this,
            "< VOLVER AL MENÚ",
            28,
            536,
            172,
            42,
            () => Scene.change(new MainMenu()),
            { fontSize: 9 }
        );
    }
}

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
            "Ranking global de pilotos registrado en el servidor EMJI"
        );

        RFUI.panel(this, 28, 103, 744, 372, "#0A1C2A", "#24495B", 1, "ScoresTablePanel");
        RFUI.label(this, "POS", 58, 118, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "PILOTO", 100, 118, 8, RFUI.COLORS.cyan);
        RFUI.label(this, "PARTIDAS", 552, 118, 8, RFUI.COLORS.cyan, { align: RIGHT });
        RFUI.label(this, "MEJOR", 644, 118, 8, RFUI.COLORS.cyan, { align: RIGHT });
        RFUI.label(this, "TOTAL", 748, 118, 8, RFUI.COLORS.cyan, { align: RIGHT });
        RFUI.panel(this, 42, 139, 716, 1, "#24495B", "#24495B", 0);

        this.rankingHost = new Node();
        this.rankingHost.name = "RemoteRankingHost";
        this.addChild(this.rankingHost);
        this.rankingStatus = RFUI.label(this, "Consultando ranking del servidor...", 400, 250, 9, RFUI.COLORS.muted, { align: CENTER });
        this.renderRanking(User.getRanking().slice(0, 8), false);

        const active = User.load();

        if (typeof BackendClient !== "undefined" && BackendClient.token()) {
            BackendClient.ranking()
                .then(result => {
                    this.renderRanking(result.ranking || [], true);
                    this.rankingStatus.visible = false;
                })
                .catch(error => {
                    this.renderRanking(User.getRanking().slice(0, 8), false);
                    this.rankingStatus.setText(`Ranking online no disponible: ${error.message}. Mostrando datos locales.`);
                    this.rankingStatus.visible = true;
                });
        } else {
            this.rankingStatus.setText("Iniciá sesión para consultar el ranking global.");
            this.renderRanking(User.getRanking().slice(0, 8), false);
            this.rankingStatus.setText("Iniciá sesión para consultar el ranking global.");
            this.rankingStatus.visible = true;
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
            "El ranking global y los puntajes requieren conexión con el backend.",
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

    renderRanking(ranking, online) {
        for (const child of [...this.rankingHost.children])
            this.rankingHost.removeChild(child);

        const active = User.load();
        const posColors = [RFUI.COLORS.orange, "#E0E6EA", RFUI.COLORS.cyan];
        if (!ranking || ranking.length === 0) {
            this.rankingStatus.setText(online
                ? "Todavía no hay puntajes registrados en el servidor."
                : "No hay puntajes locales para mostrar.");
            this.rankingStatus.visible = true;
            return;
        }

        ranking.slice(0, 8).forEach((user, index) => {
            const y = 150 + index * 40;
            const username = user.username || user.name || "Piloto";
            const games = user.gamesPlayed ?? 0;
            const best = user.highScore ?? 0;
            const total = user.totalScore ?? 0;
            const isActive = active && active.name === username;

            RFUI.panel(
                this.rankingHost, 42, y, 716, 36,
                isActive ? "#123A48" : (index % 2 === 0 ? "#0D2434" : "#0A1F2D"),
                "#24495B", 0, `ScoreRow${index + 1}`
            );
            RFUI.label(this.rankingHost, String(index + 1), 58, y + 11, 8, posColors[index] ?? RFUI.COLORS.muted);
            RFUI.label(this.rankingHost, username, 100, y + 11, 8, isActive ? RFUI.COLORS.cyan : RFUI.COLORS.white);
            RFUI.label(this.rankingHost, String(games), 552, y + 11, 8, RFUI.COLORS.white, { align: RIGHT });
            RFUI.label(this.rankingHost, String(best), 644, y + 11, 8, RFUI.COLORS.orange, { align: RIGHT });
            RFUI.label(this.rankingHost, String(total), 748, y + 11, 8, RFUI.COLORS.white, { align: RIGHT });
        });
        this.rankingStatus.visible = false;
    }

}

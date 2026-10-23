class SettingsScene extends Scene {
    constructor() {
        super();
        this.name = "SettingsScene";
        this.type = "UI";
        this.animationsEnabled = true;
    }
    static preload() {
        return ["./Assets/dialog.png", "./Assets/Ratcon/greet.png", "./Assets/Ratcon/happy.png", "./Assets/Fonts/Minecraft.ttf"];
    }
    onStart() {
        this.addChild(new RobotFightBackdrop());
        RFUI.heading(this, "OPCIONES", "Preferencias de la interfaz");
        RFUI.panel(this, 44, 118, 712, 340, "#0A1C2A", "#24495B", 1, "SettingsPanel");
        RFUI.label(this, "ANIMACIONES DE INTERFAZ", 70, 151, 11, RFUI.COLORS.white);
        RFUI.label(this, "Controla las pequeñas animaciones de las pantallas nuevas.", 70, 175, 8, RFUI.COLORS.muted);
        this.animationStatus = RFUI.label(this, "ACTIVADAS", 592, 159, 9, RFUI.COLORS.green, { width: 115, align: CENTER });
        this.animButton = RFUI.button(this, "CAMBIAR", 598, 195, 116, 39, () => {
            this.animationsEnabled = !this.animationsEnabled;
            this.animationStatus.setText(this.animationsEnabled ? "ACTIVADAS" : "REDUCIDAS");
            this.animationStatus.color = new Color(this.animationsEnabled ? RFUI.COLORS.green : RFUI.COLORS.orange);
            try { localStorage.setItem("robotFight.animations", this.animationsEnabled ? "1" : "0"); } catch (_) {}
            this.dialog.setMessage(this.animationsEnabled ? "¡Los efectos de la interfaz están activados!" : "Perfecto, voy a mantener la interfaz más quietita.", "happy");
        }, { fontSize: 8 });

        RFUI.panel(this, 70, 263, 660, 1, "#24495B", "#24495B", 0);
        RFUI.label(this, "AUDIO", 70, 284, 11, RFUI.COLORS.white);
        RFUI.label(this, "No hay música ni efectos de sonido implementados todavía.", 70, 308, 8, RFUI.COLORS.muted);
        RFUI.label(this, "CUENTA", 70, 352, 11, RFUI.COLORS.white);

        try { this.animationsEnabled = localStorage.getItem("robotFight.animations") !== "0"; } catch (_) {}
        this.animationStatus.setText(this.animationsEnabled ? "ACTIVADAS" : "REDUCIDAS");
        this.animationStatus.color = new Color(this.animationsEnabled ? RFUI.COLORS.green : RFUI.COLORS.orange);

        this.dialog = new RatconDialogBox("Las opciones de sonido estarán disponibles cuando el juego tenga audio. ¡Por ahora, a programar!", "greet", {
            width: 405, height: 65, bubbleOffset: 66, mascotScale: 0.15, textSize: 7
        });
        this.dialog.pos = new Vector2(300, 463);
        this.addChild(this.dialog);
        RFUI.button(this, "< VOLVER", 28, 536, 142, 42, () => Scene.change(new MainMenu()), { fontSize: 9 });
    }
}

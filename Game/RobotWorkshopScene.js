class RobotWorkshopScene extends Scene {
    constructor() {
        super();
        this.name = "RobotWorkshopScene";
        this.type = "UI";
        this.loadout = RobotLoadout.load();
        this.activeCategory = "chassis";
        this.statusText = "Elegí cada módulo y guardá tu configuración.";
        this.optionButtons = [];
        this.nameField = new TextField(this.loadout.name || "RF-01", {
            x: 250, y: 230, width: 300, height: 96, maxLength: 18,
            placeholder: "Nombre del robot"
        });
    }

    static preload() {
        return [
            "./Assets/Nave00.png", "./Assets/dialog.png", "./Assets/Ratcon/happy.png",
            "./Assets/Ratcon/greet.png", "./Assets/Ratcon/point_right.png", "./Assets/Fonts/Minecraft.ttf"
        ];
    }

    onStart() {
        this.addChild(new RobotFightBackdrop());
        RFUI.heading(this, "TALLER DE ENSAMBLAJE", "Personalizá tu unidad: cada ventaja tiene un costo");

        RFUI.panel(this, 24, 103, 177, 348, "#0A1C2A", "#24495B", 1, "CategoryPanel");
        RFUI.panel(this, 211, 103, 270, 348, "#0A1C2A", "#24495B", 1, "OptionPanel");
        RFUI.panel(this, 491, 103, 285, 348, "#0A1C2A", "#24495B", 1, "PreviewPanel");
        RFUI.label(this, "COMPONENTES", 37, 116, 9, RFUI.COLORS.cyan);
        RFUI.label(this, "CONFIGURACIÓN", 225, 116, 9, RFUI.COLORS.cyan);
        RFUI.label(this, "VISTA PREVIA", 507, 116, 9, RFUI.COLORS.cyan);

        const categoryList = [
            ["cpu", "CPU"], ["ram", "RAM"], ["chassis", "CHASIS"],
            ["cannons", "CAÑONES"], ["radar", "RADAR"], ["shield", "ESCUDO"],
            ["thrusters", "PROPULSIÓN"], ["armor", "BLINDAJE"]
        ];
        this.categoryButtons = {};
        categoryList.forEach(([key, text], i) => {
            const btn = RFUI.button(this, text, 35, 141 + i * 37, 155, 32, () => {
                this.activeCategory = key;
                this.renderOptions();
            }, { name: `Category_${key}`, fontSize: 10, color: "#102B3B", hoverColor: "#174556" });
            this.categoryButtons[key] = btn;
        });

        this.optionTitle = RFUI.label(this, "", 226, 141, 11, RFUI.COLORS.white);
        this.optionSubtitle = RFUI.label(this, "", 226, 160, 7, RFUI.COLORS.muted);
        this.optionHost = new Node();
        this.optionHost.name = "OptionHost";
        this.addChild(this.optionHost);

        const ship = new Sprite();
        ship.name = "WorkshopShipPreview";
        ship.img = AssetManager.getImage("./Assets/Nave00.png");
        ship.scale = new Vector2(0.31, 0.31);
        ship.pos = new Vector2(562, 174);
        this.addChild(ship);

        this.robotNameButton = RFUI.button(
            this, `NOMBRE: ${this.loadout.name || "RF-01"}`,
            508, 275, 250, 29,
            () => {
                if (this.nameField.parent !== this) this.addChild(this.nameField);
                this.nameField.open(this.loadout.name || "RF-01", "NOMBRE DEL ROBOT", value => {
                    const normalized = String(value || "").trim().replace(/[^\w -]/g, "").slice(0, 18);
                    this.loadout.name = normalized || "RF-01";
                    this.robotNameButton.label.text = `NOMBRE: ${this.loadout.name}`;
                    this.robotNameButton.label.mustBeRerendered = true;
                    if (this.nameField.parent === this) this.removeChild(this.nameField);
                    this.updateStats();
                });
            },
            { name: "RobotNameButton", fontSize: 7, color: "#102B3B", hoverColor: "#174556" }
        );

        this.statLabels = {};
        const stats = [
            ["hp", "INTEGRIDAD"], ["armor", "BLINDAJE"], ["speed", "VELOCIDAD"],
            ["weight", "PESO TOTAL"], ["damage", "DAÑO"], ["radar", "RADAR"],
            ["cpu", "CPU"], ["blocks", "RAM"], ["shield", "ESCUDO"]
        ];
        stats.forEach(([key, label], i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = 507 + col * 88;
            const y = 317 + row * 37;
            RFUI.label(this, label, x, y, 6, RFUI.COLORS.muted);
            this.statLabels[key] = RFUI.label(this, "—", x, y + 13, 9, RFUI.COLORS.white);
        });

        this.status = RFUI.label(this, this.statusText, 30, 469, 8, RFUI.COLORS.orange, { maxWidth: 730 });
        this.tip = new RatconDialogBox("Los cañones fuertes pesan más. El chasis define cuántos podés montar.", "happy", {
            width: 395, height: 64, bubbleOffset: 65, mascotScale: 0.15, textSize: 7
        });
        this.tip.pos = new Vector2(226, 478);
        this.addChild(this.tip);

        RFUI.button(this, "< MENÚ", 26, 536, 118, 42, () => Scene.change(new MainMenu()), { fontSize: 9 });
        RFUI.button(this, "GUARDAR CONFIGURACIÓN", 498, 536, 174, 42, () => this.saveLoadout(), {
            fontSize: 8, color: "#123A48", hoverColor: "#195466", border: RFUI.COLORS.cyan
        });
        RFUI.button(this, "USAR Y VOLVER", 682, 536, 100, 42, () => this.saveAndReturn(), {
            fontSize: 7, color: "#191F3D", hoverColor: "#2C3560", border: RFUI.COLORS.purple
        });

        this.renderOptions();
        this.updateStats();
    }

    handleTextFieldKey(code, key) {
        if (!this.nameField || !this.nameField.active) return false;
        return this.nameField.keyPressed(code, key);
    }

    handleTextFieldCharacter(character) {
        if (this.nameField && this.nameField.active)
            this.nameField.inputCharacter(character);
    }

    renderOptions() {
        for (const child of [...this.optionHost.children]) this.optionHost.removeChild(child);
        const component = RobotLoadout.COMPONENTS[this.activeCategory];
        this.optionTitle.setText(component.title);
        this.optionSubtitle.setText(component.subtitle);
        Object.entries(this.categoryButtons).forEach(([key, btn]) => {
            btn.panel.color = new Color(key === this.activeCategory ? "#1A5260" : "#102B3B");
            btn.panel.borderColor = new Color(key === this.activeCategory ? RFUI.COLORS.cyan : "#24495B");
        });

        const selected = RobotLoadout.selected(this.activeCategory, this.loadout);
        component.items.forEach((item, i) => {
            let unavailable = false;
            if (this.activeCategory === "cannons") {
                const chassis = RobotLoadout.selected("chassis", this.loadout);
                unavailable = item.count > chassis.slots;
            }
            const y = 187 + i * 77;
            const btn = RFUI.button(this.optionHost, `${item.name}${item.id === selected.id ? "  ✓" : ""}`, 225, y, 241, 42, () => {
                if (unavailable) {
                    this.statusText = `Ese módulo necesita ${item.count} espacios; tu chasis permite ${RobotLoadout.selected("chassis", this.loadout).slots}.`;
                    this.status.setText(this.statusText);
                    return;
                }
                this.loadout[this.activeCategory] = item.id;
                this.statusText = `${component.title}: ${item.name} seleccionado.`;
                this.status.setText(this.statusText);
                this.renderOptions();
                this.updateStats();
            }, {
                name: `Option_${item.id}`, fontSize: 8,
                color: unavailable ? "#151D28" : (item.id === selected.id ? "#164A52" : "#102B3B"),
                hoverColor: unavailable ? "#151D28" : "#1D5361",
                border: unavailable ? "#34414C" : (item.id === selected.id ? RFUI.COLORS.cyan : "#24495B"),
                textColor: unavailable ? "#63717D" : RFUI.COLORS.white
            });
            if (unavailable) btn.disabled = true;
            RFUI.label(this.optionHost, item.detail, 229, y + 48, 7, unavailable ? "#697681" : RFUI.COLORS.muted, { maxWidth: 232 });
        });
    }

    updateStats() {
        const stats = RobotLoadout.stats(this.loadout);
        const format = {
            hp: `${stats.hp} HP`, armor: `${stats.armor}`, speed: stats.speed.toFixed(1),
            weight: `${stats.weight} u`, damage: `${stats.damage}`, radar: `${stats.radar} u`,
            cpu: `${stats.cpu} c/t`, blocks: `${stats.blocks} bloques`, shield: `${stats.shield} s`
        };
        Object.entries(format).forEach(([key, value]) => this.statLabels[key].setText(value));
        this.tip.setMessage(`CPU y RAM también pesan. Tu unidad suma ${stats.weight} u; la propulsión compensa parte del peso.`, "point_right");
    }

    saveLoadout() {
        const saved = RobotLoadout.save(this.loadout);
        this.statusText = saved
            ? "Configuración guardada en este navegador."
            : "No se pudo guardar; revisá el almacenamiento del navegador.";
        this.status.color = new Color(saved ? RFUI.COLORS.green : RFUI.COLORS.red);
        this.status.setText(this.statusText);

        if (saved && typeof BackendClient !== "undefined" && BackendClient.token()) {
            const programCode = (() => {
                try { return localStorage.getItem("emji.rassembly.program") || ""; }
                catch (_) { return ""; }
            })();
            BackendClient.saveProfile({
                robotName: this.loadout.name || "RF-01",
                loadout: this.loadout,
                programCode
            }).then(() => {
                this.statusText = "Configuración sincronizada con el servidor.";
                this.status.color = new Color(RFUI.COLORS.green);
                this.status.setText(this.statusText);
            }).catch(error => {
                this.statusText = `Guardado local; servidor: ${error.message}`;
                this.status.color = new Color(RFUI.COLORS.orange);
                this.status.setText(this.statusText);
            });
        }
    }

    saveAndReturn() {
        this.saveLoadout();
        Scene.change(new MainMenu());
    }
}

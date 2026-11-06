/* Utilidades visuales compartidas por las pantallas de Robot Fight. */
class RobotFightBackdrop extends Node {
    constructor() {
        super();
        this.name = "RobotFightBackdrop";
        this.time = 0;
        // Estrellas deterministas: no dependemos de random() en cada frame.
        this.stars = Array.from({ length: 58 }, (_, i) => ({
            x: (i * 137 + 47) % 800,
            y: (i * 83 + 29) % 600,
            r: i % 7 === 0 ? 2 : 1,
            speed: 5 + (i % 5) * 2,
            phase: i * 0.37
        }));
    }

    tick(dt) { if (RFUI.animationsEnabled()) this.time += dt; }

    draw() {
        push();
        noStroke();
        background("#07111F");
        // Paneles de luz muy sutiles.
        fill(16, 43, 66, 110);
        triangle(0, 0, 370, 0, 0, 290);
        fill(22, 36, 80, 70);
        triangle(800, 600, 800, 280, 500, 600);

        // Cuadrícula tecnológica en la parte inferior.
        stroke(37, 100, 125, 38);
        strokeWeight(1);
        for (let y = 400; y < 640; y += 28) line(0, y, 800, y);
        for (let x = -280; x < 1000; x += 48) line(400, 380, x, 600);

        noStroke();
        for (const star of this.stars) {
            const y = (star.y + this.time * star.speed) % 600;
            const pulse = 100 + (Math.sin(this.time * 2 + star.phase) + 1) * 65;
            fill(105, 232, 229, pulse);
            circle(star.x, y, star.r * 2);
        }
        pop();
    }
}

class RFUI {
    static FONT = "./Assets/Fonts/Minecraft.ttf";
    static COLORS = {
        bg: "#07111F", panel: "#0C2030", panel2: "#102B3D",
        cyan: "#48E5D3", cyanLight: "#9AF8EC", white: "#F1F7FA",
        muted: "#91A8B8", purple: "#A99BFF", orange: "#FFB86B",
        red: "#FF7B89", green: "#80F0B3"
    };

    static animationsEnabled() {
        try { return localStorage.getItem("robotFight.animations") !== "0"; }
        catch (_) { return true; }
    }

    static label(parent, text, x, y, size = 14, color = RFUI.COLORS.white, opts = {}) {
        const label = new Label();
        label.name = opts.name || "Label";
        label.text = String(text ?? "");
        label.fontSize = size;
        label.color = new Color(color);
        label.alignX = opts.align || LEFT;
        if (opts.maxWidth) label.maxWidth = opts.maxWidth;
        label.loadFont(RFUI.FONT, size);
        label.pos = new Vector2(x, y);
        if (opts.width) label.size = new Vector2(opts.width, size + 3);
        parent.addChild(label);
        return label;
    }

    static panel(parent, x, y, w, h, color = RFUI.COLORS.panel, border = "#24475A", borderSize = 1, name = "Panel") {
        const panel = new Panel();
        panel.name = name;
        panel.pos = new Vector2(x, y);
        panel.size = new Vector2(w, h);
        panel.color = new Color(color);
        panel.borderColor = new Color(border);
        panel.borderSize = borderSize;
        parent.addChild(panel);
        return panel;
    }

    static button(parent, text, x, y, w, h, onClick, opts = {}) {
        const btn = new Button();
        btn.name = opts.name || text.replace(/\s+/g, "") + "Button";
        btn.pos = new Vector2(x, y);
        btn.size = new Vector2(w, h);
        btn._rfBaseColor = opts.color || RFUI.COLORS.panel2;
        btn._rfHoverColor = opts.hoverColor || "#164255";
        const panel = new Panel();
        panel.name = "ButtonPanel";
        panel.size = btn.size.clone();
        panel.color = new Color(btn._rfBaseColor);
        panel.borderColor = new Color(opts.border || RFUI.COLORS.cyan);
        panel.borderSize = opts.borderSize ?? 1;
        btn.addChild(panel);

        const label = new Label();
        label.name = "ButtonLabel";
        label.text = text;
        label.fontSize = opts.fontSize || 12;
        label.color = new Color(opts.textColor || RFUI.COLORS.white);
        label.alignX = CENTER;
        label.alignY = CENTER;
        label.loadFont(RFUI.FONT, label.fontSize);
        label.pos = new Vector2(w / 2, h / 2);
        btn.addChild(label);
        btn.onHover = () => {
            panel.color = new Color(btn._rfHoverColor);
            if (typeof opts.onHover === "function") opts.onHover(btn);
        };
        btn.onLeave = () => {
            panel.color = new Color(btn._rfBaseColor);
            if (typeof opts.onLeave === "function") opts.onLeave(btn);
        };
        btn.onReleased = () => { if (typeof onClick === "function") onClick(btn); };
        parent.addChild(btn);
        btn.panel = panel;
        btn.label = label;
        return btn;
    }

    static heading(parent, title, subtitle = "") {
        const top = RFUI.panel(parent, 0, 0, 800, 7, RFUI.COLORS.cyan, RFUI.COLORS.cyan, 0, "TopAccent");
        top.visible = true;
        RFUI.label(parent, title, 28, 27, 22, RFUI.COLORS.white, { name: "ScreenTitle" });
        if (subtitle) RFUI.label(parent, subtitle, 30, 58, 10, RFUI.COLORS.muted);
        RFUI.label(parent, "ROBOT FIGHT  /  RASSEMBLY LAB", 542, 31, 9, RFUI.COLORS.cyan, { align: RIGHT, width: 230 });
    }
}

class RobotLoadout {
    static STORAGE_KEY = "robotFight.loadout.v1";
    static COMPONENTS = {
        cpu: {
            title: "CPU", subtitle: "Velocidad de ejecución del código", items: [
                { id: "eco", name: "ECO", detail: "6 ciclos por turno", cycles: 6 },
                { id: "balanced", name: "EQUILIBRADA", detail: "10 ciclos por turno", cycles: 10 },
                { id: "tactical", name: "TÁCTICA", detail: "15 ciclos por turno", cycles: 15 }
            ]
        },
        ram: {
            title: "RAM", subtitle: "Capacidad de programa y variables", items: [
                { id: "ram12", name: "12 BLOQUES", detail: "Hasta 12 bloques / 4 variables", blocks: 12, vars: 4 },
                { id: "ram20", name: "20 BLOQUES", detail: "Hasta 20 bloques / 8 variables", blocks: 20, vars: 8 },
                { id: "ram32", name: "32 BLOQUES", detail: "Hasta 32 bloques / 12 variables", blocks: 32, vars: 12 }
            ]
        },
        chassis: {
            title: "CHASIS", subtitle: "Define vida, blindaje, peso y cañones", items: [
                { id: "scout", name: "LIGERO", detail: "Ágil · poco blindaje · 2 cañones", hp: 75, armor: 1, weight: 2, speed: 8, slots: 2 },
                { id: "assault", name: "ASALTO", detail: "Equilibrado · 3 cañones", hp: 105, armor: 3, weight: 4, speed: 6, slots: 3 },
                { id: "fortress", name: "FORTALEZA", detail: "Pesado · resistente · 4 cañones", hp: 145, armor: 5, weight: 6, speed: 4, slots: 4 }
            ]
        },
        cannons: {
            title: "CAÑONES", subtitle: "Más potencia implica más peso", items: [
                { id: "single", name: "SENCILLO", detail: "1 cañón · daño 12 · peso +1", count: 1, damage: 12, weight: 1 },
                { id: "double", name: "DOBLE", detail: "2 cañones · daño 20 · peso +2", count: 2, damage: 20, weight: 2 },
                { id: "quad", name: "CUÁDRUPLE", detail: "4 cañones · daño 32 · peso +4", count: 4, damage: 32, weight: 4 }
            ]
        },
        radar: {
            title: "RADAR", subtitle: "Detección disponible para RAssembly", items: [
                { id: "near", name: "CORTO ALCANCE", detail: "Radio de detección: 150 u.", range: 150, weight: 1 },
                { id: "tactical", name: "TÁCTICO", detail: "Radio de detección: 250 u.", range: 250, weight: 2 },
                { id: "long", name: "LARGO ALCANCE", detail: "Radio de detección: 360 u.", range: 360, weight: 3 }
            ]
        },
        shield: {
            title: "ESCUDO", subtitle: "Protección temporal durante el combate", items: [
                { id: "pulse", name: "PULSO", detail: "Duración 2 s · peso +1", duration: 2, weight: 1 },
                { id: "reinforced", name: "REFORZADO", detail: "Duración 3,5 s · peso +3", duration: 3.5, weight: 3 },
                { id: "phase", name: "FASE", detail: "Duración 2,5 s · peso +2", duration: 2.5, weight: 2 }
            ]
        }
    };

    static defaults() {
        return { cpu: "balanced", ram: "ram20", chassis: "assault", cannons: "double", radar: "tactical", shield: "pulse" };
    }
    static load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return this.defaults();
            return { ...this.defaults(), ...JSON.parse(raw) };
        } catch (_) { return this.defaults(); }
    }
    static save(loadout) {
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(loadout)); return true; }
        catch (_) { return false; }
    }
    static selected(key, loadout) {
        const group = this.COMPONENTS[key];
        return group.items.find(item => item.id === loadout[key]) || group.items[0];
    }
    static stats(loadout) {
        const chassis = this.selected("chassis", loadout);
        const cannon = this.selected("cannons", loadout);
        const radar = this.selected("radar", loadout);
        const shield = this.selected("shield", loadout);
        const cpu = this.selected("cpu", loadout);
        const ram = this.selected("ram", loadout);
        const totalWeight = chassis.weight + cannon.weight + radar.weight + shield.weight;
        const speed = Math.max(1, chassis.speed - Math.max(0, totalWeight - chassis.weight) * 0.35);
        return {
            hp: chassis.hp, armor: chassis.armor, weight: totalWeight, speed,
            slots: chassis.slots, cannons: cannon.count, damage: cannon.damage,
            radar: radar.range, shield: shield.duration, cpu: cpu.cycles,
            blocks: ram.blocks, vars: ram.vars
        };
    }
}

class RAssemblyEditor extends Scene {
    constructor(levelId = null) {
        super();
        this.type = "UI";
        this.name = "RAssemblyEditor";
        this.levelId = levelId;
        this.level = levelId !== null && typeof GameLevels !== "undefined"
            ? GameLevels.get(levelId)
            : null;
        this.blocks = [];
        this.needsRebuild = true;
        this.blockView = null;
        this.paletteCategory = "FLUJO";
        this.dragging = null;
        this.selected = null;
        this.nextId = 1;
        this.scroll = 0;
        this.scrollMax = 0;
        this.scrollbarDrag = false;
        this.scrollbarGrab = 0;
        this.guideVisible = true;
        this.guidePage = 0;
        this.status = "Arrastra bloques al espacio de trabajo.";
        this.statusTime = 2.5;
        this.animTime = 0;
        this.hoverPulse = 0;
        this.textField = new TextField("", { x: 250, y: 235, width: 300, height: 96 });
        this.animState = { paletteGlow: 0 };
        // El taller alimenta los límites de RAM y la velocidad de ejecución.
        this.loadout = typeof RobotLoadout !== "undefined" ? RobotLoadout.load() : null;
        const robotStats = this.loadout && typeof RobotLoadout !== "undefined"
            ? RobotLoadout.stats(this.loadout)
            : { blocks: 20, vars: 8, cpu: 10 };
        this.maxLines = robotStats.blocks;
        this.maxVariables = robotStats.vars;
        this.cpu = robotStats.cpu;
        this.robotName = "RF-01";
        this.robotStats = robotStats;
        this.palette = {
            FLUJO: [
                { type: "VAR", title: "VARIABLE", color: "#3b5265", desc: "Crear una variable" },
                { type: "IF", title: "SI ... ENTONCES", color: "#27c9b5", desc: "Tomar una decisión" },
                { type: "WHILE", title: "MIENTRAS ...", color: "#3b5265", desc: "Repetir acciones" }
            ],
            MODULOS: [
                { type: "MODULE", module: "DETECTAR_ENEMIGO", title: "DETECTAR_ENEMIGO", color: "#27c9b5", desc: "Leer el radar" },
                { type: "MODULE", module: "DISPARAR", title: "DISPARAR", color: "#27c9b5", desc: "Usar los cañones" },
                { type: "MODULE", module: "ACTIVAR_ESCUDO", title: "ACTIVAR_ESCUDO", color: "#27c9b5", desc: "Activar el escudo" },
                { type: "MODULE", module: "MOVER", title: "MOVER", color: "#27c9b5", desc: "Controlar movimiento" }
            ],
            VARIABLES: [
                { type: "VAR", title: "ENEMIGO_CERCA", color: "#3b5265", desc: "Variable para verificar si esta cerca" }
            ]
        };
    }

    static preload() {
        return [
            "./Assets/Nave00.png",
            "./Assets/Fonts/Minecraft.ttf"
        ];
    }

    onStart() {
        this.introAnimation = new Animation().setFrames(24)
            .to(1, 24, this.animState, { paletteGlow: { from: 0, to: 1 } }, "EASEINOUT");
        this.introAnimation.loop = true;
        this.introAnimation.play();
        this.blocks = [
            { id: this.nextId++, type: "VAR", name: "enemigo", value: "0" },
            { id: this.nextId++, type: "MODULE", module: "DETECTAR_ENEMIGO" },
            {
                id: this.nextId++, type: "IF", condition: "enemigo == 1", thenBlocks: [
                    { id: this.nextId++, type: "MODULE", module: "DISPARAR" }
                ]
            }
        ];
        this.rebuildEditorNodes();
    }

    tick(delta) {
        this.animTime += delta;
        this.hoverPulse = (Math.sin(this.animTime * 4) + 1) * 0.5;
        if (this.statusTime > 0) {
            this.statusTime -= delta;
            if (this.statusTime <= 0) this.status = "";
        }
        const mx = mouseX, my = mouseY;
        if (this.scrollbarDrag) {
            const trackY = 106, trackH = 440, thumbH = this.getThumbHeight();
            const newY = Math.max(trackY, Math.min(trackY + trackH - thumbH, my - this.scrollbarGrab));
            this.scroll = this.scrollMax * ((newY - trackY) / Math.max(1, trackH - thumbH));
            if (!Mouse.instance.isLeftClickPressed) this.scrollbarDrag = false;
            return;
        }
        if (this.dragging) {
            this.dragging.x = mx - 60;
            this.dragging.y = my - 18;
            if (!Mouse.instance.isLeftClickPressed) this.finishDrag(mx, my);
            return;
        }
        if (Mouse.instance.isLeftClickPressed && !this._mouseDown) {
            this._mouseDown = true;
            this.handlePressed(mx, my);
        }
        if (!Mouse.instance.isLeftClickPressed) this._mouseDown = false;
        this.rebuildEditorNodes()
    }

    handlePressed(mx, my) {
        if (this.textField && this.textField.active) return;
        if (this.guideVisible) {
            if (this.pointIn(mx, my, 636, 544, 90, 28)) {
                this.guidePage++;
                if (this.guidePage >= 3) this.guideVisible = false;
                return;
            }
            if (this.pointIn(mx, my, 730, 544, 42, 28)) { this.guideVisible = false; return; }
        }
        if (this.pointIn(mx, my, 10, 10, 90, 28)) {
            Scene.change(this.levelId ? new LevelsScene() : new MainMenu()); return;
        }
        if (this.pointIn(mx, my, 592, 10, 82, 28)) { this.compileProgram(); return; }
        if (this.pointIn(mx, my, 682, 10, 104, 28)) {
            this.compileProgram();
            if (!this.status.startsWith("✕"))
                Scene.change(new FightScene(this.generateSource(), this.levelId));
            return;
        }
        if (this.pointIn(mx, my, 12, 75, 166, 32)) {
            this.paletteCategory = "FLUJO"; return;
        }
        if (this.pointIn(mx, my, 12, 111, 166, 32)) { this.paletteCategory = "MODULOS"; return; }
        if (this.pointIn(mx, my, 12, 147, 166, 32)) { this.paletteCategory = "VARIABLES"; return; }

        // Scrollbar del espacio de trabajo.
        const thumbY = this.getThumbY(), thumbH = this.getThumbHeight();
        if (this.pointIn(mx, my, 778, 106, 14, 440)) {
            if (this.pointIn(mx, my, 778, thumbY, 14, thumbH)) {
                this.scrollbarDrag = true; this.scrollbarGrab = my - thumbY;
            } else {
                this.scroll = Math.max(0, Math.min(this.scrollMax, this.scroll + (my < thumbY ? -130 : 130)));
            }
            return;
        }

        // Bloques de la paleta.
        const entries = this.palette[this.paletteCategory];
        for (let i = 0; i < entries.length; i++) {
            const y = 187 + i * 66;
            if (this.pointIn(mx, my, 12, y, 164, 54)) {
                this.startDrag(this.createBlock(entries[i]), mx, my);
                return;
            }
        }

        
        if (this.pointIn(mx, my, 190, 92, 590, 486)) {
            const hit = this.hitBlock(mx, my);
            if (hit) {
                if (this.pointIn(mx, my, hit.rect.x + hit.rect.w - 25, hit.rect.y + 4, 20, 20)) {
                    this.deleteBlock(hit.block); return;
                }
                if (this.pointIn(mx, my, hit.rect.x + hit.rect.w - 88, hit.rect.y + 4, 58, 20)) {
                    this.editBlock(hit.block); return;
                }
                this.selected = hit.block;
                // Permite reordenar bloques arrastrándolos desde su cabecera.
                if (my < hit.rect.y + 28) this.startExistingDrag(hit.block, mx, my);
            }
        }
    }

    createBlock(entry) {
        if (entry.type === "VAR")
            return { id: this.nextId++, type: "VAR", name: "enemigo", value: "0" };
        if (entry.type === "IF")
            return { id: this.nextId++, type: "IF", condition: "enemigo == 1", thenBlocks: [] };
        if (entry.type === "WHILE")
            return { id: this.nextId++, type: "WHILE", condition: "VERDADERO", body: [] };
        return { id: this.nextId++, type: "MODULE", module: entry.module };
    }

    startDrag(block, mx, my) {
        this.dragging = block;
        this._dragWasExisting = false;
        this.selected = block;
        this.dragging.x = mx - 60;
        this.dragging.y = my - 18;
    }

    startExistingDrag(block, mx, my) {
        this._dragWasExisting = true;
        this._dragOriginalParent = this.findParentList(block, this.blocks);
        this._dragOriginalIndex = this._dragOriginalParent ? this._dragOriginalParent.indexOf(block) : -1;
        this.removeFromTree(block, this.blocks);
        this.dragging = block; this.selected = block; this.dragging.x = mx - 60; this.dragging.y = my - 18;
    }

    finishDrag(mx, my) {
        const block = this.dragging;
        this.dragging = null;
        if (!block) return;
        if (this.pointIn(mx, my, 190, 92, 590, 486)) {
            const target = this.findContainerAt(mx, my, this.blocks, 204, 112 - this.scroll);
            if (target) target.list.push(block);
            else {
                const insertIndex = this.findInsertIndex(my + this.scroll - 112, this.blocks);
                this.blocks.splice(Math.max(0, Math.min(insertIndex, this.blocks.length)), 0, block);
            }
            const linesExceeded = !this._dragWasExisting && this.countLines() > this.maxLines;
            const variablesExceeded = !this._dragWasExisting && this.countVariables() > this.maxVariables;
            if (linesExceeded || variablesExceeded) {
                this.removeFromTree(block, this.blocks);
                this.flash(linesExceeded
                    ? `RAM insuficiente: máximo ${this.maxLines} líneas/bloques.`
                    : `RAM insuficiente: máximo ${this.maxVariables} variables.`);
            } else {
                this.flash(this._dragWasExisting ? "Bloque movido." : "¡Bloque añadido!");
            }
        } else if (this._dragWasExisting) {
            // Si se suelta fuera del área, restaurar el bloque a su lista original.
            const list = this._dragOriginalParent || this.blocks;
            list.splice(Math.max(0, this._dragOriginalIndex), 0, block);
        }
        this._dragWasExisting = false;
        this.recalculateScroll();
    }

    findContainerAt(mx, my, list, x, y) {
        for (const b of list) {
            const h = this.blockHeight(b);
            if (b.type === "IF" || b.type === "WHILE") {
                const innerY = y + 58;
                const innerH = h - 66;
                if (this.pointIn(mx, my, x + 18, innerY, 520, Math.max(28, innerH))) {
                    const childList = b.type === "IF" ? b.thenBlocks : b.body;
                    const nested = this.findContainerAt(mx, my, childList, x + 34, innerY);
                    return nested || { block: b, list: childList };
                }
            }
            y += h + 8;
        }
        return null;
    }

    findInsertIndex(y, list) {
        let cursor = 0, i = 0;
        for (const b of list) { const h = this.blockHeight(b); if (y > cursor + h / 2) i++; cursor += h + 8; }
        return i;
    }

    findParentList(target, list) {
        for (const b of list) {
            if ((b.thenBlocks || []).includes(target) || (b.body || []).includes(target)) return b.thenBlocks || b.body;
            const found = this.findParentList(target, b.thenBlocks || []) || this.findParentList(target, b.body || []);
            if (found) return found;
        }
        return null;
    }

    removeFromTree(target, list) {
        const i = list.indexOf(target);
        if (i >= 0) { list.splice(i, 1); return true; }
        for (const b of list) if (this.removeFromTree(target, b.thenBlocks || []) || this.removeFromTree(target, b.body || [])) return true;
        return false;
    }

    handleTextFieldKey(code, key) {
        if (!this.textField || !this.textField.active) return false;
        return this.textField.keyPressed(code, key);
    }

    handleTextFieldCharacter(character) {
        if (this.textField && this.textField.active) this.textField.inputCharacter(character);
    }

    editBlock(block) {
        this.editingBlock = block;
        let fields = [];
        if (block.type === "VAR") fields = [
            { key: "name", label: "NOMBRE DE VARIABLE", value: block.name },
            { key: "value", label: "VALOR / EXPRESIÓN", value: block.value }
        ];
        else if (block.type === "IF" || block.type === "WHILE") fields = [
            { key: "condition", label: "CONDICIÓN RASSEMBLY", value: block.condition }
        ];
        else if (block.type === "MODULE") fields = [
            { key: "module", label: "NOMBRE DEL MÓDULO", value: block.module }
        ];
        if (!fields.length) return;
        this.editFields = fields;
        this.editFieldIndex = 0;
        this.openEditField();
    }

    openEditField() {
        const field = this.editFields[this.editFieldIndex];
        if (!field) {
            this.textField.close();
            this.flash("Bloque actualizado.");
            this.recalculateScroll();
            return;
        }
        this.textField.open(field.value, field.label, value => {
            if (value.trim()) this.editingBlock[field.key] = value.trim();
            this.editFieldIndex++;
            this.openEditField();
        });
    }

    deleteBlock(block) {
        this.removeFromTree(block, this.blocks);
        if (this.selected === block) this.selected = null;
        this.flash("Bloque eliminado."); this.recalculateScroll();
    }

    blockHeight(block) {
        if (block.type === "IF") return 66 + Math.max(24, this.listHeight(block.thenBlocks || []));
        if (block.type === "WHILE") return 66 + Math.max(24, this.listHeight(block.body || []));
        return 34;
    }
    listHeight(list) { let h = 0; for (const b of list) h += this.blockHeight(b) + 6; return Math.max(0, h - (list.length ? 6 : 0)); }

    hitBlock(mx, my) {
        const visit = (list, x, y) => {
            for (const block of list) {
                const h = this.blockHeight(block), rectInfo = { x, y, w: 550 - (x - 204), h };
                // Revisar primero los hijos para poder seleccionar/borrar bloques anidados.
                if (block.type === "IF" || block.type === "WHILE") {
                    const children = block.type === "IF" ? block.thenBlocks || [] : block.body || [];
                    const found = visit(children, x + 20, y + 58);
                    if (found) return found;
                }
                if (this.pointIn(mx, my, x, y, rectInfo.w, h)) return { block, rect: rectInfo };
                y += h + 8;
            }
            return null;
        };
        return visit(this.blocks, 204, 112 - this.scroll);
    }

    recalculateScroll() {
        this.scrollMax = Math.max(0, this.listHeight(this.blocks) + this.blocks.length * 8 - 440);
        this.scroll = Math.max(0, Math.min(this.scroll, this.scrollMax));
    }

    getThumbHeight() { return Math.max(36, 440 * (440 / Math.max(440, this.listHeight(this.blocks) + this.blocks.length * 8))); }
    getThumbY() { return 106 + (440 - this.getThumbHeight()) * (this.scrollMax ? this.scroll / this.scrollMax : 0); }
    pointIn(x, y, px, py, w, h) { return x >= px && x <= px + w && y >= py && y <= py + h; }
    flash(message) { this.status = message; this.statusTime = 2.2; }

    compileProgram() {
        try {
            if (this.countLines() > this.maxLines)
                throw new Error(`RAM insuficiente: el programa supera ${this.maxLines} líneas/bloques.`);
            if (this.countVariables() > this.maxVariables)
                throw new Error(`RAM insuficiente: el chasis admite ${this.maxVariables} variables.`);
            const source = this.generateSource();
            const parser = new RAssemblyParser(new RAssemblyLexer(source).tokenize());
            parser.parse(); this.flash("✓ ¡Programa válido!");
        } catch (e) { this.flash("✕ " + e.message.replace("RASSEMBLY Parser: ", "")); }
    }

    generateSource() {
        const lines = [];
        // Los modulos se importan automaticamente: no hace falta un bloque IMPORTAR.
        const modules = new Set();
        const collect = list => {
            for (const b of list || []) {
                if (b.type === "MODULE")
                    modules.add(b.module);
                collect(b.thenBlocks);
                collect(b.body);
            }
        };
        collect(this.blocks);
        for (const module of modules) lines.push(`IMPORTAR "${module}"`);
        for (const block of this.blocks) this.emitBlock(block, lines, 0);
        return lines.join("\n");
    }

    emitBlock(block, lines, indent) {
        const pad = "    ".repeat(indent);
        if (block.type === "VAR") lines.push(pad + `VAR ${block.name} = ${block.value}`);
        else if (block.type === "MODULE") lines.push(pad + `LLAMAR ${block.module}`);
        else if (block.type === "IF") {
            lines.push(pad + `SI ${block.condition} ENTONCES`);
            for (const child of block.thenBlocks || []) this.emitBlock(child, lines, indent + 1);
            lines.push(pad + "FIN");
        } else if (block.type === "WHILE") {
            lines.push(pad + `MIENTRAS ${block.condition} HACER`);
            for (const child of block.body || []) this.emitBlock(child, lines, indent + 1);
            lines.push(pad + "FIN");
        }
    }

    draw() {
        // El fondo y la cuadrícula son decorativos; los controles y bloques
        // se crean como Nodes/Scenes usando las clases de la UI del motor.
        background("#051824");
        noStroke();
        for (let i = 0; i < 24; i++) {
            const x = (i * 67 + 13) % 800;
            const y = (i * 43 + Math.floor(this.animTime * (3 + i % 3))) % 600;
            fill(39, 201, 181, 45 + (i % 3) * 22);
            rect(x, y, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
        }

        this.rebuildEditorNodes();
    }

    getBlockView(block, x, y, w) {
        let view = Scene.instantiate(RAssemblyBlockView, {
            editor: this,
            block,
            x,
            y,
            w
        });
        return view;
    }

    buildMenu() {
        this.addChild(new RAssemblyPanel("top_bar", 0, 0, 800, 46, "#162936"));
        this.addChild(new RAssemblyPanel("top_bar_line", 0, 42, 800, 4, "#3b5265"));
        this.addChild(new RAssemblyLabel("title", "R//ASSEMBLY LAB", 118, 17, 17, "#27c9b5"));
        this.addChild(new RAssemblyLabel("level_top", this.level ? this.level.name : "EDITOR LIBRE", 296, 19, 8, this.level ? this.level.color : "#bed7e0", 104));
        this.addChild(new RAssemblyButton("back", "<- MENU", 10, 10, 90, 28, "#3b5265"));
        this.addChild(new RAssemblyButton("compile", "COMPILAR", 592, 10, 82, 28, "#27c9b5"));
        this.addChild(new RAssemblyButton("test", "PROBAR", 682, 10, 104, 28, "#3b5265"));
        this.addChild(new RAssemblyLabel("stats_top", `CPU ${this.cpu}  ·  RAM ${this.countLines()}/${this.maxLines}`, 405, 18, 9, "#bed7e0", 170));

        this.addChild(new RAssemblyPanel("palette_bg", 0, 46, 190, 554, "#162936"));
        this.addChild(new RAssemblyPanel("palette_edge", 184, 46, 6, 554, "#051824"));
        this.addChild(new RAssemblyLabel("palette_title", "BLOQUES", 13, 51, 14, "#27c9b5"));
        this.addChild(new RAssemblyButton("category_flow", "FLUJO", 12, 75, 166, 32, this.paletteCategory === "FLUJO" ? "#27c9b5" : "#3b5265"));
        this.addChild(new RAssemblyButton("category_modules", "MÓDULOS", 12, 111, 166, 32, this.paletteCategory === "MODULOS" ? "#27c9b5" : "#3b5265"));
        this.addChild(new RAssemblyButton("category_variables", "VARIABLES", 12, 147, 166, 32, this.paletteCategory === "VARIABLES" ? "#27c9b5" : "#3b5265"));

        const entries = this.palette[this.paletteCategory] || [];

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i], y = 187 + i * 66;

            this.addChild(new RAssemblyPanel(`palette_shadow_${i}`, 15, y + 4, 164, 54, "#051824"));
            this.addChild(new RAssemblyPanel(`palette_card_${i}`, 12, y, 164, 54, entry.color));
            this.addChild(new RAssemblyPanel(`palette_card_shine_${i}`, 12, y, 164, 4, "#536c7e"));
            this.addChild(new RAssemblyPanel(`palette_card_header_${i}`, 18, y + 7, 152, 24, "#162936"));
            this.addChild(new RAssemblyLabel(`palette_card_title_${i}`, entry.title, 24, y + 14, entry.title.length > 15 ? 8 : 10, "#fff9e1", 140));
            this.addChild(new RAssemblyLabel(`palette_card_desc_${i}`, entry.desc, 21, y + 36, 8, "#051824", 150));
        }

        this.addChild(new RAssemblyLabel("palette_hint_1", "Arrastra un bloque al área →", 12, 552, 8, "#bed7e0"));
        this.addChild(new RAssemblyLabel("palette_hint_2", "Clic en ✕ para borrarlo.", 12, 566, 8, "#bed7e0"));

        this.addChild(new RAssemblyPanel("workspace_frame", 190, 46, 610, 554, "#162936"));
        this.addChild(new RAssemblyPanel("workspace", 198, 96, 592, 486, "#051824"));

        for (let x = 208; x < 780; x += 20)
            this.addChild(new RAssemblyPanel(`grid_v_${x}`, x, 98, 1, 480, "#26394a"));

        for (let y = 106; y < 580; y += 20)
            this.addChild(new RAssemblyPanel(`grid_h_${y}`, 198, y, 582, 1, "#26394a"));

        this.addChild(new RAssemblyLabel("workspace_title", "MI PROGRAMA", 207, 53, 13, "#27c9b5"));
        this.addChild(new RAssemblyLabel("workspace_hint", "Encaja los bloques unos dentro de otros para crear la lógica de tu nave.", 207, 75, 8, "#bed7e0"));

        this.addChild(new RAssemblyPanel("scroll_track", 778, 106, 14, 440, "#0d1625"));
        this.addChild(new RAssemblyPanel("scroll_track_inner", 781, 109, 8, 434, "#3b4e67"));
        this.addChild(new RAssemblyPanel("scroll_thumb", 779, this.getThumbY(), 12, this.getThumbHeight(), "#27c9b5"));
        this.addChild(new RAssemblyPanel("scroll_thumb_shine", 781, this.getThumbY() + 2, 3, Math.max(2, this.getThumbHeight() - 4), "#8be8dc"));

        this.addChild(new RAssemblyPanel("workspace_footer", 198, 585, 592, 14, "#0c1422"));
        this.addChild(new RAssemblyLabel("workspace_stats", `${this.robotName}  |  Variables: ${this.countVariables()}/${this.maxVariables}  |  Instrucciones: ${this.countLines()}/${this.maxLines}`, 207, 588, 8, "#bed7e0", 570));

        if (this.status) {
            this.addChild(new RAssemblyPanel("status_bg", 278, 48, 310, 25, "#27c9b5"));
            this.addChild(new RAssemblyLabel("status_text", this.status, 286, 56, 9, "#ffffff", 294));
        }

        if (this.textField && this.textField.active)
            this.addChild(this.textField);
    }

    buildBlockView() {
        let y = 112 - this.scroll;

        for (const block of this.blocks) {
            this.addChild(
                this.getBlockView(block, 204, y, 550)
            );

            y += this.blockHeight(block) + 8;
        }
    }

    buildDragBlock() {
        if (!this.dragging) return;

        this.addChild(
            this.getBlockView(
                this.dragging,
                Math.max(202, this.dragging.x),
                Math.max(100, this.dragging.y),
                550
            )
        );
    }

    rebuildEditorNodes() {
        for (const child of [...this.children])
            this.removeChild(child);

        this.buildMenu();
        this.buildBlockView();
        this.buildDragBlock();
    }

    blockText(block) {
        if (block.type === "VAR") return `VARIABLE   ${block.name} = ${block.value}`;
        if (block.type === "MODULE") return block.module;
        if (block.type === "IF") return `SI   [ ${block.condition} ]   ENTONCES`;
        if (block.type === "WHILE") return `MIENTRAS   [ ${block.condition} ]`;
        return "BLOQUE";
    }

    countLines() { const source = this.generateSource(); return source ? source.split("\n").length : 0; }
    countVariables() { let count = 0; const visit = list => { for (const b of list || []) { if (b.type === "VAR") count++; visit(b.thenBlocks); visit(b.body); } }; visit(this.blocks); return count; }
}

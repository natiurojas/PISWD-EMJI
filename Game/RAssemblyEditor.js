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
        this.blockViews = new Map();
        this.paletteNodes = [];
        this.paletteNodesByCategory = {};
        this._paletteBuilt = false;
        this._uiBuilt = false;
        this._syncingViews = false;
        this.paletteCategory = "FLUJO";
        this.dragging = null;
        this.draggingView = null;
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
                { type: "MODULE", module: "MOVER_IZQUIERDA", title: "MOVER_IZQUIERDA", color: "#27c9b5", desc: "Desplazarse a la izquierda" },
                { type: "MODULE", module: "MOVER_DERECHA", title: "MOVER_DERECHA", color: "#27c9b5", desc: "Desplazarse a la derecha" },
                { type: "MODULE", module: "MOVER_ARRIBA", title: "MOVER_ARRIBA", color: "#27c9b5", desc: "Desplazarse hacia arriba" },
                { type: "MODULE", module: "MOVER_ABAJO", title: "MOVER_ABAJO", color: "#27c9b5", desc: "Desplazarse hacia abajo" },
                { type: "MODULE", module: "RADAR", title: "RADAR", color: "#27c9b5", desc: "Actualizar detección" }
            ],
            VARIABLES: [
                { type: "PREDEFINED", name: "ENEMIGO_CERCA", valueType: "BOOLEAN", title: "ENEMIGO_CERCA", color: "#3b5265", desc: "Enemigo dentro del radar" },
                { type: "PREDEFINED", name: "ENEMIGO_DETECTADO", valueType: "BOOLEAN", title: "ENEMIGO_DETECTADO", color: "#3b5265", desc: "El radar encontró objetivo" },
                { type: "PREDEFINED", name: "DISTANCIA", valueType: "NUMBER", title: "DISTANCIA", color: "#3b5265", desc: "Distancia al enemigo" },
                { type: "PREDEFINED", name: "VIDA", valueType: "NUMBER", title: "VIDA", color: "#3b5265", desc: "Vida actual" },
                { type: "PREDEFINED", name: "VIDA_MAXIMA", valueType: "NUMBER", title: "VIDA_MAXIMA", color: "#3b5265", desc: "Vida máxima" },
                { type: "PREDEFINED", name: "ESCUDO_ACTIVO", valueType: "BOOLEAN", title: "ESCUDO_ACTIVO", color: "#3b5265", desc: "Estado del escudo" },
                { type: "PREDEFINED", name: "ESCUDO_COOLDOWN", valueType: "NUMBER", title: "ESCUDO_COOLDOWN", color: "#3b5265", desc: "Recarga restante" },
                { type: "PREDEFINED", name: "ENERGIA", valueType: "NUMBER", title: "ENERGIA", color: "#3b5265", desc: "Energía disponible" },
                { type: "OPERATOR", operator: "AND", title: "Y", color: "#27c9b5", desc: "Operador lógico AND" },
                { type: "OPERATOR", operator: "OR", title: "O", color: "#27c9b5", desc: "Operador lógico OR" }
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
        // El programa siempre tiene un ciclo principal fijo.
        // El usuario programa dentro de este bloque; representa la lógica
        // que el robot ejecuta en cada frame de combate.
        const mainLoop = {
            id: this.nextId++,
            type: "WHILE",
            condition: "VERDADERO",
            body: [
                { id: this.nextId++, type: "MODULE", module: "RADAR" },
                {
                    id: this.nextId++, type: "IF", condition: "ENEMIGO_CERCA", thenBlocks: [
                        { id: this.nextId++, type: "MODULE", module: "DISPARAR" }
                    ]
                }
            ],
            mainLoop: true
        };
        this.blocks = [mainLoop];
        this.buildMenu();
        this._uiBuilt = true;
        this.syncPaletteNodes();
        this.syncBlockViews();
        this.syncStatsNodes();
        this.recalculateScroll();
        this.syncScrollNodes();
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
            this.syncBlockViews();
            this.syncScrollNodes();
            if (!Mouse.instance.isLeftClickPressed) this.scrollbarDrag = false;
            return;
        }
        if (this.dragging) {
            this.dragging.x = mx - 60;
            this.dragging.y = my - 18;
            if (this.draggingView)
                this.draggingView.sync(Math.max(202, this.dragging.x), Math.max(100, this.dragging.y), 550, 0);
            if (!Mouse.instance.isLeftClickPressed) this.finishDrag(mx, my);
            return;
        }
        if (Mouse.instance.isLeftClickPressed && !this._mouseDown) {
            this._mouseDown = true;
            this.handlePressed(mx, my);
        }
        if (!Mouse.instance.isLeftClickPressed) this._mouseDown = false;
        this.syncStatusNode();
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
            /*
            this.compileProgram();
            if (!this.status.startsWith("✕"))
                Scene.change(new FightScene(this.generateSource(), this.levelId));
            return;
            */
        }
        if (this.pointIn(mx, my, 12, 75, 166, 32)) {
            this.setPaletteCategory("FLUJO"); return;
        }
        if (this.pointIn(mx, my, 12, 111, 166, 32)) { this.setPaletteCategory("MODULOS"); return; }
        if (this.pointIn(mx, my, 12, 147, 166, 32)) { this.setPaletteCategory("VARIABLES"); return; }

        // Scrollbar del espacio de trabajo.
        const thumbY = this.getThumbY(), thumbH = this.getThumbHeight();
        if (this.pointIn(mx, my, 778, 106, 14, 440)) {
            if (this.pointIn(mx, my, 778, thumbY, 14, thumbH)) {
                this.scrollbarDrag = true; this.scrollbarGrab = my - thumbY;
            } else {
                this.scroll = Math.max(0, Math.min(this.scrollMax, this.scroll + (my < thumbY ? -130 : 130)));
                this.syncBlockViews();
                this.syncScrollNodes();
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
                const isMainLoop = this.isMainLoop(hit.block);
                if (!isMainLoop && this.pointIn(mx, my, hit.rect.x + hit.rect.w - 25, hit.rect.y + 4, 20, 20)) {
                    this.deleteBlock(hit.block); return;
                }
                if (!isMainLoop && hit.block.type !== "MODULE" && this.pointIn(mx, my, hit.rect.x + hit.rect.w - 88, hit.rect.y + 4, 58, 20)) {
                    this.editBlock(hit.block); return;
                }
                this.selected = hit.block;
                // El ciclo principal es fijo: solo se pueden arrastrar sus hijos.
                if (!isMainLoop && my < hit.rect.y + 28) this.startExistingDrag(hit.block, mx, my);
            }
        }
    }

    createBlock(entry) {
        if (entry.type === "VAR")
            return { id: this.nextId++, type: "VAR", name: "mi_variable", value: "0" };
        if (entry.type === "PREDEFINED") return { id: this.nextId++, type: "PREDEFINED", name: entry.name, valueType: entry.valueType };
        if (entry.type === "OPERATOR") return { id: this.nextId++, type: "OPERATOR", operator: entry.operator };
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
        this.draggingView = Scene.instantiate(RAssemblyBlockView, {
            editor: this, block, x: Math.max(202, this.dragging.x),
            y: Math.max(100, this.dragging.y), w: 550, depth: 0
        });
        this.addChild(this.draggingView);
    }

    startExistingDrag(block, mx, my) {
        this._dragWasExisting = true;
        this._dragOriginalParent = this.findParentList(block, this.blocks);
        this._dragOriginalIndex = this._dragOriginalParent ? this._dragOriginalParent.indexOf(block) : -1;
        this.draggingView = this.blockViews.get(block.id) || null;
        this.removeFromTree(block, this.blocks);
        if (this.draggingView) {
            if (this.draggingView.parent) this.draggingView.parent.removeChild(this.draggingView);
            this.addChild(this.draggingView);
        }
        this.dragging = block;
        this.selected = block;
        this.dragging.x = mx - 60;
        this.dragging.y = my - 18;
        if (this.draggingView) this.draggingView.sync(Math.max(202, this.dragging.x), Math.max(100, this.dragging.y), 550, 0);
        this.syncBlockViews();
    }

    finishDrag(mx, my) {
        const block = this.dragging;
        const view = this.draggingView;
        this.dragging = null;
        this.draggingView = null;
        if (!block) return;

        let inserted = false;
        if (this.pointIn(mx, my, 190, 92, 590, 486)) {
            const drop = this.hitBlock(mx, my);
            if (drop && (block.type === "PREDEFINED" || block.type === "OPERATOR")) {
                if (block.type === "PREDEFINED" && drop.block.type === "VAR") drop.block.value = block.name;
                else if (block.type === "PREDEFINED" && (drop.block.type === "IF" || drop.block.type === "WHILE")) {
                    if (block.valueType === "BOOLEAN") drop.block.condition = block.name;
                    else drop.block.condition = drop.block.condition.replace(/(==|!=|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?|VERDADERO|FALSO)\s*$/, `$1 ${block.name}`);
                } else if (block.type === "OPERATOR" && (drop.block.type === "IF" || drop.block.type === "WHILE")) {
                    drop.block.condition = `${drop.block.condition} ${block.operator === "AND" ? "Y" : "O"} VERDADERO`;
                }
                this.flash("Valor/operador conectado a la condición.");
            } else {
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
                    inserted = true;
                    this.flash(this._dragWasExisting ? "Bloque movido." : "¡Bloque añadido!");
                }
            }
        } else if (this._dragWasExisting) {
            const list = this._dragOriginalParent || this.blocks;
            list.splice(Math.max(0, this._dragOriginalIndex), 0, block);
            inserted = true;
        }

        if (inserted && view) {
            view.block = block;
            this.blockViews.set(block.id, view);
        } else if (view) {
            if (view.parent) view.parent.removeChild(view);
            if (!this._dragWasExisting) this.blockViews.delete(block.id);
        }

        this._dragWasExisting = false;
        this.recalculateScroll();
        this.syncBlockViews();
        this.syncScrollNodes();
        this.syncStatsNodes();
        this.syncStatusNode();
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
        if (this.isMainLoop(block)) {
            this.flash("El MIENTRAS VERDADERO principal no se puede editar.");
            return;
        }
        this.editingBlock = block;
        let fields = [];
        if (block.type === "VAR") fields = [
            { key: "name", label: "NOMBRE DE VARIABLE", value: block.name },
            { key: "value", label: "VALOR / EXPRESIÓN", value: block.value }
        ];
        else if (block.type === "IF" || block.type === "WHILE") fields = [
            { key: "condition", label: "CONDICIÓN RASSEMBLY", value: block.condition }
        ];
        else if (block.type === "MODULE") return;
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
            this.syncBlockViews();
            this.syncScrollNodes();
            this.syncStatsNodes();
            if (this.textField.parent === this) this.removeChild(this.textField);
            return;
        }
        if (this.textField.parent !== this) this.addChild(this.textField);
        this.textField.open(field.value, field.label, value => {
            if (value.trim()) this.editingBlock[field.key] = value.trim();
            this.editFieldIndex++;
            this.openEditField();
        });
    }

    deleteBlock(block) {
        if (this.isMainLoop(block)) {
            this.flash("El MIENTRAS VERDADERO principal no se puede borrar.");
            return;
        }
        this.removeFromTree(block, this.blocks);
        if (this.selected === block) this.selected = null;
        this.flash("Bloque eliminado.");
        this.recalculateScroll();
        this.syncBlockViews();
        this.syncScrollNodes();
        this.syncStatsNodes();
        this.syncStatusNode();
    }

    isMainLoop(block) {
        return !!block && block.mainLoop === true;
    }

    getMainLoop() {
        return this.blocks.find(block => this.isMainLoop(block)) || null;
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
        this.syncStatusNode();
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

        // Siempre existe un único ciclo principal. Todo el programa del robot
        // vive dentro de él y se vuelve a ejecutar al comenzar cada frame.
        const mainLoop = this.getMainLoop();
        if (mainLoop) {
            this.emitBlock(mainLoop, lines, 0);
        } else {
            // Salvaguarda por si un proyecto antiguo no tenía todavía el bloque raíz.
            lines.push("MIENTRAS VERDADERO HACER");
            lines.push("FIN");
        }
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
        background("#051824");
        noStroke();
        for (let i = 0; i < 24; i++) {
            const x = (i * 67 + 13) % 800;
            const y = (i * 43 + Math.floor(this.animTime * (3 + i % 3))) % 600;
            fill(39, 201, 181, 45 + (i % 3) * 22);
            rect(x, y, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
        }
    }

    buildMenu() {
        this.addChild(new RAssemblyPanel("top_bar", 0, 0, 800, 46, "#162936"));
        this.addChild(new RAssemblyPanel("top_bar_line", 0, 42, 800, 4, "#3b5265"));
        this.addChild(new RAssemblyLabel("title", "R//ASSEMBLY LAB", 118, 17, 17, "#27c9b5"));
        this.addChild(new RAssemblyLabel("level_top", this.level ? this.level.name : "EDITOR LIBRE", 296, 19, 8, this.level ? this.level.color : "#bed7e0", 104));
        this.addChild(new RAssemblyButton("back", "<- MENU", 10, 10, 90, 28, "#3b5265"));
        this.addChild(new RAssemblyButton("compile", "COMPILAR", 592, 10, 82, 28, "#27c9b5"));
        let testBtn = new RAssemblyButton("test", "PROBAR", 682, 10, 104, 28, "#3b5265");
        testBtn.onReleased = () => {
            console.log("SEASASXD")
            this.compileProgram();
            if (!this.status.startsWith("✕"))
                Scene.change(new FightScene(this.generateSource(), this.levelId));
        }
        this.addChild(testBtn);
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

    // Sincroniza vistas por ID. Solo crea/elimina la vista cuyo bloque cambió;
    // los demás Nodes conservan su identidad y estado.
    syncBlockViews() {
        if (!this._uiBuilt || this._syncingViews) return;
        this._syncingViews = true;

        const activeIds = new Set();
        const collect = list => {
            for (const block of list || []) {
                activeIds.add(block.id);
                collect(block.thenBlocks);
                collect(block.body);
            }
        };
        collect(this.blocks);
        // Durante un arrastre, el bloque existente sigue vivo aunque esté
        // temporalmente fuera de su lista de origen.
        if (this._dragWasExisting && this.dragging) activeIds.add(this.dragging.id);

        // Los bloques borrados pierden únicamente su propia vista.
        for (const [id, view] of this.blockViews) {
            if (!activeIds.has(id)) {
                if (view.parent) view.parent.removeChild(view);
                this.blockViews.delete(id);
            }
        }

        let y = 112 - this.scroll;
        for (const block of this.blocks) {
            let view = this.blockViews.get(block.id);
            if (!view) {
                view = Scene.instantiate(RAssemblyBlockView, {
                    editor: this, block, x: 204, y, w: 550, depth: 0
                });
                this.blockViews.set(block.id, view);
            }
            if (view.parent !== this) this.addChild(view);
            view.block = block;
            view.sync(204, y, 550, 0);
            y += this.blockHeight(block) + 8;
        }
        this._syncingViews = false;
    }

    // Mantiene el nombre antiguo por compatibilidad con llamadas externas,
    // pero ya no reconstruye el árbol.
    rebuildEditorNodes() {
        this.syncBlockViews();
        this.syncScrollNodes();
        this.syncStatusNode();
        this.syncStatsNodes();
    }

    setPaletteCategory(category) {
        if (this.paletteCategory === category) return;
        this.paletteCategory = category;
        this.syncPaletteNodes();
        const colors = {
            category_flow: category === "FLUJO" ? "#27c9b5" : "#3b5265",
            category_modules: category === "MODULOS" ? "#27c9b5" : "#3b5265",
            category_variables: category === "VARIABLES" ? "#27c9b5" : "#3b5265"
        };
        for (const [name, color] of Object.entries(colors)) {
            const button = this.getChildByName(name);
            const surface = button && button.getChildByName(`${name}_surface`);
            if (surface) surface.color = new Color(color);
        }
    }

    syncPaletteNodes() {
        if (!this._uiBuilt) return;

        // Construye las tres paletas una sola vez. Cambiar de categoría solo
        // alterna visible; no destruye ni vuelve a instanciar sus Nodes.
        if (!this._paletteBuilt) {
            for (const [category, entries] of Object.entries(this.palette)) {
                const categoryNodes = [];
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i], y = 187 + i * 66;
                    const nodes = [
                        new RAssemblyPanel(`palette_shadow_${category}_${i}`, 15, y + 4, 164, 54, "#051824"),
                        new RAssemblyPanel(`palette_card_${category}_${i}`, 12, y, 164, 54, entry.color),
                        new RAssemblyPanel(`palette_card_shine_${category}_${i}`, 12, y, 164, 4, "#536c7e"),
                        new RAssemblyPanel(`palette_card_header_${category}_${i}`, 18, y + 7, 152, 24, "#162936"),
                        new RAssemblyLabel(`palette_card_title_${category}_${i}`, entry.title, 24, y + 14, entry.title.length > 15 ? 8 : 10, "#fff9e1", 140),
                        new RAssemblyLabel(`palette_card_desc_${category}_${i}`, entry.desc, 21, y + 36, 8, "#051824", 150)
                    ];
                    for (const node of nodes) {
                        node.visible = category === this.paletteCategory;
                        categoryNodes.push(node);
                        this.paletteNodes.push(node);
                        this.addChild(node);
                    }
                }
                this.paletteNodesByCategory[category] = categoryNodes;
            }
            this._paletteBuilt = true;
            return;
        }

        for (const [category, nodes] of Object.entries(this.paletteNodesByCategory)) {
            const visible = category === this.paletteCategory;
            for (const node of nodes) node.visible = visible;
        }
    }

    syncScrollNodes() {
        const thumb = this.getChildByName("scroll_thumb");
        const shine = this.getChildByName("scroll_thumb_shine");
        if (thumb) {
            thumb.pos = new Vector2(779, this.getThumbY());
            thumb.size = new Vector2(12, this.getThumbHeight());
        }
        if (shine) {
            shine.pos = new Vector2(781, this.getThumbY() + 2);
            shine.size = new Vector2(3, Math.max(2, this.getThumbHeight() - 4));
        }
    }

    syncStatusNode() {
        const bg = this.getChildByName("status_bg");
        const label = this.getChildByName("status_text");
        if (bg) bg.visible = !!this.status;
        if (label) {
            label.visible = !!this.status;
            label.setText(this.status || "");
        }
    }

    syncStatsNodes() {
        const top = this.getChildByName("stats_top");
        const footer = this.getChildByName("workspace_stats");
        if (top) top.setText(`CPU ${this.cpu}  ·  RAM ${this.countLines()}/${this.maxLines}`);
        if (footer) footer.setText(`${this.robotName}  |  Variables: ${this.countVariables()}/${this.maxVariables}  |  Instrucciones: ${this.countLines()}/${this.maxLines}`);
    }

    buildBlockView() {
        this.syncBlockViews();
    }

    blockText(block) {
        if (block.type === "VAR") return `VARIABLE   ${block.name} = ${block.value}`;
        if (block.type === "MODULE") return block.module;
        if (block.type === "PREDEFINED") return `${block.name}  : ${block.valueType}`;
        if (block.type === "OPERATOR") return block.operator === "AND" ? "Y  (AND)" : "O  (OR)";
        if (block.type === "IF") return `SI   [ ${block.condition} ]   ENTONCES`;
        if (block.type === "WHILE") return `MIENTRAS   [ ${block.condition} ]`;
        return "BLOQUE";
    }

    countLines() { const source = this.generateSource(); return source ? source.split("\n").length : 0; }
    countVariables() { let count = 0; const visit = list => { for (const b of list || []) { if (b.type === "VAR") count++; visit(b.thenBlocks); visit(b.body); } }; visit(this.blocks); return count; }
}

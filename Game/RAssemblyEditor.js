class RAssemblyEditor extends Scene {
    constructor(levelId = null, options = {}) {
        super();
        this.type = "UI";
        this.name = "RAssemblyEditor";
        this.levelId = levelId;
        this.returnScene = options.returnScene || null;
        this.level = levelId !== null && typeof GameLevels !== "undefined"
            ? GameLevels.get(levelId)
            : null;
        this.blocks = [];
        this.blockViews = new Map();
        this.paletteNodes = [];
        this.paletteNodesByCategory = {};
        this._paletteCardGroups = {};
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
        this.paletteScroll = 0;
        this.paletteScrollMax = 0;
        this.paletteScrollbarDrag = false;
        this._paletteThumbPressed = false;
        this.paletteScrollbarGrab = 0;
        this.paletteViewport = { top: 187, height: 348 };
        this._declaredPaletteSignature = "";
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
        this.robotName = this.loadout && this.loadout.name ? this.loadout.name : "RF-01";
        this.robotStats = robotStats;
        this.palette = {
            FLUJO: [
                { type: "VAR", title: "VARIABLE", color: "#3b5265", desc: "Crear una variable" },
                { type: "ASSIGN", title: "ASIGNAR", color: "#3b5265", desc: "Cambiar una variable existente" },
                { type: "IF", title: "SI ... ENTONCES", color: "#27c9b5", desc: "Tomar una decisión" },
                { type: "ELSE", title: "SINO", color: "#b58aff", desc: "Rama alternativa de un SI" },
                { type: "WHILE", title: "MIENTRAS ...", color: "#3b5265", desc: "Repetir acciones" }
            ],
            MODULOS: [
                { type: "MODULE", module: "DETECTAR_ENEMIGO", title: "DETECTAR_ENEMIGO", color: "#27c9b5", desc: "Leer el radar" },
                { type: "MODULE", module: "DISPARAR", title: "DISPARAR", color: "#27c9b5", desc: "Usar los canones" },
                { type: "MODULE", module: "ACTIVAR_ESCUDO", title: "ACTIVAR_ESCUDO", color: "#27c9b5", desc: "Activar el escudo" },
                { type: "MODULE", module: "MOVER_IZQUIERDA", title: "MOVER_IZQUIERDA", color: "#27c9b5", desc: "Desplazarse a la izquierda" },
                { type: "MODULE", module: "MOVER_DERECHA", title: "MOVER_DERECHA", color: "#27c9b5", desc: "Desplazarse a la derecha" },
                { type: "MODULE", module: "MOVER_ARRIBA", title: "MOVER_ARRIBA", color: "#27c9b5", desc: "Desplazarse hacia arriba" },
                { type: "MODULE", module: "MOVER_ABAJO", title: "MOVER_ABAJO", color: "#27c9b5", desc: "Desplazarse hacia abajo" },
                { type: "MODULE", module: "RADAR", title: "RADAR", color: "#27c9b5", desc: "Actualizar detección" },
                { type: "MODULE", module: "ACERCARSE", title: "ACERCARSE", color: "#27c9b5", desc: "Avanzar hacia el enemigo" },
                { type: "MODULE", module: "ALEJARSE", title: "ALEJARSE", color: "#27c9b5", desc: "Tomar distancia del enemigo" },
                { type: "MODULE", module: "ESQUIVAR", title: "ESQUIVAR", color: "#27c9b5", desc: "Activar evasión temporal" },
                { type: "MODULE", module: "REPARAR", title: "REPARAR", color: "#27c9b5", desc: "Recuperar integridad" },
                { type: "MODULE", module: "RECARGAR_ENERGIA", title: "RECARGAR_ENERGIA", color: "#27c9b5", desc: "Recuperar energía" }
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
            ],
            VARIABLES_DECLARADAS: []
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
        this.restoreProgramSource();
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

        if (this.paletteScrollbarDrag) {
            const trackY = this.paletteViewport.top;
            const trackH = this.paletteViewport.height;
            const thumbH = this.getPaletteThumbHeight();
            const newY = Math.max(trackY, Math.min(trackY + trackH - thumbH, my - this.paletteScrollbarGrab));
            this.paletteScroll = this.paletteScrollMax *
                ((newY - trackY) / Math.max(1, trackH - thumbH));
            this.syncPaletteNodes();
            return;
        }

        // El arrastre se actualiza mientras el botón de origen permanece
        // presionado. La finalización se delega al onReleased del botón
        // transparente de captura global.
        if (this.scrollbarDrag) {
            const trackY = 106, trackH = 440, thumbH = this.getThumbHeight();
            const newY = Math.max(
                trackY,
                Math.min(trackY + trackH - thumbH, my - this.scrollbarGrab)
            );
            this.scroll = this.scrollMax *
                ((newY - trackY) / Math.max(1, trackH - thumbH));

            this.syncBlockViews();
            this.syncScrollNodes();
            return;
        }

        if (this.dragging) {
            this.dragging.x = mx - 60;
            this.dragging.y = my - 18;

            if (this.draggingView) {
                this.draggingView.sync(
                    Math.max(202, this.dragging.x),
                    Math.max(100, this.dragging.y),
                    550,
                    0
                );
            }

            return;
        }

        this.syncStatusNode();
    }

    // Captura el release aunque el cursor haya terminado fuera del botón
    // que inició la interacción.
    handlePointerRelease() {
        if (this.dragging) {
            this.finishDrag(mouseX, mouseY);
        }

        if (this.scrollbarDrag) {
            this.scrollbarDrag = false;
        }

        this._scrollbarThumbPressed = false;
        this.paletteScrollbarDrag = false;
        this._paletteThumbPressed = false;
    }

    createHitButton(name, x, y, w, h, onPressed = null, onReleased = null) {
        const button = new RAssemblyButton(name, "", x, y, w, h, "transparent");

        const surface = button.getChildByName(`${name}_surface`);
        const shine = button.getChildByName(`${name}_shine`);
        const label = button.getChildByName(`${name}_label`);

        if (surface) surface.visible = false;
        if (shine) shine.visible = false;
        if (label) label.visible = false;

        button.onPressed = onPressed;
        button.onReleased = onReleased;

        this.addChild(button);
        return button;
    }

    expressionToSource(expression) {
        if (!expression) return "0";
        if (expression.type === "LITERAL") {
            if (expression.value === true) return "VERDADERO";
            if (expression.value === false) return "FALSO";
            if (typeof expression.value === "string")
                return `"${expression.value.replace(/"/g, '\\"')}"`;
            return String(expression.value);
        }
        if (expression.type === "VARIABLE") return expression.name;
        if (expression.type === "UNARY") {
            const operator = expression.operator === "NOT" ? "NO" : "-";
            return `${operator}${this.expressionToSource(expression.right)}`;
        }
        if (expression.type === "BINARY") {
            const operators = {
                OR: "O", AND: "Y", EQUAL: "==", NOT_EQUAL: "!=",
                GT: ">", GTE: ">=", LT: "<", LTE: "<=",
                PLUS: "+", MINUS: "-", MULTIPLY: "*", DIVIDE: "/"
            };
            return `(${this.expressionToSource(expression.left)} ${operators[expression.operator] || expression.operator} ${this.expressionToSource(expression.right)})`;
        }
        return "0";
    }

    restoreProgramSource() {
        let source = "";
        try { source = localStorage.getItem("emji.rassembly.program") || ""; }
        catch (_) { return false; }
        if (!source.trim()) return false;

        try {
            const parser = new RAssemblyParser(new RAssemblyLexer(source).tokenize());
            const program = parser.parse();
            this.nextId = 1;

            const convertList = statements => (statements || [])
                .map(statement => {
                    const id = this.nextId++;
                    if (statement.type === "VAR")
                        return { id, type: "VAR", name: statement.name, value: this.expressionToSource(statement.value) };
                    if (statement.type === "ASSIGN")
                        return { id, type: "ASSIGN", name: statement.name, value: this.expressionToSource(statement.value) };
                    if (statement.type === "CALL")
                        return { id, type: "MODULE", module: statement.module };
                    if (statement.type === "IF") {
                        const hasElse = Array.isArray(statement.elseBody);
                        return {
                            id, type: "IF",
                            condition: this.expressionToSource(statement.condition),
                            thenBlocks: convertList(statement.thenBody),
                            elseBlocks: convertList(statement.elseBody || []),
                            hasElse
                        };
                    }
                    if (statement.type === "WHILE")
                        return {
                            id, type: "WHILE",
                            condition: this.expressionToSource(statement.condition),
                            body: convertList(statement.body)
                        };
                    return null;
                })
                .filter(Boolean);

            const roots = convertList(program.body);
            const mainLoop = roots.find(block => block.type === "WHILE");
            if (mainLoop) {
                mainLoop.mainLoop = true;
                this.blocks = [mainLoop];
                return true;
            }
        } catch (error) {
            console.warn("[RAssemblyEditor] No se pudo restaurar el programa guardado:", error.message);
        }
        return false;
    }

    playBlockSplash(target) {
        if (!target || typeof Animation === "undefined") return;
        if (target._blockSplash && target._blockSplash.isPlaying())
            target._blockSplash.stop();
        target.scale = new Vector2(1, 1);
        target._blockSplash = new Animation()
            .setFrames(12)
            .to(1, 4, target, {
                scaleX: { from: 1, to: 1.09 },
                scaleY: { from: 1, to: 1.09 }
            }, "EASEINOUT")
            .to(4, 12, target, {
                scaleX: { from: 1.09, to: 1 },
                scaleY: { from: 1.09, to: 1 }
            }, "EASEINOUT")
            .play();
    }

    createBlock(entry) {
        if (entry.type === "VAR")
            return { id: this.nextId++, type: "VAR", name: "mi_variable", value: "0" };
        if (entry.type === "ASSIGN")
            return { id: this.nextId++, type: "ASSIGN", name: "mi_variable", value: "0" };
        if (entry.type === "PREDEFINED" || entry.type === "DECLARED_VAR")
            return { id: this.nextId++, type: "PREDEFINED", name: entry.name, valueType: entry.valueType };
        if (entry.type === "OPERATOR") return { id: this.nextId++, type: "OPERATOR", operator: entry.operator };
        if (entry.type === "IF")
            return { id: this.nextId++, type: "IF", condition: "enemigo == 1", thenBlocks: [], elseBlocks: [], hasElse: false };
        if (entry.type === "ELSE")
            return { id: this.nextId++, type: "ELSE", body: [] };
        if (entry.type === "WHILE")
            return { id: this.nextId++, type: "WHILE", condition: "VERDADERO", body: [] };
        return { id: this.nextId++, type: "MODULE", module: entry.module };
    }

    setEditorButtonsEnabled(enabled) {
        for (const child of this.children) {
            if (child instanceof Button && child.name !== "pointer_release_catcher")
                child.disabled = !enabled;
        }
    }

    startDrag(block, mx, my) {
        if (this.dragging || this.paletteScrollbarDrag || this.scrollbarDrag) return false;
        this.dragging = block;
        this._dragWasExisting = false;
        this.selected = block;
        this.dragging.x = mx - 60;
        this.dragging.y = my - 18;
        this.draggingView = Scene.instantiate(RAssemblyBlockView, {
            editor: this, block, x: Math.max(202, this.dragging.x),
            y: Math.max(100, this.dragging.y), w: 550, depth: 0
        });

        // El bloque recién creado no puede reaccionar al mismo click que
        // inició su arrastre.
        this.draggingView.refs.edit.disabled = true;
        this.draggingView.refs.delete.disabled = true;
        this.draggingView.refs.drag.disabled = true;

        this.addChild(this.draggingView);
        this.setEditorButtonsEnabled(false);
        this.playBlockSplash(this.draggingView);
        if (typeof AudioPlayer !== "undefined") AudioPlayer.play("blockPick");
        this.syncBlockViews();
        this.syncPaletteNodes();
        return true;
    }

    startExistingDrag(block, mx, my) {
        // Button.tick puede visitar varios botones en un mismo frame.
        // Nunca permitimos iniciar un segundo drag mientras uno esté activo.
        if (this.dragging || this.paletteScrollbarDrag || this.scrollbarDrag) return false;
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
        this.setEditorButtonsEnabled(false);
        if (this.draggingView) {
            this.draggingView.sync(Math.max(202, this.dragging.x), Math.max(100, this.dragging.y), 550, 0);
            this.playBlockSplash(this.draggingView);
        }
        if (typeof AudioPlayer !== "undefined") AudioPlayer.play("blockPick");
        this.syncBlockViews();
        return true;
    }

    finishDrag(mx, my) {
        const block = this.dragging;
        const view = this.draggingView;
        this.dragging = null;
        this.draggingView = null;
        if (!block) return;

        let inserted = false;
        if (
            mx >= 190 && mx <= 780 &&
            my >= 92 && my <= 578
        ) {
            const drop = this.hitBlock(mx, my);
            if (block.type === "ELSE") {
                const targetIf = this.findIfTarget(drop && drop.block);
                if (!targetIf || targetIf.hasElse) {
                    this.flash(targetIf
                        ? "Este SI ya tiene un bloque SINO."
                        : "SINO solo se puede colocar debajo de un bloque SI ... ENTONCES.");
                } else {
                    targetIf.hasElse = true;
                    targetIf.elseBlocks = block.body || [];
                    inserted = true;
                    this.flash("Rama SINO agregada al bloque SI.");
                }
            } else if (drop && (block.type === "PREDEFINED" || block.type === "OPERATOR")) {
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
        } else if (block.type === "ELSE") {
            this.flash("SINO solo se puede colocar debajo de un bloque SI ... ENTONCES.");
        } else if (this._dragWasExisting) {
            const list = this._dragOriginalParent || this.blocks;
            list.splice(Math.max(0, this._dragOriginalIndex), 0, block);
            inserted = true;
        }

        if (inserted && view) {
            view.block = block;
            this.playBlockSplash(view);
            if (typeof AudioPlayer !== "undefined") AudioPlayer.play("blockDrop");
            this.blockViews.set(block.id, view);
        } else if (view) {
            if (typeof AudioPlayer !== "undefined") AudioPlayer.play("blockInvalid");
            if (view.parent) view.parent.removeChild(view);
            if (!this._dragWasExisting) this.blockViews.delete(block.id);
        }

        this._dragWasExisting = false;
        this.setEditorButtonsEnabled(true);
        this.recalculateScroll();
        this.syncBlockViews();
        this.syncScrollNodes();
        this.syncStatsNodes();
        this.syncStatusNode();
    }

    findIfTarget(block) {
        if (!block) return null;
        if (block.type === "IF") return block;

        let current = block;
        while (current) {
            const parentList = this.findParentList(current, this.blocks);
            if (!parentList) return null;
            const parent = this.findParentBlock(parentList);
            if (!parent) return null;
            if (parent.type === "IF") return parent;
            current = parent;
        }
        return null;
    }

    findParentBlock(targetList, list = this.blocks) {
        for (const block of list || []) {
            if (block.thenBlocks === targetList || block.elseBlocks === targetList || block.body === targetList)
                return block;
            const found = this.findParentBlock(targetList, block.thenBlocks || []) ||
                this.findParentBlock(targetList, block.elseBlocks || []) ||
                this.findParentBlock(targetList, block.body || []);
            if (found) return found;
        }
        return null;
    }

    findContainerAt(mx, my, list, x, y) {
        for (const b of list) {
            const h = this.blockHeight(b);
            if (b.type === "IF" || b.type === "WHILE") {
                const innerY = y + 58;
                const innerH = h - 66;
                if (
                    mx >= x + 18 &&
                    mx <= x + 18 + 520 &&
                    my >= innerY &&
                    my <= innerY + Math.max(28, innerH)
                ) {
                    if (b.type === "IF" && b.hasElse) {
                        const elseY = innerY + Math.max(24, this.listHeight(b.thenBlocks || [])) + 26;
                        if (my >= elseY && my <= elseY + Math.max(28, this.listHeight(b.elseBlocks || []))) {
                            const nestedElse = this.findContainerAt(mx, my, b.elseBlocks || [], x + 34, elseY);
                            return nestedElse || { block: b, list: b.elseBlocks };
                        }
                    }
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
            if ((b.thenBlocks || []).includes(target) || (b.elseBlocks || []).includes(target) || (b.body || []).includes(target)) return b.thenBlocks || b.body;
            const found = this.findParentList(target, b.thenBlocks || []) || this.findParentList(target, b.elseBlocks || []) || this.findParentList(target, b.body || []);
            if (found) return found;
        }
        return null;
    }

    removeFromTree(target, list) {
        const i = list.indexOf(target);
        if (i >= 0) { list.splice(i, 1); return true; }
        for (const b of list) if (this.removeFromTree(target, b.thenBlocks || []) || this.removeFromTree(target, b.elseBlocks || []) || this.removeFromTree(target, b.body || [])) return true;
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
        if (block.type === "VAR" || block.type === "ASSIGN") fields = [
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
        if (block.type === "IF") {
            const thenHeight = Math.max(24, this.listHeight(block.thenBlocks || []));
            const elseHeight = block.hasElse ? 28 + Math.max(24, this.listHeight(block.elseBlocks || [])) : 0;
            return 66 + thenHeight + elseHeight;
        }
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
                    if (block.type === "IF" && block.hasElse) {
                        const elseY = y + 58 + Math.max(24, this.listHeight(block.thenBlocks || [])) + 26;
                        const foundElse = visit(block.elseBlocks || [], x + 20, elseY);
                        if (foundElse) return foundElse;
                    }
                }
                if (
                    mx >= x &&
                    mx <= x + rectInfo.w &&
                    my >= y &&
                    my <= y + h
                ) return { block, rect: rectInfo };
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
    flash(message) { this.status = message; this.statusTime = 2.2; }

    compileProgram() {
        try {
            if (this.countLines() > this.maxLines)
                throw new Error(`RAM insuficiente: el programa supera ${this.maxLines} líneas/bloques.`);
            if (this.countVariables() > this.maxVariables)
                throw new Error(`RAM insuficiente: el chasis admite ${this.maxVariables} variables.`);
            const source = this.generateSource();
            const parser = new RAssemblyParser(new RAssemblyLexer(source).tokenize());
            parser.parse();
            const programCode = this.generateSource();
            try { localStorage.setItem("emji.rassembly.program", programCode); } catch (_) {}
            if (typeof BackendClient !== "undefined" && BackendClient.token()) {
                const loadout = typeof RobotLoadout !== "undefined" ? RobotLoadout.load() : {};
                BackendClient.saveProfile({
                    robotName: loadout.name || this.robotName,
                    loadout,
                    programCode
                }).catch(error => console.warn("[EMJI] No se pudo sincronizar el programa:", error.message));
            }
            this.flash("✓ ¡Programa válido!");
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
                collect(b.elseBlocks);
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
        else if (block.type === "ASSIGN") lines.push(pad + `${block.name} = ${block.value}`);
        else if (block.type === "MODULE") lines.push(pad + `LLAMAR ${block.module}`);
        else if (block.type === "IF") {
            lines.push(pad + `SI ${block.condition} ENTONCES`);
            for (const child of block.thenBlocks || []) this.emitBlock(child, lines, indent + 1);
            if (block.hasElse) {
                lines.push(pad + "SINO");
                for (const child of block.elseBlocks || []) this.emitBlock(child, lines, indent + 1);
            }
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

        const backBtn = new RAssemblyButton("back", "<- MENU", 10, 10, 90, 28, "#3b5265");
        backBtn.onReleased = () => {
            Scene.change(this.returnScene || (this.levelId ? new LevelsScene() : new MainMenu()));
        };
        this.addChild(backBtn);

        const compileBtn = new RAssemblyButton("compile", "COMPILAR", 592, 10, 82, 28, "#27c9b5");
        compileBtn.onReleased = () => this.compileProgram();
        this.addChild(compileBtn);

        let testBtn = new RAssemblyButton(
            "test", this.returnScene ? "GUARDAR" : "PROBAR",
            682, 10, 104, 28, "#3b5265"
        );
        testBtn.onReleased = () => {
            this.compileProgram();
            if (this.status.startsWith("✕")) return;
            if (this.returnScene) Scene.change(this.returnScene);
            else Scene.change(new FightScene(this.generateSource(), this.levelId));
        }
        this.addChild(testBtn);
        this.addChild(new RAssemblyLabel("stats_top", `CPU ${this.cpu}  ·  RAM ${this.countLines()}/${this.maxLines}`, 405, 18, 9, "#bed7e0", 170));

        this.addChild(new RAssemblyPanel("palette_bg", 0, 46, 190, 554, "#162936"));
        this.addChild(new RAssemblyPanel("palette_edge", 184, 46, 6, 554, "#051824"));
        this.addChild(new RAssemblyLabel("palette_title", "BLOQUES", 13, 51, 14, "#27c9b5"));
        const categories = [
            ["FLUJO", "FLUJO", 12, 75, "category_flow"],
            ["MODULOS", "MÓDULOS", 98, 75, "category_modules"],
            ["VARIABLES", "VARIABLES", 12, 111, "category_variables"],
            ["VARIABLES_DECLARADAS", "DECLARADAS", 98, 111, "category_declared"]
        ];
        for (const [key, text, x, y, name] of categories) {
            const button = new RAssemblyButton(
                name, text, x, y, 80, 30,
                this.paletteCategory === key ? "#27c9b5" : "#3b5265"
            );
            button.onReleased = () => this.setPaletteCategory(key);
            this.addChild(button);
        }

        this.addChild(new RAssemblyPanel("palette_scroll_track", 178, 187, 6, 348, "#0d1625"));
        this.addChild(new RAssemblyPanel("palette_scroll_thumb", 179, 187, 4, 348, "#27c9b5"));

        this.createHitButton(
            "palette_scroll_track_hit", 177, 187, 8, 348, null,
            () => {
                if (this._paletteThumbPressed) return;
                const thumbY = this.getPaletteThumbY();
                this.paletteScroll = Math.max(0, Math.min(
                    this.paletteScrollMax,
                    this.paletteScroll + (mouseY < thumbY ? -220 : 220)
                ));
                this.syncPaletteNodes();
            }
        );
        this._paletteThumbButton = this.createHitButton(
            "palette_scroll_thumb_hit", 177, 187, 8, 348,
            () => {
                this._paletteThumbPressed = true;
                this.paletteScrollbarDrag = true;
                this.paletteScrollbarGrab = mouseY - this.getPaletteThumbY();
            }
        );

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

        this.createHitButton(
            "scroll_track_hit",
            778, 106, 14, 440,
            null,
            () => {
                if (this._scrollbarThumbPressed) return;

                const thumbY = this.getThumbY();
                const direction = mouseY < thumbY ? -130 : 130;
                this.scroll = Math.max(
                    0,
                    Math.min(this.scrollMax, this.scroll + direction)
                );
                this.syncBlockViews();
                this.syncScrollNodes();
            }
        );

        this._scrollbarThumbButton = this.createHitButton(
            "scroll_thumb_hit",
            778, 106, 14, 36,
            () => {
                this._scrollbarThumbPressed = true;
                this.scrollbarDrag = true;
                this.scrollbarGrab = mouseY - this.getThumbY();
            }
        );

        this.addChild(new RAssemblyPanel("workspace_footer", 198, 585, 592, 14, "#0c1422"));
        this.addChild(new RAssemblyLabel("workspace_stats", `${this.robotName}  |  Variables: ${this.countVariables()}/${this.maxVariables}  |  Instrucciones: ${this.countLines()}/${this.maxLines}`, 207, 588, 8, "#bed7e0", 570));

        if (this.status) {
            this.addChild(new RAssemblyPanel("status_bg", 278, 48, 310, 25, "#27c9b5"));
            this.addChild(new RAssemblyLabel("status_text", this.status, 286, 56, 9, "#ffffff", 294));
        }

        if (this.textField && this.textField.active)
            this.addChild(this.textField);

        // Se agrega al final para que los botones específicos reciban primero
        // su onReleased y este catcher finalice luego el arrastre.
        this.createHitButton(
            "pointer_release_catcher",
            0, 0, 800, 600,
            null,
            () => this.handlePointerRelease()
        );
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
                collect(block.elseBlocks);
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
        if (!this.palette[category] || this.paletteCategory === category) return;
        this.paletteCategory = category;
        this.paletteScroll = 0;
        this.syncPaletteNodes();

        const colors = {
            category_flow: category === "FLUJO" ? "#27c9b5" : "#3b5265",
            category_modules: category === "MODULOS" ? "#27c9b5" : "#3b5265",
            category_variables: category === "VARIABLES" ? "#27c9b5" : "#3b5265",
            category_declared: category === "VARIABLES_DECLARADAS" ? "#27c9b5" : "#3b5265"
        };
        for (const [name, color] of Object.entries(colors)) {
            const button = this.getChildByName(name);
            const surface = button && button.getChildByName(`${name}_surface`);
            if (surface) surface.color = new Color(color);
        }
    }

    getDeclaredVariableEntries() {
        const declared = new Map();
        const visit = list => {
            for (const block of list || []) {
                if (block.type === "VAR" && block.name) {
                    declared.set(block.name, {
                        type: "DECLARED_VAR",
                        name: block.name,
                        valueType: /^(VERDADERO|FALSO|true|false)$/i.test(String(block.value).trim())
                            ? "BOOLEAN" : "NUMBER",
                        title: block.name,
                        color: "#65baff",
                        desc: `Variable declarada · ${block.value}`
                    });
                }
                visit(block.thenBlocks);
                visit(block.elseBlocks);
                visit(block.body);
            }
        };
        visit(this.blocks);
        return [...declared.values()];
    }

    buildPaletteCategoryNodes(category) {
        for (const node of this.paletteNodesByCategory[category] || []) {
            if (node.parent) node.parent.removeChild(node);
        }

        const entries = this.palette[category] || [];
        const groups = [];
        const categoryNodes = [];

        entries.forEach((entry, i) => {
            const y = this.paletteViewport.top + i * 66 - this.paletteScroll;
            const visual = [
                new RAssemblyPanel(`palette_shadow_${category}_${i}`, 15, y + 4, 160, 54, "#051824"),
                new RAssemblyPanel(`palette_card_${category}_${i}`, 12, y, 160, 54, entry.color),
                new RAssemblyPanel(`palette_card_shine_${category}_${i}`, 12, y, 160, 4, "#536c7e"),
                new RAssemblyPanel(`palette_card_header_${category}_${i}`, 18, y + 7, 148, 24, "#162936"),
                new RAssemblyLabel(`palette_card_title_${category}_${i}`, entry.title, 24, y + 14, entry.title.length > 15 ? 8 : 10, "#fff9e1", 132),
                new RAssemblyLabel(`palette_card_desc_${category}_${i}`, entry.desc, 21, y + 36, 8, "#051824", 145)
            ];
            for (const node of visual) {
                this.addChild(node);
                categoryNodes.push(node);
            }

            const hitButton = this.createHitButton(
                `palette_hit_${category}_${i}`,
                12, y, 160, 54,
                () => {
                    if (this.dragging) return;
                    this.startDrag(this.createBlock(entry), mouseX, mouseY);
                }
            );
            categoryNodes.push(hitButton);
            groups.push({ entry, visual, hitButton, y });
        });

        this.paletteNodesByCategory[category] = categoryNodes;
        this._paletteCardGroups[category] = groups;
    }

    getPaletteThumbHeight() {
        const count = (this.palette[this.paletteCategory] || []).length;
        return Math.max(30, this.paletteViewport.height *
            (this.paletteViewport.height / Math.max(this.paletteViewport.height, count * 66)));
    }

    getPaletteThumbY() {
        const trackY = this.paletteViewport.top;
        const trackH = this.paletteViewport.height;
        const thumbH = this.getPaletteThumbHeight();
        return trackY + (trackH - thumbH) *
            (this.paletteScrollMax ? this.paletteScroll / this.paletteScrollMax : 0);
    }

    syncPaletteScrollNodes() {
        const thumb = this.getChildByName("palette_scroll_thumb");
        const y = this.getPaletteThumbY();
        const h = this.getPaletteThumbHeight();
        if (thumb) {
            thumb.pos = new Vector2(179, y);
            thumb.size = new Vector2(4, h);
        }
        if (this._paletteThumbButton) {
            this._paletteThumbButton.pos = new Vector2(177, y);
            this._paletteThumbButton.size = new Vector2(8, h);
        }
        const track = this.getChildByName("palette_scroll_track");
        if (track) track.visible = this.paletteScrollMax > 0;
        if (thumb) thumb.visible = this.paletteScrollMax > 0;
        if (this._paletteThumbButton) this._paletteThumbButton.visible = this.paletteScrollMax > 0;
    }

    syncPaletteNodes() {
        if (!this._uiBuilt) return;

        const declaredEntries = this.getDeclaredVariableEntries();
        const signature = JSON.stringify(declaredEntries);
        const declaredChanged = signature !== this._declaredPaletteSignature;
        if (declaredChanged) {
            this._declaredPaletteSignature = signature;
            this.palette.VARIABLES_DECLARADAS = declaredEntries;
        }

        if (!this._paletteBuilt) {
            for (const category of Object.keys(this.palette))
                this.buildPaletteCategoryNodes(category);
            this._paletteBuilt = true;
        } else if (declaredChanged) {
            this.buildPaletteCategoryNodes("VARIABLES_DECLARADAS");
        }

        const entries = this.palette[this.paletteCategory] || [];
        this.paletteScrollMax = Math.max(
            0,
            entries.length * 66 - this.paletteViewport.height
        );
        this.paletteScroll = Math.max(0, Math.min(this.paletteScroll, this.paletteScrollMax));

        for (const [category, groups] of Object.entries(this._paletteCardGroups)) {
            const categoryVisible = category === this.paletteCategory;
            for (const group of groups) {
                const y = this.paletteViewport.top +
                    (groups.indexOf(group) * 66) - this.paletteScroll;
                const delta = y - group.y;
                if (delta !== 0) {
                    for (const node of group.visual)
                        node.pos = new Vector2(node.pos.x, node.pos.y + delta);
                    group.hitButton.pos = new Vector2(12, y);
                    group.y = y;
                }
                const inViewport = y >= this.paletteViewport.top &&
                    y + 54 <= this.paletteViewport.top + this.paletteViewport.height;
                for (const node of group.visual) node.visible = categoryVisible && inViewport;
                group.hitButton.visible = categoryVisible && inViewport;
                group.hitButton.disabled = !inViewport || !!this.dragging;
            }
        }

        this.syncPaletteScrollNodes();
    }

    syncScrollNodes() {
        const thumbY = this.getThumbY();
        const thumbH = this.getThumbHeight();

        const thumb = this.getChildByName("scroll_thumb");
        const shine = this.getChildByName("scroll_thumb_shine");
        if (thumb) {
            thumb.pos = new Vector2(779, thumbY);
            thumb.size = new Vector2(12, thumbH);
        }
        if (shine) {
            shine.pos = new Vector2(781, thumbY + 2);
            shine.size = new Vector2(3, Math.max(2, thumbH - 4));
        }

        if (this._scrollbarThumbButton) {
            this._scrollbarThumbButton.pos = new Vector2(778, thumbY);
            this._scrollbarThumbButton.size = new Vector2(14, thumbH);
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
        if (this._uiBuilt) this.syncPaletteNodes();
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
        if (block.type === "ASSIGN") return `ASIGNAR   ${block.name} = ${block.value}`;
        if (block.type === "MODULE") return block.module;
        if (block.type === "PREDEFINED") return `${block.name}  : ${block.valueType}`;
        if (block.type === "OPERATOR") return block.operator === "AND" ? "Y  (AND)" : "O  (OR)";
        if (block.type === "IF") return `SI   [ ${block.condition} ]   ENTONCES`; 
        if (block.type === "ELSE") return "SINO";
        if (block.type === "WHILE") return `MIENTRAS   [ ${block.condition} ]`;
        return "BLOQUE";
    }

    countLines() { const source = this.generateSource(); return source ? source.split("\n").length : 0; }
    countVariables() { let count = 0; const visit = list => { for (const b of list || []) { if (b.type === "VAR") count++; visit(b.thenBlocks); visit(b.elseBlocks); visit(b.body); } }; visit(this.blocks); return count; }

    persistProgram() {
        const programCode = this.generateSource();
        try { localStorage.setItem("emji.rassembly.program", programCode); } catch (_) {}
        if (typeof BackendClient !== "undefined" && BackendClient.token()) {
            const loadout = typeof RobotLoadout !== "undefined" ? RobotLoadout.load() : {};
            BackendClient.saveProfile({
                robotName: loadout.name || this.robotName,
                loadout,
                programCode
            }).catch(error => console.warn("[EMJI] No se pudo sincronizar el programa:", error.message));
        }
    }

    exit() {
        this.persistProgram();
        super.exit();
    }
}

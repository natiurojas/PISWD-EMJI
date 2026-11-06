// Componentes visuales del editor. Todos forman parte del árbol de Nodes.
// Las vistas de bloques son persistentes: se crean una vez y luego se sincronizan
// con el modelo. El ID del bloque es su identidad estable.
class RAssemblyPanel extends Panel {
    constructor(name, x, y, w, h, color = "#162936") {
        super();
        this.name = name;
        this.pos = new Vector2(x, y);
        this.size = new Vector2(w, h);
        this.color = new Color(color);
    }
}

class RAssemblyLabel extends Label {
    constructor(name, text, x, y, size = 10, color = "#ffffff", width = null) {
        super();
        this.name = name;
        this.text = String(text ?? "");
        this.pos = new Vector2(x, y);
        this.loadFont("./Assets/Fonts/Minecraft.ttf", size);
        this.fontSize = size;
        this.color = new Color(color);
        this.maxWidth = width;
        this.alignX = LEFT;
        this.alignY = TOP;
        this.mustBeRerendered = true;
    }
}

class RAssemblyButton extends Button {
    constructor(name, text, x, y, w, h, color = "#3b5265") {
        super();
        this.name = name;
        this.pos = new Vector2(x, y);
        this.size = new Vector2(w, h);
        this.addChild(new RAssemblyPanel(`${name}_surface`, 0, 0, w, h, color));
        this.addChild(new RAssemblyPanel(`${name}_shine`, 2, 2, w - 4, 3, "#536c7e"));
        this.addChild(new RAssemblyLabel(`${name}_label`, text, 6, Math.max(4, (h - 12) / 2), 10, "#ffffff", w - 12));
    }
}

class RAssemblyBlockView extends Scene {
    constructor({ editor, block, x = 0, y = 0, w = 550, depth = 0 }) {
        super();
        this.name = `Block_${block.id}`;
        this.type = "UI";
        this.editor = editor;
        this.block = block;
        this.depth = depth;
        this.pos = new Vector2(x, y);
        this.size = new Vector2(w, editor.blockHeight(block));
        this.childViews = new Map();
        this.refs = {};
        this._built = false;
    }

    onStart() {
        if (this._built) return;
        this._built = true;
        const w = this.size.x;
        const control = this.isControlBlock();
        const colors = this.getColors();

        this.refs.background = new Panel();
        this.refs.background.name = "background";
        this.addChild(this.refs.background);

        this.refs.header = new RAssemblyPanel("header", 5, 5, w - 10, 24, colors.header);
        this.addChild(this.refs.header);

        this.refs.text = new RAssemblyLabel("block_text", "", 12, 10, 10, "#fff9e1", w - 120);
        this.addChild(this.refs.text);

        this.refs.edit = new RAssemblyButton("edit", "EDITAR", w - 88, 7, 56, 19, colors.main);
        this.refs.edit.onReleased = () => this.editor.editBlock(this.block);
        this.addChild(this.refs.edit);

        this.refs.delete = new RAssemblyButton("delete", "×", w - 26, 7, 19, 19, "#a74355");
        this.refs.delete.onReleased = () => this.editor.deleteBlock(this.block);
        this.addChild(this.refs.delete);

        this.refs.inner = new RAssemblyPanel("inner", 12, 33, w - 24, 24, colors.inner);
        this.addChild(this.refs.inner);
        this.refs.innerHeader = new RAssemblyPanel("inner_header", 16, 36, w - 32, 18, colors.header);
        this.addChild(this.refs.innerHeader);
        this.refs.innerLabel = new RAssemblyLabel("inner_label", "", 22, 41, 8, "#ffffff");
        this.addChild(this.refs.innerLabel);
        this.refs.empty = new RAssemblyLabel("empty", "Suelta aquí otros bloques", 24, 65, 8, "#e1edf5");
        this.addChild(this.refs.empty);

        this.sync(this.pos.x, this.pos.y, this.size.x, this.depth);
    }

    isControlBlock() {
        return this.block.type === "IF" || this.block.type === "WHILE";
    }

    getColors() {
        const palette = [
            { main: "#27c9b5", header: "#162936", inner: "#102b38" },
            { main: "#b58aff", header: "#302344", inner: "#241a35" },
            { main: "#ffbd69", header: "#392b1c", inner: "#2b2118" },
            { main: "#ff7d91", header: "#3b2029", inner: "#2d1921" },
            { main: "#65baff", header: "#192d40", inner: "#122335" }
        ];
        return palette[this.depth % palette.length];
    }

    sync(x, y, w, depth = this.depth) {
        this.block = this.block;
        this.depth = depth;
        this.pos = new Vector2(x, y);
        this.size = new Vector2(w, this.editor.blockHeight(this.block));
        if (!this._built) return;

        const control = this.isControlBlock();
        const colors = this.getColors();
        const h = this.size.y;
        const block = this.block;

        this.refs.background.size = this.size.clone();
        this.refs.background.color = new Color(control ? colors.main : "#3b5265");
        this.refs.header.size = new Vector2(w - 10, 24);
        this.refs.header.color = new Color(colors.header);
        this.refs.text.setText(this.editor.blockText(block));
        this.refs.text.maxWidth = w - 120;
        this.refs.text.color = new Color(
            block.type === "VAR" ? "#bdffd6" :
            block.type === "MODULE" ? "#bffcf0" : "#fff9e1"
        );

        const mainLoop = this.editor.isMainLoop(block);
        const editable = !mainLoop && block.type !== "MODULE" && block.type !== "PREDEFINED" && block.type !== "OPERATOR";
        this.refs.edit.visible = editable;
        this.refs.delete.visible = !mainLoop;
        this.refs.edit.pos = new Vector2(w - 88, 7);
        this.refs.delete.pos = new Vector2(w - 26, 7);
        if (mainLoop) {
            this.refs.text.maxWidth = w - 190;
        }

        this.refs.inner.visible = control;
        this.refs.innerHeader.visible = control;
        this.refs.innerLabel.visible = control;
        this.refs.empty.visible = control;
        if (control) {
            this.refs.inner.size = new Vector2(w - 24, h - 39);
            this.refs.inner.color = new Color(colors.inner);
            this.refs.innerHeader.size = new Vector2(w - 32, 18);
            this.refs.innerHeader.color = new Color(colors.header);
            this.refs.innerLabel.setText(block.type === "IF" ? "ENTONCES ↓" : "HACER ↓");
        }

        this.syncChildren();
    }

    syncChildren() {
        if (!this._built || !this.isControlBlock()) {
            for (const view of this.childViews.values()) this.removeChild(view);
            this.childViews.clear();
            return;
        }

        const list = this.block.type === "IF" ? (this.block.thenBlocks || []) : (this.block.body || []);
        const activeIds = new Set(list.map(child => child.id));
        for (const [id, view] of this.childViews) {
            if (!activeIds.has(id)) {
                if (view.parent === this) this.removeChild(view);
                this.childViews.delete(id);
            }
        }

        this.refs.empty.visible = list.length === 0;
        let childY = 58;
        for (const child of list) {
            let view = this.editor.blockViews.get(child.id);
            if (!view) {
                view = Scene.instantiate(RAssemblyBlockView, {
                    editor: this.editor, block: child,
                    x: 20, y: childY, w: this.size.x - 40,
                    depth: this.depth + 1
                });
                this.editor.blockViews.set(child.id, view);
            }
            if (view.parent !== this) this.addChild(view);
            this.childViews.set(child.id, view);
            view.block = child;
            view.sync(20, childY, this.size.x - 40, this.depth + 1);
            childY += this.editor.blockHeight(child) + 6;
        }
    }
}

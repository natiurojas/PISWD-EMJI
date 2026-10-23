// Componentes visuales del editor. Todos forman parte del árbol de Nodes.
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
    constructor({editor, block, x, y, w, depth = 0}) {
        super();
        this.name = `Block_${block.id}`;
        this.type = "UI";

        this.editor = editor;
        this.block = block;
        this.depth = depth;

        this.pos = new Vector2(x, y);
        this.size = new Vector2(w, editor.blockHeight(block));

        // Cada nivel tiene su propio color.
        // Los colores se seleccionan de una paleta, no se oscurecen.
        this.depthColors = [
            { main: "#27c9b5", header: "#162936", inner: "#102b38" },
            { main: "#b58aff", header: "#302344", inner: "#241a35" },
            { main: "#ffbd69", header: "#392b1c", inner: "#2b2118" },
            { main: "#ff7d91", header: "#3b2029", inner: "#2d1921" },
            { main: "#65baff", header: "#192d40", inner: "#122335" }
        ];

        this.colors = this.depthColors[depth % this.depthColors.length];
    }

    onStart() {
        const editor = this.editor;
        const block = this.block;
        const w = this.size.x;

        const colors = this.colors;

        const isControlBlock =
            block.type === "IF" ||
            block.type === "WHILE";

        // Fondo del bloque.
        const background = new Panel();
        background.name = "background";
        background.pos = new Vector2(0, 0);
        background.size = this.size.clone();
        background.color = new Color(
            isControlBlock ? this.colors.main : "#3b5265"
        );
        this.addChild(background);

        // Cabecera principal.
        const header = new RAssemblyPanel(
            "header",
            5, 5, w - 10, 24,
            colors.header
        );
        this.addChild(header);

        // Color del texto.
        let textColor = "#fff9e1";

        if (block.type === "VAR")
            textColor = "#bdffd6";
        else if (block.type === "WHILE")
            textColor = "#ffffff";
        else if (block.type === "IF")
            textColor = "#ffffff";
        else if (block.type === "MODULE")
            textColor = "#bffcf0";

        const blockText = new RAssemblyLabel(
            "block_text",
            editor.blockText(block),
            12, 10, 10,
            textColor,
            w - 120
        );
        this.addChild(blockText);

        // Botón para editar.
        const editButton = new RAssemblyButton(
            "edit",
            "EDITAR",
            w - 88, 7, 56, 19,
            colors.main
        );
        editButton.onReleased = () => {
            editor.editBlock(this.block);
        };
        this.addChild(editButton);

        // Botón para eliminar.
        const deleteButton = new RAssemblyButton(
            "delete",
            "×",
            w - 26, 7, 19, 19,
            "#a74355"
        );
        deleteButton.onReleased = () => {
            console.log("XD");
            editor.deleteBlock(this.block);
        };
        this.addChild(deleteButton);

        // Los bloques de control contienen otros bloques.
        if (isControlBlock) {
            const list = block.type === "IF"
                ? block.thenBlocks || []
                : block.body || [];

            // Área donde se alojan los bloques hijos.
            const inner = new RAssemblyPanel(
                "inner",
                12, 33, w - 24, this.size.y - 39,
                colors.inner
            );
            this.addChild(inner);

            const innerHeader = new RAssemblyPanel(
                "inner_header",
                16, 36, w - 32, 18,
                colors.header
            );
            this.addChild(innerHeader);

            const innerLabel = new RAssemblyLabel(
                "inner_label",
                block.type === "IF"
                    ? "ENTONCES ↓"
                    : "HACER ↓",
                22, 41, 8,
                "#ffffff"
            );
            this.addChild(innerLabel);

            if (list.length === 0) {
                const emptyLabel = new RAssemblyLabel(
                    "empty",
                    "Suelta aquí otros bloques",
                    24, 65, 8,
                    "#e1edf5"
                );
                this.addChild(emptyLabel);
            }

            let childY = 58;

            for (const child of list) {
                const childView = Scene.instantiate(RAssemblyBlockView, {
                    editor,
                    block: child,
                    x: 20,
                    y: childY,
                    w: w - 40,
                    depth: this.depth + 1
                });

                this.addChild(childView);

                childY += editor.blockHeight(child) + 6;
            }
        }
    }

}

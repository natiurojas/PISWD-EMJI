// Campo de texto propio del motor. Se dibuja como un nodo y no bloquea el juego.
class TextField extends Node {
    constructor(value = "", options = {}) {
        super();
        this.name = "TextField";
        this.value = String(value);
        this.placeholder = options.placeholder || "Escribí aquí…";
        this.label = options.label || "EDITAR VALOR";
        this.maxLength = options.maxLength || 48;
        this.active = false;
        this.onSubmit = null;
        this.onCancel = null;
        this.pos = new Vector2(options.x ?? 250, options.y ?? 220);
        this.size = new Vector2(options.width ?? 300, options.height ?? 96);
    }
    open(value = this.value, label = this.label, onSubmit = null) {
        this.value = String(value);
        this.label = label;
        this.onSubmit = onSubmit;
        this.active = true;
    }
    close() { this.active = false; }
    inputCharacter(character) {
        if (!this.active || !character || character.length !== 1) return;
        if (character >= " " && character !== "\u007f" && this.value.length < this.maxLength)
            this.value += character;
    }
    keyPressed(code, key) {
        if (!this.active) return false;
        if (code === 8) { this.value = this.value.slice(0, -1); return true; }
        if (code === 13) { const submit = this.onSubmit; const value = this.value; this.close(); if (submit) submit(value); return true; }
        if (code === 27) { const cancel = this.onCancel; this.close(); if (cancel) cancel(); return true; }
        return false;
    }
    draw() {
        if (!this.active) return;
        const x = this.pos.x, y = this.pos.y, w = this.size.x, h = this.size.y;
        noStroke(); fill("#051824"); rect(x + 4, y + 4, w, h);
        fill("#162936"); rect(x, y, w, h);
        fill("#27c9b5"); rect(x, y, w, 5);
        fill("#3b5265"); rect(x + 12, y + 28, w - 24, 30);
        noFill(); stroke("#27c9b5"); strokeWeight(2); rect(x + 12, y + 28, w - 24, 30); noStroke();
        fill("#27c9b5"); textAlign(LEFT, CENTER); textSize(10); text(this.label, x + 12, y + 17);
        fill("#ffffff"); textSize(12); text(this.value || this.placeholder, x + 20, y + 43);
        fill("#9ab5c3"); textSize(9); text("ENTER: guardar    ESC: cancelar", x + 12, y + h - 13);
    }
}

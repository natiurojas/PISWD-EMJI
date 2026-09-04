class Label extends Node {

    constructor() {
        super();

        this.name = "Label";

        this.text = "Label";

        this.fontPath = null;
        this.fontSize = 0;

        this.font = null;

        this.mustBeRerendered = true;
    }


    // =========================================================
    // FONT
    // =========================================================

    loadFont(fontPath, fontSize) {

        this.fontPath = fontPath;
        this.fontSize = fontSize;

        this.font = loadFont(fontPath);

        this.mustBeRerendered = true;

        this.updateSize();
    }


    setFontSize(size) {

        if(this.font === null) {
            console.warn(
                "Label.setFontSize(): no font has been loaded."
            );

            return;
        }

        this.fontSize = size;

        this.mustBeRerendered = true;

        this.updateSize();
    }


    getFontSize() {
        return this.fontSize;
    }

    setText(text) {
        this.text = text;
        this.mustBeRerendered = true;
        this.updateSize();
    }


    getText() {
        return this.text;
    }

    updateSize() {
        push();
        if(this.font !== null)
            textFont(this.font);
            
        textSize(this.fontSize);

        this.size = new Vector2(
            textWidth(this.text),
            this.fontSize
        );

        pop();

        this.mustBeRerendered = false;
    }


    getSize() {

        if(this.mustBeRerendered)
            this.updateSize();

        return this.size;
    }
    
    draw() {

        if(this.mustBeRerendered)
            this.updateSize();

        push();

        if(this.font !== null)
            textFont(this.font);
        textSize(this.fontSize);

        textAlign(LEFT, TOP);

        fill(this.globalColor.r, this.globalColor.g, this.globalColor.b, this.globalColor.a);
        noStroke();
        text(this.text, 0, 0);
        pop();
    }
}

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
    
    loadFont(fontPath, fontSize) {

        this.fontPath = fontPath;
        this.fontSize = fontSize;

        this.font = AssetManager.getFont(fontPath);
        if (this.font === null) {
            AssetManager.loadFont(fontPath)
            .then(font => {
                this.font = font;
                this.mustBeRerendered = true;
                this.updateSize();
            })
            .catch(error => console.error("Label.loadFont():", error));
        }

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
        if (this.font !== null) textFont(this.font);
        textSize(this.fontSize || 12);
        this.size = new Vector2(textWidth(String(this.text ?? "")), this.fontSize || 12);
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

        if (!this.visible) return;
        push();
        translate(this.globalPos.x, this.globalPos.y);
        rotate(radians(this.globalRotation));
        scale(this.globalScale.x, this.globalScale.y);
        if(this.font !== null)
            textFont(this.font);
        textSize(this.fontSize || 12);
        textAlign(this.alignX ?? LEFT, this.alignY ?? TOP);
        fill(this.globalColor.r, this.globalColor.g, this.globalColor.b, this.globalColor.a);
        noStroke();
        text(this.text, 0, 0, this.maxWidth ?? undefined);
        pop();
    }
}

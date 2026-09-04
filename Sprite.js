class Sprite extends Node {
    static STRETCH = 0;
    static ZOOM = 1;
    static CUT = 2;
    constructor() {
        super();
        this._img = null;
        this.path = "";
        this.sizeMode = Sprite.STRETCH;
        this._imgSize = new Vector2(0, 0);
        // El tamaño del Node inicialmente es el tamaño original de la imgn.
        this.size = new Vector2(0, 0);
        this.tick = null;
    }

    set img(image) {
        this._img = image;
        this._imgSize = new Vector2(image.width, image.height);
        this.size = new Vector2(image.width, image.height);
    }

    get imgBuffer() {
        return this._img;
    }

    draw() {
        if(!this.visible || this._img === null) {
            return;
        }
        const img = this._img;
        if(img === null)
            return;
        const finalWidth = this.size.x * this.globalScale.x;
        const finalHeight = this.size.y * this.globalScale.y;
        
        const imgWidth = this._imgSize.x * this.globalScale.x;
        const imgHeight = this._imgSize.y * this.globalScale.y;

        push();

        // Posicion global
        translate(this.globalPos.x + finalWidth / 2, this.globalPos.y + finalHeight / 2);
        // Rotacion
        rotate(radians(this.globalRotation));
        // Flip horizontal
        if(this.flip)
            scale(-1, 1);
        // Color global
        tint(
            this.globalColor.r,
            this.globalColor.g,
            this.globalColor.b,
            this.globalColor.a
        );
        imageMode(CENTER);
        switch(this.sizeMode)
        {
            case Sprite.STRETCH:
                this._drawStretch(
                    img,
                    finalWidth,
                    finalHeight
                );
                break;
            case Sprite.ZOOM:
                this._drawZoom(
                    img,
                    finalWidth,
                    finalHeight,
                    imgWidth,
                    imgHeight
                );
                break;
            case Sprite.CUT:
                this._drawCut(
                    img,
                    finalWidth,
                    finalHeight
                );
                break;
        }
        noTint();
        pop();
    }

    _drawStretch(img, width, height)
    {
        imageMode(CENTER);
        image(img, 0, 0, width, height);
    }

    _drawZoom(img, width, height, imgWidth, imgHeight)
    {
        const scaleX = width / imgWidth;
        const scaleY = height / imgHeight;
        // usamos la escala más pequeña.
        const scale = Math.min(
            scaleX,
            scaleY
        );
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        image(img, 0, 0, scaledWidth, scaledHeight);
    }

    _drawCut(img, width, height) {

        /*
         * Si la imgn entra completamente,
         * la dibujamos con su tamaño original.
         */
        if(width >= this._imgSize.x && height >= this._imgSize.y)
        {
            image(img, 0, 0, this._imgSize.x, this._imgSize.y);
            return;
        }
        /*
         * Si el tamaño es menor, recortamos
         * la imgn.
         */
        const sourceWidth = Math.min(this._imgSize.x, width);
        const sourceHeight = Math.min(this._imgSize.y, height);
        image(img, 0, 0, width, height, 0, 0, sourceWidth, sourceHeight);
    }
}

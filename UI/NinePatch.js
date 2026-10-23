class NinePatch extends Node {

    constructor(image) {
        super();

        this.name = "NinePatch";

        this._img = null;
        this._imgSize = new Vector2(0, 0);

        // Tamaño del borde en pixeles de la textura original.
        this.borderLeft = 8;
        this.borderTop = 8;
        this.borderRight = 8;
        this.borderBottom = 8;

        // Tamaño por defecto: tamaño de la imagen.
        this.size = new Vector2(
            image.width,
            image.height
        );
    }

    set img(image) {
        this._img = image;
        this._imgSize = new Vector2(image.width, image.height);
        this.size = new Vector2(image.width, image.height);
    }

    get img() {
        return this._img
    }


    draw() {
        if(!this.visible || this._img === null)
            return;

        push();

        translate(this.globalPos.x, this.globalPos.y);
        rotate(this.globalRotation * Math.PI / 180);

        scale(this.globalScale.x, this.globalScale.y);

        tint(
            this.globalColor.r,
            this.globalColor.g,
            this.globalColor.b,
            this.globalColor.a
        );
    
        const textureWidth = this._img.width;
        const textureHeight = this._img.height;


        const width = this.size.x;
        const height = this.size.y;

        // Bordes de la textura o sprite
        const left = this.borderLeft;
        const top = this.borderTop;

        const right = textureWidth - this.borderRight;
        const bottom = textureHeight - this.borderBottom;


        /*
         * Tamaño de la parte central.
         *
         * Si el NinePatch es mas pequeño que la suma
         * de sus bordes, evitamos dimensiones negativas.
         */
        const centerWidth = Math.max(0, width - this.borderLeft - this.borderRight);
        const centerHeight = Math.max(0, height - this.borderTop - this.borderBottom);

        // Esquina superior izquierda
        image(this._img, 0, 0, this.borderLeft, this.borderTop, 0, 0, this.borderLeft, this.borderTop);
        // Borde superior
        image(this._img, this.borderLeft, 0, centerWidth, this.borderTop, left, 0, right - left, this.borderTop);
        // Esquina superior derecha
        image(this._img, width - this.borderRight, 0, this.borderRight, this.borderTop, right, 0, this.borderRight, this.borderTop);
        // Borde izquierdo
        image(this._img, 0, this.borderTop, this.borderLeft, centerHeight, 0, top, this.borderLeft, bottom - top);
        // Centro
        image(this._img, this.borderLeft,this.borderTop, centerWidth, centerHeight, left, top, right - left, bottom - top);
        // Borde derecho
        image(this._img, width - this.borderRight, this.borderTop, this.borderRight, centerHeight,right, top, this.borderRight, bottom - top);
        // Esquina inferior izquierda
        image(this._img, 0, height - this.borderBottom, this.borderLeft, this.borderBottom, 0, bottom, this.borderLeft, this.borderBottom);
        // Borde inferior
        image(this._img, this.borderLeft, height - this.borderBottom, centerWidth, this.borderBottom, left, bottom, right - left, this.borderBottom);
        // Esquina inferior derecha
        image(this._img, width - this.borderRight, height - this.borderBottom, this.borderRight, this.borderBottom, right, bottom, this.borderRight, this.borderBottom);
        
        noTint();

        pop();
    }
}
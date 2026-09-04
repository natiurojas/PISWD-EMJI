class Panel extends Node {
    constructor()
    {
        super();
        this.name = "Panel";

        // Color del borde.
        this.borderColor = new Color(
            255,
            255,
            255,
            255
        );

        // Tamaño del borde.
        this.borderSize = 0;
    }
    
    draw()
    {
        const width = this.size.x * this.globalScale.x;
        const height = this.size.y * this.globalScale.y;
        push();
        // Aplicamos la transformación global.
        translate(this.globalPosX, this.globalPosY);
        rotate(radians(this.globalRotation));
        noStroke();
        fill(this.globalColor.r, this.globalColor.g, this.globalColor.b, this.globalColor.a);
        rect(0, 0, width, height);
        if(this.borderSize > 0)
        {
            noFill();

            stroke(
                this.borderColor.r,
                this.borderColor.g,
                this.borderColor.b,
                this.borderColor.a
            );

            strokeWeight(this.borderSize);

            rect(
                0,
                0,
                width,
                height
            );
        }

        pop();
    }

}

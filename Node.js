class Node {

    constructor() {
        this.name = "Node";

        // Valores internos
        this._pos = new Vector2(0, 0);
        this._scale = new Vector2(1, 1);
        this._rotation = 0;
        this._color = new Color(255, 255, 255, 255);

        // Transformación global
        this._globalPos = new Vector2(0, 0);
        this._globalScale = new Vector2(1, 1);
        this._globalRotation = 0;

        this.size = new Vector2(0, 0);

        // Color resultante
        this.globalColor = new Color(255, 255, 255, 255);

        this.visible = true;
        this.flip = false;

        // Jerarquía
        this.parent = null;
        this.children = [];
        this.childCount = 0;
    }

    // Funcion para actualizar su posicion respecto 
    updateTransform() {
        if (this.parent !== null) {
            const parent = this.parent;

            const scaled = new Vector2(
                this._pos.x * parent._globalScale.x,
                this._pos.y * parent._globalScale.y
            );

            const angle =
                parent._globalRotation * Math.PI / 180;

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const rotated = new Vector2(cos * scaled.x - sin * scaled.y, sin * scaled.x + cos * scaled.y);
            this._globalPos = Vector2.add(parent._globalPos,rotated);

            this._globalScale = new Vector2(this._scale.x * parent._globalScale.x, this._scale.y * parent._globalScale.y);

            this._globalRotation =
                parent._globalRotation + this._rotation;
        }
        else {
            this._globalPos = this._pos.clone();
            this._globalScale = this._scale.clone();
            this._globalRotation = this._rotation;
        }
        for (const child of this.children) {
            child.updateTransform();
        }
    }


    updateGlobalColor() {
        if (this.parent !== null) {
            const parent = this.parent;

            this.globalColor = new Color(
                (this._color.r * parent.globalColor.r) / 255,
                (this._color.g * parent.globalColor.g) / 255,
                (this._color.b * parent.globalColor.b) / 255,
                (this._color.a * parent.globalColor.a) / 255
            );
        }
        else {
            this.globalColor = this._color.clone();
        }

        for(const child of this.children) {
            child.updateGlobalColor();
        }
    }


    get pos() {
        return this._pos;
    }

    set pos(value) {
        this._pos = new Vector2(value.x, value.y);
        this.updateTransform();
    }


    get posX() {
        return this._pos.x;
    }

    set posX(value) {
        this._pos.x = value;
        this.updateTransform();
    }


    get posY() {
        return this._pos.y;
    }

    set posY(value) {
        this._pos.y = value;

        this.updateTransform();
    }

    get globalPos() {
        return this._globalPos;
    }

    set globalPos(value) {
        if (this.parent !== null) {
            this._pos = Vector2.sub(
                value,
                this.parent._globalPos
            );
        }
        else {
            this._pos = new Vector2(
                value.x,
                value.y
            );
        }

        this.updateTransform();
    }


    get globalPosX() {
        return this._globalPos.x;
    }

    set globalPosX(value) {
        this._globalPos = new Vector2(value, this._globalPos.y);
    }

    get globalPosY() {
        return this._globalPos.y;
    }

    set globalPosY(value) {
        this.globalPos = new Vector2(
            this._globalPos.x,
            value
        );
    }

    get scale() {
        return this._scale;
    }

    set scale(value) {
        this._scale = new Vector2(
            value.x,
            value.y
        );

        this.updateTransform();
    }


    get scaleX() {
        return this._scale.x;
    }

    set scaleX(value) {
        this._scale.x = value;

        this.updateTransform();
    }


    get scaleY() {
        return this._scale.y;
    }

    set scaleY(value) {
        this._scale.y = value;

        this.updateTransform();
    }

    get globalScale() {
        return this._globalScale;
    }

    set globalScale(value) {
        if (this.parent !== null) {
            this._scale = new Vector2(
                value.x / this.parent._globalScale.x,
                value.y / this.parent._globalScale.y
            );
        }
        else {
            this._scale = new Vector2(
                value.x,
                value.y
            );
        }

        this.updateTransform();
    }


    get globalScaleX() {
        return this._globalScale.x;
    }

    set globalScaleX(value) {
        this.globalScale = new Vector2(
            value,
            this._globalScale.y
        );
    }


    get globalScaleY() {
        return this._globalScale.y;
    }

    set globalScaleY(value) {
        this.globalScale = new Vector2(
            this._globalScale.x,
            value
        );
    }

    get rotation() {
        return this._rotation;
    }

    set rotation(value) {
        this._rotation = value;

        this.updateTransform();
    }

    get globalRotation() {
        return this._globalRotation;
    }

    set globalRotation(value) {
        if (this.parent !== null) {
            this._rotation =
                value - this.parent._globalRotation;
        }
        else {
            this._rotation = value;
        }

        this.updateTransform();
    }

    get size() {
        return this._size;
    }

    set size(value) {
        this._size = new Vector2(
            value.x,
            value.y
        );
    }


    get sizeX() {
        return this._size.x;
    }

    set sizeX(value) {
        this._size.x = value;
    }


    get sizeY() {
        return this._size.y;
    }

    set sizeY(value) {
        this._size.y = value;
    }

    get color() {
        return this._color;
    }

    set color(value) {
        this._color = new Color(
            value.r,
            value.g,
            value.b,
            value.a
        );

        this.updateGlobalColor();
    }

    set colorA(value) {
        this._color.a = value;

        this.updateGlobalColor();
    }

    callTick(deltaTime) {
        if (typeof this.tick === "function")
            this.tick(deltaTime);
    }

    addChild(child) {
        if (!(child instanceof Node))
            throw new TypeError(
                "Node.addChild(): child must be a Node."
            );

        if (child === this)
            throw new Error(
                "Error: A Node cannot add itself as a child."
            );

        if (this.isAncestorOf(child))
            throw new Error(
                `Error: the node '${this.name}' is ancestor of: '${child.name}'.`
            );

        if (child.parent !== null)
            child.parent.removeChild(child);

        this.children.push(child);
        child.parent = this;

        this.childCount = this.children.length;

        child.updateTransform();
        child.updateGlobalColor();
    }


    getChild(indexOrName) {
        if (typeof indexOrName === "string")
            return this.getChildByName(indexOrName);

        if (typeof indexOrName === "number")
            return this.getChildByIndex(indexOrName);

        throw new TypeError(
            "Node.getChild(): expected string or number."
        );
    }


    getChildByName(name) {
        for (const child of this.children) {
            if (child.name === name)
                return child;
        }

        return null;
    }


    getChildByIndex(index) {
        if (index < 0 || index >= this.children.length)
            return null;

        return this.children[index];
    }


    getChildren() {
        return [...this.children];
    }


    removeChildByName(name) {
        const index = this.children.findIndex(
            child => child.name === name
        );

        if (index === -1)
            return;

        this.removeChildByIndex(index);
    }


    removeChildByIndex(index) {
        if (index < 0 || index >= this.children.length)
            return;

        const child = this.children[index];

        this.children.splice(index, 1);

        child.parent = null;

        this.childCount = this.children.length;

        child.updateTransform();
        child.updateGlobalColor();
    }


    removeChildByPtr(child) {
        const index = this.children.indexOf(child);

        if (index === -1)
            return;

        this.removeChildByIndex(index);
    }


    removeChild(childOrIndexOrName) {
        if (typeof childOrIndexOrName === "string") {
            this.removeChildByName(childOrIndexOrName);
        }
        else if (typeof childOrIndexOrName === "number") {
            this.removeChildByIndex(childOrIndexOrName);
        }
        else if (childOrIndexOrName instanceof Node) {
            this.removeChildByPtr(childOrIndexOrName);
        }
        else {
            throw new TypeError(
                "Node.removeChild(): expected string, number or Node."
            );
        }
    }


    isAncestorOf(child) {
        let current = child;

        while (current !== null) {
            if (current === this)
                return true;

            current = current.parent;
        }

        return false;
    }


    isInsideTree() {
        if (this.parent === null)
            return false;

        let root = this.parent;

        while (root.parent !== null) {
            root = root.parent;
        }

        return root === Node.root;
    }
}
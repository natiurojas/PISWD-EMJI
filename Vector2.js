class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    static add(a, b) {
        return new Vector2(
            a.x + b.x,
            a.y + b.y
        );
    }

    static sub(a, b) {
        return new Vector2(
            a.x - b.x,
            a.y - b.y
        );
    }
}

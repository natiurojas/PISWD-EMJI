class Mouse {
    static instance;

    constructor() {
        Mouse.instance = this;

        this.x = 0;
        this.y = 0;

        this.isLeftClickPressed = false;
        this.isRightClickPressed = false;

        this.isLeftClickReleased = false;
        this.isRightClickReleased = false;
    }

    update() {
        this.x = mouseX;
        this.y = mouseY;

        // Los eventos duran solamente un frame.
        this.isLeftClickReleased = false;
        this.isRightClickReleased = false;
    }

    pressed(button) {
        if (button === LEFT) {
            this.isLeftClickPressed = true;
        }
        else if (button === RIGHT) {
            this.isRightClickPressed = true;
        }
    }

    released(button) {
        if (button === LEFT) {
            this.isLeftClickPressed = false;
            this.isLeftClickReleased = true;
        }
        else if (button === RIGHT) {
            this.isRightClickPressed = false;
            this.isRightClickReleased = true;
        }
    }
}

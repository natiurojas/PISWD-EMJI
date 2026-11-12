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
        console.log("Mouse update: " + mouseX + ", " + mouseY);
        console.log("this.x = " + this.x + ", this.y = " + this.y)
        this.x = mouseX * (game.newWidth / game.width);
        this.y = mouseY * (game.newHeight / game.height);

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

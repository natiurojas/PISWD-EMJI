class KeyManager {
    static instance;

    constructor() {
        KeyManager.instance = this;

        this.keyCode = -10;

        this.isDown = false;
        this.isUp = false;

        this.keyDownListeners = [];
        this.keyUpListeners = [];
    }

    update() {
        // Los eventos son momentáneos.
        this.isDown = false;
        this.isUp = false;
        this.keyCode = -10;
    }

    keyDown(keyCode) {
        this.keyCode = keyCode;
        this.isDown = true;
        this.isUp = false;

        for (const listener of this.keyDownListeners) {
            listener(keyCode);
        }
    }

    keyUp(keyCode) {
        this.keyCode = keyCode;
        this.isDown = false;
        this.isUp = true;

        for (const listener of this.keyUpListeners) {
            listener(keyCode);
        }
    }

    isKeyPressed(keyCode) {
        return this.keyCode === keyCode && this.isDown;
    }

    isKeyReleased(keyCode) {
        return this.keyCode === keyCode && this.isUp;
    }

    addEventListener(listener, mode) {
        if (typeof listener !== "function") {
            throw new TypeError("listener must be a function");
        }

        if (mode === "DOWN") {
            this.keyDownListeners.push(listener);
        }
        else if (mode === "UP") {
            this.keyUpListeners.push(listener);
        }
        else {
            throw new Error(
                `the parameter 'mode' can only be 'UP' or 'DOWN' but was received: ${mode}`
            );
        }
    }

    removeEventListener(listener, mode) {
        const listeners =
            mode === "DOWN"
                ? this.keyDownListeners
                : mode === "UP"
                    ? this.keyUpListeners
                    : null;

        if (listeners === null) {
            throw new Error(
                `the parameter 'mode' can only be 'UP' or 'DOWN' but was received: ${mode}`
            );
        }

        const index = listeners.indexOf(listener);

        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
}

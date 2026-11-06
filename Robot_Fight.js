let game;

function setup() {
    game = new Game();
    game.init();
    createCanvas(game.width, game.height);

    // Cargamos la escena del Login.
    Scene.change(new LoginScene());
}

function draw() {
    game.loop();
}

function keyPressed() {
    if (Scene.current && typeof Scene.current.handleTextFieldKey === "function" && Scene.current.handleTextFieldKey(keyCode, key)) return false;
    game.keyManager.keyDown(keyCode);
} 

function keyTyped() {
    if (Scene.current && typeof Scene.current.handleTextFieldCharacter === "function") {
        Scene.current.handleTextFieldCharacter(key);
        return false;
    }
}

function keyReleased() {
    game.keyManager.keyUp(keyCode);
}

function mousePressed() {
    game.mouse.pressed(mouseButton);
}

function mouseReleased() {
    game.mouse.released(mouseButton);
}

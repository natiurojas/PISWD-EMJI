let game;

function setup() {
    game = new Game();
    game.init();
    createCanvas(game.width, game.height);

    // Cargamos la escena del MainMenu.
    Scene.change(new MainMenu());
}

function draw() {
    game.loop();
}

function keyPressed() {
    game.keyManager.keyDown(keyCode);
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

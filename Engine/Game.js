class Game {
  static instance = null;
  constructor() {
    Game.instance = this; // Para singleton
    this.dt = 0.0;
    // Creamos el nodo raiz
    this.root = new Node()
    this.root.name = "_root";
    this.mouse = new Mouse();
    this.keyManager = new KeyManager();
    this.width = 800;
    this.height = 600;
  }
  init()
  {
    // Creamos los nodos raices para la UI y el World
    let _rootUI = new Node();
    let _rootWorld = new Node();
    _rootUI.name = "_rootUI";
    _rootWorld.name = "_rootWorld";
    this.root.UI = _rootUI;
    this.root.World = _rootWorld;
    this.root.addChild(_rootWorld);
    this.root.addChild(_rootUI);
  }
  loop()
  {
    this.dt = deltaTime / 1000; // Lo pasamos a segundos
    this.update();
    this.draw();
  }
  update()
  {
    this.callTick(this.root);
    Animation.process(this.dt)
  }
  draw()
  {
    background(220); // Limpia la pantalla con un color gris claro
    this.callDraw(this.root);
  }
  callTick(node) {
    if(typeof node.tick === "function")
        node.tick(this.dt);
    for(const child of node.children) {
      this.callTick(child);
    }
  }
  callDraw(node) {
    if(typeof node.draw === "function" && node.visible)
    {
        node.draw();
    }
    for(const child of node.children) {
      this.callDraw(child);
    }
  }
}

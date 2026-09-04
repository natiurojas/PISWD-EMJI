class Scene extends Node {
    static current = null;
    constructor() {
        super();

        this.name = "Scene";

        // La escena comienza automáticamente en el árbol.
        this.started = false;
        this.type = "Scene";
    }

    start() {
        if (this.started)
            return;

        this.started = true;

        // Hook para que las clases derivadas puedan
        // inicializar sus objetos.
        if (typeof this.onStart === "function")
            this.onStart();
    }

    enter() {
        Scene.current = this;

        this.started = false;

        this.updateTransform();
        this.updateGlobalColor();

        this.start();
    }

    exit() {
        if (Scene.current === this)
            Scene.current = null;
        this.parent.removeChild(this);
        this.started = false;
    }

    // Funcion virtual utilizada para precargar recursos antes de que la escena comience
    preload() {
        return [];
    }

    static async change(scene) {
        if (!(scene instanceof Scene))
            throw new TypeError(
                "Scene.change(): scene must be a Scene."
            );
        if (Scene.current !== null)
            Scene.current.exit();

        const resources = scene.preload();
        if (resources.length > 0) {
            // Mostramos LoadingScene para precargar los recursos
            const loadingScene = new LoadingScene();
            Game.instance.root.UI.addChild(loadingScene);
            loadingScene.enter();

            // Cargamos los recursos de la escena
            await AssetManager.preload(resources);
            loadingScene.exit();

            Scene._addScene(scene);
        }
        else
            Scene._addScene(scene);
    }

    static _addScene(scene) {
        if (scene.type === "UI")
            Game.instance.root.UI.addChild(scene);
        else if (scene.type === "World")
            Game.instance.root.World.addChild(scene);
        else
            Game.instance.root.addChild(scene);
        scene.enter();
    }

    free() {
        if (Scene.current === this)
            Scene.current = null;

        this.started = false;

        super.free();
    }
}


// Escena actualmente activa.
Scene.current = null;

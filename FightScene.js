class FightScene extends Scene {

    constructor() {
        super();
        this.type = "World";
        this.name = "FightScene";
    }
    preload() {
        return [
            "./Sprites/arena.jpeg",
            "./Sprites/Nave00.png"
        ];
    }
    onStart() {
        const arenaSprt = new Sprite();
        arenaSprt.img = AssetManager.images["./Sprites/arena.jpeg"];
        arenaSprt.size = new Vector2(Game.instance.width, Game.instance.height);
        this.addChild(arenaSprt);

        let code = `
            IMPORTAR "GIRAR"

            VAR angulo = 0
            VAR radio = 100

            MIENTRAS VERDADERO HACER
                LLAMAR GIRAR

                angulo = angulo + 1

                SI angulo >= 360 ENTONCES
                    angulo = 0
                FIN
            FIN
        `;
        let robotNode = new Node();
        robotNode.pos = new Vector2(100, 100);
        let robot = new RAssemblyRobot(code);
        robot.compile();
        robot.registerModule("GIRAR", (vm) => {
            const angulo = vm.getVariable("angulo");
            const radio = vm.getVariable("radio");
            const radianes = angulo * Math.PI / 180;
            robot.posX = Math.cos(radianes) * radio;
            robot.posY = Math.sin(radianes) * radio;
        });
        let robotSprt = new Sprite();
        robotSprt.img = AssetManager.images["./Sprites/Nave00.png"];
        robot.addChild(robotSprt);
        robot.pos = new Vector2(100, 100);
        robot.scale = new Vector2(0.25, 0.25);
        robotNode.addChild(robot);
        this.addChild(robotNode);


        // Pantalla negra
        let blackScreen = new Panel();
        blackScreen.size = new Vector2(Game.instance.width, Game.instance.height);
        blackScreen.color = new Color("#000000");
        blackScreen.colorA = 255;
        let blackScreenAnim = new Animation();
        blackScreenAnim
            .setFrames(60)
            .to(
                1,
                16,
                blackScreen,
                {
                    colorA: {
                        from: 255,
                        to: 0
                    }
                },
                "LINEAR"
            )
            .onFinish = () => {
                blackScreen.visible = false;
            };
        this.addChild(blackScreen);
        blackScreenAnim.play();
    }
}

/*
 * RatconDialogBox es un componente reutilizable para cualquier Scene/Node.
 * RatconDialogScene permite abrir el diálogo como una escena independiente.
 */
class RatconDialogBox extends Node {
    constructor(message = "¡Hola, piloto! Prepará tu robot y programá tu estrategia.", expression = "greet", options = {}) {
        super();
        this.name = "RatconDialogBox";
        this.time = 0;
        this.baseMascotY = 0;
        this.mascotScale = options.mascotScale ?? 0.22;
        this.bubbleWidth = options.width ?? 350;
        this.bubbleHeight = options.height ?? 82;
        this.bubbleOffset = options.bubbleOffset ?? 91;
        this.textSize = options.textSize ?? 11;
        this._message = message;
        this._expression = expression;

        const dialogImage = AssetManager.getImage("./Assets/Ratcon/greet.png");
        this.bubble = new NinePatch(dialogImage);
        this.bubble.name = "SpeechBubble";
        this.bubble.pos = new Vector2(this.bubbleOffset, 4);
        this.bubble.size = new Vector2(this.bubbleWidth, this.bubbleHeight);
        this.bubble.borderLeft = 8;
        this.bubble.borderTop = 7;
        this.bubble.borderRight = 8;
        this.bubble.borderBottom = 7;
        this.addChild(this.bubble);

        this.mascot = new Sprite();
        this.mascot.name = "Ratcon";
        this.mascot.img = AssetManager.getImage(`./Assets/Ratcon/${expression}.png`) || AssetManager.getImage("./Assets/Ratcon/greet.png");
        this.mascot.scale = new Vector2(this.mascotScale, this.mascotScale);
        this.mascot.pos = new Vector2(0, 0);
        this.addChild(this.mascot);

        this.messageLabel = new Label();
        this.messageLabel.name = "DialogueText";
        this.messageLabel.text = message;
        this.messageLabel.fontSize = this.textSize;
        this.messageLabel.color = new Color("#ffffff");
        this.messageLabel.loadFont(RFUI.FONT, this.textSize);
        this.messageLabel.pos = new Vector2(this.bubbleOffset + 17, 17);
        this.messageLabel.maxWidth = this.bubbleWidth - 33;
        this.addChild(this.messageLabel);

        const tag = new Label();
        tag.name = "RatconTag";
        tag.text = "RATCON // ASISTENTE";
        tag.fontSize = 7;
        tag.color = new Color("#278B8B");
        tag.loadFont(RFUI.FONT, 7);
        tag.pos = new Vector2(this.bubbleOffset + 17, this.bubbleHeight - 11);
        this.addChild(tag);
        this.tag = tag;
    }

    setMessage(message, expression = this._expression) {
        this._message = String(message ?? "");
        this.messageLabel.setText(this._message);
        this.setExpression(expression);
    }

    setExpression(expression) {
        const allowed = ["angry", "blink", "greet", "happy", "point_down", "point_left", "point_right", "point_up", "sad"];
        if (!allowed.includes(expression)) expression = "greet";
        const path = `./Assets/Ratcon/${expression}.png`;
        const image = AssetManager.getImage(path);
        if (image) this.mascot.img = image;
        else AssetManager.loadImage(path).then(loaded => {
            if (this._expression === expression) this.mascot.img = loaded;
        }).catch(error => console.warn("RatconDialogBox: no se pudo cargar la expresión.", error));
        this._expression = expression;
    }

    tick(dt) {
        if (!RFUI.animationsEnabled()) {
            this.mascot.pos = new Vector2(0, this.baseMascotY);
            return;
        }
        this.time += dt;
        this.mascot.pos = new Vector2(0, this.baseMascotY + Math.sin(this.time * 2.4) * 3);
    }
}

class RatconDialogScene extends Scene {
    constructor(message = "¡Hola, piloto! Prepará tu robot y programá tu estrategia.", expression = "greet") {
        super();
        this.name = "RatconDialogScene";
        this.type = "UI";
        this.message = message;
        this.expression = expression;
    }
    static preload() {
        return [
            "./Assets/dialog.png",
            "./Assets/Ratcon/greet.png",
            "./Assets/Ratcon/happy.png",
            "./Assets/Ratcon/angry.png",
            "./Assets/Ratcon/blink.png",
            "./Assets/Ratcon/point_down.png",
            "./Assets/Ratcon/point_left.png",
            "./Assets/Ratcon/point_right.png",
            "./Assets/Ratcon/point_up.png",
            "./Assets/Ratcon/sad.png",
            "./Assets/Fonts/Minecraft.ttf"
        ];
    }
    onStart() {
        this.addChild(new RobotFightBackdrop());
        RFUI.heading(this, "MENSAJE DE RATCON", "Un pequeño consejo antes de entrar a la arena");
        this.dialog = new RatconDialogBox(this.message, this.expression, { width: 480, height: 110, bubbleOffset: 130, mascotScale: 0.27, textSize: 12 });
        this.dialog.pos = new Vector2(92, 208);
        this.addChild(this.dialog);
        RFUI.button(this, "VOLVER AL MENÚ", 28, 526, 180, 44, () => Scene.change(new MainMenu()), { fontSize: 11 });
    }
}

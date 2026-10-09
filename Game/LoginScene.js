class LoginScene extends Scene {
    constructor() {
        super();

        this.name = "LoginScene";
        this.type = "UI";

        this.username = "";
        this.maxLength = 14;

        this.label = null;
        this.cursor = null;
        this.message = null;
        this.createBtn = null;

        this.keyDownListener = null;

        this.blinkTimer = 0;

        this.pendingChange = false;
        this.changeTimer = 0;
    }

    static preload() {
        return [];
    }

    onStart() {
        // Fondo
        const bg = new Panel();
        bg.name = "bg";
        bg.pos = new Vector2(0, 0);
        bg.size = new Vector2(Game.instance.width, Game.instance.height);
        bg.color = new Color("#01141A");
        this.addChild(bg);

        // Título
        const title = new Label();
        title.name = "Title";
        title.text = "CREAR USUARIO";
        title.fontSize = 40;
        title.color = new Color("white");
        title.updateSize();
        title.pos = new Vector2(
            (Game.instance.width - title.size.x) / 2,
            120
        );
        this.addChild(title);

        const subtitle = new Label();
        subtitle.name = "Subtitle";
        subtitle.text = "Ingresa un nombre para comenzar";
        subtitle.fontSize = 18;
        subtitle.color = new Color("#39E6D0");
        subtitle.updateSize();
        subtitle.pos = new Vector2(
            (Game.instance.width - subtitle.size.x) / 2,
            180
        );
        this.addChild(subtitle);

        // Caja de texto
        const box = new Panel();
        box.name = "InputBox";
        box.pos = new Vector2(200, 250);
        box.size = new Vector2(400, 64);
        box.color = new Color("#0A2A33");
        box.borderColor = new Color("#39E6D0");
        box.borderSize = 3;
        this.addChild(box);

        this.label = new Label();
        this.label.name = "UsernameLabel";
        this.label.text = "";
        this.label.fontSize = 30;
        this.label.color = new Color("white");
        this.label.updateSize();
        this.label.pos = new Vector2(18, 17);
        box.addChild(this.label);

        this.cursor = new Panel();
        this.cursor.name = "Cursor";
        this.cursor.size = new Vector2(3, 34);
        this.cursor.pos = new Vector2(18, 15);
        this.cursor.color = new Color("#39E6D0");
        box.addChild(this.cursor);

        // Mensaje de estado
        this.message = new Label();
        this.message.name = "Message";
        this.message.text = "";
        this.message.fontSize = 16;
        this.message.color = new Color("red");
        this.message.updateSize();
        this.message.pos = new Vector2(200, 330);
        this.addChild(this.message);

        // Botón
        this.createBtn = this.makeButton("Crear");
        this.createBtn.name = "CreateBtn";
        this.createBtn.pos = new Vector2(250, 390);
        this.createBtn.onReleased = () => this.confirm();
        this.addChild(this.createBtn);

        // Si ya existe un usuario, precargamos su nombre.
        const existing = User.load();
        if (existing !== null) {
            this.username = existing.name;
            this.updateInput();
            this.message.color = new Color("#39E6D0");
            this.message.setText(`Ya existe un usuario: ${existing.name}`);
            this.createBtn.getChildByName("BtnLabel").setText("Guardar");
        }

        // Entrada de teclado.
        this.keyDownListener = (keyCode) => this.onKeyDown(keyCode);
        Game.instance.keyManager.addEventListener(
            this.keyDownListener,
            "DOWN"
        );

        console.log("¡El login comenzó!");
    }

    makeButton(text) {
        const btn = new Button();
        btn.size = new Vector2(300, 70);

        const panel = new Panel();
        panel.name = "BtnPanel";
        panel.size = btn.size.clone();
        panel.color = new Color("#39E6D0");
        btn.addChild(panel);

        const label = new Label();
        label.name = "BtnLabel";
        label.text = text;
        label.fontSize = 28;
        label.color = new Color("#01141A");
        label.updateSize();
        label.pos = new Vector2(
            (btn.size.x - label.size.x) / 2,
            (btn.size.y - label.size.y) / 2
        );
        btn.addChild(label);

        btn.onHover = () => {
            panel.color = new Color("#7CF3E4");
        };
        btn.onLeave = () => {
            panel.color = new Color("#39E6D0");
        };

        return btn;
    }

    onKeyDown(keyCode) {
        if (this.pendingChange)
            return;

        if (keyCode === 8) {
            this.username = this.username.slice(0, -1);
        }
        else if (keyCode === 13) {
            this.confirm();
            return;
        }
        else if (
            typeof key === "string" &&
            key.length === 1 &&
            this.username.length < this.maxLength &&
            /[a-zA-Z0-9_ ]/.test(key)
        ) {
            this.username += key;
        }

        this.message.setText("");
        this.updateInput();
    }

    updateInput() {
        this.label.setText(this.username);

        this.cursor.pos = new Vector2(
            18 + this.label.size.x + 2,
            15
        );
        this.cursor.visible = true;
        this.blinkTimer = 0;
    }

    confirm() {
        if (this.pendingChange)
            return;

        const name = this.username.trim();

        if (name.length === 0) {
            this.message.color = new Color("red");
            this.message.setText("El nombre no puede estar vacío");
            return;
        }

        const user = new User(name);
        const saved = User.save(user);

        Game.instance.user = user;

        this.message.color = new Color("#39E6D0");
        this.message.setText(
            saved
                ? `Usuario '${user.name}' guardado`
                : `Usuario '${user.name}' creado`
        );

        this.pendingChange = true;
        this.changeTimer = 0.8;
    }

    tick(dt) {
        if (this.pendingChange) {
            this.changeTimer -= dt;

            if (this.changeTimer <= 0) {
                this.pendingChange = false;
                Scene.change(new MainMenu());
            }

            return;
        }

        this.blinkTimer += dt;
        if (this.blinkTimer >= 0.5) {
            this.blinkTimer = 0;
            this.cursor.visible = !this.cursor.visible;
        }
    }

    exit() {
        if (this.keyDownListener !== null) {
            Game.instance.keyManager.removeEventListener(
                this.keyDownListener,
                "DOWN"
            );
            this.keyDownListener = null;
        }

        super.exit();
    }
}

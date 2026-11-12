class LoginScene extends Scene {
    constructor() {
        super();

        this.name = "LoginScene";
        this.type = "UI";

        this.username = "";
        this.password = "";
        this.mode = "login";
        this.inputFocus = "username";
        this.maxLength = 18;

        this.title = null;
        this.subtitle = null;
        this.label = null;
        this.cursor = null;
        this.passwordLabel = null;
        this.passwordCursor = null;
        this.modeButton = null;
        this.message = null;
        this.createBtn = null;

        this.keyDownListener = null;

        this.blinkTimer = 0;

        this.pendingChange = false;
        this.changeTimer = 0;
    }

    static preload() {
        return [
            "./Assets/dialog.png", "./Assets/Ratcon/greet.png", "./Assets/Ratcon/happy.png",
            "./Assets/Ratcon/point_right.png", "./Assets/Fonts/Minecraft.ttf"
        ];
    }

    onStart() {
        // Presentación inicial con la identidad visual del juego.
        this.addChild(new RobotFightBackdrop());
        RFUI.panel(this, 0, 0, Game.instance.width, 7, RFUI.COLORS.cyan, RFUI.COLORS.cyan, 0, "TopAccent");
        RFUI.label(this, "R/F  //  ROBOT COMBAT LAB", 30, 22, 9, RFUI.COLORS.cyan);
        RFUI.label(this, "PRIMER INGRESO DE PILOTO", 30, 39, 7, RFUI.COLORS.muted);

        // Título
        this.title = new Label();
        this.title.name = "Title";
        this.title.text = "CREAR USUARIO";
        this.title.fontSize = 29;
        this.title.color = new Color(RFUI.COLORS.white);
        this.title.loadFont(RFUI.FONT, this.title.fontSize);
        this.title.updateSize();
        this.title.pos = new Vector2(
            (Game.instance.width - this.title.size.x) / 2,
            105
        );
        this.addChild(this.title);

        this.subtitle = new Label();
        this.subtitle.name = "Subtitle";
        this.subtitle.text = "Escribí un nombre para comenzar";
        this.subtitle.fontSize = 11;
        this.subtitle.color = new Color(RFUI.COLORS.cyan);
        this.subtitle.loadFont(RFUI.FONT, this.subtitle.fontSize);
        this.subtitle.updateSize();
        this.subtitle.pos = new Vector2(
            (Game.instance.width - this.subtitle.size.x) / 2,
            151
        );
        this.addChild(this.subtitle);

        // Campos de entrada reutilizables del motor. Se mantienen visibles incluso
        // cuando no tienen el foco; la contraseña se representa siempre enmascarada.
        RFUI.label(this, "USUARIO", 200, 181, 8, RFUI.COLORS.muted);
        this.usernameField = new TextField(this.username, {
            x: 200, y: 194, width: 400, height: 68, maxLength: this.maxLength,
            placeholder: "Tu nombre de piloto", label: "NOMBRE DE USUARIO"
        });
        this.usernameField.active = true;
        this.addChild(this.usernameField);

        RFUI.label(this, "CONTRASEÑA", 200, 274, 8, RFUI.COLORS.muted);
        this.passwordField = new TextField("", {
            x: 200, y: 287, width: 400, height: 68, maxLength: 64,
            placeholder: "Tu contraseña", label: "CONTRASEÑA", masked: true
        });
        this.addChild(this.passwordField);

        // Mensaje de estado
        this.message = new Label();
        this.message.name = "Message";
        this.message.text = "";
        this.message.fontSize = 16;
        this.message.color = new Color("red");
        this.message.updateSize();
        this.message.pos = new Vector2(200, 350);
        this.addChild(this.message);

        // Botón
        this.createBtn = this.makeButton("Crear");
        this.createBtn.name = "CreateBtn";
        this.createBtn.pos = new Vector2(250, 395);
        this.createBtn.onReleased = () => this.confirm();
        this.addChild(this.createBtn);

        this.modeButton = RFUI.button(
            this, "¿NO TENÉS CUENTA? REGISTRATE",
            250, 474, 300, 38,
            () => {
                Scene.change(this.mode === "login"
                    ? new RegisterScene()
                    : new LoginScene());
            },
            { name: "AccountModeButton", fontSize: 8, color: "#102B3B", hoverColor: "#174556" }
        );

        // Ratcon presenta el objetivo del juego mientras creás tu perfil.
        this.ratcon = new RatconDialogBox(
            "Hola! Soy Ratcon. Aca vas a construir una nave y programar su estrategia para combatir.",
            "greet",
            { width: 155, height: 83, bubbleOffset: 47, mascotScale: 0.15, textSize: 7 }
        );
        this.ratcon.pos = new Vector2(7, 435);
        this.addChild(this.ratcon);
        RFUI.label(this, "CUENTA DE PILOTO EMJI", 28, 420, 7, RFUI.COLORS.cyan);

        // Si ya existe un usuario, precargamos su nombre para iniciar sesión.
        const existing = User.load();
        if (existing !== null) this.username = existing.name;
        this.syncTextFields();
        this.refreshMode();

        console.log("¡El login comenzó!");
    }

    makeButton(text) {
        const btn = new Button();
        btn.size = new Vector2(300, 70);

        const panel = new Panel();
        panel.name = "BtnPanel";
        panel.size = btn.size.clone();
        panel.color = new Color(RFUI.COLORS.cyan);
        btn.addChild(panel);

        const label = new Label();
        label.name = "BtnLabel";
        label.text = text;
        label.fontSize = 28;
        label.color = new Color("#07111F");
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
            panel.color = new Color(RFUI.COLORS.cyan);
        };

        return btn;
    }

    centerLabel(label, y) {
        label.updateSize();
        label.pos = new Vector2(
            (Game.instance.width - label.size.x) / 2,
            y
        );
    }

    refreshMode() {
        const registering = this.mode === "register";
        this.title.setText(registering ? "CREAR CUENTA" : "INICIAR SESIÓN");
        this.subtitle.setText(registering
            ? "Elegí un usuario y una contraseña segura"
            : "Ingresá tus credenciales para continuar");
        const btnLabel = this.createBtn.getChildByName("BtnLabel");
        if (btnLabel) btnLabel.setText(registering ? "Registrarme" : "Entrar");
        if (this.modeButton && this.modeButton.label) {
            this.modeButton.label.text = registering
                ? "¿YA TENÉS CUENTA? INICIÁ SESIÓN"
                : "¿NO TENÉS CUENTA? REGISTRATE";
            this.modeButton.label.mustBeRerendered = true;
        }
        this.centerLabel(this.title, 92);
        this.centerLabel(this.subtitle, 139);
    }

    syncTextFields() {
        if (!this.usernameField || !this.passwordField) return;
        if (this.usernameField.value !== this.username) {
            this.usernameField.value = this.username;
            this.usernameField.cursor = this.username.length;
        }
        if (this.passwordField.value !== this.password) {
            this.passwordField.value = this.password;
            this.passwordField.cursor = this.password.length;
        }
        this.usernameField.active = this.inputFocus === "username";
        this.passwordField.active = this.inputFocus === "password";
    }

    handleTextFieldKey(code, key) {
        if (this.pendingChange) return true;
        if (code === 9) {
            this.inputFocus = this.inputFocus === "username" ? "password" : "username";
            this.syncTextFields();
            return true;
        }
        const field = this.inputFocus === "username" ? this.usernameField : this.passwordField;
        if (!field) return false;
        if (code === 13) {
            this.username = this.usernameField.value;
            this.password = this.passwordField.value;
            this.confirm();
            return true;
        }
        const handled = field.keyPressed(code, key);
        this.username = this.usernameField.value;
        this.password = this.passwordField.value;
        return handled;
    }

    handleTextFieldCharacter(character) {
        if (this.pendingChange) return;
        const field = this.inputFocus === "username" ? this.usernameField : this.passwordField;
        if (field) field.inputCharacter(character);
        this.username = this.usernameField.value;
        this.password = this.passwordField.value;
    }

    async confirm() {
        if (this.pendingChange) return;
        if (this.usernameField) this.username = this.usernameField.value;
        if (this.passwordField) this.password = this.passwordField.value;
        const name = this.username.trim();
        if (!name || name.length < 3) {
            this.message.color = new Color("red");
            this.message.setText("El usuario debe tener al menos 3 caracteres.");
            return;
        }
        if (this.password.length < 8) {
            this.message.color = new Color("red");
            this.message.setText("La contraseña debe tener al menos 8 caracteres.");
            this.inputFocus = "password";
            this.syncTextFields();
            return;
        }

        this.createBtn.disabled = true;
        this.message.color = new Color(RFUI.COLORS.orange);
        this.message.setText("Conectando con el servidor...");

        try {
            const remoteUser = this.mode === "register"
                ? await BackendClient.register(name, this.password)
                : await BackendClient.login(name, this.password);

            let user = User.login(remoteUser.username);
            if (!user) user = new User(remoteUser.username);
            User.save(user);
            Game.instance.user = user;

            if (typeof RobotLoadout !== "undefined" && remoteUser.loadout) {
                const restoredLoadout = {
                    ...RobotLoadout.defaults(),
                    ...remoteUser.loadout,
                    name: remoteUser.robotName || remoteUser.loadout.name || "RF-01"
                };
                RobotLoadout.save(restoredLoadout);
            }
            if (typeof localStorage !== "undefined" && remoteUser.programCode) {
                try { localStorage.setItem("emji.rassembly.program", remoteUser.programCode); }
                catch (_) {}
            }

            this.message.color = new Color(RFUI.COLORS.green);
            this.message.setText(`Bienvenido, ${remoteUser.username}.`);
            this.pendingChange = true;
            this.changeTimer = 0.8;
        } catch (error) {
            this.message.color = new Color(RFUI.COLORS.red);
            this.message.setText(error.message || "No se pudo conectar con el servidor.");
            this.createBtn.disabled = false;
        }
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


    }

    exit() {
        super.exit();
    }
}


class RegisterScene extends LoginScene {
    constructor() {
        super();
        this.name = "RegisterScene";
        this.mode = "register";
    }
}

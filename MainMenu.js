class MainMenu extends Scene {

    constructor()
    {
        super();
        this.type = "UI";
        this.name = "MainMenu";
    }
    preload() {
        return [
            "./Sprites/archivementsBtn.jpeg",
            "./Sprites/playBtn.jpeg",
            "./Sprites/settingsBtn.jpeg",
            "./Sprites/title.jpeg"
        ];
    }
    onStart()
    {
        // Fondo
        const bg = new Panel();
        bg.name = "bg";
        bg.pos = new Vector2(0, 0);
        bg.size = new Vector2(Game.instance.width, Game.instance.height);
        bg.color = new Color("#01141A");
        this.addChild(bg);
        
        let playBtn = new Button();
        playBtn.name = "PlayBtn";
        playBtn.pos = new Vector2(250, 280);
        playBtn.scale = new Vector2(0.7, 0.7);
        let playBtnSprt = new Sprite();
        playBtnSprt.img = AssetManager.images["./Sprites/playBtn.jpeg"];
        playBtn.size = playBtnSprt.size.clone();
        playBtn.addChild(playBtnSprt);
        this.addChild(playBtn);

        let settingsBtn = new Button();
        settingsBtn.name = "settingsBtn";
        settingsBtn.pos = new Vector2(260, 410);
        settingsBtn.scale = new Vector2(0.7, 0.7);
        let settingsBtnSprt = new Sprite();
        settingsBtnSprt.img = AssetManager.images["./Sprites/settingsBtn.jpeg"];
        settingsBtn.size = settingsBtnSprt.size.clone();
        settingsBtn.addChild(settingsBtnSprt);
        this.addChild(settingsBtn);

        let archivsBtn = new Button();
        archivsBtn.name = "archivsBtn";
        archivsBtn.pos = new Vector2(260, 490);
        archivsBtn.scale = new Vector2(0.7, 0.7);
        let archivsBtnSprt = new Sprite();
        archivsBtnSprt.img = AssetManager.images["./Sprites/archivementsBtn.jpeg"];
        archivsBtn.size = archivsBtnSprt.size.clone();
        archivsBtn.addChild(archivsBtnSprt);
        this.addChild(archivsBtn);

        let title = new Sprite();
        title.name = "title";
        title.img = AssetManager.images["./Sprites/title.jpeg"];
        title.pos = new Vector2(-40, 60);
        title.scale = new Vector2(0.7, 0.7);
        this.addChild(title);

        let blackScreen = new Panel();
        blackScreen.pos = new Vector2(0, 0);
        blackScreen.size = new Vector2(Game.instance.width, Game.instance.height);
        blackScreen.color = new Color("#000000");
        blackScreen.colorA = 0;
        blackScreen.visible = false;
        this.addChild(blackScreen);
        let blackScreenAnim = new Animation();
        blackScreenAnim
            .setFrames(60)
            .to(
                1,
                1,
                blackScreen,
                {
                    visible: true
                },
                "LINEAR"
            )
            .to(
                1,
                16,
                blackScreen,
                {
                    colorA: {
                        from: 0,
                        to: 255
                    }
                },
                "LINEAR"
            );

        const [hoverPlayAnim, leavePlayAnim] = this.makeHoverLeaveAnim(playBtn);
        const [hoverSettingsAnim, leaveSettingsAnim] = this.makeHoverLeaveAnim(settingsBtn);
        const [hoverArchivsAnim, leaveArchivsAnim] = this.makeHoverLeaveAnim(archivsBtn);
        
        playBtn.onHover = () => {
            leavePlayAnim.stop();
            hoverPlayAnim.play();
        };
        playBtn.onLeave = () => {
            hoverPlayAnim.stop();
            leavePlayAnim.play();
        };
        playBtn.onReleased = () => {
            leavePlayAnim.stop();
            hoverPlayAnim.stop();
            blackScreenAnim.play()
        };
        settingsBtn.onHover = () => {
            leaveSettingsAnim.stop();
            hoverSettingsAnim.play();
        };
        settingsBtn.onLeave = () => {
            hoverSettingsAnim.play();
            leaveSettingsAnim.play();
        };
        archivsBtn.onHover = () => {
            leaveArchivsAnim.stop();
            hoverArchivsAnim.play();
        };
        archivsBtn.onLeave = () => {
            hoverArchivsAnim.stop();
            leaveArchivsAnim.play();
        };

        console.log("¡El menú comenzó!");
    }

    makeHoverLeaveAnim(btn) {
        const hoverAnim = new Animation();
        const leaveAnim = new Animation();
        hoverAnim
            .setFrames(16)
            .to(
                1,
                8,
                btn,
                {
                    posX: {
                        from: btn.pos.x,
                        to: btn.pos.x - 20
                    },
                    posY: {
                        from: btn.pos.y,
                        to: btn.pos.y - 10
                    },
                    scaleX: {
                        from: 0.7,
                        to: 0.8
                    },
                    scaleY: {
                        from: 0.7,
                        to: 0.8
                    }
                },
                "EASEINOUT"
            );
        leaveAnim
            .setFrames(16)
            .to(
                1,
                8,
                btn,
                {
                    posX: {
                        from: btn.pos.x - 20,
                        to: btn.pos.x
                    },
                    posY: {
                        from: btn.pos.y - 10,
                        to: btn.pos.y
                    },
                    scaleX: {
                        from: 0.8,
                        to: 0.7
                    },
                    scaleY: {
                        from: 0.8,
                        to: 0.7
                    }
                },
                "EASEINOUT"
            );
        return [hoverAnim, leaveAnim];
    }
}

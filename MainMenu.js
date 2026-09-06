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

        playBtn._baseX = playBtn.pos.x;
        playBtn._baseY = playBtn.pos.y;

        settingsBtn._baseX = settingsBtn.pos.x;
        settingsBtn._baseY = settingsBtn.pos.y;

        archivsBtn._baseX = archivsBtn.pos.x;
        archivsBtn._baseY = archivsBtn.pos.y;

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

        let playBtnAnim = null;
        let settingsBtnAnim = null;
        let archivsBtnAnim = null;
        
        playBtn.onHover = () => {
            if(playBtnAnim)
                playBtnAnim.stop();

            playBtnAnim = this.animateButton(playBtn, true);
        };
        playBtn.onLeave = () => {
            if(playBtnAnim)
                playBtnAnim.stop();
            
            playBtnAnim = this.animateButton(playBtn, false);
        };
        playBtn.onReleased = () => {
            playBtnAnim.stop();
            playBtnAnim = this.animateButton(playBtn, false);
            blackScreenAnim.play();
            blackScreenAnim.onFinish = () => {
                Scene.change(new FightScene());
            };
        };
        settingsBtn.onHover = () => {
            if(settingsBtnAnim)
                settingsBtnAnim.stop();

            settingsBtnAnim = this.animateButton(settingsBtn, true);
        };
        settingsBtn.onLeave = () => {
            if(settingsBtnAnim)
                settingsBtnAnim.stop();

            settingsBtnAnim = this.animateButton(settingsBtn, false);
        };
        archivsBtn.onHover = () => {
            if(archivsBtnAnim)
                archivsBtnAnim.stop();

            archivsBtnAnim = this.animateButton(archivsBtn, true);
        };
        archivsBtn.onLeave = () => {
            if(archivsBtnAnim)
                archivsBtnAnim.stop();

            archivsBtnAnim = this.animateButton(archivsBtn, false);
        };

        console.log("¡El menú comenzó!");
    }
    animateButton(btn, hovered) {
        const animation = new Animation();
        const fromX = btn.pos.x;
        const fromY = btn.pos.y;
        const fromScaleX = btn.scale.x;
        const fromScaleY = btn.scale.y;

        const toX = hovered ? btn._baseX - 20 : btn._baseX;
        const toY = hovered ? btn._baseY - 10 : btn._baseY;

        const toScale = hovered ? 0.8 : 0.7;

        animation
            .setFrames(16)
            .to(
                1,
                8,
                btn,
                {
                    posX: {
                        from: fromX,
                        to: toX
                    },
                    posY: {
                        from: fromY,
                        to: toY
                    },
                    scaleX: {
                        from: fromScaleX,
                        to: toScale
                    },
                    scaleY: {
                        from: fromScaleY,
                        to: toScale
                    }
                },
                "EASEINOUT"
            );

        animation.play();

        return animation;
    }
}

class LoadingScene extends Scene {
    constructor() {
        super();

        this.name = "LoadingScene";
        this.type = "UI";
        this.pos = new Vector2(0, 0);

        this.spinner = null;
        this.animations = [];
    }

    onStart() {
        // Fondo
        const background = new Panel();
        background.name = "Background";
        background.pos = new Vector2(0, 0);
        background.size = new Vector2(width, height);
        background.color = new Color("#141414");
        this.addChild(background);
        // Spinner
        this.spinner = new Node();
        this.spinner.name = "Spinner";
        this.spinner.pos = new Vector2(width / 2, height / 2);
        this.addChild(this.spinner);
        // Barras
        const count = 8;
        const radius = 120;
        const barWidth = 10;
        const barHeight = 30;
        
        for(let i = 0; i < count; i++) {
            const angle = (360 / count) * i;
            const angleRad = radians(angle);
            const bar = new Panel();
            bar.name = `LoadingBar${i}`;
            bar.size = new Vector2(barWidth, barHeight);
            // Posicion circular.
            bar.pos = new Vector2(Math.cos(angleRad) * radius - barWidth / 2, Math.sin(angleRad) * radius - barHeight / 2);
            // Orientamos la barra hacia afuera.
            bar.rotation = angle + 90;
            bar.color = new Color("white");
            this.spinner.addChild(bar);

            // Animacion de la barra
            const animation = new Animation();
            animation
                .setFrames(32)
                .to(
                    1,
                    16,
                    bar,
                    {
                        scaleY: {
                            from: 1,
                            to: 0.35
                        }
                    },
                    "EASEINOUT"
                )
                .to(
                    17,
                    32,
                    bar,
                    {
                        scaleY: {
                            from: 0.35,
                            to: 1
                        }
                    },
                    "EASEINOUT"
                );

            animation.loop = true;
            animation.fps = 30;


            /*
             * Cada barra empieza en un punto
             * diferente de la animación.
             */
            const offset = Math.floor((32 / count) * i);
            /*
             * Aplicamos manualmente su estado
             * inicial correspondiente.
             */
            if(offset < 16) {
                const t = offset / 16;
                bar.scale = new Vector2(1, Animation.easeInOut(1, 0.35, t));
            }
            else
            {
                const t = (offset - 16) / 16;
                bar.scale = new Vector2(1, Animation.easeInOut(0.35, 1, t));
            }
            animation._currentFrame = offset + 1;
            animation.play();
            this.animations.push(animation);
        }

        // Rotacion del spinner completo
        const rotationAnimation = new Animation();
        rotationAnimation
            .setFrames(60)
            .to(
                1,
                60,
                this.spinner,
                {
                    rotation: {
                        from: 0,
                        to: 360
                    }
                },
                "LINEAR"
            );
        rotationAnimation.loop = true;
        rotationAnimation.fps = 30;
        rotationAnimation.play();
        this.animations.push(rotationAnimation);
    }

    tick(dt) {
        console.log("LoadingScene tick");
    }
}

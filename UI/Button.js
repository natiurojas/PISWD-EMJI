class Button extends Node {
    constructor()
    {
        super();
        this.name = "Button";

        // Eventos.
        this.onPressed = null;
        this.onReleased = null;
        this.onHover = null;
        this.onLeave = null;

        // Estado interno de los eventos.
        this.hasBeenOnPressedCalled = false;
        this.hasBeenOnReleasedCalled = false;
        this.hasBeenOnHoverCalled = false;

        // Botón deshabilitado.
        this.disabled = false;
    }
    amVisible()
    {
        if(!this.visible)
            return false;
        let parent = this.parent;
        while(parent !== null)
        {
            if(!parent.visible)
                return false;
            parent = parent.parent;
        }
        return true;
    }
    tick(delta)
    {
        if(this.disabled)
        {
            // Si se deshabilita mientras estaba siendo
            // apuntado, limpiamos el estado de hover.
            if(this.hasBeenOnHoverCalled)
            {
                if(typeof this.onLeave === "function")
                    this.onLeave(this);
            }
            this.hasBeenOnHoverCalled = false;
            this.hasBeenOnPressedCalled = false;
            return;
        }

        if(!this.amVisible())
        {
            this.hasBeenOnHoverCalled = false;
            this.hasBeenOnPressedCalled = false;
            return;
        }
        const finalSize = new Vector2(
            this.size.x * this.globalScale.x,
            this.size.y * this.globalScale.y
        );
        const mouseInside =
            mouseX >= this.globalPos.x &&
            mouseX <= this.globalPos.x + finalSize.x &&
            mouseY >= this.globalPos.y &&
            mouseY <= this.globalPos.y + finalSize.y;

        if(mouseInside)
        {
            // -------------------------------------------------
            // HOVER
            // -------------------------------------------------

            if(!this.hasBeenOnHoverCalled)
            {
                this.hasBeenOnHoverCalled = true;

                if(typeof this.onHover === "function")
                    this.onHover(this);
            }


            // -------------------------------------------------
            // PRESSED / RELEASED
            // -------------------------------------------------

            if(Mouse.instance.isLeftClickPressed)
            {
                if(!this.hasBeenOnPressedCalled)
                {
                    this.hasBeenOnPressedCalled = true;
                    this.hasBeenOnReleasedCalled = false;

                    this.playSplash();
                    if (typeof AudioPlayer !== "undefined")
                        AudioPlayer.play("uiClick");

                    if(typeof this.onPressed === "function")
                        this.onPressed(this);
                }
            }
            else
            {
                if(
                    this.hasBeenOnPressedCalled &&
                    !this.hasBeenOnReleasedCalled
                )
                {
                    this.hasBeenOnPressedCalled = false;
                    this.hasBeenOnReleasedCalled = true;

                    if(typeof this.onReleased === "function")
                        this.onReleased(this);
                }
            }
        }
        else
        {
            // =================================================
            // LEAVE
            // =================================================

            if(this.hasBeenOnHoverCalled)
            {
                if(typeof this.onLeave === "function")
                    this.onLeave(this);
            }

            this.hasBeenOnHoverCalled = false;
            this.hasBeenOnPressedCalled = false;
        }
    }

    playSplash()
    {
        if (typeof Animation === "undefined")
            return;

        if (this._splashAnimation && this._splashAnimation.isPlaying())
            this._splashAnimation.stop();

        this.scale = new Vector2(1, 1);
        this._splashAnimation = new Animation()
            .setFrames(12)
            .to(1, 5, this, {
                scaleX: { from: 1, to: 1.075 },
                scaleY: { from: 1, to: 1.075 }
            }, "EASEINOUT")
            .to(5, 12, this, {
                scaleX: { from: 1.075, to: 1 },
                scaleY: { from: 1.075, to: 1 }
            }, "EASEINOUT")
            .play();
    }

    free()
    {
        if (this._splashAnimation && this._splashAnimation.isPlaying())
            this._splashAnimation.stop();
        this._splashAnimation = null;
        this.surface = null;

        this.onPressed = null;
        this.onReleased = null;
        this.onHover = null;
        this.onLeave = null;

        super.free();
    }
}

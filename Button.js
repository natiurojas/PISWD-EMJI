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

    free()
    {
        this.surface = null;

        this.onPressed = null;
        this.onReleased = null;
        this.onHover = null;
        this.onLeave = null;

        super.free();
    }
}

/*
 * Puente entre el juego y el mando del celular.
 * El servidor local (server.js) retransmite los eventos SSE.
 *
 * Si el juego se abre como archivo local (file://) o el servidor no está
 * disponible, todo sigue funcionando con el piloto automático de siempre.
 */

class MobileController {
    static instance = null;

    static shared() {
        if (MobileController.instance === null)
            MobileController.instance = new MobileController();

        return MobileController.instance;
    }

    constructor() {
        this.supported = typeof window !== "undefined" &&
            typeof window.EventSource === "function" &&
            (location.protocol === "http:" || location.protocol === "https:");

        this.source = null;
        this.connected = false;
        this.controllers = 0;
        this.lastInputAt = 0;
        this.lastPublishAt = 0;

        this.control = {
            x: 0,
            y: 0,
            fire: false,
            shield: false
        };

        this.connect();
    }

    connect() {
        if (!this.supported || this.source !== null)
            return;

        try {
            this.source = new EventSource("/events?role=game");
        }
        catch (error) {
            this.source = null;
            return;
        }

        this.source.addEventListener("open", () => {
            this.connected = true;
        });

        this.source.addEventListener("status", event => {
            try {
                const data = JSON.parse(event.data);
                this.connected = true;
                this.controllers = Math.max(0, Number(data.controllers) || 0);

                if (this.controllers === 0)
                    this.resetControl();
            }
            catch (error) {
                // Evento inválido: se ignora.
            }
        });

        this.source.addEventListener("control", event => {
            try {
                const data = JSON.parse(event.data);

                this.control.x = this.clampAxis(data.x);
                this.control.y = this.clampAxis(data.y);
                this.control.fire = data.fire === true;
                this.control.shield = data.shield === true;
                this.lastInputAt = Date.now();
                this.connected = true;
            }
            catch (error) {
                // Evento inválido: se ignora.
            }
        });

        this.source.addEventListener("error", () => {
            this.connected = false;
            this.controllers = 0;
            this.resetControl();
        });
    }

    disconnect() {
        if (this.source !== null) {
            this.source.close();
            this.source = null;
        }

        this.connected = false;
        this.controllers = 0;
        this.resetControl();
    }

    resetControl() {
        this.control.x = 0;
        this.control.y = 0;
        this.control.fire = false;
        this.control.shield = false;
    }

    clampAxis(value) {
        const number = Number(value);

        if (!Number.isFinite(number))
            return 0;

        return Math.max(-1, Math.min(1, number));
    }

    get available() {
        return this.supported && this.connected;
    }

    get hasController() {
        return this.controllers > 0;
    }

    // El mando toma el control cuando hay un celular conectado y sigue
    // enviando señal. Si se desconecta, la IA vuelve sola.
    get manual() {
        if (!this.supported || this.controllers === 0)
            return false;

        return Date.now() - this.lastInputAt < 1500;
    }

    state(overrides = {}) {
        return {
            t: Date.now(),
            scene: "fight",
            manual: this.manual,
            ...overrides
        };
    }

    publish(overrides = {}, force = false) {
        if (!this.supported)
            return;

        const now = Date.now();

        if (!force && now - this.lastPublishAt < 100)
            return;

        this.lastPublishAt = now;

        try {
            fetch("/game-state", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                cache: "no-store",
                body: JSON.stringify(this.state(overrides))
            }).catch(() => {
                // Sin servidor: no pasa nada.
            });
        }
        catch (error) {
            // Sin servidor: no pasa nada.
        }
    }
}

/*
 * AudioPlayer: capa de sonido del juego.
 * Los nombres ya están reservados; registrá los archivos cuando estén listos.
 * No se incluyen audios vacíos para evitar errores 404 mientras son placeholders.
 */
class AudioPlayer {
    static masterVolume = 0.65;
    static sounds = {
        uiClick: null,
        uiSplash: null,
        blockPick: null,
        blockDrop: null,
        blockInvalid: null,
        menuOpen: null,
        battleStart: null,
        laser: null,
        explosion: null,
        shield: null,
        victory: null,
        defeat: null
    };
    static active = new Set();

    static register(name, source) {
        if (!(name in this.sounds))
            this.sounds[name] = null;
        this.sounds[name] = source || null;
    }

    static setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
    }

    static play(name, options = {}) {
        const source = this.sounds[name];
        if (!source || typeof Audio === "undefined")
            return false;

        try {
            const audio = new Audio(source);
            audio.volume = Math.max(0, Math.min(1,
                this.masterVolume * (options.volume ?? 1)
            ));
            audio.loop = options.loop === true;
            this.active.add(audio);
            audio.addEventListener("ended", () => this.active.delete(audio), { once: true });
            const result = audio.play();
            if (result && typeof result.catch === "function")
                result.catch(() => this.active.delete(audio));
            return true;
        } catch (_) {
            return false;
        }
    }

    static stopAll() {
        for (const audio of this.active) {
            try { audio.pause(); audio.currentTime = 0; } catch (_) {}
        }
        this.active.clear();
    }
}

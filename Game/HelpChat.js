/*
 * RATCON // Chat de consultas del juego
 *
 * Ventana flotante que responde preguntas de los jugadores usando una IA.
 * La clave de API vive únicamente en el servidor (server.js, endpoint /chat).
 *
 * El chat solo se muestra en las pantallas de menú: se oculta en Login,
 * combate, carga y editor RAssembly para no chocar con los controles del
 * juego ni con el teclado.
 */
(function () {
    "use strict";

    const STORAGE_KEY = "robotFight.helpChat.v1";
    const MAX_STORED = 30;
    const MAX_HISTORY = 8;
    const MAX_MESSAGE = 600;
    const SCENE_POLL_MS = 250;

    const HIDDEN_SCENES = new Set([
        "LoginScene",
        "FightScene",
        "LoadingScene",
        "RAssemblyEditor",
        "RatconDialogScene"
    ]);

    const SUGGESTIONS = [
        "¿Cómo juego mi primera partida?",
        "¿Qué es RAssembly y cómo se usa?",
        "¿Cómo controlo la nave con el celular?",
        "¿Cómo funcionan el escudo y la puntuación?",
        "¿Por qué no conecta el mando?"
    ];

    const WELCOME = "¡Hola! Soy RATCON, la guía del juego. Puedo explicarte cómo programar tu robot, cómo funcionan los niveles, el escudo o el mando del celular. ¿Qué querés saber?";

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character]));
    }

    function renderRich(text) {
        return escapeHtml(text)
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\n/g, "<br>");
    }

    function friendlyError(error) {
        if (error && error.code === "chat_not_configured")
            return "El chat todavía no está configurado. Completá `chat.config.json` y reiniciá el servidor.";

        if (error && (error.code === "rate_limited" || error.code === "chat_busy"))
            return error.message;

        if (error && error.name === "AbortError")
            return "La consulta tardó demasiado. Probá de nuevo.";

        if (error instanceof TypeError)
            return "No pude conectar con el servidor. Abrí el juego con `node server.js` y verificá que esté corriendo.";

        return error && error.message
            ? error.message
            : "No pude responder en este momento. Probá de nuevo.";
    }

    class HelpChatOverlay {
        constructor() {
            this.messages = [];
            this.pending = false;
            this.open = false;
            this.visible = false;
            this.typing = null;
            this.statusCheckedAt = 0;
            this.sceneTimer = null;

            this.build();
            this.bind();
            this.restore();
            this.updateVisibility();
            this.sceneTimer = window.setInterval(() => this.updateVisibility(), SCENE_POLL_MS);
            window.setTimeout(() => this.refreshStatus(), 700);
        }

        // -----------------------------------------------------------------
        // Construcción de la interfaz
        // -----------------------------------------------------------------

        build() {
            const host = document.createElement("div");
            host.className = "rf-chat-root";

            host.innerHTML = `
                <button id="rf-chat-launcher" class="rf-chat-launcher" type="button"
                    aria-expanded="false" aria-controls="rf-chat-panel" hidden>
                    <span class="rf-chat-launcher__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 5.5h16v10H9.2L4.5 19v-3.5H4z" stroke="currentColor"
                                stroke-width="1.6" stroke-linejoin="round"/>
                            <path d="M8 9.5h8M8 12.5h5" stroke="currentColor" stroke-width="1.4"
                                stroke-linecap="round"/>
                        </svg>
                    </span>
                    <span class="rf-chat-launcher__copy">
                        <span class="rf-chat-launcher__title">CONSULTAS</span>
                        <span class="rf-chat-launcher__hint">Preguntale a RATCON</span>
                    </span>
                </button>

                <section id="rf-chat-panel" class="rf-chat-panel" role="dialog"
                    aria-modal="false" aria-labelledby="rf-chat-title" hidden>
                    <header class="rf-chat-header">
                        <span class="rf-chat-avatar" aria-hidden="true">R</span>
                        <span class="rf-chat-heading">
                            <span class="rf-chat-title" id="rf-chat-title">RATCON</span>
                            <span class="rf-chat-subtitle">
                                ASISTENTE DEL JUEGO
                                <span class="rf-chat-status">
                                    <span class="rf-chat-status__dot" id="rf-chat-status-dot"></span>
                                    <span id="rf-chat-status-text">EN LÍNEA</span>
                                </span>
                            </span>
                        </span>
                        <button id="rf-chat-close" class="rf-chat-icon-button" type="button"
                            aria-label="Cerrar el chat">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M7 7l10 10M17 7L7 17" stroke="currentColor"
                                    stroke-width="1.8" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </header>

                    <div class="rf-chat-notice" id="rf-chat-notice" hidden></div>

                    <div class="rf-chat-log" id="rf-chat-log" role="log"
                        aria-live="polite" aria-relevant="additions text"></div>

                    <div class="rf-chat-suggestions" id="rf-chat-suggestions"
                        aria-label="Preguntas sugeridas"></div>

                    <form class="rf-chat-composer" id="rf-chat-form">
                        <label class="rf-chat-sr-only" for="rf-chat-input">Tu pregunta</label>
                        <textarea id="rf-chat-input" rows="1" maxlength="${MAX_MESSAGE}"
                            placeholder="Escribí tu pregunta..." autocomplete="off"
                            spellcheck="true"></textarea>
                        <button id="rf-chat-send" class="rf-chat-send" type="submit"
                            aria-label="Enviar pregunta" disabled>
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 11.5l16-7-4.2 16-4.1-6.1L4 11.5z" stroke="currentColor"
                                    stroke-width="1.5" stroke-linejoin="round"/>
                                <path d="M11.7 14.4L20 4.5" stroke="currentColor"
                                    stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </form>

                    <div class="rf-chat-foot">
                        <span id="rf-chat-counter">0 / ${MAX_MESSAGE}</span>
                        <span>IA · puede equivocarse</span>
                    </div>
                </section>
            `;

            document.body.appendChild(host);

            this.root = host;
            this.launcher = host.querySelector("#rf-chat-launcher");
            this.panel = host.querySelector("#rf-chat-panel");
            this.log = host.querySelector("#rf-chat-log");
            this.suggestions = host.querySelector("#rf-chat-suggestions");
            this.form = host.querySelector("#rf-chat-form");
            this.input = host.querySelector("#rf-chat-input");
            this.sendButton = host.querySelector("#rf-chat-send");
            this.counter = host.querySelector("#rf-chat-counter");
            this.notice = host.querySelector("#rf-chat-notice");
            this.statusDot = host.querySelector("#rf-chat-status-dot");
            this.statusText = host.querySelector("#rf-chat-status-text");

            this.renderSuggestions();
        }

        bind() {
            this.launcher.addEventListener("click", () => this.show());

            this.panel.querySelector("#rf-chat-close").addEventListener("click", () => this.close(true));

            this.form.addEventListener("submit", event => {
                event.preventDefault();
                this.send(this.input.value);
            });

            this.input.addEventListener("input", () => {
                this.autoGrow();
                this.updateSendState();
                this.updateCounter();
            });

            this.input.addEventListener("keydown", event => {
                if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
                    event.preventDefault();
                    this.form.requestSubmit();
                }
            });

            // Evita que p5 reciba las teclas mientras se escribe en el chat.
            for (const type of ["keydown", "keyup", "keypress"]) {
                this.panel.addEventListener(type, event => {
                    if (type === "keydown" && event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        this.close(true);
                        return;
                    }

                    event.stopPropagation();
                });
            }

            document.addEventListener("keydown", event => {
                if (!this.open)
                    return;

                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    this.close(true);
                    return;
                }

                if (!this.panel.contains(event.target))
                    event.stopPropagation();
            });

            for (const type of ["keyup", "keypress"]) {
                document.addEventListener(type, event => {
                    if (this.open && !this.panel.contains(event.target))
                        event.stopPropagation();
                });
            }

            window.addEventListener("resize", () => this.scrollToBottom());
        }

        renderSuggestions() {
            this.suggestions.replaceChildren();

            for (const suggestion of SUGGESTIONS) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "rf-chat-suggestion";
                button.textContent = suggestion;
                button.addEventListener("click", () => {
                    if (this.pending)
                        return;

                    this.input.value = "";
                    this.send(suggestion);
                });
                this.suggestions.appendChild(button);
            }
        }

        // -----------------------------------------------------------------
        // Visibilidad según la escena
        // -----------------------------------------------------------------

        isSceneAllowed() {
            if (typeof Scene === "undefined" || Scene.current === null)
                return false;

            const name = Scene.current.name;

            return typeof name === "string" && !HIDDEN_SCENES.has(name);
        }

        updateVisibility() {
            const allowed = this.isSceneAllowed();

            if (allowed === this.visible)
                return;

            this.visible = allowed;
            this.launcher.hidden = !allowed;

            if (!allowed)
                this.close(false);
        }

        show() {
            if (!this.visible || this.open)
                return;

            this.open = true;
            this.panel.hidden = false;
            this.panel.classList.add("is-open");
            this.launcher.setAttribute("aria-expanded", "true");
            this.launcher.classList.add("is-open");

            if (this.messages.length === 0)
                this.addMessage("assistant", WELCOME, { local: true });

            this.updateCounter();
            this.updateSendState();
            this.scrollToBottom();

            if (Date.now() - this.statusCheckedAt > 30000)
                this.refreshStatus();

            window.setTimeout(() => {
                if (this.open && !this.pending)
                    this.input.focus({ preventScroll: true });
            }, 40);
        }

        close(focusLauncher) {
            if (!this.open)
                return;

            this.open = false;
            this.panel.hidden = true;
            this.panel.classList.remove("is-open");
            this.launcher.setAttribute("aria-expanded", "false");
            this.launcher.classList.remove("is-open");

            if (focusLauncher && !this.launcher.hidden)
                this.launcher.focus({ preventScroll: true });
        }

        // -----------------------------------------------------------------
        // Estado del servidor
        // -----------------------------------------------------------------

        async refreshStatus() {
            this.statusCheckedAt = Date.now();

            try {
                const response = await fetch("/chat/status", { cache: "no-store" });

                if (!response.ok)
                    throw new Error(`HTTP ${response.status}`);

                const data = await response.json();

                if (data.configured) {
                    this.setStatus("EN LÍNEA", "online");
                    this.setNotice("");
                }
                else {
                    this.setStatus("SIN CONFIGURAR", "warn");
                    this.setNotice("El asistente no está configurado. Completá <code>chat.config.json</code> y reiniciá <code>node server.js</code>.");
                }
            }
            catch (error) {
                this.setStatus("SIN SERVIDOR", "off");
                this.setNotice("No pude conectar con el servidor del chat. Abrí el juego con <code>node server.js</code>.");
            }
        }

        setStatus(text, state) {
            this.statusText.textContent = text;
            this.statusDot.className = `rf-chat-status__dot is-${state}`;
        }

        setNotice(html) {
            if (!html) {
                this.notice.hidden = true;
                this.notice.innerHTML = "";
                return;
            }

            this.notice.innerHTML = html;
            this.notice.hidden = false;
        }

        // -----------------------------------------------------------------
        // Mensajes
        // -----------------------------------------------------------------

        addMessage(role, content, options = {}) {
            const message = {
                role,
                content: String(content).slice(0, 4000),
                local: options.local === true,
                error: options.error === true
            };

            this.messages.push(message);
            this.renderMessage(message);
            this.save();
            this.scrollToBottom();
        }

        renderMessage(message) {
            const row = document.createElement("div");
            row.className = `rf-chat-msg rf-chat-msg--${message.role}`;

            if (message.error)
                row.classList.add("rf-chat-msg--error");

            const bubble = document.createElement("div");
            bubble.className = "rf-chat-bubble";
            bubble.innerHTML = renderRich(message.content);

            row.appendChild(bubble);
            this.log.appendChild(row);
        }

        async send(rawText) {
            if (this.pending)
                return;

            const message = String(rawText || "").trim().slice(0, MAX_MESSAGE);

            if (message === "")
                return;

            this.addMessage("user", message);
            this.input.value = "";
            this.autoGrow();
            this.updateCounter();

            this.pending = true;
            this.updateSendState();
            this.showTyping();

            try {
                const data = await this.requestReply(message);

                this.hideTyping();
                this.addMessage("assistant", data.reply);
            }
            catch (error) {
                this.hideTyping();
                this.addMessage("assistant", friendlyError(error), { error: true, local: true });
            }
            finally {
                this.pending = false;
                this.updateSendState();

                if (this.open)
                    this.input.focus({ preventScroll: true });
            }
        }

        async requestReply(message) {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 45000);

            try {
                const response = await fetch("/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify({
                        message,
                        history: this.apiHistory(),
                        context: this.collectContext()
                    }),
                    signal: controller.signal
                });

                let data = null;

                try {
                    data = await response.json();
                }
                catch (error) {
                    data = null;
                }

                if (!response.ok || !data || typeof data.reply !== "string" || data.reply.trim() === "") {
                    const failure = new Error(
                        data && typeof data.error === "string"
                            ? data.error
                            : "No pude responder en este momento. Probá de nuevo."
                    );

                    failure.code = data && data.code ? data.code : "";
                    failure.status = response.status;
                    throw failure;
                }

                return data;
            }
            finally {
                window.clearTimeout(timer);
            }
        }

        showTyping() {
            this.hideTyping();

            const row = document.createElement("div");
            row.className = "rf-chat-msg rf-chat-msg--assistant rf-chat-msg--typing";
            row.setAttribute("aria-label", "RATCON está pensando");
            row.innerHTML = `
                <div class="rf-chat-bubble">
                    <span class="rf-chat-typing-label">RATCON está pensando</span>
                    <span class="rf-chat-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                </div>
            `;

            this.log.appendChild(row);
            this.typing = row;
            this.scrollToBottom();
        }

        hideTyping() {
            if (this.typing === null)
                return;

            this.typing.remove();
            this.typing = null;
        }

        apiHistory() {
            return this.messages
                .filter(message => !message.local && !message.error)
                .slice(-MAX_HISTORY)
                .map(message => ({ role: message.role, content: message.content }));
        }

        // -----------------------------------------------------------------
        // Contexto del juego
        // -----------------------------------------------------------------

        collectContext() {
            const context = {};

            try {
                if (typeof Scene !== "undefined" && Scene.current !== null)
                    context.scene = Scene.current.name;
            }
            catch (error) {
                // Sin escena disponible.
            }

            try {
                const user = typeof Game !== "undefined" && Game.instance
                    ? Game.instance.user
                    : null;

                if (user)
                    context.user = {
                        name: user.name,
                        highScore: user.highScore,
                        totalScore: user.totalScore,
                        gamesPlayed: user.gamesPlayed
                    };
            }
            catch (error) {
                // Sin usuario cargado.
            }

            try {
                if (typeof RobotLoadout !== "undefined") {
                    const stats = RobotLoadout.stats(RobotLoadout.load());

                    context.loadout = {
                        name: stats.name,
                        hp: stats.hp,
                        armor: stats.armor,
                        speed: stats.speed,
                        weight: stats.weight,
                        cpu: stats.cpu,
                        blocks: stats.blocks
                    };
                }
            }
            catch (error) {
                // Sin configuración de robot.
            }

            try {
                if (typeof GameLevels !== "undefined") {
                    const progress = GameLevels.loadProgress();

                    context.progress = {
                        completed: progress.completed.length,
                        total: GameLevels.LIST.length
                    };
                }
            }
            catch (error) {
                // Sin progreso guardado.
            }

            return context;
        }

        // -----------------------------------------------------------------
        // Composición y almacenamiento
        // -----------------------------------------------------------------

        autoGrow() {
            this.input.style.height = "auto";
            this.input.style.height = `${Math.min(this.input.scrollHeight, 96)}px`;
        }

        updateCounter() {
            this.counter.textContent = `${this.input.value.length} / ${MAX_MESSAGE}`;
        }

        updateSendState() {
            this.sendButton.disabled = this.pending || this.input.value.trim() === "";
            this.form.classList.toggle("is-busy", this.pending);
        }

        scrollToBottom() {
            window.requestAnimationFrame(() => {
                this.log.scrollTop = this.log.scrollHeight;
            });
        }

        restore() {
            try {
                const raw = window.sessionStorage.getItem(STORAGE_KEY);

                if (raw !== null) {
                    const stored = JSON.parse(raw);

                    if (Array.isArray(stored)) {
                        for (const item of stored.slice(-MAX_STORED)) {
                            if (item === null || typeof item !== "object")
                                continue;

                            if (item.role !== "user" && item.role !== "assistant")
                                continue;

                            if (typeof item.content !== "string" || item.content.trim() === "")
                                continue;

                            this.messages.push({
                                role: item.role,
                                content: item.content.slice(0, 4000),
                                local: item.local === true,
                                error: item.error === true
                            });
                        }
                    }
                }
            }
            catch (error) {
                this.messages = [];
            }

            for (const message of this.messages)
                this.renderMessage(message);

            this.updateCounter();
            this.updateSendState();
        }

        save() {
            try {
                const stored = this.messages
                    .slice(-MAX_STORED)
                    .map(message => ({
                        role: message.role,
                        content: message.content,
                        local: message.local,
                        error: message.error
                    }));

                window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            }
            catch (error) {
                // El chat sigue funcionando sin almacenamiento.
            }
        }
    }

    function boot() {
        if (document.getElementById("rf-chat-launcher") !== null)
            return;

        window.RFHelpChat = new HelpChatOverlay();
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    else
        boot();
})();

/* Clase porteada de otro proyecto personal en Lua a Javascript mediante ChatGPT */
class Animation {

    // Lista global de animaciones activas
    static animationList = [];

    constructor() {

        // Públicos
        this.loop = false;
        this.fps = 30;

        // Privados
        this._playing = false;
        this._id = -1;
        this._reverse = false;
        this._frameProcessed = false;
        this._currentFrame = 1;
        this._elapsedTime = 0.0;

        // En Lua:
        // self._frames = {len = 0}
        //
        // En JS usamos Map y mantenemos _framesLen
        // como equivalente de .len
        this._frames = new Map();
        this._framesLen = 0;

        this._pendingKeyframes = [];

        // Callbacks
        this.onResume = null;
        this.onFinish = null;
    }

    // =========================================================
    // Utilidades
    // =========================================================

    // Lua:
    // getFrame(self, inFrame)
    _getFrame(inFrame) {

        let frame = this._frames.get(inFrame);

        if (!frame) {

            frame = {
                keyframes: [],
                events: []
            };

            this._frames.set(inFrame, frame);
        }

        if (inFrame > this._framesLen) {
            this._framesLen = inFrame;
        }

        return frame;
    }

    // Lua:
    // firstFreeIndex()
    static _firstFreeIndex() {

        let i = 0;

        while (Animation.animationList[i] !== undefined) {
            i++;
        }

        return i;
    }

    // Lua:
    // isInterpolableValue(value)
    static _isInterpolableValue(value) {

        return typeof value === "number";
    }

    // =========================================================
    // Interpolaciones
    // =========================================================

    static lerp(start, final, t) {

        return start + (final - start) * t;
    }

    static easeInOut(start, final, t) {

        if (t < 0.5) {

            t = 2 * t * t;

        } else {

            t = -1 + (4 - 2 * t) * t;
        }

        return start + (final - start) * t;
    }

    static interpolationFunctions = {

        LINEAR: Animation.lerp,
        EASEINOUT: Animation.easeInOut

    };

    // =========================================================
    // Configuración
    // =========================================================

    setFrames(frames) {

        this._framesLen = frames;

        return this;
    }

    addKeyFrame(
        inFrame,
        target,
        property,
        value,
        interpolationType = "LINEAR"
    ) {

        const keyframe = {

            target: target,
            property: property,
            value: value,
            interpolationType: interpolationType,

            // Indica si ya se encontró el keyframe siguiente
            processed: false
        };

        const frame = this._getFrame(inFrame);

        frame.keyframes.push(keyframe);

        return this;
    }

    // =========================================================
    // Verificar si existe un keyframe
    // =========================================================

    _keyframeExists(
        inFrame,
        target,
        property,
        value,
        interpolation
    ) {

        const frame = this._getFrame(inFrame);

        for (const keyframe of frame.keyframes) {

            if (
                keyframe.target === target &&
                keyframe.property === property &&
                keyframe.value === value &&
                keyframe.interpolationType === interpolation
            ) {
                return true;
            }
        }

        return false;
    }

    // =========================================================
    // Crear una animación entre dos frames
    // =========================================================

    to(
        startFrame,
        endFrame,
        target,
        properties,
        interpolation
    ) {

        const isSameFrame =
            startFrame === endFrame;

        if (startFrame > endFrame) {

            throw new Error(
                "startFrame must be less than or equal to endFrame"
            );

        } else if (startFrame < 1) {

            throw new Error(
                "startFrame must be greater than or equal to 1"
            );

        } else if (isSameFrame) {

            interpolation = "NONE";
        }

        // En Lua pairs(properties)
        for (const [property, value] of Object.entries(properties)) {

            // En Lua:
            // if value == nil then
            //
            // Object.entries() no incluye propiedades undefined
            // normalmente, pero mantenemos la comprobación.
            if (value === undefined) {
                continue;
            }

            let initialValue;
            let finalValue;

            // Lua:
            //
            // if type(value) == "table" then
            //     initialValue = value.from
            //     finalValue = value.to
            //
            // En JS:
            // typeof value === "object"

            if (
                typeof value === "object" &&
                value !== null
            ) {

                initialValue = value.from;
                finalValue = value.to;

            } else {

                initialValue = target[property];
                finalValue = value;
            }

            // Mismo frame
            if (isSameFrame) {

                this.addKeyFrame(
                    endFrame,
                    target,
                    property,
                    finalValue,
                    interpolation
                );

            }

            // Ya existe el keyframe inicial
            else if (
                this._keyframeExists(
                    startFrame,
                    target,
                    property,
                    initialValue,
                    interpolation
                )
            ) {

                this.addKeyFrame(
                    endFrame,
                    target,
                    property,
                    finalValue,
                    interpolation
                );

            }

            // Crear ambos keyframes
            else {

                this.addKeyFrame(
                    startFrame,
                    target,
                    property,
                    initialValue,
                    interpolation
                );

                this.addKeyFrame(
                    endFrame,
                    target,
                    property,
                    finalValue,
                    interpolation
                );
            }
        }

        return this;
    }

    // =========================================================
    // Eventos
    // =========================================================

    addEvent(inFrame, func) {

        const frame = this._getFrame(inFrame);

        frame.events.push(func);

        return this;
    }

    // =========================================================
    // Buscar siguiente keyframe
    // =========================================================

    _findClosestKeyFrame(
        inCurrentFrame,
        inKeyFrame
    ) {

        // En Lua:
        //
        // local nextIndex = inCurrentFrame + 1
        // if nextIndex > self._frames.len then
        //     return
        // end

        const nextIndex =
            inCurrentFrame + 1;

        if (nextIndex > this._framesLen) {
            return null;
        }

        // Lua:
        // for i = inCurrentFrame + 1, self._frames.len do

        for (
            let i = inCurrentFrame + 1;
            i <= this._framesLen;
            i++
        ) {

            const frame =
                this._frames.get(i);

            if (!frame) {
                continue;
            }

            for (const keyframe of frame.keyframes) {

                if (
                    keyframe.target === inKeyFrame.target &&
                    keyframe.property === inKeyFrame.property &&
                    keyframe.interpolationType ===
                        inKeyFrame.interpolationType
                ) {

                    return {

                        target: inKeyFrame.target,

                        property:
                            inKeyFrame.property,

                        prev_value:
                            inKeyFrame.value,

                        next_value:
                            keyframe.value,

                        inFrame:
                            inCurrentFrame,

                        finishFrame:
                            i,

                        duration:
                            i - inCurrentFrame,

                        interpolationType:
                            keyframe.interpolationType
                    };
                }
            }
        }

        return null;
    }

    // =========================================================
    // Playback
    // =========================================================

    play() {

        if (this._playing) {
            return this;
        }

        this._playing = true;

        const index =
            Animation._firstFreeIndex();

        this._id = index;

        if (
            index >=
            Animation.animationList.length
        ) {

            Animation.animationList.length =
                index + 1;
        }

        if (this._currentFrame === -1) {

            this._currentFrame = 1;
            this._elapsedTime = 0.0;

        } else {

            if (this.onResume) {
                this.onResume();
            }
        }

        Animation.animationList[index] =
            this;

        return this;
    }

    stop() {

        if (!this._playing) {
            return this;
        }

        this._playing = false;

        Animation.animationList[this._id] =
            undefined;

        this._id = -1;

        this._currentFrame = -1;
        this._elapsedTime = 0.0;

        return this;
    }

    pause() {

        this._playing = false;

        if (this._id !== -1) {

            Animation.animationList[this._id] =
                undefined;
        }

        this._id = -1;

        return this;
    }

    isPlaying() {

        return this._playing;
    }

    // =========================================================
    // Procesar frame
    // =========================================================

    _processFrame(frame) {

        if (frame === undefined) {
            return;
        }

        // -----------------------------------------------------
        // Keyframes
        // -----------------------------------------------------

        for (const keyframe of frame.keyframes) {

            if (
                keyframe.interpolationType !== "NONE" &&
                Animation._isInterpolableValue(
                    keyframe.value
                ) &&
                !keyframe.processed
            ) {

                // Buscar el siguiente keyframe
                const pending =
                    this._findClosestKeyFrame(
                        this._currentFrame,
                        keyframe
                    );

                if (pending !== null) {

                    this._pendingKeyframes.push(
                        pending
                    );

                    keyframe.processed = true;
                }

            } else {

                // Asignación directa
                keyframe.target[
                    keyframe.property
                ] = keyframe.value;
            }
        }

        // -----------------------------------------------------
        // Eventos
        // -----------------------------------------------------

        for (const event of frame.events) {
            event();
        }
    }

    // =========================================================
    // Procesar interpolaciones pendientes
    // =========================================================

    _processPendingKeyframes(
        secondsPerFrame,
        currentTime
    ) {

        for (
            const pending of
            this._pendingKeyframes
        ) {

            if (
                this._currentFrame >=
                    pending.inFrame &&
                this._currentFrame <
                    pending.finishFrame
            ) {

                let t =
                    (
                        currentTime -
                        (
                            secondsPerFrame *
                            pending.inFrame
                        ) +
                        this._elapsedTime
                    ) /
                    (
                        secondsPerFrame *
                        pending.duration
                    );

                if (t > 1.0) {
                    t = 1.0;
                }

                const interpFunc =
                    Animation.interpolationFunctions[
                        pending.interpolationType
                    ];

                if (!interpFunc) {

                    throw new Error(
                        "Unknown interpolation type: " +
                        pending.interpolationType
                    );
                }

                pending.target[
                    pending.property
                ] =
                    interpFunc(
                        pending.prev_value,
                        pending.next_value,
                        t
                    );

            } else if (
                this._currentFrame >=
                pending.finishFrame
            ) {

                pending.target[
                    pending.property
                ] =
                    pending.next_value;
            }
        }
    }

    // =========================================================
    // Update
    // =========================================================

    _update(deltaTime) {

        // -----------------------------------------------------
        // Procesar frame actual
        // -----------------------------------------------------

        if (!this._frameProcessed) {

            this._processFrame(
                this._frames.get(
                    this._currentFrame
                )
            );

            this._frameProcessed = true;
        }

        // -----------------------------------------------------
        // Tiempo por frame
        // -----------------------------------------------------

        const secondsPerFrame =
            1 / this.fps;

        // -----------------------------------------------------
        // Tiempo actual expresado en segundos
        // -----------------------------------------------------

        const currentTime =
            secondsPerFrame *
            (this._currentFrame - 1);

        // -----------------------------------------------------
        // Interpolaciones
        // -----------------------------------------------------

        this._processPendingKeyframes(
            secondsPerFrame,
            currentTime
        );

        // -----------------------------------------------------
        // Acumular tiempo
        // -----------------------------------------------------

        this._elapsedTime += deltaTime;

        // -----------------------------------------------------
        // Avanzar frames
        // -----------------------------------------------------

        while (
            this._elapsedTime >=
            secondsPerFrame
        ) {

            this._elapsedTime -=
                secondsPerFrame;

            this._currentFrame++;

            this._frameProcessed = false;

            // -------------------------------------------------
            // Todavía estamos dentro de la animación
            // -------------------------------------------------

            if (
                this._currentFrame <=
                this._framesLen
            ) {

                // Esto es exactamente lo que hace Lua.
                if (
                    this._elapsedTime >=
                    secondsPerFrame
                ) {

                    const elapsedTime =
                        this._elapsedTime;

                    this._elapsedTime = 0.0;

                    this._processFrame(
                        this._frames.get(
                            this._currentFrame
                        )
                    );

                    this._processPendingKeyframes(
                        secondsPerFrame,
                        currentTime
                    );

                    this._elapsedTime =
                        elapsedTime;
                }

            }

            // -------------------------------------------------
            // Llegamos al final
            // -------------------------------------------------

            else {

                this._processFrame(
                    this._frames.get(
                        this._framesLen
                    )
                );

                this._processPendingKeyframes(
                    secondsPerFrame,
                    currentTime
                );

                // -------------------------------------------------
                // Loop
                // -------------------------------------------------

                if (this.loop) {

                    this._currentFrame = 1;
                    this._elapsedTime = 0.0;

                }

                // -------------------------------------------------
                // Finalizar
                // -------------------------------------------------

                else {

                    this.stop();

                    if (this.onFinish) {
                        this.onFinish();
                    }
                }

                break;
            }
        }
    }

    // =========================================================
    // Procesar todas las animaciones activas
    // =========================================================

    static process(deltaTime) {

        // Copia de la lista.
        //
        // Esto hace que si una animación se elimina
        // mientras estamos procesando la lista, no
        // rompamos la iteración.
        const animations =
            [...Animation.animationList];

        for (const anim of animations) {

            if (anim !== undefined) {

                anim._update(deltaTime);
            }
        }
    }
}
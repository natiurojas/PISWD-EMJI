class GameLevels {
    static STORAGE_KEY = "robotFight.levels.v1";

    static LIST = [
        {
            id: "wonderwall",
            number: 1,
            name: "ÓRBITA WONDERWALL",
            enemy: "WONDERWALL",
            image: "./Assets/Nivel1Wonderwall00.png",
            hp: 60,
            damage: 4,
            armor: 1,
            speed: 35,
            fireRate: 1.4,
            reward: 100,
            previewScale: 0.16,
            battleScale: 0.15,
            color: "#48E5D3",
            description: "Nave de reconocimiento. Movimientos lentos y disparos simples."
        },
        {
            id: "britney",
            number: 2,
            name: "CINTURÓN BRITNEY",
            enemy: "BRITNEY",
            image: "./Assets/Nivel2Britney00.png",
            hp: 95,
            damage: 7,
            armor: 3,
            speed: 55,
            fireRate: 1.1,
            reward: 200,
            previewScale: 0.32,
            battleScale: 0.28,
            color: "#A99BFF",
            description: "Caza rápido. Ataca con más frecuencia y resiste mejor los impactos."
        },
        {
            id: "vance",
            number: 3,
            name: "NÚCLEO VANCE",
            enemy: "VANCE",
            image: "./Assets/Nivel3Vance00.png",
            hp: 140,
            damage: 10,
            armor: 5,
            speed: 70,
            fireRate: 0.85,
            reward: 350,
            previewScale: 0.16,
            battleScale: 0.14,
            color: "#FFB86B",
            description: "Acorazado de asalto. Dispara rápido y tiene el blindaje más alto."
        }
    ];

    static list() {
        return GameLevels.LIST.slice();
    }

    static imagePaths() {
        return GameLevels.LIST.map(level => level.image);
    }

    static get(idOrIndex = null) {
        if (idOrIndex === null || idOrIndex === undefined)
            return GameLevels.LIST[0];

        if (typeof idOrIndex === "number")
            return GameLevels.LIST[idOrIndex] ?? GameLevels.LIST[0];

        return GameLevels.LIST.find(level => level.id === idOrIndex) ?? GameLevels.LIST[0];
    }

    static indexOf(id) {
        return GameLevels.LIST.findIndex(level => level.id === id);
    }

    static next(id) {
        const index = GameLevels.indexOf(id);

        if (index === -1 || index >= GameLevels.LIST.length - 1)
            return null;

        return GameLevels.LIST[index + 1];
    }

    static loadProgress() {
        try {
            const raw = localStorage.getItem(GameLevels.STORAGE_KEY);

            if (raw === null)
                return { completed: [] };

            const data = JSON.parse(raw);

            return {
                completed: Array.isArray(data.completed)
                    ? data.completed.filter(id => GameLevels.indexOf(id) !== -1)
                    : []
            };
        }
        catch (error) {
            return { completed: [] };
        }
    }

    static saveProgress(progress) {
        try {
            localStorage.setItem(
                GameLevels.STORAGE_KEY,
                JSON.stringify(progress)
            );

            return true;
        }
        catch (error) {
            console.warn(
                "GameLevels: no se pudo guardar el progreso.",
                error
            );

            return false;
        }
    }

    static isCompleted(id) {
        return GameLevels.loadProgress().completed.includes(id);
    }

    static isUnlocked(id) {
        const index = GameLevels.indexOf(id);

        if (index <= 0)
            return true;

        const previous = GameLevels.LIST[index - 1];

        return previous !== undefined && GameLevels.isCompleted(previous.id);
    }

    static complete(id) {
        if (GameLevels.indexOf(id) === -1)
            return false;

        const progress = GameLevels.loadProgress();

        if (!progress.completed.includes(id))
            progress.completed.push(id);

        return GameLevels.saveProgress(progress);
    }

    static resetProgress() {
        try {
            localStorage.removeItem(GameLevels.STORAGE_KEY);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}

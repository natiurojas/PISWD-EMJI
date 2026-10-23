class User {
    static VERSION = 1;
    static DB_KEY = "robotFight.users";
    static STORAGE_KEY = "robotFight.user";
    static MAX_SCORES = 100;

    constructor(name, data = null) {
        const source = data ?? {};

        this.id = typeof source.id === "string" && source.id.length > 0
            ? source.id
            : User._createId();

        this.name = User._normalizeName(name ?? source.name);
        this.createdAt = Number.isFinite(source.createdAt)
            ? source.createdAt
            : Date.now();
        this.updatedAt = Number.isFinite(source.updatedAt)
            ? source.updatedAt
            : this.createdAt;

        this.scores = User._sanitizeScores(source.scores);

        this._recalculate();
    }

    addScore(score) {
        const value = Number(score);

        if (!Number.isFinite(value))
            return false;

        this.scores.push(value);

        if (this.scores.length > User.MAX_SCORES)
            this.scores.splice(0, this.scores.length - User.MAX_SCORES);

        this.updatedAt = Date.now();
        this._recalculate();

        return true;
    }

    _recalculate() {
        this.gamesPlayed = this.scores.length;
        this.totalScore = this.scores.reduce(
            (total, score) => total + score,
            0
        );
        this.highScore = this.scores.length > 0
            ? Math.max(...this.scores)
            : 0;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            scores: this.scores.slice(),
            totalScore: this.totalScore,
            highScore: this.highScore,
            gamesPlayed: this.gamesPlayed
        };
    }

    static fromJSON(data) {
        if (data === null || typeof data !== "object")
            return null;

        const name = User._normalizeName(data.name);

        if (name.length === 0)
            return null;

        return new User(name, data);
    }

    static _createId() {
        return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    static _normalizeName(name) {
        return typeof name === "string" ? name.trim() : "";
    }

    static _nameKey(name) {
        return User._normalizeName(name).toLowerCase();
    }

    static _sanitizeScores(scores) {
        if (!Array.isArray(scores))
            return [];

        return scores
            .map(score => Number(score))
            .filter(score => Number.isFinite(score))
            .slice(-User.MAX_SCORES);
    }

    static _readDatabase() {
        const database = {
            version: User.VERSION,
            users: []
        };

        let raw = null;

        try {
            raw = localStorage.getItem(User.DB_KEY);
        }
        catch (error) {
            console.warn(
                "User: no se pudo abrir la base de datos.",
                error
            );
            return database;
        }

        if (raw !== null) {
            try {
                const data = JSON.parse(raw);
                const records = Array.isArray(data)
                    ? data
                    : (
                        data !== null && Array.isArray(data.users)
                            ? data.users
                            : []
                    );

                for (const record of records) {
                    const user = User.fromJSON(record);

                    if (user !== null)
                        database.users.push(user.toJSON());
                }
            }
            catch (error) {
                console.warn(
                    "User: la base de datos está dañada.",
                    error
                );
            }

            return database;
        }

        const legacy = User._readLegacyUser();

        if (legacy !== null) {
            database.users.push(legacy.toJSON());
            User._writeDatabase(database);
            User._setActiveName(legacy.name);
        }

        return database;
    }

    static _writeDatabase(database) {
        try {
            localStorage.setItem(
                User.DB_KEY,
                JSON.stringify(database)
            );

            return true;
        }
        catch (error) {
            console.warn(
                "User: no se pudo guardar la base de datos.",
                error
            );

            return false;
        }
    }

    static _readLegacyUser() {
        let raw = null;

        try {
            raw = localStorage.getItem(User.STORAGE_KEY);
        }
        catch (error) {
            return null;
        }

        if (raw === null || !raw.trim().startsWith("{"))
            return null;

        try {
            return User.fromJSON(JSON.parse(raw));
        }
        catch (error) {
            return null;
        }
    }

    static _readActiveName() {
        let raw = null;

        try {
            raw = localStorage.getItem(User.STORAGE_KEY);
        }
        catch (error) {
            return "";
        }

        if (raw === null)
            return "";

        if (raw.trim().startsWith("{")) {
            try {
                return User._normalizeName(JSON.parse(raw).name);
            }
            catch (error) {
                return "";
            }
        }

        return User._normalizeName(raw);
    }

    static _setActiveName(name) {
        try {
            localStorage.setItem(
                User.STORAGE_KEY,
                User._normalizeName(name)
            );

            return true;
        }
        catch (error) {
            console.warn(
                "User: no se pudo marcar el usuario activo.",
                error
            );

            return false;
        }
    }

    static _findIndex(database, user) {
        if (database.users.length === 0)
            return -1;

        const idIndex = database.users.findIndex(
            record => record.id === user.id
        );

        if (idIndex !== -1)
            return idIndex;

        const nameKey = User._nameKey(user.name);

        return database.users.findIndex(
            record => User._nameKey(record.name) === nameKey
        );
    }

    static save(user) {
        if (!(user instanceof User))
            user = User.fromJSON(user);

        if (user === null || user.name.length === 0)
            return false;

        const database = User._readDatabase();
        const index = User._findIndex(database, user);

        if (index === -1) {
            user.createdAt = Date.now();
            user.updatedAt = user.createdAt;
            database.users.push(user.toJSON());
        }
        else {
            const existing = User.fromJSON(database.users[index]);

            user.id = existing.id;
            user.createdAt = existing.createdAt;

            if (user.scores.length === 0 && existing.scores.length > 0) {
                user.scores = existing.scores.slice();
                user._recalculate();
            }

            user.updatedAt = Date.now();
            database.users[index] = user.toJSON();
        }

        if (!User._writeDatabase(database))
            return false;

        User._setActiveName(user.name);

        return true;
    }

    static load() {
        const database = User._readDatabase();

        if (database.users.length === 0)
            return null;

        const activeName = User._readActiveName();
        let record = null;

        if (activeName.length > 0) {
            const key = User._nameKey(activeName);

            record = database.users.find(
                user => User._nameKey(user.name) === key
            ) ?? null;
        }

        if (record === null) {
            record = database.users.reduce(
                (latest, user) => (
                    latest === null || user.updatedAt > latest.updatedAt
                        ? user
                        : latest
                ),
                null
            );
        }

        return User.fromJSON(record);
    }

    static loadAll() {
        return User._readDatabase().users
            .map(record => User.fromJSON(record))
            .filter(user => user !== null);
    }

    static find(name) {
        const key = User._nameKey(name);

        if (key.length === 0)
            return null;

        const record = User._readDatabase().users.find(
            user => User._nameKey(user.name) === key
        );

        return record === undefined ? null : User.fromJSON(record);
    }

    static login(name) {
        const existing = User.find(name);

        if (existing !== null) {
            User._setActiveName(existing.name);
            return existing;
        }

        const user = new User(name);

        if (!User.save(user))
            return null;

        return user;
    }

    static recordScore(score, name = null) {
        const database = User._readDatabase();
        const key = name === null
            ? User._nameKey(User._readActiveName())
            : User._nameKey(name);

        if (key.length === 0)
            return false;

        const index = database.users.findIndex(
            user => User._nameKey(user.name) === key
        );

        if (index === -1)
            return false;

        const user = User.fromJSON(database.users[index]);

        if (!user.addScore(score))
            return false;

        database.users[index] = user.toJSON();

        if (!User._writeDatabase(database))
            return false;

        User._setActiveName(user.name);

        return true;
    }

    static addScore(score, name = null) {
        return User.recordScore(score, name);
    }

    static getScores(name = null) {
        const user = name === null ? User.load() : User.find(name);

        return user === null ? [] : user.scores.slice();
    }

    static getHighScore(name = null) {
        const user = name === null ? User.load() : User.find(name);

        return user === null ? 0 : user.highScore;
    }

    static getTotalScore(name = null) {
        const user = name === null ? User.load() : User.find(name);

        return user === null ? 0 : user.totalScore;
    }

    static getGamesPlayed(name = null) {
        const user = name === null ? User.load() : User.find(name);

        return user === null ? 0 : user.gamesPlayed;
    }

    static getRanking() {
        return User.loadAll()
            .sort(
                (a, b) => (
                    b.highScore - a.highScore ||
                    b.totalScore - a.totalScore ||
                    a.name.localeCompare(b.name)
                )
            )
            .map(user => ({
                id: user.id,
                name: user.name,
                highScore: user.highScore,
                totalScore: user.totalScore,
                gamesPlayed: user.gamesPlayed
            }));
    }

    static remove(name) {
        const key = User._nameKey(name);

        if (key.length === 0)
            return false;

        const database = User._readDatabase();
        const index = database.users.findIndex(
            user => User._nameKey(user.name) === key
        );

        if (index === -1)
            return false;

        const removed = database.users.splice(index, 1)[0];

        if (!User._writeDatabase(database))
            return false;

        if (User._nameKey(User._readActiveName()) === User._nameKey(removed.name)) {
            try {
                localStorage.removeItem(User.STORAGE_KEY);
            }
            catch (error) {
                console.warn(
                    "User: no se pudo borrar el usuario activo.",
                    error
                );
            }
        }

        return true;
    }

    static exists() {
        return User.load() !== null;
    }

    static clear() {
        try {
            localStorage.removeItem(User.STORAGE_KEY);
            return true;
        }
        catch (error) {
            console.warn(
                "User.clear(): no se pudo borrar el usuario activo.",
                error
            );

            return false;
        }
    }

    static clearAll() {
        try {
            localStorage.removeItem(User.DB_KEY);
            localStorage.removeItem(User.STORAGE_KEY);
            return true;
        }
        catch (error) {
            console.warn(
                "User.clearAll(): no se pudo borrar la base de datos.",
                error
            );

            return false;
        }
    }
}

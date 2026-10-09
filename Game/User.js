class User {
    static STORAGE_KEY = "robotFight.user";

    constructor(name) {
        this.name = name;
        this.createdAt = Date.now();
    }

    toJSON() {
        return {
            name: this.name,
            createdAt: this.createdAt
        };
    }

    static save(user) {
        try {
            localStorage.setItem(
                User.STORAGE_KEY,
                JSON.stringify(user.toJSON())
            );

            return true;
        }
        catch (error) {
            console.warn(
                "User.save(): no se pudo guardar el usuario.",
                error
            );

            return false;
        }
    }

    static load() {
        try {
            const raw = localStorage.getItem(User.STORAGE_KEY);

            if (raw === null)
                return null;

            const data = JSON.parse(raw);

            if (
                data === null ||
                typeof data.name !== "string" ||
                data.name.trim().length === 0
            )
                return null;

            const user = new User(data.name);
            user.createdAt = data.createdAt ?? Date.now();

            return user;
        }
        catch (error) {
            console.warn(
                "User.load(): no se pudo leer el usuario.",
                error
            );

            return null;
        }
    }

    static exists() {
        return User.load() !== null;
    }

    static clear() {
        try {
            localStorage.removeItem(User.STORAGE_KEY);
        }
        catch (error) {
            console.warn(
                "User.clear(): no se pudo borrar el usuario.",
                error
            );
        }
    }
}

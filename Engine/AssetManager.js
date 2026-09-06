class AssetManager {

    static images = {};

    static loadImage(path) {
        // Ya está cargada.
        if (this.images[path] !== undefined) {
            return Promise.resolve(this.images[path]);
        }

        return new Promise((resolve, reject) => {
            loadImage(
                path,

                image => {
                    this.images[path] = image;
                    resolve(image);
                },

                () => {
                    reject(
                        new Error(
                            `Failed to load image '${path}'.`
                        )
                    );
                }
            );
        });
    }


    static async preload(resources) {
        const promises = [];
        for (const resource of resources) {
            // Por ahora solamente imágenes.
            promises.push(
                this.loadImage(resource)
            );
        }
        await Promise.all(promises);
    }

    static getImage(path) {
        return this.images[path] ?? null;
    }
}
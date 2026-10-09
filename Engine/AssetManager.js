class AssetManager {

    static images = {};
    static fonts = {};

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


    static loadFont(path) {
        if (this.fonts[path] !== undefined) return Promise.resolve(this.fonts[path]);
        return new Promise((resolve, reject) => {
            loadFont(path, font => { this.fonts[path] = font; resolve(font); },
                () => reject(new Error(`Failed to load font '${path}'.`)));
        });
    }

    static getImage(path) {
        return this.images[path] ?? null;
    }

    static getFont(path) {
        return this.fonts[path] ?? null;
    }

    static isImage(path) {
        return path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".jpeg");
    }

    static isFont(path) {
        return path.endsWith(".ttf") || path.endsWith(".otf");
    }

    static async preload(resources) {
        const promises = [];
        for (const resource of resources) {
            if(AssetManager.isImage(resource)) {
                promises.push(this.loadImage(resource));
            }
            else {
                promises.push(this.loadFont(resource))
            }
        }
        await Promise.all(promises);
    }
}
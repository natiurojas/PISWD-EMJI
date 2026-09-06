class Color {
    constructor(r = 255, g = 255, b = 255, a = 255) {
        if (typeof r === "string") {
            const parsed = Color.parse(r);
            this.r = parsed.r;
            this.g = parsed.g;
            this.b = parsed.b;
            this.a = parsed.a;
            return;
        }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    static parse(value) {
        value = value.trim().toLowerCase();
        if (value.startsWith("#")) {
            let hex = value.substring(1);
            // #RGB
            if (hex.length === 3) {

                return new Color(
                    parseInt(hex[0] + hex[0], 16),
                    parseInt(hex[1] + hex[1], 16),
                    parseInt(hex[2] + hex[2], 16),
                    255
                );
            }
            // #RGBA
            if (hex.length === 4) {

                return new Color(
                    parseInt(hex[0] + hex[0], 16),
                    parseInt(hex[1] + hex[1], 16),
                    parseInt(hex[2] + hex[2], 16),
                    parseInt(hex[3] + hex[3], 16)
                );
            }
            // #RRGGBB
            if (hex.length === 6) {
                return new Color(
                    parseInt(hex.substring(0, 2), 16),
                    parseInt(hex.substring(2, 4), 16),
                    parseInt(hex.substring(4, 6), 16),
                    255
                );
            }
            // #RRGGBBAA
            if (hex.length === 8) {
                return new Color(
                    parseInt(hex.substring(0, 2), 16),
                    parseInt(hex.substring(2, 4), 16),
                    parseInt(hex.substring(4, 6), 16),
                    parseInt(hex.substring(6, 8), 16)
                );
            }

            throw new TypeError(
                `Color: invalid hexadecimal color '${value}'.`
            );
        }
        // Sino, intentamos parsearlo desde el nombre de color
        const colors = {
            black:   [0, 0, 0],
            white:   [255, 255, 255],
            red:     [255, 0, 0],
            green:   [0, 128, 0],
            blue:    [0, 0, 255],
            yellow:  [255, 255, 0],
            cyan:    [0, 255, 255],
            magenta: [255, 0, 255],
            gray:    [128, 128, 128],
            grey:    [128, 128, 128],
            orange:  [255, 165, 0],
            purple:  [128, 0, 128],
            pink:    [255, 192, 203],
            brown:   [165, 42, 42],
            transparent: [0, 0, 0, 0]
        };
        if(colors[value] !== undefined) {
            const color = colors[value];
            return new Color(
                color[0],
                color[1],
                color[2],
                color[3] ?? 255
            );
        }
        else {
            return new Color(255, 255, 255, 255);
        }
    }

    clone() {

        return new Color(
            this.r,
            this.g,
            this.b,
            this.a
        );
    }
}

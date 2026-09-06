class RAssemblyLexer {

    constructor(source) {
        this.source = source;
        this.position = 0;
        this.line = 1;
        this.tokens = [];
    }

    tokenize() {

        while (!this.isAtEnd()) {

            this.skipWhitespace();

            if (this.isAtEnd())
                break;

            const c = this.peek();

            // Comentarios
            if (c === '#') {
                this.skipComment();
                continue;
            }

            // String
            if (c === '"') {
                this.readString();
                continue;
            }

            // Número
            if (this.isDigit(c)) {
                this.readNumber();
                continue;
            }

            // Identificador / palabra reservada
            if (this.isAlpha(c)) {
                this.readIdentifier();
                continue;
            }

            // Operadores
            if (this.readOperator())
                continue;

            throw new SyntaxError(
                `RASSEMBLY: carácter inesperado '${c}' en línea ${this.line}.`
            );
        }

        this.tokens.push({
            type: "EOF",
            value: null,
            line: this.line
        });

        return this.tokens;
    }

    isAtEnd() {
        return this.position >= this.source.length;
    }

    peek() {
        return this.source[this.position];
    }

    advance() {
        return this.source[this.position++];
    }

    skipWhitespace() {

        while (!this.isAtEnd()) {

            const c = this.peek();

            if (c === '\n') {
                this.line++;
                this.position++;
            }
            else if (
                c === ' ' ||
                c === '\t' ||
                c === '\r'
            ) {
                this.position++;
            }
            else {
                break;
            }
        }
    }

    skipComment() {

        while (
            !this.isAtEnd() &&
            this.peek() !== '\n'
        ) {
            this.position++;
        }
    }

    readString() {

        const line = this.line;

        this.advance(); // "
        let value = "";

        while (!this.isAtEnd() && this.peek() !== '"' ) {
            if (this.peek() === '\n')
                this.line++;
            value += this.advance();
        }
        if(this.isAtEnd()) {
            throw new SyntaxError(`RASSEMBLY: string sin cerrar en línea ${line}.`);
        }

        this.advance(); // "

        this.tokens.push({
            type: "STRING",
            value,
            line
        });
    }

    readNumber() {

        const line = this.line;
        let value = "";

        while (
            !this.isAtEnd() &&
            this.isDigit(this.peek())
        ) {
            value += this.advance();
        }

        if (
            !this.isAtEnd() &&
            this.peek() === '.' &&
            this.isDigit(this.source[this.position + 1])
        ) {

            value += this.advance();

            while (
                !this.isAtEnd() &&
                this.isDigit(this.peek())
            ) {
                value += this.advance();
            }
        }

        this.tokens.push({
            type: "NUMBER",
            value: Number(value),
            line
        });
    }

    readIdentifier() {

        const line = this.line;
        let value = "";

        while (
            !this.isAtEnd() &&
            this.isAlphaNumeric(this.peek())
        ) {
            value += this.advance();
        }

        const keywords = {

            "IMPORTAR": "IMPORT",
            "VAR": "VAR",

            "SI": "IF",
            "ENTONCES": "THEN",
            "SINO": "ELSE",

            "MIENTRAS": "WHILE",
            "HACER": "DO",

            "FIN": "END",

            "LLAMAR": "CALL",

            "Y": "AND",
            "O": "OR",
            "NO": "NOT",

            "VERDADERO": "TRUE",
            "FALSO": "FALSE"
        };

        this.tokens.push({
            type: keywords[value] ?? "IDENTIFIER",
            value,
            line
        });
    }

    readOperator() {

        const line = this.line;

        const operators = [
            ["==", "EQUAL"],
            ["!=", "NOT_EQUAL"],
            [">=", "GTE"],
            ["<=", "LTE"],
            [">", "GT"],
            ["<", "LT"],

            // Matemática
            ["+", "PLUS"],
            ["-", "MINUS"],
            ["*", "MULTIPLY"],
            ["/", "DIVIDE"],

            // Asignación
            ["=", "ASSIGN"]
        ];

        for (const [symbol, type] of operators) {

            if (
                this.source.startsWith(
                    symbol,
                    this.position
                )
            ) {

                this.position += symbol.length;

                this.tokens.push({
                    type,
                    value: symbol,
                    line
                });

                return true;
            }
        }

        return false;
    }

    isDigit(c) {
        return c >= '0' && c <= '9';
    }

    isAlpha(c) {
        return (
            (c >= 'a' && c <= 'z') ||
            (c >= 'A' && c <= 'Z') ||
            c === '_'
        );
    }

    isAlphaNumeric(c) {
        return (
            this.isAlpha(c) ||
            this.isDigit(c)
        );
    }
}

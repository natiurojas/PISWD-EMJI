class RAssemblyParser {

    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    parse() {

        const body = [];

        while (!this.check("EOF")) {
            body.push(this.statement());
        }

        return {
            type: "PROGRAM",
            body
        };
    }

    statement() {

        // IMPORTAR "Modulo"
        if (this.match("IMPORT")) {
            return this.importStatement();
        }

        // VAR variable = expresión
        if (this.match("VAR")) {
            return this.variableDeclaration();
        }

        // variable = expresión
        if (this.check("IDENTIFIER") && this.checkNext("ASSIGN")) {
            return this.assignment();
        }

        // LLAMAR Modulo
        if (this.match("CALL")) {
            return this.callStatement();
        }

        // SI ...
        if (this.match("IF")) {
            return this.ifStatement();
        }

        // MIENTRAS ...
        if (this.match("WHILE")) {
            return this.whileStatement();
        }

        throw this.error(
            `Sentencia inesperada '${this.peek().value}'.`
        );
    }

    // Genera instrucciones para importar un modulo
    importStatement() {

        const module = this.consume(
            "STRING",
            "Se esperaba el nombre del módulo."
        );

        return {
            type: "IMPORT",
            module: module.value
        };
    }

    // Genera instrucciones para la declaracion de una variable.
    variableDeclaration() {

        const name = this.consume(
            "IDENTIFIER",
            "Se esperaba el nombre de la variable."
        );
        this.consume(
            "ASSIGN",
            "Se esperaba '=' después del nombre de la variable."
        );
        
        const value = this.expression();

        return {
            type: "VAR",
            name: name.value,
            value
        };
    }

    // Genera instrucciones para indicar que se esta asignando Variable
    assignment() {

        const name = this.consume(
            "IDENTIFIER",
            "Se esperaba el nombre de la variable."
        );

        this.consume(
            "ASSIGN",
            "Se esperaba '='."
        );

        const value = this.expression();

        return {
            type: "ASSIGN",
            name: name.value,
            value
        };
    }

    callStatement() {

        const module = this.consume(
            "IDENTIFIER",
            "Se esperaba el nombre del módulo."
        );

        return {
            type: "CALL",
            module: module.value
        };
    }

    ifStatement() {

        const condition = this.expression();

        this.consume(
            "THEN",
            "Se esperaba 'ENTONCES'."
        );

        const thenBody = this.blockUntil("ELSE", "END"); 
        let elseBody = null;
        if(this.match("ELSE"))
            elseBody = this.blockUntil("END");

        this.consume(
            "END",
            "Se esperaba 'FIN'."
        );

        return {
            type: "IF",
            condition,
            thenBody,
            elseBody
        };
    }

    whileStatement() {
        const condition = this.expression();
        

        this.consume(
            "DO",
            "Se esperaba 'HACER'."
        );

        const body = this.blockUntil("END");

        this.consume(
            "END",
            "Se esperaba 'FIN'."
        );

        return {
            type: "WHILE",
            condition,
            body
        };
    }

    blockUntil(...endTokens) {
        const statements = [];
        while(!endTokens.some(token => this.check(token)) && !this.check("EOF")) {
            statements.push(this.statement());
        }

        if(this.check("EOF")) 
            throw this.error(`Se esperaba '${endTokens.join("' o '")}'.`);

        return statements;
    }

    expression() {
        return this.or();
    }

    or() {

        let expression = this.and();

        while (this.match("OR")) {

            const right = this.and();

            expression = {
                type: "BINARY",
                operator: "OR",
                left: expression,
                right
            };
        }

        return expression;
    }

    and() {

        let expression = this.equality();

        while (this.match("AND")) {

            const right = this.equality();

            expression = {
                type: "BINARY",
                operator: "AND",
                left: expression,
                right
            };
        }

        return expression;
    }

    equality() {

        let expression = this.comparison();

        while (
            this.match("EQUAL", "NOT_EQUAL")
        ) {

            const operator = this.previous().type;

            const right = this.comparison();

            expression = {
                type: "BINARY",
                operator,
                left: expression,
                right
            };
        }

        return expression;
    }

    comparison() {

        let expression = this.term();

        while (
            this.match(
                "GT",
                "GTE",
                "LT",
                "LTE"
            )
        ) {

            const operator = this.previous().type;

            const right = this.term();

            expression = {
                type: "BINARY",
                operator,
                left: expression,
                right
            };
        }

        return expression;
    }

    term() {

        let expression = this.factor();

        while (
            this.match(
                "PLUS",
                "MINUS"
            )
        ) {

            const operator = this.previous().type;

            const right = this.factor();

            expression = {
                type: "BINARY",
                operator,
                left: expression,
                right
            };
        }

        return expression;
    }

    factor() {

        let expression = this.unary();

        while(
            this.match(
                "MULTIPLY",
                "DIVIDE"
            )
        ) {

            const operator = this.previous().type;

            const right = this.unary();

            expression = {
                type: "BINARY",
                operator,
                left: expression,
                right
            };
        }

        return expression;
    }

    unary() {

        if (this.match("MINUS")) {

            return {
                type: "UNARY",
                operator: "NEGATE",
                right: this.unary()
            };
        }

        if (this.match("NOT")) {

            return {
                type: "UNARY",
                operator: "NOT",
                right: this.unary()
            };
        }

        return this.primary();
    }

    primary() {

        if (this.match("NUMBER")) {

            return {
                type: "LITERAL",
                value: this.previous().value
            };
        }

        if (this.match("STRING")) {

            return {
                type: "LITERAL",
                value: this.previous().value
            };
        }

        if (this.match("TRUE")) {

            return {
                type: "LITERAL",
                value: true
            };
        }

        if (this.match("FALSE")) {

            return {
                type: "LITERAL",
                value: false
            };
        }

        if (this.match("IDENTIFIER")) {

            return {
                type: "VARIABLE",
                name: this.previous().value
            };
        }

        if (this.match("LPAREN")) {

            const expression = this.expression();

            this.consume(
                "RPAREN",
                "Se esperaba ')'."
            );

            return expression;
        }

        throw this.error(
            "Se esperaba una expresión."
        );
    }

    // =========================
    // UTILIDADES
    // =========================

    match(...types) {

        for (const type of types) {

            if (this.check(type)) {

                this.advance();

                return true;
            }
        }

        return false;
    }

    consume(type, message) {

        if (this.check(type)) {
            return this.advance();
        }

        throw this.error(message);
    }

    check(type) {

        return this.peek().type === type;
    }

    checkNext(type) {

        if (this.pos + 1 >= this.tokens.length)
            return false;

        return this.tokens[this.pos + 1].type === type;
    }

    advance() {

        if (!this.check("EOF"))
            this.pos++;

        return this.previous();
    }

    peek() {
        return this.tokens[this.pos];
    }

    previous() {
        return this.tokens[this.pos - 1];
    }

    error(message) {

        return new Error(
            `RASSEMBLY Parser: ${message}`
        );
    }
}

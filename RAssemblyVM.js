class RAssemblyVM {

    constructor(robot = null) {

        this.robot = robot;

        this.variables = {};
        this.modules = {};

        this.program = null;

        // Pila de ejecucion.
        // Cada elemento representa un bloque que estamos ejecutando.
        this.executionStack = [];

        this.running = false;

        this.instructionsPerFrame = 10;

        this.maxInstructions = 100000;

        this.executedInstructions = 0;
    }

    /* <--- Modulos ---> */

    registerModule(name, callback) {
        this.modules[name] = callback;
    }

    // Lanza un error si el modulo no existe
    importModule(statement) {
        if(this.modules[statement.module] === undefined)
            throw new Error(`RASSEMBLY: El módulo '${statement.module}' no existe.`);
    }

    callModule(name) {

        const module = this.modules[name];
        if(typeof module !== "function")
            throw new Error(`RASSEMBLY: El módulo '${name}' no existe.`);

        module(this.robot, this);
    }

    /* <--- Cargar el programa ---> */

    load(program) {

        this.program = program;

        this.executionStack = [
            {
                statements: program.body,
                ip: 0 // En que instruccion nos encontramos.
            }
        ];
        this.executedInstructions = 0;
        this.running = true;
    }

    /* <--- para ejecutar el programa ---> */

    // Ejecuta todas las instrucciones sin pausas(bloquea el juego)
    execute(program) {

        this.load(program);

        while(this.running) {

            this.update();
        }
    }

    // Ejecuta un par de instrucciones(Evita bloquear el juego)
    update() {
        if (!this.running || !this.program)
            return;

        let instructions = 0;
        while(this.running && instructions < this.instructionsPerFrame) {
            this.step();
            instructions++;
            this.executedInstructions++;

            if(this.executedInstructions > this.maxInstructions) {
                this.running = false;
                throw new Error("RASSEMBLY: se excedio el máximo de instrucciones.");
            }
        }
    }

    // Avanza y ejecuta una instruccion(un "paso" o step)
    step() {

        if (!this.running)
            return;

        if(this.executionStack.length === 0) {
            this.running = false;
            return;
        }

        const frame = this.executionStack[this.executionStack.length - 1];
        
        // Para el "WHILE" o "MIENTRAS"
        if (frame.type === "WHILE") {

            // Terminamos una iteracion.
            if (frame.ip >= frame.statements.length) {
                frame.iterations++;
                // Comprobamos si capaz estamos en un bucle infinito
                if (frame.iterations > this.maxInstructions) {
                    this.running = false;
                    throw new Error("RASSEMBLY: posible bucle infinito.");
                }
                // Volvemos a evaluar la condición.
                if(this.evaluate(frame.condition))
                    frame.ip = 0;
                else
                    this.executionStack.pop();

                return;
            }
        }
        // Bloque de codigo normal
        if(frame.ip >= frame.statements.length)
        {
            this.executionStack.pop();
            return;
        }

        const statement =frame.statements[frame.ip];
        frame.ip++;

        this.executeStatement(statement);
    }


    executeStatement(statement) {

        switch (statement.type) {

            case "IMPORT":
                this.importModule(statement);
                break;
            case "VAR":
                this.variables[statement.name] = this.evaluate(statement.value);
                break;
            case "ASSIGN":
                if(!this.hasVariable(statement.name))
                    throw new Error(`RASSEMBLY: La variable '${statement.name}' no existe.`);
                this.variables[statement.name] = this.evaluate(statement.value);
                break;
            case "CALL":
                this.callModule(statement.module);
                break;
            case "IF":
                if (this.evaluate(statement.condition))
                    this.pushBlock(statement.body);
                break;
            case "WHILE":
                this.startWhile(statement);
                break;
            default:
                throw new Error(`RASSEMBLY: sentencia desconocida '${statement.type}'.`);
        }
    }

    /* <--- Para bloques de codigo ---> */

    pushBlock(statements) {

        this.executionStack.push({
            type: "BLOCK",
            statements,
            ip: 0
        });
    }

    startWhile(statement) {
        if(this.evaluate(statement.condition))
        {
            this.executionStack.push({
                type: "WHILE",
                statements: statement.body,
                ip: 0,
                condition: statement.condition,
                iterations: 0
            });
        }
    }

    /* Expresiones */

    evaluate(expression) {
        switch (expression.type) {
            case "LITERAL":
                return expression.value;
            case "VARIABLE":
                if(!this.hasVariable(expression.name))
                    throw new Error(`RASSEMBLY: La variable '${expression.name}' no existe.`);
                return this.getVariable(
                    expression.name
                );
            case "UNARY": {
                const right = this.evaluate(expression.right);
                switch(expression.operator)
                {
                    case "NEGATE":
                        return -right;
                    case "NOT":
                        return !right;
                }
                break;
            }
            case "BINARY":
                return this.evaluateBinary(expression);
        }
        throw new Error("RASSEMBLY: expresion inválida.");
    }

    evaluateBinary(expression) {
        const left =
            this.evaluate(expression.left);
        const right = this.evaluate(expression.right);
        switch(expression.operator) {
            case "PLUS":
                return left + right;
            case "MINUS":
                return left - right;
            case "MULTIPLY":
                return left * right;
            case "DIVIDE":
                if(right === 0)
                    throw new Error("RASSEMBLY: división por cero.");
                return left / right;
            case "EQUAL":
                return left === right;
            case "NOT_EQUAL":
                return left !== right;
            case "GT": // "Greater Than" o Mayor que: >
                return left > right;
            case "GTE": // "Greater Than Equal" o Mayor Igual que: >=
                return left >= right;
            case "LT": // "Lower Than" o Menor que <
                return left < right;
            case "LTE": // "Lower Than Equal" o Menor Igual que: <=
                return left <= right;
            case "AND": // Operador logico AND: "Y" en RAssembly
                return Boolean(left && right);
            case "OR": // Operador logico OR: "O" en RAssembly
                return Boolean(left || right);
        }
        throw new Error(`RASSEMBLY: operador desconocido '${expression.operator}'.`);
    }

    /* <--- Variables ---> */

    getVariable(name) {
        if(!this.hasVariable(name))
            throw new Error(`RASSEMBLY: La variable '${name}' no existe.`);

        return this.variables[name];
    }

    setVariable(name, value) {

        this.variables[name] = value;
    }

    hasVariable(name) {
        return this.variables[name] !== undefined;
    }
}

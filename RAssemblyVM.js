class RAssemblyVM {

    constructor(robot = null) {

        this.robot = robot;

        this.variables = new Map();
        this.modules = new Map();

        this.program = null;

        // Pila de ejecución.
        //
        // Cada elemento representa un bloque que estamos ejecutando.
        //
        // Ejemplo:
        //
        // [
        //     {
        //         statements: program.body,
        //         ip: 5
        //     }
        // ]
        //
        this.executionStack = [];

        this.running = false;

        this.instructionsPerFrame = 10;

        this.maxInstructions = 100000;

        this.executedInstructions = 0;
    }

    // =========================
    // MÓDULOS
    // =========================

    registerModule(name, callback) {

        this.modules.set(
            name,
            callback
        );
    }

    importModule(statement) {

        if (!this.modules.has(statement.module)) {

            throw new Error(
                `RASSEMBLY: El módulo '${statement.module}' no existe.`
            );
        }
    }

    callModule(name) {

        const module = this.modules.get(name);

        if (!module) {

            throw new Error(
                `RASSEMBLY: El módulo '${name}' no existe.`
            );
        }

        module(this.robot, this);
    }

    // =========================
    // CARGAR PROGRAMA
    // =========================

    load(program) {

        this.program = program;

        this.executionStack = [
            {
                statements: program.body,
                ip: 0
            }
        ];

        this.executedInstructions = 0;

        this.running = true;
    }

    // =========================
    // EJECUTAR
    // =========================

    execute(program) {

        this.load(program);

        while (this.running) {
            this.update();
        }
    }

    // =========================
    // UPDATE
    // =========================

    update() {

        if (!this.running || !this.program)
            return;

        let instructions = 0;

        while (
            this.running &&
            instructions < this.instructionsPerFrame
        ) {

            this.step();

            instructions++;

            this.executedInstructions++;

            if (
                this.executedInstructions >
                this.maxInstructions
            ) {

                this.running = false;

                throw new Error(
                    "RASSEMBLY: se excedió el máximo de instrucciones."
                );
            }
        }
    }

    // =========================
    // STEP
    // =========================

    step() {

    if (!this.running)
        return;

    if (this.executionStack.length === 0) {

        this.running = false;

        return;
    }

    const frame =
        this.executionStack[
            this.executionStack.length - 1
        ];

    // =========================
    // WHILE
    // =========================

    if (frame.type === "WHILE") {

        // Terminamos una iteración.
        if (
            frame.ip >=
            frame.statements.length
        ) {

            frame.iterations++;

            if (
                frame.iterations >
                this.maxInstructions
            ) {

                this.running = false;

                throw new Error(
                    "RASSEMBLY: posible bucle infinito."
                );
            }

            // Volvemos a evaluar la condición.
            if (
                this.evaluate(
                    frame.condition
                )
            ) {

                frame.ip = 0;

            } else {

                this.executionStack.pop();
            }

            return;
        }
    }

    // =========================
    // BLOQUE NORMAL
    // =========================

    if (
        frame.ip >=
        frame.statements.length
    ) {

        this.executionStack.pop();

        return;
    }

    const statement =
        frame.statements[frame.ip];

    frame.ip++;

    this.executeStatement(statement);
}

    // =========================
    // SENTENCIAS
    // =========================

    executeStatement(statement) {

        switch (statement.type) {

            case "IMPORT":

                this.importModule(statement);

                break;


            case "VAR":

                this.variables.set(
                    statement.name,
                    this.evaluate(statement.value)
                );

                break;


            case "ASSIGN":

                if (
                    !this.variables.has(
                        statement.name
                    )
                ) {

                    throw new Error(
                        `RASSEMBLY: La variable '${statement.name}' no existe.`
                    );
                }

                this.variables.set(
                    statement.name,
                    this.evaluate(statement.value)
                );

                break;


            case "CALL":

                this.callModule(
                    statement.module
                );

                break;


            case "IF":

                if (
                    this.evaluate(
                        statement.condition
                    )
                ) {

                    this.pushBlock(
                        statement.body
                    );
                }

                break;


            case "WHILE":

                this.startWhile(statement);

                break;


            default:

                throw new Error(
                    `RASSEMBLY: sentencia desconocida '${statement.type}'.`
                );
        }
    }

    // =========================
    // BLOQUES
    // =========================

    pushBlock(statements) {

        this.executionStack.push({

            type: "BLOCK",

            statements,

            ip: 0
        });
    }

    // =========================
    // IF
    // =========================

    // El IF simplemente mete su bloque en la pila.
    //
    // Si hay:
    //
    // IF condition THEN
    //     CALL A
    //     CALL B
    // END
    //
    // CALL A será una instrucción.
    // CALL B será otra instrucción.
    //
    // Por lo tanto, si instructionsPerFrame = 1:
    //
    // Frame 1 -> IF
    // Frame 2 -> CALL A
    // Frame 3 -> CALL B
    //
    // =========================


    // =========================
    // WHILE
    // =========================

    startWhile(statement) {

        if (
            this.evaluate(
                statement.condition
            )
        ) {

            this.executionStack.push({

                type: "WHILE",

                statements: statement.body,

                ip: 0,

                condition: statement.condition,

                iterations: 0
            });

        }
    }

    // =========================
    // EXPRESIONES
    // =========================

    evaluate(expression) {

        switch (expression.type) {

            case "LITERAL":

                return expression.value;


            case "VARIABLE":

                if (
                    !this.variables.has(
                        expression.name
                    )
                ) {

                    throw new Error(
                        `RASSEMBLY: La variable '${expression.name}' no existe.`
                    );
                }

                return this.variables.get(
                    expression.name
                );


            case "UNARY": {

                const right =
                    this.evaluate(
                        expression.right
                    );

                switch (expression.operator) {

                    case "NEGATE":
                        return -right;

                    case "NOT":
                        return !right;
                }

                break;
            }


            case "BINARY":

                return this.evaluateBinary(
                    expression
                );
        }

        throw new Error(
            "RASSEMBLY: expresión inválida."
        );
    }

    evaluateBinary(expression) {

        const left =
            this.evaluate(expression.left);

        const right =
            this.evaluate(expression.right);

        switch (expression.operator) {

            case "PLUS":
                return left + right;

            case "MINUS":
                return left - right;

            case "MULTIPLY":
                return left * right;

            case "DIVIDE":

                if (right === 0) {

                    throw new Error(
                        "RASSEMBLY: división por cero."
                    );
                }

                return left / right;


            case "EQUAL":
                return left === right;

            case "NOT_EQUAL":
                return left !== right;

            case "GT":
                return left > right;

            case "GTE":
                return left >= right;

            case "LT":
                return left < right;

            case "LTE":
                return left <= right;

            case "AND":
                return Boolean(left && right);

            case "OR":
                return Boolean(left || right);
        }

        throw new Error(
            `RASSEMBLY: operador desconocido '${expression.operator}'.`
        );
    }

    // =========================
    // VARIABLES
    // =========================

    getVariable(name) {

        if (!this.variables.has(name)) {

            throw new Error(
                `RASSEMBLY: La variable '${name}' no existe.`
            );
        }

        return this.variables.get(name);
    }

    setVariable(name, value) {

        this.variables.set(
            name,
            value
        );
    }

    hasVariable(name) {

        return this.variables.has(name);
    }
}

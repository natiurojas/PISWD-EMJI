class RAssemblyRobot extends Node {

    constructor(source = "") {

        super();

        this.name = "RAssemblyRobot";

        this.source = source;

        this.vm =
            new RAssemblyVM(this);
    }

    // Compila el codigo recibido
    compile() {
        const lexer = new RAssemblyLexer(this.source);
        // Convertimos el codigo fuente a Tokens.
        const tokens = lexer.tokenize();
        console.log(tokens);
        const parser = new RAssemblyParser(tokens);
        // Parseamos lo tokens generados.
        const program = parser.parse();
        // Cargamos en la VM el programa generado
        this.vm.load(program);
    }

    tick(deltaTime) {
        this.vm.update();
    }

    registerModule(name, callback) {
        this.vm.registerModule(
            name,
            callback
        );
    }

    getVariable(name) {
        return this.vm.getVariable(name);
    }

    setVariable(name, value) {
        this.vm.setVariable(name, value);
    }

    hasVariable(name) {
        return this.vm.hasVariable(name);
    }
}

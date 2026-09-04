class RAssemblyRobot extends Node {

    constructor(source = "") {

        super();

        this.name = "RAssemblyRobot";

        this.source = source;

        this.vm =
            new RAssemblyVM(this);
    }

    compile() {

        const lexer =
            new RAssemblyLexer(
                this.source
            );

        const tokens =
            lexer.tokenize();
        console.log(tokens);
        const parser =
            new RAssemblyParser(
                tokens
            );
        
        const program =
            parser.parse();

        this.vm.load(program);
    }

    tick(deltaTime) {
        this.vm.update();
        let x = this._pos.x;
        let y = this._pos.y;
        if(this.hasVariable("robotX"))
            x = this.getVariable("robotX");
        if(this.hasVariable("robotY"))
            y = this.getVariable("robotY");
        this.setPosition(new Vector2(x, y));
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

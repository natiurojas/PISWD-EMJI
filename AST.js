class RAssemblyNode {
    constructor(type) {
        this.type = type;
    }
}

class ProgramNode extends RAssemblyNode {
    constructor(statements) {
        super("Program");
        this.statements = statements;
    }
}

class ImportNode extends RAssemblyNode {
    constructor(module) {
        super("Import");
        this.module = module;
    }
}

class VariableDeclarationNode extends RAssemblyNode {
    constructor(name, expression) {
        super("VariableDeclaration");
        this.name = name;
        this.expression = expression;
    }
}

class AssignmentNode extends RAssemblyNode {
    constructor(name, expression) {
        super("Assignment");
        this.name = name;
        this.expression = expression;
    }
}

class CallNode extends RAssemblyNode {
    constructor(name) {
        super("Call");
        this.name = name;
    }
}

class IfNode extends RAssemblyNode {
    constructor(condition, body, elseBody) {
        super("If");

        this.condition = condition;
        this.body = body;
        this.elseBody = elseBody;
    }
}

class WhileNode extends RAssemblyNode {
    constructor(condition, body) {
        super("While");

        this.condition = condition;
        this.body = body;
    }
}

class BinaryExpressionNode extends RAssemblyNode {
    constructor(left, operator, right) {
        super("BinaryExpression");

        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

class LiteralNode extends RAssemblyNode {
    constructor(value) {
        super("Literal");
        this.value = value;
    }
}

class IdentifierNode extends RAssemblyNode {
    constructor(name) {
        super("Identifier");
        this.name = name;
    }
}

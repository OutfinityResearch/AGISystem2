/**
 * AGISystem2 - Abstract Syntax Tree Nodes
 * @module parser/ast
 */

/**
 * Base AST Node
 */
export class ASTNode {
  constructor(type, line, column) {
    this.type = type;
    this.line = line;
    this.column = column;
  }
}

/**
 * Program node - root of AST
 */
export class Program extends ASTNode {
  constructor(statements) {
    super('Program', 1, 1);
    this.statements = statements;
  }
}

/**
 * Statement with destination label
 * @dest operator arg1 arg2 ...           - temporary (scope only)
 * @dest:persistName operator arg1 arg2 ... - persistent (added to KB)
 */
export class Statement extends ASTNode {
  constructor(destination, operator, args, line, column, persistName = null) {
    super('Statement', line, column);
    this.destination = destination; // string or null - variable name in scope
    this.persistName = persistName; // string or null - if set, add to KB
    this.operator = operator;       // Expression
    this.args = args;               // Expression[]
  }

  /** Whether this statement should be added to KB */
  get isPersistent() {
    return this.persistName !== null;
  }

  toString() {
    let dest = '';
    if (this.destination) {
      // @var or @var:name
      dest = this.persistName ? `@${this.destination}:${this.persistName} ` : `@${this.destination} `;
    } else if (this.persistName) {
      // @:name (KB-only, no local variable)
      dest = `@:${this.persistName} `;
    }
    const args = this.args.map(a => a.toString()).join(' ');
    return `${dest}${this.operator.toString()} ${args}`.trim();
  }
}

/**
 * Expression node - can be identifier, literal, hole, or compound
 */
export class Expression extends ASTNode {
  constructor(type, value, line, column) {
    super(type, line, column);
    this.value = value;
  }
}

/**
 * Identifier expression (atom name)
 */
export class Identifier extends Expression {
  constructor(name, line, column) {
    super('Identifier', name, line, column);
    this.name = name;
  }

  toString() {
    return this.name;
  }
}

/**
 * Hole expression (?variable)
 */
export class Hole extends Expression {
  constructor(name, line, column) {
    super('Hole', name, line, column);
    this.name = name;
  }

  toString() {
    return `?${this.name}`;
  }
}

/**
 * Reference expression ($label)
 */
export class Reference extends Expression {
  constructor(name, line, column) {
    super('Reference', name, line, column);
    this.name = name;
  }

  toString() {
    return `$${this.name}`;
  }
}

/**
 * Literal expression (number or string)
 */
export class Literal extends Expression {
  constructor(value, literalType, line, column) {
    super('Literal', value, line, column);
    this.literalType = literalType; // 'number' | 'string'
  }

  toString() {
    if (this.literalType === 'string') {
      return `"${this.value}"`;
    }
    return String(this.value);
  }
}

/**
 * Compound expression (nested parenthesized structure)
 * (operator arg1 arg2 ...)
 */
export class Compound extends Expression {
  constructor(operator, args, line, column) {
    super('Compound', null, line, column);
    this.operator = operator;
    this.args = args;
  }

  toString() {
    const args = this.args.map(a => a.toString()).join(' ');
    return `(${this.operator.toString()} ${args})`;
  }
}

/**
 * List expression [item1, item2, ...]
 */
export class List extends Expression {
  constructor(items, line, column) {
    super('List', items, line, column);
    this.items = items;
  }

  toString() {
    return `[${this.items.map(i => i.toString()).join(', ')}]`;
  }
}

/**
 * Theory block
 * Primary:    @Name theory <geometry> <init> ... end
 * Alternative: theory Name [ statements ]
 */
export class TheoryDeclaration extends ASTNode {
  constructor(name, statements, line, column, options = {}) {
    super('TheoryDeclaration', line, column);
    this.name = name;
    this.statements = statements;
    this.geometry = options.geometry || null;      // number or null (use default)
    this.initType = options.initType || 'deterministic'; // 'deterministic' | 'random'
    this.useBracketSyntax = options.useBracketSyntax || false; // true if [ ] form was used
  }
}

/**
 * Graph declaration (formerly Macro)
 * Creates a graph of HDC point relationships
 *
 * @name:persistName graph param1 param2 ...
 *   body statements
 *   return $result
 * end
 */
export class GraphDeclaration extends ASTNode {
  constructor(name, persistName, params, body, returnExpr, line, column) {
    super('GraphDeclaration', line, column);
    this.name = name;           // Graph name (from @name)
    this.persistName = persistName; // Persist name (from @name:persist)
    this.params = params;       // Parameter names (string[])
    this.body = body;           // Body statements (Statement[])
    this.returnExpr = returnExpr; // Return expression (Expression or null)
  }

  toString() {
    let dest;
    if (this.name) {
      // @name or @name:persist
      dest = this.persistName ? `@${this.name}:${this.persistName}` : `@${this.name}`;
    } else if (this.persistName) {
      // @:persist (KB-only, no local variable)
      dest = `@:${this.persistName}`;
    } else {
      dest = '@_'; // fallback
    }
    const params = this.params.join(' ');
    return `${dest} graph ${params} ... end`;
  }
}

// Alias for backward compatibility (deprecated)
export const MacroDeclaration = GraphDeclaration;

/**
 * Solve block for CSP problems
 * @solutions solve ProblemType ... end
 */
export class SolveBlock extends ASTNode {
  constructor(destination, problemType, declarations, line, column) {
    super('SolveBlock', line, column);
    this.destination = destination;
    this.problemType = problemType;
    this.declarations = declarations;
  }

  toString() {
    const decls = this.declarations.map(d => d.toString()).join('\n  ');
    return `@${this.destination} solve ${this.problemType}\n  ${decls}\nend`;
  }
}

/**
 * Solve declaration within solve block
 * varName kind source
 */
export class SolveDeclaration extends ASTNode {
  constructor(varName, kind, source, line, column) {
    super('SolveDeclaration', line, column);
    this.varName = varName;
    this.kind = kind;
    this.source = source;
  }

  toString() {
    return `${this.varName} ${this.kind} ${this.source}`;
  }
}

export default {
  ASTNode,
  Program,
  Statement,
  Expression,
  Identifier,
  Hole,
  Reference,
  Literal,
  Compound,
  List,
  TheoryDeclaration,
  GraphDeclaration,
  MacroDeclaration, // deprecated alias
  SolveBlock,
  SolveDeclaration
};

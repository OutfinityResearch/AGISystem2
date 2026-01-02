# Module: src/parser/ast.mjs

**Purpose:** Abstract Syntax Tree node definitions for Sys2DSL.

## Exports

```javascript
export class ASTNode { type; line; column; }
export class Program extends ASTNode { statements: Statement[]; }
export class Statement extends ASTNode {
  destination: string | null;
  operator: Expression;
  args: Expression[];
  toString(): string;
}
export class Expression extends ASTNode { value: any; }
export class Identifier extends Expression { name: string; }
export class Hole extends Expression { name: string; }
export class Reference extends Expression { name: string; }
export class Literal extends Expression { value: any; literalType: string; }
export class Compound extends Expression { operator: Expression; args: Expression[]; }
export class List extends Expression { items: Expression[]; }
export class TheoryDeclaration extends ASTNode { name: string; statements: Statement[]; }
```

## Dependencies

None.

## Test Cases

- All node types can be instantiated
- toString() produces readable output
- Line/column tracking works

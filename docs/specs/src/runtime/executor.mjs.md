# Module: src/runtime/executor.mjs

**Purpose:** Execute AST statements, building hypervectors and updating KB.

## Exports

```javascript
export class ExecutionError extends Error { node: ASTNode; }

export class Executor {
  constructor(session: Session)
  async executeProgram(program: Program): Promise<ExecutionResult>
  async executeStatement(stmt: Statement): Promise<StatementResult>
  buildStatementVector(stmt: Statement): Vector
  resolveExpression(expr: Expression): Vector
}

interface ExecutionResult {
  success: boolean;
  results: StatementResult[];
  errors: Error[];
}
```

## Algorithm

```
buildStatementVector(stmt):
  opVec = resolve(stmt.operator)
  for i, arg in stmt.args:
    argVec = resolve(arg)
    positioned = withPosition(i+1, argVec)
    opVec = bind(opVec, positioned)
  return opVec
```

## Dependencies

- `../core/vector.mjs`
- `../core/operations.mjs`
- `../core/position.mjs`
- `../parser/ast.mjs`

## Test Cases

- Execute simple statement
- Handle holes in expressions
- Throw on undefined references

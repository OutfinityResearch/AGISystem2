import { Statement, Identifier } from '../parser/ast.mjs';

export function extractCompoundCondition(executor, expr, stmtMap) {
  if (expr.type === 'Reference') {
    const stmt = stmtMap.get(expr.name);
    if (stmt) {
      const op = executor.extractName(stmt.operator);
      if (op === 'And' || op === 'Or') {
        const parts = stmt.args.map(arg => {
          const nested = extractCompoundCondition(executor, arg, stmtMap);
          if (nested) return nested;
          return { type: 'leaf', vector: executor.resolveExpression(arg) };
        });
        return { type: op, parts };
      }
    }
  }
  return null;
}

export function trackRulesFromProgram(executor, program) {
  const stmtMap = new Map();
  for (const stmt of program.statements) {
    if (stmt.destination) {
      stmtMap.set(stmt.destination, stmt);
    }
  }

  for (const stmt of program.statements) {
    const opName = executor.extractName(stmt.operator);
    if (opName === 'Implies' && stmt.args.length >= 2) {
      const condVec = executor.resolveExpression(stmt.args[0]);
      const concVec = executor.resolveExpression(stmt.args[1]);
      const conditionParts = extractCompoundCondition(executor, stmt.args[0], stmtMap);

      executor.session.rules.push({
        name: stmt.destination,
        vector: executor.buildStatementVector(stmt),
        source: stmt.toString(),
        condition: condVec,
        conclusion: concVec,
        conditionParts
      });
    }
  }
}


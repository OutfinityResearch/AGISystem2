/**
 * Session rule extraction helpers.
 * Split out of session.mjs to keep Session focused and small.
 */

import { createHash } from 'node:crypto';

export function initOperators(session) {
  const reserved = ['Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists'];
  for (const op of reserved) {
    session.operators.set(op, session.vocabulary.getOrCreate(op));
  }
}

function exprSignature(expr) {
  if (!expr) return 'null';

  // Statements may appear as referenced AST nodes; ignore destination/persistName.
  if (expr.type === 'Statement') {
    const op = exprSignature(expr.operator);
    const args = Array.isArray(expr.args) ? expr.args.map(exprSignature).join(' ') : '';
    return `${op} ${args}`.trim();
  }

  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'Hole') return `?${expr.name}`;
  if (expr.type === 'Reference') return `@${expr.name}`;

  if (expr.type === 'Literal') {
    if (expr.literalType === 'string') return JSON.stringify(expr.value);
    return String(expr.value);
  }

  // Compound: (op arg1 arg2 ...)
  if (expr.type === 'Compound') {
    const op = exprSignature(expr.operator);
    const args = Array.isArray(expr.args) ? expr.args.map(exprSignature).join(' ') : '';
    return `(${op}${args ? ` ${args}` : ''})`;
  }

  // Lists, declarations, or unknown nodes.
  if (typeof expr.toString === 'function') return expr.toString();
  return String(expr);
}

function stableHash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function extractOperatorName(stmt) {
  if (!stmt?.operator) return null;
  return stmt.operator.name || stmt.operator.value || null;
}

export function resolveReferenceToAST(expr, stmtMap) {
  if (expr.type === 'Reference') {
    const stmt = stmtMap.get(expr.name);
    if (stmt) return stmt;
  }
  return expr;
}

export function extractVariables(ast, vars = []) {
  if (!ast) return vars;

  if (ast.type === 'Hole') {
    if (!vars.includes(ast.name)) vars.push(ast.name);
    return vars;
  }

  if (ast.type === 'Statement') {
    if (ast.operator) extractVariables(ast.operator, vars);
    if (ast.args) {
      for (const arg of ast.args) extractVariables(arg, vars);
    }
    return vars;
  }

  if (ast.args) {
    for (const arg of ast.args) extractVariables(arg, vars);
  }

  return vars;
}

function extractVariablesDeep(ast, stmtMap, vars = [], visited = new Set()) {
  if (!ast) return vars;

  if (ast.type === 'Hole') {
    if (!vars.includes(ast.name)) vars.push(ast.name);
    return vars;
  }

  if (ast.type === 'Reference') {
    const key = ast.name;
    if (visited.has(key)) return vars;
    visited.add(key);
    const stmt = stmtMap.get(key);
    if (stmt) extractVariablesDeep(stmt, stmtMap, vars, visited);
    return vars;
  }

  if (ast.type === 'Statement') {
    if (ast.operator) extractVariablesDeep(ast.operator, stmtMap, vars, visited);
    if (ast.args) {
      for (const arg of ast.args) extractVariablesDeep(arg, stmtMap, vars, visited);
    }
    return vars;
  }

  if (ast.type === 'Compound') {
    if (ast.operator) extractVariablesDeep(ast.operator, stmtMap, vars, visited);
    if (ast.args) {
      for (const arg of ast.args) extractVariablesDeep(arg, stmtMap, vars, visited);
    }
    return vars;
  }

  if (ast.args) {
    for (const arg of ast.args) extractVariablesDeep(arg, stmtMap, vars, visited);
  }

  return vars;
}

/**
 * Recursively extract compound condition (And/Or/Not) and preserve AST for unification.
 */
export function extractCompoundCondition(session, expr, stmtMap) {
  if (expr.type !== 'Reference') return null;

  const stmt = stmtMap.get(expr.name);
  if (!stmt) return null;

  const op = extractOperatorName(stmt);
  if (op === 'And' || op === 'Or') {
    const parts = stmt.args.map(arg => {
      const nested = extractCompoundCondition(session, arg, stmtMap);
      if (nested) return nested;

      const resolvedAST = resolveReferenceToAST(arg, stmtMap);
      return {
        type: 'leaf',
        vector: session.executor.resolveExpression(arg),
        ast: resolvedAST
      };
    });
    return { type: op, parts };
  }

  if (op === 'Not' && stmt.args?.length === 1) {
    const inner = extractCompoundCondition(session, stmt.args[0], stmtMap);
    if (inner) return { type: 'Not', inner };

    const resolvedAST = resolveReferenceToAST(stmt.args[0], stmtMap);
    return {
      type: 'Not',
      inner: {
        type: 'leaf',
        vector: session.executor.resolveExpression(stmt.args[0]),
        ast: resolvedAST
      }
    };
  }

  return null;
}

export function trackRules(session, ast) {
  const stmtMap = new Map();
  for (const stmt of ast.statements) {
    if (stmt.destination) stmtMap.set(stmt.destination, stmt);
  }

  for (const stmt of ast.statements) {
    const operatorName = (extractOperatorName(stmt) || '').toLowerCase();
    if (operatorName !== 'implies' || stmt.args.length < 2) continue;

    const condVec = session.executor.resolveExpression(stmt.args[0]);
    const concVec = session.executor.resolveExpression(stmt.args[1]);
    const conditionParts = extractCompoundCondition(session, stmt.args[0], stmtMap);

    const conditionAST = resolveReferenceToAST(stmt.args[0], stmtMap);
    const conclusionAST = resolveReferenceToAST(stmt.args[1], stmtMap);

    const conditionVars = extractVariablesDeep(conditionAST, stmtMap);
    const conclusionVars = extractVariablesDeep(conclusionAST, stmtMap);
    const hasVariables = conditionVars.length > 0 || conclusionVars.length > 0;

    const signature = `Implies ${exprSignature(conditionAST)} => ${exprSignature(conclusionAST)}`;
    const id = `rule_${stableHash(signature)}`;

    session.rules.push({
      id,
      name: stmt.destination,
      label: stmt.destination || stmt.persistName || id,
      signature,
      vector: session.executor.buildStatementVector(stmt),
      source: stmt.toString(),
      condition: condVec,
      conclusion: concVec,
      conditionParts,
      conditionAST,
      conclusionAST,
      conditionVars,
      conclusionVars,
      hasVariables
    });
  }
}

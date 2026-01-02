import { bindAll, bundle } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import { Statement, Identifier, Hole, Reference, Literal, List, Compound } from '../parser/ast.mjs';
import { ExecutionError } from './execution-error.mjs';
import { canonicalizeTokenName } from './canonicalize.mjs';

export function buildStatementVector(executor, stmt) {
  const operatorName = executor.extractName(stmt.operator);
  const operatorVec = resolveExpression(executor, stmt.operator);

  const positionedArgs = [];
  for (let i = 0; i < stmt.args.length; i++) {
    const arg = stmt.args[i];
    // `Not ( ... )` uses a Compound as a *quoted statement*, not as a graph invocation.
    // If we resolve the Compound normally, we may expand graphs/macros (e.g. `isA`) and
    // collapse distinct inner statements into identical vectors, breaking negation proof,
    // cycle detection, and reference metadata alignment.
    const argVec = (operatorName === 'Not' && i === 0 && (arg instanceof Compound || arg?.type === 'Compound'))
      ? buildStatementVector(executor, new Statement(null, arg.operator, arg.args, null, arg.line, arg.column))
      : resolveExpression(executor, arg);
    positionedArgs.push(withPosition(i + 1, argVec, executor.session));
  }

  if (positionedArgs.length === 0) return operatorVec;
  return bindAll(operatorVec, ...positionedArgs);
}

export function resolveExpression(executor, expr) {
  if (expr instanceof Identifier || expr.type === 'Identifier') {
    return resolveIdentifier(executor, expr);
  }
  if (expr instanceof Hole || expr.type === 'Hole') {
    return resolveHole(executor, expr);
  }
  if (expr instanceof Reference || expr.type === 'Reference') {
    return resolveReference(executor, expr);
  }
  if (expr instanceof Literal || expr.type === 'Literal') {
    return resolveLiteral(executor, expr);
  }
  if (expr instanceof List || expr.type === 'List') {
    return resolveList(executor, expr);
  }
  if (expr instanceof Compound || expr.type === 'Compound') {
    return resolveCompound(executor, expr);
  }

  throw new ExecutionError(`Unknown expression type: ${expr.type}`, expr);
}

export function resolveIdentifier(executor, expr) {
  if (executor.session.scope.has(expr.name)) {
    return executor.session.scope.get(expr.name);
  }

  const isReserved =
    executor.session?.operators?.has?.(expr.name) ||
    expr.name === 'Load' ||
    expr.name === 'Unload' ||
    expr.name === 'induce' ||
    expr.name === 'bundle' ||
    expr.name === 'synonym' ||
    expr.name === 'canonical' ||
    expr.name === 'alias' ||
    expr.name === 'Default' ||
    expr.name === 'Exception' ||
    expr.name === 'mutuallyExclusive';

  const name = (executor.session?.canonicalizationEnabled && !isReserved)
    ? canonicalizeTokenName(executor.session, expr.name)
    : expr.name;

  // Strict typing: type markers must be declared explicitly (typically via `config/Packs/Bootstrap/00-types.sys2`).
  // This catches silent creation of "FooType" atoms via vocabulary fallback.
  if (
    executor.session?.strictMode &&
    // Only enforce for parser-produced identifiers; internal resolution (e.g., KB indexing)
    // uses plain objects and should not make theory loading fail mid-statement.
    (expr instanceof Identifier) &&
    /^[A-Za-z_][A-Za-z0-9_]*Type$/.test(name) &&
    !executor.session.scope.has(name) &&
    !executor.session.vocabulary.has(name)
  ) {
    throw new ExecutionError(`Unknown type marker "${name}" (strict mode)`, expr);
  }

  // If canonicalization rewrites the token to a name that is already bound in scope,
  // prefer that canonical binding (e.g., @Closed:Closed __State) instead of creating
  // a new vocabulary atom for the same surface form. This keeps learn() rollback
  // truly atomic and avoids vector duplication for declared tokens.
  if (name !== expr.name && executor.session.scope.has(name)) {
    return executor.session.scope.get(name);
  }

  return executor.session.vocabulary.getOrCreate(name, {
    source: expr?.source || null,
    comment: 'Created from a DSL identifier reference.'
  });
}

export function resolveHole(executor, expr) {
  const holeName = `__HOLE_${expr.name}__`;
  return executor.session.vocabulary.getOrCreate(holeName, {
    source: expr?.source || null,
    comment: 'Created for a query hole (?x) during DSL parsing/execution.'
  });
}

export function resolveReference(executor, expr) {
  const vec = executor.session.scope.get(expr.name);
  if (!vec) {
    throw new ExecutionError(`Undefined reference: @${expr.name}`, expr);
  }
  return vec;
}

export function resolveLiteral(executor, expr) {
  const strValue = String(expr.value);
  return executor.session.vocabulary.getOrCreate(strValue, {
    source: expr?.source || null,
    comment: 'Created from a DSL literal token.'
  });
}

export function resolveList(executor, expr) {
  if (expr.items.length === 0) {
    return executor.session.vocabulary.getOrCreate('__EMPTY_LIST__', {
      source: expr?.source || null,
      comment: 'Empty list constant created from [] (List) in DSL.'
    });
  }
  const itemVectors = expr.items.map(item => resolveExpression(executor, item));
  return bundle(itemVectors);
}

export function resolveCompound(executor, expr) {
  const operatorName = executor.extractName(expr.operator);
  const isGraph = executor.session.graphs?.has(operatorName) ||
                  executor.session.graphAliases?.has(operatorName);

  if (isGraph) {
    const result = executor.expandGraph(operatorName, expr.args, expr);
    if (result) return result;
  }

  const tempStmt = new Statement(
    null,
    expr.operator,
    expr.args,
    null,
    expr.line,
    expr.column
  );
  return buildStatementVector(executor, tempStmt);
}

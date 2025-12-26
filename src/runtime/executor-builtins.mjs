import { bind, bundle, similarity, topKSimilar } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import { ExecutionError } from './execution-error.mjs';
import { BOOTSTRAP_OPERATORS } from './operator-declarations.mjs';

function asNumberLike(text) {
  if (text === null || text === undefined) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function argVector(executor, node) {
  return executor.resolveExpression(node);
}

function listItems(node) {
  if (!node) return null;
  if (node.type === 'List' && Array.isArray(node.items)) return node.items;
  if (node.items && Array.isArray(node.items)) return node.items;
  return null;
}

function newVectorToken(session, suffix) {
  const id = (session._newVectorCounter = (session._newVectorCounter || 0) + 1);
  return `__NV_${suffix}_${id}__`;
}

function executeNewVector(executor, stmt) {
  const { session } = executor;
  const args = stmt.args || [];
  if (args.length === 0) {
    // Deterministic per session: stable ordering for a given program execution.
    const token = newVectorToken(session, 'session');
    return session.vocabulary.getOrCreate(token);
  }

  const name = executor.resolveNameFromNode(args[0]);
  const theory = args.length >= 2 ? executor.resolveNameFromNode(args[1]) : 'default';
  if (!name) {
    throw new ExecutionError('___NewVector requires a name string', stmt);
  }
  const token = `__NV_${String(theory)}__${String(name)}__`;
  return session.vocabulary.getOrCreate(token);
}

function executeBind(executor, stmt) {
  const args = stmt.args || [];
  if (args.length === 0) {
    throw new ExecutionError('___Bind requires at least 1 argument', stmt);
  }
  if (args.length === 1) {
    return argVector(executor, args[0]);
  }
  let out = argVector(executor, args[0]);
  for (let i = 1; i < args.length; i++) {
    out = bind(out, argVector(executor, args[i]));
  }
  return out;
}

function executeBundle(executor, stmt) {
  const args = stmt.args || [];
  if (args.length === 0) {
    return executor.session.vocabulary.getOrCreate('__EMPTY_BUNDLE__');
  }
  if (args.length === 1) {
    // If called with a list expression, bundle its elements; else identity.
    const items = listItems(args[0]);
    if (items) {
      if (items.length === 0) return executor.session.vocabulary.getOrCreate('__EMPTY_BUNDLE__');
      return bundle(items.map(n => argVector(executor, n)));
    }
    return argVector(executor, args[0]);
  }

  return bundle(args.map(n => argVector(executor, n)));
}

function executeBundlePositioned(executor, stmt) {
  const args = stmt.args || [];
  if (args.length === 0) {
    return executor.session.vocabulary.getOrCreate('__EMPTY_BUNDLE__');
  }

  // Preferred: a literal list expression.
  const items = listItems(args[0]);
  if (items) {
    if (items.length === 0) return executor.session.vocabulary.getOrCreate('__EMPTY_BUNDLE__');
    const positioned = items.map((item, idx) => withPosition(idx + 1, argVector(executor, item)));
    return bundle(positioned);
  }

  // Fallback: treat as a normal bundle.
  if (args.length === 1) return argVector(executor, args[0]);
  const positioned = args.map((item, idx) => withPosition(idx + 1, argVector(executor, item)));
  return bundle(positioned);
}

function executeSimilarity(executor, stmt) {
  const args = stmt.args || [];
  if (args.length < 2) {
    throw new ExecutionError('___Similarity requires 2 arguments', stmt);
  }
  const sim = similarity(argVector(executor, args[0]), argVector(executor, args[1]));
  // Represent numbers as canonical literal tokens (current runtime uses string stamping for numbers).
  return executor.session.vocabulary.getOrCreate(String(sim));
}

function executeMostSimilar(executor, stmt) {
  const args = stmt.args || [];
  if (args.length < 1) {
    throw new ExecutionError('___MostSimilar requires at least 1 argument', stmt);
  }

  const query = argVector(executor, args[0]);

  // If the caller provided a literal list, restrict to it.
  const items = args.length >= 2 ? listItems(args[1]) : null;
  if (items && items.length > 0) {
    let best = null;
    let bestSim = -Infinity;
    for (const it of items) {
      const v = argVector(executor, it);
      const s = similarity(query, v);
      if (s > bestSim) {
        bestSim = s;
        best = v;
      }
    }
    return best;
  }

  // Default: use session vocabulary as the candidate set.
  const matches = topKSimilar(query, executor.session.vocabulary.atoms, 1, executor.session);
  const name = matches?.[0]?.name;
  if (!name) {
    return executor.session.vocabulary.getOrCreate('__NO_MATCH__');
  }
  return executor.session.vocabulary.getOrCreate(name);
}

function executeExtend(executor, stmt) {
  const args = stmt.args || [];
  if (args.length < 2) {
    throw new ExecutionError('___Extend requires 2 arguments: vector and geometry', stmt);
  }

  const vec = argVector(executor, args[0]);
  const geometryText = executor.resolveNameFromNode(args[1]);
  const geometry = asNumberLike(geometryText);
  if (!Number.isInteger(geometry) || geometry <= 0) {
    throw new ExecutionError(`___Extend requires integer geometry, got "${geometryText}"`, stmt);
  }

  if (typeof vec?.extend === 'function') {
    return vec.extend(geometry);
  }

  // If no extension support, allow no-op when already at requested geometry.
  if (Number.isInteger(vec?.geometry) && vec.geometry === geometry) {
    return typeof vec?.clone === 'function' ? vec.clone() : vec;
  }

  throw new ExecutionError(`___Extend not supported by strategy ${vec?.strategyId || executor.session.hdcStrategy}`, stmt);
}

export function tryExecuteBuiltin(executor, stmt, operatorName) {
  if (!executor?.session?.l0BuiltinsEnabled) return { handled: false };
  if (typeof operatorName !== 'string' || !operatorName.startsWith('___')) return { handled: false };

  switch (operatorName) {
    case '___NewVector':
      return { handled: true, vector: executeNewVector(executor, stmt) };
    case '___Bind':
      return { handled: true, vector: executeBind(executor, stmt) };
    case '___Bundle':
      return { handled: true, vector: executeBundle(executor, stmt) };
    case '___BundlePositioned':
      return { handled: true, vector: executeBundlePositioned(executor, stmt) };
    case '___Similarity':
      return { handled: true, vector: executeSimilarity(executor, stmt) };
    case '___MostSimilar':
      return { handled: true, vector: executeMostSimilar(executor, stmt) };
    case '___Extend':
      return { handled: true, vector: executeExtend(executor, stmt) };
    case '___GetType':
      throw new ExecutionError('___GetType is not implemented (type embedding not supported)', stmt);
    default:
      // If this is a known bootstrap primitive, fail-fast. Otherwise treat as normal operator.
      if (BOOTSTRAP_OPERATORS.has(operatorName)) {
        throw new ExecutionError(`Unimplemented builtin primitive: ${operatorName}`, stmt);
      }
      return { handled: false };
  }
}

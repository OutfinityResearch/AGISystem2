import { bind, bundle, similarity, topKSimilar } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import { createFromName } from '../hdc/facade.mjs';
import { debug_trace } from '../utils/debug.js';
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
  const inGraph = (executor._graphDepth || 0) > 0;
  const stmtSource = stmt?.source && typeof stmt.source === 'object' ? stmt.source : null;
  const callsite = Array.isArray(executor?._graphCallsiteStack) && executor._graphCallsiteStack.length > 0
    ? executor._graphCallsiteStack[executor._graphCallsiteStack.length - 1]
    : null;
  const effectiveSource = (inGraph && callsite && (callsite.file || callsite.line) && (
    (stmtSource?.file && callsite.file && stmtSource.file !== callsite.file) ||
    (Number.isFinite(stmtSource?.line) && Number.isFinite(callsite?.line) && stmtSource.line !== callsite.line)
  )) ? callsite : stmtSource;
  const sourceInfo = effectiveSource
    ? { file: effectiveSource.file ?? null, line: effectiveSource.line ?? null, column: effectiveSource.column ?? null, comment: null }
    : null;
  const macroOrigin = (stmtSource?.file && Number.isFinite(stmtSource?.line) && effectiveSource?.file !== stmtSource.file)
    ? `${stmtSource.file}:${stmtSource.line}${stmtSource.column ? `:${stmtSource.column}` : ''}`
    : null;

  if (args.length === 0) {
    // If the statement binds to a stable name, prefer deterministic naming over a session counter.
    const stableName = stmt?.persistName || null;
    if (stableName) {
      const token = `__NV_User__${String(stableName)}__`;
      return session.vocabulary.getOrCreate(token, {
        source: sourceInfo,
        comment: 'Auto-generated vector token created by ___NewVector (stable persistent name).'
      });
    }

    // Strict mode forbids nondeterministic top-level NewVector usage.
    // Graph-local "fresh" NewVector is allowed (used by typed constructors and other macros).
    if (session?.strictMode && !inGraph && !stmt?.destination) {
      throw new ExecutionError('___NewVector without a persistent name must be scope-bound or graph-local (strict mode)', stmt);
    }

    // Deterministic per session: stable ordering for a given program execution.
    // For graph-local allocations (typed constructors, macros), avoid polluting the user-visible vocabulary
    // with internal `__NV_session_*` tokens.
    const token = newVectorToken(session, 'session');
    if (inGraph) {
      const strategyId = session?.vocabulary?.strategyId || undefined;
      return session?.vocabulary?.hdc?.createFromName
        ? session.vocabulary.hdc.createFromName(token, session.geometry, 'default')
        : createFromName(token, session.geometry, { strategyId });
    }

    const graphName = Array.isArray(executor?._graphStack) && executor._graphStack.length > 0
      ? String(executor._graphStack[executor._graphStack.length - 1])
      : null;
    const origin = (sourceInfo?.file && sourceInfo?.line)
      ? `${sourceInfo.file}:${sourceInfo.line}${sourceInfo.column ? `:${sourceInfo.column}` : ''}`
      : (sourceInfo?.file ? String(sourceInfo.file) : null);
    return session.vocabulary.getOrCreate(token, {
      source: sourceInfo,
      comment: [
        graphName ? `Auto-generated vector token created by ___NewVector (top-level allocation in "${graphName}").` : null,
        !graphName ? 'Auto-generated vector token created by ___NewVector (top-level allocation).' : null,
        origin ? `Origin: ${origin}` : null,
        macroOrigin ? `Macro body: ${macroOrigin}` : null
      ].filter(Boolean).join(' ')
    });
  }

  const name = executor.resolveNameFromNode(args[0]);
  const theory = args.length >= 2 ? executor.resolveNameFromNode(args[1]) : 'default';
  if (!name) {
    throw new ExecutionError('___NewVector requires a name string', stmt);
  }
  const token = `__NV_${String(theory)}__${String(name)}__`;
  return session.vocabulary.getOrCreate(token, {
    source: sourceInfo,
    comment: 'Auto-generated vector token created by ___NewVector (explicit name + theory namespace).'
  });
}

function executeBind(executor, stmt) {
  const args = stmt.args || [];
  if (args.length === 0) {
    throw new ExecutionError('___Bind requires at least 1 argument', stmt);
  }
  if (args.length === 1) {
    return argVector(executor, args[0]);
  }
  const { session } = executor;
  let out = argVector(executor, args[0]);
  for (let i = 1; i < args.length; i++) {
    const rhsNode = args[i];
    const rhsVec = argVector(executor, rhsNode);
    const rhsToken = executor.resolveNameFromNode(rhsNode);
    const rhsType = session?.typeRegistry?.resolveTypeMarkerName?.(rhsToken) || null;
    const next = bind(out, rhsVec);
    session?.typeRegistry?.recordBind?.({ inputVec: out, outputVec: next, rhsTypeMarker: rhsType });
    out = next;
  }
  return out;
}

function executeBundle(executor, stmt) {
  const args = stmt.args || [];
  if (args.length === 0) {
    return executor.session.vocabulary.getOrCreate('__EMPTY_BUNDLE__', {
      source: stmt?.source || null,
      comment: 'Empty bundle constant returned by ___Bundle with no arguments.'
    });
  }
  if (args.length === 1) {
    // If called with a list expression, bundle its elements; else identity.
    const items = listItems(args[0]);
    if (items) {
      if (items.length === 0) {
        return executor.session.vocabulary.getOrCreate('__EMPTY_BUNDLE__', {
          source: stmt?.source || null,
          comment: 'Empty bundle constant returned by ___Bundle(list) with no items.'
        });
      }
      const inputVecs = items.map(n => argVector(executor, n));
      const res = bundle(inputVecs);
      executor.session?.typeRegistry?.recordBundle?.({ inputVecs, outputVec: res });
      return res;
    }
    const res = argVector(executor, args[0]);
    // Identity: type is already on the vector, no need to record new bundle relation,
    // but effectively it propagates self.
    return res;
  }

  const inputVecs = args.map(n => argVector(executor, n));
  const res = bundle(inputVecs);
  executor.session?.typeRegistry?.recordBundle?.({ inputVecs, outputVec: res });
  return res;
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
    const positioned = items.map((item, idx) => withPosition(idx + 1, argVector(executor, item), executor.session));
    return bundle(positioned);
  }

  // Fallback: treat as a normal bundle.
  if (args.length === 1) return argVector(executor, args[0]);
  const positioned = args.map((item, idx) => withPosition(idx + 1, argVector(executor, item), executor.session));
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

function executeGetType(executor, stmt) {
  const args = stmt.args || [];
  if (args.length < 1) {
    throw new ExecutionError('___GetType requires 1 argument', stmt);
  }

  const { session } = executor;
  const instance = argVector(executor, args[0]);
  debug_trace('[L0:GetType]', 'input:', instance ? 'vector' : 'null');

  // If the instance is itself a type marker, treat it as its own type.
  const instanceName = session?.vocabulary?.reverseLookup?.(instance);
  const directType = session?.typeRegistry?.resolveTypeMarkerName?.(instanceName) || null;
  debug_trace('[L0:GetType]', 'directType:', directType);
  if (directType) {
    return session.vocabulary.getOrCreate(directType);
  }

  const typeName = session?.typeRegistry?.getPrimaryTypeName?.(instance);
  debug_trace('[L0:GetType]', 'lookup typeName:', typeName, 'for fp:', session?.typeRegistry?._getEntry?.(instance));
  if (!typeName) {
    if (session?.strictMode) {
      throw new ExecutionError('___GetType: instance has no known type (strict mode)', stmt);
    }
    return session.vocabulary.getOrCreate('__UnknownType__');
  }

  // In strict mode, ensure we only return declared type markers.
  const marker = session?.typeRegistry?.resolveTypeMarkerName?.(typeName);
  debug_trace('[L0:GetType]', 'resolved marker:', marker);
  if (!marker) {
    if (session?.strictMode) {
      throw new ExecutionError(`___GetType: unknown type marker "${typeName}" (strict mode)`, stmt);
    }
    return session.vocabulary.getOrCreate(typeName);
  }

  // Prefer scope-bound canonical marker vectors (Core types are usually declared in scope, not vocabulary).
  if (session?.scope?.has?.(marker)) {
    return session.scope.get(marker);
  }
  return session.vocabulary.getOrCreate(marker);
}

export function executeNot(executor, stmt) {
  const args = stmt.args || [];
  if (args.length < 1) {
    throw new ExecutionError('___Not requires 1 argument', stmt);
  }
  const vec = argVector(executor, args[0]);

  // Check if strategy supports native NOT
  if (typeof vec?.not === 'function') {
    const res = vec.not();
    debug_trace('[L0:Not]', 'vec.not() result exists:', !!res);
    return res;
  }

  // Strategy does not support logical NOT at L0
  throw new ExecutionError(`___Not not supported by strategy ${vec?.strategyId || executor.session.hdcStrategy}`, stmt);
}

export function tryExecuteBuiltin(executor, stmt, operatorName) {
  if (operatorName && (operatorName.includes('Type') || operatorName.includes('Bundle'))) {
    debug_trace('[L0:TryExecuteBuiltin]', `${operatorName} enabled=${executor?.session?.l0BuiltinsEnabled}`);
  }
  if (!executor?.session?.l0BuiltinsEnabled) return { handled: false };
  if (typeof operatorName !== 'string') return { handled: false };
  const isBuiltin = operatorName.startsWith('___') || operatorName === '__GetType';
  if (!isBuiltin) return { handled: false };

  switch (operatorName) {
    case '___NewVector':
      return { handled: true, vector: executeNewVector(executor, stmt) };
    case '___Not':
      return { handled: true, vector: executeNot(executor, stmt) };
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
    case '__GetType':
      return { handled: true, vector: executeGetType(executor, stmt) };
    default:
      // If this is a known bootstrap primitive, fail-fast. Otherwise treat as normal operator.
      if (BOOTSTRAP_OPERATORS.has(operatorName)) {
        throw new ExecutionError(`Unimplemented builtin primitive: ${operatorName}`, stmt);
      }
      return { handled: false };
  }
}

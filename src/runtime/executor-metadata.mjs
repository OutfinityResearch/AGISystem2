import { Identifier, Reference, Literal, Compound, List } from '../parser/ast.mjs';
import { ExecutionError } from './execution-error.mjs';

function asInt(node) {
  if (!node) return null;
  if (node instanceof Literal && node.literalType === 'number') {
    return Number.isInteger(node.value) ? node.value : null;
  }
  return null;
}

function parseIntList(listNode) {
  if (!(listNode instanceof List)) return null;
  const out = [];
  for (const item of listNode.items || []) {
    const n = asInt(item);
    if (n === null) return null;
    out.push(n);
  }
  return out;
}

function parseEqPairs(listNode) {
  if (!(listNode instanceof List)) return [];
  const pairs = [];
  for (const item of listNode.items || []) {
    if (!(item instanceof List)) continue;
    const ints = parseIntList(item);
    if (!ints || ints.length !== 2) continue;
    pairs.push([ints[0], ints[1]]);
  }
  return pairs;
}

export function resolveNameFromNode(executor, node) {
  if (!node) return null;

  if (node instanceof Reference) {
    const vec = executor.session.scope.get(node.name);
    if (vec) {
      const name = executor.session.vocabulary.reverseLookup(vec);
      if (name) return name;
    }
    return node.name;
  }

  if (node instanceof Identifier) return node.name;
  if (node instanceof Literal) return String(node.value);
  if (node instanceof Compound) return node.toString();
  if (node instanceof List) return node.toString();
  if (node.name) return node.name;
  if (node.value) return String(node.value);
  return null;
}

export function extractName(executor, node) {
  if (!node) return null;
  if (node instanceof Identifier) return node.name;
  if (node instanceof Reference) return node.name;
  if (node instanceof Literal) return String(node.value);
  if (node.name) return node.name;
  if (node.value) return String(node.value);
  return null;
}

export function extractMetadata(executor, stmt) {
  const operatorName = resolveNameFromNode(executor, stmt.operator);
  const args = stmt.args.map(arg => resolveNameFromNode(executor, arg));
  return { operator: operatorName, args };
}

export function extractCompoundMetadata(executor, compound) {
  const operator = resolveNameFromNode(executor, compound.operator);
  const args = (compound.args || []).map(a => resolveNameFromNode(executor, a)).filter(a => a !== null);
  return { operator, args };
}

export function extractMetadataWithNotExpansion(executor, stmt, operatorName) {
  // DS19: structured canonical rewrite declarations.
  // canonicalRewrite fromOp toOp [argMap...] [[eqA,eqB]...]
  if (operatorName === 'canonicalRewrite') {
    const fromOp = resolveNameFromNode(executor, stmt.args?.[0]);
    const toOp = resolveNameFromNode(executor, stmt.args?.[1]);
    const argMap = parseIntList(stmt.args?.[2]);
    const eq = parseEqPairs(stmt.args?.[3]);
    if (!fromOp || !toOp || !argMap) {
      throw new ExecutionError('canonicalRewrite expects: fromOp toOp [argMap...] [[i,j]...]', stmt);
    }
    return { operator: 'canonicalRewrite', args: [fromOp, toOp], argMap, eq };
  }

  // DS19: structured rule metadata for proof-real reconstruction.
  if (operatorName === 'Implies' && stmt.args.length >= 2) {
    const condNode = stmt.args[0];
    const concNode = stmt.args[1];
    const condition =
      condNode instanceof Reference ? executor.session.referenceMetadata.get(condNode.name) : null;
    const conclusion =
      concNode instanceof Reference ? executor.session.referenceMetadata.get(concNode.name) : null;
    if (executor.session?.enforceCanonical) {
      if (condNode instanceof Reference && !condition) {
        throw new ExecutionError(`Implies $${condNode.name}: missing proposition metadata (non-canonical)`, stmt);
      }
      if (concNode instanceof Reference && !conclusion) {
        throw new ExecutionError(`Implies $${concNode.name}: missing proposition metadata (non-canonical)`, stmt);
      }
    }
    const base = extractMetadata(executor, stmt);
    return { ...base, condition: condition || null, conclusion: conclusion || null };
  }

  if ((operatorName === 'And' || operatorName === 'Or') && stmt.args.length >= 1) {
    const parts = [];
    for (const arg of stmt.args) {
      if (arg instanceof Reference) {
        const m = executor.session.referenceMetadata.get(arg.name);
        if (!m && executor.session?.enforceCanonical) {
          throw new ExecutionError(`${operatorName} $${arg.name}: missing proposition metadata (non-canonical)`, stmt);
        }
        parts.push(m || null);
      } else if (arg instanceof Compound) {
        parts.push(extractCompoundMetadata(executor, arg));
      } else {
        parts.push(null);
      }
    }
    const base = extractMetadata(executor, stmt);
    return { ...base, parts };
  }

  if (operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Reference) {
    const refName = stmt.args[0].name;
    const innerMeta = executor.session.referenceMetadata.get(refName);
    if (innerMeta) {
      return {
        operator: 'Not',
        args: [innerMeta.operator, ...innerMeta.args],
        innerOperator: innerMeta.operator,
        innerArgs: innerMeta.args,
        inner: innerMeta
      };
    }

    if (executor.session?.enforceCanonical) {
      throw new ExecutionError(`Not $${refName}: reference has no proposition metadata (non-canonical)`, stmt);
    }
  }

  if (operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Compound) {
    const inner = extractCompoundMetadata(executor, stmt.args[0]);
    if (inner.operator) {
      return {
        operator: 'Not',
        args: [inner.operator, ...inner.args],
        innerOperator: inner.operator,
        innerArgs: inner.args,
        inner
      };
    }
  }

  // DS19 canonicalization: support legacy flat form `Not op a b ...` by
  // always attaching the structured inner fields.
  if (operatorName === 'Not' && stmt.args.length >= 2) {
    const innerOperator = resolveNameFromNode(executor, stmt.args[0]);
    const innerArgs = stmt.args.slice(1).map(arg => resolveNameFromNode(executor, arg));
    if (innerOperator) {
      return {
        operator: 'Not',
        args: [innerOperator, ...innerArgs],
        innerOperator,
        innerArgs
      };
    }
  }

  return extractMetadata(executor, stmt);
}

export function statementToFactString(executor, stmt) {
  const operatorName = resolveNameFromNode(executor, stmt.operator);
  const args = stmt.args.map(arg => resolveNameFromNode(executor, arg)).filter(Boolean);
  return `${operatorName} ${args.join(' ')}`;
}

import { Identifier, Reference, Literal, Compound, List, Hole } from '../parser/ast.mjs';
import { ExecutionError } from './execution-error.mjs';

function attachSourceMetadata(stmt, metadata) {
  if (!metadata || typeof metadata !== 'object' || !stmt) return metadata;

  const src = stmt?.source || null;
  const file = src?.file ?? null;
  const line = src?.line ?? stmt?.line ?? null;
  const column = src?.column ?? stmt?.column ?? null;
  const comment = typeof stmt?.comment === 'string' ? stmt.comment : null;
  const commentColumn = Number.isFinite(stmt?.commentColumn) ? stmt.commentColumn : null;

  if (!file && !Number.isFinite(line) && !comment) return metadata;

  return {
    ...metadata,
    source: {
      file,
      line: Number.isFinite(line) ? line : null,
      column: Number.isFinite(column) ? column : null,
      comment,
      commentColumn
    }
  };
}

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
  if (node instanceof Hole) return `?${node.name}`;
  if (node instanceof Literal) return String(node.value);
  if (node instanceof Compound) return node.toString();
  if (node instanceof List) return node.toString();
  if (node.name) return node.name;
  if (node.value) return String(node.value);
  return null;
}

function extractExpressionMetadata(executor, expr, { requirePropositionMetadata = false, parentStmt = null } = {}) {
  if (!expr) return null;

  if (expr instanceof Reference) {
    const m = executor.session.referenceMetadata.get(expr.name);
    if (!m && requirePropositionMetadata && executor.session?.enforceCanonical) {
      throw new ExecutionError(`$${expr.name}: missing proposition metadata (non-canonical)`, parentStmt);
    }
    return m || null;
  }

  if (expr instanceof Compound) {
    const operatorName = resolveNameFromNode(executor, expr.operator);
    const args = (expr.args || []).map(a => resolveNameFromNode(executor, a));
    const base = { operator: operatorName, args };

    if (operatorName === 'Implies' && (expr.args || []).length >= 2) {
      const condition = extractExpressionMetadata(executor, expr.args[0], { requirePropositionMetadata, parentStmt });
      const conclusion = extractExpressionMetadata(executor, expr.args[1], { requirePropositionMetadata, parentStmt });
      return { ...base, condition: condition || null, conclusion: conclusion || null };
    }

    if ((operatorName === 'And' || operatorName === 'Or') && (expr.args || []).length >= 1) {
      const parts = [];
      for (const a of expr.args || []) {
        parts.push(extractExpressionMetadata(executor, a, { requirePropositionMetadata, parentStmt }));
      }
      return { ...base, parts };
    }

    if (operatorName === 'Not' && (expr.args || []).length === 1) {
      const inner = extractExpressionMetadata(executor, expr.args[0], { requirePropositionMetadata, parentStmt });
      if (inner?.operator) {
        return {
          ...base,
          args: [inner.operator, ...(inner.args || [])],
          innerOperator: inner.operator,
          innerArgs: inner.args || [],
          inner
        };
      }
      return base;
    }

    if ((operatorName === 'Exists' || operatorName === 'ForAll') && (expr.args || []).length >= 2) {
      const variable = resolveNameFromNode(executor, expr.args[0]);
      const body = extractExpressionMetadata(executor, expr.args[1], { requirePropositionMetadata, parentStmt });
      return { ...base, variable, body: body || null };
    }

    return base;
  }

  return null;
}

export function extractName(executor, node) {
  if (!node) return null;
  if (node instanceof Identifier) return node.name;
  if (node instanceof Reference) return node.name;
  if (node instanceof Hole) return `?${node.name}`;
  if (node instanceof Literal) return String(node.value);
  if (node.name) return node.name;
  if (node.value) return String(node.value);
  return null;
}

export function extractMetadata(executor, stmt) {
  const operatorName = resolveNameFromNode(executor, stmt.operator);
  const args = stmt.args.map(arg => resolveNameFromNode(executor, arg));
  return attachSourceMetadata(stmt, { operator: operatorName, args });
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
    return attachSourceMetadata(stmt, { operator: 'canonicalRewrite', args: [fromOp, toOp], argMap, eq });
  }

  // DS19: structured rule metadata for proof-real reconstruction.
  if (operatorName === 'Implies' && stmt.args.length >= 2) {
    const condNode = stmt.args[0];
    const concNode = stmt.args[1];
    const condition = extractExpressionMetadata(executor, condNode, { requirePropositionMetadata: true, parentStmt: stmt });
    const conclusion = extractExpressionMetadata(executor, concNode, { requirePropositionMetadata: true, parentStmt: stmt });
    const base = extractMetadata(executor, stmt);
    return attachSourceMetadata(stmt, { ...base, condition: condition || null, conclusion: conclusion || null });
  }

  if ((operatorName === 'And' || operatorName === 'Or') && stmt.args.length >= 1) {
    const parts = [];
    for (const arg of stmt.args) {
      parts.push(extractExpressionMetadata(executor, arg, { requirePropositionMetadata: true, parentStmt: stmt }));
    }
    const base = extractMetadata(executor, stmt);
    return attachSourceMetadata(stmt, { ...base, parts });
  }

  if (operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Reference) {
    const refName = stmt.args[0].name;
    const innerMeta = executor.session.referenceMetadata.get(refName);
    if (innerMeta) {
      return attachSourceMetadata(stmt, {
        operator: 'Not',
        args: [innerMeta.operator, ...innerMeta.args],
        innerOperator: innerMeta.operator,
        innerArgs: innerMeta.args,
        inner: innerMeta
      });
    }

    if (executor.session?.enforceCanonical) {
      throw new ExecutionError(`Not $${refName}: reference has no proposition metadata (non-canonical)`, stmt);
    }
  }

  if (operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Compound) {
    const inner = extractExpressionMetadata(executor, stmt.args[0], { parentStmt: stmt });
    if (inner.operator) {
      return attachSourceMetadata(stmt, {
        operator: 'Not',
        args: [inner.operator, ...inner.args],
        innerOperator: inner.operator,
        innerArgs: inner.args,
        inner
      });
    }
  }

  // DS19 canonicalization: support legacy flat form `Not op a b ...` by
  // always attaching the structured inner fields.
  if (operatorName === 'Not' && stmt.args.length >= 2) {
    const innerOperator = resolveNameFromNode(executor, stmt.args[0]);
    const innerArgs = stmt.args.slice(1).map(arg => resolveNameFromNode(executor, arg));
    if (innerOperator) {
      return attachSourceMetadata(stmt, {
        operator: 'Not',
        args: [innerOperator, ...innerArgs],
        innerOperator,
        innerArgs
      });
    }
  }

  if ((operatorName === 'Exists' || operatorName === 'ForAll') && stmt.args.length >= 2) {
    const variable = resolveNameFromNode(executor, stmt.args[0]);
    const body = extractExpressionMetadata(executor, stmt.args[1], { requirePropositionMetadata: true, parentStmt: stmt });
    const base = extractMetadata(executor, stmt);
    return attachSourceMetadata(stmt, { ...base, variable, body: body || null });
  }

  return attachSourceMetadata(stmt, extractMetadata(executor, stmt));
}

export function statementToFactString(executor, stmt) {
  const operatorName = resolveNameFromNode(executor, stmt.operator);
  const args = stmt.args.map(arg => resolveNameFromNode(executor, arg)).filter(Boolean);
  return `${operatorName} ${args.join(' ')}`;
}

/**
 * AGISystem2 - Canonicalization (DS19)
 * @module runtime/canonicalize
 *
 * Incremental canonicalizer used to normalize semantically equivalent DSL forms.
 *
 * Current scope (safe, minimal):
 * - Canonicalize Identifier names using synonym closure (ComponentKB).
 * - Preserve structure (Statement/Compound/List/Literal/Hole/Reference).
 * - Does not yet enforce typed atom discipline or macro-template rewrites.
 */

import {
  Statement,
  Identifier,
  Hole,
  Reference,
  Literal,
  List,
  Compound
} from '../parser/ast.mjs';

const CANON_TOKEN_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_OPERATORS = new Set(['Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists', 'Load', 'Unload', 'induce', 'bundle']);

export function canonicalizeTokenName(session, name) {
  if (!name || typeof name !== 'string') return name;
  if (!CANON_TOKEN_RE.test(name)) return name;
  const kb = session?.componentKB;
  if (!kb || typeof kb.canonicalizeName !== 'function') return name;
  return kb.canonicalizeName(name);
}

export function canonicalizeExpression(session, expr) {
  if (!expr) return expr;

  if (expr instanceof Identifier) {
    return new Identifier(canonicalizeTokenName(session, expr.name), expr.line, expr.column);
  }

  if (expr instanceof Hole) {
    return expr;
  }

  if (expr instanceof Reference) {
    return expr;
  }

  if (expr instanceof Literal) {
    return expr;
  }

  if (expr instanceof List) {
    const items = (expr.items || []).map(i => canonicalizeExpression(session, i));
    return new List(items, expr.line, expr.column);
  }

  if (expr instanceof Compound) {
    const operator = canonicalizeExpression(session, expr.operator);
    const args = (expr.args || []).map(a => canonicalizeExpression(session, a));
    return new Compound(operator, args, expr.line, expr.column);
  }

  // Support plain objects (rare in tests/engines).
  if (expr.type === 'Identifier') {
    return { ...expr, name: canonicalizeTokenName(session, expr.name) };
  }
  if (expr.type === 'Compound') {
    return {
      ...expr,
      operator: canonicalizeExpression(session, expr.operator),
      args: (expr.args || []).map(a => canonicalizeExpression(session, a))
    };
  }
  if (expr.type === 'List') {
    return { ...expr, items: (expr.items || []).map(i => canonicalizeExpression(session, i)) };
  }
  return expr;
}

export function canonicalizeStatement(session, stmt) {
  if (!stmt) return stmt;

  // Parser Statement instance.
  if (stmt instanceof Statement) {
    const operator = canonicalizeExpression(session, stmt.operator);
    const args = (stmt.args || []).map(a => canonicalizeExpression(session, a));
    return new Statement(stmt.destination, operator, args, stmt.line, stmt.column, stmt.persistName);
  }

  // Plain object fallback.
  if (stmt.type === 'Statement') {
    return {
      ...stmt,
      operator: canonicalizeExpression(session, stmt.operator),
      args: (stmt.args || []).map(a => canonicalizeExpression(session, a))
    };
  }

  return stmt;
}

export function canonicalizeMetadata(session, metadata) {
  if (!metadata || typeof metadata !== 'object') return metadata;
  if (metadata.operator === 'synonym') return metadata;
  if (metadata.operator === 'canonical') return metadata;
  if (metadata.operator === 'alias') return metadata;

  // DS19: normalize Not metadata to always include `innerOperator`/`innerArgs`
  // regardless of whether it came from `Not (op ...)`, `Not $ref`, or flat `Not op a b`.
  if (metadata.operator === 'Not' && !metadata.innerOperator && Array.isArray(metadata.args) && metadata.args.length >= 1) {
    metadata = {
      ...metadata,
      innerOperator: metadata.args[0],
      innerArgs: metadata.args.slice(1)
    };
  }

  const canonicalizeNested = (value) => {
    if (!value) return value;
    if (Array.isArray(value)) return value.map(v => canonicalizeNested(v));
    if (typeof value === 'object') return canonicalizeMetadata(session, value);
    if (typeof value === 'string') return canonicalizeTokenName(session, value);
    return value;
  };

  const operator = (typeof metadata.operator === 'string' && !RESERVED_OPERATORS.has(metadata.operator))
    ? canonicalizeTokenName(session, metadata.operator)
    : metadata.operator;

  const args = Array.isArray(metadata.args)
    ? metadata.args.map(a => (typeof a === 'string' ? canonicalizeTokenName(session, a) : a))
    : metadata.args;

  const out = { ...metadata, operator, args };

  // Canonicalize known nested metadata shapes.
  if (metadata.operator === 'Implies') {
    if (metadata.condition) out.condition = canonicalizeNested(metadata.condition);
    if (metadata.conclusion) out.conclusion = canonicalizeNested(metadata.conclusion);
  }
  if (metadata.operator === 'And' || metadata.operator === 'Or') {
    if (metadata.parts) out.parts = canonicalizeNested(metadata.parts);
  }
  if (metadata.operator === 'Not') {
    if (metadata.inner) out.inner = canonicalizeNested(metadata.inner);
  }

  if (metadata.operator === 'Not') {
    if (typeof metadata.innerOperator === 'string') {
      out.innerOperator = canonicalizeTokenName(session, metadata.innerOperator);
    }
    if (Array.isArray(metadata.innerArgs)) {
      out.innerArgs = metadata.innerArgs.map(a => (typeof a === 'string' ? canonicalizeTokenName(session, a) : a));
    }
  }

  return out;
}

import { ExecutionError } from './execution-error.mjs';
import { DECLARATION_OPERATORS } from './operator-declarations.mjs';
import { Reference, Compound, Identifier } from '../parser/ast.mjs';

const NON_CANONICAL_PRIMITIVE_HINTS = new Map([
  ['_mtrans', 'Use a macro like `tell` or `ask` (Core/11-bootstrap-verbs.sys2).'],
  ['_atrans', 'Use a macro like `give`, `take`, `buy`, `sell`, or `sells` (Core/11-bootstrap-verbs.sys2).'],
  ['_ptrans', 'Use a macro like `go` or `move` (Core/11-bootstrap-verbs.sys2).'],
  ['_attend', 'Use a macro like `see` or `hear` (Core/11-bootstrap-verbs.sys2).'],
  ['_speak', 'Use a macro like `say` (Core/11-bootstrap-verbs.sys2).']
]);

const MUST_PERSIST_OPERATORS = new Set([
  'synonym',
  'canonical',
  'alias',
  'canonicalRewrite',
  'inverseRelation',
  'contradictsSameArgs',
  'mutuallyExclusive'
]);

function hintForPrimitive(op) {
  if (NON_CANONICAL_PRIMITIVE_HINTS.has(op)) return NON_CANONICAL_PRIMITIVE_HINTS.get(op);
  if (op && /^_[A-Za-z]/.test(op)) return 'Use a higher-level macro instead of asserting L2 primitives as facts.';
  return null;
}

/**
 * DS19: In strict mode, reject selected non-canonical surface assertions early.
 *
 * @param {import('./session.mjs').Session} session
 * @param {import('../parser/ast.mjs').Statement} stmt
 * @param {string} operatorName
 */
export function enforceCanonicalStatement(session, stmt, operatorName) {
  if (!session?.enforceCanonical) return;
  const shouldPersist = !stmt?.destination || stmt?.isPersistent;

  // Declarations must be persistent, otherwise they silently have no effect on theory-driven semantics.
  if (DECLARATION_OPERATORS.has(operatorName)) {
    if (!stmt?.persistName || !shouldPersist) {
      throw new ExecutionError(
        `Non-canonical declaration: ${operatorName} must be persistent (use @X:X ${operatorName} or @:X ${operatorName})`,
        stmt
      );
    }
  }

  // Constraint / synonym operators must be asserted into KB to be meaningful.
  if (MUST_PERSIST_OPERATORS.has(operatorName)) {
    if (!shouldPersist) {
      throw new ExecutionError(
        `Non-canonical ${operatorName}: declaration must be persistent (drop @dest or use @dest:name)`,
        stmt
      );
    }
  }

  // Prevent asserting ambiguous L2 primitives as surface facts.
  // Only L2 primitives (single leading underscore) are rejected; Core metaprogramming uses `__*` and `___*`.
  if (
    shouldPersist &&
    typeof operatorName === 'string' &&
    /^_[A-Za-z]/.test(operatorName) &&
    !operatorName.startsWith('__') &&
    !(session?.canonicalRewriteIndex?.canRewrite?.(operatorName, (stmt?.args || []).length))
  ) {
    const hint = hintForPrimitive(operatorName);
    throw new ExecutionError(
      `Non-canonical primitive asserted as fact: ${operatorName}. ${hint || ''}`.trim(),
      stmt
    );
  }

  // Negation: reject `Not X` (single atom) as non-canonical; require Not($ref / (stmt) / op args...).
  if (operatorName === 'Not' && Array.isArray(stmt?.args)) {
    if (stmt.args.length === 0) {
      throw new ExecutionError('Non-canonical Not: expected a proposition', stmt);
    }
    if (stmt.args.length === 1) {
      const arg = stmt.args[0];
      // Accept:
      // - `Not $ref` (quoted statement via reference expansion)
      // - `Not (op ...)` (quoted statement via compound)
      // - `Not X` (0-arity proposition token)
      const ok = arg instanceof Reference || arg instanceof Compound || arg instanceof Identifier;
      if (!ok) {
        const got = arg instanceof Identifier ? `Identifier(${arg.name})` : (arg?.type || typeof arg);
        throw new ExecutionError(
          `Non-canonical Not: single-arg form must be Not $ref, Not (op ...), or Not X, got ${got}`,
          stmt
        );
      }
    }
  }
}

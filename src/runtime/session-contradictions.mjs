import { similarity } from '../core/operations.mjs';

/**
 * Contradiction checks for Session.addToKB warnings.
 * Derived constraints (mutuallyExclusive pairs) are supplied via SemanticIndex.
 */
export function checkContradiction(session, metadata) {
  if (!metadata?.operator || !metadata?.args) return null;
  const { operator, args } = metadata;

  // Check Not(P) when P exists (legacy behavior)
  if (operator === 'Not' && args.length >= 1) {
    const refVec = session.scope.get(args[0]);
    if (refVec) {
      for (const fact of session.kbFacts) {
        if (fact.vector && similarity(fact.vector, refVec) > 0.9) {
          return 'Warning: direct contradiction detected';
        }
      }
    }
  }

  // Legacy temporal contradictions (hardcoded): before(A,B) conflicts with after(A,B).
  if (!session?.useTheoryConstraints) {
    if ((operator === 'before' || operator === 'after') && args.length >= 2) {
      const oppositeOp = operator === 'before' ? 'after' : 'before';
      for (const fact of session.kbFacts) {
        if (fact.metadata?.operator === oppositeOp &&
            fact.metadata.args[0] === args[0] &&
            fact.metadata.args[1] === args[1]) {
          return 'Warning: temporal contradiction';
        }
      }
    }
    return null;
  }

  // Contradictions on same-args operator pairs (theory-driven).
  // Example: `contradictsSameArgs before after` means `before A B` conflicts with `after A B`.
  const contradictsWith = session.semanticIndex?.contradictsSameArgsWith?.(operator);
  if (contradictsWith && contradictsWith.size > 0 && args.length >= 2) {
    for (const otherOp of contradictsWith) {
      for (const fact of session.kbFacts) {
        if (fact.metadata?.operator === otherOp &&
            fact.metadata.args?.[0] === args[0] &&
            fact.metadata.args?.[1] === args[1]) {
          return `Warning: contradiction - ${operator} and ${otherOp} with same args`;
        }
      }
    }
  }

  // Mutually exclusive pairs (theory-driven)
  const exclusions = session.semanticIndex?.getMutuallyExclusivePairs?.(operator) || [];
  if (exclusions.length === 0 || args.length < 2) return null;

  const subject = args[0];
  const value = args[1];

  let exclusiveValue = null;
  for (const pair of exclusions) {
    if (pair[0] === value) { exclusiveValue = pair[1]; break; }
    if (pair[1] === value) { exclusiveValue = pair[0]; break; }
  }
  if (!exclusiveValue) return null;

  for (const fact of session.kbFacts) {
    if (fact.metadata?.operator === operator &&
        fact.metadata.args[0] === subject &&
        fact.metadata.args[1] === exclusiveValue) {
      return `Warning: contradiction - ${subject} is both ${value} and ${exclusiveValue}`;
    }
  }

  return null;
}

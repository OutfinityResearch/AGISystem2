import { similarity } from '../core/operations.mjs';

/**
 * Contradiction checks for Session.addToKB warnings.
 * Derived constraints (mutuallyExclusive pairs) are supplied via SemanticIndex.
 */
export function checkContradiction(session, metadata) {
  if (!metadata?.operator || !metadata?.args) return null;
  const { operator, args } = metadata;

  // Explicit negation is a first-class fact (used for blocking inference),
  // not a contradiction that should reject learning.
  if (operator === 'Not') return null;

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
      const indexed = session.factIndex?.getBinary?.(otherOp, args[0], args[1]);
      if (indexed) {
        const src = session.semanticIndex?.getContradictsSameArgsSource?.(operator, otherOp);
        const constraint = src
          ? `${src.text} (${src.file}:${src.line})`
          : `contradictsSameArgs ${operator} ${otherOp}`;
        return {
          kind: 'contradictsSameArgs',
          severity: 'reject',
          message: `Warning: contradiction - ${operator} and ${otherOp} with same args`,
          newFact: { operator, args: [args[0], args[1]] },
          conflictingFact: {
            operator: otherOp,
            args: [args[0], args[1]],
            factId: indexed?.id ?? null
          },
          constraint: src ? { ...src } : null,
          proof_nl: `${otherOp} ${args[0]} ${args[1]}. ${constraint}. Therefore reject ${operator} ${args[0]} ${args[1]}.`
        };
      }
      // Fallback for sessions without index (or for facts injected without addToKB).
      for (const fact of session.kbFacts) {
        if (fact?.metadata?.operator === otherOp &&
            fact?.metadata?.args?.[0] === args[0] &&
            fact?.metadata?.args?.[1] === args[1]) {
          const src = session.semanticIndex?.getContradictsSameArgsSource?.(operator, otherOp);
          const constraint = src
            ? `${src.text} (${src.file}:${src.line})`
            : `contradictsSameArgs ${operator} ${otherOp}`;
          return {
            kind: 'contradictsSameArgs',
            severity: 'reject',
            message: `Warning: contradiction - ${operator} and ${otherOp} with same args`,
            newFact: { operator, args: [args[0], args[1]] },
            conflictingFact: {
              operator: otherOp,
              args: [args[0], args[1]],
              factId: fact?.id ?? null
            },
            constraint: src ? { ...src } : null,
            proof_nl: `${otherOp} ${args[0]} ${args[1]}. ${constraint}. Therefore reject ${operator} ${args[0]} ${args[1]}.`
          };
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

  const indexed = session.factIndex?.getBinary?.(operator, subject, exclusiveValue);
  if (indexed) {
    const src = session.semanticIndex?.getMutuallyExclusiveSource?.(operator, value, exclusiveValue);
    const constraint = src
      ? `${src.text} (${src.file}:${src.line})`
      : `mutuallyExclusive ${operator} ${value} ${exclusiveValue}`;
    return {
      kind: 'mutuallyExclusive',
      severity: 'reject',
      message: `Warning: contradiction - ${subject} is both ${value} and ${exclusiveValue}`,
      newFact: { operator, args: [subject, value] },
      conflictingFact: {
        operator,
        args: [subject, exclusiveValue],
        factId: indexed?.id ?? null
      },
      constraint: src ? { ...src } : null,
      proof_nl: `${operator} ${subject} ${exclusiveValue}. ${constraint}. Therefore reject ${operator} ${subject} ${value}.`
    };
  }
  // Fallback for sessions without index (or for facts injected without addToKB).
  for (const fact of session.kbFacts) {
    if (fact?.metadata?.operator === operator &&
        fact?.metadata?.args?.[0] === subject &&
        fact?.metadata?.args?.[1] === exclusiveValue) {
      const src = session.semanticIndex?.getMutuallyExclusiveSource?.(operator, value, exclusiveValue);
      const constraint = src
        ? `${src.text} (${src.file}:${src.line})`
        : `mutuallyExclusive ${operator} ${value} ${exclusiveValue}`;
      return {
        kind: 'mutuallyExclusive',
        severity: 'reject',
        message: `Warning: contradiction - ${subject} is both ${value} and ${exclusiveValue}`,
        newFact: { operator, args: [subject, value] },
        conflictingFact: {
          operator,
          args: [subject, exclusiveValue],
          factId: fact?.id ?? null
        },
        constraint: src ? { ...src } : null,
        proof_nl: `${operator} ${subject} ${exclusiveValue}. ${constraint}. Therefore reject ${operator} ${subject} ${value}.`
      };
    }
  }

  return null;
}

import { similarity } from '../core/operations.mjs';

/**
 * Contradiction checks for Session.addToKB warnings.
 * Derived constraints (mutuallyExclusive pairs) are supplied via SemanticIndex.
 */

const DEFAULT_DERIVATION_MAX_DEPTH = 8;

function isTransitiveOperator(session, operator) {
  if (!operator) return false;
  if (session?.useSemanticIndex && session?.semanticIndex?.isTransitive) {
    return !!session.semanticIndex.isTransitive(operator);
  }
  return false;
}

function isInheritableOperator(session, operator) {
  if (!operator) return false;
  if (session?.useSemanticIndex && session?.semanticIndex?.isInheritableProperty) {
    return !!session.semanticIndex.isInheritableProperty(operator);
  }
  return false;
}

function hasNegationException(session, operator, subject, value) {
  if (!operator || !subject || !value) return false;
  if (session?.factIndex?.hasNary) {
    // Not facts are stored as: Not <innerOperator> <arg0> <arg1>
    if (session.factIndex.hasNary('Not', [operator, subject, value])) return true;
  }
  for (const fact of session?.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== 'Not') continue;
    const [negOp, negSubject, negValue] = meta.args || [];
    if (negOp === operator && negSubject === subject && negValue === value) {
      return true;
    }
  }
  return false;
}

function buildBinaryEdgesByFrom(session, operator) {
  const byFrom = new Map(); // from -> Array<{to, factId}>
  const facts = session?.factIndex?.getByOperator
    ? session.factIndex.getByOperator(operator)
    : (session?.kbFacts || []);
  for (const fact of facts) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== operator) continue;
    const [from, to] = meta.args || [];
    if (!from || !to) continue;
    if (!byFrom.has(from)) byFrom.set(from, []);
    byFrom.get(from).push({ to, factId: fact?.id ?? null });
  }
  return byFrom;
}

function findTransitiveChainEvidence(session, operator, from, to, { maxDepth = DEFAULT_DERIVATION_MAX_DEPTH } = {}) {
  if (!operator || !from || !to) return null;
  if (from === to) return null;
  if (!isTransitiveOperator(session, operator)) return null;

  const edgesByFrom = buildBinaryEdgesByFrom(session, operator);
  if (!edgesByFrom.has(from)) return null;

  const visited = new Set([from]);
  const depthByNode = new Map([[from, 0]]);
  const prev = new Map(); // node -> {from, factId}
  const queue = [from];

  while (queue.length > 0) {
    const node = queue.shift();
    const depth = depthByNode.get(node) ?? 0;
    if (depth >= maxDepth) continue;

    const edges = edgesByFrom.get(node) || [];
    for (const edge of edges) {
      const next = edge.to;
      if (!next || visited.has(next)) continue;
      visited.add(next);
      prev.set(next, { from: node, factId: edge.factId ?? null });
      depthByNode.set(next, depth + 1);
      if (next === to) {
        const chain = [];
        let cur = to;
        while (cur !== from) {
          const p = prev.get(cur);
          if (!p) return null;
          chain.push({
            operator,
            args: [p.from, cur],
            factId: p.factId ?? null
          });
          cur = p.from;
        }
        chain.reverse();
        return chain;
      }
      queue.push(next);
    }
  }

  return null;
}

function findInheritedPropertyEvidence(session, operator, entity, value, { maxDepth = DEFAULT_DERIVATION_MAX_DEPTH } = {}) {
  if (!operator || !entity || !value) return null;
  if (!isInheritableOperator(session, operator)) return null;
  if (hasNegationException(session, operator, entity, value)) return null;

  // isA edges: child -> Array<{parent, factId}>
  const parentsByChild = new Map();
  const isAFacts = session?.factIndex?.getByOperator
    ? session.factIndex.getByOperator('isA')
    : (session?.kbFacts || []);
  for (const fact of isAFacts) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== 'isA') continue;
    const [child, parent] = meta.args || [];
    if (!child || !parent) continue;
    if (!parentsByChild.has(child)) parentsByChild.set(child, []);
    parentsByChild.get(child).push({ parent, factId: fact?.id ?? null });
  }
  if (!parentsByChild.has(entity)) return null;

  const visited = new Set([entity]);
  const depthByNode = new Map([[entity, 0]]);
  const prev = new Map(); // node -> {from, factId}
  const queue = [entity];

  while (queue.length > 0) {
    const node = queue.shift();
    const depth = depthByNode.get(node) ?? 0;
    if (depth >= maxDepth) continue;

    const parents = parentsByChild.get(node) || [];
    for (const edge of parents) {
      const parent = edge.parent;
      if (!parent || visited.has(parent)) continue;
      if (hasNegationException(session, operator, parent, value)) continue;
      visited.add(parent);
      prev.set(parent, { from: node, factId: edge.factId ?? null });
      depthByNode.set(parent, depth + 1);

      const propertyFact = session?.factIndex?.getBinary?.(operator, parent, value) || null;
      if (propertyFact) {
        const chain = [];
        let cur = parent;
        while (cur !== entity) {
          const p = prev.get(cur);
          if (!p) return null;
          chain.push({
            operator: 'isA',
            args: [p.from, cur],
            factId: p.factId ?? null
          });
          cur = p.from;
        }
        chain.reverse();
        return {
          isAChain: chain,
          propertyFact: { operator, args: [parent, value], factId: propertyFact?.id ?? null },
          derivedFact: { operator, args: [entity, value] }
        };
      }

      queue.push(parent);
    }
  }

  return null;
}

function buildContradictionProofObject({ kind, message, newFact, conflictingFact, constraint }) {
  const constraintText =
    constraint?.text ||
    (typeof constraint === 'string' ? constraint : null) ||
    null;
  const constraintFile = constraint?.file || null;
  const constraintLine = constraint?.line || null;
  const goal = newFact?.operator
    ? { operator: newFact.operator, args: Array.isArray(newFact.args) ? [...newFact.args] : [] }
    : { operator: 'Contradiction', args: [] };

  const steps = [];
  if (conflictingFact?.operator) {
    steps.push({
      kind: 'fact',
      usesFacts: [{
        id: conflictingFact.factId ?? null,
        operator: conflictingFact.operator,
        args: Array.isArray(conflictingFact.args) ? [...conflictingFact.args] : []
      }],
      detail: {
        operation: 'conflicting_fact',
        fact: `${conflictingFact.operator} ${(conflictingFact.args || []).join(' ')}`.trim()
      }
    });
  }

  steps.push({
    kind: 'validation',
    detail: {
      operation: 'constraint_violation',
      constraintKind: kind || null,
      constraint: constraintText,
      source: constraintFile
        ? { file: constraintFile, line: constraintLine }
        : null
    }
  });

  return {
    valid: false,
    goal,
    method: 'symbolic',
    confidence: 0,
    steps,
    legacySteps: [],
    legacy: {
      reason: message || null,
      searchTrace: null
    }
  };
}

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
        session.reasoningStats.kbScans++;
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
        const contradiction = {
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
        contradiction.proofObject = buildContradictionProofObject(contradiction);
        return contradiction;
      }
      // Fallback for sessions without index (or for facts injected without addToKB).
      for (const fact of session.kbFacts) {
        session.reasoningStats.kbScans++;
        if (fact?.metadata?.operator === otherOp &&
            fact?.metadata?.args?.[0] === args[0] &&
            fact?.metadata?.args?.[1] === args[1]) {
          const src = session.semanticIndex?.getContradictsSameArgsSource?.(operator, otherOp);
          const constraint = src
            ? `${src.text} (${src.file}:${src.line})`
            : `contradictsSameArgs ${operator} ${otherOp}`;
          const contradiction = {
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
          contradiction.proofObject = buildContradictionProofObject(contradiction);
          return contradiction;
        }
      }

      // Derived contradiction: otherOp may be provable via transitive chaining even if not explicit.
      const chain = findTransitiveChainEvidence(session, otherOp, args[0], args[1]);
      if (chain && chain.length > 0) {
        const src = session.semanticIndex?.getContradictsSameArgsSource?.(operator, otherOp);
        const constraint = src
          ? `${src.text} (${src.file}:${src.line})`
          : `contradictsSameArgs ${operator} ${otherOp}`;
        const chainText = chain.map(e => `${e.operator} ${e.args[0]} ${e.args[1]}`).join('. ');
        const hops = chain.length;
        const derivedFact = `${otherOp} ${args[0]} ${args[1]}`;
        const contradiction = {
          kind: 'contradictsSameArgs',
          severity: 'reject',
          message: `Warning: contradiction - ${operator} and ${otherOp} with same args`,
          newFact: { operator, args: [args[0], args[1]] },
          conflictingFact: {
            operator: otherOp,
            args: [args[0], args[1]],
            factId: null
          },
          constraint: src ? { ...src } : null,
          proof_nl: `${chainText}. Transitive chain verified (${hops} hops). Therefore ${derivedFact}. ${constraint}. Therefore reject ${operator} ${args[0]} ${args[1]}.`
        };
        contradiction.proofObject = buildContradictionProofObject(contradiction);
        return contradiction;
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
    const contradiction = {
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
    contradiction.proofObject = buildContradictionProofObject(contradiction);
    return contradiction;
  }
  // Fallback for sessions without index (or for facts injected without addToKB).
  for (const fact of session.kbFacts) {
    session.reasoningStats.kbScans++;
    if (fact?.metadata?.operator === operator &&
        fact?.metadata?.args?.[0] === subject &&
        fact?.metadata?.args?.[1] === exclusiveValue) {
      const src = session.semanticIndex?.getMutuallyExclusiveSource?.(operator, value, exclusiveValue);
      const constraint = src
        ? `${src.text} (${src.file}:${src.line})`
        : `mutuallyExclusive ${operator} ${value} ${exclusiveValue}`;
      const contradiction = {
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
      contradiction.proofObject = buildContradictionProofObject(contradiction);
      return contradiction;
    }
  }

  // Derived contradiction: for inheritable properties, the exclusive value may be inherited via isA chain.
  const inherited = findInheritedPropertyEvidence(session, operator, subject, exclusiveValue);
  if (inherited) {
    const src = session.semanticIndex?.getMutuallyExclusiveSource?.(operator, value, exclusiveValue);
    const constraint = src
      ? `${src.text} (${src.file}:${src.line})`
      : `mutuallyExclusive ${operator} ${value} ${exclusiveValue}`;
    const isAChainText = inherited.isAChain
      .map(e => `${e.operator} ${e.args[0]} ${e.args[1]}`)
      .join('. ');
    const inheritedFactText = `${inherited.propertyFact.operator} ${inherited.propertyFact.args[0]} ${inherited.propertyFact.args[1]}`;
    const derivedFactText = `${operator} ${subject} ${exclusiveValue}`;
    const contradiction = {
      kind: 'mutuallyExclusive',
      severity: 'reject',
      message: `Warning: contradiction - ${subject} is both ${value} and ${exclusiveValue}`,
      newFact: { operator, args: [subject, value] },
      conflictingFact: {
        operator,
        args: [subject, exclusiveValue],
        factId: null
      },
      constraint: src ? { ...src } : null,
      proof_nl: `${isAChainText}. ${inheritedFactText}. Therefore ${derivedFactText}. ${constraint}. Therefore reject ${operator} ${subject} ${value}.`
    };
    contradiction.proofObject = buildContradictionProofObject(contradiction);
    return contradiction;
  }

  return null;
}

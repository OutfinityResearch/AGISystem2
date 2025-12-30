/**
 * AGISystem2 - Query Engine (Advanced Meta Operators)
 * @module reasoning/query/advanced-ops
 *
 * Split from `query/engine.mjs` to keep the main query engine smaller.
 */

import { AbductionEngine } from '../abduction.mjs';

export function extractNumericArg(args, index) {
  if (!args || index >= args.length) return null;
  const arg = args[index];
  if (arg?.type === 'Number') return arg.value;
  if (typeof arg?.value === 'number') return arg.value;
  const num = parseInt(arg?.value || arg?.name, 10);
  return Number.isNaN(num) ? null : num;
}

export function searchAbduce(session, knowns, hole) {
  const engine = new AbductionEngine(session);
  const observation = knowns[0];

  const obsMeta = extractGoalMetadataFromKnown(session, observation);
  const obsAST = buildStatementFromMetadata(session, obsMeta || { operator: 'observed', args: [observation.name] });

  const result = engine.abduce(obsAST);

  const bindings = new Map();
  if (result.success && result.bestExplanation) {
    const cause = result.bestExplanation.cause || result.bestExplanation.hypothesis;
    bindings.set(hole.name, {
      answer: cause,
      confidence: result.confidence,
      method: 'abduce',
      explanations: result.explanations,
      steps: buildMetaProofSteps(session, 'abduce', result.bestExplanation, { observed: obsAST })
    });
  }

  return {
    success: result.success,
    bindings,
    confidence: result.confidence,
    allResults: result.explanations?.map(e => ({
      bindings: new Map([[hole.name, {
        answer: e.cause || e.hypothesis,
        confidence: e.score,
        method: 'abduce',
        steps: buildMetaProofSteps(session, 'abduce', e, { observed: obsAST })
      }]]),
      score: e.score,
      method: 'abduce',
      proof: {
        operation: 'abduce',
        observed: obsMeta ? renderMetadataAsFactString(session, obsMeta) : observation.name,
        cause: e.cause || e.hypothesis,
        explanation: e.explanation,
        confidence: e.score
      }
    })) || []
  };
}

export function searchExplain(session, knowns, hole) {
  const goalMeta = extractGoalMetadataFromKnown(session, knowns[0]);
  if (!goalMeta || !goalMeta.operator) {
    return { success: false, bindings: new Map(), allResults: [], reason: 'explain expects a structured goal (compound or reference)' };
  }

  const goalDsl = `@goal ${renderMetadataAsDsl(goalMeta)}`;
  const proveRes = session.prove(goalDsl, { timeout: 600 });

  const bindings = new Map();
  const allResults = [];

  if (proveRes?.valid) {
    const proofLine = session.describeResult({ action: 'prove', reasoningResult: proveRes, queryDsl: goalDsl });
    const proofText = extractProofText(proofLine);
    const confidence = typeof proveRes.confidence === 'number'
      ? proveRes.confidence
      : (typeof proveRes?.proofObject?.confidence === 'number' ? proveRes.proofObject.confidence : 0.9);
    const explanation = proofText || 'Derived by symbolic proof.';

    bindings.set(hole.name, {
      answer: explanation,
      confidence,
      method: 'explain',
      steps: Array.isArray(proveRes.steps) ? proveRes.steps.map(s => s?.fact || s?.operation || '').filter(Boolean) : []
    });

    allResults.push({
      bindings: new Map([[hole.name, { answer: explanation, confidence, method: 'explain' }]]),
      score: confidence,
      method: 'explain',
      proof: {
        operation: 'explain',
        goal: renderMetadataAsFactString(session, goalMeta),
        via: 'prove',
        confidence,
        explanation
      }
    });

    return { success: true, bindings, confidence, allResults };
  }

  const abduceRes = session.abduce(renderMetadataAsDsl(goalMeta), { maxExplanations: 5 });
  if (abduceRes?.success && abduceRes.bestExplanation) {
    const best = abduceRes.bestExplanation;
    const cause = best.cause || best.hypothesis || 'unknown';
    const confidence = best.score ?? abduceRes.confidence ?? 0.4;
    const explanation = best.explanation || `${cause} explains ${renderMetadataAsFactString(session, goalMeta)}`;

    bindings.set(hole.name, {
      answer: explanation,
      confidence,
      method: 'explain',
      steps: buildMetaProofSteps(session, 'explain', best, { goal: goalMeta, cause })
    });

    allResults.push({
      bindings: new Map([[hole.name, { answer: explanation, confidence, method: 'explain' }]]),
      score: confidence,
      method: 'explain',
      proof: {
        operation: 'explain',
        goal: renderMetadataAsFactString(session, goalMeta),
        via: 'abduce',
        cause,
        confidence,
        explanation
      }
    });

    return { success: true, bindings, confidence, allResults };
  }

  return { success: false, bindings: new Map(), allResults: [], reason: 'No explanation found' };
}

export function searchWhatif(session, knowns, hole) {
  const negatedFact = knowns[0];
  const affectedFact = knowns[1];
  const componentKB = session?.componentKB;

  if (componentKB) {
    const affectedName = affectedFact.name;
    const negatedName = negatedFact.name;

    const causeFacts = componentKB.findByOperator('causes');
    const forward = new Map();
    const reverse = new Map();

    for (const fact of causeFacts) {
      const cause = fact.args?.[0];
      const effect = fact.args?.[1];
      if (!cause || !effect) continue;
      if (!forward.has(cause)) forward.set(cause, new Set());
      forward.get(cause).add(effect);
      if (!reverse.has(effect)) reverse.set(effect, new Set());
      reverse.get(effect).add(cause);
    }

    const MAX_DEPTH = 6;
    const MAX_PATHS = 3;

    const findPaths = (start, target) => {
      if (!start || !target) return [];
      if (start === target) return [[start]];

      const paths = [];
      const queue = [{ node: start, path: [start] }];
      const seenDepth = new Map([[start, 0]]);

      while (queue.length > 0 && paths.length < MAX_PATHS) {
        const { node, path } = queue.shift();
        const depth = path.length - 1;
        if (depth >= MAX_DEPTH) continue;
        const next = forward.get(node);
        if (!next) continue;
        for (const n of next) {
          if (path.includes(n)) continue;
          const nextPath = [...path, n];
          if (n === target) {
            paths.push(nextPath);
            continue;
          }
          const prevBest = seenDepth.get(n);
          if (prevBest === undefined || prevBest > nextPath.length) {
            seenDepth.set(n, nextPath.length);
            queue.push({ node: n, path: nextPath });
          }
        }
      }
      return paths;
    };

    const isReachable = (start, target) => findPaths(start, target).length > 0;

    const paths = findPaths(negatedName, affectedName);
    const causalPaths = paths.map(path => ({
      path,
      type: path.length <= 2 ? 'direct_cause' : 'transitive_cause',
      confidence: Math.max(0.5, 0.9 - ((path.length - 2) * 0.07))
    }));

    let outcome = 'unchanged';
    let confidence = 0.7;
    if (negatedName === affectedName) {
      outcome = 'would_fail';
      confidence = 0.95;
    } else if (causalPaths.length > 0) {
      outcome = 'would_fail';
      confidence = causalPaths[0].confidence;
    }

    const allAlternativeCauses = [...(reverse.get(affectedName) || new Set())]
      .filter(c => c !== negatedName);
    const independentAlternatives = allAlternativeCauses.filter(c => !isReachable(negatedName, c));

    if (outcome === 'would_fail' && independentAlternatives.length > 0) {
      outcome = 'uncertain';
      confidence = Math.min(confidence, 0.65);
    }

    const bindings = new Map();
    bindings.set(hole.name, {
      answer: outcome,
      confidence,
      method: 'whatif',
      causalPaths,
      alternativeCauses: independentAlternatives
    });

    return {
      success: true,
      bindings,
      confidence,
      allResults: [{
        bindings,
        score: confidence,
        method: 'whatif',
        proof: {
          operation: 'whatif',
          negated: negatedName,
          affected: affectedName,
          outcome,
          paths: causalPaths,
          alternativeCauses: independentAlternatives,
          confidence
        }
      }]
    };
  }

  return {
    success: false,
    bindings: new Map(),
    reason: 'No componentKB for counterfactual reasoning',
    allResults: []
  };
}

function extractGoalMetadataFromKnown(session, known) {
  const node = known?.node;
  if (!node) return null;

  if (node.type === 'Reference') {
    const m = session.referenceMetadata.get(node.name);
    return m || null;
  }

  if (node.type === 'Compound') {
    const base = session.executor.extractCompoundMetadata(node);
    if (base?.operator === 'Not' && Array.isArray(node.args) && node.args.length === 1) {
      const innerNode = node.args[0];
      if (innerNode?.type === 'Reference') {
        const inner = session.referenceMetadata.get(innerNode.name);
        if (inner?.operator) {
          return {
            operator: 'Not',
            args: [inner.operator, ...(inner.args || [])],
            innerOperator: inner.operator,
            innerArgs: inner.args || [],
            inner
          };
        }
      }
      if (innerNode?.type === 'Compound') {
        const inner = session.executor.extractCompoundMetadata(innerNode);
        if (inner?.operator) {
          return {
            operator: 'Not',
            args: [inner.operator, ...(inner.args || [])],
            innerOperator: inner.operator,
            innerArgs: inner.args || [],
            inner
          };
        }
      }
    }
    return base || null;
  }

  if (node.type === 'Identifier') {
    // Allow explaining atomic events as "operators with arity 0" (e.g., WetGrass).
    return { operator: node.name, args: [] };
  }

  return null;
}

function buildStatementFromMetadata(_session, meta) {
  if (!meta?.operator) return null;
  const opNode = { type: 'Identifier', name: meta.operator };
  if (meta.operator === 'Not' && meta.innerOperator && Array.isArray(meta.innerArgs)) {
    const inner = {
      type: 'Compound',
      operator: { type: 'Identifier', name: meta.innerOperator },
      args: meta.innerArgs.map(a => ({ type: 'Identifier', name: String(a) }))
    };
    return { type: 'Statement', operator: opNode, args: [inner] };
  }
  const args = (meta.args || []).map(a => ({ type: 'Identifier', name: String(a) }));
  return { type: 'Statement', operator: opNode, args };
}

function renderMetadataAsFactString(_session, meta) {
  if (!meta?.operator) return '';
  const args = Array.isArray(meta.args) ? meta.args : [];
  if (meta.operator === 'Not' && meta.innerOperator && Array.isArray(meta.innerArgs)) {
    return `Not (${meta.innerOperator} ${meta.innerArgs.join(' ')})`;
  }
  return `${meta.operator}${args.length > 0 ? ` ${args.join(' ')}` : ''}`.trim();
}

function renderMetadataAsDsl(meta) {
  const safe = (tok) => {
    const s = String(tok ?? '').trim();
    if (!s) return '';
    if (/[\s"]/g.test(s)) return `"${s.replace(/\"/g, '\\"')}"`;
    return s;
  };

  if (meta?.operator === 'Not' && meta.innerOperator && Array.isArray(meta.innerArgs)) {
    const inner = [safe(meta.innerOperator), ...meta.innerArgs.map(safe)].filter(Boolean).join(' ');
    return `Not (${inner})`;
  }

  const op = safe(meta?.operator);
  const args = Array.isArray(meta?.args) ? meta.args.map(safe).filter(Boolean) : [];
  return `${op}${args.length > 0 ? ` ${args.join(' ')}` : ''}`.trim();
}

function extractProofText(line) {
  const s = String(line || '').trim();
  const idx = s.toLowerCase().indexOf('proof:');
  if (idx === -1) return s;
  return s.slice(idx + 'proof:'.length).trim();
}

function buildMetaProofSteps(session, op, explanation, { observed = null, goal = null, cause = null } = {}) {
  const steps = [];
  if (op === 'abduce') {
    const obs = (observed && observed.type === 'Statement')
      ? renderStatementAsFactString(observed)
      : (observed?.operator ? renderMetadataAsFactString(session, observed) : (observed?.name || null));
    if (obs) steps.push(`Observed: ${obs}`);
  }
  if (goal?.operator) {
    steps.push(`Goal: ${renderMetadataAsFactString(session, goal)}`);
  }
  if (explanation?.rule) steps.push(`Used rule: ${explanation.rule}`);
  if (explanation?.type === 'causal' && explanation?.explanation) steps.push(explanation.explanation);
  if (Array.isArray(explanation?.steps)) {
    for (const s of explanation.steps) {
      if (typeof s === 'string' && s.trim().length > 0) steps.push(s.trim());
    }
  }
  if (cause) steps.push(`Hypothesis: ${cause}`);
  const conf = typeof explanation?.score === 'number' ? explanation.score : null;
  if (conf !== null) steps.push(`confidence=${conf.toFixed(2)}`);
  return steps;
}

function renderStatementAsFactString(stmt) {
  if (!stmt || typeof stmt !== 'object') return '';
  const op = stmt.operator?.name || stmt.operator?.value || '';
  const args = Array.isArray(stmt.args)
    ? stmt.args.map(a => a?.name || a?.value || (typeof a?.toString === 'function' ? a.toString() : '')).filter(Boolean)
    : [];
  return `${op}${args.length > 0 ? ` ${args.join(' ')}` : ''}`.trim();
}


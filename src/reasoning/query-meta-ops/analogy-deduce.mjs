/**
 * AGISystem2 - Query Meta-Operators (Analogy/Deduce)
 * @module reasoning/query-meta-ops/analogy-deduce
 *
 * DS17/DS06-ish higher-level operators:
 * - analogy: A:B :: C:?
 * - deduce: forward chaining from a source, filtered by a pattern
 */

import { similarity as hdcSimilarity } from '../../core/operations.mjs';
import { debug_trace } from '../../utils/debug.js';
import { shouldIncludeProperty } from './property-sets.mjs';

function dbg(category, ...args) {
  debug_trace(`[MetaOps:${category}]`, ...args);
}

/**
 * Find D such that A:B :: C:D (proportional reasoning)
 * Uses symbolic relation matching, then property-based analogy as fallback
 * @param {Session} session - Session instance
 * @param {Object} knownA - First entity {name, vector}
 * @param {Object} knownB - Second entity {name, vector}
 * @param {Object} knownC - Third entity {name, vector}
 * @param {Object} hole - The hole to fill {name}
 * @returns {QueryResult} Analogical answer
 */
export function searchAnalogy(session, knownA, knownB, knownC, hole) {
  dbg('ANALOGY', `Finding ${knownA.name}:${knownB.name} :: ${knownC.name}:?`);

  const componentKB = session?.componentKB;
  const candidates = [];

  if (componentKB) {
    // Strategy 1: Symbolic - find relation A->B, apply to C
    const abRelations = [];
    for (const fact of componentKB.facts) {
      session.reasoningStats.kbScans++;
      if (fact.args?.[0] === knownA.name && fact.args?.[1] === knownB.name) {
        abRelations.push(fact.operator);
      }
    }

    for (const rel of abRelations) {
      const cFacts = componentKB.findByOperatorAndArg0(rel, knownC.name);
      for (const cf of cFacts) {
        if (cf.args?.[1]) {
          candidates.push({
            answer: cf.args[1],
            relation: rel,
            confidence: 0.95,
            method: 'symbolic_analogy'
          });
        }
      }
    }

    // Strategy 2: Property-based analogy
    if (candidates.length === 0) {
      const propsA = new Set();
      const propsC = new Set();

      for (const f of componentKB.findByArg0(knownA.name)) {
        if (shouldIncludeProperty(f.operator, f.args?.[1])) propsA.add(f.args[1]);
      }
      for (const f of componentKB.findByArg0(knownC.name)) {
        if (shouldIncludeProperty(f.operator, f.args?.[1])) propsC.add(f.args[1]);
      }

      // If B is a property of A, find corresponding property of C
      if (propsA.has(knownB.name)) {
        const uniqueToC = [...propsC].filter(p => !propsA.has(p));
        for (const prop of uniqueToC) {
          candidates.push({
            answer: prop,
            confidence: 0.8,
            method: 'property_analogy'
          });
        }
      }
    }
  }

  dbg('ANALOGY', `Found ${candidates.length} candidates`);

  const bindings = new Map();
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];

    bindings.set(hole.name, {
      answer: best.answer,
      confidence: best.confidence,
      alternatives: candidates.slice(1, 4).map(c => ({ value: c.answer, confidence: c.confidence })),
      method: best.method
    });
  }

  return {
    success: candidates.length > 0,
    bindings,
    confidence: candidates.length > 0 ? candidates[0].confidence : 0,
    ambiguous: candidates.length > 1,
    allResults: candidates.map(c => ({
      bindings: new Map([[hole.name, { answer: c.answer, confidence: c.confidence, method: c.method }]]),
      score: c.confidence,
      method: c.method,
      proof: { operation: 'analogy', mapping: `${knownA.name}:${knownB.name} :: ${knownC.name}:${c.answer}`, relation: c.relation }
    }))
  };
}

/**
 * Forward-chaining deduction from a source (theory/premises) filtered by a pattern
 * @param {Session} session - Session instance
 * @param {Object} source - Source entity/theory {name, vector}
 * @param {Object} filter - Filter pattern {name, vector}
 * @param {Object} hole - The hole to fill {name}
 * @param {number} depth - Max chaining depth (default: 1)
 * @param {number} limit - Max number of conclusions (default: 10)
 * @returns {QueryResult} Deduced conclusions ranked by filter similarity
 */
export function searchDeduce(session, source, filter, hole, depth = 1, limit = 10) {
  dbg('DEDUCE', `Deducing from ${source.name} with filter ${filter.name}, depth=${depth}, limit=${limit}`);

  const componentKB = session?.componentKB;
  if (!componentKB) {
    return { success: false, bindings: new Map(), allResults: [], reason: 'No componentKB' };
  }

  // The filter is a vector encoding of a statement like "@filter has ?X ?prop"
  // We use holographic similarity to match conclusions against this pattern
  const filterVector = filter.vector;
  dbg('DEDUCE', `Filter vector available: ${!!filterVector}`);

  // Try to extract operator name from scope metadata for fallback matching
  let filterOperator = null;
  // Check if scope has statement metadata
  const scopeMeta = session.scope?.getMetadata?.(filter.name);
  if (scopeMeta?.operator) {
    filterOperator = scopeMeta.operator;
    dbg('DEDUCE', `Filter operator from scope metadata: ${filterOperator}`);
  }

  // 1. Collect initial facts related to source
  const workingSet = new Map(); // key: fact signature, value: { fact, depth, chain }
  const sourceFacts = componentKB.findByArg0(source.name);

  for (const f of sourceFacts) {
    session.reasoningStats.kbScans++;
    const sig = `${f.operator}:${f.args?.join(':')}`;
    workingSet.set(sig, {
      operator: f.operator,
      args: f.args,
      depth: 0,
      chain: [source.name]
    });
  }

  // Also include source itself as a fact if it has type info
  const sourceTypeFacts = componentKB.findByOperatorAndArg0('isA', source.name);
  for (const f of sourceTypeFacts) {
    const sig = `${f.operator}:${f.args?.join(':')}`;
    if (!workingSet.has(sig)) {
      workingSet.set(sig, {
        operator: f.operator,
        args: f.args,
        depth: 0,
        chain: [source.name]
      });
    }
  }

  dbg('DEDUCE', `Initial working set: ${workingSet.size} facts`);

  // 2. Forward chaining - apply rules iteratively
  for (let d = 1; d <= depth; d++) {
    const newFacts = [];

    // Find implies rules in KB
    const impliesRules = componentKB.findByOperator('implies');
    dbg('DEDUCE', `Found ${impliesRules.length} implies rules`);
    for (const rule of impliesRules) {
      session.reasoningStats.kbScans++;
      // implies has 2 args: condition, consequent (both are references)
      if (rule.args?.length >= 2) {
        const conditionRef = rule.args[0];
        const consequentRef = rule.args[1];

        // Check if any fact in working set matches the condition pattern
        for (const [sig, factData] of workingSet) {
          const { matches, bindings } = matchesCondition(session, factData, conditionRef, componentKB);
          if (matches) {
            dbg('DEDUCE', `Rule ${rule.name || 'implies'} matched: ${sig} bindings: ${JSON.stringify([...bindings])}`);
            // Derive new fact from consequent
            const derived = instantiateConsequent(session, consequentRef, bindings, componentKB);
            if (derived) {
              const derivedSig = `${derived.operator}:${derived.args?.join(':')}`;
              if (!workingSet.has(derivedSig)) {
                dbg('DEDUCE', `Derived: ${derivedSig}`);
                newFacts.push({
                  ...derived,
                  depth: d,
                  chain: [...factData.chain, rule.name || 'implies', derivedSig]
                });
              }
            }
          }
        }
      }
    }

    // Apply causes rules for transitive chains
    for (const [, factData] of workingSet) {
      if (factData.operator === 'causes') {
        // Find what the effect causes
        const effect = factData.args?.[1];
        if (effect) {
          const causedBy = componentKB.findByOperatorAndArg0('causes', effect);
          for (const cf of causedBy) {
            session.reasoningStats.kbScans++;
            const derivedSig = `causes:${effect}:${cf.args?.[1]}`;
            if (!workingSet.has(derivedSig)) {
              newFacts.push({
                operator: 'causes',
                args: [effect, cf.args?.[1]],
                depth: d,
                chain: [...factData.chain, 'causes', cf.args?.[1]]
              });
            }
          }
        }
      }
    }

    // Apply isA transitive chains
    for (const [, factData] of workingSet) {
      if (factData.operator === 'isA') {
        // Find parent types
        const type = factData.args?.[1];
        if (type) {
          const parentTypes = componentKB.findByOperatorAndArg0('isA', type);
          for (const pt of parentTypes) {
            session.reasoningStats.kbScans++;
            const derivedSig = `isA:${factData.args?.[0]}:${pt.args?.[1]}`;
            if (!workingSet.has(derivedSig)) {
              newFacts.push({
                operator: 'isA',
                args: [factData.args?.[0], pt.args?.[1]],
                depth: d,
                chain: [...factData.chain, 'isA', pt.args?.[1]]
              });
            }
          }
        }
      }
    }

    // Add new facts to working set
    for (const nf of newFacts) {
      const sig = `${nf.operator}:${nf.args?.join(':')}`;
      workingSet.set(sig, nf);
    }

    dbg('DEDUCE', `Depth ${d}: added ${newFacts.length} new facts, total: ${workingSet.size}`);

    if (newFacts.length === 0) {
      dbg('DEDUCE', 'Saturation reached');
      break;
    }
  }

  // 3. Filter and score results by similarity to filter pattern
  // For now, include all derived conclusions with scoring based on operator
  const conclusions = [];

  for (const [sig, factData] of workingSet) {
    // Skip initial facts (depth 0) - we want derived conclusions
    if (factData.depth === 0) continue;

    // Score: prioritize derived facts by depth (lower depth = more direct = higher score)
    let score = 1.0 / (factData.depth + 1);

    // Boost score if operator matches common filter patterns
    if (filterOperator && factData.operator === filterOperator) {
      score = 1.0;
    }

    // Use holographic similarity if both vectors are available
    if (filterVector && factData.vector) {
      const simScore = hdcSimilarity(filterVector, factData.vector);
      if (simScore > score) {
        score = simScore;
      }
      dbg('DEDUCE', `Similarity for ${sig}: ${simScore}`);
    }

    conclusions.push({
      operator: factData.operator,
      args: factData.args,
      score,
      depth: factData.depth,
      chain: factData.chain,
      signature: sig
    });
  }

  // Sort by score and limit
  conclusions.sort((a, b) => b.score - a.score);
  const topResults = conclusions.slice(0, limit);

  dbg('DEDUCE', `Found ${conclusions.length} conclusions, returning top ${topResults.length}`);

  // 4. Build result
  const bindings = new Map();
  if (topResults.length > 0) {
    const best = topResults[0];
    bindings.set(hole.name, {
      answer: `${best.operator} ${best.args?.join(' ')}`,
      confidence: best.score,
      depth: best.depth,
      method: 'deduce'
    });
  }

  return {
    success: topResults.length > 0,
    bindings,
    confidence: topResults.length > 0 ? topResults[0].score : 0,
    allResults: topResults.map(r => ({
      bindings: new Map([[hole.name, {
        answer: `${r.operator} ${r.args?.join(' ')}`,
        confidence: r.score
      }]]),
      score: r.score,
      method: 'deduce',
      proof: {
        operation: 'deduce',
        source: source.name,
        filter: filterOperator,
        conclusion: `${r.operator} ${r.args?.join(' ')}`,
        depth: r.depth,
        chain: r.chain
      }
    }))
  };
}

function matchesCondition(session, factData, conditionRef, componentKB) {
  // Look up the condition pattern from KB (it's a named statement)
  // The condition is stored as a fact like: @c1 isA ?X Mammal
  const condFact = session?.kbFacts?.find(f => f.name === conditionRef);
  if (!condFact?.metadata) {
    // Try componentKB
    const compFact = componentKB.facts.find(f => f.metadata?.name === conditionRef);
    if (!compFact) {
      dbg('DEDUCE', `Condition ${conditionRef} not found in KB`);
      return { matches: false, bindings: new Map() };
    }
    // Use componentKB fact
    return matchPattern(factData, compFact.operator, compFact.args || []);
  }

  // Match the pattern
  return matchPattern(factData, condFact.metadata.operator, condFact.metadata.args || []);
}

function matchPattern(factData, patternOp, patternArgs) {
  const bindings = new Map();

  // Operators must match
  if (factData.operator !== patternOp) {
    return { matches: false, bindings };
  }

  // Match arguments, binding variables (starting with ?)
  if (patternArgs.length !== (factData.args?.length || 0)) {
    return { matches: false, bindings };
  }

  for (let i = 0; i < patternArgs.length; i++) {
    const pArg = patternArgs[i];
    const fArg = factData.args?.[i];

    if (pArg.startsWith('?')) {
      // Variable - bind it
      bindings.set(pArg, fArg);
    } else if (pArg !== fArg) {
      // Constant must match exactly
      return { matches: false, bindings };
    }
  }

  return { matches: true, bindings };
}

function instantiateConsequent(session, consequentRef, bindings, componentKB) {
  // Look up the consequent pattern from KB
  const consFact = session?.kbFacts?.find(f => f.name === consequentRef);
  if (!consFact?.metadata) {
    // Try componentKB
    const compFact = componentKB.facts.find(f => f.metadata?.name === consequentRef);
    if (!compFact) {
      dbg('DEDUCE', `Consequent ${consequentRef} not found in KB`);
      return null;
    }
    return instantiatePattern(compFact.operator, compFact.args || [], bindings);
  }

  return instantiatePattern(consFact.metadata.operator, consFact.metadata.args || [], bindings);
}

function instantiatePattern(operator, args, bindings) {
  const newArgs = args.map(arg => {
    if (arg.startsWith('?')) {
      return bindings.get(arg) || arg;
    }
    return arg;
  });

  return {
    operator,
    args: newArgs
  };
}


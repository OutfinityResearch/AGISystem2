/**
 * AGISystem2 - Query Meta-Operators
 * @module reasoning/query-meta-ops
 *
 * Meta-query operators for DS17:
 * - similar: Property-based similarity search
 * - induce: Pattern extraction (intersection)
 * - bundle: Vector superposition (union)
 * - difference: Discriminative properties
 * - analogy: Proportional reasoning (A:B::C:?)
 */

// Re-export inheritance helpers for backwards compatibility
export {
  searchPropertyInheritance,
  isPropertyNegated,
  getAllParentTypes,
  entityIsA
} from './query-inheritance.mjs';

import { similarity as hdcSimilarity } from '../core/operations.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[MetaOps:${category}]`, ...args);
}

/**
 * Search for concepts similar to a given concept using property-based similarity
 * Computes similarity based on shared properties (has, can, isA parent, etc.)
 * @param {Session} session - Session instance
 * @param {Object} known - The known concept {name, vector}
 * @param {Object} hole - The hole to fill {name}
 * @returns {QueryResult} Similar concepts ranked by property overlap
 */
export function searchSimilar(session, known, hole) {
  const knownName = known.name;
  const componentKB = session?.componentKB;

  // Collect properties of the known concept
  const knownProps = new Set();
  if (componentKB) {
    const facts = componentKB.findByArg0(knownName);
    for (const f of facts) {
      session.reasoningStats.kbScans++;
      if (f.args?.[1]) {
        knownProps.add(`${f.operator}:${f.args[1]}`);
      }
    }
  } else {
    for (const fact of session.kbFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (meta?.args?.[0] === knownName && meta?.args?.[1]) {
        knownProps.add(`${meta.operator}:${meta.args[1]}`);
      }
    }
  }

  if (knownProps.size === 0) {
    return { success: false, bindings: new Map(), allResults: [] };
  }

  // Find other concepts and count shared properties
  const candidates = new Map();
  const processed = new Set([knownName]);

  if (componentKB) {
    for (const fact of componentKB.facts) {
      session.reasoningStats.kbScans++;
      const candidate = fact.args?.[0];
      if (!candidate || processed.has(candidate)) continue;
      if (['isA', 'has', 'can', 'likes', 'knows', 'owns', 'uses'].includes(candidate)) continue;

      if (!candidates.has(candidate)) {
        const candFacts = componentKB.findByArg0(candidate);
        const candProps = new Set();
        for (const cf of candFacts) {
          if (cf.args?.[1]) {
            candProps.add(`${cf.operator}:${cf.args[1]}`);
          }
        }
        let shared = 0;
        for (const prop of candProps) {
          if (knownProps.has(prop)) shared++;
        }
        if (candProps.size > 0) {
          candidates.set(candidate, {
            shared,
            total: candProps.size,
            similarity: shared / Math.max(knownProps.size, candProps.size)
          });
        }
      }
      processed.add(candidate);
    }
  }

  // Sort by similarity
  const results = [...candidates.entries()]
    .filter(([_, data]) => data.shared > 0)
    .sort((a, b) => b[1].similarity - a[1].similarity)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      similarity: data.similarity,
      shared: data.shared,
      method: 'property_similarity'
    }));

  // Get shared properties for proof
  const getSharedProps = (candidateName) => {
    const candFacts = componentKB ? componentKB.findByArg0(candidateName) : [];
    const shared = [];
    for (const cf of candFacts) {
      const prop = `${cf.operator}:${cf.args?.[1]}`;
      if (knownProps.has(prop)) {
        shared.push(cf.args?.[1]);
      }
    }
    return shared;
  };

  const allResults = results.map(r => ({
    bindings: new Map([[hole.name, { answer: r.name, similarity: r.similarity, method: 'similar' }]]),
    score: r.similarity,
    method: 'similar',
    proof: {
      operation: 'similar',
      target: knownName,
      entity: r.name,
      sharedProperties: getSharedProps(r.name),
      similarity: r.similarity
    }
  }));

  const bindings = new Map();
  if (results.length > 0) {
    bindings.set(hole.name, {
      answer: results[0].name,
      similarity: results[0].similarity,
      alternatives: results.slice(1, 4).map(r => ({ value: r.name, similarity: r.similarity })),
      method: 'similar'
    });
  }

  return {
    success: results.length > 0,
    bindings,
    confidence: results.length > 0 ? results[0].similarity : 0,
    ambiguous: results.length > 1,
    allResults
  };
}

// ============================================================================
// DS17 META-OPERATORS
// ============================================================================

/**
 * Search for common properties (intersection) across multiple entities
 * @param {Session} session - Session instance
 * @param {Array} entities - Array of entity objects {name, vector}
 * @param {Object} hole - The hole to fill {name}
 * @returns {QueryResult} Common properties
 */
export function searchInduce(session, entities, hole) {
  dbg('INDUCE', `Finding common properties for: ${entities.map(e => e.name).join(', ')}`);

  const componentKB = session?.componentKB;
  if (!componentKB) {
    return { success: false, bindings: new Map(), allResults: [], reason: 'No componentKB' };
  }

  // Collect properties for each entity
  const propertySets = entities.map(entity => {
    const props = new Set();
    const facts = componentKB.findByArg0(entity.name);
    for (const f of facts) {
      session.reasoningStats.kbScans++;
      if (f.args?.[1]) {
        props.add(`${f.operator}:${f.args[1]}`);
      }
    }
    return props;
  });

  if (propertySets.length === 0) {
    return { success: false, bindings: new Map(), allResults: [] };
  }

  // Find intersection
  let intersection = new Set(propertySets[0]);
  for (let i = 1; i < propertySets.length; i++) {
    intersection = new Set([...intersection].filter(p => propertySets[i].has(p)));
  }

  // Parse properties
  const commonProps = [...intersection].map(p => {
    const [op, val] = p.split(':');
    return { operator: op, value: val };
  });

  dbg('INDUCE', `Found ${commonProps.length} common properties`);

  const bindings = new Map();
  if (commonProps.length > 0) {
    bindings.set(hole.name, {
      answer: commonProps.map(p => p.value).join('. '),
      properties: commonProps,
      method: 'induce'
    });
  }

  return {
    success: commonProps.length > 0,
    bindings,
    confidence: commonProps.length > 0 ? 0.9 : 0,
    allResults: [{
      bindings,
      score: 0.9,
      method: 'induce',
      proof: { operation: 'induce', sources: entities.map(e => e.name), common: commonProps }
    }]
  };
}

/**
 * Search for all properties (union) across multiple entities
 * @param {Session} session - Session instance
 * @param {Array} entities - Array of entity objects {name, vector}
 * @param {Object} hole - The hole to fill {name}
 * @returns {QueryResult} Combined properties
 */
export function searchBundle(session, entities, hole) {
  dbg('BUNDLE', `Bundling properties for: ${entities.map(e => e.name).join(', ')}`);

  const componentKB = session?.componentKB;
  if (!componentKB) {
    return { success: false, bindings: new Map(), allResults: [], reason: 'No componentKB' };
  }

  // Collect ALL properties (union)
  const allProps = new Set();
  for (const entity of entities) {
    const facts = componentKB.findByArg0(entity.name);
    for (const f of facts) {
      session.reasoningStats.kbScans++;
      if (f.args?.[1]) {
        allProps.add(`${f.operator}:${f.args[1]}`);
      }
    }
  }

  // Parse properties
  const combinedProps = [...allProps].map(p => {
    const [op, val] = p.split(':');
    return { operator: op, value: val };
  });

  dbg('BUNDLE', `Found ${combinedProps.length} total properties`);

  const bindings = new Map();
  if (combinedProps.length > 0) {
    bindings.set(hole.name, {
      answer: combinedProps.map(p => p.value).join('. '),
      properties: combinedProps,
      method: 'bundle'
    });
  }

  return {
    success: combinedProps.length > 0,
    bindings,
    confidence: combinedProps.length > 0 ? 0.85 : 0,
    allResults: [{
      bindings,
      score: 0.85,
      method: 'bundle',
      proof: { operation: 'bundle', sources: entities.map(e => e.name), combined: combinedProps }
    }]
  };
}

/**
 * Find properties unique to entityA (not in entityB)
 * @param {Session} session - Session instance
 * @param {Object} entityA - First entity {name, vector}
 * @param {Object} entityB - Second entity {name, vector}
 * @param {Object} hole - The hole to fill {name}
 * @returns {QueryResult} Discriminative properties
 */
export function searchDifference(session, entityA, entityB, hole) {
  dbg('DIFFERENCE', `Finding properties unique to ${entityA.name} vs ${entityB.name}`);

  const componentKB = session?.componentKB;
  if (!componentKB) {
    return { success: false, bindings: new Map(), allResults: [], reason: 'No componentKB' };
  }

  // Get properties of A
  const propsA = new Set();
  for (const f of componentKB.findByArg0(entityA.name)) {
    session.reasoningStats.kbScans++;
    if (f.args?.[1]) propsA.add(`${f.operator}:${f.args[1]}`);
  }

  // Get properties of B
  const propsB = new Set();
  for (const f of componentKB.findByArg0(entityB.name)) {
    session.reasoningStats.kbScans++;
    if (f.args?.[1]) propsB.add(`${f.operator}:${f.args[1]}`);
  }

  // Find differences
  const uniqueToA = [...propsA].filter(p => !propsB.has(p)).map(p => {
    const [op, val] = p.split(':');
    return { operator: op, value: val, uniqueTo: entityA.name };
  });

  const uniqueToB = [...propsB].filter(p => !propsA.has(p)).map(p => {
    const [op, val] = p.split(':');
    return { operator: op, value: val, uniqueTo: entityB.name };
  });

  dbg('DIFFERENCE', `A-B: ${uniqueToA.length}, B-A: ${uniqueToB.length}`);

  const allDiff = [...uniqueToA, ...uniqueToB];
  const bindings = new Map();
  if (allDiff.length > 0) {
    bindings.set(hole.name, {
      answer: allDiff.map(p => p.value).join('. '),
      uniqueToA,
      uniqueToB,
      method: 'difference'
    });
  }

  return {
    success: allDiff.length > 0,
    bindings,
    confidence: allDiff.length > 0 ? 0.9 : 0,
    allResults: [{
      bindings,
      score: 0.9,
      method: 'difference',
      proof: { operation: 'difference', entityA: entityA.name, entityB: entityB.name, uniqueToA, uniqueToB }
    }]
  };
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
        if (f.args?.[1]) propsA.add(f.args[1]);
      }
      for (const f of componentKB.findByArg0(knownC.name)) {
        if (f.args?.[1]) propsC.add(f.args[1]);
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

// ============================================================================
// DEDUCE - Forward-chaining deduction from premises
// ============================================================================

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
          const { matches, bindings } = matchesCondition(factData, conditionRef, componentKB, session);
          if (matches) {
            dbg('DEDUCE', `Rule ${rule.name || 'implies'} matched: ${sig} bindings: ${JSON.stringify([...bindings])}`);
            // Derive new fact from consequent
            const derived = instantiateConsequent(consequentRef, bindings, componentKB, session);
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
    for (const [sig, factData] of workingSet) {
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
    for (const [sig, factData] of workingSet) {
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

/**
 * Check if a fact matches a condition pattern and return bindings
 * @param {Object} factData - Fact from working set {operator, args}
 * @param {string} conditionRef - Reference name like "c1"
 * @param {ComponentKB} componentKB - KB to look up patterns
 * @param {Session} session - Session for scope access
 * @returns {{matches: boolean, bindings: Map}} Match result with variable bindings
 */
function matchesCondition(factData, conditionRef, componentKB, session) {
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

/**
 * Match fact against a pattern with variable binding
 */
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

/**
 * Instantiate a consequent pattern with bindings from matched fact
 */
function instantiateConsequent(consequentRef, bindings, componentKB, session) {
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

/**
 * Create fact from pattern by substituting bindings
 */
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

/**
 * AGISystem2 - Query Meta-Operators (Property/Set Ops)
 * @module reasoning/query-meta-ops/property-sets
 *
 * DS17 meta-operators implemented via ComponentKB property scans:
 * - similar
 * - induce (intersection)
 * - bundle (union)
 * - difference (symmetric difference by provenance)
 */

import { debug_trace } from '../../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[MetaOps:${category}]`, ...args);
}

const EXCLUDED_PROPERTY_OPERATORS = new Set([
  'difference',
  'bundlepattern',
  'inducepattern'
]);

export function shouldIncludeProperty(operator, value) {
  if (!value) return false;
  const key = String(operator || '').toLowerCase();
  return !EXCLUDED_PROPERTY_OPERATORS.has(key);
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
      if (shouldIncludeProperty(f.operator, f.args?.[1])) {
        knownProps.add(`${f.operator}:${f.args[1]}`);
      }
    }
  } else {
    for (const fact of session.kbFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (meta?.args?.[0] === knownName && shouldIncludeProperty(meta.operator, meta.args?.[1])) {
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
          if (shouldIncludeProperty(cf.operator, cf.args?.[1])) {
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
      if (!shouldIncludeProperty(cf.operator, cf.args?.[1])) continue;
      const prop = `${cf.operator}:${cf.args[1]}`;
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
      if (shouldIncludeProperty(f.operator, f.args?.[1])) {
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
      if (shouldIncludeProperty(f.operator, f.args?.[1])) {
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
    if (shouldIncludeProperty(f.operator, f.args?.[1])) propsA.add(`${f.operator}:${f.args[1]}`);
  }

  // Get properties of B
  const propsB = new Set();
  for (const f of componentKB.findByArg0(entityB.name)) {
    session.reasoningStats.kbScans++;
    if (shouldIncludeProperty(f.operator, f.args?.[1])) propsB.add(`${f.operator}:${f.args[1]}`);
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


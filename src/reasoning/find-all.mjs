/**
 * AGISystem2 - FindAll Engine
 * @module reasoning/find-all
 *
 * Enumerates ALL matches for a pattern in the knowledge base.
 * Unlike query which returns best match, findAll returns complete enumeration.
 */

import { parse } from '../parser/index.mjs';

/**
 * Find all bindings that match a pattern
 * @param {Session} session - Session with KB
 * @param {string|Object} pattern - Pattern string or parsed statement
 * @param {Object} options - Options
 * @returns {FindAllResult}
 */
export function findAll(session, pattern, options = {}) {
  const maxResults = options.maxResults || 1000;
  const includeTransitive = options.includeTransitive ?? true;

  // Parse if string
  let stmt;
  if (typeof pattern === 'string') {
    const ast = parse(pattern);
    if (!ast.statements || ast.statements.length === 0) {
      return { success: false, count: 0, results: [], error: 'Invalid pattern' };
    }
    stmt = ast.statements[0];
  } else {
    stmt = pattern;
  }

  // Extract operator and args
  const operatorName = stmt.operator?.name || stmt.operator?.value || stmt.operator;
  const args = stmt.args || [];

  // Identify holes (variables) and knowns (constants)
  const holes = [];
  const knowns = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.type === 'Hole' || (typeof arg === 'string' && arg.startsWith('?'))) {
      const name = arg.name || arg.substring(1);
      holes.push({ index: i, name });
    } else {
      const value = arg.name || arg.value || arg;
      knowns.push({ index: i, value });
    }
  }

  const results = [];

  // Scan KB for all matches
  for (const fact of session.kbFacts) {
    session.reasoningStats.kbScans++;
    if (results.length >= maxResults) break;

    const meta = fact.metadata;
    if (!meta || meta.operator !== operatorName) continue;
    if (!meta.args || meta.args.length !== args.length) continue;

    // Check all knowns match
    let matches = true;
    for (const known of knowns) {
      if (meta.args[known.index] !== known.value) {
        matches = false;
        break;
      }
    }

    if (matches) {
      // Extract bindings for holes
      const bindings = {};
      for (const hole of holes) {
        bindings[hole.name] = meta.args[hole.index];
      }

      // Check for duplicates
      const isDuplicate = results.some(r =>
        Object.keys(bindings).every(k => r.bindings[k] === bindings[k])
      );

      if (!isDuplicate) {
        results.push({
          bindings,
          fact: `${operatorName} ${meta.args.join(' ')}`,
          method: 'direct'
        });
      }
    }
  }

  // Add transitive results for transitive relations
  const isTransitive =
    (session?.semanticIndex?.isTransitive?.(operatorName)) ??
    isTransitiveRelationFallback(operatorName);

  if (includeTransitive && isTransitive) {
    const transitiveResults = findTransitiveResults(session, operatorName, holes, knowns, maxResults - results.length);
    for (const tr of transitiveResults) {
      const isDuplicate = results.some(r =>
        Object.keys(tr.bindings).every(k => r.bindings[k] === tr.bindings[k])
      );
      if (!isDuplicate && results.length < maxResults) {
        results.push(tr);
      }
    }
  }

  return {
    success: results.length > 0,
    count: results.length,
    results,
    truncated: results.length >= maxResults,
    pattern: `${operatorName} ${args.map(a => a.name || a.value || a).join(' ')}`
  };
}

/**
 * Check if relation supports transitive reasoning
 */
function isTransitiveRelationFallback(operator) {
  return ['isA', 'locatedIn', 'partOf', 'subsetOf', 'before', 'after',
          'causes', 'appealsTo', 'leadsTo', 'enables', 'containedIn'].includes(operator);
}

/**
 * Find results through transitive chains
 */
function findTransitiveResults(session, operator, holes, knowns, maxResults) {
  const results = [];

  // Only handle simple cases: one hole, one known
  if (holes.length !== 1 || knowns.length !== 1) {
    return results;
  }

  const hole = holes[0];
  const known = knowns[0];

  // Build adjacency from KB
  const edges = new Map(); // from -> [to1, to2, ...]

  for (const fact of session.kbFacts) {
    session.reasoningStats.kbScans++;
    const meta = fact.metadata;
    if (!meta || meta.operator !== operator) continue;
    if (!meta.args || meta.args.length !== 2) continue;

    const [from, to] = meta.args;
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from).push(to);
  }

  // BFS to find all reachable nodes
  if (hole.index === 1 && known.index === 0) {
    // Pattern: operator Known ?hole -> find all targets from Known
    const visited = new Set();
    const queue = [known.value];
    visited.add(known.value);

    while (queue.length > 0 && results.length < maxResults) {
      const current = queue.shift();
      const neighbors = edges.get(current) || [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          results.push({
            bindings: { [hole.name]: neighbor },
            fact: `${operator} ${known.value} ${neighbor}`,
            method: 'transitive'
          });
        }
      }
    }
  } else if (hole.index === 0 && known.index === 1) {
    // Pattern: operator ?hole Known -> find all sources to Known
    // Build reverse edges
    const reverseEdges = new Map();
    for (const [from, tos] of edges) {
      for (const to of tos) {
        if (!reverseEdges.has(to)) reverseEdges.set(to, []);
        reverseEdges.get(to).push(from);
      }
    }

    const visited = new Set();
    const queue = [known.value];
    visited.add(known.value);

    while (queue.length > 0 && results.length < maxResults) {
      const current = queue.shift();
      const neighbors = reverseEdges.get(current) || [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          results.push({
            bindings: { [hole.name]: neighbor },
            fact: `${operator} ${neighbor} ${known.value}`,
            method: 'transitive'
          });
        }
      }
    }
  }

  return results;
}

/**
 * Find all entities of a given type
 * @param {Session} session - Session with KB
 * @param {string} typeName - Type to find (e.g., 'Guest', 'Table')
 * @returns {string[]} All entities of that type
 */
export function findAllOfType(session, typeName) {
  const result = findAll(session, `isA ?entity ${typeName}`, { includeTransitive: false });
  return result.results.map(r => r.bindings.entity);
}

/**
 * Find all values for a relation with one known argument
 * @param {Session} session - Session with KB
 * @param {string} relation - Relation name
 * @param {string} knownArg - Known argument value
 * @param {number} knownPosition - Position of known arg (0 or 1)
 * @returns {string[]} All matching values
 */
export function findAllRelated(session, relation, knownArg, knownPosition = 0) {
  const pattern = knownPosition === 0
    ? `${relation} ${knownArg} ?target`
    : `${relation} ?source ${knownArg}`;

  const result = findAll(session, pattern);
  const varName = knownPosition === 0 ? 'target' : 'source';
  return result.results.map(r => r.bindings[varName]);
}

export default { findAll, findAllOfType, findAllRelated };

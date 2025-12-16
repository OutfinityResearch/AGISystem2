/**
 * AGISystem2 - Transitive Query Operations
 * @module reasoning/query-transitive
 *
 * Handles transitive reasoning for isA, locatedIn, partOf, etc.
 */

import { TRANSITIVE_RELATIONS } from './transitive.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[QueryTrans:${category}]`, ...args);
}

/**
 * Search via transitive reasoning
 * Handles 1, 2, or more holes
 * @param {Session} session - Session with KB
 * @param {string} operatorName - Relation name
 * @param {Array} knowns - Known arguments with positions
 * @param {Array} holes - Holes with positions
 * @returns {Array} Matching results with bindings
 */
export function searchTransitive(session, operatorName, knowns, holes) {
  const results = [];

  // Case 1: "isA Subject ?var" - find all transitive targets (1 hole, subject known)
  if (holes.length === 1 && knowns.length === 1 && knowns[0].index === 1) {
    const subject = knowns[0].name;
    const targets = findAllTransitiveTargets(session, operatorName, subject);

    for (const target of targets) {
      const factBindings = new Map();
      factBindings.set(holes[0].name, {
        answer: target.value,
        similarity: 0.9 - (target.depth * 0.05),
        method: 'transitive',
        steps: target.steps
      });

      results.push({
        bindings: factBindings,
        score: 0.9 - (target.depth * 0.05),
        method: 'transitive',
        depth: target.depth
      });
    }
  }

  // Case 2: "isA ?var Target" - find all subjects (1 hole, target known)
  if (holes.length === 1 && knowns.length === 1 && knowns[0].index === 2) {
    const target = knowns[0].name;
    const subjects = findAllTransitiveSources(session, operatorName, target);

    for (const subject of subjects) {
      const factBindings = new Map();
      factBindings.set(holes[0].name, {
        answer: subject.value,
        similarity: 0.9 - (subject.depth * 0.05),
        method: 'transitive',
        steps: subject.steps
      });

      results.push({
        bindings: factBindings,
        score: 0.9 - (subject.depth * 0.05),
        method: 'transitive',
        depth: subject.depth
      });
    }
  }

  // Case 3: "isA ?x ?y" - find ALL transitive pairs (2 holes, nothing known)
  if (holes.length === 2 && knowns.length === 0) {
    const hole1 = holes.find(h => h.index === 1);
    const hole2 = holes.find(h => h.index === 2);
    if (hole1 && hole2) {
      const pairs = findAllTransitivePairs(session, operatorName);
      for (const pair of pairs) {
        const factBindings = new Map();
        factBindings.set(hole1.name, {
          answer: pair.subject,
          similarity: 0.85 - (pair.depth * 0.05),
          method: 'transitive'
        });
        factBindings.set(hole2.name, {
          answer: pair.target,
          similarity: 0.85 - (pair.depth * 0.05),
          method: 'transitive'
        });

        results.push({
          bindings: factBindings,
          score: 0.85 - (pair.depth * 0.05),
          method: 'transitive',
          depth: pair.depth
        });
      }
    }
  }

  return results;
}

/**
 * Find all transitive pairs (subject, target) for a relation
 * @param {Session} session - Session with KB
 * @param {string} relation - Relation name
 * @returns {Array} All pairs with depth info
 */
export function findAllTransitivePairs(session, relation) {
  const pairs = [];
  const visited = new Set();

  // Start from all subjects
  const allSubjects = new Set();
  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator === relation && meta.args) {
      allSubjects.add(meta.args[0]);
    }
  }

  // For each subject, find all transitive targets
  for (const subject of allSubjects) {
    const targets = findAllTransitiveTargets(session, relation, subject);
    for (const target of targets) {
      const key = `${subject}:${target.value}`;
      if (!visited.has(key)) {
        visited.add(key);
        pairs.push({
          subject,
          target: target.value,
          depth: target.depth,
          steps: target.steps
        });
      }
    }
  }

  return pairs;
}

/**
 * Find all transitive targets for a subject
 * @param {Session} session - Session with KB
 * @param {string} relation - Relation name
 * @param {string} subject - Starting subject
 * @returns {Array} All reachable targets with depth info
 */
export function findAllTransitiveTargets(session, relation, subject) {
  const targets = [];
  const visited = new Set();
  const queue = [{ value: subject, depth: 0, steps: [] }];

  while (queue.length > 0) {
    const { value: current, depth, steps } = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    // Find direct relations
    for (const fact of session.kbFacts) {
      const meta = fact.metadata;
      if (!meta || meta.operator !== relation) continue;
      if (!meta.args || meta.args[0] !== current) continue;

      const target = meta.args[1];
      if (!visited.has(target)) {
        const newSteps = [...steps, `${relation} ${current} ${target}`];
        targets.push({ value: target, depth: depth + 1, steps: newSteps });
        queue.push({ value: target, depth: depth + 1, steps: newSteps });
      }
    }
  }

  return targets;
}

/**
 * Find all subjects that have transitive relation to target
 * @param {Session} session - Session with KB
 * @param {string} relation - Relation name
 * @param {string} target - Target value
 * @returns {Array} All source subjects with depth info
 */
export function findAllTransitiveSources(session, relation, target) {
  const sources = [];
  const visited = new Set();

  // Build reverse graph first
  const reverseEdges = new Map(); // target -> [sources]
  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (!meta || meta.operator !== relation) continue;
    if (!meta.args) continue;

    const src = meta.args[0];
    const tgt = meta.args[1];
    if (!reverseEdges.has(tgt)) {
      reverseEdges.set(tgt, []);
    }
    reverseEdges.get(tgt).push(src);
  }

  // BFS from target backwards
  const queue = [{ value: target, depth: 0, steps: [] }];

  while (queue.length > 0) {
    const { value: current, depth, steps } = queue.shift();

    const srcs = reverseEdges.get(current) || [];
    for (const src of srcs) {
      if (!visited.has(src)) {
        visited.add(src);
        const newSteps = [`${relation} ${src} ${current}`, ...steps];
        sources.push({ value: src, depth: depth + 1, steps: newSteps });
        queue.push({ value: src, depth: depth + 1, steps: newSteps });
      }
    }
  }

  return sources;
}

/**
 * Check if entity transitively reaches target via relation
 * @param {Session} session - Session with KB
 * @param {string} relation - Relation name
 * @param {string} entity - Starting entity
 * @param {string} target - Target to reach
 * @param {Set} visited - Already visited (for cycle detection)
 * @returns {boolean} True if reachable
 */
export function reachesTransitively(session, relation, entity, target, visited = new Set()) {
  if (visited.has(entity)) return false;
  visited.add(entity);

  for (const fact of session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator !== relation) continue;
    if (meta.args?.[0] !== entity) continue;

    const nextValue = meta.args[1];
    if (nextValue === target) return true;
    if (reachesTransitively(session, relation, nextValue, target, visited)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if operator is transitive
 * @param {string} operatorName - Operator name
 * @returns {boolean} True if transitive
 */
export function isTransitiveRelation(operatorName) {
  return TRANSITIVE_RELATIONS.has(operatorName);
}

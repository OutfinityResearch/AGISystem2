/**
 * AGISystem2 - Query Inheritance Helpers
 * @module reasoning/query-inheritance
 *
 * Property inheritance through isA chains:
 * - searchPropertyInheritance: Find properties via hierarchy
 * - isPropertyNegated: Check if property is negated
 * - getAllParentTypes: Get all parent types
 * - entityIsA: Check if entity is a type
 */

import { debug_trace } from '../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[Inheritance:${category}]`, ...args);
}

/**
 * Search for properties via isA inheritance chain
 * e.g., can Rex Bark because Rex isA GermanShepherd isA Dog, and Dog can Bark
 * @param {Session} session - Session instance
 * @param {string} operator - Property operator (can, has, etc.)
 * @param {string} entityName - Entity to search properties for
 * @param {string} holeName - Name of the hole variable
 * @returns {Array} Query results with bindings and proof steps
 */
export function searchPropertyInheritance(session, operator, entityName, holeName) {
  const results = [];
  const visited = new Set();
  const componentKB = session?.componentKB;
  const factIndex = session?.factIndex;

  // Build isA chain for entity
  const queue = [{ entity: entityName, depth: 0, steps: [] }];

  while (queue.length > 0) {
    const { entity: current, depth, steps } = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all properties at this level
    const propsAtLevel = [];
    if (componentKB) {
      const facts = componentKB.findByOperatorAndArg0(operator, current);
      for (const fact of facts) {
        if (fact.args?.[1]) {
          propsAtLevel.push({ value: fact.args[1], holder: current });
        }
      }
    } else {
      const scanFacts = factIndex?.getByOperator ? factIndex.getByOperator(operator) : session.kbFacts;
      for (const fact of scanFacts) {
        session.reasoningStats.kbScans++;
        const meta = fact.metadata;
        if (meta?.operator === operator && meta.args?.[0] === current && meta.args?.[1]) {
          propsAtLevel.push({ value: meta.args[1], holder: current });
        }
      }
    }

    // Add results for this level
    for (const prop of propsAtLevel) {
      // Check if this property is negated for the original entity
      if (isPropertyNegated(session, operator, entityName, prop.value)) {
        continue;
      }

      // Build proof steps for inheritance
      const fullSteps = [...steps, `${operator} ${prop.holder} ${prop.value}`];

      const factBindings = new Map();
      factBindings.set(holeName, {
        answer: prop.value,
        similarity: 0.9 - (depth * 0.05),
        method: 'property_inheritance',
        steps: fullSteps
      });

      results.push({
        bindings: factBindings,
        score: 0.9 - (depth * 0.05),
        method: 'property_inheritance',
        depth,
        inheritedFrom: prop.holder
      });
    }

    // Find parents via isA
    if (componentKB) {
      const isAFacts = componentKB.findByOperatorAndArg0('isA', current);
      for (const fact of isAFacts) {
        const parent = fact.args?.[1];
        if (parent && !visited.has(parent)) {
          const newSteps = [...steps, `isA ${current} ${parent}`];
          queue.push({ entity: parent, depth: depth + 1, steps: newSteps });
        }
      }
    } else {
      const scanFacts = factIndex?.getByOperator ? factIndex.getByOperator('isA') : session.kbFacts;
      for (const fact of scanFacts) {
        session.reasoningStats.kbScans++;
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === current) {
          const parent = meta.args[1];
          if (parent && !visited.has(parent)) {
            const newSteps = [...steps, `isA ${current} ${parent}`];
            queue.push({ entity: parent, depth: depth + 1, steps: newSteps });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Search for entities that inherit a property value via isA chain
 * e.g., causes ?x SupplyChainDisruption because Hazard causes SupplyChainDisruption
 * @param {Session} session - Session instance
 * @param {string} operator - Property operator
 * @param {string} value - Property value
 * @param {string} holeName - Name of the hole variable
 * @returns {Array} Query results with bindings and proof steps
 */
export function searchPropertyInheritanceByValue(session, operator, value, holeName) {
  const results = [];
  const componentKB = session?.componentKB;
  const factIndex = session?.factIndex;

  const holderFacts = componentKB
    ? componentKB.findByOperatorAndArg1(operator, value)
    : (() => {
      const scanFacts = factIndex?.getByOperator ? factIndex.getByOperator(operator) : session.kbFacts;
      session.reasoningStats.kbScans += scanFacts.length;
      return scanFacts
        .filter(f => f.metadata?.operator === operator && f.metadata?.args?.[1] === value)
        .map(f => f.metadata);
    })();

  const holders = new Set();
  for (const fact of holderFacts) {
    const holder = fact.args?.[0];
    if (holder) holders.add(holder);
  }

  if (holders.size === 0) return results;

  const candidates = new Set();
  if (componentKB) {
    const isAFacts = componentKB.findByOperator('isA');
    for (const fact of isAFacts) {
      if (fact.args?.[0]) candidates.add(fact.args[0]);
    }
  } else {
    const scanFacts = factIndex?.getByOperator ? factIndex.getByOperator('isA') : session.kbFacts;
    for (const fact of scanFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (meta?.operator === 'isA' && meta.args?.[0]) {
        candidates.add(meta.args[0]);
      }
    }
  }

  for (const holder of holders) {
    candidates.add(holder);
  }

  for (const entity of candidates) {
    for (const holder of holders) {
      if (!entityIsA(session, entity, holder)) continue;
      if (isPropertyNegated(session, operator, entity, value)) continue;

      const chainSteps = findIsAPath(session, entity, holder) || [];
      const depth = chainSteps.length;
      const fullSteps = [...chainSteps, `${operator} ${holder} ${value}`];

      const factBindings = new Map();
      factBindings.set(holeName, {
        answer: entity,
        similarity: 0.9 - (depth * 0.05),
        method: 'property_inheritance',
        steps: fullSteps
      });

      results.push({
        bindings: factBindings,
        score: 0.9 - (depth * 0.05),
        method: 'property_inheritance',
        depth,
        inheritedFrom: holder
      });
    }
  }

  return results;
}

/**
 * Check if a property is negated for an entity (directly or via type)
 * Uses HDC similarity matching to compare against Not references
 * @param {Session} session - Session instance
 * @param {string} operator - Property operator
 * @param {string} entity - Entity name
 * @param {string} value - Property value
 * @returns {boolean} True if negated
 */
export function isPropertyNegated(session, operator, entity, value) {
  // Check if there's a negation that applies to this entity or any parent type
  const entitiesToCheck = [entity, ...getAllParentTypes(session, entity)];
  const isExact = (session?.hdcStrategy || 'exact') === 'exact';
  const factIndex = session?.factIndex;

  for (const ent of entitiesToCheck) {
    // Fast-path: explicit/expanded Not operator facts (includes Not $ref expansions).
    if (factIndex?.hasNary && factIndex.hasNary('Not', [operator, ent, value])) {
      return true;
    }

    // Check direct negation via Not $ref pattern using HDC similarity
    if (isExact) continue;

    const notFacts = factIndex?.getByOperator ? factIndex.getByOperator('Not') : session.kbFacts;
    for (const fact of notFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (meta?.operator === 'Not') {
        const negatedRef = meta.args?.[0];
        if (negatedRef) {
          const refName = negatedRef.replace(/^\$/, '');
          const negatedVec = session.scope.get(refName);
          if (!negatedVec) continue;

          // Build a vector for the property we're checking
          const checkFact = {
            operator: { type: 'Identifier', name: operator },
            args: [
              { type: 'Identifier', name: ent },
              { type: 'Identifier', name: value }
            ]
          };

          const checkVec = session.executor.buildStatementVector(checkFact);
          if (!checkVec) continue;

          // Compare using HDC similarity
          session.reasoningStats.similarityChecks++;
          const sim = session.similarity(checkVec, negatedVec);

          // Use threshold for match (0.85 is typical for rule matching)
          if (sim > 0.85) {
            return true;
          }
        }
      }
    }

    // Legacy fallback: older Not encodings (if any) - scan Not operator facts only.
    for (const fact of notFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact?.metadata;
      if (meta?.operator !== 'Not') continue;
      if (meta.args?.[0] === operator && meta.args?.[1] === ent && meta.args?.[2] === value) return true;
    }
  }

  return false;
}

/**
 * Get all parent types for an entity via isA chain
 * @param {Session} session - Session instance
 * @param {string} entity - Entity name
 * @returns {Array<string>} Array of parent type names
 */
export function getAllParentTypes(session, entity) {
  const parents = [];
  const visited = new Set();
  const queue = [entity];
  const componentKB = session?.componentKB;
  const factIndex = session?.factIndex;

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const scanFacts = componentKB?.findByOperatorAndArg0
      ? componentKB.findByOperatorAndArg0('isA', current)
      : (factIndex?.getByOperator ? factIndex.getByOperator('isA') : session.kbFacts);

    for (const fact of scanFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact?.metadata || fact;
      if (meta?.operator === 'isA' && meta.args?.[0] === current) {
        const parent = meta.args[1];
        if (parent && !visited.has(parent)) {
          parents.push(parent);
          queue.push(parent);
        }
      }
    }
  }
  return parents;
}

/**
 * Check if entity is a type via isA chain
 * @param {Session} session - Session instance
 * @param {string} entity - Entity name
 * @param {string} type - Type to check
 * @returns {boolean} True if entity isA type
 */
export function entityIsA(session, entity, type) {
  const visited = new Set();
  const queue = [entity];
  const componentKB = session?.componentKB;
  const factIndex = session?.factIndex;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === type) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const scanFacts = componentKB?.findByOperatorAndArg0
      ? componentKB.findByOperatorAndArg0('isA', current)
      : (factIndex?.getByOperator ? factIndex.getByOperator('isA') : session.kbFacts);

    for (const fact of scanFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact?.metadata || fact;
      if (meta?.operator === 'isA' && meta.args?.[0] === current) {
        const parent = meta.args[1];
        if (parent && !visited.has(parent)) {
          queue.push(parent);
        }
      }
    }
  }
  return false;
}

function findIsAPath(session, entity, targetType) {
  if (entity === targetType) return [];

  const visited = new Set([entity]);
  const queue = [entity];
  const prev = new Map();
  const componentKB = session?.componentKB;
  const factIndex = session?.factIndex;

  while (queue.length > 0) {
    const current = queue.shift();
    const parents = [];

    if (componentKB) {
      const facts = componentKB.findByOperatorAndArg0('isA', current);
      for (const fact of facts) {
        if (fact.args?.[1]) parents.push(fact.args[1]);
      }
    } else {
      const scanFacts = factIndex?.getByOperator ? factIndex.getByOperator('isA') : session.kbFacts;
      for (const fact of scanFacts) {
        session.reasoningStats.kbScans++;
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === current && meta.args?.[1]) {
          parents.push(meta.args[1]);
        }
      }
    }

    for (const parent of parents) {
      if (visited.has(parent)) continue;
      visited.add(parent);
      prev.set(parent, current);
      if (parent === targetType) {
        queue.length = 0;
        break;
      }
      queue.push(parent);
    }
  }

  if (!prev.has(targetType)) return null;

  const nodes = [targetType];
  while (prev.has(nodes[nodes.length - 1])) {
    nodes.push(prev.get(nodes[nodes.length - 1]));
  }
  nodes.reverse();

  const steps = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    steps.push(`isA ${nodes[i]} ${nodes[i + 1]}`);
  }
  return steps;
}

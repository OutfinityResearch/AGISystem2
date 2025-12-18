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

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Inheritance:${category}]`, ...args);
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
      for (const fact of session.kbFacts) {
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
      for (const fact of session.kbFacts) {
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

  for (const ent of entitiesToCheck) {
    // Check direct negation via Not $ref pattern using HDC similarity
    for (const fact of session.kbFacts) {
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

    // Also check for explicit "Not operator entity value" facts
    for (const fact of session.kbFacts) {
      const meta = fact.metadata;
      if (!meta) continue;

      if (meta.operator === 'Not' && meta.args?.length >= 3) {
        const negOp = meta.args[0];
        const negEntity = meta.args[1];
        const negValue = meta.args[2];

        if (negOp === operator && negEntity === ent && negValue === value) {
          return true;
        }
      }
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

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    for (const fact of session.kbFacts) {
      const meta = fact.metadata;
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

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === type) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const fact of session.kbFacts) {
      const meta = fact.metadata;
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

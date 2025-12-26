/**
 * AGISystem2 - Property Inheritance Module
 * @module reasoning/property-inheritance
 *
 * Implements property inheritance through isA hierarchies:
 * - If `isA Child Parent` and `prop Parent Value`, then `prop Child Value`
 * - Works recursively through deep isA chains
 * - Handles exceptions (Not prop X Y blocks inheritance)
 *
 * This is distinct from simple transitivity:
 * - Transitive: isA A B, isA B C => isA A C (same relation)
 * - Inheritance: isA A B, can B Fly => can A Fly (cross-relation)
 */

import { getThresholds } from '../core/constants.mjs';
import { TRANSITIVE_RELATIONS, RESERVED_WORDS } from './transitive.mjs';
import { DEFAULT_SEMANTIC_INDEX } from '../runtime/semantic-index.mjs';

/**
 * Relations that propagate DOWN the isA hierarchy.
 *
 * DS19: Prefer theory-derived properties (SemanticIndex). This exported set is used
 * as a conservative fallback and is initialized from the default SemanticIndex.
 */
export const INHERITABLE_PROPERTIES = new Set(DEFAULT_SEMANTIC_INDEX?.inheritableProperties || []);

/**
 * Property Inheritance Reasoner
 */
export class PropertyInheritanceReasoner {
  constructor(proofEngine) {
    this.engine = proofEngine;
    const strategy = proofEngine.session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);
  }

  get session() {
    return this.engine.session;
  }

  get options() {
    return this.engine.options;
  }

  /**
   * Try to prove a goal via property inheritance
   * If goal is `prop Entity Value`, check if any parent of Entity has that property
   *
   * @param {Object} goal - Goal statement
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  tryPropertyInheritance(goal, depth) {
    const operatorName = this.engine.extractOperatorName(goal);

    // Only handle inheritable properties
    const isInheritable =
      this.session?.semanticIndex?.isInheritableProperty
        ? this.session.semanticIndex.isInheritableProperty(operatorName)
        : (operatorName ? INHERITABLE_PROPERTIES.has(operatorName) : false);

    if (!operatorName || !isInheritable) {
      return { valid: false };
    }

    if (!goal.args || goal.args.length < 2) {
      return { valid: false };
    }

    const entityName = this.engine.extractArgName(goal.args[0]);
    const valueName = this.engine.extractArgName(goal.args[1]);

    if (!entityName || !valueName) {
      return { valid: false };
    }

    // Check for exception first: Not prop Entity Value
    if (this.hasException(operatorName, entityName, valueName)) {
      return { valid: false, reason: 'Exception blocks inheritance' };
    }

    // Find all parents of entity via isA chain
    const parents = this.findAllParents(entityName, new Set());

    for (const parent of parents) {
      if (this.engine.isTimedOut()) {
        throw new Error('Proof timed out');
      }

      // Check for exception at parent level
      if (this.hasException(operatorName, parent.value, valueName)) {
        continue; // This parent path is blocked
      }

      // Check if parent has the property
      if (this.hasProperty(operatorName, parent.value, valueName)) {
        const inheritedFact = `${operatorName} ${entityName} ${valueName}`;
        const parentFact = `${operatorName} ${parent.value} ${valueName}`;

        return {
          valid: true,
          method: 'property_inheritance',
          confidence: this.thresholds.RULE_CONFIDENCE * Math.pow(this.thresholds.TRANSITIVE_DECAY, parent.depth),
          goal: goal.toString?.() || inheritedFact,
          steps: [
            ...parent.steps,
            { operation: 'inherit_property', fact: parentFact, from: parent.value },
            { operation: 'property_inherited', fact: inheritedFact }
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Find all parents of an entity via isA chains
   * Returns array of {value, depth, steps} for each parent
   */
  findAllParents(entity, visited, depth = 0, steps = []) {
    const parents = [];
    if (visited.has(entity)) return parents;
    if (depth > (this.options?.maxDepth || 10)) return parents;

    visited.add(entity);

    // Find direct parents via isA
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;

      if (meta?.operator === 'isA' && meta.args?.[0] === entity) {
        const parent = meta.args[1];
        if (!parent || RESERVED_WORDS.has(parent)) continue;
        if (visited.has(parent)) continue;

        const stepFact = `isA ${entity} ${parent}`;
        const newSteps = [...steps, { operation: 'isA_chain', fact: stepFact }];

        // Add direct parent
        parents.push({
          value: parent,
          depth: depth + 1,
          steps: newSteps
        });

        // Add ancestors recursively
        const ancestors = this.findAllParents(parent, visited, depth + 1, newSteps);
        parents.push(...ancestors);
      }
    }

    return parents;
  }

  /**
   * Check if entity has a specific property
   */
  hasProperty(operator, entity, value) {
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;

      if (meta?.operator === operator &&
          meta.args?.[0] === entity &&
          meta.args?.[1] === value) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if there's a negation exception: Not prop Entity Value
   * Also checks at any level of the isA hierarchy
   */
  hasException(operator, entity, value) {
    // Check direct negation
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;

      // Check for "Not prop Entity Value"
      if (meta?.operator === 'Not') {
        // The negated fact structure depends on how Not is stored
        // It could be Not(can Entity Value) or metadata indicating negation
        const negatedOp = meta.args?.[0];
        const negatedEntity = meta.args?.[1];
        const negatedValue = meta.args?.[2];

        if (negatedOp === operator && negatedEntity === entity && negatedValue === value) {
          return true;
        }
      }

      // Also check if the fact itself has a negated operator like "Not can X Y"
      // which might be stored as operator="Not can" or similar
      if (meta?.operator === `Not ${operator}` ||
          meta?.operator === `Not${operator}`) {
        if (meta.args?.[0] === entity && meta.args?.[1] === value) {
          return true;
        }
      }
    }

    // Check if entity isA something that has the exception
    // e.g., Not can Penguin Fly, isA Opus Penguin => exception for Opus
    const parents = this.findAllParents(entity, new Set());
    for (const parent of parents) {
      if (this.hasDirectException(operator, parent.value, value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for direct exception without recursion
   * Handles both explicit "Not op entity value" and reference patterns "Not $ref"
   */
  hasDirectException(operator, entity, value) {
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;

      if (meta?.operator === 'Not') {
        // Check explicit pattern: Not op entity value
        const negatedOp = meta.args?.[0];
        const negatedEntity = meta.args?.[1];
        const negatedValue = meta.args?.[2];

        if (negatedOp === operator && negatedEntity === entity && negatedValue === value) {
          return true;
        }

        // Check reference pattern: Not $refName
        // The args[0] might be a reference name (without $ prefix after parsing)
        if (meta.args?.length === 1) {
          const refName = meta.args[0]?.replace(/^\$/, '');
          const negatedVec = this.session.scope.get(refName);
          if (negatedVec) {
            // Build a vector for the property we're checking
            const checkFact = {
              operator: { type: 'Identifier', name: operator },
              args: [
                { type: 'Identifier', name: entity },
                { type: 'Identifier', name: value }
              ]
            };

            const checkVec = this.session.executor?.buildStatementVector(checkFact);
            if (checkVec) {
              this.session.reasoningStats.similarityChecks++;
              const sim = this.session.similarity(checkVec, negatedVec);
              if (sim > this.thresholds.RULE_MATCH) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }
}

export default PropertyInheritanceReasoner;

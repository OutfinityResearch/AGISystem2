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
    const strategy = proofEngine.session?.hdcStrategy || 'exact';
    this.thresholds = getThresholds(strategy);
  }

  get session() {
    return this.engine.session;
  }

  get options() {
    return this.engine.options;
  }

  getIsAParentsByChild() {
    const session = this.session;
    const version = session?._kbBundleVersion ?? 0;
    if (session?._isAParentsByChildCache?.version === version) {
      return session._isAParentsByChildCache.map;
    }

    const scanFacts = session?.factIndex?.getByOperator
      ? session.factIndex.getByOperator('isA')
      : (session?.kbFacts || []);

    const map = new Map(); // child -> Set(parent)
    for (const fact of scanFacts) {
      session.reasoningStats.kbScans++;
      const meta = fact?.metadata;
      if (!meta || meta.operator !== 'isA') continue;
      const child = meta.args?.[0];
      const parent = meta.args?.[1];
      if (!child || !parent) continue;
      if (!map.has(child)) map.set(child, new Set());
      map.get(child).add(parent);
    }

    session._isAParentsByChildCache = { version, map };
    return map;
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
    const maxDepth = this.options?.maxDepth || 10;
    if (visited.has(entity)) return parents;
    if (depth > maxDepth) return parents;

    const parentsByChild = this.getIsAParentsByChild();
    const queue = [{ node: entity, depth, steps }];
    let idx = 0;

    while (idx < queue.length) {
      const current = queue[idx++];
      const node = current.node;
      if (visited.has(node)) continue;
      visited.add(node);
      if (current.depth >= maxDepth) continue;

      const directParents = parentsByChild.get(node);
      if (!directParents) continue;

      for (const parent of directParents) {
        if (!parent || RESERVED_WORDS.has(parent)) continue;
        if (visited.has(parent)) continue;

        const stepFact = `isA ${node} ${parent}`;
        const newSteps = [...(current.steps || []), { operation: 'isA_chain', fact: stepFact }];
        parents.push({ value: parent, depth: current.depth + 1, steps: newSteps });
        queue.push({ node: parent, depth: current.depth + 1, steps: newSteps });
      }
    }

    return parents;
  }

  /**
   * Check if entity has a specific property
   */
  hasProperty(operator, entity, value) {
    if (!operator || !entity || !value) return false;
    if (this.session?.factIndex?.hasNary) {
      return this.session.factIndex.hasNary(operator, [entity, value]);
    }
    const scanFacts = this.session?.factIndex?.getByOperator
      ? this.session.factIndex.getByOperator(operator)
      : this.session.kbFacts;
    for (const fact of scanFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact?.metadata;
      if (meta?.operator === operator && meta.args?.[0] === entity && meta.args?.[1] === value) return true;
    }
    return false;
  }

  /**
   * Check if there's a negation exception: Not prop Entity Value
   * Also checks at any level of the isA hierarchy
   */
  hasException(operator, entity, value) {
    // Fast-path: expanded Not metadata is stored as: Not <op> <entity> <value>
    if (this.session?.factIndex?.hasNary && this.session.factIndex.hasNary('Not', [operator, entity, value])) {
      return true;
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
    if (!operator || !entity || !value) return false;

    // Fast-path: expanded Not metadata is stored as: Not <op> <entity> <value>
    if (this.session?.factIndex?.hasNary && this.session.factIndex.hasNary('Not', [operator, entity, value])) {
      return true;
    }

    // Legacy fallback: scan Not-only facts (kept for backwards compatibility with older encodings).
    const scanFacts = this.session?.factIndex?.getByOperator
      ? [
        ...this.session.factIndex.getByOperator('Not'),
        ...this.session.factIndex.getByOperator(`Not ${operator}`),
        ...this.session.factIndex.getByOperator(`Not${operator}`)
      ]
      : this.session.kbFacts;

    for (const fact of scanFacts) {
      const meta = fact?.metadata;
      if (!meta) continue;
      if (meta.operator === 'Not' && meta.args?.[0] === operator && meta.args?.[1] === entity && meta.args?.[2] === value) {
        return true;
      }
      if ((meta.operator === `Not ${operator}` || meta.operator === `Not${operator}`) &&
          meta.args?.[0] === entity && meta.args?.[1] === value) {
        return true;
      }
    }

    return false;
  }
}

export default PropertyInheritanceReasoner;

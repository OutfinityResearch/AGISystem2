/**
 * AGISystem2 - Disjoint Proof Module
 * @module reasoning/disjoint
 *
 * Handles disjoint proofs for spatial relations.
 * Proves that entities are NOT in a location via containment chain + disjointness.
 */

/**
 * Disjoint reasoning engine
 */
export class DisjointProver {
  constructor(proofEngine) {
    this.engine = proofEngine;
  }

  get session() {
    return this.engine.session;
  }

  /**
   * Try disjoint proof for spatial relations
   * @param {Object} goal - Goal statement
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  tryDisjointProof(goal, depth) {
    const operatorName = this.engine.extractOperatorName(goal);
    if (operatorName !== 'locatedIn') {
      return { valid: false };
    }

    if (!goal.args || goal.args.length !== 2) {
      return { valid: false };
    }

    const subjectName = this.engine.extractArgName(goal.args[0]);
    const targetName = this.engine.extractArgName(goal.args[1]);
    if (!subjectName || !targetName) {
      return { valid: false };
    }

    const chainResult = this.findContainmentChainUntilDisjoint(subjectName, targetName);

    if (chainResult.found) {
      return {
        valid: true,
        result: false,
        method: 'disjoint_proof',
        confidence: 0.95,
        goal: goal.toString(),
        steps: [
          ...chainResult.steps,
          { operation: 'disjoint_check', container: chainResult.disjointContainer, target: targetName }
        ]
      };
    }

    return { valid: false };
  }

  /**
   * Build containment chain until we find a disjoint container
   * @param {string} subjectName - Starting entity
   * @param {string} targetName - Target to prove disjoint from
   * @returns {Object} Chain result
   */
  findContainmentChainUntilDisjoint(subjectName, targetName) {
    const steps = [];
    const visited = new Set();
    let found = false;
    let disjointContainer = null;

    const buildChain = (name) => {
      if (visited.has(name) || found) return;
      visited.add(name);

      if (this.checkDisjoint(name, targetName)) {
        found = true;
        disjointContainer = name;
        return;
      }

      const containers = this.engine.transitive.findIntermediates('locatedIn', name);
      for (const container of containers) {
        if (found) return;

        steps.push({
          operation: 'chain_step',
          from: name,
          to: container,
          fact: `locatedIn ${name} ${container}`
        });

        buildChain(container);
      }
    };

    buildChain(subjectName);
    return { found, disjointContainer, steps };
  }

  /**
   * Find containment chain
   * @param {string} subjectName - Starting entity
   * @returns {Array<string>} Chain of containers
   */
  findContainmentChain(subjectName) {
    const result = this.findContainmentChainWithSteps(subjectName);
    return result.chain;
  }

  /**
   * Find containment chain with step details for proof output
   * @param {string} subjectName - Starting entity
   * @returns {Object} Chain with steps
   */
  findContainmentChainWithSteps(subjectName) {
    const chain = [];
    const steps = [];
    const visited = new Set();

    const findChain = (name) => {
      if (visited.has(name)) return;
      visited.add(name);
      const containers = this.engine.transitive.findIntermediates('locatedIn', name);
      for (const container of containers) {
        chain.push(container);
        steps.push({
          operation: 'chain_step',
          from: name,
          to: container,
          fact: `locatedIn ${name} ${container}`
        });
        findChain(container);
      }
    };

    findChain(subjectName);
    return { chain, steps };
  }

  /**
   * Check if two entities are disjoint
   * @param {string} a - First entity
   * @param {string} b - Second entity
   * @returns {boolean} True if disjoint
   */
  checkDisjoint(a, b) {
    if (a === b) return false;

    const typesA = this.findTypes(a);
    const typesB = this.findTypes(b);

    for (const typeA of typesA) {
      for (const typeB of typesB) {
        if (typeA === typeB && this.isMutuallyDisjoint(typeA)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Find types of an entity
   * @param {string} entity - Entity name
   * @returns {Array<string>} Entity types
   */
  findTypes(entity) {
    const types = [];
    for (const fact of this.session.kbFacts) {
      if (fact.metadata?.operator === 'isA' && fact.metadata.args?.[0] === entity) {
        types.push(fact.metadata.args[1]);
      }
    }
    return types;
  }

  /**
   * Check if type is mutually disjoint
   * @param {string} typeName - Type name
   * @returns {boolean} True if disjoint
   */
  isMutuallyDisjoint(typeName) {
    for (const fact of this.session.kbFacts) {
      if (fact.metadata?.operator === 'mutuallyDisjoint' && fact.metadata.args?.[0] === typeName) {
        return true;
      }
    }
    return false;
  }
}

export default DisjointProver;

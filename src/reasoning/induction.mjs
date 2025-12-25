/**
 * AGISystem2 - Inductive Reasoning Engine
 * @module reasoning/induction
 *
 * Implements pattern generalization from examples:
 * Given examples E1, E2, ..., induce a general rule R.
 *
 * Use cases:
 * - Learning: "Dog→Animal, Cat→Animal, Bird→Animal → ?x Animal if ?x Pet"
 * - Pattern discovery: "Find common properties across similar entities"
 * - Rule suggestion: "Based on KB patterns, what rules might hold?"
 *
 * Algorithm:
 * 1. Group similar facts by operator/structure
 * 2. Find common patterns (shared arguments, positions)
 * 3. Generalize to variables where instances differ
 * 4. Validate induced rules against KB
 */

import { similarity, topKSimilar } from '../core/operations.mjs';

/**
 * Inductive Reasoning Engine
 */
export class InductionEngine {
  /**
   * Create induction engine
   * @param {Session} session - Parent session with KB
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Induce rules from KB patterns
   * @param {Object} options - Induction options
   * @returns {Object} Induction result with discovered patterns
   */
  induceRules(options = {}) {
    const minExamples = options.minExamples || 3;
    const minConfidence = options.minConfidence || 0.6;
    const maxRules = options.maxRules || 10;

    const patterns = [];

    // Strategy 1: Find isA hierarchy patterns
    const hierarchyPatterns = this.findHierarchyPatterns(minExamples);
    patterns.push(...hierarchyPatterns);

    // Strategy 2: Find property inheritance patterns
    const propertyPatterns = this.findPropertyPatterns(minExamples);
    patterns.push(...propertyPatterns);

    // Strategy 3: Find relational patterns
    const relationalPatterns = this.findRelationalPatterns(minExamples);
    patterns.push(...relationalPatterns);

    // Score and filter patterns
    const scoredPatterns = patterns
      .map(p => ({ ...p, score: this.scorePattern(p) }))
      .filter(p => p.score >= minConfidence)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRules);

    // Generate rule suggestions
    const suggestedRules = scoredPatterns.map(p => this.patternToRule(p));

    return {
      success: suggestedRules.length > 0,
      patterns: scoredPatterns,
      suggestedRules,
      confidence: suggestedRules[0]?.confidence || 0,
      method: 'induction'
    };
  }

  /**
   * Find hierarchy patterns (X isA Y, Y isA Z patterns)
   * @private
   */
  findHierarchyPatterns(minExamples) {
    const patterns = [];
    this.session.reasoningStats.kbScans += this.session.kbFacts.length;
    const isaFacts = this.session.kbFacts.filter(f => f.metadata?.operator === 'isA');

    // Group by parent
    const parentGroups = new Map();
    for (const fact of isaFacts) {
      const parent = fact.metadata?.args?.[1];
      if (!parent) continue;
      if (!parentGroups.has(parent)) {
        parentGroups.set(parent, []);
      }
      parentGroups.get(parent).push(fact.metadata.args[0]);
    }

    // Find parents with multiple children → potential type class
    for (const [parent, children] of parentGroups) {
      if (children.length >= minExamples) {
        patterns.push({
          type: 'hierarchy',
          parent,
          children,
          examples: children.length,
          description: `${children.length} things are ${parent}`,
          generalization: `?x isA ${parent}`
        });
      }
    }

    // Find transitive chains
    const chains = this.findTransitiveChains(isaFacts);
    for (const chain of chains) {
      if (chain.length >= 3) {
        patterns.push({
          type: 'hierarchy_chain',
          chain,
          examples: chain.length,
          description: `Chain: ${chain.join(' → ')}`,
          generalization: `Implies (isA ?x ${chain[0]}) (isA ?x ${chain[chain.length - 1]})`
        });
      }
    }

    return patterns;
  }

  /**
   * Find transitive chains in isA facts
   * @private
   */
  findTransitiveChains(isaFacts) {
    const chains = [];
    const edges = new Map();

    // Build graph
    for (const fact of isaFacts) {
      const child = fact.metadata?.args?.[0];
      const parent = fact.metadata?.args?.[1];
      if (child && parent) {
        edges.set(child, parent);
      }
    }

    // Find chains
    const visited = new Set();
    for (const start of edges.keys()) {
      if (visited.has(start)) continue;

      const chain = [start];
      let current = start;
      while (edges.has(current) && !visited.has(edges.get(current))) {
        current = edges.get(current);
        chain.push(current);
        visited.add(current);
      }

      if (chain.length >= 2) {
        chains.push(chain);
      }
    }

    return chains;
  }

  /**
   * Find property inheritance patterns
   * @private
   */
  findPropertyPatterns(minExamples) {
    const patterns = [];
    this.session.reasoningStats.kbScans += this.session.kbFacts.length;
    const propertyFacts = this.session.kbFacts.filter(f =>
      f.metadata?.operator === 'hasProperty' ||
      f.metadata?.operator === 'can' ||
      f.metadata?.operator === 'must'
    );

    // Group by property
    const propertyGroups = new Map();
    for (const fact of propertyFacts) {
      const prop = fact.metadata?.args?.[1] || fact.metadata?.operator;
      const subject = fact.metadata?.args?.[0];
      if (!prop || !subject) continue;

      const key = `${fact.metadata.operator}:${prop}`;
      if (!propertyGroups.has(key)) {
        propertyGroups.set(key, { operator: fact.metadata.operator, property: prop, subjects: [] });
      }
      propertyGroups.get(key).subjects.push(subject);
    }

    // Find common type for subjects with same property
    for (const [key, group] of propertyGroups) {
      if (group.subjects.length >= minExamples) {
        const commonType = this.findCommonType(group.subjects);
        if (commonType) {
          patterns.push({
            type: 'property_inheritance',
            operator: group.operator,
            property: group.property,
            subjects: group.subjects,
            commonType,
            examples: group.subjects.length,
            description: `${group.subjects.length} ${commonType}s ${group.operator} ${group.property}`,
            generalization: `Implies (isA ?x ${commonType}) (${group.operator} ?x ${group.property})`
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Find common type for a set of subjects
   * @private
   */
  findCommonType(subjects) {
    // Look for isA facts for these subjects
    const types = new Map();

    for (const subject of subjects) {
      for (const fact of this.session.kbFacts) {
        this.session.reasoningStats.kbScans++;
        if (fact.metadata?.operator === 'isA' && fact.metadata?.args?.[0] === subject) {
          const type = fact.metadata.args[1];
          types.set(type, (types.get(type) || 0) + 1);
        }
      }
    }

    // Return most common type
    let bestType = null;
    let bestCount = 0;
    for (const [type, count] of types) {
      if (count > bestCount) {
        bestType = type;
        bestCount = count;
      }
    }

    return bestType;
  }

  /**
   * Find relational patterns (common relation structures)
   * @private
   */
  findRelationalPatterns(minExamples) {
    const patterns = [];

    // Group facts by operator
    const opGroups = new Map();
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const op = fact.metadata?.operator;
      if (!op) continue;
      if (!opGroups.has(op)) {
        opGroups.set(op, []);
      }
      opGroups.get(op).push(fact);
    }

    // Find operators with many instances
    for (const [op, facts] of opGroups) {
      if (facts.length >= minExamples) {
        // Analyze argument patterns
        const argPatterns = this.analyzeArgumentPatterns(facts);

        patterns.push({
          type: 'relational',
          operator: op,
          facts: facts.length,
          argPatterns,
          examples: facts.length,
          description: `${facts.length} ${op} relations found`,
          generalization: `${op} ?subject ?object`
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze argument patterns in a set of facts
   * @private
   */
  analyzeArgumentPatterns(facts) {
    const patterns = {
      positions: [],
      commonValues: []
    };

    // Find common values at each position
    const positionValues = [];
    for (const fact of facts) {
      const args = fact.metadata?.args || [];
      for (let i = 0; i < args.length; i++) {
        if (!positionValues[i]) {
          positionValues[i] = new Map();
        }
        const val = args[i];
        positionValues[i].set(val, (positionValues[i].get(val) || 0) + 1);
      }
    }

    // Identify positions with common values
    for (let i = 0; i < positionValues.length; i++) {
      const values = positionValues[i];
      const total = facts.length;

      for (const [val, count] of values) {
        if (count >= total * 0.5) { // At least 50% share this value
          patterns.commonValues.push({ position: i, value: val, frequency: count / total });
        }
      }

      patterns.positions.push({
        position: i,
        uniqueValues: values.size,
        mostCommon: [...values.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      });
    }

    return patterns;
  }

  /**
   * Score a pattern based on evidence and generality
   * @private
   */
  scorePattern(pattern) {
    // Base score from examples: 3 examples → 0.5, 5 examples → 0.7, 10+ examples → 1.0
    const exampleScore = Math.min(1.0, 0.3 + pattern.examples * 0.07);

    const typeBonus = {
      'hierarchy_chain': 0.15,
      'property_inheritance': 0.12,
      'hierarchy': 0.10,
      'relational': 0.08
    }[pattern.type] || 0;

    return Math.min(1.0, exampleScore + typeBonus);
  }

  /**
   * Convert pattern to rule suggestion
   * @private
   */
  patternToRule(pattern) {
    return {
      type: pattern.type,
      dsl: pattern.generalization,
      confidence: pattern.score,
      examples: pattern.examples,
      description: pattern.description
    };
  }

  /**
   * Learn from specific examples
   * Given a set of examples, find generalizations
   * @param {Array} examples - Array of DSL strings or facts
   * @returns {Object} Learning result
   */
  learnFrom(examples) {
    if (!examples || examples.length === 0) {
      return { success: false, reason: 'No examples provided' };
    }

    // Parse examples if strings
    const parsedExamples = [];
    for (const ex of examples) {
      if (typeof ex === 'string') {
        try {
          const result = this.session.learn(ex);
          if (result.success) {
            parsedExamples.push(ex);
          }
        } catch (e) {
          // Skip invalid examples
        }
      }
    }

    // Now induce rules from the enriched KB
    return this.induceRules({ minExamples: Math.max(2, parsedExamples.length - 1) });
  }

  /**
   * Suggest rules that might hold based on KB analysis
   * @returns {Object} Rule suggestions
   */
  suggestRules() {
    return this.induceRules({
      minExamples: 2,
      minConfidence: 0.5,
      maxRules: 5
    });
  }
}

export default InductionEngine;

/**
 * AGISystem2 - Forward Chaining Engine
 * @module reasoning/forward-chain
 *
 * Level-ordered forward chaining for automatic derivation.
 * Processes rules in constructivist level order, ensuring
 * premises are always available before conclusions are derived.
 */

import { computeRuleLevels, extractDependencies } from './constructivist-level.mjs';

/**
 * Forward Chaining Engine
 * Derives new facts by applying rules in level order
 */
export class ForwardChainEngine {
  constructor(session) {
    this.session = session;
    this.derivedFacts = [];
    this.appliedRules = new Set();
  }

  /**
   * Run forward chaining to derive all possible new facts
   * @param {Object} options - Configuration options
   * @returns {Object} Result with derived facts count and iterations
   */
  forwardChain(options = {}) {
    const {
      maxIterations = 100,
      maxLevel = Infinity,
      stopOnNoChange = true,
      trackDerivations = false
    } = options;

    const componentKB = this.session.componentKB;
    if (!componentKB) {
      return { success: false, error: 'No componentKB available', derivedCount: 0 };
    }

    const rules = this.session.rules || [];
    if (rules.length === 0) {
      return { success: true, derivedCount: 0, iterations: 0 };
    }

    // Compute levels for all rules
    const conceptLevels = componentKB.levelManager?.conceptLevels || new Map();
    const rulesByLevel = new Map();
    let maxRuleLevel = 0;

    for (const rule of rules) {
      const levels = computeRuleLevels(rule, conceptLevels);
      rule._concLevel = levels.conclusionLevel;
      rule._maxPremLevel = levels.maxPremiseLevel;

      const concLevel = levels.conclusionLevel;
      if (!rulesByLevel.has(concLevel)) {
        rulesByLevel.set(concLevel, []);
      }
      rulesByLevel.get(concLevel).push(rule);
      maxRuleLevel = Math.max(maxRuleLevel, concLevel);
    }

    // Limit to requested max level
    maxRuleLevel = Math.min(maxRuleLevel, maxLevel);

    let totalDerived = 0;
    let iterations = 0;
    let changed = true;
    const derivations = trackDerivations ? [] : null;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Process levels in order (0, 1, 2, ...)
      for (let level = 1; level <= maxRuleLevel + 1; level++) {
        const levelRules = rulesByLevel.get(level) || [];

        for (const rule of levelRules) {
          // Skip if already applied this iteration
          const ruleKey = this._getRuleKey(rule);
          if (this.appliedRules.has(ruleKey)) continue;

          // Check if all premises are satisfied
          const premiseResult = this._checkPremises(rule);
          if (!premiseResult.satisfied) continue;

          // Derive conclusion
          const newFacts = this._deriveConclusion(rule, premiseResult.bindings);

          for (const newFact of newFacts) {
            // Check if already in KB
            if (this._factExists(newFact)) continue;

            // Add to KB
            this._addDerivedFact(newFact, rule);
            totalDerived++;
            changed = true;

            if (trackDerivations) {
              derivations.push({
                fact: newFact,
                rule: rule.name || rule.label,
                level,
                bindings: premiseResult.bindings
              });
            }
          }

          this.appliedRules.add(ruleKey);
        }
      }

      if (stopOnNoChange && !changed) break;
    }

    return {
      success: true,
      derivedCount: totalDerived,
      iterations,
      derivations: derivations || undefined
    };
  }

  /**
   * Check if all premises of a rule are satisfied
   * @param {Object} rule - Rule to check
   * @returns {Object} Result with satisfied flag and bindings
   */
  _checkPremises(rule) {
    if (!rule.conditionAST && !rule.conditionParts) {
      // No condition = always satisfied
      return { satisfied: true, bindings: new Map() };
    }

    // For simple conditions, check KB
    const condStr = rule.conditionAST?.toString?.() || rule.condition?.toString?.();
    if (!condStr) return { satisfied: false, bindings: new Map() };

    // Handle ground conditions (no variables)
    if (!rule.hasVariables) {
      const exists = this._checkConditionInKB(condStr);
      return { satisfied: exists, bindings: new Map() };
    }

    // For variable conditions, find all satisfying bindings
    const bindings = this._findSatisfyingBindings(rule);
    return {
      satisfied: bindings.length > 0,
      bindings: bindings[0] || new Map()
    };
  }

  /**
   * Check if a ground condition exists in KB
   * @param {string} condStr - Condition string
   * @returns {boolean} True if exists
   */
  _checkConditionInKB(condStr) {
    const parts = condStr.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return false;

    const op = parts[0];
    const args = parts.slice(1);

    const componentKB = this.session.componentKB;
    const candidates = componentKB?.findByOperator(op) || this.session.kbFacts;

    for (const fact of candidates) {
      const meta = fact.metadata;
      if (!meta || meta.operator !== op) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      let match = true;
      for (let i = 0; i < args.length; i++) {
        if (meta.args[i] !== args[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }

    return false;
  }

  /**
   * Find all satisfying bindings for a rule's condition
   * @param {Object} rule - Rule with variables
   * @returns {Array<Map>} List of satisfying bindings
   */
  _findSatisfyingBindings(rule) {
    // Simplified implementation - finds first satisfying binding
    // Full implementation would enumerate all bindings
    const bindings = [];

    const condStr = rule.conditionAST?.toString?.() || '';
    const parts = condStr.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return bindings;

    const op = parts[0];
    const args = parts.slice(1);

    const componentKB = this.session.componentKB;
    const candidates = componentKB?.findByOperator(op) || this.session.kbFacts;

    for (const fact of candidates) {
      const meta = fact.metadata;
      if (!meta || meta.operator !== op) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      const binding = new Map();
      let match = true;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('?')) {
          binding.set(arg.substring(1), meta.args[i]);
        } else if (arg !== meta.args[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        bindings.push(binding);
      }
    }

    return bindings;
  }

  /**
   * Derive conclusion from a rule with given bindings
   * @param {Object} rule - Rule to apply
   * @param {Map} bindings - Variable bindings
   * @returns {Array} New facts to add
   */
  _deriveConclusion(rule, bindings) {
    const newFacts = [];

    const concStr = rule.conclusionAST?.toString?.() || '';
    if (!concStr) return newFacts;

    const parts = concStr.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return newFacts;

    const op = parts[0];
    const args = parts.slice(1).map(arg => {
      if (arg.startsWith('?')) {
        const varName = arg.substring(1);
        return bindings.get(varName) || arg;
      }
      return arg;
    });

    // Don't add facts with unbound variables
    if (args.some(a => a.startsWith('?'))) {
      return newFacts;
    }

    newFacts.push({
      operator: op,
      args: args,
      derivedFrom: rule.name || rule.label,
      derivedAt: Date.now()
    });

    return newFacts;
  }

  /**
   * Check if a fact already exists in KB
   * @param {Object} fact - Fact to check
   * @returns {boolean} True if exists
   */
  _factExists(fact) {
    const componentKB = this.session.componentKB;
    const candidates = componentKB?.findByOperator(fact.operator) || this.session.kbFacts;

    for (const existing of candidates) {
      const meta = existing.metadata;
      if (!meta || meta.operator !== fact.operator) continue;
      if (!meta.args || meta.args.length !== fact.args.length) continue;

      let match = true;
      for (let i = 0; i < fact.args.length; i++) {
        if (meta.args[i] !== fact.args[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }

    return false;
  }

  /**
   * Add a derived fact to the KB
   * @param {Object} fact - Fact to add
   * @param {Object} rule - Rule that derived it
   */
  _addDerivedFact(fact, rule) {
    // Create fact vector
    const factStr = `${fact.operator} ${fact.args.join(' ')}`;

    // Add to session KB
    if (this.session.addFact) {
      this.session.addFact(factStr, {
        derived: true,
        derivedFrom: rule.name || rule.label,
        derivedAt: fact.derivedAt
      });
    } else {
      // Fallback: add directly to kbFacts
      const newFact = {
        metadata: {
          operator: fact.operator,
          args: fact.args,
          derived: true,
          derivedFrom: fact.derivedFrom
        }
      };
      this.session.kbFacts.push(newFact);

      // Update componentKB if available
      if (this.session.componentKB) {
        this.session.componentKB.addFact(newFact);
      }
    }

    this.derivedFacts.push(fact);
  }

  /**
   * Get unique key for a rule
   * @param {Object} rule - Rule object
   * @returns {string} Unique key
   */
  _getRuleKey(rule) {
    return rule.id || rule.name || rule.source || JSON.stringify(rule);
  }

  /**
   * Get statistics about forward chaining
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      derivedFactsCount: this.derivedFacts.length,
      appliedRulesCount: this.appliedRules.size,
      derivedFacts: this.derivedFacts
    };
  }

  /**
   * Reset the engine state
   */
  reset() {
    this.derivedFacts = [];
    this.appliedRules.clear();
  }
}

/**
 * Create a forward chain engine for a session
 * @param {Session} session - Session object
 * @returns {ForwardChainEngine} Engine instance
 */
export function createForwardChainEngine(session) {
  return new ForwardChainEngine(session);
}

export default ForwardChainEngine;

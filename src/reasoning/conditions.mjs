/**
 * AGISystem2 - Compound Conditions Module
 * @module reasoning/conditions
 *
 * Handles And/Or conditions with backtracking support.
 */

import { similarity } from '../core/operations.mjs';
import { getThresholds } from '../core/constants.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Cond:${category}]`, ...args);
}

/**
 * Condition prover with backtracking
 */
export class ConditionProver {
  constructor(proofEngine) {
    this.engine = proofEngine;
    // Get strategy-dependent thresholds
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
   * Prove condition with variable bindings applied
   * @param {Object} rule - Rule being applied
   * @param {Map} bindings - Variable bindings
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  proveInstantiatedCondition(rule, bindings, depth) {
    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit' };
    }

    const condAST = rule.conditionAST;
    if (!condAST) {
      return { valid: false, reason: 'No condition AST' };
    }

    if (rule.conditionParts) {
      return this.proveInstantiatedCompound(rule.conditionParts, bindings, depth);
    }

    const instantiated = this.engine.unification.instantiateAST(condAST, bindings);
    dbg('INST', 'Instantiated condition:', instantiated);

    return this.proveSingleCondition(instantiated, bindings, depth);
  }

  /**
   * Prove compound (And/Or/Not) condition with bindings
   * @param {Object} condParts - Compound condition structure
   * @param {Map} bindings - Variable bindings
   * @param {number} depth - Current depth
   * @returns {Object} Proof result
   */
  proveInstantiatedCompound(condParts, bindings, depth) {
    if (condParts.type === 'And') {
      return this.proveInstantiatedAnd(condParts.parts, new Map(bindings), depth);
    } else if (condParts.type === 'Or') {
      return this.proveInstantiatedOr(condParts.parts, bindings, depth);
    } else if (condParts.type === 'Not') {
      return this.proveInstantiatedNot(condParts.inner, bindings, depth);
    } else if (condParts.type === 'leaf') {
      const leafAST = condParts.ast || condParts;
      if (leafAST.operator) {
        const inst = this.engine.unification.instantiateAST(leafAST, bindings);
        return this.proveSingleCondition(inst, bindings, depth);
      }
    }
    return { valid: false, reason: 'Unknown compound type' };
  }

  /**
   * Prove Not condition - succeeds if inner cannot be proved
   * @param {Object} inner - Inner condition to negate
   * @param {Map} bindings - Current bindings
   * @param {number} depth - Current depth
   * @returns {Object} Proof result
   */
  proveInstantiatedNot(inner, bindings, depth) {
    // Try to prove the inner condition
    let innerResult;
    if (inner.type === 'And' || inner.type === 'Or' || inner.type === 'Not') {
      innerResult = this.proveInstantiatedCompound(inner, bindings, depth);
    } else if (inner.type === 'leaf' && inner.ast) {
      const inst = this.engine.unification.instantiateAST(inner.ast, bindings);
      innerResult = this.proveSingleCondition(inst, bindings, depth);
    } else {
      innerResult = { valid: false };
    }

    // Not succeeds if inner fails (closed-world assumption)
    if (!innerResult.valid) {
      return {
        valid: true,
        method: 'not_condition',
        confidence: this.thresholds.CONDITION_CONFIDENCE,
        steps: [{ operation: 'not_proved', detail: 'inner condition cannot be proved' }]
      };
    }
    return { valid: false, reason: 'Not condition failed - inner is provable' };
  }

  /**
   * Prove And condition with backtracking
   * @param {Array} parts - And condition parts
   * @param {Map} bindings - Current bindings
   * @param {number} depth - Current depth
   * @returns {Object} Proof result
   */
  proveInstantiatedAnd(parts, bindings, depth) {
    return this.proveAndWithBacktracking(parts, 0, new Map(bindings), [], depth);
  }

  /**
   * Recursive And proving with backtracking
   */
  proveAndWithBacktracking(parts, partIndex, bindings, accumulatedSteps, depth) {
    if (partIndex >= parts.length) {
      const detail = parts.map(p => this.instantiatePart(p, bindings)).filter(Boolean).join(', ');
      return {
        valid: true,
        method: 'and_instantiated',
        confidence: this.thresholds.CONDITION_CONFIDENCE,
        steps: [...accumulatedSteps, { operation: 'and_satisfied', detail }]
      };
    }

    const part = parts[partIndex];
    const matches = this.findAllMatches(part, bindings, depth);

    if (matches.length === 0) {
      return { valid: false, reason: `And part ${partIndex} has no matches` };
    }

    for (const match of matches) {
      const newBindings = new Map(bindings);
      if (match.newBindings) {
        for (const [k, v] of match.newBindings) {
          newBindings.set(k, v);
        }
      }

      const remainingResult = this.proveAndWithBacktracking(
        parts,
        partIndex + 1,
        newBindings,
        [...accumulatedSteps, ...(match.steps || [])],
        depth
      );

      if (remainingResult.valid) {
        return remainingResult;
      }
    }

    return { valid: false, reason: 'Backtracking exhausted' };
  }

  /**
   * Find all possible matches for a condition part
   */
  findAllMatches(part, bindings, depth) {
    const matches = [];

    if (part.type === 'And' || part.type === 'Or' || part.type === 'Not') {
      const result = this.proveInstantiatedCompound(part, bindings, depth);
      if (result.valid) {
        matches.push(result);
      }
      return matches;
    }

    if (part.type === 'leaf' && part.ast) {
      const condStr = this.engine.unification.instantiateAST(part.ast, bindings);
      return this.engine.kbMatcher.findAllFactMatches(condStr, bindings);
    }

    return matches;
  }

  /**
   * Prove Or condition - at least one part must be true
   */
  proveInstantiatedOr(parts, bindings, depth) {
    for (const part of parts) {
      const partResult = this.proveCompoundPart(part, new Map(bindings), depth);
      if (partResult.valid) {
        return {
          valid: true,
          method: 'or_instantiated',
          confidence: partResult.confidence * this.thresholds.CONFIDENCE_DECAY,
          steps: [
            ...(partResult.steps || []),
            { operation: 'or_satisfied', detail: this.instantiatePart(part, bindings) }
          ]
        };
      }
    }
    return { valid: false, reason: 'No Or branch succeeded' };
  }

  /**
   * Prove a single part of a compound condition
   */
  proveCompoundPart(part, bindings, depth) {
    if (part.type === 'And' || part.type === 'Or' || part.type === 'Not') {
      return this.proveInstantiatedCompound(part, bindings, depth);
    }

    if (part.type === 'leaf') {
      if (part.ast) {
        const inst = this.engine.unification.instantiateAST(part.ast, bindings);
        return this.proveSingleCondition(inst, bindings, depth);
      }
    }

    return { valid: false, reason: 'Cannot prove part' };
  }

  /**
   * Prove single condition string
   * @param {string} condStr - Condition string
   * @param {Map} bindings - Variable bindings
   * @param {number} depth - Current depth
   * @returns {Object} Proof result
   */
  proveSingleCondition(condStr, bindings, depth) {
    dbg('SINGLE', 'Condition:', condStr, 'Bindings:', [...bindings.entries()]);

    if (!condStr.includes('?')) {
      const match = this.engine.kbMatcher.findMatchingFact(condStr);
      if (match.found) {
        return {
          valid: true,
          confidence: match.confidence,
          steps: [{ operation: 'fact_matched', fact: condStr }]
        };
      }

      const transResult = this.engine.transitive.tryTransitiveForCondition(condStr);
      if (transResult.valid) {
        return {
          valid: true,
          confidence: transResult.confidence * this.thresholds.CONFIDENCE_DECAY,
          steps: [{ operation: 'transitive_proof', fact: condStr }, ...(transResult.steps || [])]
        };
      }

      // Value type inheritance: has X Y can be proven if has X Z and isA Z Y
      // Example: has Alice PaymentMethod if has Alice CreditCard and isA CreditCard PaymentMethod
      const valueInheritResult = this.tryValueTypeInheritance(condStr, depth);
      if (valueInheritResult.valid) {
        return valueInheritResult;
      }

      if (depth < this.options.maxDepth) {
        const ruleResult = this.engine.kbMatcher.tryRuleChainForCondition(condStr, depth + 1);
        if (ruleResult.valid) {
          return ruleResult;
        }
      }

      return { valid: false };
    }

    return this.proveWithUnboundVars(condStr, bindings, depth);
  }

  /**
   * Try value type inheritance: has X Y via has X Z where isA Z Y
   * @param {string} condStr - Condition string like "has Alice PaymentMethod"
   * @param {number} depth - Current depth
   * @returns {Object} Proof result
   */
  tryValueTypeInheritance(condStr, depth) {
    const parts = condStr.split(/\s+/);
    if (parts.length < 3) return { valid: false };

    const [operator, entity, targetType] = parts;

    // Only applies to 'has' and similar possession operators
    if (!['has', 'owns', 'holds', 'contains'].includes(operator)) {
      return { valid: false };
    }

    dbg('VALUE_INHERIT', `Trying ${operator} ${entity} ${targetType} via value inheritance`);

    // Find all things that entity 'has'
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;

      if (meta?.operator === operator && meta.args?.[0] === entity) {
        const heldValue = meta.args[1];

        // Check if heldValue isA targetType (direct or transitive)
        const isAResult = this.checkIsATransitive(heldValue, targetType, depth);

        if (isAResult.found) {
          dbg('VALUE_INHERIT', `Found: ${entity} ${operator} ${heldValue}, and ${heldValue} isA ${targetType}`);

          return {
            valid: true,
            confidence: this.thresholds.CONDITION_CONFIDENCE * this.thresholds.CONFIDENCE_DECAY,
            steps: [
              { operation: 'value_has', fact: `${operator} ${entity} ${heldValue}` },
              ...isAResult.steps,
              { operation: 'value_type_inheritance', fact: `${operator} ${entity} ${targetType}` }
            ]
          };
        }
      }
    }

    return { valid: false };
  }

  /**
   * Check if X isA Y (directly or transitively)
   * @param {string} child - Child type
   * @param {string} parent - Parent type
   * @param {number} depth - Current depth
   * @returns {Object} { found: boolean, steps: Array }
   */
  checkIsATransitive(child, parent, depth, visited = new Set()) {
    if (child === parent) {
      return { found: true, steps: [] };
    }

    if (visited.has(child)) {
      return { found: false, steps: [] };
    }

    if (depth > (this.options?.maxDepth || 10)) {
      return { found: false, steps: [] };
    }

    visited.add(child);

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;

      if (meta?.operator === 'isA' && meta.args?.[0] === child) {
        const directParent = meta.args[1];
        const step = { operation: 'isA_chain', fact: `isA ${child} ${directParent}` };

        if (directParent === parent) {
          return { found: true, steps: [step] };
        }

        // Recurse
        const recurse = this.checkIsATransitive(directParent, parent, depth + 1, visited);
        if (recurse.found) {
          return { found: true, steps: [step, ...recurse.steps] };
        }
      }
    }

    return { found: false, steps: [] };
  }

  /**
   * Prove condition with unbound variables
   */
  proveWithUnboundVars(condStr, bindings, depth) {
    const parts = condStr.split(/\s+/);
    if (parts.length < 2) {
      return { valid: false };
    }

    const op = parts[0];
    const args = parts.slice(1);

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== op) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      const newBindings = new Map();
      let matches = true;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const factArg = meta.args[i];

        if (arg.startsWith('?')) {
          const varName = arg.substring(1);
          if (bindings.has(varName)) {
            if (bindings.get(varName) !== factArg) {
              matches = false;
              break;
            }
          } else {
            newBindings.set(varName, factArg);
          }
        } else {
          if (arg !== factArg) {
            matches = false;
            break;
          }
        }
      }

      if (matches) {
        dbg('UNBOUND', 'Found match:', `${op} ${meta.args.join(' ')}`, 'New bindings:', [...newBindings.entries()]);
        return {
          valid: true,
          confidence: this.thresholds.CONDITION_CONFIDENCE,
          newBindings,
          steps: [{ operation: 'pattern_match', fact: `${op} ${meta.args.join(' ')}`, bindings: Object.fromEntries(newBindings) }]
        };
      }
    }

    return { valid: false, reason: 'No pattern match found' };
  }

  /**
   * Prove a rule's condition (handles And/Or) - for rules without variables
   */
  proveCondition(rule, depth) {
    if (this.engine.isTimedOut()) {
      throw new Error('Proof timed out');
    }

    this.engine.incrementSteps();
    if (this.engine.reasoningSteps > this.engine.maxSteps) {
      return { valid: false, reason: 'Step limit' };
    }

    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit' };
    }

    if (rule.conditionParts) {
      return this.proveCompoundCondition(rule.conditionParts, depth);
    }

    return this.proveSimpleCondition(rule.condition, depth);
  }

  /**
   * Prove simple condition vector
   */
  proveSimpleCondition(conditionVec, depth) {
    // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
    if (!conditionVec || (!conditionVec.data && !conditionVec.exponents)) {
      return { valid: false, reason: 'Invalid condition' };
    }

    const condHash = this.engine.hashVector(conditionVec);
    if (this.engine.visited.has(condHash)) {
      return { valid: false, reason: 'Cycle' };
    }
    this.engine.visited.add(condHash);

    for (const fact of this.session.kbFacts) {
      if (!fact.vector) continue;
      const sim = similarity(conditionVec, fact.vector);
      if (sim > this.thresholds.CONCLUSION_MATCH) {
        // Build fact string from metadata
        let factStr = '';
        if (fact.metadata?.operator && fact.metadata?.args) {
          factStr = `${fact.metadata.operator} ${fact.metadata.args.join(' ')}`;
        }
        return {
          valid: true,
          method: 'direct',
          confidence: sim,
          steps: [{ operation: 'condition_satisfied', confidence: sim, fact: factStr }]
        };
      }
    }

    for (const rule of this.session.rules) {
      if (!rule.conclusion) continue;
      const conclusionSim = similarity(conditionVec, rule.conclusion);
      if (conclusionSim > this.thresholds.CONCLUSION_MATCH) {
        const subResult = this.proveCondition(rule, depth + 1);
        if (subResult.valid) {
          // Extract conclusion fact text - try to resolve reference
          let conclusionFact = '';
          if (rule.conclusionAST?.operator) {
            const op = rule.conclusionAST.operator.name || rule.conclusionAST.operator.value;
            const args = (rule.conclusionAST.args || []).map(a => a.name || a.value).filter(Boolean);
            conclusionFact = `${op} ${args.join(' ')}`;
          } else if (rule.source) {
            // Parse source to find conclusion reference: "@name Implies @cond @conc" or "$cond $conc"
            const match = rule.source.match(/Implies\s+[@$]?(\w+)\s+[@$]?(\w+)/i);
            if (match) {
              const refName = match[2]; // Second group is the conclusion
              // Look up the reference text
              if (this.session.referenceTexts.has(refName)) {
                conclusionFact = this.session.referenceTexts.get(refName);
              } else {
                conclusionFact = refName;
              }
            } else {
              conclusionFact = rule.name || rule.source;
            }
          }

          return {
            valid: true,
            method: 'chained_rule',
            confidence: Math.min(conclusionSim, subResult.confidence) * this.thresholds.CONFIDENCE_DECAY,
            steps: [
              { operation: 'chain_via_rule', rule: rule.name || rule.source, fact: conclusionFact },
              ...subResult.steps
            ]
          };
        }
      }
    }

    return { valid: false, reason: 'Cannot prove condition' };
  }

  /**
   * Prove compound condition (And/Or/Not) - recursive
   */
  proveCompoundCondition(conditionParts, depth) {
    const { type, parts, inner } = conditionParts;

    if (type === 'And') {
      return this.proveAndCondition(parts, depth);
    } else if (type === 'Or') {
      return this.proveOrCondition(parts, depth);
    } else if (type === 'Not') {
      return this.proveNotCondition(inner, depth);
    } else if (type === 'leaf') {
      return this.proveSimpleCondition(conditionParts.vector, depth);
    }

    return { valid: false, reason: 'Unknown condition type' };
  }

  /**
   * Prove NOT condition - succeeds if inner cannot be proved
   */
  proveNotCondition(inner, depth) {
    this.engine.logStep('proving_not', 'inner condition');

    let innerResult;
    if (inner.type === 'And' || inner.type === 'Or' || inner.type === 'Not') {
      innerResult = this.proveCompoundCondition(inner, depth);
    } else if (inner.type === 'leaf' && inner.vector) {
      innerResult = this.proveSimpleCondition(inner.vector, depth);
    } else {
      innerResult = { valid: false };
    }

    // Not succeeds if inner fails (closed-world assumption)
    if (!innerResult.valid) {
      this.engine.logStep('not_success', 'inner cannot be proved');
      return {
        valid: true,
        method: 'not_condition',
        confidence: this.thresholds.CONDITION_CONFIDENCE,
        steps: [{ operation: 'proving_not_condition' }]
      };
    }

    this.engine.logStep('not_failed', 'inner is provable');
    return { valid: false, reason: 'Not condition failed - inner is provable' };
  }

  /**
   * Prove AND condition - all parts must be true
   */
  proveAndCondition(parts, depth) {
    const allSteps = [];
    let minConfidence = 1.0;

    this.engine.logStep('proving_and', `${parts.length} conditions`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const result = this.provePart(part, depth);

      if (!result.valid) {
        this.engine.logStep('and_failed', `condition ${i + 1}`);
        return { valid: false, reason: `And condition ${i + 1} failed` };
      }

      allSteps.push(...(result.steps || []));
      if (result.confidence < minConfidence) {
        minConfidence = result.confidence;
      }
    }

    this.engine.logStep('and_success', `${parts.length} conditions`);
    return {
      valid: true,
      method: 'and_condition',
      confidence: minConfidence * this.thresholds.CONFIDENCE_DECAY,
      steps: [{ operation: 'proving_and_condition', parts: parts.length }, ...allSteps]
    };
  }

  /**
   * Prove OR condition - at least one part must be true
   */
  proveOrCondition(parts, depth) {
    this.engine.logStep('proving_or', `${parts.length} conditions`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const result = this.provePart(part, depth);

      if (result.valid) {
        this.engine.logStep('or_success', `condition ${i + 1}`);
        return {
          valid: true,
          method: 'or_condition',
          confidence: result.confidence * this.thresholds.CONFIDENCE_DECAY,
          steps: [
            { operation: 'proving_or_condition' },
            ...(result.steps || []),
            { operation: 'or_satisfied', detail: this.instantiatePart(part, new Map()) }
          ]
        };
      }
    }

    this.engine.logStep('or_failed', `${parts.length} conditions`);
    return { valid: false, reason: 'No Or branch succeeded' };
  }

  /**
   * Prove a single part - can be nested or leaf
   */
  provePart(part, depth) {
    if (part.type === 'And' || part.type === 'Or' || part.type === 'Not') {
      return this.proveCompoundCondition(part, depth);
    }
    if (part.type === 'leaf' && part.vector) {
      return this.proveSimpleCondition(part.vector, depth);
    }
    // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
    if (part.data || part.exponents) {
      return this.proveSimpleCondition(part, depth);
    }
    return { valid: false, reason: 'Invalid part structure' };
  }

  /**
   * Instantiate a condition part for logging purposes
   */
  instantiatePart(part, bindings) {
    if (!part) return '';
    if (part.type === 'leaf' && part.ast) {
      return this.engine.unification.instantiateAST(part.ast, bindings);
    }
    if (part.operator && part.args) {
      const args = part.args.map(a => bindings.get(a.name) || a.name || a.value || '').filter(Boolean);
      return `${part.operator.name || part.operator.value} ${args.join(' ')}`.trim();
    }
    return '';
  }
}

export default ConditionProver;

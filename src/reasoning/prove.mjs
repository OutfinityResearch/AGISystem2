/**
 * AGISystem2 - Proof Engine (Orchestration)
 * @module reasoning/prove
 *
 * Main proof engine that orchestrates reasoning components:
 * - Transitive reasoning (isA, locatedIn, partOf chains)
 * - Variable unification (quantified rules)
 * - Compound conditions (And/Or with backtracking)
 * - KB pattern matching
 * - Disjoint proofs (spatial negation)
 *
 * The proof strategy follows this priority:
 * 1. Direct KB match (high confidence)
 * 2. Transitive chain reasoning
 * 3. Backward chaining with rules
 * 4. Weak direct match
 * 5. Disjoint proof for spatial relations
 */

import { MAX_PROOF_DEPTH, PROOF_TIMEOUT_MS, MAX_REASONING_STEPS, getThresholds } from '../core/constants.mjs';
import { Statement, Identifier } from '../parser/ast.mjs';
import { TransitiveReasoner } from './transitive.mjs';
import { PropertyInheritanceReasoner } from './property-inheritance.mjs';
import { UnificationEngine } from './unification.mjs';
import { ConditionProver } from './conditions.mjs';
import { KBMatcher } from './kb-matching.mjs';
import { DisjointProver } from './disjoint.mjs';
import { DefaultReasoner } from './defaults.mjs';

// Import search trace builders
import {
  buildSearchTrace as buildSearchTraceImpl,
  buildNegationSearchTrace as buildNegationSearchTraceImpl,
  buildRelationEdges,
  findRelationPath,
  describeRuleCheck,
  extractLeafConditions
} from './prove-search-trace.mjs';

/**
 * Main proof engine - orchestrates all reasoning components
 */
export class ProofEngine {
  /**
   * Create proof engine
   * @param {Session} session - Parent session with KB and rules
   * @param {Object} options - Proof options
   */
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      maxDepth: options.maxDepth || MAX_PROOF_DEPTH,
      timeout: options.timeout || PROOF_TIMEOUT_MS
    };

    // Get strategy-dependent thresholds
    const strategy = session?.hdcStrategy || 'dense-binary';
    this.thresholds = getThresholds(strategy);

    // Proof state
    this.steps = [];
    this.visited = new Set();
    this.startTime = 0;
    this.reasoningSteps = 0;
    this.maxSteps = MAX_REASONING_STEPS;

    // Initialize reasoning components
    this.transitive = new TransitiveReasoner(this);
    this.propertyInheritance = new PropertyInheritanceReasoner(this);
    this.unification = new UnificationEngine(this);
    this.conditions = new ConditionProver(this);
    this.kbMatcher = new KBMatcher(this);
    this.disjoint = new DisjointProver(this);
    this.defaults = new DefaultReasoner(session);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Prove a goal statement
   * @param {Statement} goal - Goal to prove
   * @returns {ProofResult} Proof result with steps and confidence
   */
  prove(goal) {
    this.resetState();

    try {
      const result = this.proveGoal(goal, 0);
      result.goal = result.goal || goal.toString?.() || '';

      if (!result.steps || result.steps.length === 0) {
        result.steps = this.steps;
      }

      // Ensure confidence is set (default based on valid)
      if (result.confidence === undefined) {
        result.confidence = result.valid ? this.thresholds.DEFAULT_CONFIDENCE : 0;
      }

      // Add proof field for API compatibility
      result.proof = result.valid ? result.steps : null;

      // Add total reasoning steps (includes all backtracking attempts)
      result.reasoningSteps = this.reasoningSteps;

      return result;
    } catch (e) {
      return {
        valid: false,
        reason: e.message,
        goal: goal.toString?.() || '',
        steps: this.steps,
        confidence: 0,
        proof: null,
        reasoningSteps: this.reasoningSteps
      };
    }
  }

  /**
   * Try direct KB match (delegates to kbMatcher)
   * @param {Vector} goalVector - Goal vector
   * @param {string} goalStr - Goal string representation
   * @returns {Object} Match result with success and confidence
   */
  tryDirectMatch(goalVector, goalStr) {
    const result = this.kbMatcher.tryDirectMatch(goalVector, goalStr);
    return {
      success: result.valid,
      confidence: result.confidence || 0
    };
  }

  /**
   * Combine confidences from multiple proof results
   * Returns minimum confidence with chain penalty
   * @param {Array} results - Array of results with confidence
   * @returns {number} Combined confidence
   */
  combineConfidences(results) {
    if (!results || results.length === 0) {
      return 1.0;
    }
    const minConf = Math.min(...results.map(r => r.confidence || 0));
    // Apply chain length penalty using transitive decay
    return minConf * Math.pow(this.thresholds.TRANSITIVE_DECAY, results.length);
  }

  // ============================================================
  // ORCHESTRATION - Main Proof Loop
  // ============================================================

  /**
   * Main proof loop with depth tracking
   * Tries strategies in priority order:
   * 1. Direct KB match (high confidence)
   * 2. Transitive chain reasoning
   * 3. Backward chaining with rules
   * 4. Weak direct match
   * 5. Disjoint proof
   */
  proveGoal(goal, depth) {
    // Check limits
    if (this.isTimedOut()) {
      throw new Error('Proof timed out');
    }
    this.incrementSteps();
    if (this.reasoningSteps > this.maxSteps) {
      return { valid: false, reason: 'Step limit exceeded' };
    }
    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit exceeded' };
    }

    // Build goal vector and check cycles
    const goalVec = this.session.executor.buildStatementVector(goal);
    const goalHash = this.hashVector(goalVec);
    const goalKey = `goal:${goalHash}`;

    if (this.visited.has(goalKey)) {
      return { valid: false, reason: 'Cycle detected' };
    }
    this.visited.add(goalKey);

    try {
      const goalStr = goal.toString();
      const goalOp = this.extractOperatorName(goal);
      const goalArgs = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);
      const goalFactExists = goalOp ? this.factExists(goalOp, goalArgs[0], goalArgs[1]) : false;

      // Goal-level negation: allow proving Not(P) either from explicit Not facts,
      // or via negation-as-failure (CWA) if enabled and P cannot be proved.
      if (goalOp === 'Not' && Array.isArray(goal.args) && goal.args.length === 1) {
        const meta = this.session.executor.extractMetadataWithNotExpansion(goal, 'Not');
        const innerOp = meta?.innerOperator;
        const innerArgs = meta?.innerArgs;

        if (innerOp && Array.isArray(innerArgs)) {
          // 1) Explicit Not(P) in KB.
          for (const fact of this.session.kbFacts) {
            const fm = fact.metadata;
            if (fm?.operator !== 'Not') continue;
            if (fm.innerOperator !== innerOp) continue;
            if (!Array.isArray(fm.innerArgs) || fm.innerArgs.length !== innerArgs.length) continue;
            let ok = true;
            for (let i = 0; i < innerArgs.length; i++) {
              if (fm.innerArgs[i] !== innerArgs[i]) { ok = false; break; }
            }
            if (ok) {
              return {
                valid: true,
                method: 'explicit_negation',
                confidence: this.thresholds.STRONG_MATCH,
                goal: goalStr,
                steps: [{ operation: 'not_fact', fact: `Not ${innerOp} ${innerArgs.join(' ')}`.trim() }]
              };
            }
          }

          // 2) Try to prove inner.
          const innerStmt = new Statement(
            null,
            new Identifier(innerOp),
            innerArgs.map(a => new Identifier(a))
          );
          const innerResult = this.proveGoal(innerStmt, depth + 1);
          if (!innerResult.valid && this.session.closedWorldAssumption) {
            return {
              valid: true,
              method: 'closed_world_assumption',
              confidence: this.thresholds.CONDITION_CONFIDENCE,
              goal: goalStr,
              steps: [
                ...(innerResult.steps || []),
                { operation: 'cwa_negation', fact: `Not ${innerOp} ${innerArgs.join(' ')}`.trim() }
              ]
            };
          }

          if (!innerResult.valid && !this.session.closedWorldAssumption) {
            return {
              valid: false,
              reason: 'Not goal requires explicit negation (open world)',
              goal: goalStr,
              steps: this.steps
            };
          }

          return {
            valid: false,
            reason: 'Not goal failed - inner is provable',
            goal: goalStr,
            steps: this.steps
          };
        }
      }

      // Check if goal is explicitly negated (blocks all proofs)
      const negationInfo = this.checkGoalNegation(goal);
      if (negationInfo.negated) {
        const searchTrace = this.buildNegationSearchTrace(goal, negationInfo);
        return {
          valid: false,
          reason: 'Goal is negated',
          goal: goalStr,
          searchTrace,
          steps: this.steps
        };
      }

      // Strategy 1: Direct KB match (strong threshold)
      const directResult = this.kbMatcher.tryDirectMatch(goalVec, goalStr);
      const directMatchTrusted = directResult.valid && goalFactExists;
      if (directMatchTrusted && directResult.confidence > this.thresholds.VERY_STRONG_MATCH) {
        directResult.steps = [{ operation: 'direct_match', fact: this.goalToFact(goal) }];
        return directResult;
      }
      if (goalFactExists) {
        return {
          valid: true,
          method: 'direct_metadata',
          confidence: this.thresholds.STRONG_MATCH,
          goal: goalStr,
          steps: [{ operation: 'direct_fact', fact: this.goalToFact(goal) }]
        };
      }

      // Strategy 1.5: Synonym-based matching
      const synonymResult = this.trySynonymMatch(goal, depth);
      if (synonymResult.valid) {
        return synonymResult;
      }

      // Strategy 2: Transitive reasoning
      const transitiveResult = this.transitive.tryTransitiveChain(goal, depth);
      if (transitiveResult.valid) {
        return transitiveResult;
      }

      // Strategy 2.5: Property inheritance (can Bird Fly + isA Tweety Bird => can Tweety Fly)
      const inheritanceResult = this.propertyInheritance.tryPropertyInheritance(goal, depth);
      if (inheritanceResult.valid) {
        return inheritanceResult;
      }

      // Strategy 2.6: Default/Exception reasoning (non-monotonic)
      const defaultResult = this.tryDefaultReasoning(goal, depth);
      if (defaultResult.valid) {
        return defaultResult;
      }
      // If exception definitively blocks, return that result (no need to continue searching)
      if (defaultResult.definitive) {
        return defaultResult;
      }

      // Strategy 2.7: Modus ponens for propositional holds (implies P Q + holds P => holds Q)
      const modusResult = this.tryImplicationModusPonens(goal, depth);
      if (modusResult.valid) {
        return modusResult;
      }

      // Strategy 3: Rule matching (backward chaining)
      for (const rule of this.session.rules) {
        this.session.reasoningStats.ruleAttempts++;
        const ruleResult = this.kbMatcher.tryRuleMatch(goal, rule, depth);
        if (ruleResult.valid) {
          return ruleResult;
        }
      }

      // Strategy 4: Weak direct match (with entity existence verification)
      // Weak matches can produce false positives for similar-looking facts,
      // so we verify the entity actually exists in KB before accepting
      if (directMatchTrusted && directResult.confidence > this.thresholds.STRONG_MATCH) {
        const entityArg = goal.args?.[0] ? this.extractArgName(goal.args[0]) : null;
        const componentKB = this.session?.componentKB;

        // Only accept weak match if entity is known (appears in any KB fact)
        const entityExists = entityArg && componentKB && (
          componentKB.findByArg0(entityArg, false).length > 0 ||
          componentKB.findByArg1(entityArg, false).length > 0
        );

        if (entityExists) {
          directResult.steps = [{ operation: 'weak_match', fact: this.goalToFact(goal) }];
          return directResult;
        }
      }

      // Strategy 5: Disjoint proof for spatial relations
      const disjointResult = this.disjoint.tryDisjointProof(goal, depth);
      if (disjointResult.valid) {
        return disjointResult;
      }

      // Build detailed failure reason with search trace
      const goalFact = this.goalToFact(goal);
      const searchTrace = this.buildSearchTrace(goal, goalStr);

      return {
        valid: false,
        reason: 'No proof found',
        goal: goalStr,
        searchTrace,
        steps: this.steps
      };
    } finally {
      this.visited.delete(goalKey);
    }
  }

  /**
   * Build a search trace describing what was searched for failed proofs
   * Delegates to prove-search-trace.mjs
   * @param {Object} goal - Goal that failed
   * @param {string} goalStr - Goal string representation
   * @returns {string} Search trace description
   */
  buildSearchTrace(goal, goalStr) {
    return buildSearchTraceImpl(this, goal, goalStr);
  }

  /**
   * Check if a fact exists in KB (direct)
   */
  factExists(op, arg0, arg1) {
    if (!arg0 || !op) return false;
    if (this.session?.componentKB) {
      const candidates = this.session.componentKB.findByOperatorAndArg0(op, arg0);
      if (arg1 === undefined || arg1 === null) {
        return candidates.some(c => (c.args?.length || 0) < 2 || c.args?.[1] === undefined);
      }
      return candidates.some(c => (c.args?.[1] || '') === arg1);
    }
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator === op && meta.args?.[0] === arg0) {
        if (!arg1 || meta.args?.[1] === arg1) return true;
      }
    }
    return false;
  }

  /**
   * Try to prove goal using synonym expansion
   * If goal is "isA X Y" and Y has synonym Z, try "isA X Z"
   * @param {Object} goal - Goal statement
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  trySynonymMatch(goal, depth) {
    const componentKB = this.session?.componentKB;
    if (!componentKB) {
      return { valid: false };
    }

    // Extract operator and args
    const op = goal.operator?.name || goal.operator?.value;
    const args = goal.args?.map(a => a.name || a.value) || [];

    if (args.length < 2) {
      return { valid: false };
    }

    // Try synonym expansion on arg1 (the second argument)
    // E.g., for "isA Rex Canine", check if Canine has synonym Dog
    const arg0 = args[0];
    const arg1 = args[1];
    const synonyms = componentKB.expandSynonyms(arg1);

    // Remove the original arg1 to avoid infinite recursion
    synonyms.delete(arg1);

    if (synonyms.size === 0) {
      return { valid: false };
    }

    // Try to find a KB fact matching "op arg0 synonym"
    for (const synonym of synonyms) {
      this.session.reasoningStats.kbScans++;
      const candidates = componentKB.findByOperatorAndArg0(op, arg0);

      for (const fact of candidates) {
        this.session.reasoningStats.kbScans++;
        if (fact.args?.[1] === synonym) {
          // Found: "op arg0 synonym" proves "op arg0 arg1" via synonym
          return {
            valid: true,
            confidence: 0.95,
            method: 'synonym_match',
            matchedFact: `${fact.operator} ${fact.args.join(' ')}`,
            steps: [{
              operation: 'synonym_match',
              fact: `${fact.operator} ${fact.args.join(' ')}`,
              synonymUsed: `${arg1} <-> ${synonym}`,
              confidence: 0.95
            }]
          };
        }
      }
    }

    return { valid: false };
  }

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  /**
   * Reset proof state for new proof
   */
  resetState() {
    this.steps = [];
    this.visited = new Set();
    this.startTime = Date.now();
    this.reasoningSteps = 0;
  }

  /**
   * Check if proof has timed out
   * @returns {boolean}
   */
  isTimedOut() {
    return Date.now() - this.startTime > this.options.timeout;
  }

  /**
   * Increment reasoning step counter
   */
  incrementSteps() {
    this.reasoningSteps++;
  }

  /**
   * Log a proof step
   * @param {string} operation - Operation type
   * @param {string} detail - Step details
   */
  logStep(operation, detail) {
    this.steps.push({
      operation,
      detail,
      timestamp: Date.now() - this.startTime
    });
  }

  // ============================================================
  // UTILITY METHODS (used by all components)
  // ============================================================

  /**
   * Convert goal statement to DSL fact string
   * @param {Object} goal - Goal statement
   * @returns {string} Fact string "op arg1 arg2"
   */
  goalToFact(goal) {
    const op = this.extractOperatorName(goal);
    if (!op) return '';
    const args = (goal.args || []).map(a => this.extractArgName(a) || '').filter(Boolean);
    return `${op} ${args.join(' ')}`.trim();
  }

  /**
   * Extract operator name from statement
   * @param {Object} stmt - Statement AST
   * @returns {string|null}
   */
  extractOperatorName(stmt) {
    if (!stmt?.operator) return null;
    return stmt.operator.name || stmt.operator.value || null;
  }

  /**
   * Extract argument name from AST node
   * @param {Object} arg - Argument node
   * @returns {string|null}
   */
  extractArgName(arg) {
    if (!arg) return null;
    if (arg.type === 'Identifier') return arg.name;
    if (arg.type === 'Reference') return arg.name;
    return arg.name || arg.value || null;
  }

  /**
   * Create hash for vector (cycle detection)
   * @param {Object} vec - Vector
   * @returns {string} Hash string
   */
  hashVector(vec) {
    // Support both dense-binary (data) and sparse-polynomial (exponents) vectors
    if (!vec) return 'invalid:' + Math.random().toString(36);

    // Dense-binary / metric-affine: use first 8 entries to reduce collisions
    if (vec.data) {
      const parts = [];
      const limit = Number.isFinite(vec.words) ? vec.words : vec.data.length;
      for (let i = 0; i < Math.min(8, limit || 0); i++) {
        parts.push(vec.data[i]?.toString(16) || '0');
      }
      return parts.join(':');
    }

    // Sparse-polynomial: use first 8 exponents
    if (vec.exponents) {
      return [...vec.exponents].slice(0, 8).map(e => e.toString(16)).join(':');
    }

    return 'invalid:' + Math.random().toString(36);
  }

  /**
   * Check if a goal is negated and return details
   * @param {Object} goal - Goal statement
   * @returns {Object} { negated: boolean, negationRef: string, negationType: string }
   */
  checkGoalNegation(goal) {
    const goalOp = this.extractOperatorName(goal);
    const goalArgs = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);
    if (!goalOp) return { negated: false };

    const canon = (name) => {
      if (!this.session?.canonicalizationEnabled) return name;
      return this.session.componentKB?.canonicalizeName?.(name) || name;
    };

    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta) continue;

      if (meta.operator === 'Not') {
        // New expanded format: innerOperator and innerArgs contain the negated fact
        if (meta.innerOperator && meta.innerArgs) {
          // Build the inner fact text for display
          const innerFactText = `${meta.innerOperator} ${meta.innerArgs.join(' ')}`;

          // Prefer metadata equality over vector similarity.
          // This avoids false negatives for graph/macro operators where the stored fact vector
          // differs structurally from buildStatementVector(goal).
          const innerOp = canon(meta.innerOperator);
          const innerArgs = Array.isArray(meta.innerArgs) ? meta.innerArgs.map(canon) : [];
          const gOp = canon(goalOp);
          const gArgs = goalArgs.map(canon);

          const match =
            gOp === innerOp &&
            gArgs.length === innerArgs.length &&
            gArgs.every((a, i) => a === innerArgs[i]);

          if (match) {
            return {
              negated: true,
              negationRef: innerFactText,
              negationType: 'explicit',
              innerOperator: meta.innerOperator,
              innerArgs: meta.innerArgs
            };
          }
        }

        // Legacy format: args[0] is a reference name
        const negatedRef = meta.args?.[0];
        if (!negatedRef || typeof negatedRef !== 'string') continue;

        const goalVec = this.session.executor.buildStatementVector(goal);
        if (!goalVec) continue;
        const refName = negatedRef.replace('$', '');
        const negatedVec = this.session.scope.get(refName);

        if (negatedVec) {
          this.session.reasoningStats.similarityChecks++;
          const sim = this.session.similarity(goalVec, negatedVec);
          if (sim > this.thresholds.RULE_MATCH) {
            return {
              negated: true,
              negationRef: refName,
              negationType: 'explicit'
            };
          }
        }
      }
    }

    return { negated: false };
  }

  /**
   * Build search trace for negated goals
   * Delegates to prove-search-trace.mjs
   * @param {Object} goal - Goal statement
   * @param {Object} negationInfo - Negation details
   * @returns {string} Search trace
   */
  buildNegationSearchTrace(goal, negationInfo) {
    return buildNegationSearchTraceImpl(this, goal, negationInfo);
  }

  /**
   * Check if a goal is explicitly negated in the KB
   * Looks for facts like "Not $ref" where $ref matches the goal
   * @param {Object} goal - Goal statement
   * @returns {boolean} True if goal is negated
   */
  isGoalNegated(goal) {
    // Use checkGoalNegation which handles both expanded and legacy formats
    const result = this.checkGoalNegation(goal);
    return result.negated;
  }

  /**
   * Try to prove goal using Default/Exception reasoning
   * @param {Object} goal - Goal statement
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  tryDefaultReasoning(goal, depth) {
    // Only applies to property operators (can, has, likes, etc.)
    const op = this.extractOperatorName(goal);

    const semanticIndex = this.session?.semanticIndex;
    const isDefaultable = semanticIndex?.isInheritableProperty
      ? semanticIndex.isInheritableProperty(op)
      : new Set(['can', 'has', 'likes', 'knows', 'owns', 'uses']).has(op);

    if (!isDefaultable) {
      return { valid: false };
    }

    const args = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);
    if (args.length < 2) {
      return { valid: false };
    }

    const entity = args[0];
    const value = args[1];

    // Try default reasoning
    const result = this.defaults.resolveDefaults(entity, op, value);

    if (!result.success) {
      return { valid: false };
    }

    if (result.value === true) {
      // Default applies
      return {
        valid: true,
        confidence: result.confidence,
        method: result.method,
        steps: [{
          operation: 'default_reasoning',
          fact: `Default ${op} ${result.fromType} ${value}`,
          appliedTo: entity,
          confidence: result.confidence
        }],
        goal: this.goalToFact(goal)
      };
    } else if (result.value === false) {
      // Exception explicitly blocks default - this is a definitive "no"
      const types = this.defaults.getTypeHierarchy(entity);
      // Skip entity itself in chain (types[0] is entity, types[1+] are parents)
      const typeChain = types.slice(1, 4).map(t => `${entity} isA ${t}`).join('. ');
      const blocked = Array.isArray(result.blocked) ? result.blocked[0] : null;
      const defaultType = blocked?.default?.forType || result.fromType;
      const exceptionType = blocked?.blockedBy?.forType || result.fromType;
      const searchTrace = `Search: ${typeChain}. Default ${op} ${defaultType} ${value} blocked by exception for ${exceptionType}.`;

      return {
        valid: false,
        reason: result.reason || 'Blocked by exception',
        goal: this.goalToFact(goal),
        searchTrace,
        method: result.method,
        definitive: true, // Signal this is not just "couldn't find" but "definitely blocked"
        steps: [{
          operation: 'exception_blocks',
          fact: `Exception ${op} ${result.fromType} ${value}`,
          appliedTo: entity,
          reason: result.reason
        }]
      };
    }

    return { valid: false };
  }

  /**
   * Try modus ponens for propositional holds (implies P Q + holds P => holds Q).
   * Supports compound antecedents via rule condition checking.
   * @param {Object} goal - Goal statement
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  tryImplicationModusPonens(goal, depth) {
    const op = this.extractOperatorName(goal);
    if (op !== 'holds') return { valid: false };

    const args = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);
    if (args.length < 1) return { valid: false };
    const target = args[0];

    const candidates = [];
    for (const rule of this.session.rules || []) {
      const conc = rule.conclusionAST;
      if (!conc) continue;

      if (conc.type === 'Identifier' && conc.name === target) {
        candidates.push(rule);
        continue;
      }

      const concOp = this.extractOperatorName(conc);
      if (concOp === 'holds') {
        const concArgs = (conc.args || []).map(a => this.extractArgName(a)).filter(Boolean);
        if (concArgs[0] === target) {
          candidates.push(rule);
        }
      }
    }

    for (const rule of candidates) {
      const condResult = this.proveImplicationCondition(rule, depth + 1);
      if (!condResult.valid) continue;

      const steps = [];
      steps.push(...(condResult.steps || []));
      const implicationFact = this.describeSimpleImplication(rule);
      if (implicationFact) {
        steps.push({ operation: 'direct_fact', fact: implicationFact });
      }
      steps.push({ operation: 'rule_application', fact: `holds ${target}` });

      return {
        valid: true,
        method: 'modus_ponens',
        confidence: (condResult.confidence || this.thresholds.RULE_CONFIDENCE) * this.thresholds.CONFIDENCE_DECAY,
        goal: this.goalToFact(goal),
        steps
      };
    }

    return { valid: false };
  }

  /**
   * Prove antecedent for an implication rule in propositional form.
   * @param {Object} rule - Implication rule
   * @param {number} depth - Current proof depth
   * @returns {Object} Proof result
   */
  proveImplicationCondition(rule, depth) {
    if (rule.conditionParts) {
      return this.conditions.proveCondition(rule, depth);
    }

    const condAst = rule.conditionAST;
    if (!condAst) return { valid: false };

    if (condAst.type === 'Identifier' && condAst.name) {
      const antecedent = new Statement(
        null,
        new Identifier('holds'),
        [new Identifier(condAst.name)]
      );
      return this.proveGoal(antecedent, depth);
    }

    const condOp = this.extractOperatorName(condAst);
    if (condOp === 'holds' || condAst.operator) {
      return this.proveGoal(condAst, depth);
    }

    return { valid: false };
  }

  /**
   * Render a simple implication fact for proofs when both sides are single tokens.
   * @param {Object} rule - Implication rule
   * @returns {string|null} Fact string or null if complex
   */
  describeSimpleImplication(rule) {
    const cond = rule?.conditionAST;
    const conc = rule?.conclusionAST;
    if (!cond || !conc) return null;

    if (cond.type !== 'Identifier' || conc.type !== 'Identifier') return null;
    if (!cond.name || !conc.name) return null;

    return `implies ${cond.name} ${conc.name}`;
  }
}

export default ProofEngine;

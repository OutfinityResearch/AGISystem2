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
import { TransitiveReasoner } from './transitive.mjs';
import { PropertyInheritanceReasoner } from './property-inheritance.mjs';
import { UnificationEngine } from './unification.mjs';
import { ConditionProver } from './conditions.mjs';
import { KBMatcher } from './kb-matching.mjs';
import { DisjointProver } from './disjoint.mjs';

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

    if (this.visited.has(goalHash)) {
      return { valid: false, reason: 'Cycle detected' };
    }
    this.visited.add(goalHash);

    const goalStr = goal.toString();
    const goalOp = this.extractOperatorName(goal);
    const goalArgs = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);
    const goalFactExists = goalOp ? this.factExists(goalOp, goalArgs[0], goalArgs[1]) : false;

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
  }

  /**
   * Build a search trace describing what was searched for failed proofs
   * @param {Object} goal - Goal that failed
   * @param {string} goalStr - Goal string representation
   * @returns {string} Search trace description
   */
  buildSearchTrace(goal, goalStr) {
    const traces = [];
    const op = this.extractOperatorName(goal);
    const args = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);

    if (args.length < 2) {
      return `Searched ${goalStr} in KB. Not found.`;
    }

    const entity = args[0];
    const target = args[1];
    const componentKB = this.session?.componentKB;

    // 1. Check if entity exists in KB
    let entityExists = false;
    let entityFacts = [];
    if (componentKB) {
      entityFacts = componentKB.findByArg0(entity, false);
      // For temporal/causal facts, treat presence as source or target as existence
      entityExists = entityFacts.length > 0 ||
        componentKB.findByOperatorAndArg1(op, entity).length > 0 ||
        componentKB.findByOperatorAndArg0(op, entity).length > 0;
    } else {
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.args?.[0] === entity) {
          entityExists = true;
          entityFacts.push(meta);
        }
        if (meta?.args?.[1] === entity && meta.operator === op) {
          entityExists = true;
        }
      }
    }

    if (!entityExists) {
      traces.push(`Searched isA ${entity} ?type in KB. Not found`);
      traces.push(`Entity unknown`);
      traces.push(`No applicable inheritance paths`);
      return `Search: ${traces.join('. ')}.`;
    }

    // 2. Get the isA chain for the entity
    const isAChain = [];
    let current = entity;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      let nextParent = null;

      if (componentKB) {
        const isAFacts = componentKB.findByOperatorAndArg0('isA', current);
        if (isAFacts.length > 0 && isAFacts[0].args?.[1]) {
          nextParent = isAFacts[0].args[1];
        }
      } else {
        for (const fact of this.session.kbFacts) {
          const meta = fact.metadata;
          if (meta?.operator === 'isA' && meta.args?.[0] === current) {
            nextParent = meta.args[1];
            break;
          }
        }
      }

      if (nextParent) {
        isAChain.push(`${current} isA ${nextParent}`);
        current = nextParent;
      } else {
        break;
      }
    }

    if (isAChain.length > 0) {
      traces.push(isAChain.join('. '));
    }

    // 3a. Check relevant rules for this operator to surface missing conditions
    const ruleTrace = this.describeRuleCheck(op, entity);
    if (ruleTrace) {
      traces.push(ruleTrace);
    }

    // 3. Check what we were looking for and why it failed
    if (op === 'isA') {
      traces.push(`No path exists from ${entity} to ${target}`);
    } else if (op === 'before') {
      const edges = this.buildRelationEdges('before');
      const outgoing = edges.get(entity) || [];
      if (outgoing.length === 0) {
        traces.push(`Searched before ${entity} ?next in KB. Not found`);
        traces.push(`${entity} has no outgoing before relations`);
      } else {
        traces.push(`Searched before ${entity} ?next. Found: ${outgoing.join(', ')}`);
      }

      // Check reverse path (target -> entity)
      const reversePath = this.findRelationPath(edges, target, entity);
      if (reversePath.length > 0) {
        traces.push(`Reverse path: ${reversePath.join(' -> ')}`);
        traces.push('Path exists in opposite direction only');
        traces.push('Temporal order violated');
      } else {
        traces.push(`No transitive path to ${target}`);
      }
    } else if (['can', 'has', 'likes', 'knows', 'owns', 'uses'].includes(op)) {
      // Property inheritance - check if any ancestor has it
      let found = false;
      let checkedTypes = [];

      // Check if the property exists for any type
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === op && meta.args?.[1] === target) {
          checkedTypes.push(meta.args[0]);
          // Check if entity isA that type
          const propHolder = meta.args[0];
          if (isAChain.some(step => step.includes(propHolder))) {
            found = true;
            break;
          }
        }
      }

      if (!found && checkedTypes.length > 0) {
        traces.push(`Checked: ${checkedTypes.slice(0, 3).map(t => `${t} ${op} ${target}`).join(', ')}`);
        traces.push(`${entity} is not a ${checkedTypes.join(' or ')}`);
        traces.push(`Property not inheritable`);
      } else if (checkedTypes.length === 0) {
        traces.push(`No ${op} ${target} facts found in KB`);
      }
    } else if (['locatedIn', 'causes', 'before', 'partOf'].includes(op)) {
      traces.push(`Searched ${op} ${entity} ?next in KB. Not found`);
      const edges = this.buildRelationEdges(op);
      const outgoing = edges.get(entity) || [];
      if (outgoing.length === 0) {
        traces.push(`${entity} has no outgoing ${op} relations`);
      }
      const reversePath = this.findRelationPath(edges, target, entity);
      if (reversePath.length > 0) {
        traces.push(`Reverse path: ${reversePath.join(' -> ')}`);
        traces.push('Path exists in opposite direction only');
        const dirLabel = op === 'causes' ? 'Causal direction violated' : `${op} direction violated`;
        traces.push(dirLabel);
      } else {
        traces.push(`No transitive path to ${target}`);
      }
    }

    return traces.length > 0 ? `Search: ${traces.join('. ')}.` : `Searched ${goalStr}. Not found.`;
  }

  /**
   * Build adjacency list for a binary relation in KB
   */
  buildRelationEdges(op) {
    const edges = new Map();
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator === op && meta.args?.length >= 2) {
        const from = meta.args[0];
        const to = meta.args[1];
        if (!edges.has(from)) edges.set(from, []);
        edges.get(from).push(to);
      }
    }
    return edges;
  }

  /**
   * Find a path in a relation graph from start to target (BFS)
   */
  findRelationPath(edges, start, target) {
    const queue = [[start, [start]]];
    const visited = new Set();

    while (queue.length > 0) {
      const [node, path] = queue.shift();
      if (node === target) return path;
      if (visited.has(node)) continue;
      visited.add(node);
      const neighbors = edges.get(node) || [];
      for (const n of neighbors) {
        queue.push([n, [...path, n]]);
      }
    }
    return [];
  }

  /**
   * Describe rule checks for a failed proof (high level)
   * @param {string} op - Goal operator
   * @param {string} entity - Goal subject
   * @returns {string|null} Trace summary
   */
  describeRuleCheck(op, entity) {
    if (!this.session?.rules?.length) return null;

    const matching = this.session.rules.filter(r => {
      const concOp = r.conclusionAST?.operator?.name || r.conclusionAST?.operator?.value;
      return concOp === op;
    });
    if (matching.length === 0) return null;

    // Inspect first matching rule (deterministic)
    const rule = matching[0];
    const leaves = this.extractLeafConditions(rule.conditionParts);
    if (leaves.length === 0) {
      return `Checked rule: ${rule.name || rule.source}. Conditions could not be analyzed.`;
    }

    const found = [];
    const missing = [];

    for (const leaf of leaves) {
      const args = [];
      for (const arg of leaf.args || []) {
        if (arg.isVariable) {
          // Bind the first variable to the entity for a meaningful trace
          args.push(arg.name === 'x' || arg.name === 'subject' ? entity : `?${arg.name}`);
        } else {
          args.push(arg.name);
        }
      }
      const factStr = `${leaf.op} ${args.join(' ')}`.trim();
      const exists = this.factExists(leaf.op, args[0], args[1]);
      if (exists) found.push(factStr);
      else missing.push(factStr);
    }

    let summary = `Checked rule: ${rule.name || rule.source}.`;
    if (found.length > 0) summary += ` Found: ${found.join(', ')}.`;
    if (missing.length > 0) summary += ` Missing: ${missing.join(', ')}.`;
    return summary;
  }

  /**
   * Extract leaf conditions from a compound condition structure
   * @param {Object} condParts - conditionParts tree
   * @returns {Array<{op:string,args:Array}>}
   */
  extractLeafConditions(condParts) {
    if (!condParts) return [];
    if (condParts.type === 'leaf' && condParts.ast) {
      const op = condParts.ast.operator?.name || condParts.ast.operator?.value;
      const args = (condParts.ast.args || []).map(a => ({
        name: a.name || a.value || '',
        isVariable: a.type === 'Hole'
      }));
      return [{ op, args }];
    }
    if (condParts.type === 'And' || condParts.type === 'Or') {
      return condParts.parts.flatMap(p => this.extractLeafConditions(p));
    }
    if (condParts.type === 'Not') {
      return this.extractLeafConditions(condParts.inner);
    }
    return [];
  }

  /**
   * Check if a fact exists in KB (direct)
   */
  factExists(op, arg0, arg1) {
    if (!arg0 || !op) return false;
    if (this.session?.componentKB) {
      const candidates = this.session.componentKB.findByOperatorAndArg0(op, arg0);
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

    // Dense-binary: use first 4 words
    if (vec.data) {
      const parts = [];
      for (let i = 0; i < Math.min(4, vec.words || 0); i++) {
        parts.push(vec.data[i]?.toString(16) || '0');
      }
      return parts.join(':');
    }

    // Sparse-polynomial: use exponents
    if (vec.exponents) {
      return [...vec.exponents].slice(0, 4).map(e => e.toString(16)).join(':');
    }

    return 'invalid:' + Math.random().toString(36);
  }

  /**
   * Check if a goal is negated and return details
   * @param {Object} goal - Goal statement
   * @returns {Object} { negated: boolean, negationRef: string, negationType: string }
   */
  checkGoalNegation(goal) {
    const goalVec = this.session.executor.buildStatementVector(goal);
    if (!goalVec) return { negated: false };

    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta) continue;

      if (meta.operator === 'Not') {
        const negatedRef = meta.args?.[0];
        if (!negatedRef) continue;

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
   * @param {Object} goal - Goal statement
   * @param {Object} negationInfo - Negation details
   * @returns {string} Search trace
   */
  buildNegationSearchTrace(goal, negationInfo) {
    const traces = [];
    const op = this.extractOperatorName(goal);
    const args = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);

    if (args.length < 2) {
      return `Search: Goal negated by Not(${negationInfo.negationRef}).`;
    }

    const entity = args[0];
    const target = args[1];

    // Find types that have the property we're checking (e.g., Bird for can Fly)
    // Check both direct facts and rules
    const typesWithProperty = new Set();
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator === op && meta.args?.[1] === target) {
        typesWithProperty.add(meta.args[0]);
      }
    }

    // Also check rules that derive the property
    for (const rule of this.session.rules) {
      if (!rule.conclusionAST) continue;
      const concOp = rule.conclusionAST.operator?.name || rule.conclusionAST.operator?.value;
      if (concOp === op) {
        const ruleTargetArg = rule.conclusionAST.args?.[1];
        const ruleTarget = ruleTargetArg?.name || ruleTargetArg?.value;
        if (ruleTarget === target) {
          // Find the type in the condition
          const condAST = rule.conditionAST;
          if (condAST) {
            const condOp = condAST.operator?.name || condAST.operator?.value;
            if (condOp === 'isA') {
              const condType = condAST.args?.[1]?.name || condAST.args?.[1]?.value;
              if (condType) {
                typesWithProperty.add(condType);
              }
            }
          }
        }
      }
    }

    // Build isA chain for the entity, stopping at relevant type
    const isAChain = [];
    let current = entity;
    const visited = new Set();
    let foundRelevantType = null;

    while (current && !visited.has(current)) {
      visited.add(current);

      // Check if we found a type that has the property
      if (typesWithProperty.has(current)) {
        foundRelevantType = current;
        // Don't break - finish this step
      }

      let nextParent = null;
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === current) {
          nextParent = meta.args[1];
          break;
        }
      }

      if (nextParent) {
        isAChain.push(`${current} isA ${nextParent}`);
        current = nextParent;

        // Stop after recording the step that reaches the relevant type
        if (foundRelevantType && typesWithProperty.has(nextParent)) {
          break;
        }
        if (foundRelevantType) {
          break; // Stop one step after the relevant type
        }
      } else {
        break;
      }
    }

    if (isAChain.length > 0) {
      traces.push(isAChain.join('. '));
    }

    // Check if there's a rule that would have applied
    if (['can', 'has', 'likes', 'knows'].includes(op) && foundRelevantType) {
      traces.push(`Rule: isA ${foundRelevantType} implies ${op} ${target} would apply`);
    }

    // Add negation info
    traces.push(`Found explicit negation: Not(${op} ${entity} ${target})`);
    traces.push('Negation blocks inference');

    return `Search: ${traces.join('. ')}.`;
  }

  /**
   * Check if a goal is explicitly negated in the KB
   * Looks for facts like "Not $ref" where $ref matches the goal
   * @param {Object} goal - Goal statement
   * @returns {boolean} True if goal is negated
   */
  isGoalNegated(goal) {
    const goalVec = this.session.executor.buildStatementVector(goal);
    if (!goalVec) return false;

    // Look for Not statements in KB
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta) continue;

      // Check if this is a Not statement
      if (meta.operator === 'Not') {
        // Get the referenced name
        const negatedRef = meta.args?.[0];
        if (!negatedRef) continue;

        // Look up the vector in scope
        const refName = negatedRef.replace('$', '');
        const negatedVec = this.session.scope.get(refName);

        if (negatedVec) {
          // Compare vectors using similarity
          this.session.reasoningStats.similarityChecks++;
          const sim = this.session.similarity(goalVec, negatedVec);
          if (sim > this.thresholds.RULE_MATCH) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

export default ProofEngine;

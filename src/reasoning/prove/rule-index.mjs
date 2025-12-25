/**
 * Rule index by conclusion operator and constructivist level.
 *
 * Used to avoid scanning all rules on every prove/condition step.
 * Level-aware indexing enables further search space pruning.
 */

import { computeRuleLevels } from '../constructivist-level.mjs';

function extractOpFromAst(ast) {
  if (!ast) return null;
  const op = ast.operator?.name || ast.operator?.value || ast.name || ast.value || null;
  return op || null;
}

function collectLeafConclusionOpsFromParts(parts, out) {
  if (!parts) return;
  if (parts.type === 'Not') return;
  if (parts.type === 'leaf') {
    const op = extractOpFromAst(parts.ast);
    if (op) out.add(op);
    return;
  }
  if ((parts.type === 'And' || parts.type === 'Or') && Array.isArray(parts.parts)) {
    for (const p of parts.parts) collectLeafConclusionOpsFromParts(p, out);
  }
}

export function buildRuleIndexByConclusionOp(session) {
  const index = new Map();
  for (const rule of session?.rules || []) {
    const ops = new Set();
    if (rule.conclusionParts) {
      collectLeafConclusionOpsFromParts(rule.conclusionParts, ops);
    }
    if (ops.size === 0) {
      const op = extractOpFromAst(rule.conclusionAST);
      if (op) ops.add(op);
    }
    for (const op of ops) {
      const list = index.get(op);
      if (list) list.push(rule);
      else index.set(op, [rule]);
    }
  }
  return index;
}

/**
 * Enhanced rule index with level-based organization
 */
export class LevelAwareRuleIndex {
  constructor(session) {
    this.session = session;
    this._byOp = null;
    this._byLevel = null;
    this._byOpAndLevel = null;
    this._rulesLength = 0;
  }

  /**
   * Ensure indices are built and up-to-date
   */
  _ensureBuilt() {
    const rules = this.session?.rules || [];
    if (this._byOp && this._rulesLength === rules.length) {
      return;
    }

    this._byOp = new Map();
    this._byLevel = new Map();
    this._byOpAndLevel = new Map();
    this._rulesLength = rules.length;

    const componentKB = this.session?.componentKB;
    const conceptLevels = componentKB?.levelManager?.conceptLevels || new Map();

    for (const rule of rules) {
      // Extract conclusion operators
      const ops = new Set();
      if (rule.conclusionParts) {
        collectLeafConclusionOpsFromParts(rule.conclusionParts, ops);
      }
      if (ops.size === 0) {
        const op = extractOpFromAst(rule.conclusionAST);
        if (op) ops.add(op);
      }

      // Compute rule levels
      const levels = computeRuleLevels(rule, conceptLevels);
      rule._concLevel = levels.conclusionLevel;
      rule._maxPremLevel = levels.maxPremiseLevel;

      // Index by operator
      for (const op of ops) {
        if (!this._byOp.has(op)) {
          this._byOp.set(op, []);
        }
        this._byOp.get(op).push(rule);

        // Index by operator AND level
        const opLevelKey = `${op}:${levels.conclusionLevel}`;
        if (!this._byOpAndLevel.has(opLevelKey)) {
          this._byOpAndLevel.set(opLevelKey, []);
        }
        this._byOpAndLevel.get(opLevelKey).push(rule);
      }

      // Index by conclusion level
      const concLevel = levels.conclusionLevel;
      if (!this._byLevel.has(concLevel)) {
        this._byLevel.set(concLevel, []);
      }
      this._byLevel.get(concLevel).push(rule);
    }
  }

  /**
   * Get rules by conclusion operator
   * @param {string} op - Operator name
   * @returns {Array} Matching rules
   */
  getRulesByOp(op) {
    this._ensureBuilt();
    return this._byOp.get(op) || [];
  }

  /**
   * Get rules by conclusion level
   * @param {number} level - Target level
   * @returns {Array} Rules with conclusion at this level
   */
  getRulesByLevel(level) {
    this._ensureBuilt();
    return this._byLevel.get(level) || [];
  }

  /**
   * Get rules by operator and level
   * @param {string} op - Operator name
   * @param {number} level - Target level
   * @returns {Array} Matching rules
   */
  getRulesByOpAndLevel(op, level) {
    this._ensureBuilt();
    return this._byOpAndLevel.get(`${op}:${level}`) || [];
  }

  /**
   * Get rules that could prove a goal at given level
   * Only returns rules where premise levels < goal level
   * @param {string} op - Operator name
   * @param {number} goalLevel - Target goal level
   * @returns {Array} Applicable rules
   */
  getRulesForGoal(op, goalLevel) {
    this._ensureBuilt();

    const candidates = this._byOp.get(op) || [];

    // Filter to rules where:
    // 1. Conclusion level matches goal level (or close)
    // 2. Premise levels are strictly less than goal level
    return candidates.filter(rule => {
      const premLevel = rule._maxPremLevel ?? 0;
      // Premises must be at lower level than goal
      if (premLevel >= goalLevel) return false;
      return true;
    });
  }

  /**
   * Get all indexed operators
   * @returns {Array<string>} Operator names
   */
  getIndexedOperators() {
    this._ensureBuilt();
    return [...this._byOp.keys()];
  }

  /**
   * Get statistics
   * @returns {Object} Index statistics
   */
  getStats() {
    this._ensureBuilt();
    return {
      totalRules: this._rulesLength,
      operatorCount: this._byOp.size,
      levelCount: this._byLevel.size
    };
  }
}


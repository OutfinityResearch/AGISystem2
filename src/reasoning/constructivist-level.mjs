/**
 * AGISystem2 - Constructivist Level Optimization
 * @module reasoning/constructivist-level
 *
 * Implements hierarchical ordering of concepts where each concept at level N
 * can only be built from concepts at levels strictly less than N.
 * This creates a DAG structure enabling significant search space pruning.
 *
 * Level(concept) =
 *   0                                        if concept is a primitive atom
 *   1 + max(Level(d) for d in deps(concept)) otherwise
 */

/**
 * Extract all dependencies (concepts referenced) from a fact or expression
 * @param {Object} fact - Fact with metadata or AST
 * @param {Object} options - Options for extraction
 * @returns {Set<string>} Set of referenced concept names
 */
export function extractDependencies(fact, options = {}) {
  const deps = new Set();
  const visited = new Set();

  function extractFromValue(val) {
    if (!val) return;
    if (visited.has(val)) return;

    if (typeof val === 'string') {
      // Skip variables, holes, and internal markers
      if (val.startsWith('?') || val.startsWith('$') || val.startsWith('@')) return;
      // Skip pure numbers
      if (/^\d+$/.test(val)) return;
      deps.add(val);
      return;
    }

    if (typeof val === 'object') {
      visited.add(val);

      // Handle AST nodes
      if (val.type === 'Identifier' || val.type === 'identifier') {
        const name = val.name || val.value;
        if (name && typeof name === 'string' && !name.startsWith('?')) {
          deps.add(name);
        }
      }

      // Handle operator
      if (val.operator) {
        extractFromValue(val.operator);
      }

      // Handle name/value directly
      if (val.name && typeof val.name === 'string') {
        extractFromValue(val.name);
      }

      // Handle expressions/arguments
      if (Array.isArray(val.expressions)) {
        for (const expr of val.expressions) {
          extractFromValue(expr);
        }
      }
      if (Array.isArray(val.args)) {
        for (const arg of val.args) {
          extractFromValue(arg);
        }
      }
      if (Array.isArray(val.parts)) {
        for (const part of val.parts) {
          extractFromValue(part);
        }
      }

      // Handle compound expressions (And, Or, Implies, etc.)
      if (val.left) extractFromValue(val.left);
      if (val.right) extractFromValue(val.right);
      if (val.condition) extractFromValue(val.condition);
      if (val.conclusion) extractFromValue(val.conclusion);
      if (val.ast) extractFromValue(val.ast);
    }
  }

  // Extract from metadata
  if (fact.metadata) {
    const meta = fact.metadata;
    if (meta.operator) deps.add(meta.operator);
    if (Array.isArray(meta.args)) {
      for (const arg of meta.args) {
        if (typeof arg === 'string' && !arg.startsWith('?')) {
          deps.add(arg);
        }
      }
    }
  }

  // Extract from AST if present
  if (fact.ast) {
    extractFromValue(fact.ast);
  }

  // Extract from statement parts
  if (fact.operator) {
    extractFromValue(fact.operator);
  }
  if (fact.expressions) {
    for (const expr of fact.expressions) {
      extractFromValue(expr);
    }
  }

  return deps;
}

/**
 * Compute constructivist level for a fact given existing concept levels
 * @param {Object} fact - Fact to compute level for
 * @param {Map<string, number>} conceptLevels - Existing concept->level mapping
 * @param {Object} options - Options
 * @returns {number} Computed level
 */
export function computeConstructivistLevel(fact, conceptLevels, options = {}) {
  const deps = extractDependencies(fact, options);

  if (deps.size === 0) {
    return 0;
  }

  let maxDepLevel = -1;
  for (const dep of deps) {
    const depLevel = conceptLevels.get(dep) ?? 0;
    maxDepLevel = Math.max(maxDepLevel, depLevel);
  }

  return maxDepLevel + 1;
}

/**
 * Compute level for a goal/query expression
 * @param {Object} goal - Goal AST or string
 * @param {Map<string, number>} conceptLevels - Concept levels
 * @returns {number} Estimated level for the goal
 */
export function computeGoalLevel(goal, conceptLevels) {
  if (typeof goal === 'string') {
    // Parse simple goal string like "isA Dog Animal"
    const parts = goal.split(/\s+/).filter(p => p && !p.startsWith('?'));
    if (parts.length === 0) return 0;

    let maxLevel = 0;
    for (const part of parts) {
      const level = conceptLevels.get(part) ?? 0;
      maxLevel = Math.max(maxLevel, level);
    }
    return maxLevel + 1;
  }

  // Handle AST object
  const deps = extractDependencies({ ast: goal });
  if (deps.size === 0) return 0;

  let maxLevel = 0;
  for (const dep of deps) {
    const level = conceptLevels.get(dep) ?? 0;
    maxLevel = Math.max(maxLevel, level);
  }

  return maxLevel + 1;
}

/**
 * Compute level for a rule based on its condition and conclusion
 * @param {Object} rule - Rule object
 * @param {Map<string, number>} conceptLevels - Concept levels
 * @returns {{conclusionLevel: number, maxPremiseLevel: number}}
 */
export function computeRuleLevels(rule, conceptLevels) {
  // Extract conclusion dependencies
  const concDeps = new Set();
  if (rule.conclusionAST) {
    for (const d of extractDependencies({ ast: rule.conclusionAST })) {
      concDeps.add(d);
    }
  }
  if (rule.conclusionParts) {
    for (const d of extractDependencies({ ast: rule.conclusionParts })) {
      concDeps.add(d);
    }
  }

  // Extract condition dependencies
  const condDeps = new Set();
  if (rule.conditionAST) {
    for (const d of extractDependencies({ ast: rule.conditionAST })) {
      condDeps.add(d);
    }
  }
  if (rule.conditionParts) {
    for (const d of extractDependencies({ ast: rule.conditionParts })) {
      condDeps.add(d);
    }
  }

  // Compute levels
  let maxConcLevel = 0;
  for (const dep of concDeps) {
    maxConcLevel = Math.max(maxConcLevel, conceptLevels.get(dep) ?? 0);
  }

  let maxPremLevel = 0;
  for (const dep of condDeps) {
    maxPremLevel = Math.max(maxPremLevel, conceptLevels.get(dep) ?? 0);
  }

  return {
    conclusionLevel: maxConcLevel + 1,
    maxPremiseLevel: maxPremLevel + 1
  };
}

/**
 * Level-based KB manager
 * Maintains indices and bundles organized by constructivist level
 */
export class LevelManager {
  constructor(session) {
    this.session = session;

    // Core level tracking
    this.conceptLevels = new Map();      // concept name -> level
    this.factLevels = new Map();         // fact id -> level
    this.maxLevel = 0;                   // highest level in KB

    // Level-based indices
    this.levelIndex = new Map();         // level -> Set<factId>
    this.levelFacts = new Map();         // level -> [facts]

    // Rule level tracking
    this.ruleLevels = new Map();         // rule id/name -> {conclusionLevel, maxPremiseLevel}
    this.rulesByConclLevel = new Map();  // level -> [rules]

    // HDC level bundles (lazy computed)
    this._levelBundles = new Map();      // level -> Vector
    this._cumulativeBundles = new Map(); // level -> Vector (0..level)
    this._bundlesDirty = true;

    // Primitives (level 0)
    this._initializePrimitives();
  }

  /**
   * Initialize primitive concepts at level 0
   */
  _initializePrimitives() {
    // Core operators and structural elements
    const primitives = [
      // L0 HDC primitives
      '___Bind', '___Bundle', '___Similarity', '___NewVector', '___MostSimilar', '___Extend',
      // L1 Structural
      '__Atom', '__Role', '__Pair', '__Event', '__Bundle', '__Category', '__Relation',
      '__TransitiveRelation', '__SymmetricRelation', '__ReflexiveRelation',
      // L2 Semantic primitives
      '_ptrans', '_atrans', '_mtrans', '_propel', '_grasp', '_ingest', '_expel', '_mbuild', '_attend', '_speak',
      // Core operators
      'isA', 'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
      'partOf', 'locatedIn', 'causes', 'enables', 'prevents',
      'hasProperty', 'has', 'can', 'cannot',
      // Position vectors
      'Pos1', 'Pos2', 'Pos3', 'Pos4', 'Pos5', 'Pos6', 'Pos7', 'Pos8', 'Pos9', 'Pos10',
      // Roles
      'Agent', 'Theme', 'Source', 'Goal', 'Recipient', 'Content', 'Instrument',
      // Meta operations
      'Load', 'Unload', 'Export', 'Import', 'Set',
      // Truth values
      'True', 'False'
    ];

    for (const p of primitives) {
      this.conceptLevels.set(p, 0);
    }

    // Initialize level 0 index
    this.levelIndex.set(0, new Set());
    this.levelFacts.set(0, []);
  }

  /**
   * Register a new concept with its level
   * @param {string} name - Concept name
   * @param {number} level - Constructivist level
   */
  registerConcept(name, level) {
    if (!name || typeof name !== 'string') return;
    if (name.startsWith('?') || name.startsWith('$')) return;

    // Only update if new or higher level
    const existing = this.conceptLevels.get(name);
    if (existing === undefined || level > existing) {
      this.conceptLevels.set(name, level);
      this.maxLevel = Math.max(this.maxLevel, level);
    }
  }

  /**
   * Get constructivist level of a concept
   * @param {string} name - Concept name
   * @returns {number} Level (0 if unknown primitive)
   */
  getConceptLevel(name) {
    return this.conceptLevels.get(name) ?? 0;
  }

  /**
   * Add a fact and compute its level
   * @param {Object} fact - Fact object with id and metadata
   * @returns {number} Computed level
   */
  addFact(fact) {
    const factId = fact.id;
    const level = computeConstructivistLevel(fact, this.conceptLevels);

    // Store fact level
    this.factLevels.set(factId, level);
    this.maxLevel = Math.max(this.maxLevel, level);

    // Update level index
    if (!this.levelIndex.has(level)) {
      this.levelIndex.set(level, new Set());
      this.levelFacts.set(level, []);
    }
    this.levelIndex.get(level).add(factId);
    this.levelFacts.get(level).push(fact);

    // Register new concepts from this fact
    const deps = extractDependencies(fact);
    for (const dep of deps) {
      if (!this.conceptLevels.has(dep)) {
        // New concept inherits level from fact
        this.registerConcept(dep, level);
      }
    }

    // Mark bundles as dirty
    this._bundlesDirty = true;

    return level;
  }

  /**
   * Add a rule and compute its levels
   * @param {Object} rule - Rule object
   * @param {string|number} ruleId - Rule identifier
   */
  addRule(rule, ruleId) {
    const levels = computeRuleLevels(rule, this.conceptLevels);

    this.ruleLevels.set(ruleId, levels);

    // Index by conclusion level
    const concLevel = levels.conclusionLevel;
    if (!this.rulesByConclLevel.has(concLevel)) {
      this.rulesByConclLevel.set(concLevel, []);
    }
    this.rulesByConclLevel.get(concLevel).push(rule);

    // Cache levels on rule object
    rule._concLevel = concLevel;
    rule._maxPremLevel = levels.maxPremiseLevel;
  }

  /**
   * Get facts at a specific level
   * @param {number} level - Target level
   * @returns {Array} Facts at that level
   */
  getFactsAtLevel(level) {
    return this.levelFacts.get(level) || [];
  }

  /**
   * Get facts up to and including a level
   * @param {number} maxLevel - Maximum level (inclusive)
   * @returns {Array} Facts up to level
   */
  getFactsUpToLevel(maxLevel) {
    const facts = [];
    for (let l = 0; l <= maxLevel; l++) {
      const levelFacts = this.levelFacts.get(l);
      if (levelFacts) {
        facts.push(...levelFacts);
      }
    }
    return facts;
  }

  /**
   * Get fact IDs at a specific level
   * @param {number} level - Target level
   * @returns {Set<number>} Fact IDs at that level
   */
  getFactIdsAtLevel(level) {
    return this.levelIndex.get(level) || new Set();
  }

  /**
   * Get rules with conclusion at a specific level
   * @param {number} level - Target level
   * @returns {Array} Rules at that level
   */
  getRulesAtConclusionLevel(level) {
    return this.rulesByConclLevel.get(level) || [];
  }

  /**
   * Get rules that could prove a goal at given level
   * Rules where conclusion level = goalLevel and premise levels < goalLevel
   * @param {number} goalLevel - Target goal level
   * @returns {Array} Applicable rules
   */
  getRulesForGoalLevel(goalLevel) {
    const rules = this.rulesByConclLevel.get(goalLevel) || [];

    // Filter to rules where premises are at lower levels
    return rules.filter(rule => {
      const premLevel = rule._maxPremLevel ?? 0;
      return premLevel < goalLevel;
    });
  }

  /**
   * Check if a goal level is achievable (has facts/rules at that level)
   * @param {number} level - Goal level
   * @returns {boolean} True if achievable
   */
  isLevelAchievable(level) {
    if (level > this.maxLevel + 1) return false;
    if (level <= 0) return true;

    // Check if there are facts or rules at this level
    const facts = this.levelIndex.get(level);
    if (facts && facts.size > 0) return true;

    const rules = this.rulesByConclLevel.get(level);
    if (rules && rules.length > 0) return true;

    return false;
  }

  /**
   * Get level statistics
   * @returns {Object} Statistics by level
   */
  getStatistics() {
    const stats = {
      maxLevel: this.maxLevel,
      totalConcepts: this.conceptLevels.size,
      conceptsByLevel: new Map(),
      factsByLevel: new Map(),
      rulesByLevel: new Map()
    };

    // Count concepts by level
    for (const [name, level] of this.conceptLevels) {
      const count = stats.conceptsByLevel.get(level) || 0;
      stats.conceptsByLevel.set(level, count + 1);
    }

    // Count facts by level
    for (const [level, ids] of this.levelIndex) {
      stats.factsByLevel.set(level, ids.size);
    }

    // Count rules by conclusion level
    for (const [level, rules] of this.rulesByConclLevel) {
      stats.rulesByLevel.set(level, rules.length);
    }

    return stats;
  }

  /**
   * Rebuild indices from session (for initialization)
   */
  rebuildFromSession() {
    const session = this.session;
    if (!session) return;

    // Process all KB facts
    if (session.kbFacts) {
      for (let i = 0; i < session.kbFacts.length; i++) {
        const fact = session.kbFacts[i];
        if (!fact.id && fact.id !== 0) {
          fact.id = i;
        }
        this.addFact(fact);
      }
    }

    // Process all rules
    if (session.rules) {
      for (let i = 0; i < session.rules.length; i++) {
        const rule = session.rules[i];
        this.addRule(rule, rule.name || `rule_${i}`);
      }
    }
  }
}

export default {
  extractDependencies,
  computeConstructivistLevel,
  computeGoalLevel,
  computeRuleLevels,
  LevelManager
};

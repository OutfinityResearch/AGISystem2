/**
 * AGISystem2 - Component-based Knowledge Base
 * @module reasoning/component-kb
 *
 * Provides indexed storage of KB facts by components for efficient
 * HDC-native matching and fuzzy search.
 *
 * Key features:
 * - Index facts by operator, arguments, positions
 * - Support synonym expansion
 * - Enable similarity-based candidate generation
 * - Work with anonymous (nameless) vectors
 * - Constructivist level tracking for search optimization
 */

import { similarity, bundle } from '../core/operations.mjs';
import { getThresholds } from '../core/constants.mjs';
import { LevelManager, computeConstructivistLevel, computeGoalLevel } from './constructivist-level.mjs';

/**
 * Component-based Knowledge Base
 * Indexes facts for efficient HDC matching
 */
export class ComponentKB {
  constructor(session) {
    this.session = session;
    this.thresholds = getThresholds(session?.hdcStrategy || 'exact');

    // Primary storage
    this.facts = [];

    // Indices for fast lookup
    this.operatorIndex = new Map();  // operator_name -> [fact_ids]
    this.arg0Index = new Map();      // arg0_name -> [fact_ids]
    this.arg1Index = new Map();      // arg1_name -> [fact_ids]

    // Vector-based indices for anonymous concepts
    this.operatorVectors = new Map(); // operator_name -> vector
    this.argVectors = new Map();      // arg_name -> vector

    // Synonym mappings (bidirectional)
    this.synonyms = new Map();        // word -> Set of synonyms

    // Canonical representative mapping (directional)
    // alias -> canonical
    this.canonicalMap = new Map();

    // Constructivist level optimization
    this.levelManager = new LevelManager(session);
    this.useLevelOptimization = session?.useLevelOptimization ?? true;

    // Fast entity-domain enumeration (for witness search / quantified rules)
    this.atomDomain = new Set();
    this._entityDomainCache = [];
    this._entityDomainCacheSize = 0;

    // Level-segmented HDC bundles (lazy computed)
    this._levelBundles = new Map();      // level -> Vector
    this._cumulativeBundles = new Map(); // level -> Vector (0..level)
    this._bundlesDirty = true;
  }

  /**
   * Add a fact with component indexing
   * @param {Object} fact - Fact with vector and metadata
   */
  addFact(fact) {
    const id = this.facts.length;
    const meta = fact.metadata;

    if (!meta) {
      this.facts.push({ ...fact, id });
      return id;
    }

    const entry = {
      id,
      name: fact.name,
      vector: fact.vector,
      metadata: meta,
      operator: meta.operator,
      args: meta.args || [],
      // Store component vectors for HDC matching
      operatorVec: this.session?.resolve?.({ name: meta.operator, type: 'Identifier' }),
      argVecs: (meta.args || []).map(arg =>
        this.session?.resolve?.({ name: arg, type: 'Identifier' })
      )
    };

    this.facts.push(entry);

    // Compute and store constructivist level
    if (this.useLevelOptimization) {
      entry.constructivistLevel = this.levelManager.addFact(entry);
    }

    // Update entity domain cache from all args (not just arg0/arg1).
    if (meta.args) {
      const beforeSize = this.atomDomain.size;
      for (const a of meta.args) {
        if (typeof a !== 'string') continue;
        if (!a) continue;
        if (a.startsWith('__')) continue;
        this.atomDomain.add(a);
      }
      if (this.atomDomain.size !== beforeSize) {
        this._entityDomainCacheSize = -1;
      }
    }

    // Mark bundles as dirty
    this._bundlesDirty = true;

    // Index by operator
    if (meta.operator) {
      if (!this.operatorIndex.has(meta.operator)) {
        this.operatorIndex.set(meta.operator, []);
      }
      this.operatorIndex.get(meta.operator).push(id);

      // Store operator vector
      if (entry.operatorVec) {
        this.operatorVectors.set(meta.operator, entry.operatorVec);
      }
    }

    // Index by arguments
    if (meta.args) {
      if (meta.args[0]) {
        if (!this.arg0Index.has(meta.args[0])) {
          this.arg0Index.set(meta.args[0], []);
        }
        this.arg0Index.get(meta.args[0]).push(id);

        if (entry.argVecs[0]) {
          this.argVectors.set(meta.args[0], entry.argVecs[0]);
        }
      }

      if (meta.args[1]) {
        if (!this.arg1Index.has(meta.args[1])) {
          this.arg1Index.set(meta.args[1], []);
        }
        this.arg1Index.get(meta.args[1]).push(id);

        if (entry.argVecs[1]) {
          this.argVectors.set(meta.args[1], entry.argVecs[1]);
        }
      }
    }

    return id;
  }

  /**
   * Return a cached list of observed entity tokens (arguments across facts).
   * Used to ground unbound variables during witness search.
   * @returns {Array<string>}
   */
  getEntityDomain() {
    if (this._entityDomainCacheSize !== this.atomDomain.size) {
      this._entityDomainCache = [...this.atomDomain];
      this._entityDomainCacheSize = this.atomDomain.size;
    }
    return this._entityDomainCache;
  }

  /**
   * Register a synonym relationship
   * @param {string} word1 - First word
   * @param {string} word2 - Second word (synonym)
   */
  addSynonym(word1, word2) {
    // Bidirectional mapping
    if (!this.synonyms.has(word1)) {
      this.synonyms.set(word1, new Set());
    }
    if (!this.synonyms.has(word2)) {
      this.synonyms.set(word2, new Set());
    }

    this.synonyms.get(word1).add(word2);
    this.synonyms.get(word2).add(word1);
  }

  /**
   * Register a canonical representative mapping (directional).
   * Example: canonical Car Automobile  => canonicalizeName('Car') === 'Automobile'
   * @param {string} alias
   * @param {string} canonical
   */
  addCanonical(alias, canonical) {
    if (!alias || !canonical) return;
    this.canonicalMap.set(alias, canonical);
  }

  /**
   * Resolve canonical name by following canonicalMap chain.
   * @param {string} word
   * @returns {string}
   */
  resolveCanonical(word) {
    let current = word;
    const visited = new Set();
    while (this.canonicalMap.has(current)) {
      if (visited.has(current)) break;
      visited.add(current);
      current = this.canonicalMap.get(current);
    }
    return current;
  }

  /**
   * Get all synonyms for a word (including itself).
   * Uses transitive closure over the synonym graph (connected component).
   * @param {string} word - Word to expand
   * @returns {Set<string>} Set of equivalent words
   */
  expandSynonyms(word) {
    const visited = new Set();
    const queue = [word];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.synonyms.get(current);
      if (!neighbors) continue;

      for (const next of neighbors) {
        if (!visited.has(next)) queue.push(next);
      }
    }

    return visited;
  }

  /**
   * Deterministic canonical representative for a synonym component.
   * If no synonyms exist, returns the input.
   * @param {string} word
   * @returns {string}
   */
  canonicalizeName(word) {
    // Prefer explicit canonical representative if configured.
    if (this.canonicalMap.has(word)) {
      return this.resolveCanonical(word);
    }

    const set = this.expandSynonyms(word);
    if (!set || set.size === 0) return word;

    // If any synonym has an explicit canonical representative, use it.
    const canonicalCandidates = new Set();
    for (const s of set) {
      if (this.canonicalMap.has(s)) {
        canonicalCandidates.add(this.resolveCanonical(s));
      }
    }
    if (canonicalCandidates.size === 1) {
      return [...canonicalCandidates][0];
    }
    if (canonicalCandidates.size > 1) {
      // Deterministic tie-break if theory provided conflicting canonicals.
      return [...canonicalCandidates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
    }

    // Deterministic, stable fallback: lexicographically smallest token in component.
    return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
  }

  /**
   * Find facts by operator (with synonym expansion)
   * @param {string} operator - Operator name
   * @param {boolean} expandSyn - Expand synonyms (default true)
   * @returns {Array} Matching fact entries
   */
  findByOperator(operator, expandSyn = true) {
    const operators = expandSyn ? this.expandSynonyms(operator) : new Set([operator]);
    const results = [];

    for (const op of operators) {
      const ids = this.operatorIndex.get(op) || [];
      for (const id of ids) {
        results.push(this.facts[id]);
      }
    }

    return results;
  }

  /**
   * Count facts by operator (with optional synonym expansion).
   * @param {string} operator
   * @param {boolean} expandSyn
   * @returns {number}
   */
  countByOperator(operator, expandSyn = true) {
    const operators = expandSyn ? this.expandSynonyms(operator) : new Set([operator]);
    let count = 0;
    for (const op of operators) {
      count += (this.operatorIndex.get(op) || []).length;
    }
    return count;
  }

  /**
   * Find facts by first argument (with synonym expansion)
   * @param {string} arg - Argument name
   * @param {boolean} expandSyn - Expand synonyms (default true)
   * @returns {Array} Matching fact entries
   */
  findByArg0(arg, expandSyn = true) {
    const args = expandSyn ? this.expandSynonyms(arg) : new Set([arg]);
    const results = [];

    for (const a of args) {
      const ids = this.arg0Index.get(a) || [];
      for (const id of ids) {
        results.push(this.facts[id]);
      }
    }

    return results;
  }

  /**
   * Count facts by arg0 (with optional synonym expansion).
   * @param {string} arg
   * @param {boolean} expandSyn
   * @returns {number}
   */
  countByArg0(arg, expandSyn = true) {
    const args = expandSyn ? this.expandSynonyms(arg) : new Set([arg]);
    let count = 0;
    for (const a of args) {
      count += (this.arg0Index.get(a) || []).length;
    }
    return count;
  }

  /**
   * Find facts by second argument (with synonym expansion)
   * @param {string} arg - Argument name
   * @param {boolean} expandSyn - Expand synonyms (default true)
   * @returns {Array} Matching fact entries
   */
  findByArg1(arg, expandSyn = true) {
    const args = expandSyn ? this.expandSynonyms(arg) : new Set([arg]);
    const results = [];

    for (const a of args) {
      const ids = this.arg1Index.get(a) || [];
      for (const id of ids) {
        results.push(this.facts[id]);
      }
    }

    return results;
  }

  /**
   * Count facts by arg1 (with optional synonym expansion).
   * @param {string} arg
   * @param {boolean} expandSyn
   * @returns {number}
   */
  countByArg1(arg, expandSyn = true) {
    const args = expandSyn ? this.expandSynonyms(arg) : new Set([arg]);
    let count = 0;
    for (const a of args) {
      count += (this.arg1Index.get(a) || []).length;
    }
    return count;
  }

  /**
   * Find facts matching operator AND arg0 (with synonyms)
   * @param {string} operator - Operator name
   * @param {string} arg0 - First argument
   * @returns {Array} Matching fact entries
   */
  findByOperatorAndArg0(operator, arg0) {
    const opFacts = new Set(this.findByOperator(operator).map(f => f.id));
    const argFacts = this.findByArg0(arg0);

    return argFacts.filter(f => opFacts.has(f.id));
  }

  /**
   * Count facts matching operator AND arg0 (with optional synonym expansion).
   * @param {string} operator
   * @param {string} arg0
   * @param {boolean} expandSyn
   * @returns {number}
   */
  countByOperatorAndArg0(operator, arg0, expandSyn = true) {
    const operators = expandSyn ? this.expandSynonyms(operator) : new Set([operator]);
    const args0 = expandSyn ? this.expandSynonyms(arg0) : new Set([arg0]);

    const opIds = [];
    for (const op of operators) opIds.push(...(this.operatorIndex.get(op) || []));
    if (opIds.length === 0) return 0;

    const argIds = [];
    for (const a0 of args0) argIds.push(...(this.arg0Index.get(a0) || []));
    if (argIds.length === 0) return 0;

    if (opIds.length <= argIds.length) {
      const set = new Set(opIds);
      let count = 0;
      for (const id of argIds) if (set.has(id)) count++;
      return count;
    }

    const set = new Set(argIds);
    let count = 0;
    for (const id of opIds) if (set.has(id)) count++;
    return count;
  }

  /**
   * Find facts matching operator AND arg1 (with synonyms)
   * @param {string} operator - Operator name
   * @param {string} arg1 - Second argument
   * @returns {Array} Matching fact entries
   */
  findByOperatorAndArg1(operator, arg1) {
    const opFacts = new Set(this.findByOperator(operator).map(f => f.id));
    const argFacts = this.findByArg1(arg1);

    return argFacts.filter(f => opFacts.has(f.id));
  }

  /**
   * Find similar vectors using HDC similarity
   * @param {Object} queryVec - Query vector
   * @param {number} topK - Number of results
   * @param {number} minSim - Minimum similarity threshold
   * @returns {Array} Similar facts with scores
   */
  findSimilar(queryVec, topK = 5, minSim = 0.1) {
    if (!queryVec) return [];

    const results = [];

    for (const fact of this.facts) {
      if (!fact.vector) continue;

      if (this.session?.reasoningStats) this.session.reasoningStats.similarityChecks++;
      const sim = similarity(queryVec, fact.vector);
      if (sim >= minSim) {
        results.push({
          fact,
          similarity: sim
        });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, topK);
  }

  /**
   * Find concepts similar to a given concept
   * Uses component vectors for comparison
   * @param {string} conceptName - Concept to find similar to
   * @param {number} topK - Number of results
   * @returns {Array} Similar concepts with scores
   */
  findSimilarConcepts(conceptName, topK = 5) {
    const queryVec = this.argVectors.get(conceptName);
    if (!queryVec) return [];

    const results = [];
    const seen = new Set([conceptName]);

    // Compare with all known concept vectors
    for (const [name, vec] of this.argVectors) {
      if (seen.has(name)) continue;
      seen.add(name);

      if (this.session?.reasoningStats) this.session.reasoningStats.similarityChecks++;
      const sim = similarity(queryVec, vec);
      if (sim > 0) {
        results.push({ name, similarity: sim });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, topK);
  }

  /**
   * Check if fact matches query with synonym expansion
   * @param {Object} fact - Fact entry
   * @param {string} operator - Expected operator (or null for any)
   * @param {string} arg0 - Expected arg0 (or null for any)
   * @param {string} arg1 - Expected arg1 (or null for any)
   * @returns {boolean} True if matches
   */
  matchesWithSynonyms(fact, operator, arg0, arg1) {
    if (operator) {
      const ops = this.expandSynonyms(operator);
      if (!ops.has(fact.operator)) return false;
    }

    if (arg0) {
      const args = this.expandSynonyms(arg0);
      if (!args.has(fact.args[0])) return false;
    }

    if (arg1) {
      const args = this.expandSynonyms(arg1);
      if (!args.has(fact.args[1])) return false;
    }

    return true;
  }

  /**
   * Build from existing kbFacts array
   * @param {Array} kbFacts - Array of KB facts
   */
  buildFromKBFacts(kbFacts) {
    for (const fact of kbFacts) {
      // Check if it's a synonym declaration
      if (fact.metadata?.operator === 'synonym' && fact.metadata?.args?.length === 2) {
        this.addSynonym(fact.metadata.args[0], fact.metadata.args[1]);
      }

      this.addFact(fact);
    }
  }

  /**
   * Get statistics
   * @returns {Object} Stats
   */
  getStats() {
    const levelStats = this.levelManager.getStatistics();
    return {
      totalFacts: this.facts.length,
      operators: this.operatorIndex.size,
      arg0Values: this.arg0Index.size,
      arg1Values: this.arg1Index.size,
      synonymPairs: this.synonyms.size,
      vectorizedConcepts: this.argVectors.size,
      maxConstructivistLevel: levelStats.maxLevel,
      conceptsByLevel: levelStats.conceptsByLevel,
      factsByLevel: levelStats.factsByLevel
    };
  }

  // ============================================
  // Constructivist Level Optimization Methods
  // ============================================

  /**
   * Get constructivist level of a concept
   * @param {string} name - Concept name
   * @returns {number} Level (0 if primitive)
   */
  getConceptLevel(name) {
    return this.levelManager.getConceptLevel(name);
  }

  /**
   * Get facts at a specific constructivist level
   * @param {number} level - Target level
   * @returns {Array} Facts at that level
   */
  getFactsAtLevel(level) {
    return this.levelManager.getFactsAtLevel(level);
  }

  /**
   * Get facts up to and including a level
   * @param {number} maxLevel - Maximum level (inclusive)
   * @returns {Array} Facts up to level
   */
  getFactsUpToLevel(maxLevel) {
    return this.levelManager.getFactsUpToLevel(maxLevel);
  }

  /**
   * Find facts by operator constrained to a level range
   * @param {string} operator - Operator name
   * @param {number} maxLevel - Maximum level to search
   * @returns {Array} Matching facts
   */
  findByOperatorAtLevel(operator, maxLevel) {
    const allMatches = this.findByOperator(operator);
    if (!this.useLevelOptimization) return allMatches;

    return allMatches.filter(fact => {
      const level = fact.constructivistLevel ?? this.levelManager.factLevels.get(fact.id) ?? 0;
      return level <= maxLevel;
    });
  }

  /**
   * Compute goal level for search optimization
   * @param {Object|string} goal - Goal AST or string
   * @returns {number} Estimated goal level
   */
  computeGoalLevel(goal) {
    return computeGoalLevel(goal, this.levelManager.conceptLevels);
  }

  /**
   * Get or compute level-segmented KB bundle
   * @param {number} level - Target level
   * @returns {Object} Vector bundle for facts at this level
   */
  getLevelBundle(level) {
    this._ensureBundlesComputed();
    return this._levelBundles.get(level);
  }

  /**
   * Get cumulative bundle for levels 0..maxLevel
   * @param {number} maxLevel - Maximum level (inclusive)
   * @returns {Object} Cumulative vector bundle
   */
  getCumulativeBundle(maxLevel) {
    this._ensureBundlesComputed();

    // Check cache
    if (this._cumulativeBundles.has(maxLevel)) {
      return this._cumulativeBundles.get(maxLevel);
    }

    // Compute cumulative bundle
    const vectors = [];
    for (let l = 0; l <= maxLevel; l++) {
      const levelBundle = this._levelBundles.get(l);
      if (levelBundle) {
        vectors.push(levelBundle);
      }
    }

    if (vectors.length === 0) return null;

    const cumBundle = bundle(vectors);
    this._cumulativeBundles.set(maxLevel, cumBundle);
    return cumBundle;
  }

  /**
   * Ensure level bundles are computed
   */
  _ensureBundlesComputed() {
    if (!this._bundlesDirty) return;

    this._levelBundles.clear();
    this._cumulativeBundles.clear();

    // Group facts by level
    const factsByLevel = new Map();
    for (const fact of this.facts) {
      if (!fact.vector) continue;
      const level = fact.constructivistLevel ?? 0;
      if (!factsByLevel.has(level)) {
        factsByLevel.set(level, []);
      }
      factsByLevel.get(level).push(fact.vector);
    }

    // Create bundle per level
    for (const [level, vectors] of factsByLevel) {
      if (vectors.length > 0) {
        this._levelBundles.set(level, bundle(vectors));
      }
    }

    this._bundlesDirty = false;
  }

  /**
   * Get maximum constructivist level in KB
   * @returns {number} Max level
   */
  getMaxLevel() {
    return this.levelManager.maxLevel;
  }

  /**
   * Check if proving a goal at given level is potentially possible
   * @param {number} level - Goal level
   * @returns {boolean} True if potentially achievable
   */
  isLevelAchievable(level) {
    return this.levelManager.isLevelAchievable(level);
  }

  /**
   * Get level statistics
   * @returns {Object} Level statistics
   */
  getLevelStatistics() {
    return this.levelManager.getStatistics();
  }
}

export default ComponentKB;

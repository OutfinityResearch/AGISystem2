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
 */

import { similarity } from '../core/operations.mjs';
import { getThresholds } from '../core/constants.mjs';

/**
 * Component-based Knowledge Base
 * Indexes facts for efficient HDC matching
 */
export class ComponentKB {
  constructor(session) {
    this.session = session;
    this.thresholds = getThresholds(session?.hdcStrategy || 'dense-binary');

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
   * Get all synonyms for a word (including itself)
   * @param {string} word - Word to expand
   * @returns {Set<string>} Set of equivalent words
   */
  expandSynonyms(word) {
    const result = new Set([word]);

    if (this.synonyms.has(word)) {
      for (const syn of this.synonyms.get(word)) {
        result.add(syn);
      }
    }

    return result;
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
    return {
      totalFacts: this.facts.length,
      operators: this.operatorIndex.size,
      arg0Values: this.arg0Index.size,
      arg1Values: this.arg1Index.size,
      synonymPairs: this.synonyms.size,
      vectorizedConcepts: this.argVectors.size
    };
  }
}

export default ComponentKB;

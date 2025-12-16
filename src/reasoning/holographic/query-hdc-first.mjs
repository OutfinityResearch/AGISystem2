/**
 * AGISystem2 - Holographic Query Engine (HDC-First)
 * @module reasoning/holographic/query-hdc-first
 *
 * HDC-first query implementation:
 * 1. Use HDC unbind to extract candidate answers
 * 2. Validate candidates with symbolic proof
 * 3. Fall back to symbolic query if no HDC results validate
 *
 * Same interface as QueryEngine - drop-in replacement.
 */

import { bind, unbind, similarity, topKSimilar } from '../../core/operations.mjs';
import { withPosition } from '../../core/position.mjs';
import { MAX_HOLES, getHolographicThresholds, getThresholds } from '../../core/constants.mjs';
import { QueryEngine } from '../query.mjs';
import { ProofEngine } from '../prove.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[HoloQuery:${category}]`, ...args);
}

/**
 * Holographic Query Engine - HDC unbind with symbolic validation
 */
export class HolographicQueryEngine {
  /**
   * Create holographic query engine
   * @param {Session} session - Parent session
   */
  constructor(session) {
    this.session = session;
    this.symbolicEngine = new QueryEngine(session);

    // Get strategy-dependent thresholds
    const strategy = session?.hdcStrategy || 'dense-binary';
    this.config = getHolographicThresholds(strategy);
    this.thresholds = getThresholds(strategy);

    dbg('INIT', `Strategy: ${strategy}, MinSim: ${this.config.UNBIND_MIN_SIMILARITY}`);
  }

  /**
   * Execute query using HDC-first approach
   * @param {Statement} statement - Query statement with holes
   * @returns {QueryResult} Same interface as QueryEngine
   */
  execute(statement) {
    // Track holographic stats
    this.session.reasoningStats.holographicQueries =
      (this.session.reasoningStats.holographicQueries || 0) + 1;

    // Step 1: Parse query - identify holes and knowns
    const holes = [];
    const knowns = [];
    const operator = this.session.resolve(statement.operator);
    const operatorName = statement.operator?.name || statement.operator?.value;

    for (let i = 0; i < statement.args.length; i++) {
      const arg = statement.args[i];
      if (arg.type === 'Hole') {
        holes.push({ index: i + 1, name: arg.name });
      } else {
        knowns.push({
          index: i + 1,
          name: arg.name || arg.value,
          vector: this.session.resolve(arg)
        });
      }
    }

    // Direct match (no holes) - use symbolic
    if (holes.length === 0) {
      return this.symbolicEngine.execute(statement);
    }

    // Too many holes - fail
    if (holes.length > MAX_HOLES) {
      return {
        success: false,
        reason: `Too many holes (max ${MAX_HOLES})`,
        bindings: new Map(),
        allResults: []
      };
    }

    // Step 2: HDC unbind to find candidates
    dbg('UNBIND', `Starting HDC unbind for ${operatorName} with ${holes.length} holes`);
    const candidates = this.hdcUnbindCandidates(operator, operatorName, knowns, holes);
    dbg('UNBIND', `Found ${candidates.length} candidate combinations`);

    this.session.reasoningStats.hdcUnbindAttempts =
      (this.session.reasoningStats.hdcUnbindAttempts || 0) + 1;

    if (candidates.length > 0) {
      this.session.reasoningStats.hdcUnbindSuccesses =
        (this.session.reasoningStats.hdcUnbindSuccesses || 0) + 1;
    }

    // Step 3: Validate candidates with symbolic proof
    const validatedResults = [];
    for (const candidate of candidates) {
      this.session.reasoningStats.hdcValidationAttempts =
        (this.session.reasoningStats.hdcValidationAttempts || 0) + 1;

      const isValid = this.validateCandidate(operatorName, knowns, holes, candidate);

      if (isValid) {
        this.session.reasoningStats.hdcValidationSuccesses =
          (this.session.reasoningStats.hdcValidationSuccesses || 0) + 1;

        // Build bindings map matching QueryEngine format
        const bindings = new Map();
        for (const [holeName, value] of Object.entries(candidate.bindings)) {
          bindings.set(holeName, {
            answer: value.name,
            similarity: value.similarity,
            method: 'hdc_validated'
          });
        }

        validatedResults.push({
          bindings,
          score: candidate.combinedScore,
          method: 'hdc_validated'
        });

        dbg('VALID', `Validated: ${JSON.stringify(candidate.bindings)}`);
      }
    }

    dbg('RESULTS', `${validatedResults.length} validated results`);

    // Step 4: Fallback to symbolic if no validated results
    if (validatedResults.length === 0 && this.config.FALLBACK_TO_SYMBOLIC) {
      dbg('FALLBACK', 'No HDC results validated, falling back to symbolic');
      this.session.reasoningStats.symbolicFallbacks =
        (this.session.reasoningStats.symbolicFallbacks || 0) + 1;

      const symbolicResult = this.symbolicEngine.execute(statement);
      // Mark as fallback
      if (symbolicResult.allResults) {
        for (const r of symbolicResult.allResults) {
          r.method = r.method || 'symbolic_fallback';
        }
      }
      return symbolicResult;
    }

    // Build final result matching QueryEngine interface
    const bindings = validatedResults.length > 0 ? validatedResults[0].bindings : new Map();
    const confidence = validatedResults.length > 0 ? validatedResults[0].score : 0;

    return {
      success: validatedResults.length > 0,
      bindings,
      confidence,
      ambiguous: validatedResults.length > 1,
      allResults: validatedResults
    };
  }

  /**
   * Find candidates via HDC unbind
   * @private
   */
  hdcUnbindCandidates(operator, operatorName, knowns, holes) {
    // Build partial query vector (without holes)
    let queryPartial = operator;
    for (const known of knowns) {
      const posVec = this.session.getPositionVector(known.index);
      queryPartial = bind(queryPartial, bind(posVec, known.vector));
    }

    // Get KB bundle for unbind
    const kbBundle = this.session.getKBBundle?.() || this.bundleKBFacts();

    if (!kbBundle) {
      dbg('UNBIND', 'No KB bundle available');
      return [];
    }

    // For each hole, unbind from KB and find candidates
    const holeCandidates = new Map();

    for (const hole of holes) {
      const posVec = this.session.getPositionVector(hole.index);

      // Unbind: candidate = KB ⊕ queryPartial ⊕ position⁻¹
      // This extracts what's at the hole position
      const unboundVec = unbind(unbind(kbBundle, queryPartial), posVec);

      // Find top-K similar in vocabulary
      const vocabulary = this.getVocabulary();
      const topK = [];

      for (const [name, vec] of vocabulary) {
        const sim = similarity(unboundVec, vec);
        if (sim >= this.config.UNBIND_MIN_SIMILARITY) {
          topK.push({ name, similarity: sim });
        }
      }

      // Sort by similarity and take top candidates
      topK.sort((a, b) => b.similarity - a.similarity);
      const candidates = topK.slice(0, this.config.UNBIND_MAX_CANDIDATES);

      holeCandidates.set(hole.name, candidates);
      dbg('UNBIND', `Hole ?${hole.name}: ${candidates.length} candidates`);
    }

    // Combine candidates for all holes
    return this.combineCandidates(holes, holeCandidates);
  }

  /**
   * Bundle KB facts into a single vector
   * @private
   */
  bundleKBFacts() {
    if (this.session.kbFacts && this.session.kbFacts.length > 0) {
      // Use session's bundle if available
      const vectors = this.session.kbFacts
        .filter(f => f.vector)
        .map(f => f.vector);

      if (vectors.length > 0) {
        const { bundle } = require('../../core/operations.mjs');
        return bundle(vectors);
      }
    }
    return null;
  }

  /**
   * Get vocabulary (all known entity vectors)
   * @private
   */
  getVocabulary() {
    const vocab = new Map();

    // From session atoms
    if (this.session.atoms) {
      for (const [name, vec] of this.session.atoms) {
        if (!name.startsWith('__') && !name.startsWith('Pos')) {
          vocab.set(name, vec);
        }
      }
    }

    // From KB fact metadata
    if (this.session.kbFacts) {
      for (const fact of this.session.kbFacts) {
        if (fact.metadata?.args) {
          for (const arg of fact.metadata.args) {
            if (typeof arg === 'string' && !vocab.has(arg)) {
              const vec = this.session.resolve({ name: arg, type: 'Identifier' });
              if (vec) {
                vocab.set(arg, vec);
              }
            }
          }
        }
      }
    }

    return vocab;
  }

  /**
   * Combine candidates across holes into complete bindings
   * @private
   */
  combineCandidates(holes, holeCandidates) {
    if (holes.length === 0) return [];

    // For single hole, just map candidates
    if (holes.length === 1) {
      const holeName = holes[0].name;
      const candidates = holeCandidates.get(holeName) || [];
      return candidates.map(c => ({
        bindings: { [holeName]: c },
        combinedScore: c.similarity
      }));
    }

    // For multiple holes, compute cartesian product (limited)
    const result = [];
    const maxCombinations = 50; // Limit explosion

    const holeNames = holes.map(h => h.name);
    const candidateArrays = holeNames.map(n => holeCandidates.get(n) || []);

    // Recursive combination
    const combine = (index, current, score) => {
      if (result.length >= maxCombinations) return;

      if (index === holeNames.length) {
        result.push({
          bindings: { ...current },
          combinedScore: score / holeNames.length
        });
        return;
      }

      const holeName = holeNames[index];
      const candidates = candidateArrays[index];

      for (const c of candidates.slice(0, 5)) { // Limit per hole
        current[holeName] = c;
        combine(index + 1, current, score + c.similarity);
      }
    };

    combine(0, {}, 0);
    return result;
  }

  /**
   * Validate candidate with symbolic proof
   * @private
   */
  validateCandidate(operatorName, knowns, holes, candidate) {
    // Build complete statement with candidate values
    const args = [];

    // Place knowns and candidates in correct positions
    const maxPos = Math.max(
      ...knowns.map(k => k.index),
      ...holes.map(h => h.index)
    );

    for (let i = 1; i <= maxPos; i++) {
      const known = knowns.find(k => k.index === i);
      if (known) {
        args.push(known.name);
      } else {
        const hole = holes.find(h => h.index === i);
        if (hole && candidate.bindings[hole.name]) {
          args.push(candidate.bindings[hole.name].name);
        } else {
          return false; // Missing value
        }
      }
    }

    // Build statement string for proof
    const statementStr = `${operatorName} ${args.join(' ')}`;
    dbg('VALIDATE', `Checking: ${statementStr}`);

    try {
      // Use symbolic prove to validate
      const proofEngine = new ProofEngine(this.session);
      const statement = this.parseStatement(operatorName, args);
      const result = proofEngine.prove(statement);

      return result.valid;
    } catch (e) {
      dbg('VALIDATE', `Error: ${e.message}`);
      return false;
    }
  }

  /**
   * Parse statement for proof
   * @private
   */
  parseStatement(operatorName, args) {
    return {
      type: 'Statement',
      operator: { type: 'Identifier', name: operatorName, value: operatorName },
      args: args.map(a => ({ type: 'Identifier', name: a, value: a })),
      toString: () => `${operatorName} ${args.join(' ')}`
    };
  }
}

export default HolographicQueryEngine;

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

import { bind, unbind, bundle, similarity, topKSimilar } from '../../core/operations.mjs';
import { withPosition, getPositionVector } from '../../core/position.mjs';
import { MAX_HOLES, getHolographicThresholds, getThresholds } from '../../core/constants.mjs';
import { QueryEngine, METHOD_PRIORITY } from '../query.mjs';
import { sameBindings } from '../query-kb.mjs';
import { ProofEngine } from '../prove.mjs';
import { buildProofObject } from '../proof-schema.mjs';
import { validateProof } from '../proof-validator.mjs';
import { debug_trace } from '../../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[HoloQuery:${category}]`, ...args);
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
    // Validation depth needs to cover long transitive chains (e.g., deep taxonomies).
    // Keep it bounded for performance, but avoid truncating correct answers.
    this.validatorEngine = new ProofEngine(session, { timeout: 500, maxDepth: 12 });

    // Get strategy-dependent thresholds
    const strategy = session?.hdcStrategy || 'dense-binary';
    this.config = getHolographicThresholds(strategy);
    this.thresholds = getThresholds(strategy);

    // Cache: vocabulary view for topKSimilar
    // Avoid rebuilding / rescanning KB for every query in holographicPriority mode.
    this._vocabCache = null;
    this._vocabCacheAtomCount = -1;

    dbg('INIT', `Strategy: ${strategy}, MinSim: ${this.config.UNBIND_MIN_SIMILARITY}`);
  }

  /**
   * Execute query using HDC-first approach
   * @param {Statement} statement - Query statement with holes
   * @param {Object} options - Query options
   * @returns {QueryResult} Same interface as QueryEngine
   */
  execute(statement, options = {}) {
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
      return this.symbolicEngine.execute(statement, options);
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

    const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, options.maxResults) : null;

    // Step 3: Validate candidates with symbolic proof
    const validatedResults = [];
    for (const candidate of candidates) {
      this.session.reasoningStats.hdcValidationAttempts =
        (this.session.reasoningStats.hdcValidationAttempts || 0) + 1;

      const validation = this.validateCandidate(operatorName, knowns, holes, candidate);

      if (validation.valid) {
        this.session.reasoningStats.hdcValidationSuccesses =
          (this.session.reasoningStats.hdcValidationSuccesses || 0) + 1;

        // Build bindings map matching QueryEngine format
        const bindings = new Map();
        for (const [holeName, value] of Object.entries(candidate.bindings)) {
          bindings.set(holeName, {
            answer: value.name,
            similarity: value.similarity,
            method: 'hdc_validated',
            steps: validation.steps || []
          });
        }

        validatedResults.push({
          bindings,
          score: candidate.combinedScore,
          method: 'hdc_validated'
        });

        dbg('VALID', `Validated: ${JSON.stringify(candidate.bindings)}`);
      }

      if (maxResults !== null && validatedResults.length >= maxResults) {
        break;
      }
    }

    dbg('RESULTS', `${validatedResults.length} validated results`);

    if (validatedResults.length > 0) {
      this.session.reasoningStats.holographicQueryHdcSuccesses =
        (this.session.reasoningStats.holographicQueryHdcSuccesses || 0) + 1;
    }

    // Step 4: Always merge with symbolic results for completeness
    // HDC may miss some results due to KB noise, so we supplement with symbolic
    if (this.config.FALLBACK_TO_SYMBOLIC) {
      const symbolicResult = this.symbolicEngine.execute(statement, options);

      if (symbolicResult.allResults && symbolicResult.allResults.length > 0) {
        const hasSteps = (result) => {
          if (result?.bindings instanceof Map) {
            for (const [, value] of result.bindings) {
              if (value?.steps && value.steps.length > 0) return true;
            }
          } else if (result?.bindings && typeof result.bindings === 'object') {
            for (const value of Object.values(result.bindings)) {
              if (value?.steps && value.steps.length > 0) return true;
            }
          }
          return false;
        };

        // Add symbolic results that weren't found by HDC, or replace HDC duplicates
        for (const r of symbolicResult.allResults) {
          const existingIdx = validatedResults.findIndex(existing =>
            sameBindings(existing.bindings, r.bindings, holes)
          );
          if (existingIdx >= 0) {
            const existing = validatedResults[existingIdx];
            if ((existing.method || '').startsWith('hdc') || (!hasSteps(existing) && hasSteps(r))) {
              validatedResults[existingIdx] = r;
            }
          } else {
            r.method = r.method || 'symbolic_supplement';
            validatedResults.push(r);
          }
        }

        dbg('MERGE', `Merged ${validatedResults.length} results (HDC + symbolic)`);
      }
    }

    // Match QueryEngine ordering + maxResults behavior.
    validatedResults.sort((a, b) => {
      const pa = METHOD_PRIORITY[a.method] || 0;
      const pb = METHOD_PRIORITY[b.method] || 0;
      if (pa !== pb) return pb - pa;
      return (b.score || 0) - (a.score || 0);
    });

    const finalResults = maxResults !== null ? validatedResults.slice(0, maxResults) : validatedResults;

    // Build final result matching QueryEngine interface
    const bindings = finalResults.length > 0 ? finalResults[0].bindings : new Map();
    const confidence = finalResults.length > 0 ? finalResults[0].score : 0;

    return {
      success: finalResults.length > 0,
      bindings,
      confidence,
      ambiguous: finalResults.length > 1,
      allResults: finalResults
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
      const posVec = getPositionVector(known.index, this.session.geometry, this.session.hdcStrategy);
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
      const posVec = getPositionVector(hole.index, this.session.geometry, this.session.hdcStrategy);

      // Unbind: candidate = KB ⊕ queryPartial ⊕ position⁻¹
      // This extracts what's at the hole position
      const unboundVec = unbind(unbind(kbBundle, queryPartial), posVec);

      // Find top-K similar in vocabulary (strategy-level topKSimilar)
      const vocabulary = this.getVocabulary();
      const rawTop = topKSimilar(
        unboundVec,
        vocabulary,
        this.config.UNBIND_MAX_CANDIDATES * 3,
        this.session
      );
      const candidates = rawTop
        .filter(c => c.similarity >= this.config.UNBIND_MIN_SIMILARITY)
        .slice(0, this.config.UNBIND_MAX_CANDIDATES);

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
    // Fallback: bundle KB facts manually (exact)
    if (this.session.kbFacts && this.session.kbFacts.length > 0) {
      const vectors = this.session.kbFacts
        .filter(f => f.vector)
        .map(f => f.vector);

      if (vectors.length > 0) {
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
    const atomCount = this.session.vocabulary?.atoms?.size ?? 0;
    if (this._vocabCache && this._vocabCacheAtomCount === atomCount) {
      return this._vocabCache;
    }

    const vocab = new Map();
    const atoms = this.session.vocabulary?.atoms;
    if (atoms) {
      for (const [name, vec] of atoms) {
        if (typeof name !== 'string') continue;
        if (name.startsWith('__') || name.startsWith('Pos')) continue;
        vocab.set(name, vec);
      }
    }

    this._vocabCache = vocab;
    this._vocabCacheAtomCount = atomCount;
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
      // Fast path: exact fact exists in KB (no need for full proof search)
      if (this.hasDirectFact(operatorName, args)) {
        return { valid: true, steps: [statementStr] };
      }

      // Use symbolic prove to validate
      const statement = this.parseStatement(operatorName, args);
      const result = this.validatorEngine.prove(statement);

      if (!result.valid) return { valid: false };

      // In theory-driven mode, require the proof to be machine-checkable.
      if (this.session?.proofValidationEnabled) {
        const proofObject = buildProofObject({ session: this.session, goalStatement: statement, result });
        const ok = validateProof(proofObject, this.session);
        return ok ? { valid: true, steps: this.extractProofFacts(result.steps) } : { valid: false };
      }

      return { valid: true, steps: this.extractProofFacts(result.steps) };
    } catch (e) {
      dbg('VALIDATE', `Error: ${e.message}`);
      return { valid: false };
    }
  }

  hasDirectFact(operatorName, args) {
    if (!operatorName || !Array.isArray(args) || args.length === 0) return false;
    const componentKB = this.session?.componentKB;
    if (!componentKB?.findByOperatorAndArg0) return false;
    const candidates = componentKB.findByOperatorAndArg0(operatorName, args[0]);
    for (const fact of candidates || []) {
      if (!fact || fact.operator !== operatorName) continue;
      if (!Array.isArray(fact.args) || fact.args.length !== args.length) continue;
      let ok = true;
      for (let i = 0; i < args.length; i++) {
        if (fact.args[i] !== args[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
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

  extractProofFacts(steps = []) {
    const facts = [];
    for (const step of steps) {
      if (step?.fact && typeof step.fact === 'string') {
        facts.push(step.fact);
        continue;
      }
      if (step?.operation === 'and_satisfied' && typeof step.detail === 'string') {
        const parts = step.detail.split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          facts.push(part);
        }
      }
    }
    return facts;
  }
}

export default HolographicQueryEngine;

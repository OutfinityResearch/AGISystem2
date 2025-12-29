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
import { isValidEntity } from '../query-hdc.mjs';
import { isTransitiveRelation } from '../query-transitive.mjs';
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

  trackOp(name, delta = 1) {
    const n = Number(delta || 0);
    if (!Number.isFinite(n) || n === 0) return;
    if (!this.session?.reasoningStats?.operations) return;
    this.session.reasoningStats.operations[name] = (this.session.reasoningStats.operations[name] || 0) + n;
  }

  isGraphOperator(operatorName) {
    if (!operatorName) return false;
    return !!(this.session?.graphs?.has?.(operatorName) || this.session?.graphAliases?.has?.(operatorName));
  }

  classifyQuery(operatorName, holes, knowns) {
    // Keep this coarse on purpose: it is used to decide which fast paths are safe.
    const HDC_BYPASS_OPERATORS = new Set([
      'abduce',
      'whatif',
      'explain',
      'deduce',
      'induce',
      'bundle',
      'difference',
      'analogy',
      'similar',
      'verifyPlan'
    ]);

    if (HDC_BYPASS_OPERATORS.has(operatorName)) {
      return { kind: 'meta', symbolicOnly: true, hdcUnbindAllowed: false, indexFastPathAllowed: false };
    }

    // Quantifiers are higher-order; HDC unbind candidate extraction is not meaningful.
    if (operatorName === 'Exists' || operatorName === 'ForAll') {
      return { kind: 'quantifier', symbolicOnly: true, hdcUnbindAllowed: false, indexFastPathAllowed: false };
    }

    if (isTransitiveRelation(operatorName, this.session)) {
      // Transitive closure is derived reasoning; HDC unbind only sees explicit edges.
      return { kind: 'transitive', symbolicOnly: true, hdcUnbindAllowed: false, indexFastPathAllowed: false };
    }

    // Graph operators wrap inner DS07a records (bind(op, innerRecord)) and therefore do not follow
    // the flat record encoding assumed by the Master Equation unbind path.
    const isGraph = this.isGraphOperator(operatorName);

    const isAssignment = this.session?.semanticIndex?.isAssignmentRelation
      ? this.session.semanticIndex.isAssignmentRelation(operatorName)
      : false;

    const isInheritable = this.session?.semanticIndex?.isInheritableProperty
      ? this.session.semanticIndex.isInheritableProperty(operatorName)
      : false;

    const isSpecialDerived = operatorName === 'elementOf';

    // Rule-derived operators: if there are rules concluding this operator, symbolic may return results
    // that are not explicit facts and are therefore not retrievable by unbind alone.
    const ruleOps = this.getRuleConclusionOperators();
    const isRuleDerived = ruleOps.has(operatorName);

    if (isInheritable || isSpecialDerived || isRuleDerived) {
      return {
        kind: 'derived',
        symbolicOnly: false,
        hdcUnbindAllowed: !isGraph,
        indexFastPathAllowed: false
      };
    }

    // Fact-retrieval pattern: 1 hole, direct membership query.
    // For these, we can use ComponentKB to answer without proof search or HDC similarity.
    if (holes.length === 1) {
      return {
        kind: isGraph ? 'graph_fact' : (isAssignment ? 'assignment_fact' : 'fact'),
        symbolicOnly: false,
        hdcUnbindAllowed: !isGraph,
        indexFastPathAllowed: true
      };
    }

    return { kind: 'other', symbolicOnly: false, hdcUnbindAllowed: !isGraph, indexFastPathAllowed: false };
  }

  getRuleConclusionOperators() {
    // Cache by rule count (rules are appended during learn/loadCore).
    const n = this.session?.rules?.length || 0;
    if (this._ruleOpsCache && this._ruleOpsCacheN === n) return this._ruleOpsCache;

    const ops = new Set();
    const rules = this.session?.rules || [];

    const addLeafOp = (ast) => {
      const op = ast?.operator?.name || ast?.operator?.value || null;
      if (typeof op === 'string' && op) ops.add(op);
    };

    const walkParts = (part) => {
      if (!part) return;
      if (part.type === 'leaf' && part.ast) {
        addLeafOp(part.ast);
        return;
      }
      if (part.type === 'Not') return;
      if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
        for (const p of part.parts) walkParts(p);
      }
    };

    for (const r of rules) {
      if (r?.conclusionParts) {
        walkParts(r.conclusionParts);
        continue;
      }
      if (r?.conclusionAST) addLeafOp(r.conclusionAST);
    }

    this._ruleOpsCache = ops;
    this._ruleOpsCacheN = n;
    return ops;
  }

  /**
   * Build a candidate domain for a hole using KB component indices.
   * Returns a list of { name, witnesses, source:'kb' } or null if not available/too expensive.
   */
  buildCandidateDomainFromKB(operatorName, knowns, holeIndex) {
    const kb = this.session?.componentKB;
    if (!kb || typeof kb.findByOperator !== 'function') return null;

    const knownByPos = new Map();
    for (const k of knowns || []) {
      if (typeof k?.index === 'number' && typeof k?.name === 'string') {
        knownByPos.set(k.index, k.name);
      }
    }

    // Choose the smallest indexed slice as the base (no synonym expansion; preserve QueryEngine semantics).
    let facts = null;
    if (knownByPos.has(1) && typeof kb.findByArg0 === 'function') {
      facts = kb.findByArg0(knownByPos.get(1), false).filter(f => f?.operator === operatorName);
    } else if (knownByPos.has(2) && typeof kb.findByArg1 === 'function') {
      facts = kb.findByArg1(knownByPos.get(2), false).filter(f => f?.operator === operatorName);
    } else {
      facts = kb.findByOperator(operatorName, false);
    }

    if (!Array.isArray(facts) || facts.length === 0) return null;

    const counts = new Map();
    for (const f of facts) {
      const args = Array.isArray(f?.args) ? f.args : Array.isArray(f?.metadata?.args) ? f.metadata.args : null;
      if (!args || args.length < holeIndex) continue;

      let ok = true;
      for (const k of knowns || []) {
        const idx = (k.index || 0) - 1;
        if (idx < 0) continue;
        if (args[idx] !== k.name) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const name = args[holeIndex - 1];
      if (typeof name !== 'string' || !isValidEntity(name, this.session)) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    if (counts.size === 0) return null;

    const out = Array.from(counts.entries())
      .map(([name, witnesses]) => ({ name, witnesses, source: 'kb' }))
      .sort((a, b) => (b.witnesses - a.witnesses) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    // Safety cap: avoid spending O(huge) similarity checks. Keep the most frequent candidates.
    const maxDomain = Math.max(200, (this.config.UNBIND_MAX_CANDIDATES || 25) * 50);
    return out.length > maxDomain ? out.slice(0, maxDomain) : out;
  }

  /**
   * Fast, complete enumeration for single-hole fact queries using ComponentKB indices only.
   * This path is exact (no HDC similarity gates, no proof search) and therefore safe to use
   * as a replacement for symbolic supplement on "direct fact" queries.
   */
  tryDirectIndexQuery(operatorName, knowns, holes, options = {}) {
    if (!operatorName) return null;
    if (!Array.isArray(holes) || holes.length !== 1) return null;
    const kb = this.session?.componentKB;
    if (!kb || typeof kb.findByOperator !== 'function') return null;

    const hole = holes[0];
    if (!hole || typeof hole.index !== 'number' || typeof hole.name !== 'string') return null;

    const knownByPos = new Map();
    for (const k of knowns || []) {
      if (typeof k?.index === 'number' && typeof k?.name === 'string') knownByPos.set(k.index, k.name);
    }

    // Use the smallest index slice available (no synonym expansion).
    let facts;
    if (knownByPos.has(1) && typeof kb.findByArg0 === 'function') {
      this.trackOp('holo_index_domain_arg0', 1);
      facts = kb.findByArg0(knownByPos.get(1), false).filter(f => f?.operator === operatorName);
    } else if (knownByPos.has(2) && typeof kb.findByArg1 === 'function') {
      this.trackOp('holo_index_domain_arg1', 1);
      facts = kb.findByArg1(knownByPos.get(2), false).filter(f => f?.operator === operatorName);
    } else {
      this.trackOp('holo_index_domain_operator', 1);
      facts = kb.findByOperator(operatorName, false);
    }

    if (!Array.isArray(facts) || facts.length === 0) return null;

    const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, options.maxResults) : null;
    const seen = new Set();
    const allResults = [];

    for (const fact of facts) {
      this.session.reasoningStats.kbScans++;
      const args = Array.isArray(fact?.args) ? fact.args : Array.isArray(fact?.metadata?.args) ? fact.metadata.args : null;
      if (!args || args.length < hole.index) continue;

      let ok = true;
      for (const [pos, name] of knownByPos.entries()) {
        const idx = pos - 1;
        if (idx < 0 || idx >= args.length || args[idx] !== name) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const value = args[hole.index - 1];
      if (typeof value !== 'string' || !value) continue;

      const key = `${hole.index}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const bindings = new Map();
      const stmt = `${operatorName} ${args.join(' ')}`;
      const steps = [];
      const metaProof = typeof fact?.metadata?.proof === 'string' ? fact.metadata.proof.trim() : '';
      if (metaProof) steps.push(metaProof);
      steps.push(stmt);

      bindings.set(hole.name, { answer: value, similarity: 0.95, method: 'direct', steps });
      allResults.push({ bindings, score: 0.95, method: 'direct', steps });

      if (maxResults !== null && allResults.length >= maxResults) break;
    }

    if (allResults.length === 0) return null;

    this.trackOp('holo_index_fastpath_success', 1);
    return {
      success: true,
      bindings: allResults[0].bindings,
      confidence: allResults[0].score,
      ambiguous: allResults.length > 1,
      allResults
    };
  }

  /**
   * Fast exact-fact check using ComponentKB indices (no proof search, no full KB scans).
   */
  hasDirectFactFast(operatorName, args) {
    if (!operatorName || !Array.isArray(args) || args.length === 0) return false;
    const kb = this.session?.componentKB;
    if (!kb) return false;

    let candidates;
    if (args[0] && typeof kb.findByArg0 === 'function') {
      candidates = kb.findByArg0(args[0], false).filter(f => f?.operator === operatorName);
    } else if (typeof kb.findByOperator === 'function') {
      candidates = kb.findByOperator(operatorName, false);
    } else {
      return false;
    }

    for (const fact of candidates || []) {
      this.session.reasoningStats.kbScans++;
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

    // Meta-operators and non-relational helpers should bypass HDC unbind.
    // HDC-first candidate extraction is not meaningful for these operations and produces noisy/invalid results.
    for (let i = 0; i < statement.args.length; i++) {
      const arg = statement.args[i];
      if (arg.type === 'Hole') {
        holes.push({ index: i + 1, name: arg.name });
      } else {
        const name =
          typeof arg.name === 'string'
            ? arg.name
            : (arg.value !== undefined && arg.value !== null)
              ? String(arg.value)
              : typeof arg.toString === 'function'
                ? arg.toString()
                : null;
        knowns.push({
          index: i + 1,
          name,
          node: arg,
          vector: this.session.resolve(arg)
        });
      }
    }

    // Direct match (no holes) - use symbolic
    if (holes.length === 0) {
      return this.symbolicEngine.execute(statement, options);
    }

    const queryClass = this.classifyQuery(operatorName, holes, knowns);
    this.trackOp(`holo_query_class_${queryClass.kind}`, 1);
    if (queryClass.symbolicOnly) {
      this.trackOp('holo_symbolic_only', 1);
      return this.symbolicEngine.execute(statement, options);
    }

    // Safe fast-path: exact, complete retrieval for 1-hole fact queries using ComponentKB indices.
    // This bypasses both HDC similarity and symbolic proof search.
    if (queryClass.indexFastPathAllowed) {
      const fast = this.tryDirectIndexQuery(operatorName, knowns, holes, options);
      if (fast) return fast;
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
    let candidates = [];
    if (queryClass.hdcUnbindAllowed) {
      this.session.reasoningStats.hdcUnbindAttempts =
        (this.session.reasoningStats.hdcUnbindAttempts || 0) + 1;

      dbg('UNBIND', `Starting HDC unbind for ${operatorName} with ${holes.length} holes`);
      candidates = this.hdcUnbindCandidates(operator, operatorName, knowns, holes);
      dbg('UNBIND', `Found ${candidates.length} candidate combinations`);

      if (candidates.length > 0) {
        this.session.reasoningStats.hdcUnbindSuccesses =
          (this.session.reasoningStats.hdcUnbindSuccesses || 0) + 1;
      }
    } else {
      this.trackOp('holo_hdc_unbind_skipped', 1);
    }

    const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, options.maxResults) : null;

    // Step 3: Validate candidates with symbolic proof
    const validatedResults = [];
    const requireProofValidation = this.config.VALIDATION_REQUIRED !== false;

    if (requireProofValidation) {
      for (const candidate of candidates) {
        this.session.reasoningStats.hdcValidationAttempts =
          (this.session.reasoningStats.hdcValidationAttempts || 0) + 1;

        this.trackOp('holo_validation_proof_attempt', 1);
        const validation = this.validateCandidate(operatorName, knowns, holes, candidate);

        if (validation.valid) {
          this.session.reasoningStats.hdcValidationSuccesses =
            (this.session.reasoningStats.hdcValidationSuccesses || 0) + 1;
          this.trackOp('holo_validation_proof_ok', 1);

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
    }

    dbg('RESULTS', `${validatedResults.length} validated results`);

    if (validatedResults.length > 0) {
      this.session.reasoningStats.holographicQueryHdcSuccesses =
        (this.session.reasoningStats.holographicQueryHdcSuccesses || 0) + 1;
    }

    // Step 4: Merge/fallback to symbolic when needed.
    // For correctness: HDC candidate extraction is not complete; use symbolic supplement unless we returned
    // via the direct index fast-path earlier.
    const shouldSupplement = !!this.config.FALLBACK_TO_SYMBOLIC;

    if (shouldSupplement) {
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
    } else {
      this.trackOp('holo_skip_symbolic_supplement', 1);
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
      const posVec = getPositionVector(known.index, this.session.geometry, this.session.hdcStrategy, this.session);
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
      const posVec = getPositionVector(hole.index, this.session.geometry, this.session.hdcStrategy, this.session);

      // Unbind: candidate = KB ⊕ queryPartial ⊕ position⁻¹
      // This extracts what's at the hole position
      const unboundVec = unbind(unbind(kbBundle, queryPartial), posVec);

      // Find top-K similar in vocabulary (strategy-level topKSimilar)
      const kbDomain = this.buildCandidateDomainFromKB(operatorName, knowns, hole.index);
      let candidates = null;

      if (kbDomain && kbDomain.length > 0) {
        this.trackOp('holo_domain_kb', 1);
        const scored = [];
        for (const entry of kbDomain) {
          const vec = this.session.resolve({ type: 'Identifier', name: entry.name });
          this.session.reasoningStats.similarityChecks++;
          const sim = similarity(unboundVec, vec);
          scored.push({
            name: entry.name,
            similarity: sim,
            witnesses: entry.witnesses || 0,
            source: 'kb'
          });
        }
        scored.sort((a, b) => (b.similarity - a.similarity) || (b.witnesses - a.witnesses) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
        candidates = scored
          .filter(c => c.similarity >= (this.config.UNBIND_MIN_SIMILARITY ?? 0))
          .slice(0, this.config.UNBIND_MAX_CANDIDATES);
      } else {
        this.trackOp('holo_domain_vocab', 1);
        const vocabulary = this.getVocabulary();
        const rawTop = topKSimilar(
          unboundVec,
          vocabulary,
          this.config.UNBIND_MAX_CANDIDATES * 3,
          this.session
        );
        candidates = rawTop
          .filter(c => c.similarity >= (this.config.UNBIND_MIN_SIMILARITY ?? 0))
          .filter(c => isValidEntity(c.name, this.session))
          .slice(0, this.config.UNBIND_MAX_CANDIDATES);
      }

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

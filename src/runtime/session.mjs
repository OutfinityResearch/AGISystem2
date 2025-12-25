/**
 * AGISystem2 - Session
 * @module runtime/session
 *
 * Main entry point for the reasoning system.
 * Coordinates learn, query, prove, and decode capabilities.
 */

import { bundle, getDefaultGeometry, similarity } from '../core/operations.mjs';
import { getProperties, getStrategy } from '../hdc/facade.mjs';
import { Scope } from './scope.mjs';
import { Vocabulary } from './vocabulary.mjs';
import { Executor } from './executor.mjs';
import { AbductionEngine } from '../reasoning/abduction.mjs';
import { InductionEngine } from '../reasoning/induction.mjs';
import { createQueryEngine, getReasoningPriority } from '../reasoning/index.mjs';
import { textGenerator } from '../output/text-generator.mjs';
import { format as resultFormatterFormat } from '../output/result-formatter.mjs';
import { ResponseTranslator } from '../output/response-translator.mjs';
import { findAll } from '../reasoning/find-all.mjs';
import { ComponentKB } from '../reasoning/component-kb.mjs';
import { debug_trace, isDebugEnabled } from '../utils/debug.js';
import { DEFAULT_SEMANTIC_INDEX } from './semantic-index.mjs';
import { canonicalizeMetadata } from './canonicalize.mjs';
import { FactIndex } from './fact-index.mjs';
import { ContradictionError } from './contradiction-error.mjs';
import { computeFeatureToggles, computeReasoningProfile } from './reasoning-profile.mjs';
import {
  initOperators as initOperatorsImpl,
  trackRules as trackRulesImpl,
  resolveReferenceToAST as resolveReferenceToASTImpl,
  extractVariables as extractVariablesImpl,
  extractOperatorName as extractOperatorNameImpl,
  extractCompoundCondition as extractCompoundConditionImpl
} from './session-rules.mjs';
import { checkContradiction as checkContradictionImpl } from './session-contradictions.mjs';
import {
  decodeVector as decodeVectorImpl,
  extractArguments as extractArgumentsImpl,
  summarizeVector as summarizeVectorImpl
} from './session-inspection.mjs';
import {
  trackMethod as trackMethodImpl,
  trackOperation as trackOperationImpl,
  getReasoningStats as getReasoningStatsImpl
} from './session-stats.mjs';
import { loadCore as loadCoreImpl } from './session-core-load.mjs';
import { learn as learnImpl } from './session-learn.mjs';
import { query as queryImpl } from './session-query.mjs';
import { prove as proveImpl } from './session-prove.mjs';
import { checkDSL as checkDSLImpl } from './session-check-dsl.mjs';
import { beginTransaction, rollbackTransaction } from './session-transaction.mjs';

function dbg(category, ...args) {
  debug_trace(`[Session:${category}]`, ...args);
}

export class Session {
  constructor(options = {}) {
    this.hdcStrategy = options.hdcStrategy || process.env.SYS2_HDC_STRATEGY || 'dense-binary';
    this.reasoningPriority = options.reasoningPriority || getReasoningPriority();
    this.reasoningProfile = computeReasoningProfile({
      reasoningPriority: this.reasoningPriority,
      optionsProfile: options.reasoningProfile
    });
    this.features = computeFeatureToggles({ profile: this.reasoningProfile, options });
    this.canonicalizationEnabled = this.features.canonicalizationEnabled;
    this.proofValidationEnabled = this.features.proofValidationEnabled;
    this.closedWorldAssumption = this.features.closedWorldAssumption;
    this.useSemanticIndex = this.features.useSemanticIndex;
    this.useTheoryConstraints = this.features.useTheoryConstraints;
    this.useTheoryReserved = this.features.useTheoryReserved;

    // Validate HDC strategy (must exist); strategy selection is session-local.
    getStrategy(this.hdcStrategy);
    const strategyDefaultGeometry = getProperties(this.hdcStrategy)?.defaultGeometry;
    const hasEnvGeometry = typeof process.env.SYS2_GEOMETRY === 'string' && process.env.SYS2_GEOMETRY.trim() !== '';
    this.geometry = options.geometry || (hasEnvGeometry ? getDefaultGeometry() : (strategyDefaultGeometry || getDefaultGeometry()));

    this.scope = new Scope();
    this.vocabulary = new Vocabulary(this.geometry, this.hdcStrategy);
    this.executor = new Executor(this);

    // Use dispatcher to create engines based on reasoning priority
    this.queryEngine = createQueryEngine(this);
    this.abductionEngine = new AbductionEngine(this);
    this.inductionEngine = new InductionEngine(this);
    this.rules = [];
    this.kb = null;
    this.kbFacts = [];
    this.nextFactId = 1;
    this._kbBundleVersion = 0;
    this._kbBundleCache = null;
    this._kbBundleCacheVersion = -1;
    this.componentKB = new ComponentKB(this);  // Component-indexed KB for fuzzy matching
    this.factIndex = new FactIndex();          // Exact-match fact index for hot paths
    this.theories = new Map();
    this.operators = new Map();
    this.declaredOperators = new Set();
    this.warnings = [];
    this.referenceTexts = new Map(); // Maps reference names to fact strings
    this.referenceMetadata = new Map(); // Maps reference names to structured metadata {operator, args}
    this.graphs = new Map();       // HDC point relationship graphs
    this.graphAliases = new Map();  // Aliases for graphs (persistName -> name)
    this.responseTranslator = new ResponseTranslator(this);
    this.semanticIndex = DEFAULT_SEMANTIC_INDEX;
    this.rejectContradictions = options.rejectContradictions ?? true;

    // Reasoning statistics
	    this.reasoningStats = {
	      queries: 0,
	      proofs: 0,
	      kbScans: 0,
	      similarityChecks: 0,
      ruleAttempts: 0,
      transitiveSteps: 0,
      maxProofDepth: 0,
      minProofDepth: Infinity,  // Track minimum proof depth (M)
      totalProofSteps: 0,       // Successful proof chain steps
      totalReasoningSteps: 0,   // ALL reasoning attempts (including backtracking)
      proofLengths: [],
      methods: {},
      operations: {},
	      // HDC-specific stats
	      hdcQueries: 0,         // Total queries using HDC Master Equation
	      hdcSuccesses: 0,       // HDC queries that found results
	      hdcBindings: 0,        // Total bindings found via HDC
	      hdcUsefulOps: 0,       // Query/prove ops where final method is HDC-based
	      // Holographic / HDC-first stats (populated by holographic engines)
	      holographicQueries: 0,
	      holographicQueryHdcSuccesses: 0,
	      holographicProofs: 0,
      hdcUnbindAttempts: 0,
      hdcUnbindSuccesses: 0,
      hdcValidationAttempts: 0,
      hdcValidationSuccesses: 0,
      hdcProofSuccesses: 0,
      symbolicProofFallbacks: 0,
      // CSP stats
      holographicCSP: 0,
      cspBundleBuilt: 0,
      cspSymbolicFallback: 0,
      cspNodesExplored: 0,
      cspBacktracks: 0,
      cspPruned: 0,
      cspHdcPruned: 0,
      holographicWedding: 0
    };

    this.initOperators();

    dbg(
      'INIT',
      `Strategy: ${this.hdcStrategy}, Priority: ${this.reasoningPriority}, Profile: ${this.reasoningProfile}`
    );
  }

  /**
   * Initialize reserved operator vectors
   */
  initOperators() {
    initOperatorsImpl(this);
  }

  /**
   * Learn DSL statements
   * @param {string} dsl - DSL source code
   * @returns {Object} Learning result
   */
  learn(dsl) {
    const ast = this.checkDSL(dsl, { mode: 'learn', allowHoles: true, allowNewOperators: false });
    const snapshot = beginTransaction(this);
    try {
      const result = learnImpl(this, ast);
      if (!result.success) {
        rollbackTransaction(this, snapshot);
        result.facts = 0;
      }
      return result;
    } catch (error) {
      rollbackTransaction(this, snapshot);
      throw error;
    }
  }

  /**
   * Load Core theories from `config/Core` into this session.
   * This is a convenience helper to make "theory-driven" behavior easy to enable.
   *
   * @param {Object} [options]
   * @param {string} [options.corePath] - default `./config/Core`
   * @param {boolean} [options.includeIndex] - default false (index.sys2 uses Load with relative paths)
   * @returns {{success: boolean, errors: Array<{file: string, errors: string[]}>}}
   */
  loadCore(options = {}) {
    return loadCoreImpl(this, options);
  }

  /**
   * Track Implies rules from AST
   */
  trackRules(ast) {
    trackRulesImpl(this, ast);
  }

  /**
   * Resolve reference to its actual AST statement
   */
  resolveReferenceToAST(expr, stmtMap) {
    return resolveReferenceToASTImpl(expr, stmtMap);
  }

  /**
   * Extract variable names from AST
   */
  extractVariables(ast, vars = []) {
    return extractVariablesImpl(ast, vars);
  }

  /**
   * Extract operator name from statement
   */
  extractOperatorName(stmt) {
    return extractOperatorNameImpl(stmt);
  }

  /**
   * Recursively extract compound condition (And/Or/Not)
   * Preserves AST for variable unification
   */
  extractCompoundCondition(expr, stmtMap) {
    return extractCompoundConditionImpl(this, expr, stmtMap);
  }

  /**
   * Add vector to knowledge base
  */
  addToKB(vector, name = null, metadata = null) {
    if (this.canonicalizationEnabled && metadata) {
      metadata = canonicalizeMetadata(this, metadata);
    }

    if (isDebugEnabled()) {
      const op = metadata?.operator || '?';
      const args = (metadata?.args || []).join(' ');
      debug_trace(`[Session:addToKB]`, `Adding fact: ${op} ${args} | name=${name || '(anon)'}`);
    }

    const contradiction = this.checkContradiction(metadata);
    if (contradiction) {
      const warningText = typeof contradiction === 'string'
        ? contradiction
        : (contradiction.message || String(contradiction));
      this.warnings.push(warningText);
      if (this.rejectContradictions) {
        throw new ContradictionError(warningText, typeof contradiction === 'string' ? null : contradiction);
      }
    }

    const fact = { id: this.nextFactId++, vector, name, metadata };
    this.kbFacts.push(fact);
    this._kbBundleVersion++;

    // Exact-match index for fast contradiction checks / direct lookups
    this.factIndex?.addFact?.(fact);

    // Index in component KB for fuzzy matching
    this.componentKB.addFact(fact);

    // Handle synonym declarations
    if (metadata?.operator === 'synonym' && metadata?.args?.length === 2) {
      this.componentKB.addSynonym(metadata.args[0], metadata.args[1]);
      dbg('SYNONYM', `Registered synonym: ${metadata.args[0]} <-> ${metadata.args[1]}`);
    }

    // Handle canonical representative declarations
    if (metadata?.operator === 'canonical' && metadata?.args?.length === 2) {
      this.componentKB.addCanonical(metadata.args[0], metadata.args[1]);
      dbg('CANONICAL', `Registered canonical: ${metadata.args[0]} -> ${metadata.args[1]}`);
    }

    // Syntactic sugar: alias A B behaves like canonical A B (directional).
    if (metadata?.operator === 'alias' && metadata?.args?.length === 2) {
      this.componentKB.addCanonical(metadata.args[0], metadata.args[1]);
      dbg('CANONICAL', `Registered alias: ${metadata.args[0]} -> ${metadata.args[1]}`);
    }

    if (this.kb === null) {
      this.kb = vector.clone();
    } else {
      this.kb = bundle([this.kb, vector]);
    }
  }

  /**
   * Returns a bundled KB vector suitable for HDC unbind operations.
   * Uses a small cache keyed by fact additions to avoid re-bundling every query.
   */
  getKBBundle() {
    if (this._kbBundleCache && this._kbBundleCacheVersion === this._kbBundleVersion) {
      return this._kbBundleCache;
    }

    const vectors = (this.kbFacts || []).map(f => f.vector).filter(Boolean);
    if (vectors.length === 0) return null;

    this._kbBundleCache = bundle(vectors);
    this._kbBundleCacheVersion = this._kbBundleVersion;
    return this._kbBundleCache;
  }

  /**
   * Check for contradictions
   */
  checkContradiction(metadata) {
    return checkContradictionImpl(this, metadata);
  }

  /**
   * Execute query using HDC + Symbolic Reasoning (unified interface)
   *
   * For queries with holes (?x, ?y):
   * - Uses HDC Master Equation: Answer = KB ⊕ Query⁻¹
   * - Plus direct KB matching, transitive reasoning, and rule derivations
   *
   * For queries without holes:
   * - Performs existence check via similarity matching
   *
   * @param {string} dsl - Query DSL
   * @param {Object} options - Query options
   * @param {boolean} options.hdcOnly - Use only HDC (no symbolic fallback)
   * @param {number} options.maxResults - Max number of results to return (>=1)
   * @param {boolean} options.useLevelOptimization - Enable constructivist level pruning (default true)
   * @returns {Object} Query result with bindings and alternatives
   */
  query(dsl, options = {}) {
    dbg('QUERY', 'Starting:', dsl?.substring(0, 60));
    const ast = this.checkDSL(dsl, { mode: 'query', allowHoles: true });
    return queryImpl(this, ast, options);
  }

  /**
   * @deprecated Use query() instead - unified interface handles all cases
   */
  queryHDC(dsl) {
    return this.query(dsl);
  }

  /**
   * Prove a goal
   * @param {string} dsl - Goal DSL
   * @param {Object} options - Options
   * @returns {Object} Proof result
   */
  prove(dsl, options = {}) {
    dbg('PROVE', 'Starting:', dsl?.substring(0, 60));
    const ast = this.checkDSL(dsl, { mode: 'prove', allowHoles: false });
    return proveImpl(this, ast, options);
  }

  /**
   * Abductive reasoning: Find best explanation for an observation
   * @param {string} dsl - Observation DSL (what we want to explain)
   * @param {Object} options - Abduction options
   * @returns {Object} Abduction result with ranked explanations
   */
  abduce(dsl, options = {}) {
    dbg('ABDUCE', 'Starting:', dsl?.substring(0, 60));
    const ast = this.checkDSL(dsl, { mode: 'abduce', allowHoles: false });
    try {
      if (ast.statements.length === 0) {
        return { success: false, reason: 'Empty observation' };
      }

      const result = this.abductionEngine.abduce(ast.statements[0], options);
      this.trackMethod('abduction');
      return result;
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  /**
   * Validate DSL syntax and dependencies before execution.
   * @param {string} dsl - DSL source code
   * @param {Object} options - Validation options
   * @returns {Object} Parsed AST
   */
  checkDSL(dsl, options = {}) {
    return checkDSLImpl(this, dsl, options);
  }

  /**
   * Strict DSL validation: validates syntax AND rejects unknown operators/concepts that are not
   * already loaded or declared/persisted in the same program.
   */
  checkDSLStrict(dsl, options = {}) {
    return checkDSLImpl(this, dsl, { ...options, requireKnownAtoms: true });
  }

  /**
   * Inductive reasoning: Discover patterns and suggest rules from KB
   * @param {Object} options - Induction options
   * @returns {Object} Induction result with discovered patterns
   */
  induce(options = {}) {
    dbg('INDUCE', 'Analyzing KB patterns');
    try {
      const result = this.inductionEngine.induceRules(options);
      this.trackMethod('induction');
      return result;
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  /**
   * Learn from examples and induce generalizations
   * @param {string[]} examples - Array of DSL strings
   * @returns {Object} Learning result with suggested rules
   */
  learnFrom(examples) {
    dbg('LEARN_FROM', `${examples.length} examples`);
    try {
      const result = this.inductionEngine.learnFrom(examples);
      this.trackMethod('learn_from_examples');
      return result;
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  /**
   * Generate natural language text
   */
  generateText(operator, args) {
    return textGenerator.generate(operator, args);
  }

  /**
   * Elaborate proof result
   */
  elaborate(proof) {
    return textGenerator.elaborate(proof);
  }

  /**
   * Format query or prove result to natural language
   * @param {Object} result - Result from query() or prove()
   * @param {string} type - 'query' or 'prove'
   * @returns {string} Natural language text
   */
  formatResult(result, type = 'query') {
    return resultFormatterFormat(result, type);
  }

  /**
   * Describe a reasoning result using the response translator
   * @param {Object} payload - includes action, reasoningResult, queryDsl
   * @returns {string} Natural language text
   */
  describeResult(payload) {
    return this.responseTranslator.translate(payload);
  }

  /**
   * Decode vector to structure
   */
  decode(vector) {
    return decodeVectorImpl(this, vector);
  }

  /**
   * Extract arguments from vector
   */
  extractArguments(vector, operatorName) {
    return extractArgumentsImpl(this, vector, operatorName);
  }

  /**
   * Summarize vector as natural language
   */
  summarize(vector) {
    return summarizeVectorImpl(this, vector);
  }

  // Statistics tracking

  trackMethod(method) {
    trackMethodImpl(this, method);
  }

  trackOperation(operation) {
    trackOperationImpl(this, operation);
  }

  getReasoningStats(reset = false) {
    return getReasoningStatsImpl(this, reset);
  }

  // Utility methods

  getAllRules() {
    return this.rules;
  }

  similarity(a, b) {
    return similarity(a, b);
  }

  resolve(expr) {
    if (typeof expr === 'string') {
      return this.vocabulary.getOrCreate(expr);
    }
    return this.executor.resolveExpression(expr);
  }

  dump() {
    return {
      geometry: this.geometry,
      factCount: this.kbFacts.length,
      ruleCount: this.rules.length,
      vocabularySize: this.vocabulary.size,
      scopeBindings: this.scope.localNames()
    };
  }

  // ============================================================
  // CSP and FindAll Methods
  // ============================================================

  /**
   * Find ALL matches for a pattern (exhaustive enumeration)
   * Unlike query() which returns best match, this returns all matches.
   *
   * @param {string} pattern - Pattern DSL with holes (e.g., "seatedAt ?person Table1")
   * @param {Object} options - Options
   * @returns {Object} Result with all bindings
   *
   * @example
   * session.learn('seatedAt Alice Table1');
   * session.learn('seatedAt Bob Table1');
   * session.findAll('seatedAt ?person Table1');
   * // Returns: { success: true, count: 2, results: [{bindings: {person: 'Alice'}}, ...] }
   */
  findAll(pattern, options = {}) {
    dbg('FINDALL', 'Pattern:', pattern?.substring?.(0, 60) || pattern);
    const ast = this.checkDSL(pattern, { mode: 'query', allowHoles: true });
    return findAll(this, ast.statements?.[0] || pattern, options);
  }




  close() {
    this.kb = null;
    this.kbFacts = [];
    this._kbBundleVersion++;
    this._kbBundleCache = null;
    this._kbBundleCacheVersion = -1;
    this.rules = [];
    this.scope.clear();
  }
}

export default Session;

/**
 * AGISystem2 - Session
 * @module runtime/session
 *
 * Main entry point for the reasoning system.
 * Coordinates learn, query, prove, and decode capabilities.
 */

import { bind, bindAll, bundle, similarity, topKSimilar, getDefaultGeometry } from '../core/operations.mjs';
import { withPosition, removePosition } from '../core/position.mjs';
import { parse } from '../parser/parser.mjs';
import { Scope } from './scope.mjs';
import { Vocabulary } from './vocabulary.mjs';
import { Executor } from './executor.mjs';
import { QueryEngine } from '../reasoning/query.mjs';
import { ProofEngine } from '../reasoning/prove.mjs';
import { AbductionEngine } from '../reasoning/abduction.mjs';
import { InductionEngine } from '../reasoning/induction.mjs';
import { textGenerator } from '../output/text-generator.mjs';
import { findAll } from '../reasoning/find-all.mjs';



// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Session:${category}]`, ...args);
}

// Mutually exclusive property/state pairs for contradiction detection
const MUTUALLY_EXCLUSIVE = {
  hasState: [['Open', 'Closed'], ['Alive', 'Dead'], ['On', 'Off'], ['Full', 'Empty']],
  hasProperty: [['Hot', 'Cold'], ['Wet', 'Dry']],
  before: [['after']],
  after: [['before']]
};

export class Session {
  constructor(options = {}) {
    this.geometry = options.geometry || getDefaultGeometry();
    this.scope = new Scope();
    this.vocabulary = new Vocabulary(this.geometry);
    this.executor = new Executor(this);
    this.queryEngine = new QueryEngine(this);
    this.abductionEngine = new AbductionEngine(this);
    this.inductionEngine = new InductionEngine(this);
    this.rules = [];
    this.kb = null;
    this.kbFacts = [];
    this.theories = new Map();
    this.operators = new Map();
    this.warnings = [];
    this.referenceTexts = new Map(); // Maps reference names to fact strings

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
      totalProofSteps: 0,
      proofLengths: [],
      methods: {},
      operations: {},
      // HDC-specific stats
      hdcQueries: 0,         // Total queries using HDC Master Equation
      hdcSuccesses: 0,       // HDC queries that found results
      hdcBindings: 0         // Total bindings found via HDC
    };

    this.initOperators();
  }

  /**
   * Initialize reserved operator vectors
   */
  initOperators() {
    const reserved = ['Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists'];
    for (const op of reserved) {
      this.operators.set(op, this.vocabulary.getOrCreate(op));
    }
  }

  /**
   * Learn DSL statements
   * @param {string} dsl - DSL source code
   * @returns {Object} Learning result
   */
  learn(dsl) {
    this.warnings = [];

    try {
      const ast = parse(dsl);
      const result = this.executor.executeProgram(ast);

      // Track rules (Implies statements)
      this.trackRules(ast);

      // Count actual facts: for Load statements, use factsLoaded; otherwise count results
      let factCount = 0;
      let solveResult = null;
      
      for (const r of result.results) {
        if (r && typeof r.factsLoaded === 'number') {
          factCount += r.factsLoaded;
        } else if (r && r.type === 'solve') {
          // Preserve solve results for CSP
          solveResult = r;
          factCount += 1; // Count as one "fact" for backward compatibility
        } else {
          factCount += 1;
        }
      }

      const response = {
        success: result.success,
        facts: factCount,
        errors: result.errors.map(e => e.message),
        warnings: this.warnings.slice()
      };
      
      // If this was a solve operation, include the detailed result
      if (solveResult) {
        response.solveResult = solveResult;
      }
      
      return response;
    } catch (e) {
      return {
        success: false,
        facts: 0,
        errors: [e.message],
        warnings: this.warnings.slice()
      };
    }
  }

  /**
   * Track Implies rules from AST
   */
  trackRules(ast) {
    const stmtMap = new Map();
    for (const stmt of ast.statements) {
      if (stmt.destination) {
        stmtMap.set(stmt.destination, stmt);
      }
    }

    for (const stmt of ast.statements) {
      const operatorName = this.extractOperatorName(stmt);
      if (operatorName === 'Implies' && stmt.args.length >= 2) {
        const condVec = this.executor.resolveExpression(stmt.args[0]);
        const concVec = this.executor.resolveExpression(stmt.args[1]);
        const conditionParts = this.extractCompoundCondition(stmt.args[0], stmtMap);

        // Resolve AST for condition and conclusion for variable unification
        const conditionAST = this.resolveReferenceToAST(stmt.args[0], stmtMap);
        const conclusionAST = this.resolveReferenceToAST(stmt.args[1], stmtMap);

        // Extract variables from condition and conclusion
        const conditionVars = this.extractVariables(conditionAST);
        const conclusionVars = this.extractVariables(conclusionAST);
        const hasVariables = conditionVars.length > 0 || conclusionVars.length > 0;

        this.rules.push({
          name: stmt.destination,
          vector: this.executor.buildStatementVector(stmt),
          source: stmt.toString(),
          condition: condVec,
          conclusion: concVec,
          conditionParts,
          // New: AST for unification
          conditionAST,
          conclusionAST,
          conditionVars,
          conclusionVars,
          hasVariables
        });
      }
    }
  }

  /**
   * Resolve reference to its actual AST statement
   */
  resolveReferenceToAST(expr, stmtMap) {
    if (expr.type === 'Reference') {
      const stmt = stmtMap.get(expr.name);
      if (stmt) {
        return stmt;
      }
    }
    return expr;
  }

  /**
   * Extract variable names from AST
   */
  extractVariables(ast, vars = []) {
    if (!ast) return vars;

    if (ast.type === 'Hole') {
      if (!vars.includes(ast.name)) {
        vars.push(ast.name);
      }
    } else if (ast.type === 'Statement') {
      if (ast.operator) this.extractVariables(ast.operator, vars);
      if (ast.args) {
        for (const arg of ast.args) {
          this.extractVariables(arg, vars);
        }
      }
    } else if (ast.args) {
      for (const arg of ast.args) {
        this.extractVariables(arg, vars);
      }
    }

    return vars;
  }

  /**
   * Extract operator name from statement
   */
  extractOperatorName(stmt) {
    if (!stmt?.operator) return null;
    return stmt.operator.name || stmt.operator.value || null;
  }

  /**
   * Recursively extract compound condition (And/Or/Not)
   * Preserves AST for variable unification
   */
  extractCompoundCondition(expr, stmtMap) {
    if (expr.type === 'Reference') {
      const stmt = stmtMap.get(expr.name);
      if (stmt) {
        const op = this.extractOperatorName(stmt);
        if (op === 'And' || op === 'Or') {
          const parts = stmt.args.map(arg => {
            const nested = this.extractCompoundCondition(arg, stmtMap);
            if (nested) return nested;
            // Resolve the reference to get the actual AST
            const resolvedAST = this.resolveReferenceToAST(arg, stmtMap);
            return {
              type: 'leaf',
              vector: this.executor.resolveExpression(arg),
              ast: resolvedAST  // Preserve AST for unification
            };
          });
          return { type: op, parts };
        }
        // Handle Not operator - negated condition
        if (op === 'Not' && stmt.args?.length === 1) {
          const inner = this.extractCompoundCondition(stmt.args[0], stmtMap);
          if (inner) {
            return { type: 'Not', inner };
          }
          // Not wrapping a simple statement
          const resolvedAST = this.resolveReferenceToAST(stmt.args[0], stmtMap);
          return {
            type: 'Not',
            inner: {
              type: 'leaf',
              vector: this.executor.resolveExpression(stmt.args[0]),
              ast: resolvedAST
            }
          };
        }
      }
    }
    return null;
  }

  /**
   * Add vector to knowledge base
   */
  addToKB(vector, name = null, metadata = null) {
    const contradiction = this.checkContradiction(metadata);
    if (contradiction) {
      this.warnings.push(contradiction);
    }

    this.kbFacts.push({ vector, name, metadata });
    if (this.kb === null) {
      this.kb = vector.clone();
    } else {
      this.kb = bundle([this.kb, vector]);
    }
  }

  /**
   * Check for contradictions
   */
  checkContradiction(metadata) {
    if (!metadata?.operator || !metadata?.args) return null;
    const { operator, args } = metadata;

    // Check Not(P) when P exists
    if (operator === 'Not' && args.length >= 1) {
      const refVec = this.scope.get(args[0]);
      if (refVec) {
        for (const fact of this.kbFacts) {
          if (fact.vector && similarity(fact.vector, refVec) > 0.9) {
            return 'Warning: direct contradiction detected';
          }
        }
      }
    }

    // Check temporal contradictions
    if ((operator === 'before' || operator === 'after') && args.length >= 2) {
      const oppositeOp = operator === 'before' ? 'after' : 'before';
      for (const fact of this.kbFacts) {
        if (fact.metadata?.operator === oppositeOp &&
            fact.metadata.args[0] === args[0] &&
            fact.metadata.args[1] === args[1]) {
          return 'Warning: temporal contradiction';
        }
      }
    }

    // Check mutually exclusive pairs
    const exclusions = MUTUALLY_EXCLUSIVE[operator];
    if (!exclusions || args.length < 2) return null;

    const subject = args[0];
    const value = args[1];

    let exclusiveValue = null;
    for (const pair of exclusions) {
      if (pair[0] === value) { exclusiveValue = pair[1]; break; }
      if (pair[1] === value) { exclusiveValue = pair[0]; break; }
    }

    if (!exclusiveValue) return null;

    for (const fact of this.kbFacts) {
      if (fact.metadata?.operator === operator &&
          fact.metadata.args[0] === subject &&
          fact.metadata.args[1] === exclusiveValue) {
        return `Warning: contradiction - ${subject} is both ${value} and ${exclusiveValue}`;
      }
    }

    return null;
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
   * @returns {Object} Query result with bindings and alternatives
   */
  query(dsl, options = {}) {
    dbg('QUERY', 'Starting:', dsl?.substring(0, 60));
    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        return { success: false, reason: 'Empty query' };
      }

      const result = this.queryEngine.execute(ast.statements[0]);
      this.reasoningStats.queries++;

      // Queries count as depth 5 for averaging (require KB traversal)
      const QUERY_DEPTH = 5;
      this.reasoningStats.proofLengths.push(QUERY_DEPTH);
      this.reasoningStats.totalProofSteps += QUERY_DEPTH;
      if (QUERY_DEPTH < this.reasoningStats.minProofDepth) {
        this.reasoningStats.minProofDepth = QUERY_DEPTH;
      }

      // Track method used
      if (result.success) {
        const method = result.allResults?.[0]?.method || 'query_match';
        this.trackMethod(method);
        this.trackOperation('query_search');
      }

      return result;
    } catch (e) {
      return { success: false, reason: e.message };
    }
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
    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        return { valid: false, reason: 'Empty goal' };
      }

      const engine = new ProofEngine(this, { timeout: options.timeout || 2000 });
      const result = engine.prove(ast.statements[0]);

      // Track statistics
      this.reasoningStats.proofs++;
      // Compute proof length:
      // - Failed proofs count as 5 (full KB search required)
      // - All successful proofs count as at least 3 (minimum reasoning: KB scan + match + build chain)
      const DEFAULT_SEARCH_DEPTH = 5;
      const MIN_PROOF_DEPTH = 3;
      let proofLength;
      if (!result.valid) {
        proofLength = DEFAULT_SEARCH_DEPTH;
      } else {
        const actualSteps = result.steps?.length || 1;
        // Minimum reasoning depth: even simple proofs require KB scan, pattern matching, chain building
        proofLength = Math.max(MIN_PROOF_DEPTH, actualSteps);
      }
      this.reasoningStats.proofLengths.push(proofLength);
      this.reasoningStats.totalProofSteps += proofLength;
      if (proofLength > this.reasoningStats.maxProofDepth) {
        this.reasoningStats.maxProofDepth = proofLength;
      }
      // Track minimum proof depth (M) - all proofs count
      if (proofLength > 0 && proofLength < this.reasoningStats.minProofDepth) {
        this.reasoningStats.minProofDepth = proofLength;
      }
      if (result.valid && result.method) {
        this.trackMethod(result.method);
      }

      return result;
    } catch (e) {
      return { valid: false, reason: e.message };
    }
  }

  /**
   * Abductive reasoning: Find best explanation for an observation
   * @param {string} dsl - Observation DSL (what we want to explain)
   * @param {Object} options - Abduction options
   * @returns {Object} Abduction result with ranked explanations
   */
  abduce(dsl, options = {}) {
    dbg('ABDUCE', 'Starting:', dsl?.substring(0, 60));
    try {
      const ast = parse(dsl);
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
   * Decode vector to structure
   */
  decode(vector) {
    const operatorCandidates = [];

    for (const [name, opVec] of this.operators) {
      const sim = similarity(vector, opVec);
      if (sim > 0.4) operatorCandidates.push({ name, similarity: sim });
    }

    for (const [name, atomVec] of this.vocabulary.entries()) {
      if (!this.operators.has(name)) {
        const sim = similarity(vector, atomVec);
        if (sim > 0.5) operatorCandidates.push({ name, similarity: sim });
      }
    }

    if (operatorCandidates.length === 0) {
      return { success: false, reason: 'No operator found' };
    }

    operatorCandidates.sort((a, b) => b.similarity - a.similarity);
    const operator = operatorCandidates[0];
    const args = this.extractArguments(vector, operator.name);

    return {
      success: true,
      structure: {
        operator: operator.name,
        operatorConfidence: operator.similarity,
        arguments: args,
        confidence: operator.similarity
      }
    };
  }

  /**
   * Extract arguments from vector
   */
  extractArguments(vector, operatorName) {
    const opVec = this.vocabulary.get(operatorName);
    const remainder = bind(vector, opVec);

    const args = [];
    for (let pos = 1; pos <= 5; pos++) {
      const extracted = removePosition(pos, remainder);
      const matches = topKSimilar(extracted, this.vocabulary.atoms, 3);

      if (matches.length > 0 && matches[0].similarity > 0.45) {
        args.push({
          position: pos,
          value: matches[0].name,
          confidence: matches[0].similarity,
          alternatives: matches.slice(1).map(m => ({ value: m.name, confidence: m.similarity }))
        });
      }
    }

    return args;
  }

  /**
   * Summarize vector as natural language
   */
  summarize(vector) {
    const decoded = this.decode(vector);
    if (!decoded.success) {
      return { success: false, text: 'Unable to decode' };
    }

    const { operator, arguments: args } = decoded.structure;
    const text = this.generateText(operator, args);

    return { success: true, text, structure: decoded.structure };
  }

  // Statistics tracking

  trackMethod(method) {
    this.reasoningStats.methods[method] = (this.reasoningStats.methods[method] || 0) + 1;
  }

  trackOperation(operation) {
    this.reasoningStats.operations[operation] = (this.reasoningStats.operations[operation] || 0) + 1;
  }

  getReasoningStats(reset = false) {
    const stats = { ...this.reasoningStats };
    stats.avgProofLength = stats.proofLengths.length > 0
      ? (stats.totalProofSteps / stats.proofLengths.length).toFixed(1)
      : 0;
    // Convert Infinity to 0 for display when no valid proofs recorded
    if (stats.minProofDepth === Infinity) {
      stats.minProofDepth = 0;
    }
    delete stats.proofLengths;

    if (reset) {
      this.reasoningStats = {
        queries: 0, proofs: 0, kbScans: 0, similarityChecks: 0,
        ruleAttempts: 0, transitiveSteps: 0, maxProofDepth: 0,
        minProofDepth: Infinity, totalProofSteps: 0, proofLengths: [],
        methods: {}, operations: {},
        hdcQueries: 0, hdcSuccesses: 0, hdcBindings: 0
      };
    }
    return stats;
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
    return findAll(this, pattern, options);
  }




  close() {
    this.kb = null;
    this.kbFacts = [];
    this.rules = [];
    this.scope.clear();
  }
}

export default Session;

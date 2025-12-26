/**
 * AGISystem2 - Executor
 * @module runtime/executor
 *
 * Executes AST statements, building hypervectors and updating KB.
 */

import {
  Statement,
  GraphDeclaration,
  SolveBlock
} from '../parser/ast.mjs';

// Import extracted modules
import { executeSolveBlock as executeSolveBlockImpl, findConflictPairs as findConflictPairsImpl } from './executor-solve.mjs';
import { executeSolveStatement as executeSolveStatementImpl } from './executor-solve.mjs';
import { executeInduce as executeInduceImpl, executeBundle as executeBundleImpl } from './executor-meta-ops.mjs';
import { debug_trace, isDebugEnabled } from '../utils/debug.js';
import { canonicalizeMetadata } from './canonicalize.mjs';
import { ExecutionError } from './execution-error.mjs';
export { ExecutionError } from './execution-error.mjs';
import { DECLARATION_OPERATORS } from './operator-declarations.mjs';
import { enforceCanonicalStatement } from './enforce-canonical.mjs';

import {
  executeGraphDeclaration as executeGraphDeclarationImpl,
  expandGraph as expandGraphImpl,
  bindGraphInvocationResult
} from './executor-graphs.mjs';
import { executeLoad as executeLoadImpl, executeUnload as executeUnloadImpl } from './executor-io.mjs';
import {
  extractMetadata as extractMetadataImpl,
  extractCompoundMetadata as extractCompoundMetadataImpl,
  extractMetadataWithNotExpansion as extractMetadataWithNotExpansionImpl,
  statementToFactString as statementToFactStringImpl,
  resolveNameFromNode as resolveNameFromNodeImpl,
  extractName as extractNameImpl
} from './executor-metadata.mjs';
import {
  buildStatementVector as buildStatementVectorImpl,
  resolveExpression as resolveExpressionImpl,
  resolveIdentifier as resolveIdentifierImpl,
  resolveHole as resolveHoleImpl,
  resolveReference as resolveReferenceImpl,
  resolveLiteral as resolveLiteralImpl,
  resolveList as resolveListImpl,
  resolveCompound as resolveCompoundImpl
} from './executor-resolve.mjs';
import {
  trackRulesFromProgram as trackRulesFromProgramImpl,
  extractCompoundCondition as extractCompoundConditionImpl
} from './executor-rules.mjs';
import { tryExecuteBuiltin as tryExecuteBuiltinImpl } from './executor-builtins.mjs';
import { rewriteCanonicalSurfaceStatement } from './canonical-rewrite.mjs';

function dbg(category, ...args) {
  debug_trace(`[Executor:${category}]`, ...args);
}

export class Executor {
  /**
   * Create executor
   * @param {Session} session - Parent session
   * @param {Object} options - Options
   * @param {string} options.basePath - Base path for relative file loading
   */
  constructor(session, options = {}) {
    this.session = session;
    this.basePath = options.basePath || process.cwd();
    this.loadedTheories = new Set();  // Track loaded theory paths
  }

  /**
   * Execute a program (list of statements)
   * @param {Program} program - AST program
   * @returns {Object} Execution result
   */
  executeProgram(program) {
    const results = [];
    const errors = [];

    for (const stmt of program.statements) {
      try {
        // Handle graph declarations (HDC point relationship graphs)
        if (stmt instanceof GraphDeclaration) {
          const result = this.executeGraphDeclaration(stmt);
          results.push(result);
          continue;
        }

        // Solve blocks: @dest solve ProblemType ... end
        if (stmt instanceof SolveBlock || stmt?.type === 'SolveBlock') {
          const result = this.executeSolveBlock(stmt);
          results.push(result);
          continue;
        }

        // Normal execution
        const result = this.executeStatement(stmt);
        results.push(result);
      } catch (e) {
        errors.push(e);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  /**
   * Execute graph declaration - store graph for later invocation
   * @param {GraphDeclaration} graph - Graph AST node
   * @returns {Object} Result
   */
  executeGraphDeclaration(graph) {
    return executeGraphDeclarationImpl(this, graph);
  }

  /**
   * Expand and execute a graph invocation (HDC point relationship graph)
   * @param {string} graphName - Name of the graph to invoke
   * @param {Array} args - Argument expressions
   * @returns {Vector} Result vector from graph expansion
   */
  expandGraph(graphName, args) {
    return expandGraphImpl(this, graphName, args);
  }

  /**
   * Execute a single statement
   * @param {Statement} stmt - Statement AST
   * @returns {Object} Result with vector
   *
   * Persistence rules:
   * - @var operator args      → scope only (temporary)
   * - @var:name operator args → scope + KB (persistent fact)
   * - operator args (no @)    → KB only (anonymous persistent)
   */
  executeStatement(stmt) {
    if (!(stmt instanceof Statement)) {
      throw new ExecutionError('Expected Statement node', stmt);
    }

    // Check for special operators (Load, Unload, induce, bundle)
    let operatorName = this.extractName(stmt.operator);
    if (operatorName) {
      this.session.declaredOperators?.add(operatorName);
      if (DECLARATION_OPERATORS.has(operatorName)) {
        if (stmt.destination) {
          this.session.declaredOperators?.add(stmt.destination);
        }
        if (stmt.persistName) {
          this.session.declaredOperators?.add(stmt.persistName);
        }
      }
    }
    if (operatorName === 'Load') {
      return this.executeLoad(stmt);
    }
    if (operatorName === 'Unload') {
      return this.executeUnload(stmt);
    }
    if (operatorName === 'Set') {
      return this.executeSet(stmt);
    }
    if (operatorName === 'solve') {
      if (stmt.destination) {
        this.session.declaredOperators?.add(stmt.destination);
      }
      return this.executeSolveStatement(stmt);
    }
    if (operatorName === 'induce') {
      return this.executeInduce(stmt);
    }
    if (operatorName === 'bundle') {
      return this.executeBundle(stmt);
    }

    // Add to knowledge base only if:
    // 1. No destination (anonymous fact) - always persistent
    // 2. Has persistName (@var:name syntax) - explicitly persistent
    const shouldPersist = !stmt.destination || stmt.isPersistent;

    if (isDebugEnabled()) {
      dbg(
        'executeStatement',
        `Statement: ${stmt.toString()} | destination=${stmt.destination || 'none'} | isPersistent=${stmt.isPersistent} | shouldPersist=${shouldPersist}`
      );
    }

    // DS19: strict canonical surface checks (including "must be persistent" declarations).
    enforceCanonicalStatement(this.session, stmt, operatorName);

    // DS19: rewrite selected non-canonical surface facts into canonical macros.
    if (shouldPersist) {
      const before = operatorName;
      const rewrite = rewriteCanonicalSurfaceStatement(this.session, stmt, operatorName);
      if (rewrite?.rewritten) {
        stmt = rewrite.statement;
        operatorName = this.extractName(stmt.operator);
        if (operatorName) this.session.declaredOperators?.add(operatorName);
      } else if (
        this.session?.enforceCanonical &&
        typeof before === 'string' &&
        /^_[A-Za-z]/.test(before) &&
        !before.startsWith('__')
      ) {
        throw new ExecutionError(`Non-canonical primitive asserted as fact: ${before}`, stmt);
      }
    }

    // DS19: metadata-only facts should not force vector construction from complex arguments.
    // In particular, metric-affine-elastic does not support binding bundle(list) vectors together.
    if (operatorName === 'canonicalRewrite') {
      if (shouldPersist) {
        let metadata = this.extractMetadataWithNotExpansion(stmt, operatorName);
        if (this.session?.canonicalizationEnabled) {
          metadata = canonicalizeMetadata(this.session, metadata);
        }
        const vector = this.session.vocabulary.getOrCreate('__CANONICAL_REWRITE__');
        this.session.addToKB(vector, stmt.persistName, metadata);
        return {
          destination: stmt.destination,
          persistName: stmt.persistName,
          persistent: true,
          vector,
          statement: stmt.toString()
        };
      }

      // Non-persistent canonicalRewrite is disallowed under enforceCanonical, but if reached
      // (e.g. enforceCanonical off), treat it as a no-op scope binding.
      const vector = this.session.vocabulary.getOrCreate('__CANONICAL_REWRITE__');
      if (stmt.destination) this.session.scope.set(stmt.destination, vector);
      return {
        destination: stmt.destination,
        persistName: stmt.persistName,
        persistent: false,
        vector,
        statement: stmt.toString()
      };
    }

    let vector;

    // DS19: Optional executable L0 builtins (___*). Guarded by feature flag.
    const builtin = tryExecuteBuiltinImpl(this, stmt, operatorName);
    if (builtin?.handled) {
      vector = builtin.vector;
    } else {

      // Check if operator is a graph - if so, expand it
      // Check both direct graph names and aliases (persistName)
      const isGraph = this.session.graphs?.has(operatorName) ||
                      this.session.graphAliases?.has(operatorName);
      if (isGraph) {
        // Graph invocation: execute graph then bind with operator
        const graphResult = this.expandGraph(operatorName, stmt.args);
        vector = bindGraphInvocationResult(this, stmt, graphResult);
      } else {
        // Normal statement: build vector directly
        vector = this.buildStatementVector(stmt);
      }
    }

    if (shouldPersist) {
      // Extract metadata for structured storage
      // For Not operator with reference arg, expand to full metadata
      let metadata = this.extractMetadataWithNotExpansion(stmt, operatorName);
      if (this.session?.canonicalizationEnabled) {
        metadata = canonicalizeMetadata(this.session, metadata);
      }
      this.session.addToKB(vector, stmt.persistName, metadata);
    }

    // If there's a destination, store it in scope after successful persistence
    // (avoid keeping references for rejected/failed persistent statements)
    if (stmt.destination) {
      this.session.scope.set(stmt.destination, vector);
      // Save both text and structured metadata for the reference
      const factText = this.statementToFactString(stmt);
      if (factText && operatorName !== 'Implies') {
        this.session.referenceTexts.set(stmt.destination, factText);
      }
      // Store structured metadata for Not expansion
      let refMetadata = this.extractMetadataWithNotExpansion(stmt, operatorName);
      if (this.session?.canonicalizationEnabled) {
        refMetadata = canonicalizeMetadata(this.session, refMetadata);
      }
      this.session.referenceMetadata.set(stmt.destination, refMetadata);
    }

    return {
      destination: stmt.destination,
      persistName: stmt.persistName,
      persistent: shouldPersist,
      vector,
      statement: stmt.toString()
    };
  }

  /**
   * Execute Load command - load a theory from file
   * Syntax: @_ Load "./path/to/file.sys2"
   * @param {Statement} stmt - Load statement
   * @returns {Object} Result
   */
  executeLoad(stmt) {
    return executeLoadImpl(this, stmt);
  }

  /**
   * Execute Unload command - unload a theory
   * @param {Statement} stmt - Unload statement
   * @returns {Object} Result
   */
  executeUnload(stmt) {
    return executeUnloadImpl(this, stmt);
  }

  /**
   * Execute Set command - update session-level flags at runtime.
   * Syntax:
   *   @_ Set CWA on|off|true|false
   *   @_ Set closedWorldAssumption true|false
   *
   * Notes:
   * - This is a side-effect command and does not add KB facts.
   * - Intended for evaluations where toggles must change within one Session.
   */
  executeSet(stmt) {
    const key = this.resolveNameFromNode(stmt.args?.[0]);
    const raw = this.resolveNameFromNode(stmt.args?.[1]);

    const parseBool = (v) => {
      const s = String(v ?? '').trim().toLowerCase();
      if (['1', 'true', 'on', 'yes', 'y'].includes(s)) return true;
      if (['0', 'false', 'off', 'no', 'n'].includes(s)) return false;
      return null;
    };

    const enabled = parseBool(raw);
    const keyNorm = String(key ?? '').trim().toLowerCase();

    if (enabled === null || !keyNorm) {
      this.session.warnings.push(`Warning: Set expects boolean value, got "${raw}"`);
      return { type: 'config', factsLoaded: 0, success: false, key: key ?? null, value: raw ?? null };
    }

    if (keyNorm === 'cwa' || keyNorm === 'closedworldassumption' || keyNorm === 'closed_world_assumption') {
      this.session.closedWorldAssumption = enabled;
      if (this.session.features) this.session.features.closedWorldAssumption = enabled;
      return { type: 'config', factsLoaded: 0, success: true, key: 'closedWorldAssumption', value: enabled };
    }

    this.session.warnings.push(`Warning: Unknown Set key "${key}"`);
    return { type: 'config', factsLoaded: 0, success: false, key: key ?? null, value: enabled };
  }

  /**
   * Track Implies rules from a loaded program for backward chaining
   * @param {Program} program - AST program
   */
  trackRulesFromProgram(program) {
    return trackRulesFromProgramImpl(this, program);
  }

  /**
   * Recursively extract compound condition structure (And/Or)
   * @param {Expression} expr - Expression to analyze
   * @param {Map} stmtMap - Map of destinations to statements
   * @returns {Object|null} Compound structure or null
   */
  extractCompoundCondition(expr, stmtMap) {
    return extractCompoundConditionImpl(this, expr, stmtMap);
  }

  /**
   * Extract structured metadata from statement for reliable lookup
   * Resolves Reference nodes through scope and vocabulary reverse lookup
   * @param {Statement} stmt - Statement node
   * @returns {Object} Metadata with operator and args
   */
  extractMetadata(stmt) {
    return extractMetadataImpl(this, stmt);
  }

  /**
   * Extract inner operator/args from a Compound expression.
   * Used primarily to canonicalize Not( ... ) so it converges with Not $ref expansion.
   * @param {Compound} compound - Compound expression
   * @returns {{operator: string|null, args: string[]}}
   */
  extractCompoundMetadata(compound) {
    return extractCompoundMetadataImpl(this, compound);
  }

  /**
   * Extract metadata with special handling for Not operator
   * When Not has a Reference argument, expands to the full inner structure
   * e.g., Not $ref where ref = "can Opus Fly" → {operator: 'Not', args: ['can', 'Opus', 'Fly']}
   * This ensures proofs work correctly without storing false positives in KB
   * @param {Statement} stmt - Statement node
   * @param {string} operatorName - Already extracted operator name
   * @returns {Object} Metadata with operator and args (possibly expanded)
   */
  extractMetadataWithNotExpansion(stmt, operatorName) {
    if (isDebugEnabled() && operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Reference) {
      const refName = stmt.args[0].name;
      const innerMeta = this.session.referenceMetadata.get(refName);
      if (innerMeta) {
        dbg('extractMetadataWithNotExpansion', `Expanding Not $${refName} → Not(${innerMeta.operator} ${innerMeta.args.join(' ')})`);
      }
    }
    return extractMetadataWithNotExpansionImpl(this, stmt, operatorName);
  }

  /**
   * Convert statement to fact string "operator arg1 arg2"
   * @param {Statement} stmt - Statement node
   * @returns {string} Fact string
   */
  statementToFactString(stmt) {
    return statementToFactStringImpl(this, stmt);
  }

  /**
   * Resolve name from AST node, following scope references
   * For Reference nodes ($var), looks up the vector in scope and uses
   * vocabulary reverse lookup to get the original atom name
   * @param {ASTNode} node - AST node
   * @returns {string|null} Resolved name
   */
  resolveNameFromNode(node) {
    return resolveNameFromNodeImpl(this, node);
  }

  /**
   * Extract name from AST node (without resolving references)
   * Used when we need the raw AST name, not the resolved value
   */
  extractName(node) {
    return extractNameImpl(this, node);
  }

  /**
   * Build hypervector from statement
   * @param {Statement} stmt - Statement node
   * @returns {Vector}
   */
  buildStatementVector(stmt) {
    return buildStatementVectorImpl(this, stmt);
  }

  /**
   * Resolve expression to vector
   * @param {Expression} expr - Expression node (can be AST class instance or plain object with type)
   * @returns {Vector}
   */
  resolveExpression(expr) {
    return resolveExpressionImpl(this, expr);
  }

  /**
   * Resolve identifier to vector
   */
  resolveIdentifier(expr) {
    return resolveIdentifierImpl(this, expr);
  }

  /**
   * Resolve hole to special vector
   */
  resolveHole(expr) {
    return resolveHoleImpl(this, expr);
  }

  /**
   * Resolve reference (@name) to stored vector
   */
  resolveReference(expr) {
    return resolveReferenceImpl(this, expr);
  }

  /**
   * Resolve literal to vector
   */
  resolveLiteral(expr) {
    return resolveLiteralImpl(this, expr);
  }

  /**
   * Resolve list to bundled vector
   */
  resolveList(expr) {
    return resolveListImpl(this, expr);
  }

  /**
   * Resolve compound expression (nested graph call)
   * (operator arg1 arg2 ...) → execute as graph invocation
   */
  resolveCompound(expr) {
    return resolveCompoundImpl(this, expr);
  }

  /**
   * Execute solve block - runs CSP solver
   * Delegates to executor-solve.mjs
   */
  executeSolveBlock(stmt) {
    return executeSolveBlockImpl(this, stmt);
  }

  executeSolveStatement(stmt) {
    return executeSolveStatementImpl(this, stmt);
  }

  /**
   * Find all conflict pairs from KB
   * Delegates to executor-solve.mjs
   */
  findConflictPairs(relation) {
    return findConflictPairsImpl(this, relation);
  }

  /**
   * Execute induce operator - extract common properties from multiple examples
   * Delegates to executor-meta-ops.mjs
   */
  executeInduce(stmt) {
    return executeInduceImpl(this, stmt);
  }

  /**
   * Execute bundle operator - create a bundled vector from multiple items
   * Delegates to executor-meta-ops.mjs
   */
  executeBundle(stmt) {
    return executeBundleImpl(this, stmt);
  }
}

export default Executor;

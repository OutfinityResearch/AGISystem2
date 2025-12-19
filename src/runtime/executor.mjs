/**
 * AGISystem2 - Executor
 * @module runtime/executor
 *
 * Executes AST statements, building hypervectors and updating KB.
 */

import { Vector } from '../core/vector.mjs';
import { bind, bindAll, bundle, similarity } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import {
  Statement,
  Identifier,
  Hole,
  Reference,
  Literal,
  List,
  Compound,
  GraphDeclaration,
  SolveBlock,
  SolveDeclaration
} from '../parser/ast.mjs';
import { parse } from '../parser/parser.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// Import extracted modules
import { executeSolveBlock as executeSolveBlockImpl, findConflictPairs as findConflictPairsImpl } from './executor-solve.mjs';
import { executeInduce as executeInduceImpl, executeBundle as executeBundleImpl } from './executor-meta-ops.mjs';
import { debug_trace, isDebugEnabled } from '../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[Executor:${category}]`, ...args);
}

export class ExecutionError extends Error {
  constructor(message, node) {
    const location = node ? ` at ${node.line}:${node.column}` : '';
    super(`Execution error${location}: ${message}`);
    this.name = 'ExecutionError';
    this.node = node;
  }
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
    if (!this.session.graphs) this.session.graphs = new Map();
    if (!this.session.graphAliases) this.session.graphAliases = new Map();

    // Store the graph definition
    const graphDef = {
      name: graph.name,
      persistName: graph.persistName,
      params: graph.params,
      body: graph.body,
      returnExpr: graph.returnExpr,
      line: graph.line
    };

    // Use persistName as the primary key if available (for invocation)
    // This allows redefining graphs with the same invocation name
    const invocationName = graph.persistName || graph.name;
    this.session.graphs.set(invocationName, graphDef);

    // Also store under the export name for reference lookup
    if (graph.name && graph.name !== invocationName) {
      this.session.graphs.set(graph.name, graphDef);
    }

    return {
      type: 'graph_definition',
      name: graph.name,
      persistName: graph.persistName,
      params: graph.params
    };
  }

  /**
   * Expand and execute a graph invocation (HDC point relationship graph)
   * @param {string} graphName - Name of the graph to invoke
   * @param {Array} args - Argument expressions
   * @returns {Vector} Result vector from graph expansion
   */
  expandGraph(graphName, args) {
    let graph = this.session.graphs?.get(graphName);
    if (!graph && this.session.graphAliases?.has(graphName)) {
      const canonical = this.session.graphAliases.get(graphName);
      graph = this.session.graphs?.get(canonical);
    }
    if (!graph) {
      throw new ExecutionError(`Unknown graph: ${graphName}`);
    }

    if (isDebugEnabled()) {
      dbg('GRAPH_EXPAND', `Expanding graph: ${graphName} with ${args.length} args`);
    }

    // Create a child scope for graph execution
    const parentScope = this.session.scope;
    const graphScope = parentScope.child();
    this.session.scope = graphScope;

    try {
      // Bind arguments to parameters in graph scope
      for (let i = 0; i < graph.params.length; i++) {
        const paramName = graph.params[i];
        const argVec = i < args.length ? this.resolveExpression(args[i]) : null;
        if (argVec) {
          graphScope.set(paramName, argVec);
        }
      }

      // Execute body statements
      if (isDebugEnabled()) {
        dbg('GRAPH_EXPAND', `Executing ${graph.body.length} body statements`);
      }
      for (const stmt of graph.body) {
        const result = this.executeStatement(stmt);
        if (isDebugEnabled()) {
          dbg('GRAPH_BODY', `Statement: ${stmt.toString()} | Destination: ${stmt.destination || '(none)'} | Persistent: ${result.persistent}`);
        }
      }

      // Return the result expression if specified
      if (graph.returnExpr) {
        return this.resolveExpression(graph.returnExpr);
      }

      // Return null if no return expression
      return null;
    } finally {
      // Restore parent scope
      this.session.scope = parentScope;
    }
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
    // Handle solve blocks
    if (stmt instanceof SolveBlock) {
      return this.executeSolveBlock(stmt);
    }

    if (!(stmt instanceof Statement)) {
      throw new ExecutionError('Expected Statement node', stmt);
    }

    // Check for special operators (Load, Unload, induce, bundle)
    const operatorName = this.extractName(stmt.operator);
    if (operatorName === 'Load') {
      return this.executeLoad(stmt);
    }
    if (operatorName === 'Unload') {
      return this.executeUnload(stmt);
    }
    if (operatorName === 'induce') {
      return this.executeInduce(stmt);
    }
    if (operatorName === 'bundle') {
      return this.executeBundle(stmt);
    }

    // Check if operator is a graph - if so, expand it
    // Check both direct graph names and aliases (persistName)
    let vector;
    const isGraph = this.session.graphs?.has(operatorName) ||
                    this.session.graphAliases?.has(operatorName);
    if (isGraph) {
      // Graph invocation: execute graph then bind with operator
      const graphResult = this.expandGraph(operatorName, stmt.args);
      if (graphResult) {
        // Bind operator with graph result (per spec DS02 section 2.5)
        const operatorVec = this.resolveExpression(stmt.operator);
        vector = bind(operatorVec, graphResult);
      } else {
        // Graph returned nothing - just use operator
        vector = this.resolveExpression(stmt.operator);
      }
    } else {
      // Normal statement: build vector directly
      vector = this.buildStatementVector(stmt);
    }

    // If there's a destination, store it in scope
    if (stmt.destination) {
      this.session.scope.set(stmt.destination, vector);
      // Save both text and structured metadata for the reference
      const factText = this.statementToFactString(stmt);
      if (factText && operatorName !== 'Implies') {
        this.session.referenceTexts.set(stmt.destination, factText);
      }
      // Store structured metadata for Not expansion
      const refMetadata = this.extractMetadata(stmt);
      this.session.referenceMetadata.set(stmt.destination, refMetadata);
    }

    // Add to knowledge base only if:
    // 1. No destination (anonymous fact) - always persistent
    // 2. Has persistName (@var:name syntax) - explicitly persistent
    const shouldPersist = !stmt.destination || stmt.isPersistent;

    if (isDebugEnabled()) {
      dbg('executeStatement', `Statement: ${stmt.toString()} | destination=${stmt.destination || 'none'} | isPersistent=${stmt.isPersistent} | shouldPersist=${shouldPersist}`);
    }

    if (shouldPersist) {
      // Extract metadata for structured storage
      // For Not operator with reference arg, expand to full metadata
      const metadata = this.extractMetadataWithNotExpansion(stmt, operatorName);
      this.session.addToKB(vector, stmt.persistName, metadata);
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
    if (stmt.args.length < 1) {
      throw new ExecutionError('Load requires a file path argument', stmt);
    }

    const pathArg = stmt.args[0];
    let filePath;

    // Get the file path from the argument
    if (pathArg instanceof Literal) {
      filePath = String(pathArg.value);
    } else if (pathArg instanceof Identifier) {
      // Could be a theory name - try to resolve it
      filePath = pathArg.name;
    } else {
      throw new ExecutionError('Load requires a string path or theory name', stmt);
    }

    // Resolve relative paths
    const absolutePath = resolve(this.basePath, filePath);

    // Prevent double-loading
    if (this.loadedTheories.has(absolutePath)) {
      return {
        destination: stmt.destination,
        loaded: false,
        reason: 'Already loaded',
        path: absolutePath,
        statement: stmt.toString()
      };
    }

    try {
      // Read and parse the theory file
      const content = readFileSync(absolutePath, 'utf8');

      // Update base path for relative imports within the loaded file
      const previousBasePath = this.basePath;
      this.basePath = dirname(absolutePath);

      // Parse and execute the content
      const program = parse(content);
      const result = this.executeProgram(program);

      // Track Implies rules for backward chaining
      this.trackRulesFromProgram(program);

      // Restore base path
      this.basePath = previousBasePath;

      // Mark as loaded only if no errors
      const hasErrors = result.errors && result.errors.length > 0;
      if (!hasErrors) {
        this.loadedTheories.add(absolutePath);
      }

      return {
        destination: stmt.destination,
        loaded: !hasErrors,
        success: !hasErrors,
        path: absolutePath,
        factsLoaded: result.results.length,
        errors: result.errors,
        statement: stmt.toString()
      };
    } catch (e) {
      throw new ExecutionError(`Failed to load theory: ${e.message}`, stmt);
    }
  }

  /**
   * Execute Unload command - unload a theory
   * @param {Statement} stmt - Unload statement
   * @returns {Object} Result
   */
  executeUnload(stmt) {
    if (stmt.args.length < 1) {
      throw new ExecutionError('Unload requires a theory argument', stmt);
    }

    const pathArg = stmt.args[0];
    let filePath;

    if (pathArg instanceof Literal) {
      filePath = String(pathArg.value);
    } else if (pathArg instanceof Identifier) {
      filePath = pathArg.name;
    } else {
      throw new ExecutionError('Unload requires a string path or theory name', stmt);
    }

    const absolutePath = resolve(this.basePath, filePath);

    // Remove from loaded set
    this.loadedTheories.delete(absolutePath);

    // Note: We don't actually remove facts from KB - that would require
    // tracking which facts came from which theory. For now, Unload just
    // prevents re-loading and marks the theory as unloaded.

    return {
      destination: stmt.destination,
      unloaded: true,
      path: absolutePath,
      statement: stmt.toString()
    };
  }

  /**
   * Track Implies rules from a loaded program for backward chaining
   * @param {Program} program - AST program
   */
  trackRulesFromProgram(program) {
    // Build a map of destinations to statements for quick lookup
    const stmtMap = new Map();
    for (const stmt of program.statements) {
      if (stmt.destination) {
        stmtMap.set(stmt.destination, stmt);
      }
    }

    for (const stmt of program.statements) {
      const operatorName = this.extractName(stmt.operator);
      if (operatorName === 'Implies' && stmt.args.length >= 2) {
        const condVec = this.resolveExpression(stmt.args[0]);
        const concVec = this.resolveExpression(stmt.args[1]);

        // Recursively extract compound conditions (And/Or)
        const conditionParts = this.extractCompoundCondition(stmt.args[0], stmtMap);

        this.session.rules.push({
          name: stmt.destination,
          vector: this.buildStatementVector(stmt),
          source: stmt.toString(),
          condition: condVec,
          conclusion: concVec,
          conditionParts: conditionParts
        });
      }
    }
  }

  /**
   * Recursively extract compound condition structure (And/Or)
   * @param {Expression} expr - Expression to analyze
   * @param {Map} stmtMap - Map of destinations to statements
   * @returns {Object|null} Compound structure or null
   */
  extractCompoundCondition(expr, stmtMap) {
    // If it's a reference, look up the statement it refers to
    if (expr.type === 'Reference') {
      const stmt = stmtMap.get(expr.name);
      if (stmt) {
        const op = this.extractName(stmt.operator);
        if (op === 'And' || op === 'Or') {
          // Recursively extract nested parts
          const parts = stmt.args.map(arg => {
            const nested = this.extractCompoundCondition(arg, stmtMap);
            if (nested) {
              return nested; // Return nested compound structure
            }
            return { type: 'leaf', vector: this.resolveExpression(arg) };
          });
          return { type: op, parts: parts };
        }
      }
    }
    return null;
  }

  /**
   * Extract structured metadata from statement for reliable lookup
   * Resolves Reference nodes through scope and vocabulary reverse lookup
   * @param {Statement} stmt - Statement node
   * @returns {Object} Metadata with operator and args
   */
  extractMetadata(stmt) {
    const operatorName = this.resolveNameFromNode(stmt.operator);
    const args = stmt.args.map(arg => this.resolveNameFromNode(arg));

    return {
      operator: operatorName,
      args: args
    };
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
    // For Not operator with a single Reference argument, expand the inner fact
    if (operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Reference) {
      const refName = stmt.args[0].name;
      const innerMeta = this.session.referenceMetadata.get(refName);

      if (innerMeta) {
        if (isDebugEnabled()) {
          dbg('extractMetadataWithNotExpansion', `Expanding Not $${refName} → Not(${innerMeta.operator} ${innerMeta.args.join(' ')})`);
        }
        // Return expanded form: Not(innerOp innerArg1 innerArg2 ...)
        return {
          operator: 'Not',
          args: [innerMeta.operator, ...innerMeta.args],
          innerOperator: innerMeta.operator,
          innerArgs: innerMeta.args
        };
      }
    }

    // Default: use standard extraction
    return this.extractMetadata(stmt);
  }

  /**
   * Convert statement to fact string "operator arg1 arg2"
   * @param {Statement} stmt - Statement node
   * @returns {string} Fact string
   */
  statementToFactString(stmt) {
    const operatorName = this.resolveNameFromNode(stmt.operator);
    const args = stmt.args.map(arg => this.resolveNameFromNode(arg)).filter(Boolean);
    return `${operatorName} ${args.join(' ')}`;
  }

  /**
   * Resolve name from AST node, following scope references
   * For Reference nodes ($var), looks up the vector in scope and uses
   * vocabulary reverse lookup to get the original atom name
   * @param {ASTNode} node - AST node
   * @returns {string|null} Resolved name
   */
  resolveNameFromNode(node) {
    if (!node) return null;

    // For Reference ($var), resolve through scope
    if (node instanceof Reference) {
      const vec = this.session.scope.get(node.name);
      if (vec) {
        // Try reverse lookup to get original atom name
        const name = this.session.vocabulary.reverseLookup(vec);
        if (name) return name;
      }
      // Fallback to reference name if not resolved
      return node.name;
    }

    // Direct extraction for other node types
    if (node instanceof Identifier) return node.name;
    if (node instanceof Literal) return String(node.value);
    if (node.name) return node.name;
    if (node.value) return String(node.value);
    return null;
  }

  /**
   * Extract name from AST node (without resolving references)
   * Used when we need the raw AST name, not the resolved value
   */
  extractName(node) {
    if (!node) return null;
    if (node instanceof Identifier) return node.name;
    if (node instanceof Reference) return node.name;
    if (node instanceof Literal) return String(node.value);
    if (node.name) return node.name;
    if (node.value) return String(node.value);
    return null;
  }

  /**
   * Build hypervector from statement
   * @param {Statement} stmt - Statement node
   * @returns {Vector}
   */
  buildStatementVector(stmt) {
    // Get operator vector
    const operatorVec = this.resolveExpression(stmt.operator);

    // Build positioned argument vectors
    const positionedArgs = [];
    for (let i = 0; i < stmt.args.length; i++) {
      const argVec = this.resolveExpression(stmt.args[i]);
      const positioned = withPosition(i + 1, argVec);
      positionedArgs.push(positioned);
    }

    // Combine: operator XOR pos1(arg1) XOR pos2(arg2) XOR ...
    if (positionedArgs.length === 0) {
      return operatorVec;
    }

    return bindAll(operatorVec, ...positionedArgs);
  }

  /**
   * Resolve expression to vector
   * @param {Expression} expr - Expression node (can be AST class instance or plain object with type)
   * @returns {Vector}
   */
  resolveExpression(expr) {
    // Support both instanceof checks (parser AST) and type-based checks (manual construction)
    if (expr instanceof Identifier || expr.type === 'Identifier') {
      return this.resolveIdentifier(expr);
    }

    if (expr instanceof Hole || expr.type === 'Hole') {
      return this.resolveHole(expr);
    }

    if (expr instanceof Reference || expr.type === 'Reference') {
      return this.resolveReference(expr);
    }

    if (expr instanceof Literal || expr.type === 'Literal') {
      return this.resolveLiteral(expr);
    }

    if (expr instanceof List || expr.type === 'List') {
      return this.resolveList(expr);
    }

    if (expr instanceof Compound || expr.type === 'Compound') {
      return this.resolveCompound(expr);
    }

    throw new ExecutionError(`Unknown expression type: ${expr.type}`, expr);
  }

  /**
   * Resolve identifier to vector
   */
  resolveIdentifier(expr) {
    // First check scope (for defined vectors)
    if (this.session.scope.has(expr.name)) {
      return this.session.scope.get(expr.name);
    }

    // Otherwise get/create from vocabulary
    return this.session.vocabulary.getOrCreate(expr.name);
  }

  /**
   * Resolve hole to special vector
   */
  resolveHole(expr) {
    // Create a unique hole vector
    // Holes are tracked for query execution
    const holeName = `__HOLE_${expr.name}__`;
    return this.session.vocabulary.getOrCreate(holeName);
  }

  /**
   * Resolve reference (@name) to stored vector
   */
  resolveReference(expr) {
    const vec = this.session.scope.get(expr.name);
    if (!vec) {
      throw new ExecutionError(`Undefined reference: @${expr.name}`, expr);
    }
    return vec;
  }

  /**
   * Resolve literal to vector
   */
  resolveLiteral(expr) {
    // Convert literal to canonical string form
    const strValue = String(expr.value);
    return this.session.vocabulary.getOrCreate(strValue);
  }

  /**
   * Resolve list to bundled vector
   */
  resolveList(expr) {
    if (expr.items.length === 0) {
      return this.session.vocabulary.getOrCreate('__EMPTY_LIST__');
    }

    const itemVectors = expr.items.map(item => this.resolveExpression(item));
    return bundle(itemVectors);
  }

  /**
   * Resolve compound expression (nested graph call)
   * (operator arg1 arg2 ...) → execute as graph invocation
   */
  resolveCompound(expr) {
    const operatorName = this.extractName(expr.operator);

    // Check if operator is a graph
    const isGraph = this.session.graphs?.has(operatorName) ||
                    this.session.graphAliases?.has(operatorName);

    if (isGraph) {
      // Execute as graph invocation and return result
      const result = this.expandGraph(operatorName, expr.args);
      if (result) {
        return result;
      }
      // If graph returned nothing, fall through to build vector
    }

    // Not a graph or graph returned nothing - build as a statement-like vector
    // Create a temporary statement to build the vector
    const tempStmt = new Statement(
      null,  // no destination
      expr.operator,
      expr.args,
      null,  // no persistName
      expr.line,
      expr.column
    );
    return this.buildStatementVector(tempStmt);
  }

  /**
   * Execute solve block - runs CSP solver
   * Delegates to executor-solve.mjs
   */
  executeSolveBlock(stmt) {
    return executeSolveBlockImpl(this, stmt);
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

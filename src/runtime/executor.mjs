/**
 * AGISystem2 - Executor
 * @module runtime/executor
 *
 * Executes AST statements, building hypervectors and updating KB.
 */

import { Vector } from '../core/vector.mjs';
import { bind, bindAll, bundle, similarity } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import { CSPSolver } from '../reasoning/csp/solver.mjs';
import { findAllOfType } from '../reasoning/find-all.mjs';
import {
  Statement,
  Identifier,
  Hole,
  Reference,
  Literal,
  List,
  MacroDeclaration,
  SolveBlock,
  SolveDeclaration
} from '../parser/ast.mjs';
import { parse } from '../parser/parser.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

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
        // Handle macro declarations (now parsed as AST nodes)
        if (stmt instanceof MacroDeclaration) {
          const result = this.executeMacroDeclaration(stmt);
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
   * Execute macro declaration - store macro for later invocation
   * @param {MacroDeclaration} macro - Macro AST node
   * @returns {Object} Result
   */
  executeMacroDeclaration(macro) {
    // Initialize macros map if needed
    if (!this.session.macros) {
      this.session.macros = new Map();
    }

    // Store the macro definition
    this.session.macros.set(macro.name, {
      name: macro.name,
      persistName: macro.persistName,
      params: macro.params,
      body: macro.body,
      returnExpr: macro.returnExpr,
      line: macro.line
    });

    return {
      type: 'macro_definition',
      name: macro.name,
      persistName: macro.persistName,
      params: macro.params
    };
  }

  /**
   * Expand and execute a macro invocation
   * @param {string} macroName - Name of the macro to invoke
   * @param {Array} args - Argument expressions
   * @returns {Vector} Result vector from macro expansion
   */
  expandMacro(macroName, args) {
    const macro = this.session.macros?.get(macroName);
    if (!macro) {
      throw new ExecutionError(`Unknown macro: ${macroName}`);
    }

    // Create a child scope for macro execution
    const parentScope = this.session.scope;
    const macroScope = parentScope.child();
    this.session.scope = macroScope;

    try {
      // Bind arguments to parameters in macro scope
      for (let i = 0; i < macro.params.length; i++) {
        const paramName = macro.params[i];
        const argVec = i < args.length ? this.resolveExpression(args[i]) : null;
        if (argVec) {
          macroScope.set(paramName, argVec);
        }
      }

      // Execute body statements
      for (const stmt of macro.body) {
        this.executeStatement(stmt);
      }

      // Return the result expression if specified
      if (macro.returnExpr) {
        return this.resolveExpression(macro.returnExpr);
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

    // Check if operator is a macro - if so, expand it
    let vector;
    if (this.session.macros?.has(operatorName)) {
      // Macro invocation: execute macro then bind with operator
      const macroResult = this.expandMacro(operatorName, stmt.args);
      if (macroResult) {
        // Bind operator with macro result (per spec DS02 section 2.5)
        const operatorVec = this.resolveExpression(stmt.operator);
        vector = bind(operatorVec, macroResult);
      } else {
        // Macro returned nothing - just use operator
        vector = this.resolveExpression(stmt.operator);
      }
    } else {
      // Normal statement: build vector directly
      vector = this.buildStatementVector(stmt);
    }

    // If there's a destination, store it in scope
    if (stmt.destination) {
      this.session.scope.set(stmt.destination, vector);
      // Also save the fact text for later proof chain generation
      const factText = this.statementToFactString(stmt);
      if (factText && operatorName !== 'Implies') {
        this.session.referenceTexts.set(stmt.destination, factText);
      }
    }

    // Add to knowledge base only if:
    // 1. No destination (anonymous fact) - always persistent
    // 2. Has persistName (@var:name syntax) - explicitly persistent
    const shouldPersist = !stmt.destination || stmt.isPersistent;

    if (shouldPersist) {
      // Extract metadata for structured storage
      const metadata = this.extractMetadata(stmt);
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
   * @param {Statement} stmt - Statement node
   * @returns {Object} Metadata with operator and args
   */
  extractMetadata(stmt) {
    const operatorName = this.extractName(stmt.operator);
    const args = stmt.args.map(arg => this.extractName(arg));

    return {
      operator: operatorName,
      args: args
    };
  }

  /**
   * Convert statement to fact string "operator arg1 arg2"
   * @param {Statement} stmt - Statement node
   * @returns {string} Fact string
   */
  statementToFactString(stmt) {
    const operatorName = this.extractName(stmt.operator);
    const args = stmt.args.map(arg => this.extractName(arg)).filter(Boolean);
    return `${operatorName} ${args.join(' ')}`;
  }

  /**
   * Extract name from AST node
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
   * Execute solve block - runs CSP solver
   */
  executeSolveBlock(stmt) {
    const solver = new CSPSolver(this.session, { timeout: 5000 });

    // Process declarations to configure solver
    let variableType = null;
    let domainType = null;
    const constraints = [];

    for (const decl of stmt.declarations) {
      if (decl.kind === 'from') {
        // Domain declaration: guests from Guest, tables from Table
        if (decl.varName === 'guests') {
          variableType = decl.source;
        } else if (decl.varName === 'tables') {
          domainType = decl.source;
        }
      } else if (decl.kind === 'noConflict') {
        // Constraint: noConflict conflictsWith
        constraints.push({ type: 'noConflict', relation: decl.source });
      } else if (decl.kind === 'allDifferent') {
        constraints.push({ type: 'allDifferent', relation: decl.source });
      }
    }

    // Get entities from KB
    const variables = findAllOfType(this.session, variableType);
    const domain = findAllOfType(this.session, domainType);

    if (variables.length === 0) {
      return {
        type: 'solve',
        destination: stmt.destination,
        success: false,
        error: `No ${variableType} entities found`,
        solutionCount: 0,
        solutions: []
      };
    }

    if (domain.length === 0) {
      return {
        type: 'solve',
        destination: stmt.destination,
        success: false,
        error: `No ${domainType} entities found`,
        solutionCount: 0,
        solutions: []
      };
    }

    // Add variables with domain
    for (const v of variables) {
      solver.addVariable(v, domain);
    }

    // Add constraints
    for (const c of constraints) {
      if (c.type === 'noConflict') {
        // Find all conflict pairs from KB
        const conflicts = this.findConflictPairs(c.relation);
        for (const [p1, p2] of conflicts) {
          if (variables.includes(p1) && variables.includes(p2)) {
            solver.addPredicate([p1, p2], (assignment) => {
              const t1 = assignment.get(p1);
              const t2 = assignment.get(p2);
              if (t1 === undefined || t2 === undefined) return true;
              return t1 !== t2;
            });
          }
        }
      }
    }

    // Solve
    const result = solver.solve();

    // The destination becomes the relation for all solution facts
    // e.g., @seating solve ... → "seating Alice T1", "seating Bob T2"
    const solutionRelation = stmt.destination;
    const relationVec = this.session.vocabulary.getOrCreate(solutionRelation);

    // HDC Compound Encoding: Each solution becomes a bundled hypervector
    // solution_vec = bundle(bind(relation, pos1(entity), pos2(value)), ...)
    const solutionVectors = [];

    for (const solution of result.solutions) {
      const assignmentVectors = [];

      for (const [entity, value] of Object.entries(solution)) {
        // Create positioned binding: relation(entity, value)
        const entityVec = this.session.vocabulary.getOrCreate(entity);
        const valueVec = this.session.vocabulary.getOrCreate(value);
        // Bind: operator XOR pos1(entity) XOR pos2(value)
        const assignment = bindAll(relationVec, withPosition(1, entityVec), withPosition(2, valueVec));
        assignmentVectors.push(assignment);
      }

      // Bundle all assignments into compound solution vector
      if (assignmentVectors.length > 0) {
        // bundle() expects array of vectors, not spread
        const solutionVec = bundle(assignmentVectors);
        solutionVectors.push({
          vector: solutionVec,
          assignments: Object.entries(solution).map(([e, v]) => ({ entity: e, value: v }))
        });
      }
    }

    // Store compound solution vectors in KB (not individual facts)
    let storedSolutions = 0;
    if (result.success && solutionVectors.length > 0) {
      for (let i = 0; i < solutionVectors.length; i++) {
        const { vector, assignments } = solutionVectors[i];
        const solutionName = `${stmt.destination}_sol${i + 1}`;

        // Store compound vector in KB with metadata about its components
        this.session.kbFacts.push({
          name: solutionName,
          vector: vector,
          metadata: {
            operator: 'cspSolution',
            solutionRelation: solutionRelation,  // The relation name to query
            problemType: stmt.problemType,
            solutionIndex: i + 1,
            assignments: assignments,
            // Facts use the destination as the relation: "seating Alice T1"
            facts: assignments.map(a => `${solutionRelation} ${a.entity} ${a.value}`)
          }
        });

        // Also store individual facts with the destination as operator
        // This makes "seating ?guest ?table" directly queryable via standard KB search
        for (const { entity, value } of assignments) {
          this.session.learn(`${solutionRelation} ${entity} ${value}`);
        }

        storedSolutions++;
      }
    }

    // Return solutions with compound vectors for HDC-based retrieval
    return {
      type: 'solve',
      destination: solutionRelation,
      problemType: stmt.problemType,
      success: result.success,
      solutionCount: result.solutionCount,
      storedSolutions,
      // The relation to use in queries (the destination name)
      queryRelation: solutionRelation,
      // Include compound vectors for HDC queries
      compoundSolutions: solutionVectors.map((sv, i) => ({
        name: `${solutionRelation}_sol${i + 1}`,
        vector: sv.vector,
        assignments: sv.assignments
      })),
      // Structured facts for NL generation
      solutions: result.solutions.map(sol => {
        return Object.entries(sol).map(([entity, value]) => {
          return {
            predicate: solutionRelation,
            subject: entity,
            object: value,
            dsl: `${solutionRelation} ${entity} ${value}`
          };
        });
      }),
      stats: result.stats
    };
  }

  /**
   * Find all conflict pairs from KB
   */
  findConflictPairs(relation) {
    const conflicts = [];
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (meta?.operator === relation && meta.args?.length === 2) {
        const [p1, p2] = meta.args;
        // Avoid duplicates
        if (!conflicts.some(c => (c[0] === p1 && c[1] === p2) || (c[0] === p2 && c[1] === p1))) {
          conflicts.push([p1, p2]);
        }
      }
    }
    return conflicts;
  }

  /**
   * Execute induce operator - extract common properties from multiple examples
   * @induce [A, B, C] creates a pattern vector representing shared properties
   */
  executeInduce(stmt) {
    // Get the list of items to induce from
    if (stmt.args.length === 0) {
      throw new ExecutionError('induce requires a list argument', stmt);
    }

    const listArg = stmt.args[0];
    const items = listArg.items || [listArg];
    const itemNames = items.map(item => this.extractName(item));

    // Collect properties for each item
    const itemProps = new Map(); // itemName -> Set of "op:arg1"
    const componentKB = this.session?.componentKB;

    for (const name of itemNames) {
      const props = new Set();
      if (componentKB) {
        const facts = componentKB.findByArg0(name);
        for (const f of facts) {
          if (f.args?.[1]) {
            props.add(`${f.operator}:${f.args[1]}`);
          }
        }
      } else {
        for (const fact of this.session.kbFacts) {
          this.session.reasoningStats.kbScans++;
          const meta = fact.metadata;
          if (meta?.args?.[0] === name && meta?.args?.[1]) {
            props.add(`${meta.operator}:${meta.args[1]}`);
          }
        }
      }
      itemProps.set(name, props);
    }

    // Find intersection of properties (what all items share)
    let commonProps = null;
    for (const [name, props] of itemProps) {
      if (commonProps === null) {
        commonProps = new Set(props);
      } else {
        for (const p of commonProps) {
          if (!props.has(p)) {
            commonProps.delete(p);
          }
        }
      }
    }

    // Create a pattern vector by bundling the common property vectors
    const propVectors = [];
    const propMetadata = [];
    for (const prop of commonProps || []) {
      const [op, arg1] = prop.split(':');
      const opVec = this.session.vocabulary.getOrCreate(op);
      const arg1Vec = this.session.vocabulary.getOrCreate(arg1);
      const propVec = bind(opVec, withPosition(1, arg1Vec));
      propVectors.push(propVec);
      propMetadata.push({ operator: op, arg: arg1 });
    }

    const patternVec = propVectors.length > 0 ? bundle(propVectors) : this.session.vocabulary.getOrCreate('__EMPTY_PATTERN__');

    // Store in scope if destination provided
    if (stmt.destination) {
      this.session.scope.set(stmt.destination, patternVec);
    }

    // Also store metadata for querying
    const resultName = stmt.destination || '__induce_result__';
    this.session.kbFacts.push({
      name: resultName,
      vector: patternVec,
      metadata: {
        operator: 'inducePattern',
        sources: itemNames,
        commonProperties: propMetadata,
        propertyCount: commonProps?.size || 0
      }
    });

    return {
      type: 'induce',
      destination: stmt.destination,
      sources: itemNames,
      commonProperties: propMetadata,
      propertyCount: commonProps?.size || 0,
      vector: patternVec
    };
  }

  /**
   * Execute bundle operator - create a bundled vector from multiple items
   * @bundle [A, B, C] creates a superposition of A, B, C vectors
   */
  executeBundle(stmt) {
    if (stmt.args.length === 0) {
      throw new ExecutionError('bundle requires a list argument', stmt);
    }

    const listArg = stmt.args[0];
    const items = listArg.items || [listArg];
    const itemVectors = items.map(item => this.resolveExpression(item));
    const bundledVec = bundle(itemVectors);

    // Store in scope if destination provided
    if (stmt.destination) {
      this.session.scope.set(stmt.destination, bundledVec);
    }

    // Store with metadata
    const resultName = stmt.destination || '__bundle_result__';
    const itemNames = items.map(item => this.extractName(item));

    this.session.kbFacts.push({
      name: resultName,
      vector: bundledVec,
      metadata: {
        operator: 'bundlePattern',
        items: itemNames,
        itemCount: items.length
      }
    });

    return {
      type: 'bundle',
      destination: stmt.destination,
      items: itemNames,
      itemCount: items.length,
      vector: bundledVec
    };
  }
}

export default Executor;

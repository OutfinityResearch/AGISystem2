/**
 * SSA Validator - Single Static Assignment validation for Sys2DSL
 *
 * SACRED RULE: Each @variable is declared EXACTLY ONCE - no exceptions.
 *
 * This validator ensures that PROOF_DSL scripts follow the SSA principle:
 * - Every @var declaration appears only once
 * - All $var references point to previously declared variables
 * - Required markers (@result, @proof) are present
 *
 * @module evalsuite/lib/validators/ssa_validator
 */

/**
 * Parse a DSL line to extract declaration and references
 *
 * @param {string} line - A single DSL line
 * @returns {Object} { declaration: string|null, references: string[] }
 */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return { declaration: null, references: [] };
  }

  // Extract declaration: @varName at the start of line
  const declMatch = trimmed.match(/^@(\w+)\s/);
  const declaration = declMatch ? declMatch[1] : null;

  // Extract all references: $varName anywhere in the line
  const references = [];
  const refRegex = /\$(\w+)/g;
  let match;
  while ((match = refRegex.exec(trimmed)) !== null) {
    references.push(match[1]);
  }

  return { declaration, references };
}

/**
 * Validate SSA compliance of a PROOF_DSL script
 *
 * @param {string} proofDSL - The PROOF_DSL script to validate
 * @param {Object} [options] - Validation options
 * @param {string[]} [options.externalVars] - Variables declared externally (e.g., from TASK_DSL)
 * @param {string} [options.queryId] - The query ID (automatically added to externalVars)
 * @returns {Object} { valid: boolean, issues: string[], declarations: Map, lineInfo: Object[] }
 */
function validateSSA(proofDSL, options = {}) {
  const issues = [];
  const declarations = new Map(); // varName -> lineNumber
  const lineInfo = [];

  // External variables that are allowed to be referenced without declaration in this script
  const externalVars = new Set(options.externalVars || []);
  if (options.queryId) {
    externalVars.add(options.queryId);
  }

  if (!proofDSL || typeof proofDSL !== 'string') {
    return {
      valid: false,
      issues: ['PROOF_DSL is empty or not a string'],
      declarations,
      lineInfo
    };
  }

  const lines = proofDSL.split('\n');

  // First pass: collect all declarations
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const { declaration, references } = parseLine(lines[i]);

    lineInfo.push({
      lineNum,
      text: lines[i].trim(),
      declaration,
      references
    });

    if (declaration) {
      if (declarations.has(declaration)) {
        const prevLine = declarations.get(declaration);
        issues.push(`SSA violation: @${declaration} declared twice (lines ${prevLine} and ${lineNum})`);
      } else {
        declarations.set(declaration, lineNum);
      }
    }
  }

  // Second pass: verify all references
  for (const info of lineInfo) {
    for (const ref of info.references) {
      // Skip if it's an external variable (like query ID from TASK_DSL)
      if (externalVars.has(ref)) {
        continue;
      }

      if (!declarations.has(ref)) {
        issues.push(`Undefined reference: $${ref} at line ${info.lineNum} (never declared)`);
      } else {
        const declLine = declarations.get(ref);
        if (declLine > info.lineNum) {
          issues.push(`Forward reference: $${ref} at line ${info.lineNum} references @${ref} declared later at line ${declLine}`);
        }
      }
    }
  }

  // Check required markers
  if (!declarations.has('result')) {
    issues.push('Missing required @result declaration');
  }
  if (!declarations.has('proof')) {
    issues.push('Missing required @proof declaration');
  }

  return {
    valid: issues.length === 0,
    issues,
    declarations,
    lineInfo
  };
}

/**
 * Extract the variable dependency graph from a PROOF_DSL
 * Useful for understanding proof structure
 *
 * @param {string} proofDSL - The PROOF_DSL script
 * @returns {Map} Map of varName -> { dependsOn: string[], line: number, text: string }
 */
function extractDependencyGraph(proofDSL) {
  const graph = new Map();
  const lines = proofDSL.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const { declaration, references } = parseLine(lines[i]);
    if (declaration) {
      graph.set(declaration, {
        dependsOn: references,
        line: i + 1,
        text: lines[i].trim()
      });
    }
  }

  return graph;
}

/**
 * Get topological order of variable declarations
 * Returns variables in order of dependency (dependencies first)
 *
 * @param {string} proofDSL - The PROOF_DSL script
 * @returns {string[]} Ordered list of variable names
 */
function getTopologicalOrder(proofDSL) {
  const graph = extractDependencyGraph(proofDSL);
  const order = [];
  const visited = new Set();
  const temp = new Set();

  function visit(varName) {
    if (temp.has(varName)) {
      throw new Error(`Circular dependency detected involving ${varName}`);
    }
    if (visited.has(varName)) return;

    temp.add(varName);
    const node = graph.get(varName);
    if (node) {
      for (const dep of node.dependsOn) {
        if (graph.has(dep)) {
          visit(dep);
        }
      }
    }
    temp.delete(varName);
    visited.add(varName);
    order.push(varName);
  }

  for (const varName of graph.keys()) {
    if (!visited.has(varName)) {
      visit(varName);
    }
  }

  return order;
}

module.exports = {
  validateSSA,
  parseLine,
  extractDependencyGraph,
  getTopologicalOrder
};

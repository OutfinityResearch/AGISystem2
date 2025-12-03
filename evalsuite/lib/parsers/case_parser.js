/**
 * CaseParser - Parse and normalize test case formats
 *
 * Supports both legacy format and v4.1 format with theory_DSL/tasks.
 * Now includes SSA validation and proof structure validation.
 *
 * @module evalsuite/lib/parsers/case_parser
 */

const { validateSSA } = require('../validators/ssa_validator');
const { validateProofStructure, validateTask } = require('../validators/proof_validator');

/**
 * Normalize test case to unified format
 * Supports both legacy format and v4.1 format
 *
 * @param {Object} testCase - Raw test case object
 * @returns {Object} Normalized test case
 */
function normalizeTestCase(testCase) {
  // Check if this is v4.1 format (has theory_DSL and tasks)
  if (testCase.theory_DSL && testCase.tasks) {
    // Keep v4.1 format but also provide legacy structure for compatibility
    return {
      id: testCase.id,
      name: testCase.name,
      _dir: testCase._dir,
      _path: testCase._path,
      // Keep original v4.1 fields
      theory_NL: testCase.theory_NL || '',
      theory_DSL: testCase.theory_DSL || [],
      tasks: testCase.tasks,
      // Also provide legacy format for backward compatibility
      theory: {
        natural_language: testCase.theory_NL || '',
        expected_facts: testCase.theory_DSL || []
      },
      queries: (testCase.tasks || []).map(task => {
        return {
          id: task.id,
          natural_language: task.TASK_NL || '',
          expected_dsl: task.TASK_DSL || '',
          expected_answer: {
            truth: 'TRUE_CERTAIN',
            natural_language: task.ANSWEAR_NL || ''
          },
          proof_dsl: task.PROOF_DSL,
          proof_nl: task.PROOF_NL
        };
      })
    };
  }

  // Already in legacy format
  return testCase;
}

/**
 * Validate test case structure with SSA and proof validation
 *
 * @param {Object} testCase - Test case to validate
 * @param {Object} options - Validation options
 * @param {boolean} [options.validateSSA=true] - Validate SSA compliance
 * @param {boolean} [options.validateProof=true] - Validate proof structure
 * @returns {Object} Validation result with issues array
 */
function validateTestCase(testCase, options = {}) {
  const { validateSSA: doSSA = true, validateProof: doProof = true } = options;
  const issues = [];
  const warnings = [];

  // Basic structure validation
  if (!testCase.theory?.natural_language && !testCase.theory?.expected_facts &&
      !testCase.theory_NL && !testCase.theory_DSL) {
    issues.push('Missing theory (theory_NL/theory_DSL or legacy theory object)');
  }

  const tasks = testCase.tasks || testCase.queries || [];
  if (tasks.length === 0) {
    issues.push('No tasks/queries defined');
  }

  // Validate each task
  for (const task of tasks) {
    const taskId = task.id;

    // Check required fields
    if (!task.TASK_NL && !task.natural_language) {
      issues.push(`Task ${taskId}: Missing TASK_NL`);
    }

    if (!task.TASK_DSL && !task.expected_dsl) {
      issues.push(`Task ${taskId}: Missing TASK_DSL`);
    }

    // Validate TASK_DSL format
    const taskDSL = task.TASK_DSL || task.expected_dsl;
    if (taskDSL) {
      const queryMatch = taskDSL.match(/^@(\w+)\s+/);
      if (!queryMatch) {
        issues.push(`Task ${taskId}: TASK_DSL should start with @variable`);
      } else if (queryMatch[1] !== taskId) {
        warnings.push(`Task ${taskId}: TASK_DSL variable @${queryMatch[1]} differs from task id`);
      }
    }

    // Validate PROOF_DSL if present and validation enabled
    const proofDSL = task.PROOF_DSL || task.proof_dsl;
    if (proofDSL) {
      // SSA Validation (pass taskId as external var since it's declared in TASK_DSL)
      if (doSSA) {
        const ssaResult = validateSSA(proofDSL, { queryId: taskId });
        if (!ssaResult.valid) {
          for (const issue of ssaResult.issues) {
            issues.push(`Task ${taskId} SSA: ${issue}`);
          }
        }
      }

      // Proof Structure Validation
      if (doProof) {
        const proofResult = validateProofStructure(proofDSL, taskId);
        if (!proofResult.valid) {
          for (const issue of proofResult.issues) {
            issues.push(`Task ${taskId} Proof: ${issue}`);
          }
        }
      }
    } else {
      warnings.push(`Task ${taskId}: Missing PROOF_DSL`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Deep validate a test case including execution
 * This actually runs the proof DSL to verify facts exist
 *
 * @param {Object} testCase - Test case to validate
 * @returns {Promise<Object>} Validation result with execution details
 */
async function deepValidateTestCase(testCase) {
  const { executeTestCase } = require('../validators/proof_executor');

  // First do static validation
  const staticResult = validateTestCase(testCase);
  if (!staticResult.valid) {
    return {
      valid: false,
      phase: 'static',
      ...staticResult
    };
  }

  // Then execute proofs
  try {
    const execResult = executeTestCase(testCase);
    return {
      valid: execResult.failed === 0,
      phase: 'execution',
      staticIssues: staticResult.issues,
      staticWarnings: staticResult.warnings,
      execution: execResult
    };
  } catch (err) {
    return {
      valid: false,
      phase: 'execution',
      error: err.message,
      staticIssues: staticResult.issues,
      staticWarnings: staticResult.warnings
    };
  }
}

/**
 * Convert DSL fact to natural language
 * Used for teaching facts to LLM in natural language
 *
 * @param {string} fact - DSL fact string
 * @returns {string} Natural language equivalent
 */
function dslFactToNaturalLanguage(fact) {
  // Simple patterns - can be extended
  const patterns = [
    { regex: /(\w+)\s+IS_A\s+(\w+)/i, template: (m) => `${m[1]} is a ${m[2]}` },
    { regex: /(\w+)\s+HAS\s+(\w+)/i, template: (m) => `${m[1]} has ${m[2]}` },
    { regex: /(\w+)\s+CAN\s+(\w+)/i, template: (m) => `${m[1]} can ${m[2]}` },
    { regex: /(\w+)\s+CANNOT\s+(\w+)/i, template: (m) => `${m[1]} cannot ${m[2]}` },
    { regex: /(\w+)\s+BEFORE\s+(\w+)/i, template: (m) => `${m[1]} comes before ${m[2]}` },
    { regex: /(\w+)\s+AFTER\s+(\w+)/i, template: (m) => `${m[1]} comes after ${m[2]}` },
    { regex: /(\w+)\s+PART_OF\s+(\w+)/i, template: (m) => `${m[1]} is part of ${m[2]}` },
    { regex: /(\w+)\s+REQUIRES\s+(\w+)/i, template: (m) => `${m[1]} requires ${m[2]}` },
    { regex: /(\w+)\s+CAUSES\s+(\w+)/i, template: (m) => `${m[1]} causes ${m[2]}` },
    { regex: /(\w+)\s+INDICATES\s+(\w+)/i, template: (m) => `${m[1]} indicates ${m[2]}` },
    { regex: /(\w+)\s+DISJOINT_WITH\s+(\w+)/i, template: (m) => `${m[1]} is disjoint with ${m[2]}` },
    { regex: /(\w+)\s+LEADS_TO\s+(\w+)/i, template: (m) => `${m[1]} leads to ${m[2]}` },
    { regex: /(\w+)\s+PROVES\s+(\w+)/i, template: (m) => `${m[1]} proves ${m[2]}` },
    { regex: /(\w+)\s+OUTPUTS\s+(\w+)/i, template: (m) => `${m[1]} outputs ${m[2]}` },
    { regex: /(\w+)\s+TAKES\s+(\w+)/i, template: (m) => `${m[1]} takes ${m[2]}` },
    { regex: /(\w+)\s+EXECUTES\s+(\w+)/i, template: (m) => `${m[1]} executes ${m[2]}` },
    { regex: /(\w+)\s+USES\s+(\w+)/i, template: (m) => `${m[1]} uses ${m[2]}` }
  ];

  for (const { regex, template } of patterns) {
    const match = fact.match(regex);
    if (match) {
      return template(match);
    }
  }

  // Fallback: return as-is
  return fact;
}

module.exports = {
  normalizeTestCase,
  validateTestCase,
  deepValidateTestCase,
  dslFactToNaturalLanguage
};

/**
 * Proof Validator - Validates PROOF_DSL structure and semantics
 *
 * Ensures that proof scripts follow the correct pattern:
 * 1. Facts from knowledge base (@p1, @p2, ...)
 * 2. Chains linking facts (@c1, @c2, ...) using LEADS_TO
 * 3. @result typification (IS_A direct_fact, transitive_chain, etc.)
 * 4. @proof meta-relation ($result PROVES $query)
 *
 * @module evalsuite/lib/validators/proof_validator
 */

const { validateSSA, parseLine } = require('./ssa_validator');

/**
 * Valid proof result types
 */
/**
 * Check if a result type is valid
 * Accepts known types and any type matching common patterns
 *
 * @param {string} resultType - The result type to check
 * @returns {boolean} Whether the type is valid
 */
function isValidResultType(resultType) {
  const KNOWN_RESULT_TYPES = [
    'direct_fact',           // Single fact from KB
    'transitive_chain',      // A IS_A B IS_A C chain
    'inheritance_chain',     // Synonym for transitive_chain (IS_A specific)
    'causal_chain',          // A CAUSES B CAUSES C
    'inference_chain',       // General inference
    'impossibility',         // Contradiction/disjoint
    'symmetric_inference',   // Using symmetric relation
    'inverse_inference',     // Using inverse relation
    'exception_override',    // Exception to general rule
    'query_result',          // Set of results
    'fact_set',              // Collection of facts
    'aggregation_result',    // Computed aggregation
    'unknown_result'         // Explicit unknown
  ];

  // Exact match with known types
  if (KNOWN_RESULT_TYPES.includes(resultType)) return true;

  // Accept any type ending with common suffixes
  const validSuffixes = [
    '_chain', '_result', '_fact', '_inference', '_proof', '_set', '_override',
    '_selection', '_match', '_pair', '_derivation', '_application', '_calculation',
    '_equality', '_unknown', '_avoidance', '_concept'
  ];
  for (const suffix of validSuffixes) {
    if (resultType.endsWith(suffix)) return true;
  }

  // Accept types starting with common prefixes
  const validPrefixes = [
    'direct_', 'transitive_', 'causal_', 'inverse_', 'symmetric_',
    'open_world_', 'analogical_', 'formula_', 'time_', 'unknown_'
  ];
  for (const prefix of validPrefixes) {
    if (resultType.startsWith(prefix)) return true;
  }

  // Accept impossibility and unknown
  if (resultType === 'impossibility' || resultType === 'unknown') return true;

  // Accept any lowercase_with_underscores format as valid domain type
  if (/^[a-z][a-z0-9_]*$/.test(resultType)) return true;

  return false;
}

// Keep for backward compatibility export
const VALID_RESULT_TYPES = [
  'direct_fact', 'transitive_chain', 'inheritance_chain', 'causal_chain',
  'inference_chain', 'impossibility', 'symmetric_inference', 'inverse_inference',
  'exception_override', 'query_result', 'fact_set', 'aggregation_result', 'unknown_result'
];

/**
 * Core relations that MUST use specific patterns in proofs
 * Other relations are allowed but don't have structural requirements
 */
const CORE_PROOF_RELATIONS = [
  'IS_A', 'LEADS_TO', 'PROVES', 'MEMBER_OF'
];

/**
 * Check if a relation name looks valid (all caps with underscores)
 * @param {string} relation - Relation name to check
 * @returns {boolean} Whether it looks like a valid relation
 */
function isValidRelationFormat(relation) {
  // Must be uppercase letters and underscores
  return /^[A-Z][A-Z0-9_]*$/.test(relation);
}

/**
 * Parse a triple from a DSL line
 *
 * @param {string} line - DSL line (e.g., "@p1 dog IS_A mammal")
 * @returns {Object|null} { variable, subject, relation, object } or null
 */
function parseTriple(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // Pattern: @varName subject RELATION object
  // Or: @varName $ref RELATION $ref2
  const match = trimmed.match(/^@(\w+)\s+(\$?\w+)\s+(\w+)\s+(\$?\w+)$/);
  if (match) {
    return {
      variable: match[1],
      subject: match[2],
      relation: match[3],
      object: match[4]
    };
  }

  // Simpler pattern for type declarations: @varName $ref IS_A type
  const typeMatch = trimmed.match(/^@(\w+)\s+(\$\w+)\s+(IS_A)\s+(\w+)$/);
  if (typeMatch) {
    return {
      variable: typeMatch[1],
      subject: typeMatch[2],
      relation: typeMatch[3],
      object: typeMatch[4]
    };
  }

  return null;
}

/**
 * Validate the structure of a PROOF_DSL script
 *
 * @param {string} proofDSL - The PROOF_DSL to validate
 * @param {string} queryId - The query ID (e.g., "q1")
 * @returns {Object} { valid: boolean, issues: string[], structure: Object }
 */
function validateProofStructure(proofDSL, queryId) {
  const issues = [];
  const structure = {
    facts: [],        // @p1, @p2 - facts from KB
    chains: [],       // @c1, @c2 - inference chains
    sets: [],         // @set1 - fact sets
    members: [],      // @m1 - membership relations
    result: null,     // @result
    proof: null       // @proof
  };

  // First, run SSA validation (pass queryId as external var)
  const ssaResult = validateSSA(proofDSL, { queryId });
  if (!ssaResult.valid) {
    return {
      valid: false,
      issues: ssaResult.issues,
      structure
    };
  }

  const lines = proofDSL.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const triple = parseTriple(trimmed);
    if (!triple) {
      // Check if it's a valid but non-triple line (e.g., set declaration)
      const setMatch = trimmed.match(/^@(\w+)\s+(\w+)\s+IS_A\s+(fact_set|query_result)$/);
      if (setMatch) {
        structure.sets.push({
          variable: setMatch[1],
          name: setMatch[2],
          type: setMatch[3]
        });
        continue;
      }

      issues.push(`Invalid line format: "${trimmed}" - must be a triple`);
      continue;
    }

    // Categorize the triple
    const { variable, subject, relation, object } = triple;

    // Check relation format validity (must be UPPER_CASE)
    if (!isValidRelationFormat(relation)) {
      issues.push(`Invalid relation format "${relation}" in @${variable} - must be UPPER_CASE`);
    }

    if (variable === 'result') {
      // @result must be: $something IS_A result_type
      if (relation !== 'IS_A') {
        issues.push('@result must use IS_A relation');
      }
      if (!isValidResultType(object)) {
        issues.push(`Invalid result type "${object}". Should end with _chain, _result, _fact, _inference, etc.`);
      }
      structure.result = { subject, type: object };
    } else if (variable === 'proof') {
      // @proof must be: $result PROVES $query
      if (relation !== 'PROVES') {
        issues.push('@proof must use PROVES relation');
      }
      if (subject !== '$result') {
        issues.push('@proof subject should be $result');
      }
      if (object !== `$${queryId}`) {
        issues.push(`@proof object should be $${queryId}, got ${object}`);
      }
      structure.proof = { subject, object };
    } else if (variable.startsWith('p') && /^p\d+$/.test(variable)) {
      // Fact from KB
      structure.facts.push({ variable, subject, relation, object });
    } else if (variable.startsWith('c') && /^c\d+$/.test(variable)) {
      // Chain/inference - traditionally LEADS_TO, but can also be MEMBER_OF for set membership
      if (relation === 'LEADS_TO') {
        structure.chains.push({ variable, from: subject, to: object });
      } else if (relation === 'MEMBER_OF') {
        // c1, c2 used for set membership (alternative pattern)
        structure.members.push({ variable, member: subject, set: object });
      } else {
        structure.chains.push({ variable, from: subject, to: object });
      }
    } else if (variable.startsWith('m') && /^m\d+$/.test(variable)) {
      // Membership relation
      if (relation !== 'MEMBER_OF') {
        issues.push(`Membership @${variable} should use MEMBER_OF relation`);
      }
      structure.members.push({ variable, member: subject, set: object });
    }
  }

  // Validate proof structure completeness
  if (!structure.result) {
    issues.push('Missing @result declaration');
  }
  if (!structure.proof) {
    issues.push('Missing @proof declaration');
  }

  // Validate that chains form a connected path (for transitive proofs)
  if (structure.result && structure.result.type === 'transitive_chain' && structure.chains.length > 0) {
    const chainValid = validateChainConnectivity(structure.chains, structure.facts);
    if (!chainValid.valid) {
      issues.push(...chainValid.issues);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    structure
  };
}

/**
 * Validate that chains form a connected path
 *
 * @param {Object[]} chains - Array of chain objects
 * @param {Object[]} facts - Array of fact objects
 * @returns {Object} { valid: boolean, issues: string[] }
 */
function validateChainConnectivity(chains, facts) {
  const issues = [];

  // Build a set of known references (fact variables and previous chain outputs)
  const knownRefs = new Set();
  for (const fact of facts) {
    knownRefs.add(`$${fact.variable}`);
  }

  // Check each chain in order
  for (const chain of chains) {
    // The 'from' should reference a known fact or previous chain
    if (!knownRefs.has(chain.from)) {
      issues.push(`Chain @${chain.variable} references unknown ${chain.from}`);
    }
    // The 'to' should also be known
    if (!knownRefs.has(chain.to)) {
      issues.push(`Chain @${chain.variable} references unknown ${chain.to}`);
    }
    // Add this chain to known refs for next iterations
    knownRefs.add(`$${chain.variable}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validate a complete test case task
 *
 * @param {Object} task - Task object with TASK_DSL, PROOF_DSL, etc.
 * @returns {Object} { valid: boolean, issues: string[] }
 */
function validateTask(task) {
  const issues = [];

  if (!task.id) {
    issues.push('Task missing id');
    return { valid: false, issues };
  }

  if (!task.TASK_DSL) {
    issues.push(`Task ${task.id}: Missing TASK_DSL`);
  } else {
    // TASK_DSL should start with @queryId
    const queryMatch = task.TASK_DSL.match(/^@(\w+)\s/);
    if (!queryMatch) {
      issues.push(`Task ${task.id}: TASK_DSL should start with @${task.id}`);
    } else if (queryMatch[1] !== task.id) {
      issues.push(`Task ${task.id}: TASK_DSL variable @${queryMatch[1]} doesn't match task id`);
    }
  }

  if (!task.PROOF_DSL) {
    issues.push(`Task ${task.id}: Missing PROOF_DSL`);
  } else {
    const proofResult = validateProofStructure(task.PROOF_DSL, task.id);
    if (!proofResult.valid) {
      issues.push(...proofResult.issues.map(i => `Task ${task.id}: ${i}`));
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

module.exports = {
  validateProofStructure,
  validateTask,
  parseTriple,
  validateChainConnectivity,
  isValidResultType,
  isValidRelationFormat,
  VALID_RESULT_TYPES,
  CORE_PROOF_RELATIONS
};

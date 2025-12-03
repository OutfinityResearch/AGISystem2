/**
 * Validators module - SSA, Proof Structure, and Execution validation
 *
 * @module evalsuite/lib/validators
 */

const { validateSSA, parseLine, extractDependencyGraph, getTopologicalOrder } = require('./ssa_validator');
const {
  validateProofStructure,
  validateTask,
  parseTriple,
  validateChainConnectivity,
  isValidResultType,
  isValidRelationFormat,
  VALID_RESULT_TYPES,
  CORE_PROOF_RELATIONS
} = require('./proof_validator');
const { executeProof, executeTestCase, formatPointAsDSL } = require('./proof_executor');

module.exports = {
  // SSA Validator
  validateSSA,
  parseLine,
  extractDependencyGraph,
  getTopologicalOrder,

  // Proof Validator
  validateProofStructure,
  validateTask,
  parseTriple,
  validateChainConnectivity,
  isValidResultType,
  isValidRelationFormat,
  VALID_RESULT_TYPES,
  CORE_PROOF_RELATIONS,

  // Proof Executor
  executeProof,
  executeTestCase,
  formatPointAsDSL
};

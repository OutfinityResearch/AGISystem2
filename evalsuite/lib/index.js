/**
 * Evalsuite Library - Modular evaluation components
 *
 * This library provides reusable components for the AGISystem2
 * evaluation suite, organized into functional categories.
 *
 * Version 4.1 - SSA compliant, Points-based responses
 *
 * @module evalsuite/lib
 */

// Utilities
const colors = require('./utils/colors');
const logging = require('./utils/logging');

// Parsers
const {
  normalizeTestCase,
  validateTestCase,
  deepValidateTestCase,
  dslFactToNaturalLanguage
} = require('./parsers/case_parser');
const { generateDSLQuery } = require('./parsers/dsl_query_generator');

// Discovery
const { discoverCases, saveFailedCases, getCaseCount } = require('./discovery/case_discovery');

// Executors
const DirectDSLExecutor = require('./executors/direct_dsl_executor');
const AGIProcess = require('./executors/agi_process');

// Evaluators
const TranslationEvaluator = require('./evaluators/translation_evaluator');
const DirectTranslationEvaluator = require('./evaluators/direct_translation_evaluator');
const {
  parsePoint,
  parseExpectedQuery,
  comparePoints,
  analyzeResponse,
  analyzeProofResult,
  parseStructuredResult,
  normalizeTruth,
  detectTruthFromText
} = require('./evaluators/response_analyzer');

// Validators (new in v4.1)
const {
  validateSSA,
  parseLine,
  extractDependencyGraph,
  getTopologicalOrder,
  validateProofStructure,
  validateTask,
  parseTriple,
  validateChainConnectivity,
  isValidResultType,
  isValidRelationFormat,
  executeProof,
  executeTestCase,
  formatPointAsDSL,
  VALID_RESULT_TYPES,
  CORE_PROOF_RELATIONS
} = require('./validators');

module.exports = {
  // Utils
  colors,
  ...logging,

  // Parsers
  normalizeTestCase,
  validateTestCase,
  deepValidateTestCase,
  dslFactToNaturalLanguage,
  generateDSLQuery,

  // Discovery
  discoverCases,
  saveFailedCases,
  getCaseCount,

  // Executors
  DirectDSLExecutor,
  AGIProcess,

  // Evaluators
  TranslationEvaluator,
  DirectTranslationEvaluator,
  parsePoint,
  parseExpectedQuery,
  comparePoints,
  analyzeResponse,
  analyzeProofResult,
  parseStructuredResult,
  normalizeTruth,
  detectTruthFromText,

  // Validators (new in v4.1)
  validateSSA,
  parseLine,
  extractDependencyGraph,
  getTopologicalOrder,
  validateProofStructure,
  validateTask,
  parseTriple,
  validateChainConnectivity,
  isValidResultType,
  isValidRelationFormat,
  executeProof,
  executeTestCase,
  formatPointAsDSL,
  VALID_RESULT_TYPES,
  CORE_PROOF_RELATIONS
};

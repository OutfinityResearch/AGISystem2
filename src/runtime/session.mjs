/**
 * AGISystem2 - Session
 * @module runtime/session
 *
 * Public session interface (IoC root).
 * Heavy method bodies live in `src/runtime/session.impl.mjs`.
 */

import { similarity } from '../core/operations.mjs';
import {
  initOperators as initOperatorsImpl,
  trackRules as trackRulesImpl,
  resolveReferenceToAST as resolveReferenceToASTImpl,
  extractVariables as extractVariablesImpl,
  extractOperatorName as extractOperatorNameImpl,
  extractCompoundCondition as extractCompoundConditionImpl
} from './session-rules.mjs';
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
import { checkDSL as checkDSLImpl } from './session-check-dsl.mjs';
import {
  constructSession,
  sessionLearn,
  sessionLoadCore,
  sessionAddToKB,
  sessionGetKBBundle,
  sessionCheckContradiction,
  sessionQuery,
  sessionProve,
  sessionAbduce,
  sessionInduce,
  sessionLearnFrom,
  sessionGenerateText,
  sessionElaborate,
  sessionFormatResult,
	  sessionDescribeResult,
	  sessionDescribeDsl,
	  sessionResolve,
	  sessionDump,
	  sessionFindAll,
	  sessionClose
	} from './session.impl.mjs';

export class Session {
  constructor(options = {}) {
    constructSession(this, options);
  }

  initOperators() {
    initOperatorsImpl(this);
  }

  learn(dsl) {
    return sessionLearn(this, dsl);
  }

  loadCore(options = {}) {
    return sessionLoadCore(this, options);
  }

  trackRules(ast) {
    trackRulesImpl(this, ast);
  }

  resolveReferenceToAST(expr, stmtMap) {
    return resolveReferenceToASTImpl(expr, stmtMap);
  }

  extractVariables(ast, vars = []) {
    return extractVariablesImpl(ast, vars);
  }

  extractOperatorName(stmt) {
    return extractOperatorNameImpl(stmt);
  }

  extractCompoundCondition(expr, stmtMap) {
    return extractCompoundConditionImpl(this, expr, stmtMap);
  }

  addToKB(vector, name = null, metadata = null) {
    return sessionAddToKB(this, vector, name, metadata);
  }

  getKBBundle() {
    return sessionGetKBBundle(this);
  }

  checkContradiction(metadata) {
    return sessionCheckContradiction(this, metadata);
  }

  query(dsl, options = {}) {
    return sessionQuery(this, dsl, options);
  }

  queryHDC(dsl) {
    return this.query(dsl);
  }

  prove(dsl, options = {}) {
    return sessionProve(this, dsl, options);
  }

  abduce(dsl, options = {}) {
    return sessionAbduce(this, dsl, options);
  }

  checkDSL(dsl, options = {}) {
    return checkDSLImpl(this, dsl, options);
  }

  checkDSLStrict(dsl, options = {}) {
    return checkDSLImpl(this, dsl, { ...options, requireKnownAtoms: true });
  }

  induce(options = {}) {
    return sessionInduce(this, options);
  }

  learnFrom(examples) {
    return sessionLearnFrom(this, examples);
  }

  generateText(operator, args) {
    return sessionGenerateText(this, operator, args);
  }

  elaborate(proof) {
    return sessionElaborate(this, proof);
  }

  formatResult(result, type = 'query') {
    return sessionFormatResult(this, result, type);
  }

	  describeResult(payload) {
	    return sessionDescribeResult(this, payload);
	  }

	  describeDsl(dsl, options = {}) {
	    return sessionDescribeDsl(this, dsl, options);
	  }

  dslToNL(dsl, options = {}) {
    const res = sessionDescribeDsl(this, dsl, options);
    if (!res?.success) return res;
    return {
      ...res,
      text: Array.isArray(res.lines) ? res.lines.join(' ') : ''
    };
  }

  decode(vector) {
    return decodeVectorImpl(this, vector);
  }

  extractArguments(vector, operatorName) {
    return extractArgumentsImpl(this, vector, operatorName);
  }

  summarize(vector) {
    return summarizeVectorImpl(this, vector);
  }

  trackMethod(method) {
    trackMethodImpl(this, method);
  }

  trackOperation(operation) {
    trackOperationImpl(this, operation);
  }

  getReasoningStats(reset = false) {
    return getReasoningStatsImpl(this, reset);
  }

  getAllRules() {
    return this.rules;
  }

  similarity(a, b) {
    return similarity(a, b);
  }

  resolve(expr) {
    return sessionResolve(this, expr);
  }

  dump() {
    return sessionDump(this);
  }

  findAll(pattern, options = {}) {
    return sessionFindAll(this, pattern, options);
  }

  close() {
    sessionClose(this);
  }
}

export default Session;

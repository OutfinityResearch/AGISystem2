import { parse } from '../parser/parser.mjs';
import { createProofEngine } from '../reasoning/index.mjs';
import { canonicalizeStatement } from './canonicalize.mjs';
import { buildProofObject } from '../reasoning/proof-schema.mjs';
import { validateProof } from '../reasoning/proof-validator.mjs';

/**
 * Prove a goal.
 */
export function prove(session, dsl, options = {}) {
  try {
    const ast = typeof dsl === 'string' ? parse(dsl) : dsl;
    if (ast.statements.length === 0) {
      return { valid: false, reason: 'Empty goal' };
    }

    const engine = createProofEngine(session, { timeout: options.timeout || 2000 });
    const rawGoalStatement = ast.statements[0];
    const goalStatement = session.canonicalizationEnabled
      ? canonicalizeStatement(session, rawGoalStatement)
      : rawGoalStatement;

    const result = engine.prove(goalStatement);
    result.proofObject = buildProofObject({ session, goalStatement, result });
    if (goalStatement !== rawGoalStatement) {
      result.proofObject.legacy = {
        ...(result.proofObject.legacy || {}),
        rawGoal: rawGoalStatement.toString?.() || null
      };
    }
    if (session.proofValidationEnabled) {
      result.proofObject.validatorOk = validateProof(result.proofObject, session);
    }

    // Track statistics
    session.reasoningStats.proofs++;

    const DEFAULT_SEARCH_DEPTH = 5;
    const MIN_PROOF_DEPTH = 3;
    let proofLength;
    if (!result.valid) {
      proofLength = DEFAULT_SEARCH_DEPTH;
    } else {
      const actualSteps = result.steps?.length || 1;
      proofLength = Math.max(MIN_PROOF_DEPTH, actualSteps);
    }
    session.reasoningStats.proofLengths.push(proofLength);
    session.reasoningStats.totalProofSteps += proofLength;
    if (proofLength > session.reasoningStats.maxProofDepth) {
      session.reasoningStats.maxProofDepth = proofLength;
    }
    if (proofLength > 0 && proofLength < session.reasoningStats.minProofDepth) {
      session.reasoningStats.minProofDepth = proofLength;
    }
    if (result.reasoningSteps) {
      session.reasoningStats.totalReasoningSteps += result.reasoningSteps;
    }
    if (result.valid && result.method) {
      session.trackMethod(result.method);
    }

    return result;
  } catch (e) {
    return { valid: false, reason: e.message };
  }
}

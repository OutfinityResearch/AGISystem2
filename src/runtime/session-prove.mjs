import { parse } from '../parser/parser.mjs';
import { createProofEngine } from '../reasoning/index.mjs';
import { canonicalizeStatement } from './canonicalize.mjs';
import { rewriteCanonicalSurfaceStatement } from './canonical-rewrite.mjs';
import { buildProofObject } from '../reasoning/proof-schema.mjs';
import { validateProof } from '../reasoning/proof-validator.mjs';
import { isHdcMethod } from './session-stats.mjs';

function stmtToOpArgs(stmt) {
  const op = stmt?.operator?.name || stmt?.operator?.value || null;
  const args = Array.isArray(stmt?.args)
    ? stmt.args.map(a => a?.name ?? a?.value ?? (typeof a?.toString === 'function' ? a.toString() : null)).filter(v => v !== null)
    : [];
  return { op, args };
}

function computeCanonicalizationSteps(session, rawStmt, canonicalStmt) {
  if (!rawStmt || !canonicalStmt) return [];
  const raw = stmtToOpArgs(rawStmt);
  const canon = stmtToOpArgs(canonicalStmt);
  if (!raw.op || !canon.op) return [];

  const steps = [];
  const kb = session?.componentKB;
  const explainMapping = (a, b) => {
    if (a === b) return null;
    if (!kb) return null;

    if (typeof kb.expandSynonyms === 'function' && kb.expandSynonyms(a).has(b)) {
      return { operation: 'synonym_match', detailKey: 'synonymUsed', detailValue: `${a} <-> ${b}` };
    }

    if (typeof kb.resolveCanonical === 'function' && kb.resolveCanonical(a) === b) {
      return { operation: 'canonical_match', detailKey: 'canonicalUsed', detailValue: `${a} -> ${b}` };
    }

    return null;
  };

  const opMapping = explainMapping(raw.op, canon.op);
  if (raw.op !== canon.op && opMapping) {
    steps.push({
      operation: opMapping.operation,
      fact: `${canon.op} ${canon.args.join(' ')}`.trim(),
      [opMapping.detailKey]: opMapping.detailValue,
      confidence: 1.0
    });
  }

  const n = Math.min(raw.args.length, canon.args.length);
  for (let i = 0; i < n; i++) {
    const a = raw.args[i];
    const b = canon.args[i];
    if (a === b) continue;
    const mapping = explainMapping(a, b);
    if (!mapping) continue;
    steps.push({
      operation: mapping.operation,
      fact: `${canon.op} ${canon.args.join(' ')}`.trim(),
      [mapping.detailKey]: mapping.detailValue,
      confidence: 1.0
    });
  }

  return steps;
}

/**
 * Prove a goal.
 */
export function prove(session, dsl, options = {}) {
  try {
    const ast = typeof dsl === 'string' ? parse(dsl) : dsl;
    if (ast.statements.length === 0) {
      return { valid: false, reason: 'Empty goal' };
    }

    const engine = createProofEngine(session, { ...options, timeout: options.timeout || 2000 });
    const rawGoalStatement = ast.statements[0];
    let goalStatement = session.canonicalizationEnabled
      ? canonicalizeStatement(session, rawGoalStatement)
      : rawGoalStatement;

    const rewriteSteps = [];
    if (session?.enforceCanonical) {
      const opName = goalStatement?.operator?.name || goalStatement?.operator?.value || null;
      const rewrite = rewriteCanonicalSurfaceStatement(session, goalStatement, opName);
      if (rewrite?.rewritten) {
        goalStatement = rewrite.statement;
        const afterOp = goalStatement?.operator?.name || goalStatement?.operator?.value || null;
        rewriteSteps.push({
          operation: 'canonical_rewrite',
          fact: goalStatement.toString?.() || `${afterOp || ''}`.trim(),
          detail: rewrite.detail || { from: opName, to: afterOp },
          confidence: 1.0
        });
      } else if (typeof opName === 'string' && /^_[A-Za-z]/.test(opName) && !opName.startsWith('__')) {
        return { valid: false, reason: `Non-canonical primitive in goal: ${opName}` };
      }
    }

    const result = engine.prove(goalStatement);
    const canonSteps = (goalStatement !== rawGoalStatement)
      ? computeCanonicalizationSteps(session, rawGoalStatement, goalStatement)
      : [];
    if (rewriteSteps.length > 0 || canonSteps.length > 0) {
      result.steps = [...rewriteSteps, ...canonSteps, ...(result.steps || [])];
      // If the engine already produced a "proof" alias, keep it consistent.
      if (result.proof && Array.isArray(result.proof)) {
        result.proof = [...rewriteSteps, ...canonSteps, ...result.proof];
      }
    }
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
      if (isHdcMethod(result.method)) {
        session.reasoningStats.hdcUsefulOps = (session.reasoningStats.hdcUsefulOps || 0) + 1;
      }
    }

    return result;
  } catch (e) {
    return { valid: false, reason: e.message };
  }
}

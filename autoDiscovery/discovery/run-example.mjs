import { resetRefCounter, translateExample } from '../../src/nlp/nl2dsl.mjs';
import { CATEGORY, DEFAULT_GEOMETRY, DEFAULT_STRATEGY } from './constants.mjs';
import { createSession, validateQuestionDsl } from './session.mjs';

function assessTranslationQuality(example, translated) {
  const issues = [];

  const stats = translated.contextStats || null;
  if (stats && typeof stats.sentencesTotal === 'number' && stats.sentencesTotal > 0) {
    const opaqueRatio = (stats.sentencesOpaque || 0) / stats.sentencesTotal;
    if (opaqueRatio > 0.2) issues.push(`${(opaqueRatio * 100).toFixed(0)}% opaque statements (fallback)`);
  } else if (translated.contextErrors?.length > 0) {
    const sentenceCount = example.context?.split('.').filter(Boolean).length || 1;
    const ratio = translated.contextErrors.length / sentenceCount;
    if (ratio > 0.2) issues.push(`${(ratio * 100).toFixed(0)}% sentences unparsed`);
  }

  const dsl = translated.contextDsl || '';
  if (example.context?.length > 50 && dsl.length < 20) issues.push('DSL too short for context');
  if (example.context?.toLowerCase().includes('if ') && !dsl.includes('Implies')) issues.push('Missing Implies for conditional');
  if (example.context?.toLowerCase().includes(' not ') && !dsl.includes('Not')) issues.push('Missing Not for negation');

  return { hasIssues: issues.length > 0, details: issues.join('; ') || 'Translation appears correct' };
}

function queryToBool(result) {
  if (!result) return false;
  if (result.success !== true) return false;
  if (Array.isArray(result.allResults)) return result.allResults.length > 0;
  if (Array.isArray(result.matches)) return result.matches.length > 0;
  return true;
}

export function runExample(example, caseId, options = {}) {
  const startTime = performance.now();
  const source = example.source || 'generic';

  const translatorOptions = {
    autoDeclareUnknownOperators: options.autoDeclareUnknownOperators === true,
    expandCompoundQuestions: true,
    fallbackOpaqueStatements: true,
    fallbackOpaqueQuestions: true
  };

  const sessionConfig = {
    hdcStrategy: DEFAULT_STRATEGY,
    geometry: DEFAULT_GEOMETRY,
    closedWorldAssumption: true,
    rejectContradictions: false,
    ...(options.sessionConfig || {})
  };

  resetRefCounter();

  const translated = translateExample({
    ...example,
    source,
    translateOptions: translatorOptions
  });

  // In strict mode (no auto-declare), unknown operators are treated as a translation limitation.
  if (options.autoDeclareUnknownOperators !== true) {
    const hasUnknownOperator = Array.isArray(translated.contextErrors) &&
      translated.contextErrors.some(e => /unknown operator/i.test(String(e?.error || '')) || e?.unknownOperator);
    if (hasUnknownOperator) {
      return {
        category: CATEGORY.TRANSLATION,
        correct: false,
        reason: 'strict_unknown_operator',
        details: 'Strict mode: unknown operators present (rerun without --strict-operators or add @op:op __Relation)',
        translated,
        durationMs: performance.now() - startTime,
        caseId,
        sessionConfig
      };
    }
  }

  const hasExpectation = !(translated.expectProved === null || translated.expectProved === undefined);

  if (!translated.contextDsl || !translated.contextDsl.trim()) {
    return {
      category: CATEGORY.TRANSLATION,
      correct: false,
      reason: 'context_translation_empty',
      details: `Context translation failed: ${translated.contextErrors?.length || 0} errors`,
      translated,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

  if (!translated.questionDsl || !translated.questionDsl.trim()) {
    return {
      category: CATEGORY.TRANSLATION,
      correct: false,
      reason: 'question_translation_empty',
      details: 'Question translation failed',
      translated,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

  const goalValidation = validateQuestionDsl(translated.questionDsl);
  if (!goalValidation.valid) {
    return {
      category: CATEGORY.INVALID_GOAL,
      correct: false,
      reason: goalValidation.reason,
      details: `questionDsl invalid for prove(): ${goalValidation.reason}`,
      translated,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

  try {
    const session = createSession(sessionConfig);

    const learnResult = session.learn(translated.contextDsl);
    if (learnResult.success === false || (learnResult.errors && learnResult.errors.length > 0)) {
      return {
        category: CATEGORY.LEARN_FAILED,
        correct: false,
        reason: 'learn_failed',
        details: `learn() failed: ${learnResult.errors?.join(', ') || 'unknown error'}`,
        translated,
        learnResult: { success: learnResult.success, errorCount: learnResult.errors?.length || 0 },
        durationMs: performance.now() - startTime,
        caseId,
        sessionConfig
      };
    }

    const goals = goalValidation.goals || [translated.questionDsl];
    const goalLogic = goalValidation.goalLogic || 'Single';
    const action = goalValidation.action || (goals.some(g => g.includes('?')) ? 'query' : 'prove');
    if (options.autoDeclareUnknownOperators === true && Array.isArray(goalValidation.declaredOperators) && goalValidation.declaredOperators.length > 0) {
      const declLines = goalValidation.declaredOperators.map(op => `@${op}:${op} __Relation`).join('\n');
      session.learn(declLines);
    }
    const perGoal = goals.map(g => {
      if (action === 'query') {
        const result = session.query(g, { timeout: 2000 });
        return { goalDsl: g, result, action: 'query', valid: queryToBool(result) };
      }
      const result = session.prove(g, { timeout: 2000 });
      return { goalDsl: g, result, action: 'prove', valid: result?.valid === true };
    });

    const anyInvalidStructure = perGoal.some(p => !p.result || (p.action === 'prove' && typeof p.result.valid !== 'boolean') || (p.action === 'query' && typeof p.result.success !== 'boolean'));
    if (anyInvalidStructure) {
      return {
        category: CATEGORY.REASONING,
        correct: false,
        reason: 'runtime_error',
        details: `${action}() returned invalid result structure`,
        translated,
        proveResult: perGoal.map(p => ({ goalDsl: p.goalDsl, result: p.result })),
        durationMs: performance.now() - startTime,
        caseId,
        sessionConfig
      };
    }

    const provedValid = goalLogic === 'Or'
      ? perGoal.some(p => p.valid === true)
      : perGoal.every(p => p.valid === true);

    const proveResult = {
      valid: provedValid,
      method: goals.length > 1 ? `compound_goal_${goalLogic.toLowerCase()}` : (perGoal[0]?.result?.method || null),
      steps: goals.length > 1 ? [] : (perGoal[0]?.result?.steps || []),
      reason: goals.length > 1 ? null : (perGoal[0]?.result?.reason || null),
      parts: perGoal.map(p => ({
        goalDsl: p.goalDsl,
        valid: p.valid === true,
        method: p.result.method || null,
        reason: p.result.reason || p.result.error || null,
        stepsCount: p.result.steps?.length || 0
      }))
    };

    let actual_nl = null;
    try {
      if (goals.length === 1) {
        actual_nl = session.describeResult({ action, reasoningResult: perGoal[0].result, queryDsl: goals[0] });
      } else {
        const parts = perGoal.map(p => {
          const nl = session.describeResult({ action, reasoningResult: p.result, queryDsl: p.goalDsl });
          return `- ${p.goalDsl}\n  ${nl}`;
        });
        actual_nl = `Compound goal (${goalLogic}):\n${parts.join('\n')}`;
      }
    } catch (err) {
      actual_nl = `Error: ${err.message}`;
    }

    const proofInvalid = action === 'prove' &&
      goals.length === 1 &&
      perGoal[0].valid === true &&
      perGoal[0].result.proofObject &&
      perGoal[0].result.proofObject.validatorOk === false;
    if (proofInvalid) {
      return {
        category: CATEGORY.REASONING,
        correct: false,
        reason: 'runtime_error',
        details: 'Engine produced invalid proof (validatorOk=false)',
        translated,
        proveResult: {
          valid: proveResult.valid,
          reason: proveResult.reason,
          stepsCount: proveResult.steps?.length || 0,
          validatorOk: proveResult.proofObject?.validatorOk
        },
        actual_nl,
        durationMs: performance.now() - startTime,
        caseId,
        sessionConfig
      };
    }

    const proved = proveResult.valid === true;
    const correct = hasExpectation ? (proved === translated.expectProved) : false;

    if (hasExpectation && correct) {
      return {
        category: CATEGORY.PASSED,
        correct: true,
        reason: 'passed',
        details: `proved=${proved}, expected=${translated.expectProved}`,
        translated,
        proveResult: { valid: proveResult.valid, stepsCount: proveResult.steps?.length || 0, method: proveResult.method || null },
        actual_nl,
        durationMs: performance.now() - startTime,
        caseId,
        sessionConfig
      };
    }

    const translationQuality = assessTranslationQuality(example, translated);

    if (!hasExpectation) {
      const meta = [
        `label=${JSON.stringify(example.label ?? null)}`,
        `category=${JSON.stringify(example.category ?? null)}`,
        `choices=${Array.isArray(example.choices) ? example.choices.length : 0}`,
        `action=${action}`,
        `proved=${proved}`
      ].join(' ');
      return {
        category: CATEGORY.NO_EXPECTATION,
        correct: false,
        reason: 'no_expectation',
        details: meta,
        translated,
        proveResult: { valid: proveResult.valid, reason: proveResult.reason, stepsCount: proveResult.steps?.length || 0, validatorOk: proveResult.proofObject?.validatorOk, method: proveResult.method || null },
        actual_nl,
        durationMs: performance.now() - startTime,
        caseId,
        sessionConfig
      };
    }

    return {
      category: CATEGORY.REASONING,
      correct: false,
      reason: 'reasoning_failure',
      details: `${translationQuality.hasIssues ? `translation_low_confidence(${translationQuality.details}); ` : ''}proved=${proved}, expected=${translated.expectProved}`,
      translated,
      proveResult: { valid: proveResult.valid, reason: proveResult.reason, stepsCount: proveResult.steps?.length || 0, validatorOk: proveResult.proofObject?.validatorOk, method: proveResult.method || null },
      actual_nl,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  } catch (err) {
    return {
      category: CATEGORY.REASONING,
      correct: false,
      reason: 'runtime_error',
      details: err.stack || err.message,
      translated,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }
}

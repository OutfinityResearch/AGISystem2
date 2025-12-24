import { resetRefCounter, translateExample } from '../../src/nlp/nl2dsl.mjs';
import { CATEGORY, DEFAULT_GEOMETRY, DEFAULT_STRATEGY } from './constants.mjs';
import { createSession, validateQuestionDsl } from './session.mjs';

function assessTranslationQuality(example, translated) {
  const issues = [];

  if (translated.contextErrors?.length > 0) {
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

export function runExample(example, caseId, options = {}) {
  const startTime = performance.now();
  const source = example.source || 'generic';

  const translatorOptions = {
    autoDeclareUnknownOperators: options.autoDeclareUnknownOperators === true
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

  if (translated.expectProved === null || translated.expectProved === undefined) {
    return {
      category: CATEGORY.UNSUPPORTED,
      correct: false,
      reason: 'unsupported_label',
      details: `Label "${example.label}" not supported for binary entailment`,
      translated,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

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

    const proveResult = session.prove(translated.questionDsl, { timeout: 2000 });
    if (!proveResult || typeof proveResult.valid !== 'boolean') {
      return {
        category: CATEGORY.UNKNOWN,
        correct: false,
        reason: 'prove_no_result',
        details: 'prove() returned invalid result structure',
        translated,
        proveResult,
        durationMs: performance.now() - startTime,
        caseId,
        sessionConfig
      };
    }

    let actual_nl = null;
    try {
      actual_nl = session.describeResult({ action: 'prove', reasoningResult: proveResult, queryDsl: translated.questionDsl });
    } catch (err) {
      actual_nl = `Error: ${err.message}`;
    }

    const proofInvalid = proveResult.valid === true && proveResult.proofObject && proveResult.proofObject.validatorOk === false;
    if (proofInvalid) {
      return {
        category: CATEGORY.UNKNOWN,
        correct: false,
        reason: 'invalid_proof',
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
    const correct = (proved === translated.expectProved);

    if (correct) {
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
    if (translationQuality.hasIssues) {
      return {
        category: CATEGORY.TRANSLATION,
        correct: false,
        reason: 'translation_quality_issue',
        details: translationQuality.details,
        translated,
        proveResult: { valid: proveResult.valid, reason: proveResult.reason, stepsCount: proveResult.steps?.length || 0, method: proveResult.method || null },
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
      details: `proved=${proved}, expected=${translated.expectProved}`,
      translated,
      proveResult: { valid: proveResult.valid, reason: proveResult.reason, stepsCount: proveResult.steps?.length || 0, validatorOk: proveResult.proofObject?.validatorOk, method: proveResult.method || null },
      actual_nl,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  } catch (err) {
    return {
      category: CATEGORY.UNKNOWN,
      correct: false,
      reason: 'runtime_error',
      details: err.message,
      translated,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }
}


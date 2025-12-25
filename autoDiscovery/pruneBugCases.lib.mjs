/**
 * Shared validator used by prune scripts.
 */

import fs from 'node:fs';

import { translateExample, resetRefCounter } from '../src/nlp/nl2dsl.mjs';
import { Session } from '../src/runtime/session.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';
import { validateQuestionDsl } from './discovery/session.mjs';

function queryToBool(result) {
  if (!result) return false;
  if (result.success !== true) return false;
  if (Array.isArray(result.allResults)) return result.allResults.length > 0;
  if (Array.isArray(result.matches)) return result.matches.length > 0;
  return true;
}

function loadCoreTheories(session) {
  const result = session.loadCore({ includeIndex: false });
  if (result.success !== true) {
    const msg = result.errors?.map(e => `${e.file}: ${e.errors?.join('; ')}`).join(' | ') || 'unknown error';
    throw new Error(`loadCore failed: ${msg}`);
  }
}

function extractExpectProved(raw) {
  if (raw?.dataset?.expectProved === true || raw?.dataset?.expectProved === false) return raw.dataset.expectProved;
  if (raw?.translated?.expectProved === true || raw?.translated?.expectProved === false) return raw.translated.expectProved;
  if (raw?.translation?.expectProved === true || raw?.translation?.expectProved === false) return raw.translation.expectProved;
  if (raw?.expected?.expected_proved === true || raw?.expected?.expected_proved === false) return raw.expected.expected_proved;
  return null;
}

function extractNl(raw) {
  const context =
    raw?.input?.context_nl ??
    raw?.example?.context ??
    raw?.translated?.original?.context ??
    raw?.translation?.context_nl ??
    null;
  const question =
    raw?.input?.question_nl ??
    raw?.example?.question ??
    raw?.translated?.original?.question ??
    raw?.translation?.question_nl ??
    null;
  return { context, question };
}

export async function validateOne(caseFile, { autoDeclareUnknownOperators = true } = {}) {
  const raw = JSON.parse(fs.readFileSync(caseFile, 'utf8'));
  const expectProved = extractExpectProved(raw);
  if (expectProved !== true && expectProved !== false) {
    return { ok: true, skipped: true, reason: 'no_expectation' };
  }

  const { context, question } = extractNl(raw);
  if (!context || !question) {
    return { ok: true, skipped: true, reason: 'missing_nl' };
  }

  resetRefCounter();
  const translated = translateExample({
    source: raw.source || 'generic',
    context,
    question,
    label: raw.dataset?.label,
    translateOptions: { autoDeclareUnknownOperators, expandCompoundQuestions: true }
  });

  const goalValidation = validateQuestionDsl(translated.questionDsl);
  if (!goalValidation.valid) {
    return { ok: false, reason: `invalid_goal:${goalValidation.reason}` };
  }

  const sessionConfig = raw.sessionConfig || {
    hdcStrategy: 'dense-binary',
    geometry: 256,
    closedWorldAssumption: true,
    rejectContradictions: false
  };
  const src = String(raw.source || translated.source || 'generic').toLowerCase();
  if (['folio', 'folio_fol', 'logicnli'].includes(src)) {
    sessionConfig.closedWorldAssumption = false;
  }

  const session = new Session({
    ...sessionConfig,
    reasoningPriority: REASONING_PRIORITY.SYMBOLIC,
    reasoningProfile: 'theoryDriven'
  });

  loadCoreTheories(session);

  const learnResult = session.learn(translated.contextDsl);
  if (learnResult.success !== true) {
    return { ok: false, reason: `learn_failed:${(learnResult.errors || []).join('; ')}` };
  }

  // Declare goal ops if the validator extracted any.
  if (autoDeclareUnknownOperators && Array.isArray(goalValidation.declaredOperators) && goalValidation.declaredOperators.length > 0) {
    const declLines = goalValidation.declaredOperators.map(op => `@${op}:${op} __Relation`).join('\n');
    session.learn(declLines);
  }

  const goals = goalValidation.goals || [translated.questionDsl];
  const goalLogic = goalValidation.goalLogic || 'Single';
  const action = goalValidation.action || (goals.some(g => g.includes('?')) ? 'query' : 'prove');

  const perGoalOk = goals.map(goalDsl => {
    if (action === 'query') {
      const result = session.query(goalDsl, { timeout: 2000 });
      return queryToBool(result);
    }
    const result = session.prove(goalDsl, { timeout: 2000 });
    return result?.valid === true;
  });

  const proved = goalLogic === 'Or' ? perGoalOk.some(Boolean) : perGoalOk.every(Boolean);
  return { ok: proved === expectProved, proved, expectProved };
}

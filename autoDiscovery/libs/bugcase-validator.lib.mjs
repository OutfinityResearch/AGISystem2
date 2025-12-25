/**
 * Shared validator for bug cases in `autoDiscovery/bugCases/*`.
 *
 * Supports:
 * - boolean entailment cases (expectProved)
 * - query-answer tasks (bAbI-style)
 * - multi-choice tasks (LogiQA/ReClor-style)
 * - CLUTRR relational tasks (prove relation label(A,B))
 */

import fs from 'node:fs';

import { resetRefCounter, translateExample, translateNL2DSL } from '../../src/nlp/nl2dsl.mjs';
import { normalizeEntity, sanitizePredicate } from '../../src/nlp/nl2dsl/utils.mjs';
import { Session } from '../../src/runtime/session.mjs';
import { REASONING_PRIORITY } from '../../src/core/constants.mjs';
import { validateQuestionDsl } from '../discovery/session.mjs';
import { normalizeSessionConfigForSource } from '../discovery/semantics.mjs';

function queryToBool(result) {
  if (!result) return false;
  if (result.success !== true) return false;
  if (Array.isArray(result.allResults)) return result.allResults.length > 0;
  if (Array.isArray(result.matches)) return result.matches.length > 0;
  return true;
}

function extractQueryAnswers(queryResult) {
  const answers = [];
  const all = Array.isArray(queryResult?.allResults)
    ? queryResult.allResults
    : (Array.isArray(queryResult?.matches) ? queryResult.matches : []);
  for (const r of all) {
    const bindings = r?.bindings;
    if (!bindings) continue;
    if (bindings instanceof Map) {
      for (const v of bindings.values()) if (v?.answer) answers.push(v.answer);
    } else if (typeof bindings === 'object') {
      for (const k of Object.keys(bindings)) if (bindings[k]?.answer) answers.push(bindings[k].answer);
    }
  }
  return answers;
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

function normalizeTextKey(text) {
  return String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function stripGoalPrefix(goalLine) {
  const line = String(goalLine || '').trim();
  if (!line) return '';
  if (!line.startsWith('@')) return line;
  return line.split(/\s+/).slice(1).join(' ').trim();
}

function ensureGoalLine(line) {
  const t = String(line || '').trim();
  if (!t) return '';
  if (t.startsWith('@goal')) return t;
  return `@goal:goal ${t}`;
}

function buildNegatedGoalLine(goalLine) {
  const raw = stripGoalPrefix(goalLine);
  if (!raw) return '';
  const inner = raw.startsWith('Not ') || raw.startsWith('Not(') ? raw : `Not (${raw})`;
  return ensureGoalLine(inner);
}

function inferExpectationKind(raw, translated, goalValidation) {
  const src = String(raw?.source || translated?.source || '').toLowerCase();
  const expectProved = extractExpectProved(raw);
  if (expectProved === true || expectProved === false) return { kind: 'boolean', expectProved };

  const label = raw?.dataset?.label ?? raw?.example?.label ?? raw?.input?.label ?? null;
  const choices = Array.isArray(raw?.dataset?.choices) ? raw.dataset.choices : (Array.isArray(raw?.example?.choices) ? raw.example.choices : []);

  const goals = goalValidation?.goals || [translated?.questionDsl];
  const action = goalValidation?.action || (goals.some(g => String(g).includes('?')) ? 'query' : 'prove');

  if ((src === 'babi15' || src === 'babi16') && typeof label === 'string' && action === 'query' && goals.length === 1) {
    return { kind: 'query_answer', label };
  }

  if (src === 'logicnli' && typeof label === 'string') {
    const l = normalizeTextKey(label);
    if (['entailment', 'contradiction', 'neutral', 'self_contradiction'].includes(l)) {
      return { kind: 'nli_label', label: l };
    }
  }

  if (Array.isArray(choices) && choices.length >= 2 && typeof label === 'string') {
    return { kind: 'multi_choice', label, choices };
  }

  if (src === 'clutrr' && typeof label === 'string') {
    return { kind: 'clutrr', label };
  }

  return { kind: 'unknown' };
}

function evaluateQueryAnswer({ goalDsl, queryResult, label }) {
  const rawLine = String(goalDsl || '').trim().startsWith('@')
    ? String(goalDsl || '').trim().split(/\s+/).slice(1).join(' ')
    : String(goalDsl || '').trim();
  const parts = rawLine.split(/\s+/).filter(Boolean);
  const op = parts[0] || null;
  const args = parts.slice(1);
  const holeIdx = args.findIndex(a => a.startsWith('?'));

  const expected = (op === 'hasProperty' && holeIdx === 1)
    ? sanitizePredicate(label)
    : normalizeEntity(label, '?x');

  const answers = extractQueryAnswers(queryResult);
  const ok = answers.some(a => a === expected);
  return { ok, expected, answers };
}

function parseClutrrPair(questionText) {
  const qText = String(questionText || '');
  const m =
    qText.match(/\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/) ||
    qText.match(/\(\s*\"([^\"]+)\"\s*,\s*\"([^\"]+)\"\s*\)/);
  if (!m) return null;
  return { a: m[1], b: m[2] };
}

export async function validateOne(caseFile, { autoDeclareUnknownOperators = true } = {}) {
  const raw = JSON.parse(fs.readFileSync(caseFile, 'utf8'));
  const { context, question } = extractNl(raw);
  if (!context || !question) {
    return { ok: false, skipped: true, reason: 'missing_nl' };
  }

  resetRefCounter();
  const translated = translateExample({
    source: raw.source || 'generic',
    context,
    question,
    label: raw.dataset?.label ?? raw.example?.label ?? raw.translated?.label ?? raw.translation?.label ?? null,
    translateOptions: { autoDeclareUnknownOperators, expandCompoundQuestions: true }
  });

  const goalValidation = validateQuestionDsl(translated.questionDsl);
  if (!goalValidation.valid) {
    return { ok: false, skipped: false, reason: `invalid_goal:${goalValidation.reason}` };
  }

  const sessionConfig = normalizeSessionConfigForSource(
    raw.sessionConfig || {
      hdcStrategy: 'dense-binary',
      geometry: 256,
      closedWorldAssumption: false,
      rejectContradictions: false
    },
    raw.source || translated.source
  );

  const session = new Session({
    ...sessionConfig,
    reasoningPriority: REASONING_PRIORITY.SYMBOLIC,
    reasoningProfile: 'theoryDriven'
  });
  loadCoreTheories(session);

  const learnResult = session.learn(translated.contextDsl);
  if (learnResult.success !== true) {
    return { ok: false, skipped: false, reason: `learn_failed:${(learnResult.errors || []).join('; ')}` };
  }

  if (autoDeclareUnknownOperators && Array.isArray(goalValidation.declaredOperators) && goalValidation.declaredOperators.length > 0) {
    const declLines = goalValidation.declaredOperators.map(op => `@${op}:${op} __Relation`).join('\n');
    session.learn(declLines);
  }

  const goals = goalValidation.goals || [translated.questionDsl];
  const goalLogic = goalValidation.goalLogic || 'Single';
  const action = goalValidation.action || (goals.some(g => g.includes('?')) ? 'query' : 'prove');

  const perGoal = goals.map(goalDsl => {
    if (action === 'query') {
      const result = session.query(goalDsl, { timeout: 2000 });
      return { goalDsl, ok: queryToBool(result), result };
    }
    const result = session.prove(goalDsl, { timeout: 2000, includeSearchTrace: false });
    return { goalDsl, ok: result?.valid === true, result };
  });

  const proved = goalLogic === 'Or' ? perGoal.some(p => p.ok) : perGoal.every(p => p.ok);
  const expectation = inferExpectationKind(raw, translated, goalValidation);

  if (expectation.kind === 'boolean') {
    const nowPasses = proved === expectation.expectProved;
    return { ok: nowPasses, skipped: false, kind: 'boolean', proved, expectProved: expectation.expectProved };
  }

  if (expectation.kind === 'query_answer') {
    if (action !== 'query' || goals.length !== 1) return { ok: false, skipped: false, kind: 'query_answer', reason: 'not_a_single_query_goal' };
    const evalRes = evaluateQueryAnswer({ goalDsl: goals[0], queryResult: perGoal[0].result, label: expectation.label });
    // For bug cases, ok=true means the issue is fixed (answer now matches).
    return { ok: evalRes.ok, skipped: false, kind: 'query_answer', ...evalRes };
  }

  if (expectation.kind === 'nli_label') {
    const posGoal = ensureGoalLine(goals[0]);
    const negGoal = buildNegatedGoalLine(goals[0]);
    const posRes = posGoal ? session.prove(posGoal, { timeout: 2000, includeSearchTrace: false, ignoreNegation: true }) : null;
    const negRes = negGoal ? session.prove(negGoal, { timeout: 2000, includeSearchTrace: false, ignoreNegation: true }) : null;
    const provedPos = posRes?.valid === true;
    const provedNeg = negRes?.valid === true;
    const predicted =
      (provedPos && provedNeg) ? 'self_contradiction'
        : provedPos ? 'entailment'
          : provedNeg ? 'contradiction'
            : 'neutral';
    const nowPasses = normalizeTextKey(predicted) === normalizeTextKey(expectation.label);
    return { ok: nowPasses, skipped: false, kind: 'nli_label', predicted, label: expectation.label, provedPos, provedNeg };
  }

  if (expectation.kind === 'multi_choice') {
    const choiceResults = [];
    for (const choice of expectation.choices) {
      resetRefCounter();
      const choiceDsl = translateNL2DSL(String(choice), { source: raw.source || translated.source, isQuestion: true, autoDeclareUnknownOperators }).dsl;
      const choiceGoal = validateQuestionDsl(choiceDsl);
      if (!choiceGoal.valid) {
        choiceResults.push({ choice, valid: false, reason: 'invalid_goal' });
        continue;
      }
      const choiceLine = choiceGoal.goals?.[0] || choiceDsl;
      const choiceAction = choiceGoal.action || (choiceLine.includes('?') ? 'query' : 'prove');
      if (autoDeclareUnknownOperators && Array.isArray(choiceGoal.declaredOperators) && choiceGoal.declaredOperators.length > 0) {
        const declLines = choiceGoal.declaredOperators.map(op => `@${op}:${op} __Relation`).join('\n');
        session.learn(declLines);
      }
      const res = choiceAction === 'query'
        ? session.query(choiceLine, { timeout: 2000 })
        : session.prove(choiceLine, { timeout: 2000, includeSearchTrace: false });
      const ok = choiceAction === 'query' ? queryToBool(res) : (res?.valid === true);
      choiceResults.push({ choice, valid: ok, action: choiceAction });
    }
    const trueChoices = choiceResults.filter(r => r.valid).map(r => r.choice);
    const predicted =
      trueChoices.length === 1 ? trueChoices[0]
        : trueChoices.length === 0 ? 'Unknown'
          : 'Ambiguous';
    const nowPasses = normalizeTextKey(predicted) === normalizeTextKey(expectation.label);
    return { ok: nowPasses, skipped: false, kind: 'multi_choice', predicted, label: expectation.label, trueChoices: trueChoices.length };
  }

  if (expectation.kind === 'clutrr') {
    const pair = parseClutrrPair(question);
    if (!pair) return { ok: false, skipped: true, kind: 'clutrr', reason: 'cannot_parse_pair' };
    const a = normalizeEntity(pair.a, '?x');
    const b = normalizeEntity(pair.b, '?x');
    const rel = sanitizePredicate(expectation.label);
    if (!rel) return { ok: false, skipped: true, kind: 'clutrr', reason: 'invalid_relation_label' };
    if (autoDeclareUnknownOperators) session.learn(`@${rel}:${rel} __Relation`);
    const goalLine = `@goal:goal ${rel} ${a} ${b}`;
    const res = session.prove(goalLine, { timeout: 2000, includeSearchTrace: false });
    return { ok: res?.valid === true, skipped: false, kind: 'clutrr', goal: goalLine };
  }

  return { ok: false, skipped: true, kind: 'unknown', reason: 'unknown_expectation_kind' };
}

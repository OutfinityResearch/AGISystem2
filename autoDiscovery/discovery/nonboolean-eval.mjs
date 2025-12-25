import { resetRefCounter, translateNL2DSL } from '../../src/nlp/nl2dsl.mjs';
import { normalizeEntity, sanitizePredicate } from '../../src/nlp/nl2dsl/utils.mjs';
import { CATEGORY } from './constants.mjs';
import { validateQuestionDsl } from './session.mjs';

function normalizeTextKey(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
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

function queryToBool(result) {
  if (!result) return false;
  if (result.success !== true) return false;
  if (Array.isArray(result.allResults)) return result.allResults.length > 0;
  if (Array.isArray(result.matches)) return result.matches.length > 0;
  return true;
}

function extractQueryAnswers(queryResult) {
  const answers = [];
  const all = Array.isArray(queryResult?.allResults) ? queryResult.allResults : (Array.isArray(queryResult?.matches) ? queryResult.matches : []);
  for (const r of all) {
    const bindings = r?.bindings;
    if (!bindings) continue;
    if (bindings instanceof Map) {
      for (const v of bindings.values()) {
        if (v?.answer) answers.push(v.answer);
      }
    } else if (typeof bindings === 'object') {
      for (const k of Object.keys(bindings)) {
        const v = bindings[k];
        if (v?.answer) answers.push(v.answer);
      }
    }
  }
  return answers;
}

export function evaluateNonBooleanExample({
  example,
  source,
  session,
  translated,
  goals,
  action,
  perGoal,
  actual_nl,
  options,
  caseId,
  sessionConfig,
  translatorOptions,
  startTime
}) {
  // ---- LogicNLI: classify entailment/contradiction/neutral/self_contradiction ----
  if (String(source || '').toLowerCase() === 'logicnli' && typeof example.label === 'string' && goals.length >= 1) {
    const posGoal = ensureGoalLine(goals[0]);
    const negGoal = buildNegatedGoalLine(goals[0]);

    const posRes = posGoal ? session.prove(posGoal, { timeout: 2000, includeSearchTrace: false }) : null;
    const negRes = negGoal ? session.prove(negGoal, { timeout: 2000, includeSearchTrace: false }) : null;

    const provedPos = posRes?.valid === true;
    const provedNeg = negRes?.valid === true;

    const predicted =
      (provedPos && provedNeg) ? 'self_contradiction'
        : provedPos ? 'entailment'
          : provedNeg ? 'contradiction'
            : 'neutral';

    const correct = normalizeTextKey(predicted) === normalizeTextKey(example.label);
    return {
      category: correct ? CATEGORY.PASSED : CATEGORY.REASONING,
      correct,
      reason: correct ? 'passed_logicnli' : 'logicnli_label_mismatch',
      details: `predicted=${predicted} label=${example.label} provedPos=${provedPos} provedNeg=${provedNeg}`,
      translated: { ...translated, questionDsl: posGoal },
      proveResult: { valid: correct, reason: correct ? null : 'logicnli_label_mismatch', stepsCount: 0, validatorOk: true, method: 'logicnli_probe' },
      actual_nl,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

  // ---- Query-answer tasks (bAbI / similar) ----
  if (typeof example.label === 'string' && action === 'query' && goals.length === 1) {
    const goalLine = String(goals[0] || '').trim();
    const raw = goalLine.startsWith('@') ? goalLine.split(/\s+/).slice(1).join(' ') : goalLine;
    const parts = raw.split(/\s+/).filter(Boolean);
    const op = parts[0] || null;
    const args = parts.slice(1);
    const holeIdx = args.findIndex(a => a.startsWith('?'));
    const expected = (op === 'hasProperty' && holeIdx === 1)
      ? sanitizePredicate(example.label)
      : normalizeEntity(example.label, '?x');
    const answers = extractQueryAnswers(perGoal[0].result);
    const ok = answers.some(a => a === expected);
    return {
      category: ok ? CATEGORY.PASSED : CATEGORY.REASONING,
      correct: ok,
      reason: ok ? 'passed_query_answer' : 'query_answer_mismatch',
      details: ok
        ? `expected=${expected} matched_in_query_results`
        : `expected=${expected} answers=${JSON.stringify(answers.slice(0, 5))}`,
      translated,
      proveResult: { valid: ok, reason: ok ? null : 'query_answer_mismatch', stepsCount: 0, validatorOk: true, method: 'query_answer_match' },
      actual_nl,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

  // ---- Multi-choice labels: prove each choice and select candidate ----
  if (Array.isArray(example.choices) && example.choices.length >= 2 && typeof example.label === 'string') {
    const choiceResults = [];
    for (const choice of example.choices) {
      resetRefCounter();
      const choiceDsl = translateNL2DSL(String(choice), { source, isQuestion: true, ...translatorOptions }).dsl;
      const choiceGoal = validateQuestionDsl(choiceDsl);
      if (!choiceGoal.valid) {
        choiceResults.push({ choice, valid: false, reason: 'invalid_goal' });
        continue;
      }
      const choiceLine = choiceGoal.goals?.[0] || choiceDsl;
      const choiceAction = choiceGoal.action || (choiceLine.includes('?') ? 'query' : 'prove');
      if (options.autoDeclareUnknownOperators === true && Array.isArray(choiceGoal.declaredOperators) && choiceGoal.declaredOperators.length > 0) {
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

    const correct = normalizeTextKey(predicted) === normalizeTextKey(example.label);
    return {
      category: correct ? CATEGORY.PASSED : CATEGORY.REASONING,
      correct,
      reason: correct ? 'passed_multi_choice' : 'multi_choice_mismatch',
      details: `predicted=${JSON.stringify(predicted)} label=${JSON.stringify(example.label)} trueChoices=${trueChoices.length}`,
      translated,
      proveResult: { valid: correct, reason: null, stepsCount: 0, validatorOk: true, method: 'multi_choice_probe' },
      actual_nl,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

  // ---- CLUTRR: prove ground-truth relation for (A,B) ----
  if (example.source === 'clutrr' && typeof example.label === 'string') {
    const qText = String(example.question || '');
    const m = qText.match(/\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/) || qText.match(/\(\s*\"([^\"]+)\"\s*,\s*\"([^\"]+)\"\s*\)/);
    if (m) {
      const a = normalizeEntity(m[1], '?x');
      const b = normalizeEntity(m[2], '?x');
      const rel = sanitizePredicate(example.label);
      if (rel) {
        if (options.autoDeclareUnknownOperators === true) {
          session.learn(`@${rel}:${rel} __Relation`);
        }
        const goalLine = `@goal:goal ${rel} ${a} ${b}`;
        const res = session.prove(goalLine, { timeout: 2000, includeSearchTrace: false });
        const ok = res?.valid === true;
        return {
          category: ok ? CATEGORY.PASSED : CATEGORY.REASONING,
          correct: ok,
          reason: ok ? 'passed_clutrr_relation' : 'clutrr_relation_not_proved',
          details: `goal=${goalLine}`,
          translated: { ...translated, questionDsl: goalLine },
          proveResult: { valid: ok, reason: res?.reason || null, stepsCount: res?.steps?.length || 0, validatorOk: res?.proofObject?.validatorOk, method: res?.method || null },
          actual_nl,
          durationMs: performance.now() - startTime,
          caseId,
          sessionConfig
        };
      }
    }
  }

  // ---- Abduction dataset: explanation task (not boolean entailment) ----
  if (example.source === 'abduction') {
    return {
      category: CATEGORY.UNSUPPORTED,
      correct: false,
      reason: 'abduction_explanation_task',
      details: `label=${JSON.stringify(example.label ?? null)} question=${JSON.stringify(example.question ?? null)}`,
      translated,
      proveResult: { valid: false, reason: 'abduction_explanation_task', stepsCount: 0, validatorOk: true, method: null },
      actual_nl,
      durationMs: performance.now() - startTime,
      caseId,
      sessionConfig
    };
  }

  return null;
}

import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function loadPatterns() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const file = join(__dirname, 'patterns.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const PATTERNS = loadPatterns();

export const BUG_PATTERNS = PATTERNS.bugs || {};
export const NLP_BUG_PATTERNS = PATTERNS.nlpBugs || {};

function safeRegex(re, flags = 'i') {
  try {
    return new RegExp(String(re || ''), flags);
  } catch {
    return null;
  }
}

function tokenCount(text, token) {
  if (!text || !token) return 0;
  const re = safeRegex(token, 'g');
  if (!re) return 0;
  return (String(text).match(re) || []).length;
}

function matchesAny(text, regexList) {
  const s = String(text || '');
  for (const r of regexList || []) {
    const re = safeRegex(r);
    if (re && re.test(s)) return true;
  }
  return false;
}

function matchesAll(text, regexList) {
  const s = String(text || '');
  for (const r of regexList || []) {
    const re = safeRegex(r);
    if (!re || !re.test(s)) return false;
  }
  return true;
}

function includesIn(value, list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.includes(value);
}

function matchesDetector(detector, { dsl, context, source, category, choicesLen }) {
  if (!detector?.id) return false;

  const restrictsSourceOrCategory = Array.isArray(detector.sourceIn) || Array.isArray(detector.categoryIn);
  if (restrictsSourceOrCategory) {
    const okSource = Array.isArray(detector.sourceIn) ? includesIn(source, detector.sourceIn) : false;
    const okCategory = Array.isArray(detector.categoryIn) ? includesIn(category, detector.categoryIn) : false;
    if (!okSource && !okCategory) return false;
  }

  if (typeof detector.minChoices === 'number' && choicesLen < detector.minChoices) return false;

  if (Array.isArray(detector.dslAnyRegex) && detector.dslAnyRegex.length > 0 && !matchesAny(dsl, detector.dslAnyRegex)) return false;
  if (Array.isArray(detector.dslAllRegex) && detector.dslAllRegex.length > 0 && !matchesAll(dsl, detector.dslAllRegex)) return false;

  if (Array.isArray(detector.contextAnyRegex) && detector.contextAnyRegex.length > 0 && !matchesAny(context, detector.contextAnyRegex)) return false;
  if (Array.isArray(detector.contextAllRegex) && detector.contextAllRegex.length > 0 && !matchesAll(context, detector.contextAllRegex)) return false;

  if (detector.dslHasVariable === true && !/\?\w+/.test(dsl)) return false;

  if (detector.dslTokenCount?.token && typeof detector.dslTokenCount?.min === 'number') {
    if (tokenCount(dsl, detector.dslTokenCount.token) < detector.dslTokenCount.min) return false;
  }

  return true;
}

export function detectKnownBugPattern(translated, example, result = null) {
  const dsl = translated?.contextDsl || '';
  const source = example?.source || '';
  const category = example?.category || '';
  const choicesLen = Array.isArray(example?.choices) ? example.choices.length : 0;
  const context = example?.context || '';

  // First: task-level buckets that should never mix with structural reasoning patterns.
  const reason = String(result?.reason || '').trim();
  if (reason === 'query_answer_mismatch') return 'BUG010';
  if (reason === 'multi_choice_mismatch') return 'BUG006';
  if (reason === 'clutrr_relation_not_proved') return 'BUG004';
  if (reason === 'runtime_error') return 'BUG011';

  for (const detector of PATTERNS?.detectors?.bug || []) {
    if (matchesDetector(detector, { dsl, context, source, category, choicesLen })) {
      return detector.id;
    }
  }

  return null;
}

export function detectNlpBugPattern(reason, result, example) {
  for (const [nlpId, pattern] of Object.entries(NLP_BUG_PATTERNS)) {
    if (pattern.reason === reason) return nlpId;
  }

  if (matchesAny(result?.details || '', PATTERNS?.detectors?.nlp?.detailsAnyRegex || [])) {
    return 'NLP005';
  }

  const context = example?.context || '';
  if (context.length > 200 && reason === 'context_translation_empty') return 'NLP007';

  return null;
}

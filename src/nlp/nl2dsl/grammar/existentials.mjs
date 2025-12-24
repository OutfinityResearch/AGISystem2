import { clean, lower } from './text.mjs';
import { parseTypePhrase } from './parse/shared.mjs';

function splitList(raw) {
  const t = clean(raw);
  if (!t) return [];
  return t
    .replace(/\band\b/ig, ',')
    .split(',')
    .map(s => clean(s))
    .filter(Boolean);
}

/**
 * Parse existential copula clauses like:
 * - "There is an animal."
 * - "There are mammals."
 * - "There is no animal."
 * - "There exists a mammal."
 *
 * Returns a minimal Exists(...) statement:
 *   Exists x (isA $x Animal)
 * Or negated:
 *   Not (Exists x (isA $x Animal))
 */
export function parseExistentialCopula(text) {
  const t = clean(text);
  if (!t) return null;

  // Leave "there is a relation between A and B" to the relation parser.
  if (/\bbetween\b/i.test(t)) return null;

  // "there is/are/was/were ..."
  let m = t.match(/^there\s+(is|are|was|were)\s+(.+)$/i);
  let rest = null;
  if (m) {
    rest = m[2];
  } else {
    // "there exists ..."
    m = t.match(/^there\s+exists\s+(.+)$/i);
    if (!m) return null;
    rest = m[1];
  }

  const r = clean(rest);
  if (!r) return null;

  // Negated existentials: "no X", "not any X"
  const low = lower(r);
  const negated =
    low.startsWith('no ') ||
    low.startsWith('not any ') ||
    low.startsWith('noone ') ||
    low.startsWith('nobody ');

  const stripped = r
    .replace(/^(?:no|not\s+any)\s+/i, '')
    .replace(/^at\s+least\s+one\s+/i, '')
    .replace(/^(?:a|an|some|any)\s+/i, '');

  // Cut obvious relative clauses to avoid synthesizing huge type tokens.
  const head = stripped.split(/\b(?:that|which|who)\b/i)[0];
  const typeName = parseTypePhrase(head);
  if (!typeName) return null;

  return { negated, typeName };
}

/**
 * Extract simple existential hints from a sentence (best-effort):
 * - "in certain animals" -> Exists x (isA $x Animal)
 * - "some mammals"       -> Exists x (isA $x Mammal)
 * - "including humans"   -> Exists x (isA $x Human)
 */
export function extractExistentialTypeClaims(sentence) {
  const t = clean(sentence);
  if (!t) return [];

  const types = new Set();

  const inCertain = t.match(/\b(?:in|among)\s+(?:certain|some|various)\s+([^,.;]+)/i);
  if (inCertain) {
    const typeName = parseTypePhrase(inCertain[1]);
    if (typeName) types.add(typeName);
  }

  // "some X" / "certain X" anywhere (kept conservative: require plural-ish token).
  const quant = t.match(/\b(?:some|certain|various)\s+([A-Za-z][A-Za-z0-9_'-]*(?:\s+[A-Za-z][A-Za-z0-9_'-]*)*)/i);
  if (quant) {
    const typeName = parseTypePhrase(quant[1]);
    if (typeName) types.add(typeName);
  }

  const including = t.match(/\bincluding\s+([^.;]+)/i);
  if (including) {
    for (const item of splitList(including[1])) {
      const typeName = parseTypePhrase(item);
      if (typeName) types.add(typeName);
    }
  }

  return [...types];
}


/**
 * AGISystem2 - NL2DSL Utilities
 * @module nlp/nl2dsl/utils
 *
 * Shared utility functions for NL to DSL translation
 */

import { KEYWORDS } from '../../core/constants.mjs';

// Reference counter for generating unique names
let refCounter = 0;

/**
 * Reset reference counter (call between examples)
 */
export function resetRefCounter() {
  refCounter = 0;
}

/**
 * Generate unique reference name
 * @param {string} prefix - Prefix for the reference
 * @returns {string} Unique reference name
 */
export function genRef(prefix = 'ref') {
  return `${prefix}${refCounter++}`;
}

// Generic class nouns are placeholders, not domain types.
// Keep this set intentionally small and based on function-like nouns.
export const GENERIC_CLASS_NOUNS = new Set([
  'thing',
  'things',
  'someone',
  'something'
]);

export function isGenericClassNoun(word) {
  const w = singularize(word);
  return GENERIC_CLASS_NOUNS.has(w);
}

export function isPlural(word) {
  const w = String(word || '').toLowerCase().trim();
  if (!w) return false;
  if (['fungi', 'cacti', 'bacteria', 'criteria', 'phenomena', 'data'].includes(w)) return true;
  if (['people', 'mice', 'children', 'men', 'women', 'feet', 'teeth', 'things', 'sheep', 'deer', 'fish'].includes(w)) return true;
  if (w.endsWith('uses') && w.length > 4) return true; // wumpuses
  if (w.endsWith('ies') && w.length > 3) return true;
  if (w.endsWith('es') && w.length > 3) return true;
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && w.length > 2) return true;
  return false;
}

/**
 * Capitalize first letter
 * @param {string} s - String to capitalize
 * @returns {string}
 */
export function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Singularize a noun
 * @param {string} word - Word to singularize
 * @returns {string}
 */
export function singularize(word) {
  const w = String(word || '').toLowerCase().trim();
  if (!w) return w;
  if (w === 'wolves') return 'wolf';
  if (w === 'fungi') return 'fungus';
  if (w === 'cacti') return 'cactus';
  if (w === 'bacteria') return 'bacterium';
  if (w === 'criteria') return 'criterion';
  if (w === 'phenomena') return 'phenomenon';
  if (w === 'data') return 'datum';
  if (w === 'people') return 'person';
  if (w === 'mice') return 'mouse';
  if (w === 'children') return 'child';
  if (w === 'men') return 'man';
  if (w === 'women') return 'woman';
  if (w === 'livingthings') return 'livingthing';
  // ProntoQA-style invented nouns often use "-us" as singular suffix (wumpus/impus/etc).
  // Avoid stripping the final "s" in singular forms like "impus".
  if (w.endsWith('us')) return w;
  if (w.endsWith('uses')) return w.slice(0, -2); // wumpuses -> wumpus
  if (w.endsWith('ies') && w.length > 3) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 1) return w.slice(0, -1);
  return w;
}

/**
 * Check if word is a type noun
 * @param {string} word
 * @returns {boolean}
 */
export function isTypeNoun(word) {
  // Heuristic: treat plurals as types unless they are generic placeholders.
  return isPlural(word) && !isGenericClassNoun(word);
}

/**
 * Normalize type name
 * @param {string} word
 * @returns {string}
 */
export function normalizeTypeName(word) {
  const cleaned = String(word || '').replace(/[^a-zA-Z0-9_]/g, '');
  const w = singularize(cleaned);
  const t = capitalize(w);
  if (t && /^[0-9]/.test(t)) return `T${t}`;
  return t;
}

/**
 * Sanitize entity name
 * @param {string} name
 * @returns {string}
 */
export function sanitizeEntity(name) {
  if (!name) return name;
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '');
  const e = capitalize(cleaned);
  if (e && /^[0-9]/.test(e)) return `E${e}`;
  return e;
}

/**
 * Sanitize predicate/property/operator identifier for DSL.
 * DSL lexer accepts [a-zA-Z0-9_]; anything else (e.g. hyphens, apostrophes) must be removed.
 * @param {string} name
 * @returns {string}
 */
export function sanitizePredicate(name) {
  if (!name) return '';
  const cleaned = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  if (!cleaned) return '';
  if (KEYWORDS.includes(cleaned)) return `${cleaned}_op`;
  return cleaned;
}

/**
 * Split text into sentences
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  if (!text) return [];
  const DOT = '__DOT__';
  let t = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Many datasets separate clauses by newlines or rule markers instead of punctuation.
  // Convert those separators into sentence boundaries before whitespace normalization.
  t = t.replace(/\n+/g, '. ');
  // Treat semicolons as sentence boundaries (common in longer passages).
  t = t.replace(/;\s+/g, '. ');
  // Split "rules: (r0, 0.37): ..." style blocks into per-rule sentences.
  t = t.replace(/(?<!:)\s+(\(\s*r\d+\s*(?:,\s*[0-9.]+)?\s*\)\s*:)\s*/gi, '. $1 ');
  // Split on explicit hypothesis markers.
  t = t.replace(/\s*(hypothesis\s*:)\s*/gi, '. $1 ');

  t = t.replace(/\s+/g, ' ').trim();

  // Protect common abbreviations and numeric/initialism dots from sentence splitting.
  t = t.replace(/\b(No|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)\./g, `$1${DOT}`);
  t = t.replace(/(\d)\.(\d)/g, `$1${DOT}$2`);
  t = t.replace(/\b(?:[A-Z]\.){2,}/g, (m) => m.replace(/\./g, DOT));

  return t
    .split(/[.?!]\s+/)
    .map(s => s.replaceAll(DOT, '.').trim().replace(/[.?!]+$/, ''))
    .filter(Boolean);
}

/**
 * Normalize entity reference
 * @param {string} text - Entity text
 * @param {string} defaultVar - Default variable if pronoun
 * @returns {string}
 */
export function normalizeEntity(text, defaultVar = '?x') {
  const lower = text.toLowerCase().trim();
  if (['someone', 'something', 'they', 'it', 'he', 'she'].includes(lower)) {
    return defaultVar;
  }
  // RuleBERT / soft-rules style role variables: "first person", "second person", etc.
  // Map to stable variable names so rules can contain multiple variables.
  const role = lower.replace(/^the\s+/, '').trim();
  const roleMatch = role.match(/^(first|second|third|fourth|fifth)\s+(person|thing|place)$/);
  if (roleMatch) {
    const ordinal = roleMatch[1];
    const map = { first: '?x', second: '?y', third: '?z', fourth: '?w', fifth: '?v' };
    return map[ordinal] || defaultVar;
  }
  const withoutThe = lower.replace(/^the\s+/, '').replace(/^(?:a|an)\s+/, '');
  const parts = withoutThe
    .split(/\s+/)
    .map(p => p.replace(/[^a-zA-Z0-9_]/g, ''))
    .filter(Boolean);
  const token = parts.map(p => capitalize(p)).join('');
  if (!token) return defaultVar;
  if (/^[0-9]/.test(token)) return `E${token}`;
  return token;
}

/**
 * Normalize verb to base form
 * @param {string} verb
 * @returns {string}
 */
export function normalizeVerb(verb) {
  const v = String(verb || '').toLowerCase().trim();
  const verbMap = {
    like: 'likes',
    love: 'loves',
    hate: 'hates',
    need: 'requires'
  };
  return verbMap[v] || v;
}

/**
 * Check if sentence is a rule
 * @param {string} sentence
 * @returns {boolean}
 */
export function isRule(sentence) {
  const lowerSentence = sentence.toLowerCase();
  return (
    lowerSentence.startsWith('if ') ||
    lowerSentence.startsWith('all ') ||
    lowerSentence.startsWith('every ') ||
    lowerSentence.startsWith('each ') ||
    lowerSentence.startsWith('everything that ') ||
    lowerSentence.includes(' then ')
  );
}

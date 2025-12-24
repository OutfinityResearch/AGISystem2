import {
  capitalize,
  singularize,
  normalizeEntity,
  isPlural,
  sanitizePredicate
} from '../../utils.mjs';

import { CORE_OPERATOR_CATALOG } from '../../../../runtime/operator-catalog.mjs';
import { clean, lower, detectNegationPrefix } from '../text.mjs';

export function isKnownOperator(op) {
  return CORE_OPERATOR_CATALOG.has(op);
}

export function parseTypePhrase(text) {
  const t = clean(text)
    .replace(/^(?:a|an)\s+/i, '')
    .trim();
  if (!t) return null;
  const rawParts = t.split(/\s+/).filter(Boolean);
  const parts = rawParts.map((p, idx) => {
    const cleaned = String(p).replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleaned) return '';
    const token = idx === rawParts.length - 1 ? singularize(cleaned) : cleaned;
    return capitalize(token);
  });
  return parts.filter(Boolean).join('');
}

export function parsePredicateItem(item, subject) {
  const { negated, rest } = detectNegationPrefix(item);
  const r = clean(rest);
  if (!r) return null;

  const isType = /^(?:a|an)\s+/i.test(r) || isPlural(r) || /^[A-Z]/.test(r);
  if (isType) {
    const typeName = parseTypePhrase(r);
    if (!typeName) return null;
    return { negated, atom: { op: 'isA', args: [subject, typeName] } };
  }

  const last = r.split(/\s+/).filter(Boolean).slice(-1)[0];
  if (!last) return null;
  const prop = sanitizePredicate(last);
  if (!prop) return null;
  return { negated, atom: { op: 'hasProperty', args: [subject, prop] } };
}

export function parseSubjectNP(text, defaultVar = '?x', options = {}) {
  const t = clean(text);
  if (!t) return { subject: defaultVar, extraCondition: null };

  const low = lower(t);
  if (['someone', 'something', 'they', 'it', 'he', 'she'].includes(low)) {
    return { subject: defaultVar, extraCondition: null };
  }

  const m = t.match(/^(?:a|an)\s+(.+)$/i);
  if (m) {
    if (options.indefiniteAsEntity === true) {
      return { subject: normalizeEntity(m[1], defaultVar), extraCondition: null };
    }
    const typeName = parseTypePhrase(m[1]);
    if (typeName) {
      return {
        subject: defaultVar,
        extraCondition: { op: 'isA', args: [defaultVar, typeName] }
      };
    }
  }

  const normalized = t.replace(/^the\s+/i, '');
  return { subject: normalizeEntity(normalized, defaultVar), extraCondition: null };
}

/**
 * Collapse consecutive capitalized words into single entity tokens.
 * E.g., "Robert Lewandowski left Bayern Munchen" -> "RobertLewandowski left BayernMunchen"
 */
export function collapseProperNames(text) {
  return String(text || '').replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, (match) => {
    return match.split(/\s+/).join('');
  });
}

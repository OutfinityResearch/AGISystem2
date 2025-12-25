import {
  capitalize,
  singularize,
  normalizeEntity,
  normalizeTypeName,
  isPlural,
  isGenericClassNoun,
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

function normalizeObjectArg(text, defaultVar = '?x') {
  const t = clean(text)
    .replace(/^(?:a|an|the)\s+/i, '')
    .trim();
  if (!t) return defaultVar;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1 && isPlural(words[0]) && !isGenericClassNoun(words[0])) {
    const typeName = normalizeTypeName(singularize(words[0]));
    if (typeName) return typeName;
  }
  return normalizeEntity(t, defaultVar);
}

function looksLikeTypePhrase(text) {
  const t = clean(text);
  if (!t) return false;
  if (/^(?:a|an)\s+/i.test(t)) return true;
  if (/^[A-Z]/.test(t)) return true;
  const tokens = t.split(/\s+/).filter(Boolean);
  const last = tokens[tokens.length - 1] || '';
  // Multi-word noun phrases like "bile duct cancer" are almost always types in logic corpora.
  // Prefer isA(...) over collapsing everything to a trailing-word property.
  if (tokens.length >= 2) return true;
  return isPlural(last);
}

export function parsePredicateItem(item, subject) {
  const { negated, rest } = detectNegationPrefix(item);
  const r = clean(rest);
  if (!r) return null;

  // Relative clauses inside type phrases: "animals that bark" => Animal(x) ∧ bark(x)
  const rel = r.match(/^(.+?)\s+(?:that|who|which)\s+(.+)$/i);
  if (rel) {
    const baseText = rel[1].trim();
    let relText = rel[2].trim();
    relText = relText.replace(/^(?:are|is)\s+/i, '').trim();
    const baseType = parseTypePhrase(baseText);
    const items = [];
    if (baseType) items.push({ negated, atom: { op: 'isA', args: [subject, baseType] } });
    const relParsed = parsePredicateItem(relText, subject);
    const relItems = Array.isArray(relParsed) ? relParsed : (relParsed ? [relParsed] : []);
    for (const it of relItems) {
      if (!it?.atom) continue;
      items.push(negated ? { ...it, negated: !it.negated } : it);
    }
    return items.length > 0 ? items : null;
  }

  // Adjective + preposition: "afraid of wolves" => afraid(x, Wolf)
  const prepRel = r.match(/^([a-z][a-z0-9_'-]*)\s+(of|to|with|from|for)\s+(.+)$/i);
  if (prepRel) {
    const op = sanitizePredicate(prepRel[1]);
    const obj = normalizeObjectArg(prepRel[3], '?x');
    if (op && obj) {
      return { negated, atom: { op, args: [subject, obj] } };
    }
  }

  const isType = looksLikeTypePhrase(r);
  if (isType) {
    const typeName = parseTypePhrase(r);
    if (!typeName) return null;
    return { negated, atom: { op: 'isA', args: [subject, typeName] } };
  }

  // "has/have <noun>" as a predicate phrase (common in relative clauses).
  const have = r.match(/^(?:has|have)\s+(.+)$/i);
  if (have) {
    const last = clean(have[1]).split(/\s+/).filter(Boolean).slice(-1)[0];
    const prop = sanitizePredicate(last);
    if (prop) return { negated, atom: { op: 'hasProperty', args: [subject, prop] } };
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

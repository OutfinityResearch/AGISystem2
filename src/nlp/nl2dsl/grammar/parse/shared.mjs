import {
  capitalize,
  singularize,
  normalizeEntity,
  normalizeVerb,
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
  // Heuristic: multi-word phrases are often types in logic corpora, but verb-ish phrases
  // like "work in the library" should be treated as properties/relations instead.
  if (tokens.length >= 2) {
    const first = tokens[0] || '';
    const second = String(tokens[1] || '').toLowerCase();
    const preps = new Set(['in', 'on', 'at', 'by', 'to', 'from', 'with', 'for', 'of', 'near', 'behind', 'beside', 'under', 'over', 'inside', 'outside']);
    const det = new Set(['the', 'a', 'an', 'their', 'his', 'her', 'its', 'my', 'your', 'our', 'some', 'any', 'no', 'every', 'each']);
    const verbish = /^[a-z]/.test(first) && (preps.has(second) || det.has(second) || /(?:ing|ed)$/.test(first));
    if (!verbish) return true;
  }
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

  // Participial modifiers inside type phrases:
  // "a student working in the lab" => Student(x) ∧ working_in_lab(x)
  // "students taking the database course" => Student(x) ∧ taking_database_course(x)
  const part = r.match(/^(.+?)\s+([a-z][a-z0-9_'-]*(?:ing|ed))\s+(.+)$/i);
  if (part) {
    const baseText = part[1].trim();
    // Do not rewrite "have <noun> ..." via participial splitting; it should stay as hasProperty.
    if (!/^(?:has|have)\b/i.test(baseText)) {
      const baseClean = clean(baseText);
      const baseTokens = baseClean.split(/\s+/).filter(Boolean);
      const baseHead = baseTokens[baseTokens.length - 1] || '';
      const baseEligible =
        /^(?:a|an|the)\s+/i.test(baseClean) ||
        /^[A-Z]/.test(baseClean) ||
        (baseHead && isPlural(baseHead));

      // If the phrase starts with a participle ("taking ..."), treat it as a predicate/property,
      // not as a type + modifier split.
      if (baseEligible) {
        const relText = `${part[2]} ${part[3]}`.trim();
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
    }
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

  // "has/have <noun>" as a predicate phrase (common in relative clauses).
  const have = r.match(/^(?:has|have)\s+(.+)$/i);
  if (have) {
    const stripped = clean(have[1]).replace(/^(?:no|not\s+any)\s+/i, '').replace(/^(?:a|an|the)\s+/i, '').trim();
    const tokens = stripped.split(/\s+/).filter(Boolean);
    const det = new Set(['the', 'a', 'an']);
    const kept = tokens
      .map(t => String(t).toLowerCase())
      .filter(t => !det.has(t))
      .map(t => singularize(t));
    const preps = new Set(['in', 'on', 'at', 'by', 'to', 'from', 'with', 'for', 'of', 'near', 'behind', 'beside', 'under', 'over', 'inside', 'outside']);
    if (kept.length >= 2) {
      const first = kept[0] || '';
      const second = kept[1] || '';
      const verbishHead = preps.has(second) || det.has(second) || /(?:ing|ed)$/.test(first);
      if (verbishHead) kept[0] = normalizeVerb(first);
    }
    const keyTokens = kept.length <= 10 ? kept : [...kept.slice(0, 5), ...kept.slice(-3)];
    const key = keyTokens.join('_');
    const prop = sanitizePredicate(key) || sanitizePredicate(keyTokens[keyTokens.length - 1] || '');
    if (prop) return { negated, atom: { op: 'hasProperty', args: [subject, prop] } };
  }

  const isType = looksLikeTypePhrase(r);
  if (isType) {
    const typeName = parseTypePhrase(r);
    if (!typeName) return null;
    return { negated, atom: { op: 'isA', args: [subject, typeName] } };
  }

  const tokens = r.split(/\s+/).filter(Boolean).map(t => String(t).toLowerCase());
  const det = new Set(['the', 'a', 'an']);
  const kept = tokens.filter(t => !det.has(t)).map(t => singularize(t));
  const preps = new Set(['in', 'on', 'at', 'by', 'to', 'from', 'with', 'for', 'of', 'near', 'behind', 'beside', 'under', 'over', 'inside', 'outside']);
  if (kept.length >= 2) {
    const first = kept[0] || '';
    const second = kept[1] || '';
    const verbishHead = preps.has(second) || det.has(second) || /(?:ing|ed)$/.test(first);
    if (verbishHead) kept[0] = normalizeVerb(first);
  }
  const keyTokens = kept.length <= 10 ? kept : [...kept.slice(0, 5), ...kept.slice(-3)];
  const key = keyTokens.join('_');
  const prop = sanitizePredicate(key) || sanitizePredicate(keyTokens[keyTokens.length - 1] || '');
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

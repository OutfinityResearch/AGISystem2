import {
  genRef,
  capitalize,
  singularize,
  normalizeEntity,
  normalizeVerb,
  isPlural,
  isGenericClassNoun,
  normalizeTypeName
} from '../utils.mjs';

import { CORE_OPERATOR_CATALOG } from '../../../runtime/operator-catalog.mjs';
import { clean, lower, splitCoord, detectNegationPrefix } from './text.mjs';
import { emitAtomLine, emitNotFact, emitExprAsRefs } from './emit.mjs';

function isKnownOperator(op) {
  return CORE_OPERATOR_CATALOG.has(op);
}

function parseTypePhrase(text) {
  const t = clean(text)
    .replace(/^(?:a|an)\s+/i, '')
    .trim();
  if (!t) return null;
  const rawParts = t.split(/\s+/).filter(Boolean);
  const parts = rawParts.map((p, idx) => {
    const token = idx === rawParts.length - 1 ? singularize(p) : p;
    return capitalize(token);
  });
  return parts.join('');
}

function parsePredicateItem(item, subject) {
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
  return { negated, atom: { op: 'hasProperty', args: [subject, last.toLowerCase()] } };
}

function parseSubjectNP(text, defaultVar = '?x') {
  const t = clean(text);
  if (!t) return { subject: defaultVar, extraCondition: null };

  const low = lower(t);
  if (['someone', 'something', 'they', 'it', 'he', 'she'].includes(low)) {
    return { subject: defaultVar, extraCondition: null };
  }

  const m = t.match(/^(?:a|an)\s+(.+)$/i);
  if (m) {
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

export function parseCopulaClause(text, defaultVar = '?x') {
  const t = clean(text);
  const m = t.match(/^(.*?)\s+(?:is|are)\s+(not\s+)?(.+)$/i);
  if (!m) return null;
  const [, subjectRaw, notPart, predRaw] = m;

  const { subject, extraCondition } = parseSubjectNP(subjectRaw, defaultVar);
  const negated = !!notPart;

  const pred = clean(predRaw);
  const parsed = parsePredicateItem(pred, subject);
  if (!parsed) return null;

  const items = [];
  if (extraCondition) items.push({ negated: false, atom: extraCondition });
  items.push({ negated, atom: parsed.atom });
  return { op: 'And', items };
}

/**
 * Collapse consecutive capitalized words into single entity tokens.
 * E.g., "Robert Lewandowski left Bayern Munchen" -> "RobertLewandowski left BayernMunchen"
 */
function collapseProperNames(text) {
  // Match sequences of 2+ capitalized words (proper names)
  return text.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, (match) => {
    return match.split(/\s+/).join('');
  });
}

export function parseRelationClause(text, defaultVar = '?x', options = {}) {
  const t = clean(text);
  if (!t) return null;

  const low = lower(t);
  const hasNot = /\bdoes\s+not\b/i.test(low) || /\bdo\s+not\b/i.test(low);

  let normalized = t
    .replace(/\bdoes\s+not\s+/i, '')
    .replace(/\bdo\s+not\s+/i, '');

  // Collapse multi-word proper names before parsing
  normalized = collapseProperNames(normalized);

  let m = normalized.match(/^(?:the\s+)?(.+?)\s+([A-Za-z_][A-Za-z0-9_'-]*)\s+(?:the\s+)?(.+)$/i);
  if (!m) return null;
  let [, subjRaw, verbRaw, objRaw] = m;

  const maybeVerbClause = subjRaw &&
    !subjRaw.includes(' ') &&
    subjRaw === subjRaw.toLowerCase() &&
    /^[a-z]+$/.test(subjRaw) &&
    verbRaw &&
    objRaw;
  if (maybeVerbClause) {
    objRaw = verbRaw + ' ' + objRaw;
    verbRaw = subjRaw;
    subjRaw = defaultVar;
  }

  const subject = normalizeEntity(subjRaw, defaultVar);
  const object = normalizeEntity(objRaw, defaultVar);

  const verbLower = String(verbRaw || '').toLowerCase();
  const base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
  const op = normalizeVerb(base);

  if (!isKnownOperator(op)) {
    if (options.autoDeclareUnknownOperators) {
      return { op: 'And', items: [{ negated: hasNot, atom: { op, args: [subject, object] } }], declaredOperators: [op] };
    }
    return {
      kind: 'error',
      error: `Unknown operator '${op}' derived from verb '${verbLower}'`,
      unknownOperator: op
    };
  }

  return { op: 'And', items: [{ negated: hasNot, atom: { op, args: [subject, object] } }] };
}

function parsePredicateGroup(text, subject) {
  const { op, items } = splitCoord(text);
  const parsed = items.map(it => parsePredicateItem(it, subject)).filter(Boolean);
  if (parsed.length === 0) return null;
  return { op, items: parsed };
}

function parseClauseGroup(text, defaultVar, options = {}) {
  const { items } = splitCoord(text);
  const parsedItems = [];
  const errors = [];
  const declaredOperators = [];
  for (const raw of items) {
    const copula = parseCopulaClause(raw, defaultVar);
    if (copula) {
      parsedItems.push(...copula.items);
      continue;
    }
    const rel = parseRelationClause(raw, defaultVar, options);
    if (!rel) continue;
    if (rel.kind === 'error') {
      errors.push(rel.error);
      continue;
    }
    if (Array.isArray(rel.declaredOperators)) declaredOperators.push(...rel.declaredOperators);
    parsedItems.push(...rel.items);
  }
  if (errors.length > 0) return { kind: 'error', error: errors.join('; ') };
  if (parsedItems.length === 0) return null;
  return { op: 'And', items: parsedItems, declaredOperators };
}

export function parseRuleSentence(sentence, options = {}) {
  const s = clean(sentence);
  if (!s) return null;

  const ifThen = s.match(/^if\s+(.+?)\s+then\s+(.+)$/i);
  if (ifThen) {
    const [, condPart, consPart] = ifThen;
    const cond = parseClauseGroup(condPart, '?x', options);
    const cons = parseClauseGroup(consPart, '?x', options);
    if (cond?.kind === 'error') return { kind: 'error', error: cond.error };
    if (cons?.kind === 'error') return { kind: 'error', error: cons.error };
    if (!cond || !cons) return null;
    const condEmit = emitExprAsRefs(cond.items, cond.op);
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return {
      lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`],
      declaredOperators: [...(cond.declaredOperators || []), ...(cons.declaredOperators || [])]
    };
  }

  const everythingThat = s.match(/^everything\s+that\s+is\s+(.+?)\s+is\s+(.+)$/i);
  if (everythingThat) {
    const [, condPart, consPart] = everythingThat;
    const cond = parsePredicateGroup(condPart, '?x');
    const cons = parsePredicateGroup(consPart, '?x');
    if (!cond || !cons) return null;
    const condEmit = emitExprAsRefs(cond.items, cond.op);
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

  const quant = s.match(/^(all|every|each)\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (quant) {
    const [, , subjectPart, predPart] = quant;
    const subjectWords = lower(subjectPart).split(/\s+/).filter(Boolean);
    if (subjectWords.length === 0) return null;

    const classWord = subjectWords[subjectWords.length - 1];
    const props = subjectWords.slice(0, -1);
    const condItems = [];

    if (!isGenericClassNoun(classWord)) {
      condItems.push({ negated: false, atom: { op: 'isA', args: ['?x', normalizeTypeName(classWord)] } });
    }
    for (const p of props) {
      if (!p) continue;
      condItems.push({ negated: false, atom: { op: 'hasProperty', args: ['?x', p.toLowerCase()] } });
    }

    const cons = parsePredicateGroup(predPart, '?x');
    if (!cons) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

  const implicit = s.match(/^(.+?)\s+(things|people)\s+are\s+(.+)$/i);
  if (implicit) {
    const [, propsPart, classNoun, predPart] = implicit;
    const props = propsPart
      .split(/[,\s]+/)
      .map(p => p.trim().toLowerCase())
      .filter(Boolean);

    const condItems = [];
    if (!isGenericClassNoun(classNoun)) {
      condItems.push({ negated: false, atom: { op: 'isA', args: ['?x', normalizeTypeName(classNoun)] } });
    }
    for (const p of props) {
      condItems.push({ negated: false, atom: { op: 'hasProperty', args: ['?x', p] } });
    }

    const cons = parsePredicateGroup(predPart, '?x');
    if (!cons) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

  const subsumption = s.match(/^(\w+(?:us)?e?s)\s+are\s+(\w+(?:us)?e?s)$/i);
  if (subsumption) {
    const [, fromPlural, toPlural] = subsumption;
    if (!isPlural(fromPlural) || !isPlural(toPlural)) return null;
    const antRef = genRef('ant');
    const consRef = genRef('cons');
    const fromType = normalizeTypeName(singularize(fromPlural));
    const toType = normalizeTypeName(singularize(toPlural));
    return {
      lines: [
        `@${antRef} isA ?x ${fromType}`,
        `@${consRef} isA ?x ${toType}`,
        `Implies $${antRef} $${consRef}`
      ]
    };
  }

  return null;
}

export function parseFactSentence(sentence, options = {}) {
  const s = clean(sentence);
  if (!s) return null;

  const copula = parseCopulaClause(s, '?x');
  if (copula) {
    const lines = [];
    for (const item of copula.items) {
      if (item.negated) lines.push(...emitNotFact(item.atom));
      else lines.push(emitAtomLine(item.atom));
    }
    return { lines };
  }

  const rel = parseRelationClause(s, '?x', options);
  if (rel?.kind === 'error') return rel;
  if (rel) {
    const lines = [];
    const declaredOperators = Array.isArray(rel.declaredOperators) ? rel.declaredOperators : [];
    for (const item of rel.items) {
      if (item.negated) lines.push(...emitNotFact(item.atom));
      else lines.push(emitAtomLine(item.atom));
    }
    return { lines, declaredOperators };
  }

  return null;
}

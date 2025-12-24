import {
  genRef,
  capitalize,
  singularize,
  normalizeEntity,
  normalizeVerb,
  isPlural,
  isGenericClassNoun,
  normalizeTypeName,
  sanitizePredicate
} from '../utils.mjs';

import { CORE_GRAPH_ARITY, CORE_OPERATOR_CATALOG } from '../../../runtime/operator-catalog.mjs';
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
    const cleaned = String(p).replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleaned) return '';
    const token = idx === rawParts.length - 1 ? singularize(cleaned) : cleaned;
    return capitalize(token);
  });
  return parts.filter(Boolean).join('');
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
  const prop = sanitizePredicate(last);
  if (!prop) return null;
  return { negated, atom: { op: 'hasProperty', args: [subject, prop] } };
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
  const t = clean(text)
    .replace(/\bisn't\b/ig, 'is not')
    .replace(/\baren't\b/ig, 'are not')
    .replace(/\bwasn't\b/ig, 'was not')
    .replace(/\bweren't\b/ig, 'were not');
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
  const hasNot = /\bdoes\s+not\b/i.test(low) ||
    /\bdo\s+not\b/i.test(low) ||
    /\bdoesn't\b/i.test(low) ||
    /\bdon't\b/i.test(low) ||
    /\bdidn't\b/i.test(low);

  let normalized = t
    .replace(/\bdoes\s+not\s+/i, '')
    .replace(/\bdo\s+not\s+/i, '')
    .replace(/\bdoesn't\s+/i, '')
    .replace(/\bdon't\s+/i, '')
    .replace(/\bdidn't\s+/i, '');

  // Collapse multi-word proper names before parsing
  normalized = collapseProperNames(normalized);

  // Implicit-subject verb clause (common in conjunctions inside rules):
  // "visit the store", "wake up every day", etc.
  const implicitVerbFirst = normalized.match(/^([a-z][a-z0-9_'-]*)(?:\s+([a-z][a-z0-9_'-]*))?\s+(.+)$/);
  if (implicitVerbFirst && defaultVar) {
    const [, w1, w2, restRaw] = implicitVerbFirst;
    const particles = new Set(['up', 'down', 'in', 'out', 'on', 'off', 'over', 'away', 'back']);
    const determiners = new Set(['the', 'a', 'an', 'their', 'his', 'her', 'its', 'my', 'your', 'our', 'some', 'any', 'no', 'every', 'each']);
    const secondLower = String(w2 || '').toLowerCase();
    const looksLikeVerbPhrase = particles.has(secondLower) || determiners.has(secondLower) || isKnownOperator(sanitizePredicate(w1));
    const subjectless = looksLikeVerbPhrase && !['someone', 'something', 'they', 'it', 'he', 'she'].includes(w1.toLowerCase());
    if (subjectless) {
      const verbPhrase = particles.has(secondLower) ? `${w1}_${secondLower}` : w1;
      const objPhrase = particles.has(secondLower) ? restRaw : `${w2 || ''} ${restRaw}`.trim();
      const subject = defaultVar;
      const object = normalizeEntity(objPhrase, defaultVar);
      const op = sanitizePredicate(normalizeVerb(verbPhrase));

      if (!op) return null;
      const expectedArity = CORE_GRAPH_ARITY.get(op);
      if (typeof expectedArity === 'number' && expectedArity !== 2) {
        const prop = sanitizePredicate(`${op}_${objPhrase.replace(/\s+/g, '_')}`);
        return { op: 'And', items: [{ negated: hasNot, atom: { op: 'hasProperty', args: [subject, prop || op] } }] };
      }

      if (!isKnownOperator(op)) {
        if (options.autoDeclareUnknownOperators) {
          return { op: 'And', items: [{ negated: hasNot, atom: { op, args: [subject, object] } }], declaredOperators: [op] };
        }
        return { kind: 'error', error: `Unknown operator '${op}' derived from verb '${verbPhrase}'`, unknownOperator: op };
      }

      return { op: 'And', items: [{ negated: hasNot, atom: { op, args: [subject, object] } }] };
    }
  }

  let m = normalized.match(/^(?:the\s+)?(.+?)\s+([A-Za-z_][A-Za-z0-9_'-]*)\s+(?:the\s+)?(.+)$/i);
  if (!m) {
    // Intransitive: "X sleeps", "Space sucks"
    const intr = normalized.match(/^(?:the\s+)?(.+?)\s+([A-Za-z_][A-Za-z0-9_'-]*)$/i);
    if (!intr) return null;
    const [, subjRaw, verbRaw] = intr;
    const subject = normalizeEntity(subjRaw, defaultVar);
    const verbLowerRaw = String(verbRaw || '').toLowerCase();
    const verbLower = sanitizePredicate(verbLowerRaw);
    if (!verbLower) return null;
    const base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
    const op = sanitizePredicate(normalizeVerb(base));

    const expectedArity = CORE_GRAPH_ARITY.get(op);
    if (typeof expectedArity === 'number' && expectedArity !== 1) {
      // Avoid invoking core graphs/macros with incompatible arity; treat as property instead.
      return { op: 'And', items: [{ negated: hasNot, atom: { op: 'hasProperty', args: [subject, op] } }] };
    }

    // Use hasProperty for intransitive predicates (more stable + inheritable).
    return { op: 'And', items: [{ negated: hasNot, atom: { op: 'hasProperty', args: [subject, op] } }] };
  }
  let [, subjRaw, verbRaw, objRaw] = m;

  const candidateVerbLowerRaw = String(subjRaw || '').toLowerCase();
  const candidateVerbLower = candidateVerbLowerRaw.replace(/[^a-z0-9_]/g, '');
  const candidateVerbBase = candidateVerbLower.endsWith('s') && candidateVerbLower.length > 3
    ? candidateVerbLower.slice(0, -1)
    : candidateVerbLower;
  const candidateVerbOp = normalizeVerb(candidateVerbBase);

  // Treat "<verb> <object>" as an implicit-subject clause ONLY when the first token
  // is a known operator; this avoids misclassifying noun subjects (e.g., "restaurant ...").
  const maybeVerbClause = subjRaw &&
    !subjRaw.includes(' ') &&
    subjRaw === subjRaw.toLowerCase() &&
    /^[a-z]+$/.test(subjRaw) &&
    isKnownOperator(candidateVerbOp) &&
    verbRaw &&
    objRaw;
  if (maybeVerbClause) {
    objRaw = verbRaw + ' ' + objRaw;
    verbRaw = subjRaw;
    subjRaw = defaultVar;
  }

  const subject = normalizeEntity(subjRaw, defaultVar);
  const object = normalizeEntity(objRaw, defaultVar);

  const verbLowerRaw = String(verbRaw || '').toLowerCase();
  const verbLower = sanitizePredicate(verbLowerRaw);
  if (!verbLower) return null;
  const base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
  const op = sanitizePredicate(normalizeVerb(base));

  const expectedArity = CORE_GRAPH_ARITY.get(op);
  if (typeof expectedArity === 'number' && expectedArity !== 2) {
    // Avoid invoking core graphs/macros with incompatible arity; translate as property instead.
    const rawObj = clean(objRaw).replace(/^(?:the|a|an)\s+/i, '');
    const prop = sanitizePredicate(`${op}_${rawObj.replace(/\s+/g, '_')}`);
    return { op: 'And', items: [{ negated: hasNot, atom: { op: 'hasProperty', args: [subject, prop || op] } }] };
  }

  if (!isKnownOperator(op)) {
    if (options.autoDeclareUnknownOperators) {
      return { op: 'And', items: [{ negated: hasNot, atom: { op, args: [subject, object] } }], declaredOperators: [op] };
    }
    return {
      kind: 'error',
      error: `Unknown operator '${op}' derived from verb '${verbLowerRaw}'`,
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
      const prop = sanitizePredicate(p);
      if (!prop) continue;
      condItems.push({ negated: false, atom: { op: 'hasProperty', args: ['?x', prop] } });
    }

    const cons = parsePredicateGroup(predPart, '?x');
    if (!cons) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

  // Bare plural universal: "<PluralType> are <predicate list>"
  // Example (ProntoQA): "Lempuses are lorpuses, impuses, and rompuses."
  const barePlural = s.match(/^(\w+)\s+are\s+(.+)$/i);
  if (barePlural) {
    const [, subjectPlural, predPart] = barePlural;
    if (!isPlural(subjectPlural) || isGenericClassNoun(subjectPlural)) return null;

    const condItems = [
      { negated: false, atom: { op: 'isA', args: ['?x', normalizeTypeName(singularize(subjectPlural))] } }
    ];

    const cons = parsePredicateGroup(predPart, '?x');
    if (!cons) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

  // Bare plural universal with intransitive predicate: "<PluralType> <verb>"
  // Example (FOLIO): "Plungers suck."
  const barePluralVerb = s.match(/^(\w+)\s+([A-Za-z_][A-Za-z0-9_'-]*)$/i);
  if (barePluralVerb) {
    const [, subjectPlural, verbRaw] = barePluralVerb;
    if (!isPlural(subjectPlural) || isGenericClassNoun(subjectPlural)) return null;
    const condItems = [
      { negated: false, atom: { op: 'isA', args: ['?x', normalizeTypeName(singularize(subjectPlural))] } }
    ];

    const verbLowerRaw = String(verbRaw || '').toLowerCase();
    const verbLower = sanitizePredicate(verbLowerRaw);
    if (!verbLower) return null;
    const base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
    const prop = sanitizePredicate(normalizeVerb(base));
    if (!prop) return null;

    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs([{ negated: false, atom: { op: 'hasProperty', args: ['?x', prop] } }], 'And');
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

  const implicit = s.match(/^(.+?)\s+(things|people)\s+are\s+(.+)$/i);
  if (implicit) {
    const [, propsPart, classNoun, predPart] = implicit;
    const props = propsPart
      .split(/[,\s]+/)
      .map(p => sanitizePredicate(p))
      .filter(Boolean);

    const condItems = [];
    if (!isGenericClassNoun(classNoun)) {
      condItems.push({ negated: false, atom: { op: 'isA', args: ['?x', normalizeTypeName(classNoun)] } });
    }
    for (const p of props) {
      if (!p) continue;
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

  // Copula list facts: "X is a A, a B, and a C." → emit multiple facts
  const copulaList = s.match(/^(.*?)\s+(is|are)\s+(.+)$/i);
  if (copulaList) {
    const [, subjRaw, verb, predRaw] = copulaList;
    const coord = splitCoord(predRaw);
    if (coord.items.length > 1) {
      const lines = [];
      for (const item of coord.items) {
        const clause = `${subjRaw} ${verb} ${item}`.trim();
        const cop = parseCopulaClause(clause, '?x');
        if (!cop) continue;
        for (const it of cop.items || []) {
          if (!it?.atom) continue;
          if (it.negated) lines.push(...emitNotFact(it.atom));
          else lines.push(emitAtomLine(it.atom));
        }
      }
      if (lines.length > 0) return { lines };
    }
  }

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

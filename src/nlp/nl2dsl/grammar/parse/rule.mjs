import {
  genRef,
  singularize,
  normalizeEntity,
  normalizeVerb,
  isPlural,
  isGenericClassNoun,
  normalizeTypeName,
  sanitizePredicate
} from '../../utils.mjs';

import { CORE_GRAPH_ARITY } from '../../../../runtime/operator-catalog.mjs';
import { clean, lower, splitCoord } from '../text.mjs';
import { emitExprAsRefs } from '../emit.mjs';
import { isKnownOperator, parsePredicateItem } from './shared.mjs';
import { parseCopulaClause } from './copula.mjs';
import { parseNonCopulaRelationClause, parseRelationClause } from './relation.mjs';

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
    const specialRel = parseNonCopulaRelationClause(raw, defaultVar, options);
    if (specialRel) {
      if (specialRel.kind === 'error') {
        errors.push(specialRel.error);
        continue;
      }
      if (Array.isArray(specialRel.declaredOperators)) declaredOperators.push(...specialRel.declaredOperators);
      parsedItems.push(...specialRel.items);
      continue;
    }

    const copula = parseCopulaClause(raw, defaultVar, options);
    if (copula) {
      if (Array.isArray(copula.declaredOperators)) declaredOperators.push(...copula.declaredOperators);
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

  const quantVerb = s.match(/^(all|every|each)\s+(\w+)\s+([A-Za-z_][A-Za-z0-9_'-]*)(?:\s+(.+))?$/i);
  if (quantVerb) {
    const [, , subjectPlural, verbRaw, objRaw] = quantVerb;
    if (!isPlural(subjectPlural) || isGenericClassNoun(subjectPlural)) return null;

    const typeName = normalizeTypeName(singularize(subjectPlural));
    const antRef = genRef('ant');

    const verbLowerRaw = String(verbRaw || '').toLowerCase();
    const verbLower = sanitizePredicate(verbLowerRaw);
    if (!verbLower) return null;
    const base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
    const op = sanitizePredicate(normalizeVerb(base));
    if (!op) return null;

    const declaredOperators = [];
    if (!isKnownOperator(op) && options.autoDeclareUnknownOperators) declaredOperators.push(op);

    const expectedArity = CORE_GRAPH_ARITY.get(op);
    const hasObj = !!String(objRaw || '').trim();
    if (typeof expectedArity === 'number' && expectedArity !== (hasObj ? 2 : 1)) {
      const prop = sanitizePredicate(`${op}_${String(objRaw || '').replace(/\s+/g, '_')}`);
      const consRef = genRef('cons');
      return {
        lines: [
          `@${antRef} isA ?x ${typeName}`,
          `@${consRef} hasProperty ?x ${prop || op}`,
          `Implies $${antRef} $${consRef}`
        ],
        declaredOperators
      };
    }

    const consRef = genRef('cons');
    if (!hasObj) {
      return {
        lines: [
          `@${antRef} isA ?x ${typeName}`,
          `@${consRef} hasProperty ?x ${op}`,
          `Implies $${antRef} $${consRef}`
        ],
        declaredOperators
      };
    }

    const object = normalizeEntity(objRaw, '?x');
    return {
      lines: [
        `@${antRef} isA ?x ${typeName}`,
        `@${consRef} ${op} ?x ${object}`,
        `Implies $${antRef} $${consRef}`
      ],
      declaredOperators
    };
  }

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

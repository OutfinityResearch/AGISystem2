import {
  normalizeEntity,
  normalizeVerb,
  sanitizePredicate
} from '../../utils.mjs';

import { CORE_GRAPH_ARITY } from '../../../../runtime/operator-catalog.mjs';
import { clean, lower, detectNegationPrefix } from '../text.mjs';
import { collapseProperNames, isKnownOperator } from './shared.mjs';

function disambiguateBinaryOp(op) {
  const rel = sanitizePredicate(`${op}_rel`);
  return rel || op;
}

function parseMovementToLocation(text, defaultVar = '?x') {
  const t = clean(text);
  if (!t) return null;

  // "Mary went to the kitchen", "John travelled to the hallway", etc.
  const m = t.match(/^(?:the\s+)?(.+?)\s+(went|travelled|traveled|journeyed|walked|ran|moved)\s+to\s+(?:the\s+)?(.+)$/i);
  if (!m) return null;
  const subject = normalizeEntity(m[1], defaultVar);
  const place = normalizeEntity(m[3], defaultVar);
  return { op: 'And', items: [{ negated: false, atom: { op: 'at', args: [subject, place] } }] };
}

function parsePossessionEvents(text, defaultVar = '?x') {
  const t = clean(text);
  if (!t) return null;

  // "Mary picked up the apple" -> has Mary Apple
  const pickup = t.match(/^(?:the\s+)?(.+?)\s+(picked\s+up|grabbed|took)\s+(?:the\s+)?(.+)$/i);
  if (pickup) {
    const subject = normalizeEntity(pickup[1], defaultVar);
    const obj = normalizeEntity(pickup[3], defaultVar);
    return { op: 'And', items: [{ negated: false, atom: { op: 'has', args: [subject, obj] } }] };
  }

  // "Mary dropped the apple" -> Not has Mary Apple (persistent negation fact emitted upstream)
  const drop = t.match(/^(?:the\s+)?(.+?)\s+(dropped|discarded|left)\s+(?:the\s+)?(.+)$/i);
  if (drop) {
    const subject = normalizeEntity(drop[1], defaultVar);
    const obj = normalizeEntity(drop[3], defaultVar);
    return { op: 'And', items: [{ negated: true, atom: { op: 'has', args: [subject, obj] } }] };
  }

  return null;
}

function parseFunctionalCall(text, defaultVar = '?x', options = {}) {
  const { negated: hasNot, rest } = detectNegationPrefix(text);
  const t = clean(rest);
  const m = t.match(/^([A-Za-z_][A-Za-z0-9_'-]*)\((.*)\)$/);
  if (!m) return null;

  const rawFn = m[1];
  const argsRaw = m[2];

  let op = sanitizePredicate(rawFn);
  if (!op) return null;

  let negated = hasNot;
  if (op.startsWith('neg') && op.length > 3) {
    const base = sanitizePredicate(op.slice(3));
    if (base) {
      op = base;
      negated = !negated;
    }
  }

  const args = String(argsRaw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(a => normalizeEntity(a, defaultVar));

  if (args.length === 0) return null;
  if (args.length === 1) {
    return { op: 'And', items: [{ negated, atom: { op: 'hasProperty', args: [args[0], op] } }] };
  }

  const expectedArity = CORE_GRAPH_ARITY.get(op);
  let effectiveOp = op;
  const declaredOperators = [];
  if (typeof expectedArity === 'number' && expectedArity !== 2) {
    // Core arity conflict: keep the explicit binary call by disambiguating the operator name.
    effectiveOp = disambiguateBinaryOp(op);
    if (options.autoDeclareUnknownOperators) declaredOperators.push(effectiveOp);
  }

  if (!isKnownOperator(effectiveOp)) {
    if (options.autoDeclareUnknownOperators) {
      return { op: 'And', items: [{ negated, atom: { op: effectiveOp, args: args.slice(0, 2) } }], declaredOperators: declaredOperators.length > 0 ? declaredOperators : [effectiveOp] };
    }
    return { kind: 'error', error: `Unknown operator '${effectiveOp}' derived from function '${rawFn}'`, unknownOperator: effectiveOp };
  }

  return { op: 'And', items: [{ negated, atom: { op: effectiveOp, args: args.slice(0, 2) } }], ...(declaredOperators.length > 0 ? { declaredOperators } : {}) };
}

function parseOfIsRelationClause(text, defaultVar = '?x', options = {}) {
  const t = clean(text);
  if (!t) return null;

  const m = t.match(/^(?:the\s+)?([A-Za-z_][A-Za-z0-9_'-]*)\s+of\s+(.+?)\s+(?:is|are|was|were)\s+(not\s+)?(.+)$/i);
  if (!m) return null;

  const [, relRaw, ofRaw, notPart, valueRaw] = m;
  const negated = !!notPart;
  const op = sanitizePredicate(relRaw);
  if (!op) return null;

  const ofEntity = normalizeEntity(ofRaw, defaultVar);
  const valueEntity = normalizeEntity(valueRaw, defaultVar);

  const expectedArity = CORE_GRAPH_ARITY.get(op);
  let effectiveOp = op;
  const declaredOperators = [];
  if (typeof expectedArity === 'number' && expectedArity !== 2) {
    effectiveOp = disambiguateBinaryOp(op);
    if (options.autoDeclareUnknownOperators) declaredOperators.push(effectiveOp);
  }

  if (!isKnownOperator(effectiveOp)) {
    if (options.autoDeclareUnknownOperators) {
      return { op: 'And', items: [{ negated, atom: { op: effectiveOp, args: [valueEntity, ofEntity] } }], declaredOperators: declaredOperators.length > 0 ? declaredOperators : [effectiveOp] };
    }
    return { kind: 'error', error: `Unknown operator '${effectiveOp}' derived from relation noun '${relRaw}'`, unknownOperator: effectiveOp };
  }

  return { op: 'And', items: [{ negated, atom: { op: effectiveOp, args: [valueEntity, ofEntity] } }], ...(declaredOperators.length > 0 ? { declaredOperators } : {}) };
}

function parseThereIsBetweenClause(text, defaultVar = '?x', options = {}) {
  const t = clean(text);
  if (!t) return null;

  const m = t.match(/^there\s+is\s+(?:a|an)?\s*([A-Za-z_][A-Za-z0-9_'-]*)\s+between\s+(.+?)\s+and\s+(.+)$/i);
  if (!m) return null;

  const [, relRaw, aRaw, bRaw] = m;
  const op = sanitizePredicate(relRaw);
  if (!op) return null;
  const a = normalizeEntity(aRaw, defaultVar);
  const b = normalizeEntity(bRaw, defaultVar);

  if (!isKnownOperator(op)) {
    if (options.autoDeclareUnknownOperators) {
      return { op: 'And', items: [{ negated: false, atom: { op, args: [a, b] } }], declaredOperators: [op] };
    }
    return { kind: 'error', error: `Unknown operator '${op}' derived from existential noun '${relRaw}'`, unknownOperator: op };
  }

  return { op: 'And', items: [{ negated: false, atom: { op, args: [a, b] } }] };
}

export function parseNonCopulaRelationClause(text, defaultVar = '?x', options = {}) {
  const t0 = clean(text);
  if (!t0) return null;

  // Functional calls like: successor(Alice,Michael), negparent(Alice,Bob)
  const fn = parseFunctionalCall(t0, defaultVar, options);
  if (fn) return fn;

  // Genitive relations like: "the parent of Jack is Harry"
  const ofIs = parseOfIsRelationClause(t0, defaultVar, options);
  if (ofIs) return ofIs;

  // Existentials like: "there is a relation between A and B"
  const between = parseThereIsBetweenClause(t0, defaultVar, options);
  if (between) return between;

  return null;
}

export function parseRelationClause(text, defaultVar = '?x', options = {}) {
  const special = parseNonCopulaRelationClause(text, defaultVar, options);
  if (special) return special;

  const t0 = clean(text);
  if (!t0) return null;

  const moved = parseMovementToLocation(t0, defaultVar);
  if (moved) return moved;

  const poss = parsePossessionEvents(t0, defaultVar);
  if (poss) return poss;

  const low = lower(t0);
  const hasNot = /\bdoes\s+not\b/i.test(low) ||
    /\bdo\s+not\b/i.test(low) ||
    /\bdoesn't\b/i.test(low) ||
    /\bdon't\b/i.test(low) ||
    /\bdidn't\b/i.test(low);

  let normalized = t0
    .replace(/\bdoes\s+not\s+/i, '')
    .replace(/\bdo\s+not\s+/i, '')
    .replace(/\bdoesn't\s+/i, '')
    .replace(/\bdon't\s+/i, '')
    .replace(/\bdidn't\s+/i, '');

  normalized = collapseProperNames(normalized);

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
      return { op: 'And', items: [{ negated: hasNot, atom: { op: 'hasProperty', args: [subject, op] } }] };
    }

    return { op: 'And', items: [{ negated: hasNot, atom: { op: 'hasProperty', args: [subject, op] } }] };
  }
  let [, subjRaw, verbRaw, objRaw] = m;

  const candidateVerbLowerRaw = String(subjRaw || '').toLowerCase();
  const candidateVerbLower = candidateVerbLowerRaw.replace(/[^a-z0-9_]/g, '');
  const candidateVerbBase = candidateVerbLower.endsWith('s') && candidateVerbLower.length > 3
    ? candidateVerbLower.slice(0, -1)
    : candidateVerbLower;
  const candidateVerbOp = normalizeVerb(candidateVerbBase);

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
  let effectiveOp = op;
  const declaredOperators = [];
  if (typeof expectedArity === 'number' && expectedArity !== 2) {
    effectiveOp = disambiguateBinaryOp(op);
    if (options.autoDeclareUnknownOperators) declaredOperators.push(effectiveOp);
  }

  if (!isKnownOperator(effectiveOp)) {
    if (options.autoDeclareUnknownOperators) {
      return { op: 'And', items: [{ negated: hasNot, atom: { op: effectiveOp, args: [subject, object] } }], declaredOperators: declaredOperators.length > 0 ? declaredOperators : [effectiveOp] };
    }
    return {
      kind: 'error',
      error: `Unknown operator '${effectiveOp}' derived from verb '${verbLowerRaw}'`,
      unknownOperator: effectiveOp
    };
  }

  return { op: 'And', items: [{ negated: hasNot, atom: { op: effectiveOp, args: [subject, object] } }], ...(declaredOperators.length > 0 ? { declaredOperators } : {}) };
}

export const __test = { parseFunctionalCall, parseOfIsRelationClause, parseThereIsBetweenClause };

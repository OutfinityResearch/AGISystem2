import { clean } from '../text.mjs';
import { normalizeEntity, normalizeVerb, sanitizePredicate } from '../../utils.mjs';
import { CORE_GRAPH_ARITY } from '../../../../runtime/operator-catalog.mjs';
import { parseSubjectNP, parsePredicateItem, isKnownOperator } from './shared.mjs';

function disambiguateBinaryOp(op) {
  const rel = sanitizePredicate(`${op}_rel`);
  return rel || op;
}

export function parseCopulaClause(text, defaultVar = '?x', options = {}) {
  const t = clean(text)
    .replace(/\bisn't\b/ig, 'is not')
    .replace(/\baren't\b/ig, 'are not')
    .replace(/\bwasn't\b/ig, 'was not')
    .replace(/\bweren't\b/ig, 'were not');
  const m = t.match(/^(.*?)\s+(?:is|are|was|were)\s+(not\s+)?(.+)$/i);
  if (!m) return null;
  const [, subjectRaw, notPart, predRaw] = m;

  const { subject, extraCondition } = parseSubjectNP(subjectRaw, defaultVar, options);
  const negated = !!notPart;

  const pred = clean(predRaw);

  // Locative copula: "X is in/on/at Y" (common in bAbI and narratives).
  const loc = pred.match(/^(in|on|at|under|over|inside|outside|near|behind|beside)\s+(?:the\s+)?(.+)$/i);
  if (loc) {
    const opRaw = loc[1];
    const objRaw = loc[2];
    let op = sanitizePredicate(normalizeVerb(opRaw));
    if (!op) return null;
    const object = normalizeEntity(objRaw, defaultVar);

    const expectedArity = CORE_GRAPH_ARITY.get(op);
    const declaredOperators = [];
    if (typeof expectedArity === 'number' && expectedArity !== 2) {
      op = disambiguateBinaryOp(op);
      if (options.autoDeclareUnknownOperators) declaredOperators.push(op);
    }
    if (!isKnownOperator(op) && options.autoDeclareUnknownOperators) declaredOperators.push(op);

    const items = [];
    if (extraCondition) items.push({ negated: false, atom: extraCondition });
    items.push({ negated, atom: { op, args: [subject, object] } });
    return { op: 'And', items, ...(declaredOperators.length > 0 ? { declaredOperators } : {}) };
  }

  // Relational-noun copula: "Harry is the parent of Jack."
  // (also supports "a/an parent of Jack" via clean() removing leading determiners in normalizeEntity).
  const relOf = pred.match(/^(?:the\s+)?([A-Za-z_][A-Za-z0-9_'-]*)\s+of\s+(.+)$/i);
  if (relOf) {
    const relRaw = relOf[1];
    const objRaw = relOf[2];
    let op = sanitizePredicate(relRaw);
    if (!op) return null;
    const object = normalizeEntity(objRaw, defaultVar);

    const expectedArity = CORE_GRAPH_ARITY.get(op);
    const declaredOperators = [];
    if (typeof expectedArity === 'number' && expectedArity !== 2) {
      op = disambiguateBinaryOp(op);
      if (options.autoDeclareUnknownOperators) declaredOperators.push(op);
    }
    if (!isKnownOperator(op) && options.autoDeclareUnknownOperators) declaredOperators.push(op);

    const items = [];
    if (extraCondition) items.push({ negated: false, atom: extraCondition });
    items.push({ negated, atom: { op, args: [subject, object] } });
    return { op: 'And', items, ...(declaredOperators.length > 0 ? { declaredOperators } : {}) };
  }

  const parsed = parsePredicateItem(pred, subject);
  if (!parsed) return null;

  const items = [];
  if (extraCondition) items.push({ negated: false, atom: extraCondition });
  items.push({ negated, atom: parsed.atom });
  return { op: 'And', items };
}

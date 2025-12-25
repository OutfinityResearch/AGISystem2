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
import { emitSubjectDescriptorItems, parseCopulaPredicates, parseHavePredicate, parseQuantifiedSubjectDescriptor } from './quantifiers.mjs';

function parsePredicateGroup(text, subject, options = {}) {
  const { op, items } = splitCoord(text);
  const parsedItems = [];
  const declaredOperators = [];
  for (const it of items) {
    const parsed = parsePredicateItem(it, subject);
    const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    for (const item of list) {
      if (!item?.atom) continue;
      parsedItems.push(item);
      const atomOp = item.atom.op;
      if (atomOp && !isKnownOperator(atomOp) && options.autoDeclareUnknownOperators) declaredOperators.push(atomOp);
    }
  }
  if (parsedItems.length === 0) return null;
  return { op, items: parsedItems, declaredOperators };
}

function parseClauseGroup(text, defaultVar, options = {}) {
  const t0 = clean(text);
  if (!t0) return null;

  // "SUBJ neither A nor B" => (not SUBJ A) and (not SUBJ B)
  const neither = t0.match(/^(.+?)\s+neither\s+(.+?)\s+nor\s+(.+)$/i);
  const neitherNegate = !!neither;
  const coord = neither
    ? { op: 'And', items: [`${neither[1]} ${neither[2]}`, `${neither[1]} ${neither[3]}`] }
    : splitCoord(t0);
  const { items } = coord;
  const parsedItems = [];
  const errors = [];
  const declaredOperators = [];
  let lastExplicitSubject = null;

  for (const raw of items) {
    const specialRel = parseNonCopulaRelationClause(raw, defaultVar, options);
    if (specialRel) {
      if (specialRel.kind === 'error') {
        errors.push(specialRel.error);
        continue;
      }
      if (Array.isArray(specialRel.declaredOperators)) declaredOperators.push(...specialRel.declaredOperators);
      const rebound = rebindDefaultSubject(specialRel.items, defaultVar, lastExplicitSubject);
      parsedItems.push(...(neitherNegate ? rebound.map(it => ({ ...it, negated: !it.negated })) : rebound));
      lastExplicitSubject = lastExplicitSubjectFromItems(rebound, defaultVar) || lastExplicitSubject;
      continue;
    }

    const copula = parseCopulaClause(raw, defaultVar, options);
    if (copula) {
      if (Array.isArray(copula.declaredOperators)) declaredOperators.push(...copula.declaredOperators);
      const rebound = rebindDefaultSubject(copula.items, defaultVar, lastExplicitSubject);
      parsedItems.push(...(neitherNegate ? rebound.map(it => ({ ...it, negated: !it.negated })) : rebound));
      lastExplicitSubject = lastExplicitSubjectFromItems(rebound, defaultVar) || lastExplicitSubject;
      continue;
    }

    const rel = parseRelationClause(raw, defaultVar, options);
    if (!rel) continue;
    if (rel.kind === 'error') {
      errors.push(rel.error);
      continue;
    }
    if (Array.isArray(rel.declaredOperators)) declaredOperators.push(...rel.declaredOperators);
    const rebound = rebindDefaultSubject(rel.items, defaultVar, lastExplicitSubject);
    parsedItems.push(...(neitherNegate ? rebound.map(it => ({ ...it, negated: !it.negated })) : rebound));
    lastExplicitSubject = lastExplicitSubjectFromItems(rebound, defaultVar) || lastExplicitSubject;
  }

  if (errors.length > 0) return { kind: 'error', error: errors.join('; ') };
  if (parsedItems.length === 0) return null;
  return { op: coord.op || 'And', items: parsedItems, declaredOperators };
}

function rebindDefaultSubject(items, defaultVar, explicitSubject) {
  if (!explicitSubject) return items || [];
  return (items || []).map(it => {
    if (!it?.atom?.args?.length) return it;
    const [a0, ...rest] = it.atom.args;
    if (a0 !== defaultVar) return it;
    return { ...it, atom: { ...it.atom, args: [explicitSubject, ...rest] } };
  });
}

function lastExplicitSubjectFromItems(items, defaultVar) {
  for (const it of items || []) {
    const a0 = it?.atom?.args?.[0] || null;
    if (!a0) continue;
    if (a0 === defaultVar) continue;
    if (String(a0).startsWith('?')) continue;
    return a0;
  }
  return null;
}

export function parseRuleSentence(sentence, options = {}) {
  const s = clean(sentence);
  if (!s) return null;

  // Indefinite "A/An X ..." is treated as a universal rule in most logic corpora.
  // Examples:
  // - "A person is either A or B."  => Person(x) -> (A(x) ∨ B(x))
  // - "An animal barks."            => Animal(x) -> bark(x)
  const indefCopula = s.match(/^(a|an)\s+(.+?)\s+(?:is|are)\s+(.+)$/i);
  if (indefCopula) {
    const [, , subjectPart, predPart] = indefCopula;
    const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
    if (condItems.length === 0) return null;
    const cons = parsePredicateGroup(predPart, '?x', options);
    if (!cons) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`], declaredOperators: cons.declaredOperators || [] };
  }

  const indefVerb = s.match(/^(a|an)\s+(.+?)\s+([A-Za-z_][A-Za-z0-9_'-]*)(?:\s+(.+))?$/i);
  if (indefVerb) {
    const [, , subjectPart, verbRaw, objRaw] = indefVerb;
    // Avoid stealing copula clauses (handled above).
    if (/^(?:is|are|was|were)$/i.test(verbRaw)) return null;
    const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
    if (condItems.length === 0) return null;
    const verbLowerRaw = String(verbRaw || '').toLowerCase();
    const verbLower = sanitizePredicate(verbLowerRaw);
    if (!verbLower) return null;
    let base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
    if (verbLower === 'has') base = 'have';
    const op = sanitizePredicate(normalizeVerb(base));
    if (!op) return null;

    const declaredOperators = [];
    if (!isKnownOperator(op) && options.autoDeclareUnknownOperators) declaredOperators.push(op);

    const expectedArity = CORE_GRAPH_ARITY.get(op);
    const hasObj = !!String(objRaw || '').trim();

    const consItems = [];
    if ((op === 'have' || op === 'has') && hasObj) {
      const have = parseHavePredicate('?x', objRaw, false);
      if (!have) return null;
      consItems.push(have);
    } else if (!hasObj || (typeof expectedArity === 'number' && expectedArity !== 2)) {
      // Intransitive or arity mismatch -> treat as a property
      const prop = sanitizePredicate(hasObj ? `${op}_${String(objRaw || '').replace(/\s+/g, '_')}` : op);
      consItems.push({ negated: false, atom: { op: 'hasProperty', args: ['?x', prop || op] } });
    } else {
      const object = normalizeEntity(objRaw, '?x');
      consItems.push({ negated: false, atom: { op, args: ['?x', object] } });
    }

    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(consItems, 'And');
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`], declaredOperators };
  }

  const noQuant = s.match(/^(no|none)\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (noQuant) {
    const [, , subjectPart, predPart] = noQuant;
    const desc = parseQuantifiedSubjectDescriptor(subjectPart);
    const condItems = emitSubjectDescriptorItems('?x', desc);
    if (condItems.length === 0) return null;

    const cons = parseCopulaPredicates('?x', predPart);
    if (!cons) return null;
    // No X are Y  ==>  X -> Not(Y)
    const negatedConsItems = cons.items.map(it => ({ ...it, negated: !it.negated }));

    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(negatedConsItems, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

  const noHave = s.match(/^(no|none)\s+(.+?)\s+(?:do\s+not\s+)?have\s+(.+)$/i);
  if (noHave) {
    const [, , subjectPart, objPart] = noHave;
    const desc = parseQuantifiedSubjectDescriptor(subjectPart);
    const condItems = emitSubjectDescriptorItems('?x', desc);
    if (condItems.length === 0) return null;
    const have = parseHavePredicate('?x', objPart, true);
    if (!have) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs([have], 'And');
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`] };
  }

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
    const cond = parsePredicateGroup(condPart, '?x', options);
    const cons = parsePredicateGroup(consPart, '?x', options);
    if (!cond || !cons) return null;
    const condEmit = emitExprAsRefs(cond.items, cond.op);
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`], declaredOperators: [...(cond.declaredOperators || []), ...(cons.declaredOperators || [])] };
  }

  const quant = s.match(/^(all|every|each)\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (quant) {
    const [, , subjectPart, predPart] = quant;
    const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
    if (condItems.length === 0) return null;

    const cons = parsePredicateGroup(predPart, '?x', options);
    if (!cons) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`], declaredOperators: cons.declaredOperators || [] };
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
    let base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
    if (verbLower === 'has') base = 'have';
    const op = sanitizePredicate(normalizeVerb(base));
    if (!op) return null;

    const declaredOperators = [];
    if (!isKnownOperator(op) && options.autoDeclareUnknownOperators) declaredOperators.push(op);

    const expectedArity = CORE_GRAPH_ARITY.get(op);
    const hasObj = !!String(objRaw || '').trim();

     // Treat "have X" as a property statement in open-domain corpora (FOL: Have(x, fur) etc).
     if ((op === 'have' || op === 'has') && hasObj) {
       const consRef = genRef('cons');
       const have = parseHavePredicate('?x', objRaw, false);
       if (!have) return null;
       return {
         lines: [
           `@${antRef} isA ?x ${typeName}`,
           `@${consRef} ${have.atom.op} ${have.atom.args.join(' ')}`,
           `Implies $${antRef} $${consRef}`
         ],
         declaredOperators
       };
     }
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

  // Quantified verb rules with multi-word subject descriptors:
  // "All well-paid people live in tax havens."
  const quantVerbLoose = s.match(/^(all|every|each)\s+(.+)$/i);
  if (quantVerbLoose && !/\s+(?:are|is)\s+/i.test(s)) {
    const rest = clean(quantVerbLoose[2]);
    const tokens = rest.split(/\s+/).filter(Boolean);
    if (tokens.length >= 3) {
      let headIdx = -1;
      for (let i = 0; i < tokens.length - 1; i++) {
        if (isPlural(tokens[i]) && !isGenericClassNoun(tokens[i])) headIdx = i;
      }
      if (headIdx >= 0 && headIdx + 1 < tokens.length) {
        const subjectPart = tokens.slice(0, headIdx + 1).join(' ');
        const verbRaw = tokens[headIdx + 1];
        const objRaw = tokens.slice(headIdx + 2).join(' ').trim();

        const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
        if (condItems.length > 0) {
          const verbLowerRaw = String(verbRaw || '').toLowerCase();
          const verbLower = sanitizePredicate(verbLowerRaw);
          if (verbLower) {
            let base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
            if (verbLower === 'has') base = 'have';
            const op = sanitizePredicate(normalizeVerb(base));
            if (op) {
              const declaredOperators = [];
              if (!isKnownOperator(op) && options.autoDeclareUnknownOperators) declaredOperators.push(op);

              const expectedArity = CORE_GRAPH_ARITY.get(op);
              const hasObj = !!objRaw;

              const consItems = [];
              if ((op === 'have' || op === 'has') && hasObj) {
                const have = parseHavePredicate('?x', objRaw, false);
                if (!have) return null;
                consItems.push(have);
              } else if (!hasObj || (typeof expectedArity === 'number' && expectedArity !== 2)) {
                const prop = sanitizePredicate(hasObj ? `${op}_${objRaw.replace(/\s+/g, '_')}` : op);
                consItems.push({ negated: false, atom: { op: 'hasProperty', args: ['?x', prop || op] } });
              } else {
                const object = normalizeEntity(objRaw, '?x');
                consItems.push({ negated: false, atom: { op, args: ['?x', object] } });
              }

              const condEmit = emitExprAsRefs(condItems, 'And');
              const consEmit = emitExprAsRefs(consItems, 'And');
              if (!condEmit.ref || !consEmit.ref) return null;
              return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`], declaredOperators };
            }
          }
        }
      }
    }
  }

  const barePlural = s.match(/^(\w+)\s+are\s+(.+)$/i);
  if (barePlural) {
    const [, subjectPlural, predPart] = barePlural;
    if (!isPlural(subjectPlural) || isGenericClassNoun(subjectPlural)) return null;

    const condItems = [
      { negated: false, atom: { op: 'isA', args: ['?x', normalizeTypeName(singularize(subjectPlural))] } }
    ];

    const cons = parsePredicateGroup(predPart, '?x', options);
    if (!cons) return null;
    const condEmit = emitExprAsRefs(condItems, 'And');
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return { lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`], declaredOperators: cons.declaredOperators || [] };
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
    let base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
    if (verbLower === 'has') base = 'have';
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
    const propsTokens = propsPart.split(/[,\s]+/).filter(Boolean);
    // Avoid generating huge "hasProperty ?x token" conjunctions on narrative sentences.
    if (propsTokens.length > 4) return null;
    const props = propsTokens.map(p => sanitizePredicate(p)).filter(Boolean);

    const condItems = [];
    if (!isGenericClassNoun(classNoun)) {
      condItems.push({ negated: false, atom: { op: 'isA', args: ['?x', normalizeTypeName(classNoun)] } });
    }
    for (const p of props) {
      if (!p) continue;
      condItems.push({ negated: false, atom: { op: 'hasProperty', args: ['?x', p] } });
    }

    const cons = parsePredicateGroup(predPart, '?x', options);
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

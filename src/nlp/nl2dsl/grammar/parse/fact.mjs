import { clean, splitCoord } from '../text.mjs';
import crypto from 'node:crypto';
import { emitAtomLine, emitNotFact } from '../emit.mjs';
import { parseCopulaClause } from './copula.mjs';
import { parseNonCopulaRelationClause, parseRelationClause } from './relation.mjs';
import { parseExistentialCopula } from '../existentials.mjs';
import { emitSubjectDescriptorItems, parseCopulaPredicates, parseHavePredicate, parseQuantifiedSubjectDescriptor } from './quantifiers.mjs';

function opaqueEnt(prefix, salt) {
  const s = clean(salt).toLowerCase();
  const hash = crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
  return `${prefix}_${hash}`;
}

function containsVariables(items = []) {
  for (const it of items) {
    const args = it?.atom?.args;
    if (!Array.isArray(args)) continue;
    if (args.some(a => String(a || '').startsWith('?'))) return true;
  }
  return false;
}

export function parseFactSentence(sentence, options = {}) {
  const s = clean(sentence);
  if (!s) return null;

  const someCopula = s.match(/^some\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (someCopula) {
    const [, subjectPart, predPart] = someCopula;
    const ent = opaqueEnt('exists_ent', `some:${s}`);
    const subjItems = emitSubjectDescriptorItems(ent, parseQuantifiedSubjectDescriptor(subjectPart));
    const pred = parseCopulaPredicates(ent, predPart);
    if (subjItems.length === 0 || !pred) return null;

    const lines = [];
    const declaredOperators = [];
    for (const it of [...subjItems, ...pred.items]) {
      if (!it?.atom) continue;
      if (it.negated) lines.push(...emitNotFact(it.atom));
      else lines.push(emitAtomLine(it.atom));
    }
    if (lines.length === 0) return null;
    return { lines, declaredOperators };
  }

  const someHave = s.match(/^some\s+(.+?)\s+(?:do\s+not\s+|don't\s+)?have\s+(.+)$/i);
  if (someHave) {
    const [, subjectPart, objPart] = someHave;
    const negated = /\bdo\s+not\b/i.test(s) || /\bdon't\b/i.test(s);
    const ent = opaqueEnt('exists_ent', `some:${s}`);
    const subjItems = emitSubjectDescriptorItems(ent, parseQuantifiedSubjectDescriptor(subjectPart));
    const have = parseHavePredicate(ent, objPart, negated);
    if (subjItems.length === 0 || !have) return null;

    const lines = [];
    for (const it of [...subjItems, have]) {
      if (!it?.atom) continue;
      if (it.negated) lines.push(...emitNotFact(it.atom));
      else lines.push(emitAtomLine(it.atom));
    }
    if (lines.length === 0) return null;
    return { lines, declaredOperators: [] };
  }

  const specialRel = parseNonCopulaRelationClause(s, '?x', options);
  if (specialRel) {
    if (specialRel.kind === 'error') return specialRel;
    const lines = [];
    const declaredOperators = Array.isArray(specialRel.declaredOperators) ? specialRel.declaredOperators : [];
    for (const item of specialRel.items) {
      if (item.negated) lines.push(...emitNotFact(item.atom));
      else lines.push(emitAtomLine(item.atom));
    }
    return { lines, declaredOperators };
  }

  const existential = parseExistentialCopula(s);
  if (existential) {
    const ent = opaqueEnt('exists_ent', `${existential.typeName}:${s}`);
    if (existential.negated) {
      return { lines: emitNotFact({ op: 'isA', args: [ent, existential.typeName] }) };
    }
    return { lines: [`isA ${ent} ${existential.typeName}`] };
  }

  const copulaList = s.match(/^(.*?)\s+(is|are)\s+(.+)$/i);
  if (copulaList) {
    const [, subjRaw, verb, predRaw] = copulaList;
    const coord = splitCoord(predRaw);
    if (coord.items.length > 1) {
      const lines = [];
      const declaredOperators = [];
      for (const item of coord.items) {
        // If the coordination item already contains its own copula clause
        // (e.g. "Wren is a brimpus"), avoid duplicating the subject:
        // "Wren is Wren is a brimpus" can synthesize a fake type token.
        let clause = item;
        let cop = parseCopulaClause(clause, '?x', options);
        if (!cop) {
          clause = `${subjRaw} ${verb} ${item}`.trim();
          cop = parseCopulaClause(clause, '?x', options);
        }
        if (!cop) continue;
        if (Array.isArray(cop.declaredOperators)) declaredOperators.push(...cop.declaredOperators);
        for (const it of cop.items || []) {
          if (!it?.atom) continue;
          if (it.negated) lines.push(...emitNotFact(it.atom));
          else lines.push(emitAtomLine(it.atom));
        }
      }
      if (lines.length > 0) return { lines, ...(declaredOperators.length > 0 ? { declaredOperators } : {}) };
    }
  }

  const copula = parseCopulaClause(s, '?x', options);
  if (copula) {
    // Generic statements like "A person is ..." should be treated as rules, not facts.
    // Avoid emitting variable facts (they silently poison the KB).
    if (containsVariables(copula.items) && options.allowVariableFacts !== true) return null;
    const lines = [];
    const declaredOperators = Array.isArray(copula.declaredOperators) ? copula.declaredOperators : [];
    for (const item of copula.items) {
      if (item.negated) lines.push(...emitNotFact(item.atom));
      else lines.push(emitAtomLine(item.atom));
    }
    return { lines, ...(declaredOperators.length > 0 ? { declaredOperators } : {}) };
  }

  const rel = parseRelationClause(s, '?x', options);
  if (rel?.kind === 'error') return rel;
  if (rel) {
    if (containsVariables(rel.items) && options.allowVariableFacts !== true) return null;
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

import { clean, splitCoord } from '../text.mjs';
import { emitAtomLine, emitNotFact } from '../emit.mjs';
import { parseCopulaClause } from './copula.mjs';
import { parseNonCopulaRelationClause, parseRelationClause } from './relation.mjs';

export function parseFactSentence(sentence, options = {}) {
  const s = clean(sentence);
  if (!s) return null;

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

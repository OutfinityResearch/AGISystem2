/**
 * English NL→DSL Grammar (Heuristic, Low-Hardcoding)
 * @module nlp/nl2dsl/grammar
 *
 * Goal:
 * - Avoid dataset-specific regex forests by using a tiny grammar:
 *   - quantifiers: all/every/each/everything that
 *   - implication: if ... then ...
 *   - copula: is/are (+ optional not)
 *   - coordination: and/or + commas
 * - Treat content words as symbols (works with invented tokens).
 *
 * Output:
 * - Context: multi-statement DSL program.
 * - Question: single-statement DSL goal (atomic only).
 */

import {
  genRef,
  capitalize,
  splitSentences,
  singularize,
  normalizeEntity,
  normalizeVerb,
  isPlural,
  isGenericClassNoun,
  normalizeTypeName
} from './utils.mjs';

function clean(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.?!]+$/, '');
}

function lower(text) {
  return String(text || '').toLowerCase();
}

function stripOuter(text, prefix) {
  const t = clean(text);
  const p = String(prefix || '').toLowerCase();
  if (lower(t).startsWith(p)) return t.slice(prefix.length).trim();
  return t;
}

function splitCoord(text) {
  const t = clean(text);
  if (!t) return { op: 'And', items: [] };

  const hasOr = /\s+or\s+/i.test(t);
  const op = hasOr ? 'Or' : 'And';
  const byConj = hasOr ? /\s+or\s+/i : /\s+and\s+/i;

  const raw = t
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(part => part.split(byConj).map(p => p.trim()).filter(Boolean));

  return { op, items: raw };
}

function detectNegationPrefix(text) {
  const t = clean(text);
  if (/^not\s+/i.test(t)) return { negated: true, rest: t.replace(/^not\s+/i, '').trim() };
  return { negated: false, rest: t };
}

function parseTypePhrase(text) {
  const t = clean(text)
    .replace(/^(?:a|an)\s+/i, '')
    .trim();
  if (!t) return null;
  const rawParts = t.split(/\s+/).filter(Boolean);
  const parts = rawParts.map((p, idx) => {
    // Singularize the head noun (best-effort) to keep types canonical.
    const token = idx === rawParts.length - 1 ? singularize(p) : p;
    return capitalize(token);
  });
  return parts.join('');
}

function parsePredicateItem(item, subject) {
  // item like:
  // - "a dumpus" => isA
  // - "dumpus" (plural) => isA
  // - "green" => hasProperty
  // - "not a dumpus" => negated
  const { negated, rest } = detectNegationPrefix(item);
  const r = clean(rest);
  if (!r) return null;

  const isType = /^(?:a|an)\s+/i.test(r) || isPlural(r) || /^[A-Z]/.test(r);

  if (isType) {
    const typeName = parseTypePhrase(r);
    if (!typeName) return null;
    return { negated, atom: { op: 'isA', args: [subject, typeName] } };
  }

  // Property (single token or phrase reduced to last token)
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

  // "a/an <type phrase>" → introduce typed variable ?x plus isA constraint.
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

  // Strip leading "the"
  const normalized = t.replace(/^the\s+/i, '');
  return { subject: normalizeEntity(normalized, defaultVar), extraCondition: null };
}

function parseCopulaClause(text, defaultVar = '?x') {
  // "<subject> is (not) <predicate>"
  // "<subject> is (not) a <type>"
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

function parseRelationClause(text, defaultVar = '?x') {
  // "<subject> verbs <object>"
  // or clause without explicit subject: "sees the cat" (assume ?x)
  const t = clean(text);
  if (!t) return null;

  const low = lower(t);
  const hasNot = /\bdoes\s+not\b/i.test(low) || /\bdo\s+not\b/i.test(low);

  // Normalize "does not" → remove "does/do not", keep verb base
  let normalized = t
    .replace(/\bdoes\s+not\s+/i, '')
    .replace(/\bdo\s+not\s+/i, '');

  // Attempt explicit subject first: "<subj> <verb> <obj>"
  let m = normalized.match(/^(?:the\s+)?(.+?)\s+([A-Za-z_][A-Za-z0-9_'-]*)\s+(?:the\s+)?(.+)$/i);
  if (!m) return null;
  let [, subjRaw, verbRaw, objRaw] = m;

  // If the "subject" is actually a bare verb clause ("sees the cat"), assume defaultVar.
  // Heuristic: subject has no spaces and is a verb-like token and object exists.
  const maybeVerbClause = subjRaw && !subjRaw.includes(' ') && /^[a-z]+$/i.test(subjRaw) && verbRaw && objRaw;
  if (maybeVerbClause) {
    objRaw = verbRaw + ' ' + objRaw;
    verbRaw = subjRaw;
    subjRaw = defaultVar;
  }

  const subject = normalizeEntity(subjRaw, defaultVar);
  const object = normalizeEntity(objRaw, defaultVar);

  // Lemmatize 3rd person: visits → visit, likes → like (then map like→likes).
  const verbLower = String(verbRaw || '').toLowerCase();
  const base = verbLower.endsWith('s') && verbLower.length > 3 ? verbLower.slice(0, -1) : verbLower;
  const op = normalizeVerb(base);

  // Unknown verbs become a generic relation to avoid new operators.
  const operator = isKnownOperator(op) ? op : 'rel';
  const args = operator === 'rel' ? [subject, op, object] : [subject, object];
  return {
    op: 'And',
    items: [{ negated: hasNot, atom: { op: operator, args } }]
  };
}

function isKnownOperator(op) {
  // Keep this list SMALL: only Core-stable operators, plus generic fallbacks.
  // Everything else routes to `rel`.
  const known = new Set([
    'isA',
    'hasProperty',
    'likes',
    'loves',
    'hates',
    'owns',
    'parent',
    'child',
    'locatedIn',
    'partOf',
    'causes',
    'requires',
    'see',
    'hear',
    'eat',
    'drink',
    'go',
    'move',
    'give',
    'take',
    'buy',
    'sell',
    'sells'
  ]);
  return known.has(op);
}

function emitAtomLine(atom) {
  return `${atom.op} ${atom.args.join(' ')}`.trim();
}

function emitNotFact(atom) {
  const baseRef = genRef('base');
  return [
    `@${baseRef} ${emitAtomLine(atom)}`,
    `Not $${baseRef}`
  ];
}

function emitExprAsRefs(exprItems, combineOp) {
  // exprItems: [{negated, atom}, ...]
  // returns: { lines: string[], ref: string }
  const leaves = [];
  const lines = [];

  for (const item of exprItems) {
    if (!item?.atom) continue;
    if (item.negated) {
      const baseRef = genRef('base');
      const negRef = genRef('neg');
      lines.push(`@${baseRef} ${emitAtomLine(item.atom)}`);
      lines.push(`@${negRef} Not $${baseRef}`);
      leaves.push(negRef);
    } else {
      const ref = genRef('cond');
      lines.push(`@${ref} ${emitAtomLine(item.atom)}`);
      leaves.push(ref);
    }
  }

  if (leaves.length === 0) return { lines: [], ref: null };
  if (leaves.length === 1) return { lines, ref: leaves[0] };

  const combRef = genRef(combineOp.toLowerCase());
  lines.push(`@${combRef} ${combineOp} ${leaves.map(r => `$${r}`).join(' ')}`);
  return { lines, ref: combRef };
}

function parseRuleSentence(sentence) {
  const s = clean(sentence);
  if (!s) return null;

  // If ... then ...
  const ifThen = s.match(/^if\s+(.+?)\s+then\s+(.+)$/i);
  if (ifThen) {
    const [, condPart, consPart] = ifThen;
    const cond = parseClauseGroup(condPart, '?x');
    const cons = parseClauseGroup(consPart, '?x');
    if (!cond || !cons) return null;
    const condEmit = emitExprAsRefs(cond.items, cond.op);
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return {
      lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`]
    };
  }

  // Everything that is <conds> is <consequents>
  const everythingThat = s.match(/^everything\s+that\s+is\s+(.+?)\s+is\s+(.+)$/i);
  if (everythingThat) {
    const [, condPart, consPart] = everythingThat;
    const cond = parsePredicateGroup(condPart, '?x');
    const cons = parsePredicateGroup(consPart, '?x');
    if (!cond || !cons) return null;
    const condEmit = emitExprAsRefs(cond.items, cond.op);
    const consEmit = emitExprAsRefs(cons.items, cons.op);
    if (!condEmit.ref || !consEmit.ref) return null;
    return {
      lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`]
    };
  }

  // All/Every/Each <np> are/is <predicate>
  const quant = s.match(/^(all|every|each)\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (quant) {
    const [, , subjectPart, predPart] = quant;
    const lowSubject = lower(subjectPart);
    const subjectWords = lowSubject.split(/\s+/).filter(Boolean);
    if (subjectWords.length === 0) return null;

    const classWord = subjectWords[subjectWords.length - 1];
    const props = subjectWords.slice(0, -1);
    const condItems = [];

    // Only add type constraint if the class noun is not a generic placeholder.
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
    return {
      lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`]
    };
  }

  // "<props> people/things are <predicate>" (implicit universal)
  const implicit = s.match(/^(.+?)\s+(things|people)\s+are\s+(.+)$/i);
  if (implicit) {
    const [, propsPart, classNoun, predPart] = implicit;
    const props = propsPart
      .split(/[,\s]+/)
      .map(p => p.trim().toLowerCase())
      .filter(Boolean);

    const condItems = [];
    // Do not add isA constraint for generic class nouns.
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
    return {
      lines: [...condEmit.lines, ...consEmit.lines, `Implies $${condEmit.ref} $${consEmit.ref}`]
    };
  }

  // Plural subsumption: "Wumpuses are grimpuses"
  const subsumption = s.match(/^(\w+(?:us)?e?s)\s+are\s+(\w+(?:us)?e?s)$/i);
  if (subsumption) {
    const [, fromPlural, toPlural] = subsumption;
    // Require both sides plural-like to reduce accidental matches.
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

function parsePredicateGroup(text, subject) {
  const { op, items } = splitCoord(text);
  const parsed = items.map(it => parsePredicateItem(it, subject)).filter(Boolean);
  if (parsed.length === 0) return null;
  return { op, items: parsed };
}

function parseClauseGroup(text, defaultVar) {
  const { op, items } = splitCoord(text);
  const parsedItems = [];
  for (const raw of items) {
    const copula = parseCopulaClause(raw, defaultVar);
    if (copula) {
      parsedItems.push(...copula.items);
      continue;
    }
    const rel = parseRelationClause(raw, defaultVar);
    if (rel) {
      parsedItems.push(...rel.items);
      continue;
    }
  }
  if (parsedItems.length === 0) return null;
  return { op: 'And', items: parsedItems };
}

function parseFactSentence(sentence) {
  const s = clean(sentence);
  if (!s) return null;

  // Copula facts: "X is (not) a Y" / "X is (not) Y"
  const copula = parseCopulaClause(s, '?x');
  if (copula) {
    // Facts: emit as plain facts when possible; use Not wrapper when needed.
    const lines = [];
    for (const item of copula.items) {
      if (item.negated) {
        lines.push(...emitNotFact(item.atom));
      } else {
        lines.push(emitAtomLine(item.atom));
      }
    }
    return { lines };
  }

  // Relation facts: "X verbs Y" / "X does not verb Y"
  const rel = parseRelationClause(s, '?x');
  if (rel) {
    const lines = [];
    for (const item of rel.items) {
      if (item.negated) {
        lines.push(...emitNotFact(item.atom));
      } else {
        lines.push(emitAtomLine(item.atom));
      }
    }
    return { lines };
  }

  return null;
}

export function translateContextWithGrammar(text) {
  const errors = [];
  const lines = [];
  const sentences = splitSentences(text);
  for (const sent of sentences) {
    const rule = parseRuleSentence(sent);
    if (rule) {
      lines.push(...rule.lines);
      continue;
    }
    const fact = parseFactSentence(sent);
    if (fact) {
      lines.push(...fact.lines);
      continue;
    }
    errors.push({ sentence: clean(sent), error: 'Could not parse' });
  }
  return { dsl: lines.join('\n'), errors };
}

export function translateQuestionWithGrammar(question) {
  let q = clean(question);
  if (!q) return null;

  // Normalize common English question inversions into declarative clauses
  // so the same clause parsers can be reused.
  const invCopula = q.match(/^(is|are)\s+(.+?)\s+(.+)$/i);
  if (invCopula) {
    q = `${invCopula[2]} ${invCopula[1]} ${invCopula[3]}`.trim();
  }
  const invAux = q.match(/^(does|do)\s+(.+?)\s+(not\s+)?(.+)$/i);
  if (invAux) {
    const subj = invAux[2];
    const rest = invAux[4];
    q = `${subj} ${invAux[3] ? 'does not ' : ''}${rest}`.trim();
  }

  // Only support ATOMIC goals (single statement) to match prove() semantics.
  // Compound questions ("or", comma lists) should be handled by a higher-level
  // orchestrator (multiple proves) rather than a single prove() call.
  if (/\s+or\s+/i.test(q) || (q.includes(',') && /\s+is\s+/i.test(q))) {
    return null;
  }

  // Copula goals
  const copula = parseCopulaClause(q, '?x');
  if (copula && copula.items.length > 0) {
    // Prefer the last item as the actual asked predicate, but preserve typing constraints
    // by folding them into the goal only when it's the predicate itself.
    const asked = copula.items[copula.items.length - 1];
    if (!asked?.atom) return null;
    if (asked.negated) {
      const inner = emitAtomLine(asked.atom);
      return `@goal:goal Not (${inner})`;
    }
    return `@goal:goal ${emitAtomLine(asked.atom)}`;
  }

  // Relation goals
  const rel = parseRelationClause(q, '?x');
  if (rel && rel.items.length === 1 && rel.items[0].atom) {
    const asked = rel.items[0];
    if (asked.negated) {
      const inner = emitAtomLine(asked.atom);
      return `@goal:goal Not (${inner})`;
    }
    return `@goal:goal ${emitAtomLine(asked.atom)}`;
  }

  return null;
}

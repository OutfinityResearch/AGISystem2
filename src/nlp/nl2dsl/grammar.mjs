import { splitSentences, normalizeEntity, sanitizePredicate } from './utils.mjs';
import { clean, splitCoord } from './grammar/text.mjs';
import { parseCopulaClause, parseRelationClause, parseRuleSentence, parseFactSentence } from './grammar/parse.mjs';
import { isKnownOperator } from './grammar/parse/shared.mjs';
import crypto from 'node:crypto';
import { extractExistentialTypeClaims, parseExistentialCopula } from './grammar/existentials.mjs';
import { emitSubjectDescriptorItems, parseCopulaPredicates, parseHavePredicate, parseQuantifiedSubjectDescriptor } from './grammar/parse/quantifiers.mjs';

function opaqueProp(prefix, sentence) {
  const s = clean(sentence).toLowerCase();
  const hash = crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
  return `${prefix}_${hash}`;
}

function atomToCompound({ op, args }) {
  return `(${op} ${args.join(' ')})`;
}

function itemToCompound(item) {
  if (!item?.atom) return null;
  const inner = atomToCompound(item.atom);
  return item.negated ? `(Not ${inner})` : inner;
}

function buildAndCompound(compounds) {
  const parts = compounds.filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `(And ${parts.join(' ')})`;
}

function buildCoordCompound(op, compounds) {
  const parts = compounds.filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `(${op} ${parts.join(' ')})`;
}

function parseSimpleClauseToCompound(text, options = {}) {
  const t = clean(text);
  if (!t) return null;

  const declaredOperators = new Set();

  const copulaList = t.match(/^(.*?)\s+(is|are|was|were)\s+(.+)$/i);
  if (copulaList) {
    const subjectRaw = copulaList[1].trim();
    const verb = copulaList[2].toLowerCase();
    const predRaw = copulaList[3].trim();
    const coord = splitCoord(predRaw);
    const compounds = [];

    for (const item of coord.items || []) {
      let clause = item;
      let copula = parseCopulaClause(clause, '?x', { ...options, indefiniteAsEntity: true });
      if (!copula || copula.items.length === 0) {
        clause = `${subjectRaw} ${verb} ${item}`.trim();
        copula = parseCopulaClause(clause, '?x', { ...options, indefiniteAsEntity: true });
      }
      if (!copula || copula.items.length === 0) continue;
      for (const op of copula.declaredOperators || []) declaredOperators.add(op);
      const asked = copula.items[copula.items.length - 1];
      if (!asked?.atom) continue;
      compounds.push(itemToCompound(asked));
    }

    const expr = buildCoordCompound(coord.op || 'And', compounds);
    return expr ? { expr, declaredOperators: [...declaredOperators] } : null;
  }

  const copula = parseCopulaClause(t, '?x', { ...options, indefiniteAsEntity: true });
  if (copula && copula.items.length > 0) {
    for (const op of copula.declaredOperators || []) declaredOperators.add(op);
    const asked = copula.items[copula.items.length - 1];
    const expr = asked?.atom ? itemToCompound(asked) : null;
    return expr ? { expr, declaredOperators: [...declaredOperators] } : null;
  }

  const rel = parseRelationClause(t, '?x', options);
  if (rel?.kind === 'error') return null;
  if (rel && rel.items.length === 1 && rel.items[0].atom) {
    for (const op of rel.declaredOperators || []) declaredOperators.add(op);
    const expr = itemToCompound(rel.items[0]);
    return expr ? { expr, declaredOperators: [...declaredOperators] } : null;
  }

  return null;
}

function toIfThenSentence(condText, consText) {
  const c = clean(condText);
  const k = clean(consText);
  if (!c || !k) return null;
  return `If ${c}, then ${k}`;
}

function normalizeEquivalenceSide(side, defaultSubject = 'someone') {
  const s = clean(side);
  if (!s) return null;

  // "Someone being X" -> "Someone is X"
  const someoneBeing = s.match(/^(someone|something|they|it|he|she)\s+being\s+(.+)$/i);
  if (someoneBeing) {
    const subj = someoneBeing[1];
    const pred = someoneBeing[2];
    return `${subj} is ${pred}`.trim();
  }

  // "being X" -> "<defaultSubject> is X"
  const being = s.match(/^being\s+(.+)$/i);
  if (being) {
    return `${defaultSubject} is ${being[1]}`.trim();
  }

  return s;
}

function expandBiconditionalSentence(sentence) {
  const s = clean(sentence);
  if (!s) return [];

  // "A iff B" patterns.
  const iff = s.match(/^(.+?)\s+if\s+and\s+only\s+if\s+(.+)$/i);
  if (iff) {
    const left = clean(iff[1]);
    const right = clean(iff[2]);
    const a = toIfThenSentence(left, right);
    const b = toIfThenSentence(right, left);
    return [a, b].filter(Boolean);
  }

  // "A is equivalent to B" patterns (LogicNLI).
  const equiv = s.match(/^(.+?)\s+is\s+equivalent\s+to\s+(.+)$/i);
  if (equiv) {
    const left0 = clean(equiv[1]);
    const right0 = clean(equiv[2]);

    const left = normalizeEquivalenceSide(left0, 'someone');
    const right = normalizeEquivalenceSide(right0, 'someone');
    const a = toIfThenSentence(left, right);
    const b = toIfThenSentence(right, left);
    return [a, b].filter(Boolean);
  }

  return [s];
}

function translateQuantifiedQuestion(q, options = {}) {
  const declaredOperators = new Set();
  const rememberOps = (items) => {
    if (!options.autoDeclareUnknownOperators) return;
    for (const it of items || []) {
      const op = it?.atom?.op;
      if (op && !isKnownOperator(op)) declaredOperators.add(op);
    }
  };

  const someCopula = q.match(/^some\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (someCopula) {
    const [, subjectPart, predPart] = someCopula;
    const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
    const pred = parseCopulaPredicates('?x', predPart);
    if (condItems.length === 0 || !pred) return null;
    rememberOps(condItems);
    rememberOps(pred.items);
    const compounds = [...condItems, ...pred.items].map(itemToCompound).filter(Boolean);
    const body = buildAndCompound(compounds);
    if (!body) return null;
    const header = ['// action:prove'];
    if (declaredOperators.size > 0) header.push(`// declare_ops:${[...declaredOperators].sort().join(',')}`);
    header.push(`@goal:goal Exists ?x ${body}`);
    return header.join('\n');
  }

  const someHave = q.match(/^some\s+(.+?)\s+(?:do\s+not\s+|don't\s+)?have\s+(.+)$/i);
  if (someHave) {
    const [, subjectPart, objPart] = someHave;
    const negated = /\bdo\s+not\b/i.test(q) || /\bdon't\b/i.test(q);
    const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
    const have = parseHavePredicate('?x', objPart, negated);
    if (condItems.length === 0 || !have) return null;
    rememberOps(condItems);
    rememberOps([have]);
    const compounds = [...condItems, have].map(itemToCompound).filter(Boolean);
    const body = buildAndCompound(compounds);
    if (!body) return null;
    const header = ['// action:prove'];
    if (declaredOperators.size > 0) header.push(`// declare_ops:${[...declaredOperators].sort().join(',')}`);
    header.push(`@goal:goal Exists ?x ${body}`);
    return header.join('\n');
  }

  const noCopula = q.match(/^(?:no|none)\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (noCopula) {
    const [, subjectPart, predPart] = noCopula;
    const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
    const pred = parseCopulaPredicates('?x', predPart);
    if (condItems.length === 0 || !pred) return null;
    rememberOps(condItems);
    rememberOps(pred.items);
    const compounds = [...condItems, ...pred.items].map(itemToCompound).filter(Boolean);
    const body = buildAndCompound(compounds);
    if (!body) return null;
    const header = ['// action:prove'];
    if (declaredOperators.size > 0) header.push(`// declare_ops:${[...declaredOperators].sort().join(',')}`);
    header.push(`@goal:goal Not (Exists ?x ${body})`);
    return header.join('\n');
  }

  const noHave = q.match(/^(?:no|none)\s+(.+?)\s+(?:do\s+not\s+)?have\s+(.+)$/i);
  if (noHave) {
    const [, subjectPart, objPart] = noHave;
    const condItems = emitSubjectDescriptorItems('?x', parseQuantifiedSubjectDescriptor(subjectPart));
    const have = parseHavePredicate('?x', objPart, false);
    if (condItems.length === 0 || !have) return null;
    rememberOps(condItems);
    rememberOps([have]);
    const compounds = [...condItems, have].map(itemToCompound).filter(Boolean);
    const body = buildAndCompound(compounds);
    if (!body) return null;
    const header = ['// action:prove'];
    if (declaredOperators.size > 0) header.push(`// declare_ops:${[...declaredOperators].sort().join(',')}`);
    header.push(`@goal:goal Not (Exists ?x ${body})`);
    return header.join('\n');
  }

  return null;
}

export function translateContextWithGrammar(text, options = {}) {
  const errors = [];
  const warnings = [];
  const stats = {
    sentencesTotal: 0,
    sentencesParsed: 0,
    sentencesOpaque: 0,
    autoDeclaredOperators: 0
  };
  const lines = [];
  const existentialTypesAdded = new Set();
  const autoDeclared = new Set();
  const sentences = splitSentences(text);
  const expandedSentences = sentences.flatMap(s => expandBiconditionalSentence(s));
  stats.sentencesTotal = expandedSentences.length;
  for (const sent of expandedSentences) {
    if (options.extractExistentials !== false) {
      const hinted = extractExistentialTypeClaims(sent);
      for (const typeName of hinted) {
        if (existentialTypesAdded.has(typeName)) continue;
        existentialTypesAdded.add(typeName);
        const ent = opaqueProp('exists_ent', `${typeName}:${sent}`);
        lines.push(`isA ${ent} ${typeName}`);
      }
    }

    const rule = parseRuleSentence(sent, options);
    if (rule?.kind === 'error') {
      const unknownMatch = String(rule.error || '').match(/Unknown operator '([^']+)'/i);
      const unknownOperator = unknownMatch ? unknownMatch[1] : null;
      if (options.fallbackOpaqueStatements === true) {
        warnings.push({ sentence: clean(sent), warning: rule.error || 'Rule parse error', opaque: true });
        stats.sentencesOpaque++;
        lines.push(`hasProperty KB ${opaqueProp('opaque_ctx', sent)}`);
        continue;
      }
      errors.push({
        sentence: clean(sent),
        error: rule.error,
        ...(unknownOperator ? {
          unknownOperator,
          suggestion: `Add operator declaration like: @${unknownOperator}:${unknownOperator} __Relation`
        } : {})
      });
      continue;
    }
    if (rule) {
      for (const op of rule.declaredOperators || []) autoDeclared.add(op);
      lines.push(...rule.lines);
      stats.sentencesParsed++;
      continue;
    }
    const fact = parseFactSentence(sent, options);
    if (fact?.kind === 'error') {
      const unknownMatch = String(fact.error || '').match(/Unknown operator '([^']+)'/i);
      const unknownOperator = fact.unknownOperator || (unknownMatch ? unknownMatch[1] : null);
      if (options.fallbackOpaqueStatements === true) {
        warnings.push({ sentence: clean(sent), warning: fact.error || 'Fact parse error', opaque: true });
        stats.sentencesOpaque++;
        lines.push(`hasProperty KB ${opaqueProp('opaque_ctx', sent)}`);
        continue;
      }
      errors.push({
        sentence: clean(sent),
        error: fact.error,
        ...(unknownOperator ? {
          unknownOperator,
          suggestion: `Add operator declaration like: @${unknownOperator}:${unknownOperator} __Relation`
        } : {})
      });
      continue;
    }
    if (fact) {
      for (const op of fact.declaredOperators || []) autoDeclared.add(op);
      lines.push(...fact.lines);
      stats.sentencesParsed++;
      continue;
    }
    if (options.fallbackOpaqueStatements === true) {
      warnings.push({ sentence: clean(sent), warning: 'Could not parse', opaque: true });
      stats.sentencesOpaque++;
      lines.push(`hasProperty KB ${opaqueProp('opaque_ctx', sent)}`);
      continue;
    }
    errors.push({ sentence: clean(sent), error: 'Could not parse' });
  }

  const prelude = [];
  if (options.autoDeclareUnknownOperators && autoDeclared.size > 0) {
    const sorted = [...autoDeclared].sort();
    for (const op of sorted) {
      prelude.push(`@${op}:${op} __Relation`);
    }
  }

  stats.autoDeclaredOperators = autoDeclared.size;
  return {
    dsl: [...prelude, ...lines].join('\n'),
    errors,
    warnings,
    stats,
    autoDeclaredOperators: [...autoDeclared]
  };
}

export function translateQuestionWithGrammar(question, options = {}) {
  let q = clean(question);
  if (!q) return options.fallbackOpaqueQuestions === true ? `@goal:goal hasProperty KB ${opaqueProp('opaque_q', question)}` : null;

  // Conditional hypotheses: "If A then B" -> prove an implication formula.
  // This is used in NLI corpora where the hypothesis itself is a conditional statement.
  const ifThen = q.match(/^if\s+(.+?)\s+then\s+(.+)$/i);
  if (ifThen) {
    const condRaw = clean(ifThen[1]).replace(/,\s*$/, '').trim();
    const consRaw = clean(ifThen[2]).trim();
    const cond = parseSimpleClauseToCompound(condRaw, options);
    const cons = parseSimpleClauseToCompound(consRaw, options);
    if (cond?.expr && cons?.expr) {
      const declared = [...new Set([...(cond.declaredOperators || []), ...(cons.declaredOperators || [])])];
      const header = [];
      if (declared.length > 0) header.push(`// declare_ops:${declared.sort().join(',')}`);
      const goal = `@goal:goal Implies ${cond.expr} ${cons.expr}`;
      return header.length > 0 ? [...header, goal].join('\n') : goal;
    }
  }

  // "SUBJ neither A nor B" => prove (not A) and (not B)
  const neither = q.match(/^(.+?)\s+neither\s+(.+?)\s+nor\s+(.+)$/i);
  if (neither) {
    const subjRaw = neither[1].trim();
    const aRaw = neither[2].trim();
    const bRaw = neither[3].trim();
    const subj = normalizeEntity(subjRaw, '?x');
    const clauses = [`${subjRaw} ${aRaw}`, `${subjRaw} ${bRaw}`];
    const goalLines = [];
    const declared = new Set();

    for (const clause of clauses) {
      const cop = parseCopulaClause(clause, '?x', { ...options, indefiniteAsEntity: true });
      const rel = !cop ? parseRelationClause(clause, '?x', options) : null;
      const picked = cop?.items?.[cop.items.length - 1] || rel?.items?.[0] || null;
      const declOps = [...(cop?.declaredOperators || []), ...(rel?.declaredOperators || [])];
      for (const op of declOps) declared.add(op);
      if (!picked?.atom) continue;
      const inner = `${picked.atom.op} ${picked.atom.args.join(' ')}`.trim();
      const dest = goalLines.length === 0 ? '@goal:goal' : `@goal${goalLines.length}:goal`;
      goalLines.push(`${dest} Not (${inner})`);
    }

    if (goalLines.length > 0) {
      const header = ['// goal_logic:And'];
      if (declared.size > 0) header.push(`// declare_ops:${[...declared].sort().join(',')}`);
      return [...header, ...goalLines].join('\n');
    }
  }

  const quantified = translateQuantifiedQuestion(q, options);
  if (quantified) return quantified;

  // Normalize common English question inversions into declarative clauses
  // so the same clause parsers can be reused.
  const invCopula = q.match(/^(is|are|was|were)\s+(.+?)\s+(.+)$/i);
  if (invCopula) {
    q = `${invCopula[2]} ${invCopula[1]} ${invCopula[3]}`.trim();
  }
  const invAux = q.match(/^(does|do)\s+(.+?)\s+(not\s+)?(.+)$/i);
  if (invAux) {
    const subj = invAux[2];
    const rest = invAux[4];
    q = `${subj} ${invAux[3] ? 'does not ' : ''}${rest}`.trim();
  }

  // Simple WH-questions (answer-as-query):
  // - "What is Emily afraid of?" -> afraid Emily ?x
  // - "What is Sarah?" -> isA Sarah ?x
  // - "What color is the cat?" -> hasProperty Cat ?x
  const whatOf = q.match(/^what\s+(?:is|are|was|were)\s+(.+?)\s+([a-z][a-z0-9_'-]*)\s+of$/i);
  if (whatOf) {
    const subject = normalizeEntity(whatOf[1], '?x');
    const op = sanitizePredicate(whatOf[2]);
    if (op) {
      const header = [`// action:query`, `// declare_ops:${op}`];
      return [...header, `@goal:goal ${op} ${subject} ?x`].join('\n');
    }
  }
  const whatProp = q.match(/^what\s+([a-z][a-z0-9_'-]*)\s+(?:is|are|was|were)\s+(.+)$/i);
  if (whatProp) {
    const subject = normalizeEntity(whatProp[2], '?x');
    return `@goal:goal hasProperty ${subject} ?x`;
  }
  const whatIs = q.match(/^what\s+(?:is|are|was|were)\s+(.+)$/i);
  if (whatIs) {
    const subject = normalizeEntity(whatIs[1], '?x');
    return `@goal:goal isA ${subject} ?x`;
  }

  const existential = parseExistentialCopula(q);
  if (existential) {
    if (existential.negated) {
      return options.fallbackOpaqueQuestions === true
        ? `@goal:goal hasProperty KB ${opaqueProp('opaque_q', q)}`
        : null;
    }
    return `@goal:goal isA ?x ${existential.typeName}`;
  }

  // Optionally expand compound questions into multiple atomic goals (for orchestrators
  // that run multiple prove() calls and combine results).
  if (options.expandCompoundQuestions) {
    // Conjunctive "with" clauses: "X is Y with (no) Z" => (X is Y) AND (X has (not) Z)
    const withClause = q.match(/^(.*?)\s+(is|are)\s+(.+?)\s+with\s+(.+)$/i);
    if (withClause) {
      const [, subjectRaw, verb, typeRaw, withRaw] = withClause;
      const baseClause = `${subjectRaw} ${verb} ${typeRaw}`.trim();
      const base = parseCopulaClause(baseClause, '?x', { ...options, indefiniteAsEntity: true });
      // Only apply this expansion when the base clause is a genuine type assertion (isA).
      // Otherwise we incorrectly split sentences like:
      // - "James is invited ... with the audience ..."
      // - "... has nothing to do with whether ..."
      const baseHasType = Array.isArray(base?.items) && base.items.some(it => it?.atom?.op === 'isA');
      if (baseHasType) {
        const subject = normalizeEntity(subjectRaw, '?x');
        const withText = clean(withRaw);
        const neg = /^no\s+/i.test(withText) || /^not\s+/i.test(withText);
        const stripped = withText.replace(/^(?:no|not)\s+/i, '').trim();
        const have = parseHavePredicate(subject, stripped, neg);

        const goalLines = [];
        const declaredOperators = new Set(base?.declaredOperators || []);

        if (base?.items?.length) {
          for (const it of base.items) {
            if (!it?.atom) continue;
            const inner = `${it.atom.op} ${it.atom.args.join(' ')}`.trim();
            goalLines.push(`${goalLines.length === 0 ? '@goal:goal' : `@goal${goalLines.length}:goal`} ${it.negated ? `Not (${inner})` : inner}`);
          }
        }
        if (have?.atom) {
          const inner = `${have.atom.op} ${have.atom.args.join(' ')}`.trim();
          goalLines.push(`${goalLines.length === 0 ? '@goal:goal' : `@goal${goalLines.length}:goal`} ${have.negated ? `Not (${inner})` : inner}`);
        }

        if (goalLines.length > 1) {
          const header = ['// goal_logic:And'];
          if (declaredOperators.size > 0) header.push(`// declare_ops:${[...declaredOperators].sort().join(',')}`);
          return [...header, ...goalLines].join('\n');
        }
      }
    }

    const copulaList = q.match(/^(.*?)\s+(is|are)\s+(.+)$/i);
    if (copulaList) {
      const subjectRaw = copulaList[1].trim();
      const verb = copulaList[2].toLowerCase();
      const predRaw = copulaList[3].trim();
      const coord = splitCoord(predRaw);
      if (coord.items.length > 1) {
        const goalLines = [];
        let needsQuery = false;
        const declaredOperators = new Set();
        for (let i = 0; i < coord.items.length; i++) {
          const item = coord.items[i];
          // If the coordination item already contains its own copula clause
          // (e.g. "Sally is not a dumpus"), do NOT prefix the subject again.
          // Otherwise, we end up with "Sally is Sally is not a dumpus" and the
          // predicate parser can incorrectly synthesize a type like "SallyIsNotADumpus".
          let clause = item;
          let copula = parseCopulaClause(clause, '?x', { ...options, indefiniteAsEntity: true });
          if (!copula || copula.items.length === 0) {
            clause = `${subjectRaw} ${verb} ${item}`.trim();
            copula = parseCopulaClause(clause, '?x', { ...options, indefiniteAsEntity: true });
          }
          if (!copula || copula.items.length === 0) continue;
          for (const op of copula.declaredOperators || []) declaredOperators.add(op);
          const asked = copula.items[copula.items.length - 1];
          if (!asked?.atom) continue;
          const inner = `${asked.atom.op} ${asked.atom.args.join(' ')}`.trim();
          if (inner.includes('?')) needsQuery = true;
          const dest = i === 0 ? '@goal:goal' : `@goal${i}:goal`;
          goalLines.push(asked.negated ? `${dest} Not (${inner})` : `${dest} ${inner}`);
        }
        if (goalLines.length > 0) {
          const header = [`// goal_logic:${coord.op}`];
          if (declaredOperators.size > 0) header.push(`// declare_ops:${[...declaredOperators].sort().join(',')}`);
          if (needsQuery) header.push('// action:query');
          return [...header, ...goalLines].join('\n');
        }
      }
    }
  }

  // Copula goals
  const copula = parseCopulaClause(q, '?x', { ...options, indefiniteAsEntity: true });
  if (copula && copula.items.length > 0) {
    // Prefer the last item as the actual asked predicate, but preserve typing constraints
    // by folding them into the goal only when it's the predicate itself.
    const asked = copula.items[copula.items.length - 1];
    if (!asked?.atom) return null;
    const header = [];
    const decl = Array.isArray(copula.declaredOperators) ? copula.declaredOperators : [];
    if (decl.length > 0) header.push(`// declare_ops:${decl.join(',')}`);
    if (asked.negated) {
      const inner = `${asked.atom.op} ${asked.atom.args.join(' ')}`.trim();
      const goal = `@goal:goal Not (${inner})`;
      if (inner.includes('?')) header.push('// action:query');
      return header.length > 0 ? [...header, goal].join('\n') : goal;
    }
    const inner = `${asked.atom.op} ${asked.atom.args.join(' ')}`.trim();
    const goal = `@goal:goal ${inner}`;
    if (inner.includes('?')) header.push('// action:query');
    return header.length > 0 ? [...header, goal].join('\n') : goal;
  }

  // Relation goals
  const rel = parseRelationClause(q, '?x', options);
  if (rel?.kind === 'error') return null;
  if (rel && rel.items.length === 1 && rel.items[0].atom) {
    const asked = rel.items[0];
    const decl = Array.isArray(rel.declaredOperators) ? rel.declaredOperators : [];
    if (asked.negated) {
      const inner = `${asked.atom.op} ${asked.atom.args.join(' ')}`.trim();
      const goal = `@goal:goal Not (${inner})`;
      const header = [];
      if (decl.length > 0) header.push(`// declare_ops:${decl.join(',')}`);
      if (inner.includes('?')) header.push('// action:query');
      return header.length > 0 ? [...header, goal].join('\n') : goal;
    }
    const inner = `${asked.atom.op} ${asked.atom.args.join(' ')}`.trim();
    const goal = `@goal:goal ${inner}`;
    const header = [];
    if (decl.length > 0) header.push(`// declare_ops:${decl.join(',')}`);
    if (inner.includes('?')) header.push('// action:query');
    return header.length > 0 ? [...header, goal].join('\n') : goal;
  }

  if (options.fallbackOpaqueQuestions === true) {
    return `@goal:goal hasProperty KB ${opaqueProp('opaque_q', q)}`;
  }
  return null;
}

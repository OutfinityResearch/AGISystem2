import { splitSentences } from './utils.mjs';
import { clean } from './grammar/text.mjs';
import { parseCopulaClause, parseRelationClause, parseRuleSentence, parseFactSentence } from './grammar/parse.mjs';

export function translateContextWithGrammar(text, options = {}) {
  const errors = [];
  const lines = [];
  const autoDeclared = new Set();
  const sentences = splitSentences(text);
  for (const sent of sentences) {
    const rule = parseRuleSentence(sent, options);
    if (rule?.kind === 'error') {
      const unknownMatch = String(rule.error || '').match(/Unknown operator '([^']+)'/i);
      const unknownOperator = unknownMatch ? unknownMatch[1] : null;
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
      continue;
    }
    const fact = parseFactSentence(sent, options);
    if (fact?.kind === 'error') {
      const unknownMatch = String(fact.error || '').match(/Unknown operator '([^']+)'/i);
      const unknownOperator = fact.unknownOperator || (unknownMatch ? unknownMatch[1] : null);
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

  return { dsl: [...prelude, ...lines].join('\n'), errors, autoDeclaredOperators: [...autoDeclared] };
}

export function translateQuestionWithGrammar(question, options = {}) {
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
      const inner = `${asked.atom.op} ${asked.atom.args.join(' ')}`.trim();
      return `@goal:goal Not (${inner})`;
    }
    return `@goal:goal ${`${asked.atom.op} ${asked.atom.args.join(' ')}`.trim()}`;
  }

  // Relation goals
  const rel = parseRelationClause(q, '?x', options);
  if (rel?.kind === 'error') return null;
  if (rel && rel.items.length === 1 && rel.items[0].atom) {
    const asked = rel.items[0];
    if (asked.negated) {
      const inner = `${asked.atom.op} ${asked.atom.args.join(' ')}`.trim();
      return `@goal:goal Not (${inner})`;
    }
    return `@goal:goal ${`${asked.atom.op} ${asked.atom.args.join(' ')}`.trim()}`;
  }

  return null;
}

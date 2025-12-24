export const BUG_PATTERNS = {
  BUG001: {
    name: 'Or→And implication failure',
    description: 'Compound logic with Or antecedent and/or And consequent',
    file: 'BUG001-compound-logic.md'
  },
  BUG002: {
    name: 'Negation reasoning failure',
    description: 'Not operator handling in implications',
    file: 'BUG002-negation.md'
  },
  BUG003: {
    name: 'Deep chain failure',
    description: 'Multi-hop inference chains (>3 steps)',
    file: 'BUG003-deep-chains.md'
  },
  BUG004: {
    name: 'Relational reasoning failure',
    description: 'Kinship or relational inference patterns',
    file: 'BUG004-relational.md'
  },
  BUG005: {
    name: 'Abductive reasoning failure',
    description: 'Inference from effect to cause',
    file: 'BUG005-abduction.md'
  },
  BUG006: {
    name: 'Multi-choice ambiguity',
    description: 'Multiple choice answer selection issues',
    file: 'BUG006-multichoice.md'
  },
  BUG007: {
    name: 'Quantifier handling failure',
    description: 'Universal/existential quantifier issues',
    file: 'BUG007-quantifiers.md'
  }
};

export const NLP_BUG_PATTERNS = {
  NLP001: {
    name: 'Context translation empty',
    description: 'Translator produced empty DSL for non-empty context',
    reason: 'context_translation_empty'
  },
  NLP002: {
    name: 'Question translation empty',
    description: 'Translator produced empty DSL for question/goal',
    reason: 'question_translation_empty'
  },
  NLP003: {
    name: 'Goal not first statement',
    description: 'Multi-line questionDsl has @goal on wrong line',
    reason: 'goal_not_first_statement'
  },
  NLP004: {
    name: 'Multi-statement without goal',
    description: 'Multi-line questionDsl without explicit @goal',
    reason: 'multi_statement_no_goal'
  },
  NLP005: {
    name: 'Learn parse error',
    description: 'Generated DSL has syntax errors (lexer/parser)',
    reason: 'learn_failed'
  },
  NLP006: {
    name: 'Translation quality issue',
    description: 'Missing operators or incomplete translation',
    reason: 'translation_quality_issue'
  },
  NLP007: {
    name: 'Complex sentence unsupported',
    description: 'Sentence patterns not yet supported by translator',
    reason: 'complex_unsupported'
  }
};

export function detectKnownBugPattern(translated, example) {
  const dsl = translated?.contextDsl || '';
  const source = example?.source || '';
  const category = example?.category || '';

  const hasOrAntecedent = /Implies \$or\d+/.test(dsl);
  const hasAndConsequent = /@and\d+ And/.test(dsl) && /Implies \$\w+ \$and\d+/.test(dsl);
  const hasAndAntecedent = /Implies \$and\d+/.test(dsl);
  if ((hasOrAntecedent || hasAndAntecedent) && hasAndConsequent) return 'BUG001';

  const hasNot = /\\bNot\\b/.test(dsl);
  const hasNotInImplication = /Implies \$\w+ \$neg\d+/.test(dsl) || /Implies \$not\d+/.test(dsl);
  if (hasNot && hasNotInImplication) return 'BUG002';

  const impliesCount = (dsl.match(/Implies/g) || []).length;
  if (impliesCount >= 4) return 'BUG003';

  if (source === 'clutrr' || category === 'relational_reasoning') return 'BUG004';
  if (source === 'abduction' || category === 'abductive_reasoning') return 'BUG005';

  if ((source === 'logiqa' || source === 'logiqa2' || source === 'reclor') && example?.choices?.length > 2) {
    return 'BUG006';
  }

  const hasQuantifiers = /\\b(forAll|exists|Every|All|Some|Any)\\b/i.test(example?.context || '');
  const hasQuantifierDsl = /\?\w+/.test(dsl);
  if (hasQuantifiers && impliesCount >= 2 && hasQuantifierDsl) return 'BUG007';

  return null;
}

export function detectNlpBugPattern(reason, result, example) {
  for (const [nlpId, pattern] of Object.entries(NLP_BUG_PATTERNS)) {
    if (pattern.reason === reason) return nlpId;
  }

  if (result?.details?.includes('Lexer error') ||
      result?.details?.includes('Parse error') ||
      result?.details?.includes('Unexpected') ||
      result?.details?.includes('Unknown operator') ||
      result?.details?.includes('validation failed')) {
    return 'NLP005';
  }

  const context = example?.context || '';
  if (context.length > 200 && reason === 'context_translation_empty') return 'NLP007';

  return null;
}

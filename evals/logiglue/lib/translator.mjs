/**
 * Unified Translator for Multiple Reasoning Datasets
 *
 * Extended to handle:
 * - RuleTaker patterns (original)
 * - ProntoQA patterns (made-up ontologies with -us suffix)
 * - FOLIO patterns (complex natural language)
 */

// Reference counter for generating unique names
let refCounter = 0;

export function resetRefCounter() {
  refCounter = 0;
}

function genRef(prefix = 'ref') {
  return `${prefix}${refCounter++}`;
}

/**
 * Translate a unified example to DSL
 */
export function translateExample(example) {
  resetRefCounter();

  const { source, context, question, label, metadata } = example;

  let contextDsl = '';
  let questionDsl = '';
  const errors = [];

  // Choose translator based on source
  if (source === 'prontoqa') {
    const ctxResult = translateProntoQAContext(context);
    contextDsl = ctxResult.dsl;
    errors.push(...ctxResult.errors);
    questionDsl = translateProntoQAQuestion(question);
  } else if (source === 'folio' || source === 'folio_fol') {
    const ctxResult = translateFOLIOContext(context);
    contextDsl = ctxResult.dsl;
    errors.push(...ctxResult.errors);
    questionDsl = translateFOLIOQuestion(question);
  } else {
    // Default: use RuleTaker-style patterns
    const ctxResult = translateGenericContext(context);
    contextDsl = ctxResult.dsl;
    errors.push(...ctxResult.errors);
    questionDsl = translateGenericQuestion(question);
  }

  const expectProved = labelToExpectation(label);

  return {
    source,
    contextDsl,
    contextErrors: errors,
    questionDsl,
    expectProved,
    label,
    original: example,
    metadata
  };
}

/**
 * Convert label to boolean expectation
 */
function labelToExpectation(label) {
  if (!label) return null;
  const l = String(label).toLowerCase();

  if (l === 'entailment' || l === 'true' || l === 'yes' || l === 'correct' || l === '1') {
    return true;
  }
  if (l === 'not_entailment' || l === 'contradiction' || l === 'false' || l === 'no' || l === 'incorrect' || l === '0') {
    return false;
  }
  if (l === 'uncertain' || l === 'neutral' || l === 'unknown') {
    return false; // Conservative: can't prove uncertain
  }
  return null;
}

// =============================================================================
// ProntoQA Translator
// =============================================================================
// ProntoQA uses made-up ontologies with consistent patterns:
// - "Wumpuses are grimpuses" (type subsumption)
// - "Every X is a Y" (universal)
// - "Each X is a Y" (universal)
// - "Everything that is an X or a Y is a Z" (disjunction → consequent)
// - "Polly is a gorpus" (instance fact)
// - "Polly is not a gorpus" (negated instance fact)

function translateProntoQAContext(context) {
  const statements = [];
  const errors = [];

  if (!context) return { dsl: '', errors: [] };

  // Split into sentences
  const sentences = context.split(/\.\s*/).map(s => s.trim()).filter(Boolean);

  for (const sent of sentences) {
    const dsl = translateProntoQASentence(sent);
    if (dsl) {
      statements.push(dsl);
    } else {
      errors.push({ sentence: sent, error: 'Could not parse' });
    }
  }

  return { dsl: statements.join('\n'), errors };
}

function translateProntoQASentence(sent) {
  const s = sent.trim();
  const lower = s.toLowerCase();

  // Pattern: "X is a Y and X is a Z and X is a W" (compound facts)
  // e.g., "Sally is a gorpus, a yumpus, and a shumpus"
  const compoundMatch = s.match(/^(\w+)\s+is\s+(?:a\s+)?(.+)$/i);
  if (compoundMatch && compoundMatch[2].includes(',')) {
    const [, entity, rest] = compoundMatch;
    const types = rest.split(/,\s*(?:and\s+)?|(?:\s+and\s+)/).map(t => t.replace(/^a\s+/i, '').trim()).filter(Boolean);
    const facts = types.map(t => {
      // Handle "not a X" in compound
      if (t.startsWith('not ')) {
        const type = t.replace(/^not\s+(?:a\s+)?/i, '').trim();
        const ref = genRef('neg');
        return `@${ref} isA ${capitalize(entity)} ${capitalize(type)}\nNot $${ref}`;
      }
      return `isA ${capitalize(entity)} ${capitalize(t)}`;
    });
    return facts.join('\n');
  }

  // Pattern: "X is a Y and X is not a Z and X is a W" (mixed compound)
  const mixedCompound = s.match(/^(\w+)\s+is\s+(.+)$/i);
  if (mixedCompound && lower.includes(' and ')) {
    const [, entity, rest] = mixedCompound;
    const parts = rest.split(/\s+and\s+/i);
    const facts = [];
    for (const part of parts) {
      const p = part.trim();
      if (p.match(/^not\s+(?:a\s+)?(\w+)$/i)) {
        const type = p.replace(/^not\s+(?:a\s+)?/i, '');
        const ref = genRef('neg');
        facts.push(`@${ref} isA ${capitalize(entity)} ${capitalize(type)}\nNot $${ref}`);
      } else if (p.match(/^(?:a\s+)?(\w+)$/i)) {
        const type = p.replace(/^a\s+/i, '');
        facts.push(`isA ${capitalize(entity)} ${capitalize(type)}`);
      }
    }
    if (facts.length > 0) return facts.join('\n');
  }

  // Pattern: "Xes are Yes" (plural type subsumption)
  // e.g., "Wumpuses are grimpuses", "Lempuses are lorpuses"
  const pluralSubsumption = s.match(/^(\w+(?:us)?e?s)\s+are\s+(\w+(?:us)?e?s)$/i);
  if (pluralSubsumption) {
    const [, fromPlural, toPlural] = pluralSubsumption;
    const fromType = singularize(fromPlural);
    const toType = singularize(toPlural);
    const antRef = genRef('ant');
    const consRef = genRef('cons');
    return `@${antRef} isA ?x ${capitalize(fromType)}\n@${consRef} isA ?x ${capitalize(toType)}\nImplies $${antRef} $${consRef}`;
  }

  // Pattern: "Every/Each X is a Y [and a Z [and a W]]"
  const everyIsA = s.match(/^(?:every|each)\s+(\w+)\s+is\s+(?:a\s+)?(.+)$/i);
  if (everyIsA) {
    const [, fromType, rest] = everyIsA;
    const toTypes = rest.split(/,?\s+and\s+|,\s*/).map(t => t.replace(/^a\s+/i, '').trim()).filter(Boolean);

    const antRef = genRef('ant');
    const statements = [`@${antRef} isA ?x ${capitalize(fromType)}`];

    if (toTypes.length === 1) {
      const consRef = genRef('cons');
      statements.push(`@${consRef} isA ?x ${capitalize(toTypes[0])}`);
      statements.push(`Implies $${antRef} $${consRef}`);
    } else {
      // Multiple consequents
      const consRefs = [];
      for (const t of toTypes) {
        const ref = genRef('cons');
        statements.push(`@${ref} isA ?x ${capitalize(t)}`);
        consRefs.push(ref);
      }
      const andRef = genRef('and');
      statements.push(`@${andRef} And ${consRefs.map(r => `$${r}`).join(' ')}`);
      statements.push(`Implies $${antRef} $${andRef}`);
    }
    return statements.join('\n');
  }

  // Pattern: "Everything that is an X or a Y or a Z is a W [, a V, and a U]"
  const everythingOr = s.match(/^everything\s+that\s+is\s+(?:an?\s+)?(.+?)\s+is\s+(?:an?\s+)?(.+)$/i);
  if (everythingOr) {
    const [, antecedentPart, consequentPart] = everythingOr;

    // Parse antecedent (or-separated types)
    const antTypes = antecedentPart.split(/\s+or\s+/i).map(t => t.replace(/^an?\s+/i, '').trim()).filter(Boolean);

    // Parse consequent (and-separated types or single)
    const consTypes = consequentPart.split(/,?\s+and\s+|,\s*/).map(t => t.replace(/^an?\s+/i, '').trim()).filter(Boolean);

    const statements = [];

    // Build antecedent (Or of isA)
    let antRef;
    if (antTypes.length === 1) {
      antRef = genRef('ant');
      statements.push(`@${antRef} isA ?x ${capitalize(antTypes[0])}`);
    } else {
      const typeRefs = [];
      for (const t of antTypes) {
        const ref = genRef('type');
        statements.push(`@${ref} isA ?x ${capitalize(t)}`);
        typeRefs.push(ref);
      }
      antRef = genRef('or');
      statements.push(`@${antRef} Or ${typeRefs.map(r => `$${r}`).join(' ')}`);
    }

    // Build consequent
    let consRef;
    if (consTypes.length === 1) {
      // Check for negation: "is not a X"
      if (consTypes[0].startsWith('not ')) {
        const type = consTypes[0].replace(/^not\s+(?:an?\s+)?/i, '');
        const baseRef = genRef('base');
        consRef = genRef('neg');
        statements.push(`@${baseRef} isA ?x ${capitalize(type)}`);
        statements.push(`@${consRef} Not $${baseRef}`);
      } else {
        consRef = genRef('cons');
        statements.push(`@${consRef} isA ?x ${capitalize(consTypes[0])}`);
      }
    } else {
      const typeRefs = [];
      for (const t of consTypes) {
        const ref = genRef('cons');
        statements.push(`@${ref} isA ?x ${capitalize(t)}`);
        typeRefs.push(ref);
      }
      consRef = genRef('and');
      statements.push(`@${consRef} And ${typeRefs.map(r => `$${r}`).join(' ')}`);
    }

    statements.push(`Implies $${antRef} $${consRef}`);
    return statements.join('\n');
  }

  // Pattern: "Everything that is an X and a Y and a Z is [not] a W"
  const everythingAnd = s.match(/^everything\s+that\s+is\s+(?:an?\s+)?(.+?)\s+is\s+(not\s+)?(?:an?\s+)?(\w+)$/i);
  if (everythingAnd && everythingAnd[1].includes(' and ')) {
    const [, antecedentPart, notPart, consequentType] = everythingAnd;

    const antTypes = antecedentPart.split(/,?\s+and\s+/i).map(t => t.replace(/^an?\s+/i, '').trim()).filter(Boolean);

    const statements = [];
    const typeRefs = [];
    for (const t of antTypes) {
      const ref = genRef('type');
      statements.push(`@${ref} isA ?x ${capitalize(t)}`);
      typeRefs.push(ref);
    }
    const antRef = genRef('and');
    statements.push(`@${antRef} And ${typeRefs.map(r => `$${r}`).join(' ')}`);

    let consRef;
    if (notPart) {
      const baseRef = genRef('base');
      consRef = genRef('neg');
      statements.push(`@${baseRef} isA ?x ${capitalize(consequentType)}`);
      statements.push(`@${consRef} Not $${baseRef}`);
    } else {
      consRef = genRef('cons');
      statements.push(`@${consRef} isA ?x ${capitalize(consequentType)}`);
    }

    statements.push(`Implies $${antRef} $${consRef}`);
    return statements.join('\n');
  }

  // Pattern: "X is a Y" (simple instance fact)
  const simpleIsA = s.match(/^(\w+)\s+is\s+(?:an?\s+)?(\w+)$/i);
  if (simpleIsA) {
    const [, entity, type] = simpleIsA;
    return `isA ${capitalize(entity)} ${capitalize(type)}`;
  }

  // Pattern: "X is not a Y" (negated instance fact)
  const negatedIsA = s.match(/^(\w+)\s+is\s+not\s+(?:an?\s+)?(\w+)$/i);
  if (negatedIsA) {
    const [, entity, type] = negatedIsA;
    const ref = genRef('neg');
    return `@${ref} isA ${capitalize(entity)} ${capitalize(type)}\nNot $${ref}`;
  }

  return null;
}

function translateProntoQAQuestion(question) {
  if (!question) return null;
  const q = question.trim().replace(/\.$/, '');

  // Pattern: "X is a Y, a Z, or a W" (disjunction query)
  const disjMatch = q.match(/^(\w+)\s+is\s+(?:an?\s+)?(.+)$/i);
  if (disjMatch && disjMatch[2].includes(' or ')) {
    const [, entity, rest] = disjMatch;
    const types = rest.split(/,?\s+or\s+/i).map(t => t.replace(/^an?\s+/i, '').trim()).filter(Boolean);

    if (types.length > 1) {
      const statements = [];
      const refs = [];
      for (const t of types) {
        const ref = genRef('q');
        statements.push(`@${ref} isA ${capitalize(entity)} ${capitalize(t)}`);
        refs.push(ref);
      }
      const orRef = genRef('or');
      statements.push(`@${orRef} Or ${refs.map(r => `$${r}`).join(' ')}`);
      statements.push(`@goal $${orRef}`);
      return statements.join('\n');
    }
  }

  // Pattern: "X is not a Y"
  const negMatch = q.match(/^(\w+)\s+is\s+not\s+(?:an?\s+)?(\w+)$/i);
  if (negMatch) {
    const [, entity, type] = negMatch;
    return `@goal Not (isA ${capitalize(entity)} ${capitalize(type)})`;
  }

  // Pattern: "X is a Y"
  const simpleMatch = q.match(/^(\w+)\s+is\s+(?:an?\s+)?(\w+)$/i);
  if (simpleMatch) {
    const [, entity, type] = simpleMatch;
    return `@goal isA ${capitalize(entity)} ${capitalize(type)}`;
  }

  return null;
}

// =============================================================================
// FOLIO Translator
// =============================================================================
// FOLIO uses complex natural language. We handle common patterns:
// - "If X, then Y" (conditional)
// - "All X are Y" (universal)
// - "X is Y" (property)
// - "X does Y" (action)
// - "No X are Y" (universal negation)

function translateFOLIOContext(context) {
  const statements = [];
  const errors = [];

  if (!context) return { dsl: '', errors: [] };

  // Split into sentences
  const sentences = context.split(/\.\s*/).map(s => s.trim()).filter(Boolean);

  for (const sent of sentences) {
    const dsl = translateFOLIOSentence(sent);
    if (dsl) {
      statements.push(dsl);
    } else {
      errors.push({ sentence: sent, error: 'Could not parse' });
    }
  }

  return { dsl: statements.join('\n'), errors };
}

function translateFOLIOSentence(sent) {
  const s = sent.trim();
  const lower = s.toLowerCase();

  // Pattern: "If X, then Y" or "If X then Y"
  const ifThen = s.match(/^if\s+(.+?),?\s+then\s+(.+)$/i);
  if (ifThen) {
    const [, antecedent, consequent] = ifThen;
    return translateFOLIOConditional(antecedent, consequent);
  }

  // Pattern: "All X [who/that/which] Y are Z"
  const allAre = s.match(/^all\s+(.+?)\s+are\s+(.+)$/i);
  if (allAre) {
    const [, subject, predicate] = allAre;
    return translateFOLIOUniversal(subject, predicate);
  }

  // Pattern: "Every X is Y" or "Every X Y"
  const every = s.match(/^every\s+(\w+)\s+(?:is\s+)?(.+)$/i);
  if (every) {
    const [, type, predicate] = every;
    return translateFOLIOUniversal(type, predicate);
  }

  // Pattern: "No X are Y" or "No X Y"
  const noAre = s.match(/^no\s+(.+?)\s+(?:are|is)\s+(.+)$/i);
  if (noAre) {
    const [, subject, predicate] = noAre;
    return translateFOLIOUniversalNeg(subject, predicate);
  }

  // Pattern: "X is a Y" (type assertion)
  const isAType = s.match(/^(\w+)\s+is\s+(?:a|an)\s+(\w+)$/i);
  if (isAType) {
    const [, entity, type] = isAType;
    return `isA ${capitalize(entity)} ${capitalize(type)}`;
  }

  // Pattern: "X is Y" (property)
  const isProp = s.match(/^(\w+)\s+is\s+(\w+)$/i);
  if (isProp) {
    const [, entity, prop] = isProp;
    return `hasProperty ${capitalize(entity)} ${prop.toLowerCase()}`;
  }

  // Pattern: "X is not Y"
  const isNotProp = s.match(/^(\w+)\s+is\s+not\s+(\w+)$/i);
  if (isNotProp) {
    const [, entity, prop] = isNotProp;
    const ref = genRef('neg');
    return `@${ref} hasProperty ${capitalize(entity)} ${prop.toLowerCase()}\nNot $${ref}`;
  }

  // Pattern: "X does not Y" (negated action)
  const doesNot = s.match(/^(\w+)\s+does\s+not\s+(\w+)(?:\s+(.+))?$/i);
  if (doesNot) {
    const [, subj, verb, obj] = doesNot;
    const ref = genRef('neg');
    if (obj) {
      return `@${ref} ${verb.toLowerCase()} ${capitalize(subj)} ${capitalize(obj)}\nNot $${ref}`;
    }
    return `@${ref} hasProperty ${capitalize(subj)} ${verb.toLowerCase()}\nNot $${ref}`;
  }

  // Pattern: "X Ys Z" (action with object)
  const action = s.match(/^(\w+)\s+(\w+)s\s+(.+)$/i);
  if (action) {
    const [, subj, verb, obj] = action;
    if (!['i'].includes(verb.toLowerCase())) {
      return `${verb.toLowerCase()} ${capitalize(subj)} ${capitalize(obj.replace(/^(?:the|a|an)\s+/i, ''))}`;
    }
  }

  // Pattern: "X either Y or Z"
  const either = s.match(/^(\w+)\s+either\s+(.+?)\s+or\s+(.+)$/i);
  if (either) {
    const [, entity, opt1, opt2] = either;
    // Simplified: just note the entity exists
    return `hasProperty ${capitalize(entity)} exists`;
  }

  // Complex patterns - return a simplified placeholder
  // Many FOLIO sentences are too complex for simple pattern matching
  return null;
}

function translateFOLIOConditional(antecedent, consequent) {
  const statements = [];

  // Simplify: extract key predicates
  const antDsl = extractFOLIOPredicate(antecedent, '?x');
  const consDsl = extractFOLIOPredicate(consequent, '?x');

  if (!antDsl || !consDsl) return null;

  const antRef = genRef('ant');
  const consRef = genRef('cons');
  statements.push(`@${antRef} ${antDsl}`);
  statements.push(`@${consRef} ${consDsl}`);
  statements.push(`Implies $${antRef} $${consRef}`);

  return statements.join('\n');
}

function translateFOLIOUniversal(subject, predicate) {
  const statements = [];

  // Check if subject has "who/that/which" clause
  const whoMatch = subject.match(/^(.+?)\s+(?:who|that|which)\s+(.+)$/i);

  let typeRef;
  if (whoMatch) {
    const [, baseType, condition] = whoMatch;
    // Build compound antecedent
    const baseRef = genRef('type');
    statements.push(`@${baseRef} isA ?x ${capitalize(singularize(baseType))}`);

    const condDsl = extractFOLIOPredicate(condition, '?x');
    if (condDsl) {
      const condRef = genRef('cond');
      statements.push(`@${condRef} ${condDsl}`);
      typeRef = genRef('and');
      statements.push(`@${typeRef} And $${baseRef} $${condRef}`);
    } else {
      typeRef = baseRef;
    }
  } else {
    typeRef = genRef('type');
    statements.push(`@${typeRef} isA ?x ${capitalize(singularize(subject))}`);
  }

  // Handle predicate
  const predDsl = extractFOLIOPredicate(predicate, '?x');
  if (!predDsl) return null;

  const consRef = genRef('cons');
  statements.push(`@${consRef} ${predDsl}`);
  statements.push(`Implies $${typeRef} $${consRef}`);

  return statements.join('\n');
}

function translateFOLIOUniversalNeg(subject, predicate) {
  const statements = [];

  const typeRef = genRef('type');
  statements.push(`@${typeRef} isA ?x ${capitalize(singularize(subject))}`);

  const predDsl = extractFOLIOPredicate(predicate, '?x');
  if (!predDsl) return null;

  const baseRef = genRef('base');
  statements.push(`@${baseRef} ${predDsl}`);

  const negRef = genRef('neg');
  statements.push(`@${negRef} Not $${baseRef}`);
  statements.push(`Implies $${typeRef} $${negRef}`);

  return statements.join('\n');
}

function extractFOLIOPredicate(text, varName) {
  const t = text.trim().toLowerCase();

  // "is a X"
  const isAMatch = t.match(/^(?:is|are)\s+(?:a|an)\s+(\w+)/i);
  if (isAMatch) {
    return `isA ${varName} ${capitalize(isAMatch[1])}`;
  }

  // "is X" (property)
  const isPropMatch = t.match(/^(?:is|are)\s+(\w+)/i);
  if (isPropMatch) {
    return `hasProperty ${varName} ${isPropMatch[1]}`;
  }

  // "Xs Y" (verb + object)
  const verbMatch = t.match(/^(\w+)s?\s+(.+)/i);
  if (verbMatch) {
    const [, verb, rest] = verbMatch;
    // Check for negation
    if (verb === 'do' || verb === 'does') {
      const notMatch = rest.match(/^not\s+(\w+)(?:\s+(.+))?/i);
      if (notMatch) {
        const [, negVerb, obj] = notMatch;
        if (obj) {
          return `Not (${negVerb.toLowerCase()} ${varName} ${capitalize(obj.replace(/^(?:the|a|an)\s+/i, ''))})`;
        }
        return `Not (hasProperty ${varName} ${negVerb.toLowerCase()})`;
      }
    }

    // Remove articles from object
    const obj = rest.replace(/^(?:the|a|an)\s+/i, '').trim();
    if (obj) {
      return `${verb.toLowerCase()} ${varName} ${capitalize(obj)}`;
    }
    return `hasProperty ${varName} ${verb.toLowerCase()}`;
  }

  // Fallback: treat as property
  const words = t.split(/\s+/);
  if (words.length === 1) {
    return `hasProperty ${varName} ${words[0]}`;
  }

  return null;
}

function translateFOLIOQuestion(question) {
  if (!question) return null;
  const q = question.trim().replace(/\.$/, '');

  // Handle negation: "X is not Y"
  const negMatch = q.match(/^(\w+)\s+is\s+not\s+(.+)$/i);
  if (negMatch) {
    const [, entity, predicate] = negMatch;
    // Check if it's a type
    if (predicate.match(/^(?:a|an)\s+/i)) {
      const type = predicate.replace(/^(?:a|an)\s+/i, '');
      return `@goal Not (isA ${capitalize(entity)} ${capitalize(type)})`;
    }
    return `@goal Not (hasProperty ${capitalize(entity)} ${predicate.toLowerCase()})`;
  }

  // "X is a Y"
  const isAMatch = q.match(/^(\w+)\s+is\s+(?:a|an)\s+(\w+)/i);
  if (isAMatch) {
    const [, entity, type] = isAMatch;
    return `@goal isA ${capitalize(entity)} ${capitalize(type)}`;
  }

  // "X is Y" (property)
  const isPropMatch = q.match(/^(\w+)\s+is\s+(\w+)/i);
  if (isPropMatch) {
    const [, entity, prop] = isPropMatch;
    return `@goal hasProperty ${capitalize(entity)} ${prop.toLowerCase()}`;
  }

  // "X Ys Z"
  const actionMatch = q.match(/^(\w+)\s+(\w+)s\s+(.+)$/i);
  if (actionMatch) {
    const [, subj, verb, obj] = actionMatch;
    if (!['i'].includes(verb.toLowerCase())) {
      return `@goal ${verb.toLowerCase()} ${capitalize(subj)} ${capitalize(obj.replace(/^(?:the|a|an)\s+/i, ''))}`;
    }
  }

  // Complex questions - try to extract key assertion
  // Look for main subject and predicate
  const simpleMatch = q.match(/^(\w+)\s+(.+)$/i);
  if (simpleMatch) {
    const [, entity, predicate] = simpleMatch;
    const predDsl = extractFOLIOPredicate(predicate, capitalize(entity));
    if (predDsl) {
      return `@goal ${predDsl.replace(capitalize(entity), capitalize(entity))}`;
    }
  }

  return null;
}

// =============================================================================
// Generic/RuleTaker-style Translator
// =============================================================================

function translateGenericContext(context) {
  const statements = [];
  const errors = [];

  if (!context) return { dsl: '', errors: [] };

  const sentences = context.split(/\.\s*/).map(s => s.trim()).filter(Boolean);

  for (const sent of sentences) {
    const dsl = translateGenericSentence(sent);
    if (dsl) {
      statements.push(dsl);
    } else {
      errors.push({ sentence: sent, error: 'Could not parse' });
    }
  }

  return { dsl: statements.join('\n'), errors };
}

function translateGenericSentence(sent) {
  const s = sent.trim();
  const lower = s.toLowerCase();

  // "If X then Y"
  const ifThen = s.match(/^if\s+(.+?),?\s+then\s+(.+)$/i);
  if (ifThen) {
    return translateGenericConditional(ifThen[1], ifThen[2]);
  }

  // "All X are Y"
  const allAre = s.match(/^all\s+(\w+)\s+are\s+(\w+)$/i);
  if (allAre) {
    const [, from, to] = allAre;
    const antRef = genRef('ant');
    const consRef = genRef('cons');
    return `@${antRef} isA ?x ${capitalize(from)}\n@${consRef} isA ?x ${capitalize(to)}\nImplies $${antRef} $${consRef}`;
  }

  // "X is a Y"
  const isA = s.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+is\s+(?:a|an)\s+(\w+)$/i);
  if (isA) {
    const [, entity, type] = isA;
    return `isA ${normalizeEntity(entity)} ${capitalize(type)}`;
  }

  // "X is Y" (property)
  const isProp = s.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+is\s+(not\s+)?(\w+)$/i);
  if (isProp) {
    const [, entity, notPart, prop] = isProp;
    if (notPart) {
      const ref = genRef('neg');
      return `@${ref} hasProperty ${normalizeEntity(entity)} ${prop.toLowerCase()}\nNot $${ref}`;
    }
    return `hasProperty ${normalizeEntity(entity)} ${prop.toLowerCase()}`;
  }

  // "X Ys Z"
  const relation = s.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+(\w+)s\s+(?:the\s+)?(\w+(?:\s+\w+)?)$/i);
  if (relation) {
    const [, subj, verb, obj] = relation;
    if (!['i'].includes(verb.toLowerCase())) {
      return `${verb.toLowerCase()} ${normalizeEntity(subj)} ${normalizeEntity(obj)}`;
    }
  }

  // "X does not Y Z"
  const doesNot = s.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+does\s+not\s+(\w+)\s+(?:the\s+)?(\w+(?:\s+\w+)?)$/i);
  if (doesNot) {
    const [, subj, verb, obj] = doesNot;
    const ref = genRef('neg');
    return `@${ref} ${verb.toLowerCase()} ${normalizeEntity(subj)} ${normalizeEntity(obj)}\nNot $${ref}`;
  }

  return null;
}

function translateGenericConditional(antecedent, consequent) {
  // Simplified pattern matching
  const antMatch = antecedent.match(/(?:something|someone|it|they)\s+(?:is|are)\s+(\w+)/i);
  const consMatch = consequent.match(/(?:it|they)\s+(?:is|are)\s+(\w+)/i);

  if (antMatch && consMatch) {
    const antRef = genRef('ant');
    const consRef = genRef('cons');
    return `@${antRef} hasProperty ?x ${antMatch[1].toLowerCase()}\n@${consRef} hasProperty ?x ${consMatch[1].toLowerCase()}\nImplies $${antRef} $${consRef}`;
  }

  return null;
}

function translateGenericQuestion(question) {
  if (!question) return null;
  const q = question.trim().replace(/\.$/, '');

  // "X is not Y"
  const negMatch = q.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+is\s+not\s+(\w+)$/i);
  if (negMatch) {
    const [, entity, prop] = negMatch;
    return `@goal Not (hasProperty ${normalizeEntity(entity)} ${prop.toLowerCase()})`;
  }

  // "X is a Y"
  const isAMatch = q.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+is\s+(?:a|an)\s+(\w+)$/i);
  if (isAMatch) {
    const [, entity, type] = isAMatch;
    return `@goal isA ${normalizeEntity(entity)} ${capitalize(type)}`;
  }

  // "X is Y"
  const isPropMatch = q.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+is\s+(\w+)$/i);
  if (isPropMatch) {
    const [, entity, prop] = isPropMatch;
    return `@goal hasProperty ${normalizeEntity(entity)} ${prop.toLowerCase()}`;
  }

  // "X Ys Z"
  const relationMatch = q.match(/^(?:the\s+)?(\w+(?:\s+\w+)?)\s+(\w+)s\s+(?:the\s+)?(\w+(?:\s+\w+)?)$/i);
  if (relationMatch) {
    const [, subj, verb, obj] = relationMatch;
    if (!['i'].includes(verb.toLowerCase())) {
      return `@goal ${verb.toLowerCase()} ${normalizeEntity(subj)} ${normalizeEntity(obj)}`;
    }
  }

  return null;
}

// =============================================================================
// Helpers
// =============================================================================

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normalizeEntity(text) {
  const parts = text.trim().split(/\s+/);
  return parts.map(p => capitalize(p)).join('');
}

function singularize(word) {
  const w = String(word || '').toLowerCase().trim();
  if (!w) return w;
  if (w === 'people') return 'person';
  if (w === 'mice') return 'mouse';
  if (w.endsWith('uses')) return w.slice(0, -2); // wumpuses -> wumpus
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 1) return w.slice(0, -1);
  return w;
}

/**
 * Batch translate multiple examples
 */
export function translateBatch(examples) {
  return examples.map(ex => {
    try {
      return translateExample(ex);
    } catch (e) {
      return {
        source: ex.source,
        contextDsl: '',
        contextErrors: [{ error: e.message }],
        questionDsl: null,
        expectProved: null,
        label: ex.label,
        original: ex
      };
    }
  });
}

/**
 * RuleTaker to AGISystem2 DSL Translator
 *
 * Translates natural language facts and rules from RuleTaker format
 * to AGISystem2 DSL format.
 *
 * RuleTaker patterns:
 *   Facts: "Anne is quiet.", "Anne is not young.", "Bob is a dog.", "Anne likes Bob."
 *   Rules: "If something is blue then it is cold.", "Kind, young things are not smart."
 *          "If someone sees the cat then they eat the rabbit."
 *
 * AGISystem2 DSL:
 *   Facts: "hasProperty Anne quiet", "@neg hasProperty Anne young\nNot $neg"
 *   Rules: "@ant hasProperty ?x blue\n@cons hasProperty ?x cold\nImplies $ant $cons"
 */

// Counter for generating unique reference names
let refCounter = 0;

/**
 * Reset reference counter (call between examples)
 */
export function resetRefCounter() {
  refCounter = 0;
}

/**
 * Generate unique reference name
 */
function genRef(prefix = 'ref') {
  return `${prefix}${refCounter++}`;
}

const TYPE_NOUNS = new Set([
  'person',
  'people',
  'agent',
  'entity',
  'animal',
  'thing',
  'things',
  'livingthing',
  'livingthings',
  'cat',
  'dog',
  'rabbit',
  'mouse',
  'tiger',
  'lion',
  'bear',
  'squirrel',
  'cow',
  'eagle',
  'baldeagle'
]);

const GENERIC_CLASS_NOUNS = new Set([
  'things',
  'people',
  'animals',
  'cats',
  'dogs',
  'mice',
  'rabbits',
  'tigers',
  'lions',
  'bears',
  'squirrels',
  'cows',
  'eagles'
]);

/**
 * Capitalize first letter
 */
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function singularizeNoun(word) {
  const lower = String(word || '').toLowerCase().trim();
  if (!lower) return lower;
  if (lower === 'people') return 'person';
  if (lower === 'mice') return 'mouse';
  if (lower === 'livingthings') return 'livingthing';
  if (lower.endsWith('ies') && lower.length > 3) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('s') && lower.length > 1) return lower.slice(0, -1);
  return lower;
}

function isTypeNoun(word) {
  const w = singularizeNoun(word);
  return TYPE_NOUNS.has(w);
}

function normalizeTypeName(word) {
  const w = singularizeNoun(word);
  // Preserve special casing for bald eagle.
  if (w === 'baldeagle') return 'BaldEagle';
  return capitalize(w);
}

/**
 * Split context into sentences
 */
function splitSentences(context) {
  // Split on periods followed by space or end of string
  return context
    .split(/\.\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Check if sentence is a rule (contains conditional language)
 */
function isRule(sentence) {
  const lower = sentence.toLowerCase();
  return (
    lower.startsWith('if ') ||
    lower.includes(' things are ') ||
    lower.includes(' things that ') ||
    lower.includes(' people are ') ||
    lower.includes(' cats are ') ||
    lower.includes(' dogs are ') ||
    lower.includes(' animals are ') ||
    lower.startsWith('all ') ||
    lower.includes(' then ')
  );
}

/**
 * Normalize entity reference
 * - "someone", "something", "they", "it" → ?x (variable)
 * - "the cat" → Cat
 * - "cat" → Cat
 */
function normalizeEntity(text, defaultVar = '?x') {
  const lower = text.toLowerCase().trim();

  // Variable references
  if (['someone', 'something', 'they', 'it', 'he', 'she'].includes(lower)) {
    return defaultVar;
  }

  // Remove "the" prefix
  const withoutThe = lower.replace(/^the\s+/, '');

  // Handle compound names (e.g., "bald eagle" → "BaldEagle")
  const parts = withoutThe.split(/\s+/);
  return parts.map(p => capitalize(p)).join('');
}

const VERB_OPERATOR_MAP = new Map([
  ['like', 'likes'],
  ['love', 'loves'],
  ['hate', 'hates']
]);

function normalizeVerb(verb) {
  const v = String(verb || '').toLowerCase().trim();
  return VERB_OPERATOR_MAP.get(v) || v;
}

/**
 * Parse a binary relation from text
 * Returns { verb, subject, object, negated } or null
 *
 * Patterns:
 *   - "someone sees the cat" → { verb: "see", subject: "?x", object: "Cat", negated: false }
 *   - "the cat does not eat the rabbit" → { verb: "eat", subject: "Cat", object: "Rabbit", negated: true }
 *   - "they visit the lion" → { verb: "visit", subject: "?x", object: "Lion", negated: false }
 */
function parseBinaryRelation(text, defaultVar = '?x') {
  const cleaned = text.trim();

  // Check for negation
  const negMatch = cleaned.match(/^(.+?)\s+(?:does not|do not|doesn't|don't)\s+(.+)$/i);
  if (negMatch) {
    const [, subject, rest] = negMatch;
    // Parse "verb object" from rest
    const verbObjMatch = rest.match(/^(\w+)\s+(.+)$/i);
    if (verbObjMatch) {
      const [, verb, object] = verbObjMatch;
      return {
        verb: normalizeVerb(verb),
        subject: normalizeEntity(subject, defaultVar),
        object: normalizeEntity(object, defaultVar),
        negated: true
      };
    }
  }

  // Pattern: "<subject> <verb>s <object>" (third person singular)
  // e.g., "someone sees the cat", "the lion eats the mouse"
  const thirdPersonMatch = cleaned.match(/^(.+?)\s+(\w+)s\s+(.+)$/i);
  if (thirdPersonMatch) {
    const [, subject, verb, object] = thirdPersonMatch;
    // Skip if verb is "is" (handled separately)
    if (verb.toLowerCase() !== 'i') {
      return {
        verb: normalizeVerb(verb),
        subject: normalizeEntity(subject, defaultVar),
        object: normalizeEntity(object, defaultVar),
        negated: false
      };
    }
  }

  // Pattern: "<subject> <verb> <object>" (base form)
  // e.g., "they see the cat", "they eat the rabbit"
  const baseMatch = cleaned.match(/^(.+?)\s+(\w+)\s+(.+)$/i);
  if (baseMatch) {
    const [, subject, verb, object] = baseMatch;
    // Skip common non-relation verbs
    if (['is', 'are', 'was', 'were', 'be', 'been', 'being'].includes(verb.toLowerCase())) {
      return null;
    }
    return {
      verb: normalizeVerb(verb),
      subject: normalizeEntity(subject, defaultVar),
      object: normalizeEntity(object, defaultVar),
      negated: false
    };
  }

  return null;
}

/**
 * Parse a property assertion from text
 * Returns { subject, property, negated } or null
 *
 * Patterns:
 *   - "someone is rough" → { subject: "?x", property: "rough", negated: false }
 *   - "the cat is not kind" → { subject: "Cat", property: "kind", negated: true }
 *   - "they are round" → { subject: "?x", property: "round", negated: false }
 */
function parsePropertyAssertion(text, defaultVar = '?x') {
  const cleaned = text.trim();

  // Pattern: "<subject> is/are [not] <property>"
  const propMatch = cleaned.match(/^(.+?)\s+(?:is|are)\s+(not\s+)?(\w+)$/i);
  if (propMatch) {
    const [, subject, notPart, property] = propMatch;
    // Check it's not "is a <type>" pattern
    if (property.toLowerCase() !== 'a' && property.toLowerCase() !== 'an') {
      return {
        subject: normalizeEntity(subject, defaultVar),
        property: property.toLowerCase(),
        negated: !!notPart
      };
    }
  }

  return null;
}

function parseTypeAssertion(text, defaultVar = '?x') {
  const cleaned = text.trim();
  const match = cleaned.match(/^(.+?)\s+(?:is|are)\s+a[n]?\s+(.+)$/i);
  if (!match) return null;
  const [, subject, rawType] = match;
  const type = normalizeEntity(rawType, defaultVar);
  return { subject: normalizeEntity(subject, defaultVar), type };
}

/**
 * Translate a simple fact sentence to DSL
 *
 * Patterns handled:
 *   - "Anne is quiet" → hasProperty Anne quiet
 *   - "Anne is not young" → @neg hasProperty Anne young\nNot $neg
 *   - "Bob is a dog" → isA Bob Dog
 *   - "Anne likes Bob" → likes Anne Bob
 *   - "Anne does not like Bob" → @neg likes Anne Bob\nNot $neg
 *   - "The bald eagle is kind" → hasProperty BaldEagle kind (multi-word entity)
 */
export function translateFact(sentence) {
  const cleaned = sentence.replace(/\.$/, '').trim();
  const lower = cleaned.toLowerCase();

  // Check for negation patterns
  const hasNot = lower.includes(' is not ') ||
                 lower.includes(' are not ') ||
                 lower.includes(' does not ') ||
                 lower.includes(' do not ');

  // Handle "does not" pattern specially for multi-word entities
  // Pattern: "[The] <Entity> does not <verb> [the] <Entity2>"
  const doesNotMatch = cleaned.match(/^(?:the\s+)?(.+?)\s+does\s+not\s+(\w+)\s+(?:the\s+)?(.+)$/i);
  if (doesNotMatch) {
    const [, subj, verb, obj] = doesNotMatch;
    const ref = genRef('neg');
    const dsl = `${normalizeVerb(verb)} ${normalizeEntity(subj)} ${normalizeEntity(obj)}`;
    return `@${ref} ${dsl}\nNot $${ref}`;
  }

  // Remove negation for pattern matching (for "is not" patterns)
  let normalized = cleaned
    .replace(/ is not /gi, ' is ')
    .replace(/ are not /gi, ' are ');

  // Pattern: "[The] <Entity> is a <Type>" (type assertion) - check first
  // Supports multi-word entities like "bald eagle"
  const isAMatch = normalized.match(/^(?:the\s+)?(.+?)\s+is\s+a[n]?\s+(\w+)$/i);
  if (isAMatch) {
    const [, entity, type] = isAMatch;
    const dsl = `isA ${normalizeEntity(entity)} ${capitalize(type)}`;

    if (hasNot) {
      const ref = genRef('neg');
      return `@${ref} ${dsl}\nNot $${ref}`;
    }
    return dsl;
  }

  // Pattern: "[The] <Entity> is <Property>" (unary predicate)
  // Supports multi-word entities like "bald eagle"
  const isPropertyMatch = normalized.match(/^(?:the\s+)?(.+?)\s+is\s+(\w+)$/i);
  if (isPropertyMatch) {
    const [, entity, property] = isPropertyMatch;
    const dsl = `hasProperty ${normalizeEntity(entity)} ${property.toLowerCase()}`;

    if (hasNot) {
      const ref = genRef('neg');
      return `@${ref} ${dsl}\nNot $${ref}`;
    }
    return dsl;
  }

  // Pattern: "<Entity> <verb>s <Entity2>" (binary relation)
  // e.g., "Anne likes Bob", "The cat chases the mouse", "The bald eagle sees the lion"
  // Use a more flexible pattern for multi-word entities
  const relationMatch = normalized.match(/^(?:the\s+)?(.+?)\s+(\w+)s\s+(?:the\s+)?(.+)$/i);
  if (relationMatch) {
    let [, subj, verb, obj] = relationMatch;

    // Skip if it matches "is" pattern (already handled above)
    if (verb.toLowerCase() === 'i') {
      return null; // Will be caught as unrecognized
    }

    const dsl = `${normalizeVerb(verb)} ${normalizeEntity(subj)} ${normalizeEntity(obj)}`;

    if (hasNot) {
      const ref = genRef('neg');
      return `@${ref} ${dsl}\nNot $${ref}`;
    }
    return dsl;
  }

  // Pattern: "<Entity> <verb> <Entity2>" without 's' suffix (base verb form)
  const simpleRelationMatch = normalized.match(/^(?:the\s+)?(.+?)\s+(\w+)\s+(?:the\s+)?(.+)$/i);
  if (simpleRelationMatch) {
    const [, subj, verb, obj] = simpleRelationMatch;

    // Skip common non-relation patterns
    if (['is', 'are', 'was', 'were'].includes(verb.toLowerCase())) {
      return null;
    }

    const dsl = `${normalizeVerb(verb)} ${normalizeEntity(subj)} ${normalizeEntity(obj)}`;

    if (hasNot) {
      const ref = genRef('neg');
      return `@${ref} ${dsl}\nNot $${ref}`;
    }
    return dsl;
  }

  // Could not parse
  return null;
}

/**
 * Parse a single condition clause
 * Returns { statements: [...], refs: [...] } or null
 */
function parseConditionClause(clause, defaultVar = '?x') {
  const statements = [];
  const refs = [];
  const cleaned = clause.trim();

  // Type assertion: "someone is a dog"
  const typeAssertion = parseTypeAssertion(cleaned, defaultVar);
  if (typeAssertion) {
    const ref = genRef('cond');
    const dsl = `isA ${typeAssertion.subject} ${typeAssertion.type}`;
    statements.push(`@${ref} ${dsl}`);
    refs.push(ref);
    return { statements, refs };
  }

  // Try to parse as property assertion FIRST (has specific "is/are" pattern)
  const property = parsePropertyAssertion(cleaned, defaultVar);
  if (property) {
    const ref = genRef('cond');
    const baseDsl = `hasProperty ${property.subject} ${property.property}`;

    if (property.negated) {
      const baseRef = genRef('base');
      statements.push(`@${baseRef} ${baseDsl}`);
      statements.push(`@${ref} Not $${baseRef}`);
    } else {
      statements.push(`@${ref} ${baseDsl}`);
    }
    refs.push(ref);
    return { statements, refs };
  }

  // Try to parse as binary relation (more general pattern)
  const relation = parseBinaryRelation(cleaned, defaultVar);
  if (relation) {
    const ref = genRef('cond');
    const baseDsl = `${relation.verb} ${relation.subject} ${relation.object}`;

    if (relation.negated) {
      const baseRef = genRef('base');
      statements.push(`@${baseRef} ${baseDsl}`);
      statements.push(`@${ref} Not $${baseRef}`);
    } else {
      statements.push(`@${ref} ${baseDsl}`);
    }
    refs.push(ref);
    return { statements, refs };
  }

  // Try "not <property>" pattern (standalone negation after "and")
  // e.g., "round and not quiet" → "not quiet" part
  const notPropMatch = cleaned.match(/^not\s+(\w+)$/i);
  if (notPropMatch) {
    const [, property] = notPropMatch;
    const baseRef = genRef('base');
    const ref = genRef('cond');
    statements.push(`@${baseRef} hasProperty ${defaultVar} ${property.toLowerCase()}`);
    statements.push(`@${ref} Not $${baseRef}`);
    refs.push(ref);
    return { statements, refs };
  }

  // Try simple property (adjective alone)
  const simpleMatch = cleaned.match(/^(\w+)$/i);
  if (simpleMatch) {
    const ref = genRef('cond');
    statements.push(`@${ref} hasProperty ${defaultVar} ${simpleMatch[1].toLowerCase()}`);
    refs.push(ref);
    return { statements, refs };
  }

  return null;
}

/**
 * Parse condition part of a rule
 * Returns { statements: [...], refs: [...] }
 *
 * Handles patterns like:
 *   - "someone is rough and they see the mouse"
 *   - "the lion eats the cat"
 *   - "someone sees the cat and the cat does not eat the rabbit"
 */
function parseConditions(conditionText) {
  const statements = [];
  const refs = [];

  // Split on "and" to get individual conditions
  const parts = conditionText.split(/\s+and\s+/i);

  for (const part of parts) {
    const result = parseConditionClause(part, '?x');
    if (result) {
      statements.push(...result.statements);
      refs.push(...result.refs);
    }
  }

  return { statements, refs };
}

/**
 * Parse consequent part of a rule
 * Returns { statements: [...], ref: string }
 *
 * Handles patterns like:
 *   - "it is cold"
 *   - "they see the lion"
 *   - "the cat visits the lion"
 *   - "the lion does not visit the rabbit"
 */
function parseConsequent(consequentText) {
  const statements = [];
  const cleaned = consequentText.trim();

  // Type assertion: "it is a dog"
  const typeAssertion = parseTypeAssertion(cleaned, '?x');
  if (typeAssertion) {
    const ref = genRef('cons');
    statements.push(`@${ref} isA ${typeAssertion.subject} ${typeAssertion.type}`);
    return { statements, ref };
  }

  // Try to parse as property assertion FIRST (has specific "is/are" pattern)
  const property = parsePropertyAssertion(cleaned, '?x');
  if (property) {
    const ref = genRef('cons');
    const baseDsl = `hasProperty ${property.subject} ${property.property}`;

    if (property.negated) {
      const baseRef = genRef('base');
      statements.push(`@${baseRef} ${baseDsl}`);
      statements.push(`@${ref} Not $${baseRef}`);
    } else {
      statements.push(`@${ref} ${baseDsl}`);
    }
    return { statements, ref };
  }

  // Try to parse as binary relation (more general pattern)
  const relation = parseBinaryRelation(cleaned, '?x');
  if (relation) {
    const ref = genRef('cons');
    const baseDsl = `${relation.verb} ${relation.subject} ${relation.object}`;

    if (relation.negated) {
      const baseRef = genRef('base');
      statements.push(`@${baseRef} ${baseDsl}`);
      statements.push(`@${ref} Not $${baseRef}`);
    } else {
      statements.push(`@${ref} ${baseDsl}`);
    }
    return { statements, ref };
  }

  // Fallback: simple property
  const simpleMatch = cleaned.match(/^(\w+)$/i);
  if (simpleMatch) {
    const ref = genRef('cons');
    statements.push(`@${ref} hasProperty ?x ${simpleMatch[1].toLowerCase()}`);
    return { statements, ref };
  }

  // Could not parse
  const ref = genRef('cons');
  return { statements, ref };
}

/**
 * Translate rule sentence to DSL
 *
 * Patterns handled:
 *   - "If something is blue then it is cold"
 *   - "If someone sees the cat then they eat the rabbit"
 *   - "If the lion eats the cat then the lion does not visit the rabbit"
 *   - "Kind, young things are not smart"
 *   - "All dogs are animals"
 */
export function translateRule(sentence) {
  const cleaned = sentence.replace(/\.$/, '').trim();
  const statements = [];

  // Pattern 1: "If <condition> then <consequent>"
  const ifThenMatch = cleaned.match(/^if\s+(.+?)\s+then\s+(.+)$/i);
  if (ifThenMatch) {
    const [, conditionPart, consequentPart] = ifThenMatch;

    const conditions = parseConditions(conditionPart);
    const consequent = parseConsequent(consequentPart);

    statements.push(...conditions.statements);
    statements.push(...consequent.statements);

    // Build antecedent (And if multiple conditions)
    let antRef;
    if (conditions.refs.length === 1) {
      antRef = conditions.refs[0];
    } else if (conditions.refs.length > 1) {
      antRef = genRef('and');
      const andArgs = conditions.refs.map(r => `$${r}`).join(' ');
      statements.push(`@${antRef} And ${andArgs}`);
    } else {
      return null; // No conditions parsed
    }

    statements.push(`Implies $${antRef} $${consequent.ref}`);
    return statements.join('\n');
  }

  // Pattern 2: "All <Type> are <Property>" - check BEFORE "things are" pattern
  // Handles multi-word types like "quiet people" or "nice things"
  const allMatch = cleaned.match(/^all\s+(.+?)\s+are\s+(not\s+)?(\w+)$/i);
  if (allMatch) {
    const [, typePart, notPart, property] = allMatch;
    const isNegated = !!notPart;

    // Handle patterns like "quiet people" or "big, green people" -> condition on both
    // Split on comma+space or just space, removing empty entries
    const typeWords = typePart.trim()
      .split(/[,\s]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    const condRefs = [];

    const classNoun = typeWords[typeWords.length - 1];
    const props = typeWords.length > 1 ? typeWords.slice(0, -1) : [];
    const isGenericClass = GENERIC_CLASS_NOUNS.has(classNoun.toLowerCase());

    if (typeWords.length === 1) {
      // Simple class: "All dogs are ..." - keep the class noun as a type constraint.
      const antRef = genRef('ant');
      statements.push(`@${antRef} isA ?x ${normalizeTypeName(typeWords[0])}`);
      condRefs.push(antRef);
    } else {
      // Multi-word: "All quiet people are..." or "All big, green people are..."
      // Last word is a class noun; preceding words are property constraints.

      // Avoid over-restrictive type constraints for generic class nouns ("people", "animals", etc.)
      // RuleTaker often uses these as grammatical carriers, but expects rules to apply broadly.
      if (!isGenericClass) {
        const typeRef = genRef('type');
        statements.push(`@${typeRef} isA ?x ${normalizeTypeName(classNoun)}`);
        condRefs.push(typeRef);
      }

      // Add hasProperty conditions for each property
      for (const prop of props) {
        const propRef = genRef('prop');
        statements.push(`@${propRef} hasProperty ?x ${prop.toLowerCase()}`);
        condRefs.push(propRef);
      }
    }

    // Build antecedent (And if multiple conditions)
    let antRef;
    if (condRefs.length === 1) {
      antRef = condRefs[0];
    } else {
      antRef = genRef('and');
      const andArgs = condRefs.map(r => `$${r}`).join(' ');
      statements.push(`@${antRef} And ${andArgs}`);
    }

    const consRef = genRef('cons');
    const consequentText = isTypeNoun(property)
      ? `isA ?x ${normalizeTypeName(property)}`
      : `hasProperty ?x ${property.toLowerCase()}`;
    statements.push(`@${consRef} ${consequentText}`);

    let finalConsRef = consRef;
    if (isNegated) {
      const negRef = genRef('negCons');
      statements.push(`@${negRef} Not $${consRef}`);
      finalConsRef = negRef;
    }

    statements.push(`Implies $${antRef} $${finalConsRef}`);
    return statements.join('\n');
  }

  // Pattern 3: "<Property1>, <Property2> <type> are [not] <Property3>"
  // e.g., "Kind, young things are not smart", "Young, round people are kind"
  // Matches: things, people, cats, dogs, animals, etc.
  const typeWordsMatch = cleaned.match(/^(.+?)\s+(things|people|cats|dogs|animals|mice|rabbits|tigers|lions|bears|squirrels|cows|eagles)\s+are\s+(not\s+)?(\w+)$/i);
  if (typeWordsMatch) {
    const [, propertiesPart, typeName, notPart, resultProperty] = typeWordsMatch;
    const isNegated = !!notPart;

    // Parse properties (comma or "and" separated)
    const properties = propertiesPart
      .split(/[,\s]+(?:and\s+)?/)
      .map(p => p.trim().toLowerCase())
      .filter(p => p && p.length > 0);

    const condRefs = [];

    // Add type condition if it's a specific type (not "things")
    const typeLower = typeName.toLowerCase();
    const isGenericClass = GENERIC_CLASS_NOUNS.has(typeLower);
    if (!isGenericClass && typeLower !== 'things') {
      const typeRef = genRef('type');
      statements.push(`@${typeRef} isA ?x ${normalizeTypeName(typeName)}`);
      condRefs.push(typeRef);
    }

    // Add property conditions
    for (const prop of properties) {
      const ref = genRef('cond');
      statements.push(`@${ref} hasProperty ?x ${prop}`);
      condRefs.push(ref);
    }

    // Build antecedent
    let antRef;
    if (condRefs.length === 1) {
      antRef = condRefs[0];
    } else {
      antRef = genRef('and');
      const andArgs = condRefs.map(r => `$${r}`).join(' ');
      statements.push(`@${antRef} And ${andArgs}`);
    }

    // Build consequent
    const consRef = genRef('cons');
    const consequentText = isTypeNoun(resultProperty)
      ? `isA ?x ${normalizeTypeName(resultProperty)}`
      : `hasProperty ?x ${resultProperty.toLowerCase()}`;
    statements.push(`@${consRef} ${consequentText}`);

    let finalConsRef = consRef;
    if (isNegated) {
      const negRef = genRef('negCons');
      statements.push(`@${negRef} Not $${consRef}`);
      finalConsRef = negRef;
    }

    statements.push(`Implies $${antRef} $${finalConsRef}`);
    return statements.join('\n');
  }

  // Could not parse
  return null;
}

/**
 * Translate entire context (facts + rules) to DSL
 */
export function translateContext(context) {
  resetRefCounter();

  const sentences = splitSentences(context);
  const dslStatements = [];
  const errors = [];

  for (const sentence of sentences) {
    try {
      let dsl;
      if (isRule(sentence)) {
        dsl = translateRule(sentence);
      } else {
        dsl = translateFact(sentence);
      }

      if (dsl) {
        dslStatements.push(dsl);
      } else {
        errors.push({ sentence, error: 'Could not parse' });
      }
    } catch (err) {
      errors.push({ sentence, error: err.message });
    }
  }

  return {
    dsl: dslStatements.join('\n'),
    errors,
    sentences: sentences.length,
    parsed: dslStatements.length
  };
}

/**
 * Translate question to prove goal
 *
 * CRITICAL: prove() only uses the FIRST statement (see src/runtime/session-prove.mjs:18)
 * So we MUST generate a single statement, using compound expressions (parentheses)
 * for negation instead of multi-line reference patterns.
 *
 * Good: @goal Not (hasProperty Bob big)
 * Bad:  @neg hasProperty Bob big\n@goal Not $neg  <- second line ignored!
 */
export function translateQuestion(question) {
  const cleaned = question.replace(/\.$/, '').trim();

  // Parse the question to understand its structure
  const parsed = parseQuestionStructure(cleaned);
  if (!parsed) return null;

  // Build single-statement goal using compound expressions
  return buildGoalDsl(parsed);
}

/**
 * Parse question structure into { type, negated, subject, predicate, object? }
 */
function parseQuestionStructure(text) {
  const lower = text.toLowerCase();

  // Check for negation patterns
  const hasNot = lower.includes(' is not ') ||
                 lower.includes(' are not ') ||
                 lower.includes(' does not ') ||
                 lower.includes(' do not ');

  // Handle "does not <verb>" pattern specially - convert to "<verb>s" form
  // "Anne does not like Bob" → "Anne likes Bob" (for pattern matching)
  let normalized = text
    .replace(/ is not /gi, ' is ')
    .replace(/ are not /gi, ' are ')
    .replace(/\s+does\s+not\s+(\w+)\s+/gi, (_, verb) => ` ${verb}s `)
    .replace(/\s+do\s+not\s+(\w+)\s+/gi, (_, verb) => ` ${verb} `);

  // Pattern: "[The] <Entity> is a <Type>" (type assertion)
  const isAMatch = normalized.match(/^(?:the\s+)?(.+?)\s+is\s+a[n]?\s+(\w+)$/i);
  if (isAMatch) {
    const [, entity, type] = isAMatch;
    return {
      type: 'isA',
      negated: hasNot,
      subject: normalizeEntity(entity),
      predicate: capitalize(type)
    };
  }

  // Pattern: "[The] <Entity> is <Property>" (unary predicate)
  const isPropertyMatch = normalized.match(/^(?:the\s+)?(.+?)\s+is\s+(\w+)$/i);
  if (isPropertyMatch) {
    const [, entity, property] = isPropertyMatch;
    return {
      type: 'hasProperty',
      negated: hasNot,
      subject: normalizeEntity(entity),
      predicate: property.toLowerCase()
    };
  }

  // Pattern: "<Entity> <verb>s <Entity2>" (binary relation, third person)
  const relationMatch = normalized.match(/^(?:the\s+)?(.+?)\s+(\w+)s\s+(?:the\s+)?(.+)$/i);
  if (relationMatch) {
    let [, subj, verb, obj] = relationMatch;
    if (verb.toLowerCase() !== 'i') { // Skip "is" pattern
      return {
        type: 'relation',
        negated: hasNot,
        verb: normalizeVerb(verb),
        subject: normalizeEntity(subj),
        object: normalizeEntity(obj)
      };
    }
  }

  // Pattern: "<Entity> <verb> <Entity2>" (binary relation, base form)
  const simpleRelationMatch = normalized.match(/^(?:the\s+)?(.+?)\s+(\w+)\s+(?:the\s+)?(.+)$/i);
  if (simpleRelationMatch) {
    const [, subj, verb, obj] = simpleRelationMatch;
    if (!['is', 'are', 'was', 'were'].includes(verb.toLowerCase())) {
      return {
        type: 'relation',
        negated: hasNot,
        verb: normalizeVerb(verb),
        subject: normalizeEntity(subj),
        object: normalizeEntity(obj)
      };
    }
  }

  return null;
}

/**
 * Build single-statement goal DSL from parsed structure
 * Uses compound expressions (parentheses) for negation
 */
function buildGoalDsl(parsed) {
  let innerDsl;

  switch (parsed.type) {
    case 'isA':
      innerDsl = `isA ${parsed.subject} ${parsed.predicate}`;
      break;
    case 'hasProperty':
      innerDsl = `hasProperty ${parsed.subject} ${parsed.predicate}`;
      break;
    case 'relation':
      innerDsl = `${parsed.verb} ${parsed.subject} ${parsed.object}`;
      break;
    default:
      return null;
  }

  // Wrap in Not with parentheses if negated
  if (parsed.negated) {
    return `@goal Not (${innerDsl})`;
  }

  return `@goal ${innerDsl}`;
}

/**
 * Translate a complete RuleTaker example
 */
export function translateExample(example) {
  const { context, question, label, config } = example;

  // Translate context
  const contextResult = translateContext(context);

  // Translate question
  const questionDsl = translateQuestion(question);

  // Determine expected result
  const expectProved = label === 'entailment';

  return {
    contextDsl: contextResult.dsl,
    contextErrors: contextResult.errors,
    questionDsl,
    expectProved,
    depth: extractDepthFromConfig(config),
    original: { context, question, label, config }
  };
}

/**
 * Extract depth from config string
 */
function extractDepthFromConfig(config) {
  if (!config) return 0;
  const match = config.match(/depth-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

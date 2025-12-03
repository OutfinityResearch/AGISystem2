/**
 * DS(/chat/handler_utils.mjs) - Shared chat handler utilities
 *
 * Lexical normalization and deterministic helpers used by chat handlers:
 * - Concept name normalization (plural → singular, mapping to base ontology)
 * - Deterministic fact extraction from simple NL statements
 * - Fallback parsers for simple questions
 * - Lightweight type inference helpers over fact triples
 */

// Lightweight lexical normalization for deterministic logic demos.
// Maps natural language words (EN/RO) to base ontology concept names.
const LOGIC_LEXICON = {
  // Human / person
  man: 'human',
  men: 'human',
  human: 'human',
  humans: 'human',
  person: 'human',
  people: 'human',
  om: 'human',
  oameni: 'human',

  // Mortality
  mortal: 'mortal',
  mortals: 'mortal',
  muritor: 'mortal',
  muritori: 'mortal'
};

// Irregular plural → singular normalization for concept names
const IRREGULAR_PLURALS = {
  people: 'person',
  men: 'man',
  women: 'woman',
  children: 'child',
  mice: 'mouse',
  geese: 'goose',
  teeth: 'tooth',
  feet: 'foot',
  // Romanian basics
  oameni: 'om',
  copii: 'copil'
};

export function normalizeConceptToken(token) {
  const w = String(token).trim().toLowerCase();

  if (LOGIC_LEXICON[w]) return LOGIC_LEXICON[w];
  if (IRREGULAR_PLURALS[w]) return IRREGULAR_PLURALS[w];

  // Heuristic singularization – only for all-lowercase concept-like names
  if (!/^[a-z_]+$/.test(w)) return w;

  if (w.endsWith('ies') && w.length > 3) {
    return w.slice(0, -3) + 'y'; // stories -> story
  }
  if (w.endsWith('ses') || w.endsWith('xes') || w.endsWith('zes') || w.endsWith('ches') || w.endsWith('shes')) {
    return w.slice(0, -2); // boxes -> box
  }
  if (w.endsWith('s') && !w.endsWith('ss')) {
    return w.slice(0, -1); // dogs -> dog
  }

  return w;
}

export function normalizeConceptName(name) {
  return normalizeConceptToken(name);
}

/**
 * Deterministic fact extraction for simple syllogistic patterns.
 * Supports minimal English/Romanian forms like:
 *  - "Socrates is a human."
 *  - "Humans are mortal."
 *  - "All men are mortal."
 */
export function extractFactsDeterministic(message) {
  const facts = [];
  const sentences = String(message)
    .split(/[.\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    // Pattern: "All X are Y" / "Every X is/are Y"
    let m = lower.match(/^(all|every)\s+([a-z_]+)\s+(?:are|is)\s+([a-z_]+)\s*$/);
    if (m) {
      const subject = normalizeConceptName(m[2]);
      const object = normalizeConceptName(m[3]);
      facts.push({ subject, relation: 'IS_A', object });
      continue;
    }

    // Pattern: "X are Y"
    m = lower.match(/^([a-z_]+)\s+are\s+([a-z_]+)\s*$/);
    if (m) {
      const subject = normalizeConceptName(m[1]);
      const object = normalizeConceptName(m[2]);
      facts.push({ subject, relation: 'IS_A', object });
      continue;
    }

    // Pattern: "X is a/an Y"
    m = lower.match(/^(.+?)\s+is\s+(?:a|an)\s+([a-z_]+)\s*$/);
    if (m) {
      const rawSubject = m[1].trim();
      const object = normalizeConceptName(m[2]);
      facts.push({ subject: rawSubject, relation: 'IS_A', object });
      continue;
    }

    // Pattern: "X is Y" (no article)
    m = lower.match(/^(.+?)\s+is\s+([a-z_]+)\s*$/);
    if (m) {
      const rawSubject = m[1].trim();
      const object = normalizeConceptName(m[2]);
      facts.push({ subject: rawSubject, relation: 'IS_A', object });
      continue;
    }

    // Romanian: "X este un/ o Y" / "X e un/ o Y"
    m = lower.match(/^(.+?)\s+(?:este|e)\s+(?:un|o)\s+([a-z_]+)\s*$/);
    if (m) {
      const rawSubject = m[1].trim();
      const object = normalizeConceptName(m[2]);
      facts.push({ subject: rawSubject, relation: 'IS_A', object });
      continue;
    }
  }

  return facts;
}

/**
 * Fallback parser for simple yes/no questions about type membership.
 */
export function fallbackParseYesNoQuestion(message) {
  const trimmed = String(message).trim().replace(/\?+$/, '');

  // English: "Is X a/an Y"
  let m = trimmed.match(/^Is\s+(.+?)\s+(?:a|an)\s+(.+)$/i);
  if (m) {
    const subject = m[1].trim();
    const object = normalizeConceptName(m[2]);
    return {
      type: 'yes_no',
      canonical: {
        subject,
        relation: 'IS_A',
        object
      }
    };
  }

  // English: "Is X Y"
  m = trimmed.match(/^Is\s+(.+?)\s+(.+)$/i);
  if (m) {
    const subject = m[1].trim();
    const object = normalizeConceptName(m[2]);
    return {
      type: 'yes_no',
      canonical: {
        subject,
        relation: 'IS_A',
        object
      }
    };
  }

  // Romanian: "Este X un/ o Y" / "E X un/ o Y"
  m = trimmed.match(/^(?:Este|E)\s+(.+?)\s+(?:un|o)\s+(.+)$/i);
  if (m) {
    const subject = m[1].trim();
    const object = normalizeConceptName(m[2]);
    return {
      type: 'yes_no',
      canonical: {
        subject,
        relation: 'IS_A',
        object
      }
    };
  }

  return null;
}

/**
 * Fallback parser for simple causal questions.
 * Example: "What does heat cause?"
 */
export function fallbackParseCausalQuestion(message) {
  const trimmed = String(message).trim().replace(/\?+$/, '');

  const m = trimmed.match(/^What\s+does\s+(.+?)\s+cause$/i);
  if (m) {
    const subject = normalizeConceptName(m[1]);
    return {
      type: 'causes',
      canonical: {
        subject
      }
    };
  }

  return null;
}

/**
 * Get all types (direct and inherited) for an entity using IS_A facts.
 */
export function getAllTypes(entity, facts) {
  const types = new Set();
  const queue = [entity.toLowerCase()];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const directTypes = facts
      .filter(f => f.relation === 'IS_A' && f.subject.toLowerCase() === current)
      .map(f => f.object.toLowerCase());

    for (const t of directTypes) {
      types.add(t);
      queue.push(t);
    }
  }

  return Array.from(types);
}

/**
 * Check for negative inference using DISJOINT_WITH.
 * E.g., "Is Sparky a mammal?" when Sparky IS_A bird and bird DISJOINT_WITH mammal.
 */
export function checkNegativeInference(subject, targetType, facts) {
  const subjectTypes = getAllTypes(subject, facts);

  for (const subjectType of subjectTypes) {
    const disjoint = facts.find(f =>
      f.relation === 'DISJOINT_WITH' &&
      ((f.subject.toLowerCase() === subjectType.toLowerCase() && f.object.toLowerCase() === targetType.toLowerCase()) ||
       (f.object.toLowerCase() === subjectType.toLowerCase() && f.subject.toLowerCase() === targetType.toLowerCase()))
    );

    if (disjoint) {
      return {
        truth: 'FALSE',
        method: 'disjoint_inference',
        confidence: 1.0,
        explanation: `${subject} is a ${subjectType}, and ${subjectType} is disjoint with ${targetType}`,
        proof: {
          steps: [
            { fact: `${subject} IS_A ${subjectType}`, justification: 'type_membership' },
            { fact: `${subjectType} DISJOINT_WITH ${targetType}`, justification: 'disjointness_constraint' },
            { conclusion: `Therefore ${subject} cannot be a ${targetType}` }
          ]
        }
      };
    }
  }

  return { truth: 'UNKNOWN', method: 'no_disjoint_found' };
}

/**
 * Check argument type inference.
 * E.g., "A EATS food?" with facts "A EATS b" and "b IS_A food" => TRUE.
 */
export function checkArgumentTypeInference(subject, relation, objectType, facts) {
  const subjectLower = subject.toLowerCase();
  const relationUpper = relation.toUpperCase();
  const objectTypeLower = objectType.toLowerCase();

  const relatedFacts = facts.filter(f =>
    f.subject.toLowerCase() === subjectLower &&
    f.relation.toUpperCase() === relationUpper
  );

  for (const fact of relatedFacts) {
    const relatedObject = fact.object;
    const objectTypes = getAllTypes(relatedObject, facts);

    if (relatedObject.toLowerCase() === objectTypeLower ||
        objectTypes.includes(objectTypeLower)) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'argument_type_inference',
        confidence: 0.95,
        explanation: `${subject} ${relation} ${relatedObject}, and ${relatedObject} IS_A ${objectType}`,
        proof: {
          steps: [
            { fact: `${subject} ${relation} ${relatedObject}`, justification: 'direct_fact' },
            { fact: `${relatedObject} IS_A ${objectType}`, justification: 'type_membership' },
            { conclusion: `Therefore ${subject} ${relation} something that is ${objectType}` }
          ]
        }
      };
    }
  }

  return { truth: 'UNKNOWN', method: 'no_argument_type_match' };
}


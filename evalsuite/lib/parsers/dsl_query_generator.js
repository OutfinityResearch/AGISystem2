/**
 * DSLQueryGenerator - Generate DSL queries from natural language patterns
 *
 * Pattern-based NL→DSL conversion without LLM.
 * Used for direct DSL mode testing.
 *
 * @module evalsuite/lib/parsers/dsl_query_generator
 */

/**
 * Generate DSL query from natural language question
 *
 * @param {Object} query - Query object with id and natural_language
 * @param {Array} expectedFacts - Array of expected DSL facts for context
 * @returns {string|null} Generated DSL query or null if cannot generate
 */
function generateDSLQuery(query, expectedFacts) {
  const nl = query.natural_language;
  if (!nl) return null;

  // Helper: find matching concept in expected facts
  const findConcept = (word) => {
    const wordLower = word.toLowerCase();
    for (const fact of (expectedFacts || [])) {
      const parts = fact.split(/\s+/);
      for (const part of parts) {
        if (part.toLowerCase() === wordLower ||
            part.toLowerCase().includes(wordLower) ||
            wordLower.includes(part.toLowerCase())) {
          return part;
        }
      }
    }
    // Default: capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  let match;

  // Pattern: "Is X a Y?" / "Is X an Y?"
  match = nl.match(/is\s+(?:a\s+)?(\w+)\s+(?:a|an)\s+(\w+)/i);
  if (match) {
    const [, subject, object] = match;
    return `@${query.id} ASK ${findConcept(subject)} IS_A ${findConcept(object)}`;
  }

  // Pattern: "Is X Y?" (simple predicate)
  match = nl.match(/^is\s+(\w+)\s+(\w+)\s*\?$/i);
  if (match) {
    const [, subject, predicate] = match;
    // Check if it's an IS_A query
    for (const fact of (expectedFacts || [])) {
      if (fact.toLowerCase().includes('is_a') &&
          fact.toLowerCase().includes(subject.toLowerCase())) {
        const parts = fact.split(/\s+/);
        return `@${query.id} ASK ${parts[0]} IS_A ${parts[parts.length - 1]}`;
      }
    }
    return `@${query.id} ASK ${findConcept(subject)} HAS_PROPERTY ${findConcept(predicate)}`;
  }

  // Pattern: "Can X Y?" or "Does X Y?"
  match = nl.match(/(?:can|does)\s+(?:a\s+)?(\w+)\s+(\w+)/i);
  if (match) {
    const [, subject, verb] = match;
    return `@${query.id} ASK ${findConcept(subject)} CAN ${findConcept(verb)}`;
  }

  // Pattern: "What type/kind of X is Y?"
  match = nl.match(/what\s+(?:type|kind)\s+of\s+(\w+)\s+is\s+(?:a\s+)?(\w+)/i);
  if (match) {
    const [, parentType, subject] = match;
    return `@${query.id} ASK ${findConcept(subject)} IS_A ${findConcept(parentType)}`;
  }

  // Pattern: "Does X have Y?" / "Does X have a Y?"
  match = nl.match(/does\s+(?:a\s+)?(\w+)\s+have\s+(?:a\s+)?(\w+)/i);
  if (match) {
    const [, subject, object] = match;
    return `@${query.id} ASK ${findConcept(subject)} HAS ${findConcept(object)}`;
  }

  // Pattern: "Is X part of Y?"
  match = nl.match(/is\s+(\w+)\s+(?:a\s+)?part\s+of\s+(\w+)/i);
  if (match) {
    const [, subject, object] = match;
    return `@${query.id} ASK ${findConcept(subject)} PART_OF ${findConcept(object)}`;
  }

  // Pattern: "What causes X?" or "What might cause X?"
  match = nl.match(/what\s+(?:might\s+)?causes?\s+(.+?)(?:\?|$)/i);
  if (match) {
    const objectPhrase = match[1].trim();
    const objectClean = objectPhrase.toLowerCase().replace(/\s+/g, '_');

    // Look for symptoms/causes in expected facts
    const symptoms = [];
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes('indicates') || factLower.includes('causes')) {
        const parts = fact.split(/\s+/);
        symptoms.push(parts[0]);
      }
    }

    if (symptoms.length > 0) {
      return `@${query.id} ABDUCT ${symptoms[0]}`;
    }

    return `@${query.id} ABDUCT ${findConcept(objectPhrase.split(/\s+/)[0])}`;
  }

  // Pattern: "Does X qualify for Y?" or "Does X meet Y?"
  match = nl.match(/does\s+(\w+)\s+(?:qualify|meet)\s+(?:for\s+)?(?:the\s+)?(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectWord, requirementPhrase] = match;
    const subject = findConcept(subjectWord);

    // Find what the role REQUIRES
    let requiredCert = null;
    for (const fact of (expectedFacts || [])) {
      if (fact.toLowerCase().includes('requires')) {
        const factParts = fact.split(/\s+/);
        requiredCert = factParts[factParts.length - 1];
        break;
      }
    }

    if (requiredCert) {
      return `@${query.id} ASK ${subject} HAS ${requiredCert}`;
    }
    return null;
  }

  // Pattern: "Is X needed/required before Y?"
  match = nl.match(/is\s+(\w+)\s+(?:needed|required)\s+before\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    return `@${query.id} ASK ${findConcept(subjectWord)} BEFORE ${findConcept(objectWord)}`;
  }

  // Pattern: "Does X come before or after Y?"
  match = nl.match(/does\s+(\w+)\s+come\s+(?:before\s+or\s+after|after\s+or\s+before)\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subjectLower = subjectWord.toLowerCase();
    const objectLower = objectWord.toLowerCase();

    // Check expected facts for BEFORE or AFTER
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      const factParts = fact.split(/\s+/);

      if (factLower.includes(subjectLower) && factLower.includes(objectLower)) {
        if (factLower.includes(' before ')) {
          return `@${query.id} ASK ${factParts[0]} BEFORE ${factParts[factParts.length - 1]}`;
        }
        if (factLower.includes(' after ')) {
          return `@${query.id} ASK ${factParts[0]} AFTER ${factParts[factParts.length - 1]}`;
        }
      }
    }
    return `@${query.id} ASK ${findConcept(subjectWord)} BEFORE ${findConcept(objectWord)}`;
  }

  // Pattern: "Does X come before Y?" or "Does X come after Y?"
  match = nl.match(/does\s+(\w+)\s+come\s+(before|after)\s+(\w+)/i);
  if (match) {
    const [, subjectWord, direction, objectWord] = match;
    const relation = direction.toLowerCase() === 'before' ? 'BEFORE' : 'AFTER';
    return `@${query.id} ASK ${findConcept(subjectWord)} ${relation} ${findConcept(objectWord)}`;
  }

  // Pattern: "Are X and Y at the same Z?"
  match = nl.match(/are\s+(\w+)\s+and\s+(\w+)\s+(?:at\s+)?(?:the\s+)?same\s+(\w+)/i);
  if (match) {
    const [, subject1, subject2, attribute] = match;
    const s1Lower = subject1.toLowerCase();

    // Find type for subject1
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.startsWith(s1Lower) && factLower.includes('is_a')) {
        const factParts = fact.split(/\s+/);
        return `@${query.id} ASK ${factParts[0]} IS_A ${factParts[factParts.length - 1]}`;
      }
    }
    return null;
  }

  // Pattern: "Is it factual that X?"
  match = nl.match(/is\s+it\s+(?:factual|true)\s+that\s+(.+?)(?:\?|$)/i);
  if (match) {
    const statementPhrase = match[1].toLowerCase()
      .replace(/^the\s+/, '')
      .replace(/\s+the\s+/, ' ');

    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      const factParts = fact.split(/\s+/);
      const statementWords = statementPhrase.split(/\s+/);
      let matchCount = 0;

      for (const word of statementWords) {
        if (factLower.includes(word)) {
          matchCount++;
        }
      }

      if (matchCount >= statementWords.length * 0.5 && factParts.length >= 3) {
        return `@${query.id} ASK ${factParts[0]} ${factParts[1]} ${factParts[factParts.length - 1]}`;
      }
    }
    return null;
  }

  // Pattern: "Should X affect Y?"
  match = nl.match(/should\s+(\w+)\s+affect\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectWord] = match;
    for (const fact of (expectedFacts || [])) {
      if (fact.toLowerCase().includes(subjectWord.toLowerCase()) &&
          fact.toLowerCase().includes('mask')) {
        return `@${query.id} ASK ${findConcept(subjectWord)} MASKED_FOR decision`;
      }
    }
    return null;
  }

  // Pattern: "Who should be selected..." - Complex, skip
  match = nl.match(/who\s+should\s+be\s+selected/i);
  if (match) {
    return null;
  }

  // Pattern: "If X, would Y?" - Counterfactual, skip
  match = nl.match(/if\s+(.+?),\s+(?:would|could)\s+(.+?)(?:\?|$)/i);
  if (match) {
    return null;
  }

  // Could not match - return null
  return null;
}

module.exports = {
  generateDSLQuery
};

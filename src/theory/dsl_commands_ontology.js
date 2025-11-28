/**
 * DS(/theory/dsl_commands_ontology.js) - Ontology Discovery DSL Commands
 *
 * Implements Sys2DSL commands for ontology introspection and gap analysis:
 * - EXPLAIN_CONCEPT: Explain what the system knows about a concept/word
 * - MISSING: Find undefined concepts in a script/statement
 *
 * These commands help the LLM understand what the system knows and what
 * needs to be defined, enabling better ontology auto-discovery.
 *
 * @module theory/dsl_commands_ontology
 */

class DSLCommandsOntology {
  /**
   * Create ontology commands handler
   * @param {Object} deps - Dependencies
   * @param {Object} deps.conceptStore - Concept store for looking up facts
   * @param {Object} deps.parser - DSL parser for variable resolution
   * @param {Object} [deps.dimRegistry] - Dimension registry for semantic info
   */
  constructor({ conceptStore, parser, dimRegistry }) {
    this.conceptStore = conceptStore;
    this.parser = parser;
    this.dimRegistry = dimRegistry;
  }

  /**
   * EXPLAIN_CONCEPT: Explain what the system knows about a concept
   *
   * Syntax: @var EXPLAIN_CONCEPT <concept>
   *
   * Returns detailed information about a concept including:
   * - Whether it exists in the knowledge base
   * - All facts where it appears as subject or object
   * - Its type hierarchy (IS_A relations)
   * - Properties (HAS_PROPERTY, HAS relations)
   * - Related concepts (PART_OF, CAUSES, etc.)
   *
   * @param {string[]} argTokens - Command arguments
   * @param {Object} env - Variable environment
   * @returns {Object} Explanation of the concept
   */
  cmdExplainConcept(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('EXPLAIN_CONCEPT expects a concept name');
    }

    const conceptRaw = this.parser.expandString(argTokens.join(' '), env);
    const concept = this._normalizeName(conceptRaw);
    const facts = this._getFacts();

    const result = {
      concept: conceptRaw,
      normalized: concept,
      exists: false,
      isUpperCase: /^[A-Z]/.test(conceptRaw),
      asSubject: [],
      asObject: [],
      types: [],
      properties: [],
      relations: [],
      summary: ''
    };

    // Find all facts involving this concept
    for (const fact of facts) {
      const subjNorm = this._normalizeName(fact.subject);
      const objNorm = this._normalizeName(fact.object);

      if (subjNorm === concept) {
        result.exists = true;
        result.asSubject.push(fact);

        if (fact.relation === 'IS_A') {
          result.types.push(fact.object);
        } else if (fact.relation === 'HAS_PROPERTY' || fact.relation === 'HAS') {
          result.properties.push({ property: fact.object, relation: fact.relation });
        } else {
          result.relations.push({ relation: fact.relation, target: fact.object });
        }
      }

      if (objNorm === concept) {
        result.exists = true;
        result.asObject.push(fact);
      }
    }

    // Generate summary
    result.summary = this._generateSummary(result);

    return result;
  }

  /**
   * MISSING: Find undefined concepts in a script or statement
   *
   * Syntax: @var MISSING "<statement or statements>"
   *
   * Analyzes the given text for concept references and returns
   * a list of concepts that are not defined in the knowledge base.
   *
   * This helps identify what needs to be added before executing queries.
   *
   * @param {string[]} argTokens - Command arguments
   * @param {Object} env - Variable environment
   * @returns {Object} List of missing concepts
   */
  cmdMissing(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('MISSING expects a statement or script');
    }

    const input = this.parser.expandString(argTokens.join(' '), env);
    const facts = this._getFacts();

    // Extract all potential concept names from input
    const potentialConcepts = this._extractConcepts(input);

    // Get all known concepts from facts
    const knownConcepts = new Set();
    for (const fact of facts) {
      knownConcepts.add(this._normalizeName(fact.subject));
      knownConcepts.add(this._normalizeName(fact.object));
    }

    // Also add known relations
    const knownRelations = new Set([
      'IS_A', 'HAS', 'HAS_PROPERTY', 'HAS_PART', 'PART_OF',
      'CAUSES', 'CAUSED_BY', 'LOCATED_IN', 'CONTAINS',
      'BEFORE', 'AFTER', 'PERMITS', 'PROHIBITS', 'OBLIGATES',
      'REQUIRES', 'EQUIVALENT_TO', 'DISJOINT_WITH'
    ]);

    // Find missing concepts
    const missing = [];
    const defined = [];

    for (const concept of potentialConcepts) {
      const normalized = this._normalizeName(concept.name);

      // Skip if it's a known relation
      if (knownRelations.has(concept.name.toUpperCase())) {
        continue;
      }

      if (knownConcepts.has(normalized)) {
        defined.push({
          name: concept.name,
          context: concept.context,
          factCount: this._countFacts(normalized, facts)
        });
      } else {
        missing.push({
          name: concept.name,
          context: concept.context,
          suggestedType: this._suggestType(concept.name),
          suggestedQuestions: this._suggestQuestions(concept.name)
        });
      }
    }

    return {
      input: input.substring(0, 200) + (input.length > 200 ? '...' : ''),
      totalConcepts: potentialConcepts.length,
      missingCount: missing.length,
      definedCount: defined.length,
      missing,
      defined,
      suggestions: this._generateMissingSuggestions(missing)
    };
  }

  /**
   * WHAT_IS: Simple query about concept identity
   *
   * Syntax: @var WHAT_IS <concept>
   *
   * Returns a simple description of what the concept is.
   *
   * @param {string[]} argTokens - Command arguments
   * @param {Object} env - Variable environment
   * @returns {Object} Simple concept description
   */
  cmdWhatIs(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('WHAT_IS expects a concept name');
    }

    const conceptRaw = this.parser.expandString(argTokens.join(' '), env);
    const concept = this._normalizeName(conceptRaw);
    const facts = this._getFacts();

    // Find IS_A facts for this concept
    const types = [];
    const properties = [];

    for (const fact of facts) {
      const subjNorm = this._normalizeName(fact.subject);
      if (subjNorm === concept) {
        if (fact.relation === 'IS_A') {
          types.push(fact.object);
        } else if (fact.relation === 'HAS_PROPERTY' || fact.relation === 'HAS') {
          properties.push(fact.object);
        }
      }
    }

    if (types.length === 0 && properties.length === 0) {
      return {
        concept: conceptRaw,
        known: false,
        description: `I don't have information about "${conceptRaw}" in my knowledge base.`
      };
    }

    let description = `"${conceptRaw}"`;
    if (types.length > 0) {
      description += ` is a ${types.join(', ')}`;
    }
    if (properties.length > 0) {
      description += types.length > 0 ? ' with ' : ' has ';
      description += properties.join(', ');
    }
    description += '.';

    return {
      concept: conceptRaw,
      known: true,
      types,
      properties,
      description
    };
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  _getFacts() {
    if (this.conceptStore && typeof this.conceptStore.getFacts === 'function') {
      return this.conceptStore.getFacts();
    }
    return [];
  }

  _normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  _extractConcepts(input) {
    const concepts = [];

    // Match capitalized words (likely concept names)
    const capitalizedPattern = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
    let match;
    while ((match = capitalizedPattern.exec(input)) !== null) {
      concepts.push({
        name: match[1],
        context: this._getContext(input, match.index),
        type: 'capitalized'
      });
    }

    // Match words in triple patterns (subject RELATION object)
    const triplePattern = /(\w+)\s+(IS_A|HAS|CAUSES|PART_OF|LOCATED_IN|PERMITS|PROHIBITS|REQUIRES|BEFORE|AFTER)\s+(\w+)/gi;
    while ((match = triplePattern.exec(input)) !== null) {
      // Subject
      if (!concepts.find(c => c.name === match[1])) {
        concepts.push({
          name: match[1],
          context: this._getContext(input, match.index),
          type: 'triple_subject'
        });
      }
      // Object
      if (!concepts.find(c => c.name === match[3])) {
        concepts.push({
          name: match[3],
          context: this._getContext(input, match.index + match[1].length + match[2].length + 2),
          type: 'triple_object'
        });
      }
    }

    return concepts;
  }

  _getContext(text, index) {
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + 30);
    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    return context;
  }

  _countFacts(conceptNorm, facts) {
    let count = 0;
    for (const fact of facts) {
      if (this._normalizeName(fact.subject) === conceptNorm ||
          this._normalizeName(fact.object) === conceptNorm) {
        count++;
      }
    }
    return count;
  }

  _suggestType(conceptName) {
    // Simple heuristics for suggesting what type a concept might be
    const lower = conceptName.toLowerCase();

    if (lower.endsWith('er') || lower.endsWith('or')) {
      return 'Agent or Role (person/entity that performs action)';
    }
    if (lower.endsWith('tion') || lower.endsWith('ment') || lower.endsWith('ing')) {
      return 'Process or Action';
    }
    if (lower.endsWith('ity') || lower.endsWith('ness')) {
      return 'Property or Quality';
    }
    if (lower.endsWith('ism') || lower.endsWith('logy')) {
      return 'Concept or Field';
    }
    if (/^[A-Z][a-z]+$/.test(conceptName)) {
      return 'Entity or Instance';
    }
    if (/^[A-Z]+$/.test(conceptName)) {
      return 'Category or Type';
    }

    return 'Unknown - please describe';
  }

  _suggestQuestions(conceptName) {
    return [
      `What is ${conceptName}? (IS_A relationship)`,
      `What properties does ${conceptName} have?`,
      `What does ${conceptName} relate to? (causes, contains, etc.)`,
      `Are there any constraints or rules about ${conceptName}?`
    ];
  }

  _generateSummary(result) {
    if (!result.exists) {
      return `Concept "${result.concept}" is not known to the system. ` +
             `Please add facts about it using 'add ${result.concept} IS_A <type>'.`;
    }

    const parts = [];

    if (result.types.length > 0) {
      parts.push(`is a ${result.types.join(' and ')}`);
    }

    if (result.properties.length > 0) {
      const props = result.properties.map(p => p.property).join(', ');
      parts.push(`has properties: ${props}`);
    }

    if (result.relations.length > 0) {
      const rels = result.relations.map(r => `${r.relation} ${r.target}`).join(', ');
      parts.push(`relations: ${rels}`);
    }

    const factCount = result.asSubject.length + result.asObject.length;
    parts.push(`appears in ${factCount} fact(s)`);

    return `"${result.concept}" ${parts.join('; ')}.`;
  }

  _generateMissingSuggestions(missing) {
    if (missing.length === 0) {
      return 'All concepts are defined in the knowledge base.';
    }

    const suggestions = [];
    suggestions.push(`Found ${missing.length} undefined concept(s). To use these, please define them:`);

    for (const m of missing.slice(0, 5)) {
      suggestions.push(`  - ${m.name}: ${m.suggestedType}`);
    }

    if (missing.length > 5) {
      suggestions.push(`  ... and ${missing.length - 5} more.`);
    }

    suggestions.push('');
    suggestions.push('Suggested approach:');
    suggestions.push('1. For each missing concept, describe what it IS_A');
    suggestions.push('2. Add relevant properties and relationships');
    suggestions.push('3. Re-run the query after adding definitions');

    return suggestions.join('\n');
  }
}

module.exports = DSLCommandsOntology;

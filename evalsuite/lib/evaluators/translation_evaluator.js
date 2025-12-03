/**
 * TranslationEvaluator - Base class for NL→DSL translation evaluation
 *
 * Compares generated DSL against expected DSL using multiple
 * comparison strategies.
 *
 * @module evalsuite/lib/evaluators/translation_evaluator
 */

/**
 * Base TranslationEvaluator class
 * Provides DSL comparison utilities
 */
class TranslationEvaluator {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Compare generated DSL with expected DSL
   *
   * @param {string} generated - Generated DSL
   * @param {string} expected - Expected DSL
   * @returns {Object} Comparison result with matchType, similarity, details
   */
  compareDsl(generated, expected) {
    if (!generated || !expected) {
      return {
        matchType: 'none',
        similarity: 0,
        details: 'Missing generated or expected DSL'
      };
    }

    const genNorm = this._normalizeDsl(generated);
    const expNorm = this._normalizeDsl(expected);

    // Check exact match
    if (genNorm === expNorm) {
      return {
        matchType: 'exact',
        similarity: 100,
        details: 'Exact match after normalization'
      };
    }

    // Check semantic match (same commands, different variable names)
    const semanticResult = this._checkSemanticMatch(generated, expected);
    if (semanticResult.match) {
      return {
        matchType: 'semantic',
        similarity: semanticResult.similarity,
        details: semanticResult.details
      };
    }

    // Check partial match
    const partialResult = this._checkPartialMatch(generated, expected);
    if (partialResult.similarity >= 50) {
      return {
        matchType: 'partial',
        similarity: partialResult.similarity,
        details: partialResult.details
      };
    }

    return {
      matchType: 'none',
      similarity: partialResult.similarity,
      details: 'No significant match found'
    };
  }

  /**
   * Normalize DSL for comparison
   * @private
   */
  _normalizeDsl(dsl) {
    return dsl
      .toLowerCase()
      .replace(/@\w+\s*/g, '')           // Remove variable names
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .replace(/['"]/g, '')               // Remove quotes
      .trim();
  }

  /**
   * Check for semantic equivalence
   * @private
   */
  _checkSemanticMatch(generated, expected) {
    // Extract commands and arguments
    const genParts = this._extractParts(generated);
    const expParts = this._extractParts(expected);

    // Same command?
    if (genParts.command !== expParts.command) {
      return { match: false, similarity: 0, details: 'Different commands' };
    }

    // Same relation?
    if (genParts.relation !== expParts.relation) {
      return { match: false, similarity: 30, details: 'Same command, different relation' };
    }

    // Check subject/object similarity
    const subjectMatch = this._conceptsMatch(genParts.subject, expParts.subject);
    const objectMatch = this._conceptsMatch(genParts.object, expParts.object);

    if (subjectMatch && objectMatch) {
      return {
        match: true,
        similarity: 95,
        details: 'Semantic match: same command, relation, and concepts'
      };
    }

    if (subjectMatch || objectMatch) {
      return {
        match: false,
        similarity: 70,
        details: 'Partial semantic match: some concepts differ'
      };
    }

    return { match: false, similarity: 50, details: 'Command matches but concepts differ' };
  }

  /**
   * Extract parts from DSL statement
   * @private
   */
  _extractParts(dsl) {
    const parts = {
      command: null,
      subject: null,
      relation: null,
      object: null
    };

    // Match pattern: @var COMMAND subject RELATION object
    const match = dsl.match(/@\w+\s+(\w+)\s+(\w+)\s+(\w+)\s+(.+)/i);
    if (match) {
      parts.command = match[1].toUpperCase();
      parts.subject = match[2].toLowerCase();
      parts.relation = match[3].toUpperCase();
      parts.object = match[4].toLowerCase().trim();
    }

    return parts;
  }

  /**
   * Check if two concepts match (fuzzy)
   * @private
   */
  _conceptsMatch(a, b) {
    if (!a || !b) return false;
    const aNorm = a.toLowerCase().replace(/_/g, '');
    const bNorm = b.toLowerCase().replace(/_/g, '');
    return aNorm === bNorm ||
           aNorm.includes(bNorm) ||
           bNorm.includes(aNorm);
  }

  /**
   * Check partial match using token overlap
   * @private
   */
  _checkPartialMatch(generated, expected) {
    const genTokens = new Set(this._normalizeDsl(generated).split(/\s+/));
    const expTokens = new Set(this._normalizeDsl(expected).split(/\s+/));

    let overlap = 0;
    for (const token of genTokens) {
      if (expTokens.has(token)) {
        overlap++;
      }
    }

    const maxTokens = Math.max(genTokens.size, expTokens.size);
    const similarity = maxTokens > 0 ? Math.round((overlap / maxTokens) * 100) : 0;

    return {
      similarity,
      details: `Token overlap: ${overlap}/${maxTokens}`
    };
  }

  /**
   * Extract generated DSL from LLM response
   * Override in subclasses for specific extraction logic
   *
   * @param {string} response - LLM response text
   * @returns {string|null} Extracted DSL or null
   */
  extractGeneratedDsl(response) {
    // Look for DSL patterns in response
    const patterns = [
      /@\w+\s+(?:ASK|ABDUCT|FACTS_MATCHING)\s+.+/i,
      /```(?:sys2dsl)?\s*\n?([@#].+?)```/s,
      /DSL:\s*(.+)/i
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim();
      }
    }

    return null;
  }
}

module.exports = TranslationEvaluator;

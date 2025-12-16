/**
 * AGISystem2 - English Tokenizer
 * @module nlp/tokenizer
 *
 * Tokenizes English sentences for pattern matching.
 */

/**
 * @typedef {Object} Token
 * @property {string} text - Original text
 * @property {string} lower - Lowercase text
 * @property {number} position - Position in sentence
 * @property {string} type - Token type classification
 */

/**
 * English sentence tokenizer with basic word classification
 */
export class EnglishTokenizer {
  constructor() {
    this.articles = new Set(['a', 'an', 'the']);
    this.prepositions = new Set(['to', 'from', 'in', 'on', 'at', 'by', 'for', 'with', 'of', 'about']);
    this.linkingVerbs = new Set(['is', 'are', 'was', 'were', 'be', 'been', 'being', 'am']);
    this.negations = new Set(['not', 'never', 'no', "don't", "doesn't", "didn't", "won't", "can't"]);
    this.conditionals = new Set(['if', 'when', 'whenever', 'unless']);
    this.quantifiers = new Set(['all', 'every', 'each', 'any', 'some', 'no', 'none']);
    this.conjunctions = new Set(['and', 'or', 'but', 'then', 'that']);
  }

  /**
   * Tokenize a sentence into words and metadata
   * @param {string} sentence - English sentence
   * @returns {Token[]} Array of tokens
   */
  tokenize(sentence) {
    const normalized = this.normalize(sentence);
    if (!normalized) return [];

    const words = normalized.split(/\s+/);

    return words.map((word, index) => ({
      text: word,
      lower: word.toLowerCase(),
      position: index,
      type: this.classifyWord(word)
    }));
  }

  /**
   * Normalize sentence for processing
   * @param {string} sentence
   * @returns {string}
   */
  normalize(sentence) {
    if (!sentence || typeof sentence !== 'string') return '';

    return sentence
      .replace(/[.,!?;:]+$/g, '')      // Remove trailing punctuation
      .replace(/['""`´]/g, '')          // Remove quotes
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();
  }

  /**
   * Classify word type (heuristic)
   * @param {string} word
   * @returns {string} Token type
   */
  classifyWord(word) {
    const lower = word.toLowerCase();

    // Articles
    if (this.articles.has(lower)) {
      return 'article';
    }

    // Common prepositions
    if (this.prepositions.has(lower)) {
      return 'preposition';
    }

    // Linking verbs
    if (this.linkingVerbs.has(lower)) {
      return 'linking-verb';
    }

    // Negation
    if (this.negations.has(lower)) {
      return 'negation';
    }

    // Conditionals
    if (this.conditionals.has(lower)) {
      return 'conditional';
    }

    // Quantifiers
    if (this.quantifiers.has(lower)) {
      return 'quantifier';
    }

    // Conjunctions
    if (this.conjunctions.has(lower)) {
      return 'conjunction';
    }

    // Capitalized words are likely proper nouns
    if (/^[A-Z][a-z]+$/.test(word)) {
      return 'proper-noun';
    }

    // Words ending in common verb suffixes
    if (/(?:ed|ing|es)$/.test(lower) && lower.length > 3) {
      return 'verb-candidate';
    }

    // Simple third person singular
    if (/[^s]s$/.test(lower) && lower.length > 2) {
      return 'verb-candidate';
    }

    return 'other';
  }

  /**
   * Check if token is content word (not article/preposition)
   * @param {Token} token
   * @returns {boolean}
   */
  isContentWord(token) {
    return !['article', 'preposition'].includes(token.type);
  }

  /**
   * Get content tokens only
   * @param {Token[]} tokens
   * @returns {Token[]}
   */
  getContentTokens(tokens) {
    return tokens.filter(t => this.isContentWord(t));
  }
}

export default EnglishTokenizer;

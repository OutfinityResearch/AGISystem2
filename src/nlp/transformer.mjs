/**
 * AGISystem2 - NL Transformer
 * @module nlp/transformer
 *
 * Transform natural language to DSL.
 */

import { EnglishTokenizer } from './tokenizer.mjs';
import { patterns, patternPriority } from './patterns.mjs';
import { normalizeText, expandContractions, capitalizeWord, normalizeVerb } from './normalizer.mjs';

/**
 * @typedef {Object} TransformResult
 * @property {boolean} success - Whether all sentences parsed successfully
 * @property {string} dsl - Generated DSL code
 * @property {ParsedStatement[]} parsed - Parsed statement objects
 * @property {Array<{sentence: string, error: string}>} errors - Parse errors
 */

/**
 * @typedef {Object} ParsedStatement
 * @property {string} type - Statement type (isA, binary, ternary, etc.)
 * @property {string} source - Original sentence
 * @property {string} pattern - Pattern that matched
 */

/**
 * Transform natural language to DSL
 */
export class NLTransformer {
  /**
   * Create transformer
   * @param {Object} options
   * @param {Object} options.customPatterns - Additional patterns
   * @param {boolean} options.strict - Throw on parse failure
   */
  constructor(options = {}) {
    this.tokenizer = new EnglishTokenizer();
    this.patterns = { ...patterns };
    this.patternPriority = [...patternPriority];

    // Optional: enable DSL-preserving parsing for suite-generated "supported NL".
    // When off (default), skip DSL-specific exact operator patterns to keep normal English behavior stable.
    this.dslPreserveOperators = options.dslPreserveOperators ?? false;
    if (!this.dslPreserveOperators) {
      for (const key of ['exactPrefixNary', 'exactNary', 'exactSvo', 'exactUnary']) {
        delete this.patterns[key];
      }
      this.patternPriority = this.patternPriority.filter(p => !['exactPrefixNary', 'exactNary', 'exactSvo', 'exactUnary'].includes(p));
    }

    // Merge custom patterns
    if (options.customPatterns) {
      for (const [type, patternList] of Object.entries(options.customPatterns)) {
        if (this.patterns[type]) {
          this.patterns[type] = [...patternList, ...this.patterns[type]];
        } else {
          this.patterns[type] = patternList;
          // Add new pattern type at beginning of priority (highest priority)
          this.patternPriority.unshift(type);
        }
      }
    }

    this.strict = options.strict ?? false;
    this.nameCounter = 0;
  }

  /**
   * Transform English text to DSL
   * @param {string} text - English text (one or more sentences)
   * @returns {TransformResult}
   */
  transform(text) {
    this.nameCounter = 0;
    const sentences = this.splitSentences(text);
    const results = [];
    const errors = [];

    for (const sentence of sentences) {
      try {
        const result = this.transformSentence(sentence);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        errors.push({
          sentence,
          error: err.message
        });
      }
    }

    return {
      success: errors.length === 0,
      dsl: this.toDSL(results),
      parsed: results,
      errors
    };
  }

  /**
   * Transform single sentence
   * @param {string} sentence
   * @returns {ParsedStatement|null}
   */
  transformSentence(sentence) {
    // Preprocess
    let normalized = normalizeText(sentence);
    normalized = expandContractions(normalized);
    normalized = this.tokenizer.normalize(normalized);

    // Strip redundant outer parentheses to make DSL-like clauses parseable:
    // "(?x is a bird)" -> "?x is a bird"
    // "((A))" -> "A"
    while (normalized.startsWith('(') && normalized.endsWith(')')) {
      const inner = normalized.slice(1, -1).trim();
      if (!inner) break;
      normalized = inner;
    }

    // Parentheses are common in DSL-derived English; remove them to stabilize matching.
    // Keep parentheses for `implies (...) AND (...) ...` macro parsing, where they disambiguate clause boundaries.
    const keepParens = /^\s*implies\b/i.test(normalized);
    if (!keepParens && /[()]/.test(normalized)) {
      normalized = normalized.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    if (!normalized || normalized.length < 3) return null;

    const tokens = this.tokenizer.tokenize(normalized);

    // Try patterns in priority order
    for (const patternType of this.patternPriority) {
      const patternList = this.patterns[patternType];
      if (!patternList) continue;

      for (const pattern of patternList) {
        const match = normalized.match(pattern.regex);
        if (match) {
          // Validate if validator exists
          if (pattern.validate && !pattern.validate(match, tokens)) {
            continue;
          }

          const extracted = pattern.extract(match, this);
          if (extracted) {
            // Handle nested raw clauses
            if (extracted.type === 'negation-clause') {
              const inner = this.transformSentence(extracted.clauseRaw);
              if (inner) {
                return {
                  type: 'negation',
                  negated: inner,
                  source: sentence,
                  pattern: patternType
                };
              }
            }

            if (extracted.type === 'rule' && extracted.ruleType === 'conditional-raw') {
              const ant = this.transformSentence(extracted.antecedentRaw);
              const cons = this.transformSentence(extracted.consequentRaw);
              if (ant && cons) {
                return {
                  type: 'rule',
                  ruleType: 'conditional',
                  antecedent: ant,
                  consequent: cons,
                  source: sentence,
                  pattern: patternType
                };
              }
            }

            if (extracted.type === 'implies-macro') {
              const antecedentRaws = Array.isArray(extracted.antecedentRaws) ? extracted.antecedentRaws : [];
              const antecedents = antecedentRaws
                .map(raw => this.transformSentence(raw))
                .filter(Boolean);
              const cons = this.transformSentence(extracted.consequentRaw);

              if (antecedents.length > 0 && cons) {
                let ant = antecedents[0];
                for (let j = 1; j < antecedents.length; j++) {
                  ant = { type: 'compound', operator: 'And', parts: [ant, antecedents[j]] };
                }
                return {
                  type: 'implies',
                  antecedent: ant,
                  consequent: cons,
                  source: sentence,
                  pattern: patternType
                };
              }
            }

            if (extracted.type === 'exists-raw') {
              const body = this.transformSentence(extracted.bodyRaw);
              if (body) {
                return {
                  type: 'exists',
                  variable: extracted.variable,
                  body,
                  source: sentence,
                  pattern: patternType
                };
              }
            }

            if (extracted.type === 'compound-raw') {
              const left = this.transformSentence(extracted.leftRaw);
              const right = this.transformSentence(extracted.rightRaw);
              if (left && right) {
                return {
                  type: 'compound',
                  operator: extracted.operator,
                  parts: [left, right],
                  source: sentence,
                  pattern: patternType
                };
              }
            }

            return {
              ...extracted,
              source: sentence,
              pattern: patternType
            };
          }
        }
      }
    }

    // No pattern matched
    if (this.strict) {
      throw new Error(`No pattern matched: "${sentence}"`);
    }

    // Fallback: try to extract SVO heuristically
    return this.fallbackSVO(tokens, sentence);
  }

  /**
   * Fallback SVO extraction using token classification
   * @param {Token[]} tokens
   * @param {string} source
   * @returns {ParsedStatement|null}
   */
  fallbackSVO(tokens, source) {
    // Filter out articles
    const content = this.tokenizer.getContentTokens(tokens);

    if (content.length < 2) return null;

    // Find verb candidate
    const verbIndex = content.findIndex(t =>
      t.type === 'verb-candidate' || t.type === 'linking-verb'
    );

    if (verbIndex <= 0 || verbIndex >= content.length - 1) {
      // No clear verb in middle position
      return {
        type: 'unknown',
        tokens: content.map(t => t.text),
        source,
        pattern: 'fallback'
      };
    }

    const subjectTokens = content.slice(0, verbIndex);
    const verb = content[verbIndex];
    const objectTokens = content.slice(verbIndex + 1);

    const subject = subjectTokens.map(t => t.text).join(' ');
    const object = objectTokens.map(t => t.text).join(' ');

    if (!subject || !object) return null;

    return {
      type: 'binary',
      operator: normalizeVerb(verb.text),
      subject: capitalizeWord(subject),
      object: capitalizeWord(object),
      source,
      pattern: 'fallback-svo'
    };
  }

  /**
   * Convert parsed results to DSL string
   * @param {ParsedStatement[]} results
   * @returns {string}
   */
  toDSL(results) {
    const lines = [];

    for (const result of results) {
      const name = this.nextName();
      const dsl = this.statementToDSL(result, name);
      if (dsl) {
        lines.push(dsl);
      }
    }

    return lines.join('\n');
  }

  /**
   * Convert single parsed statement to DSL
   * @param {ParsedStatement} parsed
   * @param {string} name
   * @returns {string|null}
   */
  statementToDSL(parsed, name) {
    // Simple facts go directly to KB (no @ prefix)
    // @ prefix is only for intermediate expressions that need references
    switch (parsed.type) {
      case 'isA':
        return `isA ${parsed.subject} ${parsed.object}`;

      case 'binary':
        return `${parsed.operator} ${parsed.subject} ${parsed.object}`;

      case 'ternary':
        // DSL-preserving macros: some meta-operators take a relation as a single compound argument.
        // When NL is rendered as a flat token stream (e.g. "deduce X ?a causes ?b ..."),
        // rebuild the compound form to match canonical DSL.
        if (Array.isArray(parsed.args)) {
          const args = parsed.args.map(String);
          const op = String(parsed.operator || '');

          const looksLikeAtom = (s) => /^[$@?]?\w+$/.test(s) || /^[0-9]+$/.test(s);
          const looksLikeRelOp = (s) => /^[A-Za-z][A-Za-z0-9_]*$/.test(s) && !/^(?:is|are|was|were|a|an|the)$/i.test(s);

          // explain (Relation S O) ?why
          // from tokens: explain S relOp O ?why
          if (op.toLowerCase() === 'explain' && args.length >= 4) {
            const [s, rel, o, ...rest] = args;
            if (looksLikeAtom(s) && looksLikeRelOp(rel) && looksLikeAtom(o)) {
              return `${op} (${rel} ${s} ${o}) ${rest.join(' ')}`.trim();
            }
          }

          // deduce Topic (relOp ?X ?Y) ?result depth breadth
          // from tokens: deduce Topic ?X relOp ?Y ?result depth breadth
          if (op.toLowerCase() === 'deduce' && args.length >= 6) {
            // Shape A: deduce Topic A relOp B ...
            const [topic, a, rel, b, ...rest] = args;
            if (looksLikeAtom(topic) && looksLikeAtom(a) && looksLikeRelOp(rel) && looksLikeAtom(b)) {
              return `${op} ${topic} (${rel} ${a} ${b}) ${rest.join(' ')}`.trim();
            }

            // Shape B: deduce Topic A is a B ...  -> treat as isA(A,B)
            if (args.length >= 7) {
              const [t2, a2, isTok, art, b2, ...rest2] = args;
              if (looksLikeAtom(t2) && looksLikeAtom(a2) && /^is$/i.test(isTok) && /^(?:a|an)$/i.test(art) && looksLikeAtom(b2)) {
                return `${op} ${t2} (isA ${a2} ${b2}) ${rest2.join(' ')}`.trim();
              }
            }
          }
        }

        return `${parsed.operator} ${parsed.args.join(' ')}`;

      case 'compound': {
        const parts = Array.isArray(parsed.parts) ? parsed.parts : [];
        if (parts.length < 2) return null;
        const a = this.clauseToDSL(parts[0]);
        const b = this.clauseToDSL(parts[1]);
        if (!a || !b) return null;
        return `${parsed.operator} (${a}) (${b})`;
      }

      case 'unary':
        return `${parsed.operator} ${parsed.subject}`;

      case 'property':
        return `hasProperty ${parsed.subject} ${parsed.property}`;

      case 'negation': {
        const innerName = 'inner';
        const innerDsl = this.statementToDSL(parsed.negated, innerName);
        if (!innerDsl) return null;
        // Remove @inner prefix and wrap in Not
        const innerContent = innerDsl.replace(/^@\w+\s+/, '');
        // Negation is a persistent fact; it does not need a destination binding.
        return `Not (${innerContent})`;
      }

      case 'rule': {
        const ant = this.clauseToDSL(parsed.antecedent);
        const cons = this.clauseToDSL(parsed.consequent);
        if (!ant || !cons) return null;
        // Rules are persistent; do not emit non-persistent @dest bindings.
        return `Implies (${ant}) (${cons})`;
      }

      case 'implies': {
        const ant = this.clauseToDSL(parsed.antecedent);
        const cons = this.clauseToDSL(parsed.consequent);
        if (!ant || !cons) return null;
        return `implies (${ant}) (${cons})`;
      }

      case 'exists': {
        const body = this.clauseToDSL(parsed.body);
        if (!body) return null;
        return `Exists ${parsed.variable} (${body})`;
      }

      case 'unknown':
        return `# Could not parse: ${parsed.source}`;

      default:
        return null;
    }
  }

  /**
   * Convert clause to DSL (without @name)
   * @param {Object} clause
   * @returns {string|null}
   */
  clauseToDSL(clause) {
    if (!clause) return null;

    switch (clause.type) {
      case 'isA':
        return `isA ${clause.subject} ${clause.object}`;

      case 'binary':
        return `${clause.operator} ${clause.subject} ${clause.object}`;

      case 'unary':
        return `${clause.operator} ${clause.subject}`;

      case 'property':
        return `hasProperty ${clause.subject} ${clause.property}`;

      case 'compound': {
        const parts = Array.isArray(clause.parts) ? clause.parts : [];
        if (parts.length < 2) return null;
        const a = this.clauseToDSL(parts[0]);
        const b = this.clauseToDSL(parts[1]);
        if (!a || !b) return null;
        return `${clause.operator} (${a}) (${b})`;
      }

      case 'raw':
        return clause.text;

      default:
        // Try to convert nested statement
        const nested = this.statementToDSL(clause, 'x');
        return nested ? nested.replace(/^@\w+\s+/, '') : null;
    }
  }

  /**
   * Split text into sentences
   * @param {string} text
   * @returns {string[]}
   */
  splitSentences(text) {
    if (!text) return [];

    return text
      // Split on sentence-ending punctuation, but do not split on `?x`-style DSL variables.
      .split(/[.!?]+(?=\s|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Generate next statement name
   * @returns {string}
   */
  nextName() {
    this.nameCounter++;
    return `f${this.nameCounter}`;
  }

  /**
   * Reset name counter
   */
  resetNames() {
    this.nameCounter = 0;
  }
}

export default NLTransformer;

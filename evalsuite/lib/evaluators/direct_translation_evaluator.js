/**
 * DirectTranslationEvaluator - Test NL→DSL translation via direct LLM call
 *
 * Makes direct API calls to LLM for translation without subprocess.
 * More reliable for testing translation quality.
 *
 * @module evalsuite/lib/evaluators/direct_translation_evaluator
 */

const TranslationEvaluator = require('./translation_evaluator');

/**
 * DirectTranslationEvaluator class
 * Uses direct LLM API for translation testing
 */
class DirectTranslationEvaluator extends TranslationEvaluator {
  /**
   * Create evaluator instance
   * @param {Object} options - Evaluator options
   * @param {boolean} [options.verbose] - Enable verbose logging
   */
  constructor(options = {}) {
    super(options);
    this.theoryContext = null;
    this.llmClient = null;
  }

  /**
   * Set theory context for translation
   * @param {Object} context - Theory context
   * @param {string} context.theory - Theory natural language
   * @param {Array} context.facts - Expected facts
   */
  setTheoryContext(context) {
    this.theoryContext = context;
  }

  /**
   * Start the evaluator - initialize LLM client
   */
  async start() {
    // Try to load LLM client from AGISystem2
    try {
      const path = require('path');
      // From evalsuite/lib/evaluators/ up 3 levels to AGISystem2
      const basePath = path.resolve(__dirname, '../../..');
      const LLMClient = require(path.join(basePath, 'src/llm/llm_client.js'));
      this.llmClient = new LLMClient();
      await this.llmClient.initialize();
    } catch (e) {
      // Fallback: no LLM client, will use pattern matching
      if (this.options.verbose) {
        console.log('  DirectTranslationEvaluator: LLM client not available, using patterns');
      }
    }
  }

  /**
   * Translate natural language question to DSL
   *
   * @param {string} question - Natural language question
   * @returns {Promise<string>} Generated DSL
   */
  async translateQuestion(question) {
    // If LLM client is available, use it
    if (this.llmClient) {
      return await this._translateWithLLM(question);
    }

    // Fallback: pattern-based translation
    return this._translateWithPatterns(question);
  }

  /**
   * Translate using LLM
   * @private
   */
  async _translateWithLLM(question) {
    const systemPrompt = this._buildSystemPrompt();
    const userPrompt = `Translate to Sys2DSL query:\n${question}`;

    try {
      const response = await this.llmClient.complete({
        system: systemPrompt,
        user: userPrompt,
        maxTokens: 200
      });

      // Extract DSL from response
      return this.extractGeneratedDsl(response) || response.trim();
    } catch (e) {
      return `[Translation error: ${e.message}]`;
    }
  }

  /**
   * Build system prompt with theory context
   * @private
   */
  _buildSystemPrompt() {
    let prompt = `You are a Sys2DSL translator. Convert natural language questions to DSL queries.

Format: @queryId COMMAND subject RELATION object

Available commands:
- ASK: Query for truth value
- ABDUCT: Generate hypothesis
- FACTS_MATCHING: Find matching facts

Example queries:
- "Is a dog a mammal?" → @q1 ASK Dog IS_A Mammal
- "Can birds fly?" → @q1 ASK Bird CAN fly
- "What causes fever?" → @q1 ABDUCT fever

Output ONLY the DSL query, nothing else.`;

    // Add theory context if available
    if (this.theoryContext) {
      prompt += `\n\nKnowledge base facts:\n`;
      for (const fact of (this.theoryContext.facts || [])) {
        prompt += `- ${fact}\n`;
      }
    }

    return prompt;
  }

  /**
   * Translate using pattern matching (fallback)
   * @private
   */
  _translateWithPatterns(question) {
    const patterns = [
      { regex: /is\s+(?:a\s+)?(\w+)\s+(?:a|an)\s+(\w+)/i,
        template: (m) => `@q ASK ${m[1]} IS_A ${m[2]}` },
      { regex: /can\s+(?:a\s+)?(\w+)\s+(\w+)/i,
        template: (m) => `@q ASK ${m[1]} CAN ${m[2]}` },
      { regex: /does\s+(?:a\s+)?(\w+)\s+have\s+(?:a\s+)?(\w+)/i,
        template: (m) => `@q ASK ${m[1]} HAS ${m[2]}` },
      { regex: /what\s+(?:might\s+)?causes?\s+(.+)/i,
        template: (m) => `@q ABDUCT ${m[1].replace(/[?]/g, '').trim()}` },
      { regex: /is\s+(\w+)\s+part\s+of\s+(\w+)/i,
        template: (m) => `@q ASK ${m[1]} PART_OF ${m[2]}` }
    ];

    for (const { regex, template } of patterns) {
      const match = question.match(regex);
      if (match) {
        return template(match);
      }
    }

    return `[Could not translate: ${question}]`;
  }

  /**
   * Send question for translation (alias for translateQuestion)
   * @param {string} input - Natural language input
   * @returns {Promise<string>} Generated DSL
   */
  async send(input) {
    return await this.translateQuestion(input);
  }

  /**
   * Stop the evaluator
   */
  async stop() {
    if (this.llmClient) {
      await this.llmClient.close();
      this.llmClient = null;
    }
  }
}

module.exports = DirectTranslationEvaluator;

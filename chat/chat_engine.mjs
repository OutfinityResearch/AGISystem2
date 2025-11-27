/**
 * DS(/chat/chat_engine.mjs) - Chat Engine Core
 *
 * Core engine that bridges LLM natural language processing with
 * AGISystem2's DSL-based reasoning. Handles:
 * - Intent detection from user input
 * - Routing to appropriate handlers
 * - Session and conversation management
 *
 * See also: DS(/chat/chat_handlers), DS(/chat/prompts)
 *
 * @module chat/chat_engine
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadLLMAgent, checkAPIKeys, getMissingLibraryHelp } from './llm_loader.mjs';
import { buildIntentPrompt } from './prompts.mjs';
import {
  handleTeach,
  handleAsk,
  handleImport,
  handleTheoryManagement,
  handleList,
  handleHelp
} from './chat_handlers.mjs';

// Use createRequire to import CommonJS modules
const require = createRequire(import.meta.url);

export class ChatEngine {
  constructor(options = {}) {
    this.options = options;
    this.llmAgent = null;
    this.session = null;
    this.theoriesRoot = null;
    this.currentTheory = 'default';
    this.conversationHistory = [];
    this.initialized = false;
    // Pending state for confirmations
    this.pendingAction = null; // { type: 'create_theory_branch', data: {...} }
  }

  /**
   * Initialize the chat engine
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async initialize() {
    // Load LLM library
    const llmResult = await loadLLMAgent();
    if (!llmResult.available) {
      return {
        success: false,
        message: getMissingLibraryHelp()
      };
    }

    // Check API keys
    const apiCheck = checkAPIKeys();
    if (!apiCheck.configured) {
      return {
        success: false,
        message: `No LLM API keys configured. Set at least one of:\n` +
          `  OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY\n` +
          `You can put these in a .env file.`
      };
    }

    // Create LLM agent
    this.llmAgent = new llmResult.LLMAgent({ name: 'AGISystem2Chat' });

    // Initialize AGISystem2 session
    try {
      await this._initializeAGISession();
    } catch (err) {
      return {
        success: false,
        message: `Failed to initialize AGISystem2: ${err.message}`
      };
    }

    this.initialized = true;
    return {
      success: true,
      message: `AGISystem2 Chat initialized. LLM providers: ${apiCheck.providers.join(', ')}`
    };
  }

  /**
   * Initialize AGISystem2 session using the existing CLI infrastructure
   */
  async _initializeAGISession() {
    // Find the AGISystem2 root
    const chatDir = path.dirname(new URL(import.meta.url).pathname);
    const agisystemRoot = path.resolve(chatDir, '..');

    // Load AgentSystem2 class
    const AgentSystem2 = require(path.join(agisystemRoot, 'src', 'interface', 'agent_system2.js'));

    // Setup directories
    const cwd = process.cwd();
    const dataRoot = path.join(cwd, '.AGISystem2');
    const theoriesDir = path.join(dataRoot, 'theories');
    const storageDir = path.join(dataRoot, 'data');

    // Ensure directories exist
    for (const dir of [dataRoot, theoriesDir, storageDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create agent and session
    const agent = new AgentSystem2({
      profile: 'manual_test',
      overrides: { storageRoot: storageDir }
    });
    this.session = agent.createSession();
    this.theoriesRoot = theoriesDir;
  }

  /**
   * Get handler context object
   */
  _getHandlerContext() {
    return {
      llmAgent: this.llmAgent,
      session: this.session,
      theoriesRoot: this.theoriesRoot,
      currentTheory: this.currentTheory,
      setCurrentTheory: (name) => { this.currentTheory = name; },
      setPendingAction: (type, data) => this.setPendingAction(type, data)
    };
  }

  /**
   * Process a user message and return a response
   * @param {string} userMessage - Natural language input
   * @returns {Promise<{response: string, actions: object[]}>}
   */
  async processMessage(userMessage) {
    if (!this.initialized) {
      return {
        response: 'Chat engine not initialized. Call initialize() first.',
        actions: []
      };
    }

    const trimmed = userMessage.trim();
    if (!trimmed) {
      return { response: 'Please enter a message.', actions: [] };
    }

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: trimmed });

    // Check for pending action confirmation
    if (this.pendingAction) {
      const confirmResult = await this._handlePendingConfirmation(trimmed);
      if (confirmResult) {
        this.conversationHistory.push({ role: 'assistant', content: confirmResult.response });
        return confirmResult;
      }
    }

    try {
      // Detect intent using LLM
      const intent = await this._detectIntent(trimmed);
      const ctx = this._getHandlerContext();

      // Process based on intent
      let result;
      switch (intent.intent) {
        case 'teach':
          result = await handleTeach(ctx, trimmed, intent.details);
          break;
        case 'ask':
          result = await handleAsk(ctx, trimmed, intent.details);
          break;
        case 'import':
          result = await handleImport(ctx, trimmed, intent.details);
          break;
        case 'manage_theory':
          result = await handleTheoryManagement(ctx, trimmed, intent.details);
          break;
        case 'list':
          result = await handleList(ctx, intent.details);
          break;
        case 'help':
          result = handleHelp();
          break;
        default:
          result = await handleTeach(ctx, trimmed, {});
      }

      // Add response to history
      this.conversationHistory.push({ role: 'assistant', content: result.response });

      return result;
    } catch (err) {
      const errorResponse = `I encountered an error: ${err.message}`;
      this.conversationHistory.push({ role: 'assistant', content: errorResponse });
      return { response: errorResponse, actions: [{ type: 'error', error: err.message }] };
    }
  }

  /**
   * Detect user intent - heuristics first for reliability, LLM for ambiguous cases
   */
  async _detectIntent(message) {
    // First try deterministic heuristics - they're reliable
    const heuristic = this._heuristicIntentDetection(message);

    // If heuristics are confident (>0.7), use them directly
    // This ensures deterministic behavior for common patterns
    if (heuristic.confidence >= 0.7) {
      return heuristic;
    }

    // For ambiguous cases, try LLM
    const prompt = buildIntentPrompt(message);

    try {
      const response = await this.llmAgent.complete({
        prompt,
        mode: 'fast',
        context: { intent: 'detect-intent' }
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const llmIntent = JSON.parse(jsonMatch[0]);
        // Only use LLM result if it's confident
        if (llmIntent.confidence >= 0.7) {
          return llmIntent;
        }
      }
    } catch {
      // Continue with heuristic result
    }

    // Fall back to heuristic result
    return heuristic;
  }

  /**
   * Fallback heuristic intent detection - deterministic and reliable
   */
  _heuristicIntentDetection(message) {
    const lower = message.toLowerCase().trim();

    // Questions - ask intent
    if (lower.includes('?') || lower.startsWith('is ') || lower.startsWith('what ') ||
        lower.startsWith('why ') || lower.startsWith('how ') || lower.startsWith('does ') ||
        lower.startsWith('can ') || lower.startsWith('could ') || lower.startsWith('would ')) {
      return { intent: 'ask', confidence: 0.8, details: {} };
    }

    // Import files
    if (lower.includes('import') || lower.includes('load file')) {
      return { intent: 'import', confidence: 0.8, details: {} };
    }

    // Theory management - only when explicitly requested
    if ((lower.includes('theory') && (lower.includes('create') || lower.includes('new') ||
         lower.includes('pop') || lower.includes('save') || lower.includes('list'))) ||
        lower.startsWith('push ') || lower.startsWith('pop ')) {
      return { intent: 'manage_theory', confidence: 0.8, details: {} };
    }

    // List commands
    if (lower.startsWith('list ') || lower.startsWith('show ')) {
      return { intent: 'list', confidence: 0.7, details: {} };
    }

    // Help
    if (lower.includes('help')) {
      return { intent: 'help', confidence: 0.9, details: {} };
    }

    // Declarative statements are teach intent (X are/is Y patterns)
    // Pattern: "Subject are/is Object" - common teaching pattern
    if (/\b(are|is)\b/.test(lower) && !lower.includes('?')) {
      return { intent: 'teach', confidence: 0.8, details: {} };
    }

    // Default to teach for unknown declarative content
    return { intent: 'teach', confidence: 0.5, details: {} };
  }

  /**
   * Check if message is a confirmation
   */
  _isConfirmation(message) {
    const lower = message.toLowerCase().trim();
    const confirmPatterns = [
      'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'da', 'sigur',
      'yes please', 'go ahead', 'do it', 'please', 'confirm',
      'y', 'aye', 'affirmative', 'absolutely', 'definitely'
    ];
    return confirmPatterns.some(p => lower === p || lower.startsWith(p + ' ') || lower.startsWith(p + ','));
  }

  /**
   * Check if message is a rejection
   */
  _isRejection(message) {
    const lower = message.toLowerCase().trim();
    const rejectPatterns = [
      'no', 'nope', 'nah', 'cancel', 'nu', 'stop', 'nevermind',
      'never mind', 'forget it', 'don\'t', 'do not', 'n'
    ];
    return rejectPatterns.some(p => lower === p || lower.startsWith(p + ' ') || lower.startsWith(p + ','));
  }

  /**
   * Handle pending action confirmation
   * @returns {object|null} Result if handled, null if not a confirmation
   */
  async _handlePendingConfirmation(message) {
    if (!this.pendingAction) return null;

    const isConfirm = this._isConfirmation(message);
    const isReject = this._isRejection(message);

    // If neither confirm nor reject, it's a new message - cancel pending and return null
    if (!isConfirm && !isReject) {
      this.pendingAction = null;
      return null;
    }

    const pending = this.pendingAction;
    this.pendingAction = null; // Clear pending state

    if (isReject) {
      return {
        response: 'Okay, I won\'t create a new theory branch. The facts were not added.',
        actions: [{ type: 'confirmation_rejected', pendingType: pending.type }]
      };
    }

    // Handle confirmation based on pending action type
    if (pending.type === 'create_theory_branch') {
      const { suggestion, facts } = pending.data;
      const ctx = this._getHandlerContext();

      try {
        // Create the new theory branch
        const theoryName = suggestion.name || `theory_${Date.now()}`;
        this.session.run([`@r THEORY_PUSH name="${theoryName}"`]);
        this.currentTheory = theoryName;

        // Add the facts to the new branch
        const added = [];
        for (const fact of facts) {
          try {
            this.session.run([`@f ASSERT ${fact.subject} ${fact.relation} ${fact.object}`]);
            added.push(fact);
          } catch (err) {
            // Skip failed facts
          }
        }

        return {
          response: `Created new theory branch "${theoryName}".\n\n` +
            `Added ${added.length} fact(s) to this branch:\n` +
            added.map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n') +
            `\n\nYou're now working in the "${theoryName}" context.`,
          actions: [
            { type: 'theory_created', name: theoryName },
            ...added.map(f => ({ type: 'fact_added', fact: f }))
          ]
        };
      } catch (err) {
        return {
          response: `Error creating theory branch: ${err.message}`,
          actions: [{ type: 'error', error: err.message }]
        };
      }
    }

    return null;
  }

  /**
   * Set a pending action that requires confirmation
   */
  setPendingAction(type, data) {
    this.pendingAction = { type, data };
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }
}

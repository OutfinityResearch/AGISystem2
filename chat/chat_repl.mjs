/**
 * DS(/chat/chat_repl.mjs) - Chat REPL Interface
 *
 * Interactive Read-Eval-Print Loop for the chat interface.
 * Provides a terminal-based conversational UI.
 *
 * @module chat/chat_repl
 */

import readline from 'node:readline';
import { ChatEngine } from './chat_engine.mjs';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

export class ChatREPL {
  constructor(options = {}) {
    this.options = options;
    this.engine = new ChatEngine(options);
    this.rl = null;
    this.running = false;
    this.useColors = options.noColor !== true && process.stdout.isTTY;
  }

  /**
   * Format text with color (if enabled)
   */
  _color(colorName, text) {
    if (!this.useColors) return text;
    return `${COLORS[colorName] || ''}${text}${COLORS.reset}`;
  }

  /**
   * Print the welcome banner
   */
  _printBanner() {
    console.log('');
    console.log(this._color('cyan', '╔════════════════════════════════════════════════════════════╗'));
    console.log(this._color('cyan', '║') + this._color('bright', '              AGISystem2 Chat Interface                     ') + this._color('cyan', '║'));
    console.log(this._color('cyan', '║') + this._color('dim', '        Natural Language Knowledge Reasoning                 ') + this._color('cyan', '║'));
    console.log(this._color('cyan', '╚════════════════════════════════════════════════════════════╝'));
    console.log('');
  }

  /**
   * Print help for REPL-specific commands
   */
  _printREPLHelp() {
    console.log(this._color('yellow', '\nREPL Commands:'));
    console.log(this._color('dim', '  /help      ') + '- Show this help');
    console.log(this._color('dim', '  /history   ') + '- Show conversation history');
    console.log(this._color('dim', '  /clear     ') + '- Clear conversation history');
    console.log(this._color('dim', '  /facts     ') + '- List all known facts');
    console.log(this._color('dim', '  /concepts  ') + '- List all concepts');
    console.log(this._color('dim', '  /theories  ') + '- Show theory stack');
    console.log(this._color('dim', '  /exit      ') + '- Exit the chat');
    console.log('');
    console.log(this._color('green', 'Or just type naturally:'));
    console.log(this._color('dim', '  "Dogs are mammals"        ') + '- Teach a fact');
    console.log(this._color('dim', '  "Is a dog an animal?"     ') + '- Ask a question');
    console.log(this._color('dim', '  "Import file facts.txt"   ') + '- Import from file');
    console.log('');
  }

  /**
   * Handle REPL-specific commands
   * @returns {boolean} true if command was handled, false otherwise
   */
  async _handleREPLCommand(input) {
    const trimmed = input.trim();

    if (!trimmed.startsWith('/')) {
      return false;
    }

    const cmd = trimmed.toLowerCase();

    if (cmd === '/help' || cmd === '/h' || cmd === '/?') {
      this._printREPLHelp();
      return true;
    }

    if (cmd === '/history') {
      const history = this.engine.getHistory();
      if (history.length === 0) {
        console.log(this._color('dim', '\nNo conversation history yet.\n'));
      } else {
        console.log(this._color('yellow', '\nConversation History:'));
        for (const entry of history) {
          const prefix = entry.role === 'user'
            ? this._color('cyan', 'You: ')
            : this._color('green', 'AI:  ');
          console.log(prefix + entry.content.substring(0, 100) +
            (entry.content.length > 100 ? '...' : ''));
        }
        console.log('');
      }
      return true;
    }

    if (cmd === '/clear') {
      this.engine.clearHistory();
      console.log(this._color('dim', '\nConversation history cleared.\n'));
      return true;
    }

    if (cmd === '/facts') {
      const result = await this.engine.processMessage('list facts');
      console.log('\n' + result.response + '\n');
      return true;
    }

    if (cmd === '/concepts') {
      const result = await this.engine.processMessage('list concepts');
      console.log('\n' + result.response + '\n');
      return true;
    }

    if (cmd === '/theories') {
      const result = await this.engine.processMessage('list theories');
      console.log('\n' + result.response + '\n');
      return true;
    }

    if (cmd === '/exit' || cmd === '/quit' || cmd === '/q') {
      this.running = false;
      return true;
    }

    console.log(this._color('red', `Unknown command: ${cmd}`) + this._color('dim', ' (type /help for commands)\n'));
    return true;
  }

  /**
   * Process user input and display response
   */
  async _processInput(input) {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Check for REPL commands first
    if (await this._handleREPLCommand(trimmed)) {
      return;
    }

    // Show thinking indicator
    process.stdout.write(this._color('dim', '\nThinking...'));

    try {
      const result = await this.engine.processMessage(trimmed);

      // Clear thinking indicator
      process.stdout.write('\r' + ' '.repeat(20) + '\r');

      // Display response
      console.log(this._color('green', '\n' + result.response));

      // Show any interesting actions in debug mode
      if (this.options.debug && result.actions.length > 0) {
        console.log(this._color('dim', '\nActions: ' +
          result.actions.map(a => a.type).join(', ')));
      }

      console.log('');
    } catch (err) {
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
      console.log(this._color('red', `\nError: ${err.message}\n`));
    }
  }

  /**
   * Start the REPL
   */
  async start() {
    this._printBanner();

    // Initialize engine
    console.log(this._color('dim', 'Initializing...'));
    const initResult = await this.engine.initialize();

    if (!initResult.success) {
      console.log(this._color('red', '\nInitialization failed:\n'));
      console.log(initResult.message);
      process.exit(1);
    }

    console.log(this._color('green', '✓ ') + this._color('dim', initResult.message));
    console.log('');
    console.log(this._color('dim', 'Type /help for commands, or just start chatting!'));
    console.log('');

    // Setup readline
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this._color('cyan', 'You: ')
    });

    this.running = true;

    // Handle line input
    this.rl.on('line', async (line) => {
      if (!this.running) {
        this.rl.close();
        return;
      }

      await this._processInput(line);

      if (this.running) {
        this.rl.prompt();
      }
    });

    // Handle close
    this.rl.on('close', () => {
      console.log(this._color('dim', '\nGoodbye!\n'));
      process.exit(0);
    });

    // Start prompting
    this.rl.prompt();
  }

  /**
   * Stop the REPL
   */
  stop() {
    this.running = false;
    if (this.rl) {
      this.rl.close();
    }
  }
}

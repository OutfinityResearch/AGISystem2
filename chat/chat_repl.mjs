/**
 * DS(/chat/chat_repl.mjs) - Chat REPL Interface
 *
 * Interactive Read-Eval-Print Loop for the chat interface.
 * Provides a terminal-based conversational UI.
 *
 * @module chat/chat_repl
 */

import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
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
    this.multilineMode = false;
    this.multilineBuffer = [];
    this.inputHistory = [];
    this.historyPath = this._initHistoryPath();
    // DSL debug is ON by default; can be disabled via CLI or /debug off
    this.debugMode = options.debug === false ? false : true;
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
    console.log(this._color('dim', '  /inputs    ') + '- Show numbered input history');
    console.log(this._color('dim', '  /repeat N  ') + '- Re-run input #N from history');
    console.log(this._color('dim', '  /clear     ') + '- Clear conversation history');
    console.log(this._color('dim', '  /facts     ') + '- List all known facts');
    console.log(this._color('dim', '  /concepts  ') + '- List all concepts');
    console.log(this._color('dim', '  /theories  ') + '- Show theory stack');
    console.log(this._color('dim', '  /multiline [on|off]') + '- Toggle multi-line input mode (use /send to submit)');
    console.log(this._color('dim', '  /debug [on|off]') + '- Toggle or set DSL debug view');
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

    const [base, argRaw] = trimmed.split(/\s+/, 2);
    const cmd = base.toLowerCase();
    const arg = (argRaw || '').toLowerCase();

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

    if (cmd === '/inputs') {
      this._printInputHistory();
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

    if (cmd === '/debug') {
      if (!arg) {
        this.debugMode = !this.debugMode;
      } else if (arg === 'on') {
        this.debugMode = true;
      } else if (arg === 'off') {
        this.debugMode = false;
      } else {
        console.log(this._color('dim', '\nUsage: /debug [on|off]\n'));
        return true;
      }

      console.log(this._color('dim', `\nDSL debug is now ${this.debugMode ? 'ON' : 'OFF'}.\n`));
      return true;
    }

    if (cmd === '/multiline' || cmd === '/ml') {
      if (!arg) {
        this.multilineMode = !this.multilineMode;
      } else if (arg === 'on') {
        this.multilineMode = true;
      } else if (arg === 'off') {
        this.multilineMode = false;
      } else {
        console.log(this._color('dim', '\nUsage: /multiline [on|off]\n'));
        return true;
      }

      this.multilineBuffer = [];
      console.log(this._color('dim', `\nMultiline input is now ${this.multilineMode ? 'ON' : 'OFF'}.\n`));
      if (this.multilineMode) {
        console.log(this._color('dim', 'Paste or type multiple lines, then use /send to submit, /cancel to discard.\n'));
      }
      return true;
    }

    if (cmd === '/repeat') {
      const n = parseInt(arg, 10);
      if (!Number.isInteger(n) || n < 1 || n > this.inputHistory.length) {
        console.log(this._color('red', '\nInvalid index for /repeat. Use /inputs to see valid indices.\n'));
        return true;
      }
      const text = this.inputHistory[n - 1];
      console.log(this._color('dim', `\nRe-running input #${n}: ${text}\n`));
      await this._processInput(text, { fromHistory: true });
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
   * Generate deterministic variable name for DSL output
   */
  _generateVarName(prefix, index) {
    return `${prefix}${String(index).padStart(3, '0')}`;
  }

  /**
   * Initialize persistent history path
   */
  _initHistoryPath() {
    try {
      const cwd = process.cwd();
      const dataRoot = path.join(cwd, '.AGISystem2');
      if (!fs.existsSync(dataRoot)) {
        fs.mkdirSync(dataRoot, { recursive: true });
      }
      const historyPath = path.join(dataRoot, 'chat_history.txt');
      if (fs.existsSync(historyPath)) {
        const lines = fs.readFileSync(historyPath, 'utf8')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        this.inputHistory = lines.slice(-200);
      }
      return historyPath;
    } catch {
      return null;
    }
  }

  _appendHistory(line) {
    if (!line) return;
    this.inputHistory.push(line);
    if (this.inputHistory.length > 200) {
      this.inputHistory = this.inputHistory.slice(-200);
    }
    if (this.historyPath) {
      try {
        fs.writeFileSync(this.historyPath, this.inputHistory.join('\n'), 'utf8');
      } catch {
        // ignore persistence errors
      }
    }
  }

  _printInputHistory() {
    if (!this.inputHistory.length) {
      console.log(this._color('dim', '\nNo input history yet.\n'));
      return;
    }
    console.log(this._color('yellow', '\nInput History:'));
    this.inputHistory.forEach((line, idx) => {
      const label = String(idx + 1).padStart(3, ' ');
      const preview = line.length > 80 ? `${line.slice(0, 77)}...` : line;
      console.log(this._color('dim', `  ${label}: `) + preview);
    });
    console.log('');
  }

  /**
   * Format result as Sys2DSL representation
   */
  _formatAsDSL(result, queryIndex) {
    const varName = this._generateVarName('q', queryIndex);
    const lines = [];

    if (result.actions) {
      for (const action of result.actions) {
        if (action.type === 'fact_extraction' && Array.isArray(action.facts)) {
          lines.push(`# Extracted facts (${action.source || 'unknown'}):`);
          for (const f of action.facts) {
            lines.push(`#   ${f.subject} ${f.relation} ${f.object}`);
          }
        }
        if (action.type === 'fact_added' && action.fact) {
          const f = action.fact;
          const fVar = this._generateVarName('f', this._factCounter++);
          lines.push(`@${fVar} ${f.subject} ${f.relation} ${f.object}`);
        }
        if (action.type === 'query' && action.query) {
          const q = action.query;
          lines.push(`@${varName} ASK ${q.subject || '?'} ${q.relation || 'IS_A'} ${q.object || '?'}`);
          if (action.result) {
            lines.push(`# Result: ${JSON.stringify({
              truth: action.result.truth,
              method: action.result.method,
              confidence: action.result.confidence
            })}`);
          }
        }
      }
    }

    return lines;
  }

  /**
   * Process user input and display response
   */
  async _processInput(input, opts = {}) {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Check for REPL commands first
    if (await this._handleREPLCommand(trimmed)) {
      return;
    }

    // Show thinking indicator
    process.stdout.write(this._color('dim', '\nThinking...'));

    try {
      this._queryCounter = (this._queryCounter || 0) + 1;
      this._factCounter = this._factCounter || 1;

      const result = await this.engine.processMessage(trimmed);

      // Clear thinking indicator
      process.stdout.write('\r' + ' '.repeat(20) + '\r');

      // In debug mode, show Sys2DSL representation first
      if (this.debugMode) {
        const dslLines = this._formatAsDSL(result, this._queryCounter);
        if (dslLines.length > 0) {
          console.log(this._color('magenta', '\n[DSL Representation]'));
          for (const line of dslLines) {
            console.log(this._color('yellow', '  ' + line));
          }
        }

        // Show structured result
        if (result.actions && result.actions.length > 0) {
          for (const action of result.actions) {
            if (action.result && action.result.truth) {
              console.log(this._color('cyan', '\n[Structured Result]'));
              console.log(this._color('dim', '  truth: ') + this._color('bright', action.result.truth));
              if (action.result.method) {
                console.log(this._color('dim', '  method: ') + action.result.method);
              }
              if (action.result.confidence !== undefined) {
                console.log(this._color('dim', '  confidence: ') + action.result.confidence);
              }
              if (action.result.explanation) {
                console.log(this._color('dim', '  explanation: ') + action.result.explanation);
              }
            }
          }
        }
      }

      // Display natural language response
      console.log(this._color('green', '\n' + result.response));

      console.log('');
    } catch (err) {
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
      console.log(this._color('red', `\nError: ${err.message}\n`));
    }

    // Record in persistent history (only for direct user inputs, not repeats)
    if (!opts.fromHistory) {
      this._appendHistory(trimmed);
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

      const raw = line;

      // In multiline mode, we buffer until /send or /cancel
      if (this.multilineMode) {
        const trimmed = raw.trim();

        // Special controls in multiline mode
        if (trimmed === '/send') {
          const text = this.multilineBuffer.join('\n').trim();
          this.multilineBuffer = [];
          if (text) {
            await this._processInput(text);
          }
        } else if (trimmed === '/cancel' || trimmed === '/clearinput') {
          this.multilineBuffer = [];
          console.log(this._color('dim', '\nMultiline buffer cleared.\n'));
        } else if (trimmed.startsWith('/')) {
          // Other REPL commands still work in multiline mode (without affecting buffer)
          if (await this._handleREPLCommand(trimmed)) {
            // no-op
          } else {
            this.multilineBuffer.push(raw);
          }
        } else {
          this.multilineBuffer.push(raw);
        }
      } else {
        await this._processInput(raw);
      }

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

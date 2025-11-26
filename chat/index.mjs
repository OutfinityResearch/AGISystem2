/**
 * DS(/chat/index.mjs) - AGISystem2 Conversational Interface
 *
 * Main entry point for the natural language chat interface.
 * Uses LLMAgent from AchillesAgentLib to translate between
 * natural language and Sys2DSL commands.
 *
 * Features:
 * - Natural language input/output
 * - Automatic theory management (create, update, switch)
 * - Contradiction detection with theory branching
 * - File import for bulk theory loading
 *
 * @module chat/index
 */

import { ChatEngine } from './chat_engine.mjs';
import { ChatREPL } from './chat_repl.mjs';

export { ChatEngine, ChatREPL };

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const repl = new ChatREPL();
  repl.start().catch((err) => {
    console.error('Failed to start chat:', err.message);
    process.exit(1);
  });
}

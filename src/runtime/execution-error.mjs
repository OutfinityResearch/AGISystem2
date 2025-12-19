import { debug_trace } from '../utils/debug.js';

/**
 * ExecutionError
 * Centralized error type for runtime execution failures.
 */
export class ExecutionError extends Error {
  constructor(message, node) {
    const location = node ? ` at ${node.line}:${node.column}` : '';
    super(`Execution error${location}: ${message}`);
    this.name = 'ExecutionError';
    this.node = node;

    // Keep a minimal trace hook for debugging without crashing flows.
    debug_trace('[ExecutionError]', this.message);
  }
}

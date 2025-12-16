/**
 * AGISystem2 - Core Constants
 * @module core/constants
 */

// Default geometry (vector dimension in bits)
export const DEFAULT_GEOMETRY = 32768;

// Position vector count
export const MAX_POSITIONS = 20;

// Similarity thresholds
export const SIMILARITY_THRESHOLD = 0.5;
export const STRONG_CONFIDENCE = 0.65;
export const ORTHOGONAL_THRESHOLD = 0.55;

// Query limits
export const MAX_HOLES = 3;
export const TOP_K_DEFAULT = 5;

// Proof limits
export const MAX_PROOF_DEPTH = 50;  // Support deep chains up to 50 steps
export const PROOF_TIMEOUT_MS = 5000;  // 5 seconds timeout
export const MAX_REASONING_STEPS = 1000;  // Total step limit to prevent infinite loops

// Decoding limits
export const MAX_NESTING_DEPTH = 3;

// Reserved operator names
export const RESERVED_OPERATORS = [
  'Implies',
  'And',
  'Or',
  'Not',
  'ForAll',
  'Exists'
];

// Token types for lexer
export const TOKEN_TYPES = {
  AT: 'AT',
  IDENTIFIER: 'IDENTIFIER',
  HOLE: 'HOLE',
  REFERENCE: 'REFERENCE',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  COMMA: 'COMMA',
  COLON: 'COLON',
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
  COMMENT: 'COMMENT',
  KEYWORD: 'KEYWORD'
};

// Keywords - only those with special parsing in parser.mjs
export const KEYWORDS = [
  'theory',
  'import',
  'rule',
  'macro',
  'begin',
  'end',
  'return'
];

/**
 * AGISystem2 - Main Entry Point
 * @module agisystem2
 *
 * Geometric Operating System for Neuro-Symbolic Reasoning
 */

// Core exports
export { Vector } from './core/vector.mjs';
export {
  bind,
  bindAll,
  bundle,
  similarity,
  distance,
  topKSimilar,
  isOrthogonal,
  unbind
} from './core/operations.mjs';
export {
  getPositionVector,
  initPositionVectors,
  withPosition,
  removePosition,
  extractAtPosition
} from './core/position.mjs';
export * from './core/constants.mjs';

// Utility exports
export { PRNG } from './util/prng.mjs';
export { djb2, fnv1a, stringHash } from './util/hash.mjs';
export { asciiStamp, asciiStampBatch } from './util/ascii-stamp.mjs';

// Parser exports
export { Lexer, Token, LexerError } from './parser/lexer.mjs';
export { Parser, parse, ParseError } from './parser/parser.mjs';
export * from './parser/ast.mjs';

// Runtime exports
export { Session } from './runtime/session.mjs';
export { Scope } from './runtime/scope.mjs';
export { Vocabulary } from './runtime/vocabulary.mjs';
export { Executor, ExecutionError } from './runtime/executor.mjs';

// Reasoning exports
export { QueryEngine } from './reasoning/query.mjs';
export { ProofEngine } from './reasoning/prove.mjs';

// NLP exports
export { translateNL2DSL, translateExample, resetRefCounter } from './nlp/nl2dsl.mjs';

// Decoding exports
export { StructuralDecoder } from './decoding/structural-decoder.mjs';
export { PhrasingEngine } from './decoding/phrasing.mjs';
export { TextGenerator } from './decoding/text-generator.mjs';

// Test library exports
export { TestSession, TestError } from './test-lib/test-session.mjs';
export { Assertions, AssertionError } from './test-lib/assertions.mjs';

// Default export is Session for convenience
export { Session as default } from './runtime/session.mjs';

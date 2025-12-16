# Module: src/index.mjs

**Purpose:** Main entry point - re-exports all AGISystem2 components.

## Exports

```javascript
// Core
export { Vector } from './core/vector.mjs';
export { bind, bindAll, bundle, similarity, distance, topKSimilar, isOrthogonal, unbind } from './core/operations.mjs';
export { getPositionVector, initPositionVectors, withPosition, removePosition } from './core/position.mjs';
export * from './core/constants.mjs';

// Util
export { PRNG } from './util/prng.mjs';
export { djb2, fnv1a, stringHash } from './util/hash.mjs';
export { asciiStamp, asciiStampBatch } from './util/ascii-stamp.mjs';

// Parser
export { Lexer, Token, LexerError } from './parser/lexer.mjs';
export { Parser, parse, ParseError } from './parser/parser.mjs';
export * from './parser/ast.mjs';

// Runtime
export { Session } from './runtime/session.mjs';
export { Scope } from './runtime/scope.mjs';
export { Vocabulary } from './runtime/vocabulary.mjs';
export { Executor, ExecutionError } from './runtime/executor.mjs';

// Reasoning
export { QueryEngine } from './reasoning/query.mjs';
export { ProofEngine } from './reasoning/prove.mjs';

// Decoding
export { StructuralDecoder } from './decoding/structural-decoder.mjs';
export { PhrasingEngine } from './decoding/phrasing.mjs';
export { TextGenerator } from './decoding/text-generator.mjs';

// Test library
export { TestSession, TestError } from './test-lib/test-session.mjs';
export { Assertions, AssertionError } from './test-lib/assertions.mjs';

// Default export
export default Session;
```

## Dependencies

All submodules.

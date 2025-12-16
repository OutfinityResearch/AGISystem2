# Module: src/parser/index.mjs

**Purpose:** Re-exports all parser module components.

## Exports

```javascript
export { Lexer, Token, LexerError } from './lexer.mjs';
export { Parser, parse, ParseError } from './parser.mjs';
export * from './ast.mjs';
```

## Dependencies

- `./lexer.mjs`
- `./parser.mjs`
- `./ast.mjs`

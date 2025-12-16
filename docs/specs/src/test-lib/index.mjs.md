# Module: src/test-lib/index.mjs

**Purpose:** Re-exports all test library components.

## Exports

```javascript
export { TestSession, TestError } from './test-session.mjs';
export { Assertions, AssertionError } from './assertions.mjs';
export * from './fixtures.mjs';
```

## Dependencies

- `./test-session.mjs`
- `./assertions.mjs`
- `./fixtures.mjs`

# Module: src/core/constants.mjs

**Purpose:** Global constants for AGISystem2 configuration.

## Exports

```javascript
export const DEFAULT_GEOMETRY = 32768;
export const MAX_POSITIONS = 20;
export const SIMILARITY_THRESHOLD = 0.5;
export const STRONG_CONFIDENCE = 0.65;
export const ORTHOGONAL_THRESHOLD = 0.55;
export const MAX_HOLES = 3;
export const TOP_K_DEFAULT = 5;
export const MAX_PROOF_DEPTH = 10;
export const PROOF_TIMEOUT_MS = 5000;
export const MAX_NESTING_DEPTH = 3;
export const RESERVED_OPERATORS: string[];
export const TOKEN_TYPES: object;
export const KEYWORDS: string[];
```

## Dependencies

None (leaf module).

## Test Cases

- Constants have expected default values
- TOKEN_TYPES contains all required token types
- KEYWORDS contains expected keywords

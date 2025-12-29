# Module: src/core/constants.mjs

**Document Version:** 2.0
**Status:** Implemented
**Purpose:** Global constants and strategy-dependent configuration for AGISystem2.

---

## 1. Geometry Constants

```javascript
export const DEFAULT_GEOMETRY = 32768;  // Vector dimension in bits
export const MAX_POSITIONS = 20;        // Maximum argument positions
```

---

## 2. Legacy Similarity Thresholds

> **Note:** For new code, use `getThresholds(strategy)` instead.

```javascript
export const SIMILARITY_THRESHOLD = 0.5;
export const STRONG_CONFIDENCE = 0.65;
export const ORTHOGONAL_THRESHOLD = 0.55;
```

---

## 3. Strategy-Dependent Thresholds

### 3.1 Reasoning Thresholds

```javascript
export const REASONING_THRESHOLDS = {
  'dense-binary': { /* from dense-binary-thresholds.mjs */ },
  'sparse-polynomial': { /* from sparse-polynomial-thresholds.mjs */ },
  'metric-affine': { /* from metric-affine.mjs */ },
  'metric-affine-elastic': { /* from metric-affine-elastic.mjs */ },
  'exact': { /* from exact-thresholds.mjs */ }
};

// Get thresholds for a specific strategy
export function getThresholds(strategy = 'dense-binary'): object
```

### 3.2 Holographic Thresholds

```javascript
export const HOLOGRAPHIC_THRESHOLDS = {
  'dense-binary': {
    UNBIND_MIN_SIMILARITY: number,    // Min similarity for unbind candidates
    UNBIND_MAX_CANDIDATES: number,    // Max candidates to validate
    CSP_HEURISTIC_WEIGHT: number,     // Weight for HDC in CSP ordering
    VALIDATION_REQUIRED: boolean,     // Always validate HDC with symbolic
    FALLBACK_TO_SYMBOLIC: boolean     // Fall back if HDC fails
  },
  'sparse-polynomial': { /* ... */ },
  'metric-affine': { /* ... */ },
  'metric-affine-elastic': { /* ... */ },
  'exact': { /* ... */ }
};

// Get holographic thresholds for a specific strategy
export function getHolographicThresholds(strategy = 'dense-binary'): object
```

---

## 4. Reasoning Priority Mode

```javascript
export const REASONING_PRIORITY = {
  SYMBOLIC: 'symbolicPriority',       // Symbolic first, HDC for storage (default)
  HOLOGRAPHIC: 'holographicPriority'  // HDC first, symbolic for validation
};

// Get current reasoning priority from environment
// Reads REASONING_PRIORITY env var, defaults to 'symbolicPriority'
export function getReasoningPriority(): string

// Check if holographic priority mode is enabled
export function isHolographicPriority(): boolean
```

---

## 5. Query Limits

```javascript
export const MAX_HOLES = 3;           // Maximum holes in a query
export const TOP_K_DEFAULT = 5;       // Default top-K results
```

---

## 6. Proof Limits

```javascript
export const MAX_PROOF_DEPTH = 200;      // Maximum proof chain depth
export const PROOF_TIMEOUT_MS = 5000;    // Proof timeout (5 seconds)
export const MAX_REASONING_STEPS = 1000; // Total step limit to prevent loops
```

---

## 7. Decoding Limits

```javascript
export const MAX_NESTING_DEPTH = 3;   // Maximum nested structure depth
```

---

## 8. Reserved Operators

```javascript
export const RESERVED_OPERATORS = [
  'Implies',
  'And',
  'Or',
  'Not',
  'ForAll',
  'Exists'
];
```

---

## 9. Token Types (for Lexer)

```javascript
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
```

---

## 10. Keywords

```javascript
export const KEYWORDS = [
  'theory',
  'import',
  'rule',
  'graph',   // HDC point relationship graph
  'macro',   // deprecated synonym for 'graph'
  'begin',
  'end',
  'return'
];
```

---

## 11. Dependencies

- `../hdc/strategies/dense-binary-thresholds.mjs`
- `../hdc/strategies/sparse-polynomial-thresholds.mjs`
- `../hdc/strategies/metric-affine.mjs`
- `../hdc/strategies/metric-affine-elastic.mjs`
- `../hdc/strategies/exact-thresholds.mjs`

---

## 12. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CONST-01 | DEFAULT_GEOMETRY value | 32768 |
| CONST-02 | MAX_POSITIONS value | 20 |
| CONST-03 | getThresholds('dense-binary') | Returns valid thresholds |
| CONST-04 | getThresholds('sparse-polynomial') | Returns valid thresholds |
| CONST-05 | getThresholds('metric-affine') | Returns valid thresholds |
| CONST-06 | getThresholds('unknown') | Falls back to dense-binary |
| CONST-07 | getHolographicThresholds | Returns holographic config |
| CONST-08 | REASONING_PRIORITY values | Contains SYMBOLIC and HOLOGRAPHIC |
| CONST-09 | getReasoningPriority default | 'symbolicPriority' |
| CONST-10 | isHolographicPriority | false by default |

---

*End of Module Specification*

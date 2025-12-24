# Module: src/reasoning/index.mjs

**Document Version:** 2.0
**Status:** Implemented
**Purpose:** Re-exports all reasoning module components with reasoning priority support.

---

## 1. Overview

The reasoning module provides multiple reasoning engines with automatic selection based on reasoning priority mode:

- **symbolicPriority** (default): Symbolic reasoning first, HDC for storage/verification
- **holographicPriority**: HDC operations first, symbolic for validation

---

## 2. Exported Engines

### 2.1 Core Engines

```javascript
// Primary reasoning engines (symbolic priority)
export { QueryEngine } from './query.mjs';
export { ProofEngine } from './prove.mjs';
export { AbductionEngine } from './abduction.mjs';
export { InductionEngine } from './induction.mjs';
```

### 2.2 Holographic Engines

```javascript
// HDC-first reasoning engines
export { HolographicQueryEngine } from './holographic/query-hdc-first.mjs';
export { HolographicProofEngine } from './holographic/prove-hdc-first.mjs';
```

### 2.3 CSP Solvers

```javascript
// Constraint satisfaction solvers
export { CSPSolver, solveWeddingSeating } from './csp/solver.mjs';

// HDC-enhanced CSP
export {
  HolographicCSPSolver,
  buildConstraintSatisfaction,
  scoreCandidate,
  orderDomainByHDC
} from './holographic/csp-hdc-heuristic.mjs';
```

---

## 3. Factory Functions

### 3.1 createQueryEngine

```javascript
/**
 * Create query engine based on reasoning priority
 * @param {Session} session - Session instance
 * @returns {QueryEngine|HolographicQueryEngine}
 */
export function createQueryEngine(session): QueryEngine | HolographicQueryEngine
```

### 3.2 createProofEngine

```javascript
/**
 * Create proof engine based on reasoning priority
 * @param {Session} session - Session instance
 * @param {Object} options - Proof options
 * @returns {ProofEngine|HolographicProofEngine}
 */
export function createProofEngine(session, options = {}): ProofEngine | HolographicProofEngine
```

### 3.3 createCSPSolver

```javascript
/**
 * Create CSP solver based on reasoning priority
 * @param {Session} session - Session instance
 * @param {Object} options - Solver options
 * @returns {CSPSolver|HolographicCSPSolver}
 */
export function createCSPSolver(session, options = {}): CSPSolver | HolographicCSPSolver
```

---

## 4. Priority Mode Utilities

```javascript
// Re-exported from core/constants.mjs
export { getReasoningPriority, isHolographicPriority, REASONING_PRIORITY };
```

### Priority Selection Logic

```javascript
// Session option takes precedence over environment variable
function sessionIsHolographic(session) {
  if (session?.reasoningPriority === 'holographicPriority') return true;
  if (session?.reasoningPriority === 'symbolicPriority') return false;
  return isHolographicPriority();  // Fall back to env var
}
```

---

## 5. Dependencies

- `./query.mjs` - QueryEngine
- `./prove.mjs` - ProofEngine
- `./abduction.mjs` - AbductionEngine
- `./induction.mjs` - InductionEngine
- `./holographic/query-hdc-first.mjs` - HolographicQueryEngine
- `./holographic/prove-hdc-first.mjs` - HolographicProofEngine
- `./holographic/csp-hdc-heuristic.mjs` - HolographicCSPSolver
- `./csp/solver.mjs` - CSPSolver
- `../core/constants.mjs` - REASONING_PRIORITY, getReasoningPriority, isHolographicPriority

---

## 6. Usage Examples

### Default (Symbolic Priority)

```javascript
import { createQueryEngine, createProofEngine } from './reasoning/index.mjs';

const session = new Session();
const queryEngine = createQueryEngine(session);  // Returns QueryEngine
const proofEngine = createProofEngine(session);  // Returns ProofEngine
```

### Holographic Priority (Environment)

```bash
REASONING_PRIORITY=holographicPriority node app.mjs
```

```javascript
const queryEngine = createQueryEngine(session);  // Returns HolographicQueryEngine
```

### Holographic Priority (Session Option)

```javascript
const session = new Session({ reasoningPriority: 'holographicPriority' });
const queryEngine = createQueryEngine(session);  // Returns HolographicQueryEngine
```

---

## 7. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| REAS-01 | Default creates QueryEngine | instanceof QueryEngine |
| REAS-02 | Default creates ProofEngine | instanceof ProofEngine |
| REAS-03 | Session holographic option | Returns Holographic engines |
| REAS-04 | Env var holographic | Returns Holographic engines |
| REAS-05 | Session option overrides env | Session option wins |
| REAS-06 | AbductionEngine exported | Available for import |
| REAS-07 | InductionEngine exported | Available for import |
| REAS-08 | CSPSolver exported | Available for import |
| REAS-09 | HolographicCSPSolver exported | Available for import |
| REAS-10 | createCSPSolver factory | Returns correct solver type |

---

*End of Module Specification*

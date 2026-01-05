# Module: src/reasoning/holographic/

**Document Version:** 1.0
**Status:** Implemented
**Traces To:** DS17-Holographic-Priority-Mode

---

## 1. Purpose

Holographic reasoning engines that use HDC operations as the primary reasoning mechanism, with symbolic validation as a secondary check. This is the inverse of the default symbolic priority mode.

---

## 2. Module Files

### 2.1 query-hdc-first.mjs

HDC-first query engine using the Master Equation.

```javascript
export class HolographicQueryEngine {
  constructor(session: Session)

  // Execute query using HDC Master Equation first
  execute(statement: AST, options?: QueryOptions): QueryResult
}
```

**Algorithm:**
1. Build query vector from AST (with holes as unknowns)
2. Apply HDC Master Equation: `Answer = KB BIND Query⁻¹`
3. Find top-K similar atoms in vocabulary
4. Validate candidates symbolically
5. Return ranked bindings

### 2.2 prove-hdc-first.mjs

HDC-first proof engine with symbolic validation.

```javascript
export class HolographicProofEngine {
  constructor(session: Session, options?: ProofOptions)

  // Prove goal using HDC similarity first
  prove(goal: AST, options?: ProveOptions): ProofResult
}
```

**Algorithm:**
1. Build goal vector
2. Check similarity against KB bundle
3. If similar: validate with symbolic proof
4. If not similar: try rule application with HDC heuristics
5. Return proof with validation status

### 2.3 csp-hdc-heuristic.mjs

CSP solver enhanced with HDC heuristics.

```javascript
export class HolographicCSPSolver {
  constructor(session: Session, options?: SolverOptions)

  // Solve constraint satisfaction using HDC ordering
  solve(variables: Variable[], constraints: Constraint[]): Solution[]
}

// Helper functions
export function buildConstraintSatisfaction(session, spec): CSPProblem
export function scoreCandidate(session, variable, value, constraints): number
export function orderDomainByHDC(session, variable, constraints): Value[]
```

**HDC Integration:**
- Domain ordering by HDC similarity to constraints
- Candidate scoring using vector similarity
- Early pruning based on HDC distance

---

## 3. Holographic Thresholds

Configured in `core/constants.mjs`:

```javascript
HOLOGRAPHIC_THRESHOLDS = {
  'dense-binary': {
    UNBIND_MIN_SIMILARITY: 0.52,    // Min similarity for candidates
    UNBIND_MAX_CANDIDATES: 10,      // Max candidates to validate
    CSP_HEURISTIC_WEIGHT: 0.7,      // Weight for HDC in CSP
    VALIDATION_REQUIRED: true,      // Always validate with symbolic
    FALLBACK_TO_SYMBOLIC: true      // Fall back if HDC fails
  }
}
```

---

## 4. Usage

### Enable Holographic Priority

**Option 1: Environment Variable**
```bash
REASONING_PRIORITY=holographicPriority node app.mjs
```

**Option 2: Session Option**
```javascript
const session = new Session({ reasoningPriority: 'holographicPriority' });
```

### Engine Selection

Engines are automatically selected based on priority:

```javascript
import { createQueryEngine, createProofEngine, createCSPSolver } from './reasoning/index.mjs';

const session = new Session({ reasoningPriority: 'holographicPriority' });

const queryEngine = createQueryEngine(session);  // → HolographicQueryEngine
const proofEngine = createProofEngine(session);  // → HolographicProofEngine
const cspSolver = createCSPSolver(session);      // → HolographicCSPSolver
```

---

## 5. Dependencies

- `../query.mjs` - Base query utilities
- `../prove.mjs` - Base proof utilities
- `../csp/solver.mjs` - Base CSP solver
- `../../hdc/facade.mjs` - HDC operations
- `../../core/constants.mjs` - Thresholds

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| HOLO-01 | Query with HDC first | Returns bindings |
| HOLO-02 | HDC candidate validation | Validates symbolically |
| HOLO-03 | Fallback to symbolic | Works when HDC fails |
| HOLO-04 | Proof with HDC similarity | Returns valid proof |
| HOLO-05 | CSP with HDC ordering | Faster convergence |
| HOLO-06 | Threshold configuration | Respects thresholds |
| HOLO-07 | Multi-strategy support | Works with all HDC strategies |

---

## 7. Performance Characteristics

| Scenario | Holographic vs Symbolic |
|----------|------------------------|
| Small KB (<50 facts) | Similar performance |
| Medium KB (50-200 facts) | Holographic faster for simple queries |
| Large KB (>200 facts) | Symbolic more accurate |
| Complex proofs | Symbolic more reliable |
| Pattern matching | Holographic excels |

---

*End of Module Specification*

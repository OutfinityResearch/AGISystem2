# Reasoning Statistics Lifecycle Analysis

## Executive Summary

This document analyzes how reasoning statistics are initialized, accumulated, and reset across AGISystem2. The analysis reveals a **clean, session-scoped stats architecture** with **proper isolation between test runs** but identifies some **edge cases around accumulation** and **potential confusion in holographic mode**.

---

## 1. Stats Object Definition & Initialization

### 1.1 Primary Definition Location

**File:** `/home/salboaie/work/AGISystem2/src/runtime/session.mjs` (lines 110-128)

```javascript
this.reasoningStats = {
  queries: 0,
  proofs: 0,
  kbScans: 0,
  similarityChecks: 0,
  ruleAttempts: 0,
  transitiveSteps: 0,
  maxProofDepth: 0,
  minProofDepth: Infinity,  // Track minimum proof depth (M)
  totalProofSteps: 0,       // Successful proof chain steps
  totalReasoningSteps: 0,   // ALL reasoning attempts (including backtracking)
  proofLengths: [],
  methods: {},
  operations: {},
  // HDC-specific stats
  hdcQueries: 0,         // Total queries using HDC Master Equation
  hdcSuccesses: 0,       // HDC queries that found results
  hdcBindings: 0         // Total bindings found via HDC
};
```

### 1.2 Field Semantics

| Field | Type | Purpose | When Incremented |
|-------|------|---------|------------------|
| `queries` | number | Total query() calls | Once per query() invocation |
| `proofs` | number | Total prove() calls | Once per prove() invocation |
| `kbScans` | number | KB fact iterations | Every KB.forEach or KB scan loop |
| `similarityChecks` | number | HDC similarity computations | Every similarity(a, b) call |
| `ruleAttempts` | number | Rule application attempts | Per Implies rule evaluation |
| `transitiveSteps` | number | Transitive chain traversals | Per isA/locatedIn/partOf step |
| `maxProofDepth` | number | Deepest proof found | Updated if current > max |
| `minProofDepth` | number | Shallowest proof found | Updated if current < min (starts at Infinity) |
| `totalProofSteps` | number | Sum of all proof lengths | Accumulated after each query/prove |
| `totalReasoningSteps` | number | Total reasoning attempts (including backtracking) | From prove() result |
| `proofLengths` | array | Individual proof depths | One entry per query/prove |
| `methods` | object | Method usage counts | Incremented by trackMethod() |
| `operations` | object | Operation counts | Incremented by trackOperation() |
| `hdcQueries` | number | HDC Master Equation uses | Per HDC unbind operation |
| `hdcSuccesses` | number | Successful HDC queries | When HDC finds results |
| `hdcBindings` | number | Bindings from HDC | Count of HDC matches |

---

## 2. Stats Accumulation Patterns

### 2.1 Query Path Stats

**File:** `/home/salboaie/work/AGISystem2/src/runtime/session-query.mjs` (lines 28-42)

```javascript
session.reasoningStats.queries++;

// Queries count as depth 5 for averaging (require KB traversal)
const QUERY_DEPTH = 5;
session.reasoningStats.proofLengths.push(QUERY_DEPTH);
session.reasoningStats.totalProofSteps += QUERY_DEPTH;
if (QUERY_DEPTH < session.reasoningStats.minProofDepth) {
  session.reasoningStats.minProofDepth = QUERY_DEPTH;
}

if (result.success) {
  const method = result.allResults?.[0]?.method || 'query_match';
  session.trackMethod(method);
  session.trackOperation('query_search');
}
```

**Issue:** Fixed depth of 5 for all queries - doesn't account for actual KB size or complexity.

### 2.2 Prove Path Stats

**File:** `/home/salboaie/work/AGISystem2/src/runtime/session-prove.mjs` (lines 36-60)

```javascript
session.reasoningStats.proofs++;

const DEFAULT_SEARCH_DEPTH = 5;
const MIN_PROOF_DEPTH = 3;
let proofLength;
if (!result.valid) {
  proofLength = DEFAULT_SEARCH_DEPTH;
} else {
  const actualSteps = result.steps?.length || 1;
  proofLength = Math.max(MIN_PROOF_DEPTH, actualSteps);
}
session.reasoningStats.proofLengths.push(proofLength);
session.reasoningStats.totalProofSteps += proofLength;
if (proofLength > session.reasoningStats.maxProofDepth) {
  session.reasoningStats.maxProofDepth = proofLength;
}
if (proofLength > 0 && proofLength < session.reasoningStats.minProofDepth) {
  session.reasoningStats.minProofDepth = proofLength;
}
if (result.reasoningSteps) {
  session.reasoningStats.totalReasoningSteps += result.reasoningSteps;
}
```

**Good:** Uses actual step count when available. Failed proofs use default depth of 5.

### 2.3 HDC Stats Tracking

**File:** `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs` (lines 163-168)

```javascript
// Track HDC usage
this.session.reasoningStats.hdcQueries++;
if (hdcMatches.length > 0) {
  this.session.reasoningStats.hdcSuccesses++;
  this.session.reasoningStats.hdcBindings += hdcMatches.length;
}
```

### 2.4 Low-Level Stats (KB Scans, Similarity Checks)

These are incremented throughout the reasoning codebase:

**Locations:**
- `src/reasoning/kb-matching.mjs` (lines 76, 77, 119, 170, 310, 391)
- `src/reasoning/query-kb.mjs` (lines 28, 87, 105, 233)
- `src/reasoning/query-meta-ops.mjs` (lines 58, 65, 83, 194, 262, 318, 325, 386, 502, 536, 573, 596)
- `src/reasoning/transitive.mjs` (lines 90, 157, 174, 214)
- `src/reasoning/property-inheritance.mjs` (lines 146, 178, 197, 270)
- `src/reasoning/prove/prove-goal.mjs` (line 206)
- `src/reasoning/conditions/single.mjs` (lines 123, 162, 190)
- `src/reasoning/csp/solver.mjs` (line 197)
- `src/reasoning/csp/constraint.mjs` (lines 77, 253)

**Pattern:** Direct increment via `session.reasoningStats.kbScans++` at scan sites.

---

## 3. Stats Reset Mechanism

### 3.1 Reset Implementation

**File:** `/home/salboaie/work/AGISystem2/src/runtime/session-stats.mjs` (lines 20-28)

```javascript
if (reset) {
  session.reasoningStats = {
    queries: 0, proofs: 0, kbScans: 0, similarityChecks: 0,
    ruleAttempts: 0, transitiveSteps: 0, maxProofDepth: 0,
    minProofDepth: Infinity, totalProofSteps: 0, totalReasoningSteps: 0,
    proofLengths: [], methods: {}, operations: {},
    hdcQueries: 0, hdcSuccesses: 0, hdcBindings: 0
  };
}
```

### 3.2 When Reset Occurs

**Stats are reset ONLY when explicitly requested:**

```javascript
// Manual reset
const stats = session.getReasoningStats(reset = true);
```

**Stats are NOT automatically reset:**
- Between queries
- Between proofs
- Between learn operations
- Between sessions (different session objects)

---

## 4. Stats Lifecycle in Evaluation Runs

### 4.1 Suite-Level Stats Management

**File:** `/home/salboaie/work/AGISystem2/evals/fastEval/lib/runner.mjs` (lines 822-869)

```javascript
// Create ONE session per suite
const session = new Session({
  geometry,
  hdcStrategy: strategyId,
  reasoningPriority,
  ...(suite.sessionOptions || {})
});

// Load theories ONCE
loadCoreTheories(session);
loadDeclaredTheories(session, suite.declaredTheories, loadedTheories);

// Run all test cases (stats accumulate across cases)
for (const step of suite.cases) {
  const result = await runCase(step, session, suiteConfig);
  results.push(result);
}

// Get cumulative stats for the entire suite
const reasoningStats = session.getReasoningStats();
session.close();  // Cleanup
```

**Key Points:**
- **ONE session per suite** - stats accumulate across all test cases
- Stats represent **aggregate suite performance**, not per-test
- `session.close()` cleans up but doesn't reset stats (stats already captured)

### 4.2 Cross-Suite Aggregation

**File:** `/home/salboaie/work/AGISystem2/evals/fastEval/lib/reporter.mjs` (lines 255-340)

```javascript
const aggregatedStats = {
  queries: 0,
  proofs: 0,
  kbScans: 0,
  similarityChecks: 0,
  ruleAttempts: 0,
  transitiveSteps: 0,
  minProofDepth: Infinity,
  maxProofDepth: 0,
  totalProofSteps: 0,
  hdcQueries: 0,
  hdcSuccesses: 0,
  hdcBindings: 0,
  methods: {},
  operations: {}
};

for (const suite of suiteResults) {
  const stats = suite.summary.reasoningStats || {};
  aggregatedStats.queries += stats.queries || 0;
  aggregatedStats.proofs += stats.proofs || 0;
  aggregatedStats.kbScans += stats.kbScans || 0;
  aggregatedStats.similarityChecks += stats.similarityChecks || 0;
  // ... etc

  // Track minimum across all suites
  const suiteMin = stats.minProofDepth || 0;
  if (suiteMin > 0 && suiteMin < aggregatedStats.minProofDepth) {
    aggregatedStats.minProofDepth = suiteMin;
  }

  // Aggregate HDC stats from both symbolic and holographic modes
  aggregatedStats.hdcQueries += stats.hdcQueries || 0;
  aggregatedStats.hdcSuccesses += stats.hdcSuccesses || 0;
  aggregatedStats.hdcBindings += stats.hdcBindings || 0;

  // Holographic mode stats (mapped to same display)
  const holoOps = (stats.holographicQueries || 0) + (stats.holographicProofs || 0);
  const holoSuccesses = (stats.holographicQueryHdcSuccesses || 0) + (stats.hdcProofSuccesses || 0);
  aggregatedStats.hdcQueries += holoOps;
  aggregatedStats.hdcSuccesses += holoSuccesses;
}
```

**Good:** Properly aggregates stats across suites while maintaining min/max semantics.

---

## 5. Engine-Specific Stats

### 5.1 Symbolic Engine Stats

The symbolic query/proof engines track:
- `kbScans` - KB iterations
- `similarityChecks` - HDC similarity calls
- `ruleAttempts` - Rule applications
- `transitiveSteps` - Transitive chain hops
- `hdcQueries` - HDC Master Equation uses
- `hdcSuccesses` - Successful HDC results
- `hdcBindings` - Bindings from HDC

### 5.2 Holographic Engine Stats

**File:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs` (lines 59-61)

```javascript
// Track holographic stats
this.session.reasoningStats.holographicQueries =
  (this.session.reasoningStats.holographicQueries || 0) + 1;
```

**File:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs` (lines 69-71, 91-93)

```javascript
// Track holographic stats
this.session.reasoningStats.holographicProofs =
  (this.session.reasoningStats.holographicProofs || 0) + 1;

// On success:
this.session.reasoningStats.hdcProofSuccesses =
  (this.session.reasoningStats.hdcProofSuccesses || 0) + 1;
```

**Holographic-specific fields:**
- `holographicQueries` - Total holographic query calls
- `holographicQueryHdcSuccesses` - HDC-first queries that produced at least one validated (usable) result
- `holographicProofs` - Total holographic proof calls
- `hdcUnbindSuccesses` - Queries where unbind produced candidates (may still fail validation)
- `hdcProofSuccesses` - Successful HDC proofs

**Reporter maps these to display stats:**

```javascript
// Combine symbolic + holographic HDC ops for display
const hdcQ = (stats.hdcQueries || 0) + (stats.holographicQueries || 0) + (stats.holographicProofs || 0);
const hdcS = (stats.hdcSuccesses || 0) + (stats.holographicQueryHdcSuccesses || 0) + (stats.hdcProofSuccesses || 0);
```

### 5.3 No Race Conditions - Single-Threaded

All stat updates are **synchronous** and **single-threaded** (JavaScript event loop):
- No locks needed
- No race conditions
- Stats accumulate deterministically

---

## 6. Issues and Edge Cases

### 6.1 🟡 Query Depth Fixed at 5

**Issue:** All queries counted as depth 5 regardless of complexity.

**Location:** `/home/salboaie/work/AGISystem2/src/runtime/session-query.mjs:31`

```javascript
const QUERY_DEPTH = 5;  // Hardcoded
```

**Impact:**
- `avgProofLength` may not reflect actual query complexity
- Simple direct matches get same weight as complex transitive queries

**Recommendation:** Consider tracking actual KB scans or reasoning steps per query.

### 6.2 🟡 Proof Depth Minimum Clamped at 3

**Issue:** Successful proofs are clamped to minimum depth of 3.

**Location:** `/home/salboaie/work/AGISystem2/src/runtime/session-prove.mjs:39-45`

```javascript
const MIN_PROOF_DEPTH = 3;
let proofLength;
if (!result.valid) {
  proofLength = DEFAULT_SEARCH_DEPTH;  // 5
} else {
  const actualSteps = result.steps?.length || 1;
  proofLength = Math.max(MIN_PROOF_DEPTH, actualSteps);  // Min 3
}
```

**Impact:**
- Direct KB matches (1 step) reported as 3 steps
- `minProofDepth` never goes below 3 for successful proofs
- Stats skewed upward for simple proofs

**Rationale:** May be intentional to account for overhead (parse + resolve + match).

### 6.3 🟢 Stats Isolation Between Suites - CORRECT

**Good:** Each suite gets fresh session with zeroed stats.

```javascript
// runner.mjs line 822
const session = new Session({...});  // Fresh stats
// ... run suite ...
const reasoningStats = session.getReasoningStats();  // Capture
session.close();  // Cleanup
```

**No accumulation bugs** between suites.

### 6.4 🟡 Stats Accumulate Within Suite - Intended Behavior

**Observation:** Stats accumulate across all test cases in a suite.

**Example:**
- Suite with 20 test cases
- Each case does 1 query
- `reasoningStats.queries = 20` at end

**Impact:**
- `kbScans` can reach thousands for large suites
- Stats represent **suite aggregate**, not per-test

**Recommendation:** Document this clearly. If per-test stats needed, capture before/after each case.

### 6.5 🟡 Holographic Stats Not in Reset Template

**Issue:** Holographic-specific fields not initialized in reset.

**Location:** `/home/salboaie/work/AGISystem2/src/runtime/session-stats.mjs:21-27`

```javascript
session.reasoningStats = {
  queries: 0, proofs: 0, kbScans: 0, similarityChecks: 0,
  ruleAttempts: 0, transitiveSteps: 0, maxProofDepth: 0,
  minProofDepth: Infinity, totalProofSteps: 0, totalReasoningSteps: 0,
  proofLengths: [], methods: {}, operations: {},
  hdcQueries: 0, hdcSuccesses: 0, hdcBindings: 0
  // Missing: holographicQueries, holographicProofs, hdcUnbindSuccesses, hdcProofSuccesses
};
```

**Impact:**
- Reset doesn't clear holographic stats
- Only matters if reset is used (currently rare)

**Recommendation:** Add holographic fields to reset template for consistency.

### 6.6 🟢 No Race Conditions - Confirmed

**Analysis:** All stats updates are:
- Synchronous
- Single-threaded (Node.js event loop)
- Local to session object

**No concurrency issues possible.**

---

## 7. Stats Retrieval and Averaging

### 7.1 getReasoningStats() Implementation

**File:** `/home/salboaie/work/AGISystem2/src/runtime/session-stats.mjs` (lines 9-31)

```javascript
export function getReasoningStats(session, reset = false) {
  const stats = { ...session.reasoningStats };  // Shallow copy

  // Compute average proof length
  stats.avgProofLength = stats.proofLengths.length > 0
    ? (stats.totalProofSteps / stats.proofLengths.length).toFixed(1)
    : 0;

  // Handle Infinity case for minProofDepth
  if (stats.minProofDepth === Infinity) {
    stats.minProofDepth = 0;
  }

  // Remove internal array (not needed in output)
  delete stats.proofLengths;

  if (reset) {
    session.reasoningStats = { /* fresh init */ };
  }

  return stats;
}
```

**Good:**
- Non-destructive (copies stats)
- Computes derived metrics
- Cleans up internals

---

## 8. Summary & Recommendations

### 8.1 Architecture Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Initialization | 🟢 Good | Clean, well-documented structure |
| Accumulation | 🟢 Good | Consistent patterns throughout codebase |
| Reset | 🟡 Minor | Missing holographic fields in template |
| Isolation | 🟢 Good | Proper session-scoped stats |
| Race Conditions | 🟢 None | Single-threaded, synchronous |
| Aggregation | 🟢 Good | Proper cross-suite summation |
| Documentation | 🟡 Partial | Field semantics not fully documented |

### 8.2 Recommended Improvements

#### High Priority
None - architecture is sound.

#### Medium Priority

1. **Add holographic fields to reset template**
   ```javascript
   // session-stats.mjs line 21
   session.reasoningStats = {
     // ... existing fields ...
     holographicQueries: 0,
     holographicProofs: 0,
     hdcUnbindSuccesses: 0,
     hdcProofSuccesses: 0
   };
   ```

2. **Document stats semantics**
   - Add JSDoc comments to stats object
   - Clarify suite vs. per-test accumulation
   - Document depth constants (QUERY_DEPTH=5, MIN_PROOF_DEPTH=3)

#### Low Priority

3. **Consider dynamic query depth**
   ```javascript
   // Instead of fixed QUERY_DEPTH = 5
   const queryDepth = result.reasoningSteps || 5;
   ```

4. **Add per-test stats option**
   ```javascript
   // runner.mjs
   const beforeStats = session.getReasoningStats();
   await runCase(testCase, session, config);
   const afterStats = session.getReasoningStats();
   const deltaStats = computeDelta(beforeStats, afterStats);
   ```

---

## 9. Conclusion

The reasoning statistics system in AGISystem2 is **well-designed and robust**:

✅ **Strengths:**
- Clean session-scoped architecture
- No race conditions or accumulation bugs
- Proper isolation between suites
- Good aggregation logic across suites
- Comprehensive coverage of reasoning operations

⚠️ **Minor Issues:**
- Fixed query depth constant
- Holographic fields missing from reset template
- Limited documentation of field semantics

The system correctly tracks reasoning performance across evaluation runs with **no fundamental bugs**. The identified issues are minor and mostly documentation-related.

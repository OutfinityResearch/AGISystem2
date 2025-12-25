# HDC% Metric Analysis

## Executive Summary

The **HDC%** metric measures the success rate of Hyperdimensional Computing (HDC) vector operations in the AGISystem2 reasoning engine. It represents the percentage of HDC-based reasoning attempts that successfully produced valid results.

**Formula:**
```
HDC% = (HDC Successes / HDC Queries) × 100
```

**Key Finding:** The HDC% metric currently has **significant gaps** in what it counts, particularly for holographic-priority mode and CSP-based reasoning.

---

## 1. How HDC% is Calculated

### 1.1 Basic Calculation (Symbolic-First Mode)

**Location:** `/home/salboaie/work/AGISystem2/evals/fastEval/lib/reporter.mjs`

**Per-Suite Calculation (lines 373-376):**
```javascript
const hdcQ = (stats.hdcQueries || 0) + (stats.holographicQueries || 0) + (stats.holographicProofs || 0);
const hdcS = (stats.hdcSuccesses || 0) + (stats.holographicQueryHdcSuccesses || 0) + (stats.hdcProofSuccesses || 0);
const hdcPct = hdcQ > 0 ? Math.floor((hdcS / hdcQ) * 100) : 0;
```

**Global Total Calculation (lines 425-428):**
```javascript
const totalHdcPct = aggregatedStats.hdcQueries > 0
  ? Math.floor((aggregatedStats.hdcSuccesses / aggregatedStats.hdcQueries) * 100)
  : 0;
```

### 1.2 Numerator: What Counts as "Success"

**Tracked Success Counters:**

1. **`hdcSuccesses`** (Symbolic engine)
   - Incremented when HDC Master Equation finds at least one match
   - **Location:** `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs:166`
   ```javascript
   if (hdcMatches.length > 0) {
     this.session.reasoningStats.hdcSuccesses++;
     this.session.reasoningStats.hdcBindings += hdcMatches.length;
   }
   ```

2. **`holographicQueryHdcSuccesses`** (Holographic query engine)
   - Incremented when at least one HDC candidate validates (i.e., HDC produced a usable result)
   - **Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs`
   ```javascript
   this.session.reasoningStats.holographicQueryHdcSuccesses =
     (this.session.reasoningStats.holographicQueryHdcSuccesses || 0) + 1;
   ```

3. **`hdcProofSuccesses`** (Holographic proof engine)
   - Incremented when HDC-first proof succeeds
   - **Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs:92-93`
   ```javascript
   this.session.reasoningStats.hdcProofSuccesses =
     (this.session.reasoningStats.hdcProofSuccesses || 0) + 1;
   ```

### 1.3 Denominator: What Counts as a "Query"

**Tracked Query Counters:**

1. **`hdcQueries`** (Symbolic engine)
   - Incremented for EVERY query execution in symbolic mode
   - **Location:** `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs:164`
   ```javascript
   // Track HDC usage
   this.session.reasoningStats.hdcQueries++;
   ```

2. **`holographicQueries`** (Holographic query engine)
   - Incremented for each query in HDC-first mode
   - **Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs:60-61`
   ```javascript
   this.session.reasoningStats.holographicQueries =
     (this.session.reasoningStats.holographicQueries || 0) + 1;
   ```

3. **`holographicProofs`** (Holographic proof engine)
   - Incremented for each proof attempt in HDC-first mode
   - **Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs:70-71`
   ```javascript
   this.session.reasoningStats.holographicProofs =
     (this.session.reasoningStats.holographicProofs || 0) + 1;
   ```

---

## 2. What Qualifies as an "HDC Operation"

### 2.1 HDC Operations (Currently Counted)

**Primary HDC Operation: Master Equation Search**

The core HDC operation is the **Master Equation**:
```
Answer = KB ⊕ Query⁻¹
```

**Implementation:** `/home/salboaie/work/AGISystem2/src/reasoning/query-hdc.mjs:174-299`

**Steps:**
1. Build partial vector (operator + known arguments)
2. Bundle all KB facts into single KB vector
3. Unbind: `answer = unbind(kbBundle, partial)`
4. For each hole, extract candidates: `candidate = unbind(answer, positionVector)`
5. Find top-K similar in vocabulary using `topKSimilar()`
6. Verify candidates with symbolic proof

**Key Point:** This is the ONLY place where `hdcQueries` is incremented in symbolic mode.

### 2.2 Symbolic Operations (NOT Counted as HDC)

Even though these use HDC similarity internally, they are NOT counted toward HDC%:

1. **Direct KB Matching** (`query-kb.mjs`)
   - Uses `similarity()` for vector comparison
   - Tracked as `kbScans` and `similarityChecks`
   - **NOT** tracked as HDC operation

2. **Transitive Reasoning** (`transitive.mjs`)
   - Uses KB scans and similarity checks
   - Tracked as `transitiveSteps`
   - **NOT** tracked as HDC operation

3. **Property Inheritance** (`property-inheritance.mjs`)
   - Uses similarity for type matching
   - Tracked as `kbScans`
   - **NOT** tracked as HDC operation

4. **Rule Derivation** (`query-rules.mjs`)
   - Uses symbolic unification
   - Tracked as `ruleAttempts`
   - **NOT** tracked as HDC operation

---

## 3. HDC Operations That Are NOT Being Counted

### 3.1 Missing: HDC Validation Operations

**Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs:113-120`

```javascript
this.session.reasoningStats.hdcValidationAttempts =
  (this.session.reasoningStats.hdcValidationAttempts || 0) + 1;

if (validation.valid) {
  this.session.reasoningStats.hdcValidationSuccesses =
    (this.session.reasoningStats.hdcValidationSuccesses || 0) + 1;
}
```

**Issue:** These stats are tracked but **NOT included in HDC% calculation**.

**Impact:** Validation is a critical HDC operation that determines whether unbind results are valid.

### 3.2 Missing: HDC CSP Operations

**Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/csp-hdc-heuristic.mjs`

```javascript
this.session.reasoningStats.holographicCSP =
  (this.session.reasoningStats.holographicCSP || 0) + 1;

this.session.reasoningStats.cspBundleBuilt =
  (this.session.reasoningStats.cspBundleBuilt || 0) + 1;

this.session.reasoningStats.cspSymbolicFallback =
  (this.session.reasoningStats.cspSymbolicFallback || 0) + 1;
```

**Issue:** CSP-based HDC operations are tracked separately but **NOT counted in HDC%**.

**Impact:** CSP operations use HDC bundling for constraint satisfaction - these should count.

### 3.3 Missing: HDC Direct Match in Proofs

**Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs:238-299`

The `hdcDirectSearch()` method performs HDC similarity searches:
- Scans all KB facts (increments `kbScans`)
- Computes similarity (increments `similarityChecks`)
- Uses synonym/canonical matching via ComponentKB

**Issue:** This is pure HDC operation but only tracked as `kbScans`/`similarityChecks`, not as HDC operation.

### 3.4 Missing: Level-Progressive HDC Search

**Location:** `/home/salboaie/work/AGISystem2/src/reasoning/query-hdc.mjs:342-467`

```javascript
export function searchHDCByLevel(session, operatorName, knowns, holes, operatorVec, partial, thresholds) {
  // Searches level by level using unbind operations
  // Each level performs multiple unbind + topKSimilar operations
  // Returns method: 'hdc_level'
}
```

**Issue:** Level-progressive search performs multiple HDC unbind operations per query but only increments `hdcQueries` once.

---

## 4. Strategy-Specific Counting Behavior

### 4.1 Symbolic-First Mode (Default)

**Engine:** `QueryEngine` in `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs`

**Counting:**
- **Query attempt:** `hdcQueries++` (line 164)
- **Success:** `hdcSuccesses++` if `hdcMatches.length > 0` (line 166)
- **Bindings:** `hdcBindings += hdcMatches.length` (line 167)

**Behavior:**
- HDC is one of multiple sources (HDC, Direct, Transitive, Rules, etc.)
- All sources contribute to final result
- HDC results may be replaced by higher-priority methods (Direct > Transitive > HDC)

### 4.2 HDC-First Mode (Holographic Priority)

**Engine:** `HolographicQueryEngine` in `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs`

**Counting:**
- **Query attempt:** `holographicQueries++` (line 60-61)
- **Unbind attempt:** `hdcUnbindAttempts++` (line 102-103)
- **Unbind success:** `hdcUnbindSuccesses++` if candidates found (line 106-107)
- **Validation attempt:** `hdcValidationAttempts++` per candidate (line 113-114)
- **Validation success:** `hdcValidationSuccesses++` if valid (line 119-120)

**Behavior:**
- HDC unbind produces candidates
- Each candidate validated with symbolic proof
- Symbolic results merged as supplements
- **Problem:** Only `holographicQueries` and `hdcUnbindSuccesses` count toward HDC%

### 4.3 Hybrid Mode

**Engine:** Both engines used depending on query complexity

**Counting:**
- Uses whichever engine handles the query
- Stats accumulate from both engines

---

## 5. Detailed Counting Gaps

### Gap 1: Validation Operations Not Counted

**Current:**
```javascript
// Only counts unbind success
if (candidates.length > 0) {
  hdcUnbindSuccesses++;
}
```

**Problem:** Validation determines actual usability of HDC results but isn't counted.

**Impact:**
- A query with 10 candidates but 0 validated = 100% HDC success (misleading!)
- True success should be based on validated results

### Gap 2: Multiple Unbind Operations Per Query

**Current:**
```javascript
// Only increments once per query
hdcQueries++;

// But performs multiple unbinds internally:
for (let level = 0; level <= maxLevel; level++) {
  const answer = unbind(levelBundle, partial);  // Not counted individually
  const candidate = unbind(answer, posVec);     // Not counted individually
}
```

**Problem:** A single "query" may involve 5+ unbind operations internally.

### Gap 3: CSP and Wedding-Table Problems

**Location:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/csp-hdc-heuristic.mjs`

```javascript
this.session.reasoningStats.holographicCSP = (this.session.reasoningStats.holographicCSP || 0) + 1;
this.session.reasoningStats.holographicWedding = (this.session.reasoningStats.holographicWedding || 0) + 1;
```

**Problem:** These are complex HDC operations but tracked separately from HDC%.

### Gap 4: Prove Operations Using HDC

**Location:** Holographic prove engine uses HDC similarity extensively:

```javascript
// HDC direct search (line 238-299)
for (const fact of this.session.kbFacts) {
  this.session.reasoningStats.kbScans++;
  this.session.reasoningStats.similarityChecks++;
  const sim = similarity(goalVec, fact.vector);
}
```

**Problem:** These are HDC operations but only counted as `similarityChecks`.

---

## 6. Interpretation Guide

### What HDC% DOES Tell You

1. **In Symbolic-First Mode:**
   - Percentage of queries where HDC Master Equation found matches
   - Baseline: "How often does pure HDC unbind work?"

2. **In HDC-First Mode:**
   - Percentage of queries where HDC unbind found candidates
   - Does NOT account for validation success rate

### What HDC% Does NOT Tell You

1. **Validation Success Rate**
   - Many unbind candidates fail validation
   - HDC% may be high but actual usable results low

2. **HDC Operation Intensity**
   - One query may involve 10+ unbind operations
   - HDC% treats all queries equally

3. **Prove Operation HDC Usage**
   - Prove operations use HDC similarity extensively
   - Not reflected in HDC% at all

4. **CSP/Complex Reasoning HDC Usage**
   - Advanced HDC operations tracked separately
   - Not included in standard HDC%

---

## 7. Recommendations for Improved Metrics

### Option A: Separate Metrics

```
HDC Unbind Success Rate = hdcSuccesses / hdcQueries
HDC Validation Rate = hdcValidationSuccesses / hdcValidationAttempts
HDC Proof Rate = hdcProofSuccesses / holographicProofs
```

### Option B: Weighted HDC Score

```
HDC Score = (
  0.4 × (unbind successes / unbind attempts) +
  0.4 × (validation successes / validation attempts) +
  0.2 × (proof successes / proof attempts)
) × 100
```

### Option C: Comprehensive HDC Operations Counter

Track ALL unbind/bind operations:
```javascript
session.reasoningStats.hdcOperations = {
  unbind: { attempts: N, successes: M },
  bind: { attempts: N, successes: M },
  topKSimilar: { calls: N, avgCandidates: M },
  validation: { attempts: N, successes: M }
};
```

---

## 8. Current Stats Initialization

**Location:** `/home/salboaie/work/AGISystem2/src/runtime/session.mjs:110-128`

```javascript
this.reasoningStats = {
  queries: 0,
  proofs: 0,
  kbScans: 0,
  similarityChecks: 0,
  ruleAttempts: 0,
  transitiveSteps: 0,
  maxProofDepth: 0,
  minProofDepth: Infinity,
  totalProofSteps: 0,
  totalReasoningSteps: 0,
  proofLengths: [],
  methods: {},
  operations: {},
  // HDC-specific stats
  hdcQueries: 0,         // Total queries using HDC Master Equation
  hdcSuccesses: 0,       // HDC queries that found results
  hdcBindings: 0         // Total bindings found via HDC
};
```

**Missing from initialization:**
- `holographicQueries`
- `holographicProofs`
- `hdcUnbindAttempts`
- `hdcUnbindSuccesses`
- `hdcValidationAttempts`
- `hdcValidationSuccesses`
- `hdcProofSuccesses`
- `symbolicProofFallbacks`
- `holographicCSP`
- `cspBundleBuilt`
- `cspSymbolicFallback`

---

## 9. Code Locations Summary

### Stats Initialization
- **Session:** `/home/salboaie/work/AGISystem2/src/runtime/session.mjs:110-128`
- **Stats Module:** `/home/salboaie/work/AGISystem2/src/runtime/session-stats.mjs`

### Counting Logic

#### Symbolic Engine
- **Query HDC:** `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs:164-167`
- **HDC Master Equation:** `/home/salboaie/work/AGISystem2/src/reasoning/query-hdc.mjs:174-299`

#### Holographic Engine
- **Query:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs`
  - Line 60-61: `holographicQueries++`
  - Line 102-107: `hdcUnbindAttempts++`, `hdcUnbindSuccesses++`
  - Line 113-120: `hdcValidationAttempts++`, `hdcValidationSuccesses++`

- **Prove:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs`
  - Line 70-71: `holographicProofs++`
  - Line 92-93: `hdcProofSuccesses++`
  - Line 101-102: `symbolicProofFallbacks++`

#### CSP Operations
- **CSP HDC:** `/home/salboaie/work/AGISystem2/src/reasoning/holographic/csp-hdc-heuristic.mjs`
  - Line 259-260: `holographicCSP++`
  - Line 267-268: `cspBundleBuilt++`
  - Line 304-305: `cspSymbolicFallback++`
  - Line 449-450: `holographicWedding++`

### Reporting/Display
- **Reporter:** `/home/salboaie/work/AGISystem2/evals/fastEval/lib/reporter.mjs`
  - Line 267-269: Aggregated stats initialization
  - Line 338-347: Per-suite HDC aggregation
  - Line 373-376: Per-suite HDC% calculation
  - Line 425-428: Global HDC% calculation
  - Line 573-574: Multi-strategy HDC aggregation
  - Line 639-641: Per-config HDC% calculation

---

## 10. Conclusion

**HDC%** is a useful but incomplete metric. It captures the success rate of the HDC Master Equation in isolation but misses:

1. Validation success (critical for holographic mode)
2. Multiple unbind operations within a single query
3. HDC operations in proof search
4. CSP and advanced reasoning HDC usage
5. Level-progressive search complexity

**For accurate assessment of HDC effectiveness, consider:**
- `hdcValidationSuccesses / hdcValidationAttempts` (validation rate)
- `hdcProofSuccesses / holographicProofs` (proof success rate)
- `kbScans` and `similarityChecks` (HDC operation intensity)
- Individual suite results vs global aggregates

The current HDC% is best interpreted as **"HDC Master Equation baseline success rate"** rather than **"total HDC system effectiveness"**.
**Related (not part of HDC%):**
- `hdcUnbindSuccesses` - counts queries where unbind produced candidates (can be >0 even if none validate)
- `hdcValidationAttempts` / `hdcValidationSuccesses` - per-candidate validation stats (useful as “validation hit-rate”)

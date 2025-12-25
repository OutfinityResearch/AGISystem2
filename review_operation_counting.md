# Operation Counting Review - AGISystem2

## Executive Summary

This report analyzes the operation counting metrics displayed in the evaluation suite output:
- **HDC%** | 59% (29/49)
- **KB Scans** | 3.2M
- **Sim Checks** | 38.3K

**Key Findings**:
1. **KB Scans undercounted by ~40%** - 25+ locations missing `kbScans++`
2. **Similarity Checks undercounted by ~75%** - 33+ uncounted calls, especially `topKSimilar()` bulk operations
3. **HDC% is incomplete** - Validation and CSP operations not included in formula
4. **HDC-first engine shows 2-3x higher counts** - Due to mandatory validation + symbolic fallback redundancy
5. **15+ categories of expensive operations** are not tracked at all

---

## 1. KB Scan Counting Analysis

### 1.1 What Should Be Counted

Every iteration over `session.kbFacts` should increment `kbScans++`. This includes:
- Direct KB iteration loops: `for (const fact of session.kbFacts)`
- ComponentKB index calls: `componentKB.findByOperator()`, `findByArg0()`, etc.
- Filter operations: `session.kbFacts.filter(...)`

### 1.2 Locations WITH Proper Counting (18 locations)

| File | Lines | Context |
|------|-------|---------|
| `src/reasoning/query-kb.mjs` | 28, 87, 105, 233 | Direct KB searches |
| `src/reasoning/kb-matching.mjs` | 76, 119, 170 | Fact pattern matching |
| `src/reasoning/transitive.mjs` | 157, 214 | Transitive relation search |
| `src/reasoning/query-meta-ops.mjs` | 58, 65, 83, 194, 262, 318, 325, 386, 502, 536, 573, 596 | Meta-operations |
| `src/reasoning/property-inheritance.mjs` | 146, 178, 197 | Property inheritance |
| `src/reasoning/holographic/prove-hdc-first.mjs` | 245, 447, 547, 702 | HDC-first proof |
| `src/reasoning/csp/solver.mjs` | 197 | CSP solver |

### 1.3 Locations MISSING Counting (25+ locations) - **BUGS**

| File | Lines | Context | Impact |
|------|-------|---------|--------|
| `src/reasoning/query-transitive.mjs` | 117, 163, 193, 239 | All transitive queries | **HIGH** - transitive queries heavily scan KB |
| `src/reasoning/query-rules.mjs` | 270, 295, 358 | Rule condition matching | **HIGH** - rule matching is frequent |
| `src/reasoning/query-inheritance.mjs` | 97, 146, 203, 237, 272, 303, 334 | Inheritance chains | **MEDIUM** - inheritance fallback paths |
| `src/runtime/session-contradictions.mjs` | 230, 269, 361 | Contradiction checking | **MEDIUM** - contradiction checks on KB updates |
| `src/reasoning/query-hdc.mjs` | 132 | HDC exact existence check | **LOW** - single iteration |
| `src/reasoning/prove/prove-goal-exists.mjs` | 61, 81 | Instance collection | **LOW** - exists queries |
| `src/reasoning/proof-schema.mjs` | 42 | Fact ID lookup | **LOW** - schema operations |
| `src/reasoning/holographic/csp-hdc-heuristic.mjs` | 458, 483 | CSP guest/table collection | **MEDIUM** - wedding problem |

### 1.4 Filter Operations - NEVER Counted

All `.filter()` calls on `session.kbFacts` iterate the entire KB but are **not counted**:

| File | Line | Pattern |
|------|------|---------|
| `src/reasoning/induction.mjs` | 83, 171 | `session.kbFacts.filter(f => ...)` |
| `src/reasoning/query-compound.mjs` | 81 | `session.kbFacts.filter(...)` for CSP solutions |
| `src/reasoning/query-inheritance.mjs` | 128 | Inheritance filter |

### 1.5 Inconsistency Within Same File

**`query-inheritance.mjs`** has both counted and uncounted loops:
- Line 51: ✅ COUNTED (componentKB fallback)
- Lines 97, 146, 203, 237, 272, 303, 334: ❌ NOT COUNTED

---

## 2. Similarity Check Counting Analysis

### 2.1 What Should Be Counted

Every call to `similarity(vec1, vec2)` should increment `similarityChecks++`.

### 2.2 Locations WITH Proper Counting (11 locations)

| File | Lines | Context |
|------|-------|---------|
| `src/reasoning/kb-matching.mjs` | 77, 391 | Fact and rule matching |
| `src/reasoning/query.mjs` | 440 | HDC query matching |
| `src/reasoning/holographic/prove-hdc-first.mjs` | 248, 487, 549 | HDC proof operations |
| `src/reasoning/prove-search-trace.mjs` | 250 | Negation checking |
| `src/reasoning/property-inheritance.mjs` | 270 | Property negation |
| `src/reasoning/prove/negation.mjs` | 57 | Explicit negation |
| `src/reasoning/query-inheritance.mjs` | 225 | Inheritance negation |

### 2.3 Locations MISSING Counting (33+ locations) - **BUGS**

#### HIGH IMPACT - Bulk Operations

| File | Lines | Context | Magnitude |
|------|-------|---------|-----------|
| `src/hdc/strategies/sparse-polynomial.mjs` | 615 | **topKSimilar() internal loop** | O(V) per call - BIGGEST GAP |
| `src/hdc/strategies/metric-affine.mjs` | 508 | **topKSimilar() internal loop** | O(V) per call |
| `src/hdc/strategies/dense-binary.mjs` | 535 | **topKSimilar() internal loop** | O(V) per call |
| `src/decoding/structural-decoder.mjs` | 45, 54, 152, 165 | Vocabulary scans | O(V) per decode |
| `src/reasoning/abduction.mjs` | 100, 239 | Rule/fact analogy | O(M) and O(N) |

#### MEDIUM IMPACT

| File | Lines | Context |
|------|-------|---------|
| `src/reasoning/query-compound.mjs` | 58, 102, 222 | Compound solution matching |
| `src/reasoning/conditions/rule-conditions.mjs` | 54, 71 | Condition checking |
| `src/reasoning/holographic/csp-hdc-heuristic.mjs` | 109 | CSP bundle similarity |
| `src/reasoning/holographic/prove-hdc-first.mjs` | 429, 463 | Transitive edge similarity |
| `src/reasoning/component-kb.mjs` | 341, 375 | findSimilar methods |

#### LOW IMPACT

| File | Lines | Context |
|------|-------|---------|
| `src/runtime/session-inspection.mjs` | 30, 36 | Debug inspection |
| `src/test-lib/assertions.mjs` | 119, 136, 148 | Test utilities |

### 2.4 topKSimilar() - The Biggest Gap

Each `topKSimilar()` call performs **N similarity checks** (N = vocabulary size, typically 100-1000+) but is **never counted**:

```javascript
// Called at 6+ locations, each performs O(V) checks
topKSimilar(query, vocabulary, k)
  → iterates all vocabulary entries
  → calls similarity() for each
  → returns top K
```

**Estimated undercounting factor: 10-100x** depending on vocabulary size.

---

## 3. HDC% Metric Analysis

### 3.1 Current Formula

```javascript
// evals/fastEval/lib/reporter.mjs:373-376
const hdcQ = (stats.hdcQueries || 0) + (stats.holographicQueries || 0) + (stats.holographicProofs || 0);
const hdcS = (stats.hdcSuccesses || 0) + (stats.holographicQueryHdcSuccesses || 0) + (stats.hdcProofSuccesses || 0);
const hdcPct = hdcQ > 0 ? Math.floor((hdcS / hdcQ) * 100) : 0;
```

### 3.2 What's Included in HDC%

| Metric | Numerator | Denominator | Tracked At |
|--------|-----------|-------------|------------|
| Symbolic HDC | `hdcSuccesses` | `hdcQueries` | `query.mjs:164-167` |
| Holographic Query | `holographicQueryHdcSuccesses` | `holographicQueries` | `query-hdc-first.mjs` |
| Holographic Proof | `hdcProofSuccesses` | `holographicProofs` | `prove-hdc-first.mjs:70-93` |

### 3.3 What's NOT Included (Missing from HDC%)

| Operation | Tracked Stats | Why Missing |
|-----------|---------------|-------------|
| **Validation attempts** | `hdcValidationAttempts`, `hdcValidationSuccesses` | Tracked but not in formula |
| **CSP operations** | `holographicCSP`, `cspBundleBuilt`, `cspSymbolicFallback` | Tracked separately |
| **Level-progressive unbinds** | N/A | Multiple unbinds per query counted as one |
| **HDC direct search in proofs** | Counted as `kbScans`/`similarityChecks` | Not counted as HDC operation |

### 3.4 Display Format

- **Per-suite**: `85%` (simple percentage)
- **Global totals**: `59% (29/49)` (percentage with counts)

**Rounding**: Uses `Math.floor()` (truncation) - 93.33% shows as **93%**

---

## 4. Other Heavy Operations NOT Tracked

### 4.1 HDC Core Operations (Should Track)

| Operation | Function | Cost | Current Status |
|-----------|----------|------|----------------|
| **bind()** | XOR/binding | O(d) | ❌ NOT TRACKED |
| **bundle()** | Superposition | O(n×d) | ❌ NOT TRACKED |
| **unbind()** | Inverse binding | O(d) | ❌ NOT TRACKED |
| **topKSimilar()** | Vocabulary search | O(V×d) | ❌ NOT TRACKED |

### 4.2 Graph Traversal Operations

| Operation | Location | Cost | Current Status |
|-----------|----------|------|----------------|
| **Transitive BFS nodes** | `transitive.mjs`, `query-transitive.mjs` | O(V+E) | ⚠️ Only steps counted, not nodes |
| **Inheritance traversals** | `query-inheritance.mjs`, `property-inheritance.mjs` | O(depth) | ❌ NOT TRACKED |
| **Planning search** | `planning/solver.mjs` | Exponential | ❌ NOT TRACKED |

### 4.3 CSP Operations (Partially Tracked)

| Operation | Tracked Internally | Exposed to Session | Display |
|-----------|-------------------|-------------------|---------|
| `nodesExplored` | `BacktrackSearch.stats` | ❌ NO | ❌ NO |
| `backtracks` | `BacktrackSearch.stats` | ❌ NO | ❌ NO |
| `pruned` | `BacktrackSearch.stats` | ❌ NO | ❌ NO |
| `constraintChecks` | ❌ NO | ❌ NO | ❌ NO |

### 4.4 Unification & Pattern Matching

| Operation | Current Tracking | Should Add |
|-----------|-----------------|------------|
| **Unification attempts** | `ruleAttempts` (incomplete) | `unificationAttempts`, `unificationSuccesses` |
| **Pattern matching** | `kbScans` | `patternMatchVariables`, `patternMatchBacktracks` |
| **Condition proving** | `maxProofDepth` | `conditionRecursionDepth`, `quantifierInstantiations` |

### 4.5 Cache & Index Operations

| Operation | Purpose | Current Status |
|-----------|---------|----------------|
| **Vocabulary lookups** | Atom vector creation | ❌ NOT TRACKED |
| **ComponentKB index hits** | Fast fact retrieval | ❌ NOT TRACKED |
| **Level bundle rebuilds** | Cache invalidation | ❌ NOT TRACKED |

---

## 5. Engine Comparison: Symbolic-First vs HDC-First

### 5.1 Why HDC-First Shows 2-3x Higher Counts

The HDC-first engine has **mandatory redundancy**:

```
HDC-First Query Flow:
1. HDC unbind → find candidates (no kbScans)
2. Validate EACH candidate with symbolicEngine.prove()
   └─ kbScans++, similarityChecks++ per candidate
3. ALWAYS run symbolicEngine.execute() as fallback
   └─ kbScans++, similarityChecks++ AGAIN
```

**Example**: 1 query with 3 HDC candidates:
- **Symbolic-first**: 15 kbScans
- **HDC-first**: 30 (validation) + 15 (fallback) = **45 kbScans** (3x multiplier)

### 5.2 Metrics by Engine

| Metric | Symbolic-First | HDC-First | Notes |
|--------|---------------|-----------|-------|
| `hdcQueries` | ✅ Counted | ❌ NOT counted | Different tracking |
| `hdcSuccesses` | ✅ Counted | ❌ NOT counted | Uses different metrics |
| `holographicQueries` | ❌ N/A | ✅ Counted | HDC-first only |
| `hdcUnbindSuccesses` | ❌ N/A | ✅ Counted | HDC-first only |
| `hdcValidationAttempts` | ❌ N/A | ✅ Counted | Not in HDC% formula |
| `symbolicProofFallbacks` | ❌ N/A | ✅ Counted | Not displayed |

### 5.3 Redundant Counting in HDC-First

Same KB facts scanned 2-3 times:
1. **HDC direct search** → `kbScans++`, `similarityChecks++`
2. **Validation** → `kbScans++`, `similarityChecks++` (via symbolicEngine.prove)
3. **Symbolic fallback** → `kbScans++`, `similarityChecks++` (via symbolicEngine.execute)

---

## 6. Stats Lifecycle & Architecture

### 6.1 Initialization

**Location**: `src/runtime/session.mjs:110-128`

```javascript
this.reasoningStats = {
  queries: 0, proofs: 0, kbScans: 0, similarityChecks: 0,
  ruleAttempts: 0, transitiveSteps: 0, maxProofDepth: 0,
  minProofDepth: Infinity, totalProofSteps: 0, totalReasoningSteps: 0,
  proofLengths: [], methods: {}, operations: {},
  hdcQueries: 0, hdcSuccesses: 0, hdcBindings: 0
};
```

### 6.2 Reset Mechanism

**Location**: `src/runtime/session-stats.mjs:20-28`

**Issue**: Holographic-specific fields missing from reset template:
- `holographicQueries`
- `holographicProofs`
- `hdcUnbindSuccesses`
- `hdcProofSuccesses`

### 6.3 Suite Aggregation

- **ONE session per suite** - stats accumulate across all test cases
- Stats represent **aggregate suite performance**, not per-test
- Each suite gets fresh session with zeroed stats
- **No race conditions** - single-threaded, synchronous

### 6.4 Global Aggregation

**Location**: `evals/fastEval/lib/reporter.mjs:255-340`

Combines symbolic + holographic stats for HDC%:
```javascript
const holoOps = (stats.holographicQueries || 0) + (stats.holographicProofs || 0);
const holoSuccesses = (stats.holographicQueryHdcSuccesses || 0) + (stats.hdcProofSuccesses || 0);
aggregatedStats.hdcQueries += holoOps;
aggregatedStats.hdcSuccesses += holoSuccesses;
```

---

## 7. Recommendations

### 7.1 HIGH Priority - Fix Missing Counts

1. **Add kbScans++ to 25+ missing locations**
   - `query-transitive.mjs`: lines 117, 163, 193, 239
   - `query-rules.mjs`: lines 270, 295, 358
   - `query-inheritance.mjs`: lines 97, 146, 203, 237, 272, 303, 334
   - `session-contradictions.mjs`: lines 230, 269, 361

2. **Add counting inside topKSimilar()**
   ```javascript
   export function topKSimilar(query, vocabulary, k, session) {
     for (const [name, vec] of vocabulary) {
       session?.reasoningStats?.similarityChecks++;
       const sim = similarity(query, vec);
       // ...
     }
   }
   ```

3. **Expose CSP backtrack stats to session**
   ```javascript
   Object.assign(session.reasoningStats, {
     cspNodesExplored: search.stats.nodesExplored,
     cspBacktracks: search.stats.backtracks
   });
   ```

### 7.2 MEDIUM Priority - New Metrics

Add tracking for:
- `hdcBindOperations` - count of bind() calls
- `hdcBundleOperations` - count of bundle() calls
- `hdcUnbindOperations` - count of unbind() calls
- `topKSimilarSearches` - count of topKSimilar() calls
- `unificationAttempts` / `unificationSuccesses`
- `transitiveNodesExplored`

### 7.3 LOW Priority - Architecture Improvements

1. **Separate symbolic vs HDC metrics**
   ```javascript
   kbScansByEngine: { symbolic: N, hdcFirst: M }
   ```

2. **Fix HDC-first redundancy**
   - Only run symbolic fallback if validation failed
   - Or track operations separately per phase

3. **Add holographic fields to reset template**

---

## 8. Files Reference

### Stats Tracking
- `src/runtime/session.mjs:110-128` - Initialization
- `src/runtime/session-stats.mjs:9-31` - Retrieval

### KB Scan Locations (needs fixing)
- `src/reasoning/query-transitive.mjs`
- `src/reasoning/query-rules.mjs`
- `src/reasoning/query-inheritance.mjs`
- `src/runtime/session-contradictions.mjs`

### Similarity Check Locations (needs fixing)
- `src/hdc/strategies/*.mjs` - topKSimilar implementations
- `src/decoding/structural-decoder.mjs`
- `src/reasoning/abduction.mjs`
- `src/reasoning/query-compound.mjs`

### Reporting
- `evals/fastEval/lib/reporter.mjs:373-376` - HDC% formula
- `evals/fastEval/lib/reporter.mjs:234-238` - Number formatting (K/M)

---

## 9. Conclusion

The current operation counting has significant gaps:

| Metric | Accuracy | Reason |
|--------|----------|--------|
| **KB Scans** | ~60% | 25+ locations missing counting |
| **Similarity Checks** | ~25% | topKSimilar bulk operations not counted |
| **HDC%** | Partial | Validation and CSP operations excluded |

The metrics are useful for **relative comparison** between strategies but do **not accurately reflect total computational work**.
HDC-first appears to do 2-3x more work due to redundant validation + fallback, but this is a design choice for correctness, not inefficiency.

**Priority fixes**:
1. Add counting to `query-transitive.mjs`, `query-rules.mjs`, `query-inheritance.mjs`
2. Add counting inside `topKSimilar()` implementations
3. Include validation stats in HDC% formula
4. Expose CSP backtrack stats

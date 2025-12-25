# Evaluation Suite Statistics: Collection and Reporting

## Overview

The AGISystem2 evaluation suite tracks detailed performance metrics during reasoning operations. This report explains how statistics like "HDC%", "KB Scans", and "Sim Checks" are calculated, collected, and displayed.

---

## 1. Statistics Collection Architecture

### 1.1 Session-Level Statistics

All statistics are tracked in the `Session` object's `reasoningStats` property, initialized in `/home/salboaie/work/AGISystem2/src/runtime/session.mjs`:

```javascript
this.reasoningStats = {
  queries: 0,              // Total query operations
  proofs: 0,               // Total prove operations
  kbScans: 0,              // KB fact iterations (expensive!)
  similarityChecks: 0,     // HDC similarity comparisons (O(n) each)
  ruleAttempts: 0,         // Rule inference attempts
  transitiveSteps: 0,      // Transitive chain steps
  maxProofDepth: 0,        // Maximum proof depth
  minProofDepth: Infinity, // Minimum proof depth
  totalProofSteps: 0,      // Successful proof chain steps
  totalReasoningSteps: 0,  // ALL reasoning attempts (including backtracking)
  proofLengths: [],        // Array of individual proof lengths
  methods: {},             // Reasoning methods used
  operations: {},          // Operations performed

  // HDC-specific stats
  hdcQueries: 0,           // Total queries using HDC Master Equation
  hdcSuccesses: 0,         // HDC queries that found results
  hdcBindings: 0           // Total bindings found via HDC
};
```

### 1.2 Holographic Mode Extensions

When using holographic priority mode, additional statistics are tracked:

```javascript
// Tracked in holographic/prove-hdc-first.mjs and holographic/query-hdc-first.mjs
holographicQueries: 0,      // Holographic query operations
holographicProofs: 0,       // Holographic proof operations
hdcUnbindSuccesses: 0,      // Successful HDC unbinding operations
hdcProofSuccesses: 0        // Successful HDC proof operations
```

---

## 2. How Statistics Are Incremented

### 2.1 KB Scans

**Definition**: Every iteration over `session.kbFacts` array.

**Incremented at**: Every KB fact iteration in reasoning modules.

**Key locations**:
- `/home/salboaie/work/AGISystem2/src/reasoning/find-all.mjs:57`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-kb.mjs:28`
- `/home/salboaie/work/AGISystem2/src/reasoning/transitive.mjs:157`
- `/home/salboaie/work/AGISystem2/src/reasoning/kb-matching.mjs:119`
- `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs:245`

**Example**:
```javascript
for (const fact of session.kbFacts) {
  session.reasoningStats.kbScans++;  // Incremented on every iteration
  // ... process fact
}
```

**Performance impact**: KB scans are expensive - O(n) where n = number of facts in KB.

### 2.2 Similarity Checks

**Definition**: Every HDC vector similarity computation.

**Incremented at**: Every call to `similarity(vec1, vec2)`.

**Key locations**:
- `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs:248`
- `/home/salboaie/work/AGISystem2/src/reasoning/kb-matching.mjs:77`
- `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs:440`

**Example**:
```javascript
this.session.reasoningStats.similarityChecks++;
const sim = similarity(goalVec, fact.vector);
if (sim > bestSim) {
  bestSim = sim;
  bestMatch = fact;
}
```

**Performance impact**: Each check is O(d) where d = vector dimension (e.g., 2048 for dense-binary).

### 2.3 HDC Query Statistics

**Definition**: Tracking success rate of HDC vector matching operations.

**Components**:
- `hdcQueries`: Total HDC query attempts
- `hdcSuccesses`: Queries that found at least one match
- `hdcBindings`: Total number of bindings found

**Incremented at**: `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs:164-167`

```javascript
this.session.reasoningStats.hdcQueries++;
if (hdcMatches.length > 0) {
  this.session.reasoningStats.hdcSuccesses++;
  this.session.reasoningStats.hdcBindings += hdcMatches.length;
}
```

### 2.4 Holographic Mode Statistics

**Additional tracking for holographic priority mode**:

```javascript
// In prove-hdc-first.mjs:70-71
this.session.reasoningStats.holographicProofs =
  (this.session.reasoningStats.holographicProofs || 0) + 1;

// On success (line 92-93)
this.session.reasoningStats.hdcProofSuccesses =
  (this.session.reasoningStats.hdcProofSuccesses || 0) + 1;

// In query-hdc-first.mjs:60-61
this.session.reasoningStats.holographicQueries =
  (this.session.reasoningStats.holographicQueries || 0) + 1;

// On success (line 106-107)
this.session.reasoningStats.hdcUnbindSuccesses =
  (this.session.reasoningStats.hdcUnbindSuccesses || 0) + 1;
```

---

## 3. Statistics Retrieval and Aggregation

### 3.1 Retrieval from Session

After running a test suite, statistics are retrieved via:

```javascript
// In runner.mjs:868
const reasoningStats = session.getReasoningStats();
```

Implemented in `/home/salboaie/work/AGISystem2/src/runtime/session-stats.mjs:9-31`:

```javascript
export function getReasoningStats(session, reset = false) {
  const stats = { ...session.reasoningStats };

  // Calculate average proof length
  stats.avgProofLength = stats.proofLengths.length > 0
    ? (stats.totalProofSteps / stats.proofLengths.length).toFixed(1)
    : 0;

  // Handle edge case for minProofDepth
  if (stats.minProofDepth === Infinity) {
    stats.minProofDepth = 0;
  }

  delete stats.proofLengths; // Remove internal array

  return stats;
}
```

### 3.2 Suite-Level Aggregation

Statistics are collected per test suite in `/home/salboaie/work/AGISystem2/evals/fastEval/lib/runner.mjs:878-886`:

```javascript
return {
  results,
  summary: {
    total,
    passed,
    failed: total - passed,
    brokenParser,
    reasoningStats,  // Includes all stats from session
    // ...
  }
};
```

### 3.3 Global Aggregation

Statistics are aggregated across all suites in `/home/salboaie/work/AGISystem2/evals/fastEval/lib/reporter.mjs:255-272`:

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
  // HDC Master Equation stats
  hdcQueries: 0,
  hdcSuccesses: 0,
  hdcBindings: 0,
  methods: {},
  operations: {}
};

// Then aggregated per suite (lines 309-340)
for (const suite of suiteResults) {
  const stats = suite.summary.reasoningStats || {};
  aggregatedStats.queries += stats.queries || 0;
  aggregatedStats.proofs += stats.proofs || 0;
  aggregatedStats.kbScans += stats.kbScans || 0;
  aggregatedStats.similarityChecks += stats.similarityChecks || 0;
  // ... etc
}
```

---

## 4. HDC% Calculation

### 4.1 Formula

**HDC% = (hdcSuccesses / hdcQueries) × 100**

Where:
- `hdcSuccesses` = number of HDC queries that found at least one match
- `hdcQueries` = total number of HDC query attempts

### 4.2 Holographic Mode Aggregation

For holographic priority mode, HDC% combines both symbolic and holographic operations:

```javascript
// Per-suite calculation (reporter.mjs:373-376)
const hdcQ = (stats.hdcQueries || 0) +
             (stats.holographicQueries || 0) +
             (stats.holographicProofs || 0);

const hdcS = (stats.hdcSuccesses || 0) +
             (stats.hdcUnbindSuccesses || 0) +
             (stats.hdcProofSuccesses || 0);

const hdcPct = hdcQ > 0 ? Math.floor((hdcS / hdcQ) * 100) : 0;
```

### 4.3 Global HDC% Calculation

Aggregated across all suites (reporter.mjs:342-347):

```javascript
// Aggregate symbolic engine stats
aggregatedStats.hdcQueries += stats.hdcQueries || 0;
aggregatedStats.hdcSuccesses += stats.hdcSuccesses || 0;

// Aggregate holographic engine stats
const holoOps = (stats.holographicQueries || 0) + (stats.holographicProofs || 0);
const holoSuccesses = (stats.hdcUnbindSuccesses || 0) + (stats.hdcProofSuccesses || 0);
aggregatedStats.hdcQueries += holoOps;
aggregatedStats.hdcSuccesses += holoSuccesses;

// Final percentage (reporter.mjs:425-427)
const totalHdcPct = aggregatedStats.hdcQueries > 0
  ? Math.floor((aggregatedStats.hdcSuccesses / aggregatedStats.hdcQueries) * 100)
  : 0;
```

### 4.4 Display Format

**Per-suite**: Simple percentage (reporter.mjs:376-377):
```javascript
const hdcStr = hdcQ > 0 ? `${hdcPct}%` : '-';
```

**Global totals**: Percentage with counts (reporter.mjs:688-695):
```javascript
const hdcPct = totals.hdcTotal > 0
  ? Math.floor((totals.hdcSuccesses / totals.hdcTotal) * 100)
  : 0;
const cellContent = `${hdcPct}% (${totals.hdcSuccesses}/${totals.hdcTotal})`.padEnd(colW);
```

---

## 5. Number Format Interpretation

### 5.1 Percentage Format: "59% (29/49)"

This format appears in the multi-strategy comparison table and means:

- **59%**: Success rate (percentage)
- **29**: Number of successful operations
- **49**: Total number of operations attempted

**Example from reporter.mjs:682-683**:
```javascript
const pct = totals.total > 0 ? Math.floor((totals.passed / totals.total) * 100) : 0;
const cellContent = `${pct}% (${totals.passed}/${totals.total})`.padEnd(colW);
```

### 5.2 Abbreviated Numbers (K/M suffix)

Large numbers are abbreviated with K (thousands) or M (millions) suffixes:

**Implementation** (reporter.mjs:234-238):
```javascript
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
```

**Examples**:
- `2000` → `2.0K`
- `15743` → `15.7K`
- `1500000` → `1.5M`

---

## 6. Rounding and Truncation

### 6.1 Percentage Rounding

All percentages use `Math.floor()` (truncation, not rounding):

```javascript
// Per-suite (reporter.mjs:350)
const pct = suite.summary.total > 0
  ? Math.floor((suite.summary.passed / suite.summary.total) * 100)
  : 0;

// HDC% (reporter.mjs:375, 425, 691)
const hdcPct = hdcQ > 0 ? Math.floor((hdcS / hdcQ) * 100) : 0;
```

**Impact**: A test with 14 out of 15 passing (93.33%) displays as **93%**, not 94%.

### 6.2 Average Proof Length Rounding

Average proof length uses `toFixed(1)` for one decimal place:

```javascript
// session-stats.mjs:11-12
stats.avgProofLength = stats.proofLengths.length > 0
  ? (stats.totalProofSteps / stats.proofLengths.length).toFixed(1)
  : 0;

// reporter.mjs:405-407
const avgProofLen = aggregatedStats.proofs > 0
  ? (aggregatedStats.totalProofSteps / aggregatedStats.proofs).toFixed(1)
  : '0';
```

**Example**: 237 steps across 15 proofs = 15.8 average

### 6.3 Large Number Truncation

The `formatNum()` function uses `toFixed(1)` for K/M suffixes:

```javascript
if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
```

**Impact**: `12743` → `12.7K` (12.743K truncated to 1 decimal)

---

## 7. Report Display Structure

### 7.1 Column Headers (reporter.mjs:287-306)

```
Suite                     Pass  Tests │  L   Q   P │  KBSc    Sim   Tr   Rl    M    D  Avg Steps │  HDC%
```

**Legend** (reporter.mjs:277-284):
- **EXPECTED** (from test case definitions):
  - `L` = learn cases
  - `Q` = query cases
  - `P` = prove cases

- **RUNTIME** (operation counts during reasoning):
  - `KBSc` = KB fact iterations (expensive)
  - `Sim` = HDC similarity checks (O(n) each)
  - `Tr` = transitive chain steps
  - `Rl` = rule inference attempts
  - `M/D` = min/max proof depth
  - `Avg/Steps` = avg steps, total steps
  - `HDC%` = HDC vector matching success rate

### 7.2 Per-Suite Row Format (reporter.mjs:378-397)

Example:
```
#08 Rule Chains         100%   10/10 │   5   3   2 │   12.7K   5.3K    15    8    2    5  3.2   48 │   85%
```

Breakdown:
- `#08 Rule Chains`: Suite name with number
- `100%`: Pass percentage (10/10 = 100%)
- `10/10`: Tests passed/total
- `5 3 2`: 5 learn, 3 query, 2 prove actions
- `12.7K`: 12,700 KB scans
- `5.3K`: 5,300 similarity checks
- `15`: 15 transitive steps
- `8`: 8 rule attempts
- `2`: Min proof depth
- `5`: Max proof depth
- `3.2`: Average proof length
- `48`: Total proof steps
- `85%`: HDC success rate

### 7.3 Global Totals Row (reporter.mjs:430-449)

Aggregates all statistics across all suites with color coding:
- Green: 100% pass rate
- Yellow: 50-99% pass rate
- Red: < 50% pass rate
- Cyan: Numeric totals

---

## 8. Hidden/Tracked-But-Not-Displayed Statistics

### 8.1 Statistics Tracked But Not in Main Table

From `session.reasoningStats` initialization:

1. **`totalReasoningSteps`**: ALL reasoning attempts including backtracking
   - Tracked but not displayed in summary tables
   - Useful for debugging reasoning inefficiency

2. **`proofLengths[]`**: Array of individual proof lengths
   - Used internally to calculate `avgProofLength`
   - Deleted before returning from `getReasoningStats()`

3. **`methods{}`**: Breakdown of reasoning methods used
   - Tracked per method name
   - Not displayed in main table
   - Could show which reasoning strategies were employed

4. **`operations{}`**: Breakdown of operations performed
   - Tracked per operation type
   - Not displayed in main table

### 8.2 Statistics Mentioned in Code But Not Fully Utilized

1. **`ruleAttempts`**: Displayed in table but tracking is incomplete
   - Should be incremented at every rule application attempt
   - Currently not consistently tracked across all rule engines

2. **`queries` and `proofs`**: Counters for operation types
   - Tracked at session level
   - Not displayed in per-suite table (only in verbose logs)

### 8.3 Duration Statistics

Suite and total execution times are tracked:

```javascript
// Per suite (runner.mjs:861-866)
const suiteStartTime = Date.now();
// ... run tests
const suiteDurationMs = Date.now() - suiteStartTime;

// Total (runFastEval.mjs:347-349)
const totalDuration = performance.now() - startTime;
console.log(`Total execution time: ${(totalDuration / 1000).toFixed(2)}s`);
```

Displayed:
- In multi-strategy comparison table (ms per config)
- At end of run (total seconds)

---

## 9. Potential Issues and Improvements

### 9.1 Rounding Issues

**Current behavior**: All percentages use `Math.floor()`, which always rounds down.

**Issue**: Can be misleading for near-perfect scores.
- 14/15 = 93.33% → displays as **93%**
- Could make users think performance is worse than it is

**Recommendation**: Use `Math.round()` for more accurate representation.

### 9.2 HDC% Accuracy in Holographic Mode

**Current behavior**: Combines different operation types:
```javascript
const hdcQ = hdcQueries + holographicQueries + holographicProofs;
const hdcS = hdcSuccesses + hdcUnbindSuccesses + hdcProofSuccesses;
```

**Issue**: Different operation types have different success criteria.
- Lumping them together may obscure which HDC mode is more effective

**Recommendation**: Consider separate metrics or weighted averages.

### 9.3 Missing Tracking for Rule Attempts

**Current behavior**: `ruleAttempts` counter exists but is not consistently incremented.

**Issue**: The metric doesn't accurately reflect rule engine activity.

**Recommendation**: Add tracking to all rule application points.

### 9.4 KB Scans Double-Counting

**Observation**: Some code paths increment `kbScans` for both the loop and indexed access:

```javascript
const facts = componentKB.findByArg0(knownName);
for (const f of facts) {
  session.reasoningStats.kbScans++;  // Incremented per result
  // ...
}
```

**Issue**: If the indexed lookup also increments the counter, scans may be overcounted.

**Recommendation**: Audit all `kbScans++` locations for consistency.

### 9.5 Similarity Checks Without Scans

**Observation**: In holographic mode, similarity checks can happen without full KB scans:

```javascript
// prove-hdc-first.mjs:245-249
for (const fact of this.session.kbFacts) {
  this.session.reasoningStats.kbScans++;
  if (!fact.vector) continue;
  this.session.reasoningStats.similarityChecks++;
  const sim = similarity(goalVec, fact.vector);
}
```

**Behavior**: Every similarity check also counts as a KB scan (correct, since we iterate).

**Note**: Similarity checks ≤ KB scans (we skip facts without vectors).

---

## 10. Summary Table

| Metric | Meaning | Unit | Incremented At | Display Format |
|--------|---------|------|----------------|----------------|
| **HDC%** | HDC vector matching success rate | Percentage | Query/proof success | `85%` or `85% (42/49)` |
| **KB Scans** | KB fact array iterations | Count | Every `kbFacts` loop | `12.7K` (thousands) |
| **Sim Checks** | HDC similarity comparisons | Count | Every `similarity()` call | `5.3K` (thousands) |
| **Tr** | Transitive reasoning steps | Count | Transitive chain operations | `15` |
| **Rl** | Rule inference attempts | Count | Rule applications | `8` |
| **M** | Minimum proof depth | Steps | Shortest successful proof | `2` |
| **D** | Maximum proof depth | Steps | Longest successful proof | `5` |
| **Avg** | Average proof length | Steps (1 decimal) | Total steps / proof count | `3.2` |
| **Steps** | Total proof steps | Count | Sum of all proof lengths | `48` |

---

## 11. Code Reference Map

| Function/Location | Purpose |
|-------------------|---------|
| `/src/runtime/session.mjs:110-128` | Stats initialization |
| `/src/runtime/session-stats.mjs:9-31` | Stats retrieval and formatting |
| `/evals/fastEval/lib/runner.mjs:868` | Stats collection from session |
| `/evals/fastEval/lib/reporter.mjs:255-340` | Global aggregation |
| `/evals/fastEval/lib/reporter.mjs:373-397` | Per-suite HDC% and display |
| `/evals/fastEval/lib/reporter.mjs:425-449` | Global totals display |
| `/evals/fastEval/lib/reporter.mjs:234-238` | Number formatting (K/M) |
| `/src/reasoning/query.mjs:164-167` | HDC query tracking |
| `/src/reasoning/holographic/prove-hdc-first.mjs:70-93` | Holographic proof tracking |
| `/src/reasoning/holographic/query-hdc-first.mjs:60-107` | Holographic query tracking |

---

## 12. Example Calculation Walkthrough

**Scenario**: Suite with 3 test cases

### Test Case 1: Learn operation
- KB scans: 0
- Similarity checks: 0
- HDC queries: 0

### Test Case 2: Query operation
- KB scans: 150 (iterated 150 facts)
- Similarity checks: 75 (checked similarity for 75 facts with vectors)
- HDC queries: 1 (one HDC unbind attempt)
- HDC successes: 1 (found 3 bindings)
- HDC bindings: 3

### Test Case 3: Prove operation
- KB scans: 200
- Similarity checks: 120
- HDC queries: 1
- HDC successes: 0 (HDC didn't find answer, fell back to symbolic)
- Proof depth: 4 steps

### Suite Totals:
- **KB Scans**: 350
- **Sim Checks**: 195
- **HDC queries**: 2
- **HDC successes**: 1
- **HDC%**: Math.floor((1/2) * 100) = **50%**

### Display:
```
Suite Name              100%    3/3 │  1  1  1 │    350    195     0     0    4    4  4.0    4 │   50%
                                      L  Q  P      KBSc   Sim   Tr   Rl    M    D  Avg Steps  HDC%
```

---

## Conclusion

The evaluation suite provides comprehensive performance tracking through:
1. **Per-operation counters** incremented during reasoning
2. **Session-level aggregation** via `reasoningStats` object
3. **Suite and global rollups** for comparative analysis
4. **Clear display formatting** with color-coded indicators

Key metrics like HDC% reveal the effectiveness of hyperdimensional computing for symbolic reasoning, while KB Scans and Similarity Checks expose computational bottlenecks.

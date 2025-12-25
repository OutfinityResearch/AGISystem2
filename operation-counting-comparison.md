# Operation Counting Comparison: Symbolic-First vs HDC-First Reasoning Engines

## Executive Summary

The HDC-first and symbolic-first reasoning engines count different operations and use different execution flows, which explains why their metrics differ significantly in eval outputs. The HDC-first engine performs additional HDC-specific operations (unbind, validation) and ALWAYS falls back to symbolic reasoning, resulting in **double counting** of many operations.

---

## Side-by-Side Comparison

| Metric | Symbolic-First Engine | HDC-First Engine | Notes |
|--------|----------------------|------------------|-------|
| **kbScans** | Counted in: | Counted in: | **KEY DIFFERENCE** |
| | - `query-kb.mjs`: Direct KB searches | ✓ Same: Direct KB searches | HDC engine counts ALL symbolic operations |
| | - `query-hdc.mjs`: Validation scans | ✓ Same: Validation scans | PLUS additional HDC-specific scans |
| | - `kb-matching.mjs`: Proof matching | ✓ Same: Proof matching | **Result: HDC counts 2-3x more** |
| | - `transitive.mjs`: Transitive chains | ✓ Same: Transitive chains | |
| | - Property inheritance | ✓ Same: Property inheritance | |
| | **NOT counted**: HDC unbind operations | ✓ **ADDED**: HDC direct search (line 245, 447) | HDC scans KB during similarity search |
| | | ✓ **ADDED**: HDC rule condition checks (line 547) | Additional KB scans for HDC prefiltering |
| | | ✓ **ADDED**: HDC negation checks (line 702) | Check if goal negated in KB |
| **similarityChecks** | Counted in: | Counted in: | **KEY DIFFERENCE** |
| | - `query.mjs`: Direct match queries (line 440) | ✓ Same: Direct match queries | HDC counts ALL symbolic operations |
| | - `kb-matching.mjs`: Vector similarity (line 77) | ✓ Same: Vector similarity | PLUS HDC-specific similarity checks |
| | - `prove-search-trace.mjs`: Search trace (line 250) | ✓ Same: Search trace | |
| | **NOT counted**: HDC operations | ✓ **ADDED**: HDC direct search (line 248) | HDC similarity during proof |
| | | ✓ **ADDED**: HDC rule matching (line 487, 549) | Additional similarity for rules |
| **hdcQueries** | ✓ Counted: Every query uses HDC (line 164) | ✗ **NOT counted** | Only symbolic engine tracks this |
| **hdcSuccesses** | ✓ Counted: When HDC finds results (line 166) | ✗ **NOT counted** | Only symbolic engine tracks this |
| **hdcBindings** | ✓ Counted: Number of HDC results (line 167) | ✗ **NOT counted** | Only symbolic engine tracks this |
| **holographicQueries** | ✗ **NOT counted** | ✓ **ADDED**: Query operations (line 60-61) | HDC-first specific metric |
| **hdcUnbindAttempts** | ✗ **NOT counted** | ✓ **ADDED**: Unbind operations (line 102-103) | HDC-first specific metric |
| **hdcUnbindSuccesses** | ✗ **NOT counted** | ✓ **ADDED**: Successful unbinds (line 106-107) | HDC-first specific metric |
| **hdcValidationAttempts** | ✗ **NOT counted** | ✓ **ADDED**: Candidate validations (line 113-114) | HDC-first specific metric |
| **hdcValidationSuccesses** | ✗ **NOT counted** | ✓ **ADDED**: Successful validations (line 119-120) | HDC-first specific metric |
| **holographicProofs** | ✗ **NOT counted** | ✓ **ADDED**: Proof attempts (line 70-71) | HDC-first specific metric |
| **hdcProofSuccesses** | ✗ **NOT counted** | ✓ **ADDED**: Successful HDC proofs (line 92-93) | HDC-first specific metric |
| **symbolicProofFallbacks** | ✗ **NOT counted** | ✓ **ADDED**: Fallback to symbolic (line 101-102) | HDC-first specific metric |

---

## Flow Differences Explaining Higher Counts

### Symbolic-First Engine Flow (`query.mjs`)

```
1. Parse query (identify holes and knowns)
2. SOURCE 1: HDC Master Equation (searchHDC)
   └─ Count: hdcQueries++, hdcSuccesses++, hdcBindings++
   └─ During searchHDC: May scan KB for verification (verifyHDCCandidate)
3. SOURCE 2: Direct KB matches (searchKBDirect)
   └─ Count: kbScans++ per fact examined
4. SOURCE 3: Transitive reasoning (searchTransitive)
   └─ Count: kbScans++ per fact examined
5. SOURCE 4: Rule derivations (searchViaRules)
   └─ Count: kbScans++ per fact examined
6. SOURCE 5: Property inheritance
   └─ Count: kbScans++ per fact examined
7. Merge and return results

Total operations: Single pass through sources
```

### HDC-First Engine Flow (`query-hdc-first.mjs`)

```
1. Parse query (identify holes and knowns)
   └─ Count: holographicQueries++
2. HDC unbind to find candidates
   └─ Count: hdcUnbindAttempts++
   └─ If candidates found: hdcUnbindSuccesses++
3. For EACH candidate:
   └─ Count: hdcValidationAttempts++
   └─ Validate with ProofEngine.prove()
      ├─ This counts: kbScans++, similarityChecks++
      └─ If valid: hdcValidationSuccesses++
4. ALWAYS merge with symbolic results (line 147-182)
   └─ Call symbolicEngine.execute(statement)
      ├─ This runs ENTIRE symbolic query flow
      ├─ Counts: hdcQueries++, hdcSuccesses++, hdcBindings++
      ├─ Counts: kbScans++ for all symbolic sources
      └─ Counts: similarityChecks++ for symbolic operations
5. Merge and return results

Total operations: HDC operations + FULL symbolic operations
```

### HDC-First Proof Engine Flow (`prove-hdc-first.mjs`)

```
1. Parse goal
   └─ Count: holographicProofs++
2. Try HDC similarity search
   ├─ HDC direct search: kbScans++, similarityChecks++ (line 245, 248)
   ├─ HDC transitive search: kbScans++ (line 447)
   ├─ HDC rule search: similarityChecks++ (line 487, 549)
   └─ For each HDC result: validateWithSymbolic()
      ├─ This calls symbolicEngine.prove()
      └─ Counts: kbScans++, similarityChecks++ for symbolic proof
3. If HDC succeeds:
   └─ Count: hdcProofSuccesses++
4. ALWAYS fall back to symbolic (if config.FALLBACK_TO_SYMBOLIC = true)
   ├─ Count: symbolicProofFallbacks++
   ├─ Call symbolicEngine.prove(goal)
   └─ Counts: kbScans++, similarityChecks++ for symbolic proof
5. Return result

Total operations: HDC operations + validation operations + FULL symbolic operations
```

---

## Specific Counting Differences

### 1. Operations Counted in Symbolic Engine but NOT in HDC Engine

| Operation | Location | Why HDC Doesn't Count |
|-----------|----------|----------------------|
| `hdcQueries` | `query.mjs:164` | HDC-first doesn't use searchHDC from query-hdc.mjs |
| `hdcSuccesses` | `query.mjs:166` | HDC-first uses unbind instead of Master Equation |
| `hdcBindings` | `query.mjs:167` | HDC-first tracks different metrics |

### 2. Operations Counted in HDC Engine but NOT in Symbolic Engine

| Operation | Location | Purpose |
|-----------|----------|---------|
| `holographicQueries` | `query-hdc-first.mjs:60-61` | Track HDC-first query attempts |
| `hdcUnbindAttempts` | `query-hdc-first.mjs:102-103` | Track unbind operations |
| `hdcUnbindSuccesses` | `query-hdc-first.mjs:106-107` | Track successful unbinds |
| `hdcValidationAttempts` | `query-hdc-first.mjs:113-114` | Track candidate validations |
| `hdcValidationSuccesses` | `query-hdc-first.mjs:119-120` | Track successful validations |
| `holographicProofs` | `prove-hdc-first.mjs:70-71` | Track HDC-first proof attempts |
| `hdcProofSuccesses` | `prove-hdc-first.mjs:92-93` | Track successful HDC proofs |
| `symbolicProofFallbacks` | `prove-hdc-first.mjs:101-102` | Track fallback to symbolic |
| HDC KB scans | `prove-hdc-first.mjs:245, 447, 547, 702` | HDC-specific KB scans during similarity search |
| HDC similarity checks | `prove-hdc-first.mjs:248, 487, 549` | HDC-specific similarity checks |

### 3. Are kbScans and similarityChecks Counted Consistently?

**NO - Major Inconsistency Found!**

#### Symbolic Engine (`query.mjs`, `prove.mjs`)
- Counts `kbScans` and `similarityChecks` **only during symbolic operations**
- HDC operations in `query-hdc.mjs` do NOT increment these counters during unbind
- The HDC Master Equation operates on bundled KB, not individual facts

#### HDC-First Engine (`query-hdc-first.mjs`, `prove-hdc-first.mjs`)
- Counts `kbScans` and `similarityChecks` during **HDC operations** (lines 245, 248, 447, 487, 549, 547, 702)
- Counts `kbScans` and `similarityChecks` during **validation** (calls symbolicEngine.prove)
- Counts `kbScans` and `similarityChecks` during **symbolic fallback** (calls symbolicEngine.execute)
- **Result**: Same operation counted 2-3 times!

---

## Redundant Counts (Same Operation Counted Multiple Times)

### Query Engine Redundancy

When HDC-first query engine processes a query:

1. **HDC unbind phase**: NO kbScans (operates on bundle)
2. **Validation phase**: For each candidate
   - Calls `validateCandidate()` → calls `validatorEngine.prove()`
   - This counts: `kbScans++`, `similarityChecks++`
3. **Symbolic fallback phase** (line 148):
   - Calls `symbolicEngine.execute(statement)`
   - This counts: `kbScans++`, `similarityChecks++` **AGAIN for same facts**
   - Also counts: `hdcQueries++`, `hdcSuccesses++`, `hdcBindings++`

**Result**: Same KB facts scanned 2-3 times, counted each time!

### Proof Engine Redundancy

When HDC-first proof engine proves a goal:

1. **HDC direct search** (line 238-299):
   - Scans KB facts: `kbScans++` (line 245)
   - Checks similarity: `similarityChecks++` (line 248)
2. **Validation phase** (line 174-191):
   - Calls `validateWithSymbolic(goal)` → calls `symbolicEngine.prove()`
   - This counts: `kbScans++`, `similarityChecks++` **AGAIN**
3. **Symbolic fallback phase** (line 99-110):
   - Calls `symbolicEngine.prove(goal)`
   - This counts: `kbScans++`, `similarityChecks++` **THIRD TIME**
   - Also increments: `symbolicProofFallbacks++`

**Result**: Same goal proven 3 times, same KB facts scanned 3 times, all counted!

---

## Why HDC-First Shows Higher Numbers in Eval Output

### Example Scenario: Single Query

**Symbolic-First Engine:**
```
1 query → HDC search (no KB scans, uses bundle)
        → Direct KB search (10 kbScans)
        → Transitive search (5 kbScans)
        → Result: 15 kbScans total
```

**HDC-First Engine:**
```
1 query → HDC unbind (0 kbScans, uses bundle)
        → Validation of 3 candidates (each calls prove):
           - Candidate 1: 10 kbScans + 5 similarityChecks
           - Candidate 2: 10 kbScans + 5 similarityChecks
           - Candidate 3: 10 kbScans + 5 similarityChecks
        → Symbolic fallback (ALWAYS runs):
           - HDC search: 0 kbScans (uses bundle)
           - Direct KB search: 10 kbScans
           - Transitive search: 5 kbScans
        → Result: 30 (validation) + 15 (fallback) = 45 kbScans total
```

**Multiplier: 3x increase due to redundant counting!**

---

## Recommendations

### Option 1: Avoid Double Counting (Recommended)

Modify HDC-first engine to skip symbolic fallback when HDC validation succeeded:

```javascript
// In query-hdc-first.mjs, line 145
if (this.config.FALLBACK_TO_SYMBOLIC) {
  // Only fall back if HDC didn't find validated results
  if (validatedResults.length === 0) {
    const symbolicResult = this.symbolicEngine.execute(statement);
    // ... merge results
  }
}
```

### Option 2: Separate Metrics

Use different metric names for HDC-first operations:

```javascript
// Instead of: kbScans, similarityChecks
// Use: hdcKbScans, hdcSimilarityChecks, symbolicKbScans, symbolicSimilarityChecks
```

### Option 3: Track Operation Source

Add metadata to distinguish operation source:

```javascript
this.session.reasoningStats.kbScans++;
this.session.reasoningStats.kbScansBySource[currentEngine] =
  (this.session.reasoningStats.kbScansBySource[currentEngine] || 0) + 1;
```

---

## Conclusion

The HDC-first engine shows **2-3x higher kbScans and similarityChecks** because it:

1. **Validates each HDC candidate** with symbolic proof (counts operations)
2. **Always falls back to symbolic** even when validation succeeded (counts operations again)
3. **Performs additional HDC-specific KB scans** during similarity search (lines 245, 447, 547, 702)

This is **not a bug** but a **design choice** - HDC-first prioritizes correctness by validating all results and ensuring completeness through symbolic fallback. However, this makes performance comparisons misleading.

**Key Insight**: The metrics don't measure "efficiency" - they measure "total work done including redundancy". HDC-first does more work to ensure higher quality results.

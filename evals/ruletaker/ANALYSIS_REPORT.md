# RuleTaker Analysis Report

## Current Status (1000 examples analyzed)

| Metric | Count | % |
|--------|-------|---|
| Total | 1000 | 100% |
| Correct | 707 | 70.7% |
| Failed | 293 | 29.3% |

**Previous accuracy:** 49.5% (before translator fix)
**Current accuracy:** 70.7% (after translator fix)
**Improvement:** +21.2 percentage points

---

## Key Finding: Both Reasoning Engines Identical

| Engine | Accuracy | Notes |
|--------|----------|-------|
| symbolicPriority | 67.0% | 134/200 |
| holographicPriority | 67.0% | 134/200 |

All HDC strategies (dense-binary, sparse-polynomial, metric-affine) also give identical results.

**Conclusion:** The failures are due to fundamental reasoning gaps, not strategy or priority differences.

---

## Failure Categories (1000 samples)

| Category | Count | % of Failures | Description |
|----------|-------|---------------|-------------|
| CWA_NEGATION | 257 | 87.7% | Closed World Assumption not implemented |
| RULE_APPLICATION | 32 | 10.9% | Ground-term modus ponens fails |
| FALSE_POSITIVE | 4 | 1.4% | Engine proves when it shouldn't |

---

## BUG #1: Closed World Assumption (CWA) Not Implemented

**Severity: CRITICAL (83% of failures)**

The engine cannot prove "Not(P)" when P is simply absent from KB.

### Example
```
Context: Bob is big. Bob is green. Harry is round.
Question: "Harry is not big"
Label: entailment (should be PROVED)

Query DSL: @goal Not (hasProperty Harry big)
Result: NOT PROVED
```

**Expected behavior (CWA):** Since `hasProperty Harry big` is not in KB, `Not(hasProperty Harry big)` should be TRUE.

**Current behavior:** Engine returns "No proof found" because it looks for explicit evidence of negation.

### Root Cause
The prover doesn't implement negation-as-failure:
```javascript
// In proveGoal(), when goal is Not(P):
// 1. Try to prove P
// 2. If P cannot be proved → Not(P) is TRUE (CWA)
// 3. If P can be proved → Not(P) is FALSE
```

### Fix Location
`src/reasoning/prove.mjs` - `proveGoal()` method needs CWA logic for Not operator.

---

## BUG #2: Ground-Term Modus Ponens Fails

**Severity: HIGH (17% of failures)**

Rules with ground terms (specific entities, not variables) are found but not applied.

### Example
```
Context:
  Bob is big.
  Bob is cold.
  If Bob is big and Bob is cold then Bob is green.

Question: "Bob is green"
Label: entailment (should be PROVED)

Translated DSL:
  hasProperty Bob big
  hasProperty Bob cold
  @cond8 hasProperty Bob big
  @cond9 hasProperty Bob cold
  @cons10 hasProperty Bob green
  @and11 And $cond8 $cond9
  Implies $and11 $cons10

Query: @goal hasProperty Bob green
Result: NOT PROVED
```

**Expected:** Modus ponens should apply: A→B, A ⊢ B

**Current:** Rule is stored but conclusion is not derived.

### Root Cause
In `kb-matching.mjs`, `rule.conclusion` stores the vector of `$cons10` (the reference), not the dereferenced `hasProperty Bob green`. When matching goal against rule conclusion, similarity is low because reference vector ≠ statement vector.

### Fix Location
`src/reasoning/kb-matching.mjs` - `tryRuleMatch()` needs to dereference conclusion before comparison.

---

## BUG #3: AND Condition Reuses Same Fact (FALSE POSITIVES)

**Severity: MEDIUM (1.4% of failures, but causes INCORRECT proofs)**

The backward chainer reuses the same KB fact to satisfy multiple AND conditions.

### Example #335
```
Context:
  Anne is cold.      ← EXISTS
  Fiona is furry.    ← EXISTS
  Fiona is NOT cold. ← NOT in KB!
  Rule: If Fiona is furry AND Fiona is cold → Fiona is blue

Question: "Fiona is blue"
Label: not entailment (should NOT be proved)

Engine Proof Steps:
  1. rule_match: hasProperty Fiona blue
  2. proving_and_condition (2 parts)
  3. condition_satisfied: hasProperty Fiona furry  ← OK
  4. condition_satisfied: hasProperty Fiona furry  ← WRONG! Should check Fiona cold!

Result: PROVED (incorrect!)
```

### Example #431
```
Rule: If Erin is X AND Erin is Y → Erin is round
Engine satisfies AND with: Erin cold, Erin cold (same fact twice!)
```

### Root Cause
The AND condition checker in backward chaining doesn't verify that each condition is matched by a DISTINCT fact. It reuses the first matching fact for all conditions.

### Fix Location
`src/reasoning/prove.mjs` or `src/reasoning/backward-chain.mjs` - AND satisfaction logic needs to:
1. Track which facts have been used
2. Ensure each AND part is satisfied by a different fact match

---

## Fixed Issues (No Longer Present)

### ~~Translator Multi-Statement Bug~~
**FIXED:** The translator now generates single-statement DSL with compound expressions:
```javascript
// Before (broken): prove() ignored second line
@neg hasProperty Bob big
@goal Not $neg

// After (fixed): single compound statement
@goal Not (hasProperty Bob big)
```

---

## Impact Analysis (based on 1000 samples)

| Fix | Expected Impact |
|-----|-----------------|
| CWA Implementation | +25.7% (257 cases) |
| Ground-term Modus Ponens | +3.2% (32 cases) |
| AND Condition Fix | +0.4% (4 cases) |
| **Potential Total** | **~100%** |

**Current accuracy:** 70.7% (707/1000)

---

## Recommended Test Cases for Regression

```javascript
// CWA test - absent fact
{
  learn: 'hasProperty Bob big',
  prove: '@goal Not (hasProperty Harry big)',
  expect: true  // Harry big is absent, so Not(Harry big) = TRUE by CWA
}

// Ground-term modus ponens
{
  learn: `
    hasProperty Bob big
    hasProperty Bob cold
    @c1 hasProperty Bob big
    @c2 hasProperty Bob cold
    @and And $c1 $c2
    @cons hasProperty Bob green
    Implies $and $cons
  `,
  prove: '@goal hasProperty Bob green',
  expect: true  // A→B, A ⊢ B
}
```

---

## Files to Modify

| File | Bug | Change |
|------|-----|--------|
| `src/reasoning/prove.mjs` | CWA | Add negation-as-failure logic in `proveGoal()` |
| `src/reasoning/kb-matching.mjs` | Modus Ponens | Dereference rule conclusion in `tryRuleMatch()` |
| `src/reasoning/prove.mjs` or `backward-chain.mjs` | AND reuse | Track used facts, ensure distinct matches |

---

*Last updated: Based on 1000-sample analysis with both reasoning engines*

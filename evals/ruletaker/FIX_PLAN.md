# RuleTaker Bugs - Fix Plan

## Status Summary

| Bug | Status | Impact |
|-----|--------|--------|
| Translator multi-statement | ✅ FIXED | +17.5% accuracy |
| CWA (Closed World Assumption) | 🔴 TODO | +27% potential |
| Ground-term Modus Ponens | 🔴 TODO | +5.5% potential |

**Current accuracy:** 67% (up from 49.5%)
**Target accuracy:** ~100%

---

## ✅ FIXED: Translator Multi-Statement Bug

The translator was generating multi-line DSL for negated questions:
```javascript
// Before (broken):
@neg hasProperty Bob big
@goal Not $neg  // ← ignored! prove() only uses first statement

// After (fixed):
@goal Not (hasProperty Bob big)  // ← single statement with compound
```

**Fix location:** `evals/ruletaker/lib/translator.mjs` - `translateQuestion()`

---

## 🔴 BUG #1: CWA (Closed World Assumption) Not Implemented

### Impact
- 55 failures (83% of remaining errors)
- +27 percentage points if fixed

### Symptom
```
KB: hasProperty Bob big
Query: @goal Not (hasProperty Harry big)
Expected: TRUE (Harry big is absent from KB)
Actual: NOT PROVED
```

### Root Cause
The prover has no negation-as-failure logic. When proving `Not(P)`:
1. It looks for explicit `Not(P)` facts in KB
2. It doesn't check "is P unprovable?"

### Fix Strategy
In `src/reasoning/prove.mjs`, add CWA handling in `proveGoal()`:

```javascript
if (goalOp === 'Not') {
  // Get inner proposition
  const innerGoal = dereferenceToStatement(goal.args[0]);

  // Try to prove inner goal
  const innerResult = this.proveGoal(innerGoal, depth + 1);

  // CWA: Not(P) is TRUE if P cannot be proved
  if (!innerResult.valid) {
    return {
      valid: true,
      method: 'closed_world_assumption',
      steps: [{ operation: 'cwa_negation', fact: `Not(${innerGoal})` }]
    };
  }

  // P is provable → Not(P) is FALSE
  return {
    valid: false,
    reason: 'Cannot prove Not(P) when P is provable'
  };
}
```

---

## 🔴 BUG #2: Ground-Term Modus Ponens Fails

### Impact
- 11 failures (17% of remaining errors)
- +5.5 percentage points if fixed

### Symptom
```
KB:
  hasProperty Bob big
  hasProperty Bob cold
  @c1 hasProperty Bob big
  @c2 hasProperty Bob cold
  @and And $c1 $c2
  @cons hasProperty Bob green
  Implies $and $cons

Query: @goal hasProperty Bob green
Expected: TRUE (modus ponens: A→B, A ⊢ B)
Actual: NOT PROVED
```

### Root Cause
In `kb-matching.mjs`, `rule.conclusion` stores the vector of `$cons` (reference), not the dereferenced `hasProperty Bob green`. Similarity matching fails because:
- Goal vector: `hasProperty Bob green`
- Rule conclusion vector: `$cons` reference

### Fix Strategy
In `src/reasoning/kb-matching.mjs`, dereference conclusion in `tryRuleMatch()`:

```javascript
tryRuleMatch(goal, rule, depth) {
  // Dereference conclusion if it's a reference
  let conclusionVec = rule.conclusion;
  if (rule.conclusionAST?.type === 'Reference') {
    const refName = rule.conclusionAST.name;
    const dereferencedVec = this.session.scope.get(refName);
    if (dereferencedVec) {
      conclusionVec = dereferencedVec;
    }
  }

  const goalVec = this.session.executor.buildStatementVector(goal);
  const conclusionSim = similarity(goalVec, conclusionVec);
  // ... rest of method
}
```

---

## Implementation Order

1. **Fix CWA first** - Higher impact (83% of failures)
2. **Fix Modus Ponens** - Lower complexity, 17% of failures

## Verification

After each fix, run:
```bash
node evals/runRuleTakerEval.mjs --fast          # Quick check (100 samples)
node evals/runRuleTakerEval.mjs --sample=500    # Full validation
node evals/runFastEval.mjs                      # Regression check (all suites)
```

---

## Risk Assessment

- **CWA fix**: Medium risk - affects all Not() proofs, needs careful testing
- **Modus Ponens fix**: Low risk - isolated to rule matching path

---

*Last updated: After translator fix, 67% baseline*

# Stress Query Regressions (Status)

Acest folder a fost redus intenționat la 2 suite de regresie (uite `suite1.mjs` și `suite2.mjs`).

## Confirmed bugs (fixed)

### 1) CWA (negation-as-failure) pentru `Not(P)`

- **Status:** FIXED
- **Regresii:** `evals/stress_queries/suite1.mjs`, `evals/stress_queries/suite2.mjs`, `evals/fastEval/suite25_ruletaker_bugs/cases.mjs`
- **Note:** există și toggle din DSL: `@_ Set CWA on|off` (vezi `docs/specs/DS/DS02-DSL-Syntax.md`).

### 2) “Ground rule leakage” (matching prea lax / cross-entity)

- **Status:** FIXED
- **Regresii:** `evals/stress_queries/suite2.mjs`
- **Rezultat așteptat:** `Water frozen` rămâne **unprovable** dacă nu există `Water cold`.

## Open bugs (unfixed)

### 3) Conjunction consequent extraction (And in consequent not expanded)

- **Status:** OPEN
- **Discovered:** 2025-12-23 via LogiGlue/ProntoQA evaluation
- **Issue:** When a rule has a conjunction in the consequent (`Implies (And A B C) (And D E F)`), the reasoner fires the rule but does NOT extract individual facts from the consequent.
- **Test case:**
```
@typeA isA ?x Yumpus
@typeB isA ?x Shumpus
@typeC isA ?x Brimpus
@and1 And $typeA $typeB $typeC
@consA isA ?x Dumpus
@consB isA ?x Tumpus
@consC isA ?x Lorpus
@and2 And $consA $consB $consC
Implies $and1 $and2

isA Polly Yumpus
isA Polly Shumpus
isA Polly Brimpus
```
- **Expected:** `isA Polly Tumpus` should be PROVABLE (since Tumpus is part of the And-consequent)
- **Actual:** NOT PROVED
- **Impact:** ~68% of ProntoQA failures are due to this bug
- **Fix suggestion:** When deriving from a conjunction consequent, expand it and add each component as a separate derived fact

### 4) Deep chaining with conjunctions

- **Status:** OPEN (possibly related to #3)
- **Issue:** When proofs require multiple inference steps through conjunction rules, the reasoner may fail to find the path.
- **Impact:** Complex ProntoQA problems with 3+ step chains fail

## Removed

`cases.mjs` (cross-domain query experiments) a fost șters: conținea meta-op-uri/queries care nu sunt "contract" stabil pentru engine și produceau false "bugs".

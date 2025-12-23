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

## Removed

`cases.mjs` (cross-domain query experiments) a fost șters: conținea meta-op-uri/queries care nu sunt “contract” stabil pentru engine și produceau false “bugs”.

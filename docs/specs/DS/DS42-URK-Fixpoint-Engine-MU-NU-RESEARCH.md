# AGISystem2 - System Specifications
#
# DS42: URK — Fixpoint Engine (MU/NU), Dedup, Budgets, Traces (Research)
#
**Document Version:** 0.1  
**Status:** Research / Proposed (not implemented)  
**Audience:** Reasoning engine developers, evaluation authors  

---

## 1. Purpose

This DS specifies the execution model for URK programs (DS41):

- an engine that evaluates `STEP`, `FILTER`, and `MU` (and prepares for `NU` as a research extension),
- with explicit budgeting, deduplication, trace emission, and optional caching.

This engine is intended to be used as a **tactic** inside HDC-first reasoning (DS40), not as a separate “second reasoning system”.

---

## 2. Core Data Types

### 2.1 Candidate

URK operates over candidates produced by backends:

```ts
type Candidate = {
  state: State
  score: number
  witnesses?: number
  provenance?: unknown
}
```

`score` is interpreted as “higher is better”. The engine itself does not interpret the meaning of the score beyond ranking and thresholds.

### 2.2 Fingerprint and equality

URK requires a stable dedup key:

- `fingerprint(state)` must be stable within the session and backend configuration.
- EXACT can provide exact fingerprints.
- Dense/metric strategies may provide approximate fingerprints (collision risk accepted under budget).

If a backend does not provide `fingerprint`, the engine uses a fallback hashing strategy chosen by the session (strategy-aware).

---

## 3. Budget Model

URK must never run unbounded. The engine enforces budgets at runtime.

### 3.1 Standard budgets

```ts
type Budget = {
  maxDepth?: number
  maxStates?: number
  maxTimeMs?: number
  beamWidth?: number
  minScore?: number
}
```

Notes:

- `maxDepth` bounds the number of iterations for `MU`.
- `maxStates` bounds total unique states admitted to `seen`.
- `maxTimeMs` bounds wall-clock time.
- `beamWidth` bounds the active frontier size at each depth (beam-search).
- `minScore` is applied at admission time to prune candidates early.

Defaults must be conservative and must be recorded in the trace output.

---

## 4. Execution Algorithms

This DS specifies algorithms by operator. Backend details are in DS43.

### 4.1 `STEP` evaluation

`STEP` delegates to the backend:

- input: one parent state
- output: a list of candidates

The engine immediately:

- applies `minScore` if configured,
- normalizes (if backend provides `normalize`),
- fingerprints and dedups within this expansion (optional optimization).

### 4.2 `FILTER` evaluation

FILTER applies a list of filters to the candidate set produced by its child node.

**Execution rules (proposed):**

- Filters are applied in order.
- Each filter produces:
  - a pruned candidate list
  - a trace event summarizing the pruning (kept/dropped counts, parameters).

**Required deterministic tie-breaking:**

- For `topK`, ties must be resolved by a stable key:
  1) higher score first
  2) then higher witnesses (if present)
  3) then fingerprint lexical order

This ensures deterministic results when scores are equal.

### 4.3 `MU` evaluation (least fixpoint closure)

MU executes its body repeatedly from a seed state.

#### 4.3.1 Baseline worklist algorithm

```text
seen = {}                      // fingerprint -> best candidate
frontier = [seedCandidate]

for depth = 0..maxDepth-1:
  next = []
  for parent in frontier:
    out = eval(body, parent.state)
    for cand in out:
      if cand.score < minScore: continue
      fp = fingerprint(cand.state)
      if fp not in seen OR cand better than seen[fp]:
        seen[fp] = cand
        next.push(cand)
  frontier = pruneBeam(next, beamWidth)
  stop if frontier empty or budgets exceeded
return {seen, frontier, stats}
```

This is a generalization of STAR (DS39) and can be used for both EXACT and dense-like strategies.

#### 4.3.2 Semi-naive variant (recommended for EXACT)

For EXACT-style monotonic residual closure, the engine should support a semi-naive mode:

- maintain `delta` (new states this iteration),
- compute only successors of `delta`,
- never re-expand states that were already expanded unless the candidate improved.

This reduces redundant work and aligns with classic least-fixpoint evaluation patterns.

#### 4.3.3 “Better than seen” policy

When an already-seen fingerprint appears again, we may replace it only if the candidate is better under a stable comparison:

1) higher score
2) then higher witnesses
3) then “shallower depth” (prefer shorter derivations when tied)

This is a heuristic policy, but it stabilizes results and improves trace quality.

---

## 5. Traces and Provenance

URK must emit a structured trace that supports:

- debugging (why did closure stop? what was pruned?),
- evaluation metrics (expansions, dedup rate, cache hits),
- later conversion to UTE evidence objects (DS34).

### 5.1 Minimal trace events (proposed)

- `programStart`: program id/hash, backend id, budgets (resolved defaults).
- `expand`: parent fingerprint, number generated, summary stats (min/max score).
- `filterApplied`: filter type, params, before/after counts.
- `admit`: candidate fingerprint, score, depth, parent fingerprint (edge).
- `dedup`: collisions/updates count.
- `budgetStop`: which budget triggered stop.
- `programEnd`: totals.

### 5.2 Provenance payloads

Candidates can optionally carry backend-defined provenance:

- EXACT: witness source fact ids (or counts), residual derivation info.
- EMA: which chunk matched, similarity margins, decode path.
- Dense: topK neighbor list, similarity scores.

URK stores provenance only if requested by opts; otherwise it should keep only counts (memory safety).

---

## 6. Storage and Caching (Session-local)

URK itself is an engine; caching policy is defined by DS40. This DS specifies engine-level requirements:

- The engine must accept an optional `Cache` interface.
- The cache key must include a `kbEpoch` (session-local) to invalidate results on KB mutation.
- The engine must be able to run with caching disabled.

---

## 7. Research Extension: `NU` (greatest fixpoint / invariants)

`NU` is not part of the MVP, but the engine should be designed to support it.

Conceptual use:

- `MU` models reachability / “eventually” (least fixpoint).
- `NU` models invariants / “always” (greatest fixpoint).

In practice, supporting `NU` requires:

- a notion of state-set complement or an abstract domain for states,
- or a dual “descending” iteration with widening/narrowing in an abstract interpretation style.

Therefore `NU` remains research-only until a concrete state-set representation is chosen.

---

## 8. Metrics (for eval suites)

URK should report counters aligned with evaluation needs:

- expansions (parents expanded)
- generated candidates
- admitted states (unique fingerprints)
- dedup collisions
- pruned by minScore
- pruned by topK/beam
- max frontier size
- depth reached
- cache hits/misses (if enabled)

These metrics allow assessing whether closure tactics reduce symbolic fallback frequency (DS40), and where the costs are.

---

*End of DS42*


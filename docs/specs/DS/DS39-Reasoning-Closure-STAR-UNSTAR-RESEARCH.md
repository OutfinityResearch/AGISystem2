# AGISystem2 - System Specifications
#
# DS39: STAR / UNSTAR — Reasoning Closure Primitives (Research)
#
**Document Version:** 0.1  
**Author:** Sînică Alboaie  
**Status:** Research / Proposed (not implemented)  
**Audience:** Core developers, reasoning-engine developers, HDC researchers  

---

## 1. Purpose

AGISystem2 already uses an operational “reasoning equation” style of computation: given a knowledge composite and a query key, apply **UNBIND** to reveal missing structure, then perform **decoding / cleanup** to map the residual back to candidates.

This DS proposes two **engine-level** primitives that generalize “one-shot unbind” into controlled multi-step inference:

- **STAR(query)**: forward closure / saturation from a seed query-state.
- **UNSTAR(goal)**: reverse closure / abduction from a target goal-state.

The intent is to unify multiple reasoning styles (symbolic, holographic, hybrid) under one standard **worklist/beam** loop, while keeping strategy-specific details inside a pluggable **step operator**.

These primitives are research-level because:

- they require careful budget controls (beam width, thresholds, deduping) to be practical;
- they benefit strongly from strategy-specific indexing (especially for EXACT);
- they introduce new debug/provenance expectations.

---

## 2. Core Idea (Engineering View)

Instead of treating the holographic equation as a single operation:

```
Answer ≈ UNBIND(KB, QueryKey)
```

we treat it as producing **states** that can be fed back into the same process:

```
state0 = seed
state1..k = step(state0)
state(k+1).. = step(statek)
...
```

When the step function is “sound enough” (EXACT) this can behave like true closure; when it is approximate (dense/holo) it behaves like a beam-search closure under a budget.

---

## 3. Definitions

### 3.1 State

This DS uses the term **State** to mean a hypervector-like representation of a partially specified query/goal in the current session, compatible with the reasoning pipeline’s holographic path:

- for XOR-like strategies: typically a single vector;
- for EXACT: typically a monom or a small polynomial (vector is a set of monoms).

The DS deliberately does not force a single concrete internal type. A state is “whatever the session/strategy already uses as a query key vector”.

### 3.2 Candidate

A **Candidate** is a next state produced by one inference step, with an associated score and optional provenance.

---

## 4. Engine Contract: StepOperator

STAR/UNSTAR require the engine to call a strategy-agnostic interface that can produce next states:

```ts
type State = HVec

type Candidate = {
  state: State
  score: number         // normalized, higher is better
  witnesses?: number    // optional: exact witness counts, if available
  provenance?: unknown  // optional: debug/explain payload
}

interface StepOperator {
  forwardStep(state: State): Candidate[]
  backwardStep?(state: State): Candidate[]
  normalize?(state: State): State
  fingerprint?(state: State): string // for exact dedup; otherwise engine hashes
}
```

Notes:

- `normalize` is a cleanup hook (e.g., remove structural noise, canonicalize).
- `fingerprint` is recommended for strategies that have a natural canonical form (EXACT).
- The engine must not assume that `State` is serializable or comparable by deep equality.

---

## 5. Primitive: STAR (Forward Closure / Saturation)

### 5.1 Signature (conceptual)

```ts
STAR({
  seed: State,
  step: StepOperator,
  maxDepth?: number,
  maxStates?: number,
  beamWidth?: number,
  minScore?: number,
  dedup?: "exact" | "approx",
}): {
  seen: Map<string, Candidate> // best candidate per fingerprint
  frontier: Candidate[]        // last expanded layer (debug)
  stats: {
    expansions: number
    generated: number
    pruned: number
    depth: number
  }
}
```

### 5.2 Operational semantics

STAR performs a worklist expansion starting from `seed`, applying `forwardStep` repeatedly until:

- reaching a fixpoint (no new states),
- exhausting a budget (depth/states/beam),
- or all candidates fall below `minScore`.

The engine maintains:

- `seen`: best-scoring representative per state fingerprint.
- `frontier`: the active beam being expanded.

This makes STAR a strict generalization of the current “one-step holographic attempt”: setting `maxDepth=1` recovers the existing pattern.

---

## 6. Primitive: UNSTAR (Reverse Closure / Abduction)

UNSTAR is the reverse analogue of STAR: given a desired goal-state, repeatedly apply `backwardStep` to enumerate plausible preconditions / explanations that could produce that goal.

### 6.1 Signature (conceptual)

```ts
UNSTAR({
  goal: State,
  step: StepOperator,
  maxDepth?: number,
  maxStates?: number,
  beamWidth?: number,
  minScore?: number,
  dedup?: "exact" | "approx",
}): {
  explanations: Map<string, Candidate>
  frontier: Candidate[]
  stats: { expansions: number; generated: number; pruned: number; depth: number }
}
```

The intended uses are:

- explanation generation (“what could make this true?”),
- hypothesis search,
- backchaining-like behavior in a holographic setting.

---

## 7. Strategy-Specific Step Operators

### 7.1 EXACT: exact, indexable steps

For EXACT, `forwardStep` can be implemented as a quotient-like unbind step:

1. interpret `state` as a mask/pattern `q`;
2. find facts `t` such that `q ⊆ t` (subset check);
3. emit residuals `r = t \\ q`.

This becomes practical only with an index:

- posting lists / bitsets mapping each atom-bit to the set of facts containing it,
- candidate retrieval as intersection of postings for all bits in `q`,
- residual computed via bit operations.

Scoring can use witness counts (C2-style) when available.

For UNSTAR (reverse), `backwardStep` can enumerate “preimages”:

- for each `t` that contains `goal`, emit `q = t \\ goal` as a plausible precursor.

### 7.2 Dense / Metric-Affine / EMA: approximate beam steps

For dense-style strategies, the step typically looks like:

1. compute `u = unbind(KB, state)`;
2. decode via `topKSimilar` over a candidate domain;
3. produce next states from decoded candidates and maintain a beam.

These operators are inherently approximate, so STAR/UNSTAR act as bounded beam-search rather than true closure.

---

## 8. Invariants and Safety

The engine must guarantee:

- **termination under budget** (hard caps on depth and state count),
- **determinism** given deterministic `StepOperator` output ordering (or explicit sorting),
- **stable deduping** (fingerprint-based when exact; approximate hashing otherwise),
- **debuggability**: counts of expansions, prunes, and final frontier.

### 8.1 Budget ceilings and absorbing boundary states

To keep closure practical across strategies, the engine SHOULD support backend-defined “ceiling normalization”.

For EXACT in particular, closure can trigger an explosion in:

- monom bit density,
- polynomial term count.

URC introduces two runtime-reserved sentinel atoms (DS26):

- `BOTTOM_IMPOSSIBLE`: contradiction / dead-end (absorbing).
- `TOP_INEFFABLE`: resource boundary / unknown (absorbing).

Recommended engine rule:

- If a state contains `BOTTOM_IMPOSSIBLE`, normalize to `{BOTTOM_IMPOSSIBLE}` and do not expand.
- If a state contains `TOP_INEFFABLE`, normalize to `{TOP_INEFFABLE}` and do not expand.

Recommended backend rule (EXACT):

- If `popcount(monom) > ineffableBitThreshold`, replace the monom with `{TOP_INEFFABLE}`.
- If `polyTermCount > ineffableTermThreshold`, replace the polynomial with `{TOP_INEFFABLE}`.

These thresholds are part of the closure budget and should be recorded in traces.

The engine must not assume that:

- `BIND == UNBIND` for all strategies,
- similarity baselines are comparable across strategies,
- a “residual” can be decoded without a candidate set.

---

## 9. Integration Points (Proposed)

- Add STAR/UNSTAR as internal reasoning primitives (not user-facing DSL at v0).
- Expose a high-level Session API later (see DS27) that can opt into STAR/UNSTAR for specific tasks, with explicit budgets and result provenance.

---

## 10. Rationale (Why this is worth exploring)

STAR/UNSTAR are not “one more HDC operation”. They are a unifying **engine loop** that:

- allows multi-step inference without committing to a single symbolic calculus,
- makes EXACT’s indexability pay off beyond one-shot queries,
- provides a consistent place to measure performance (expansions/pruning) and improve heuristics.

The key research question is not whether closure exists, but how to choose budgets, scoring, and normalization so that the closure is useful across strategies and tasks.

---

*End of DS39*

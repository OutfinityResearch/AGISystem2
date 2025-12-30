# AGISystem2 - System Specifications
#
# DS44: URK — Extensions (Semiring Weights, Constraint Layer, Symbolic Execution) (Research)
#
**Document Version:** 0.1  
**Author:** Sînică Alboaie  
**Status:** Research / Proposed (not implemented)  
**Audience:** UTE roadmap contributors, reasoning engine developers  

---

## 1. Purpose

URK MVP (DS41–DS43) is intentionally small: `STEP`, `FILTER`, `MU`.

This DS describes research extensions that convert URK from “multi-hop retrieval under budget” into a credible nucleus for a Universal Theory Engine (UTE):

1. **Weights as a semiring** (cost / probability / witness support).
2. **Constraint Layer plugin** (numeric + units + consistency checks).
3. **Symbolic execution over theories** (traces + path conditions + counterexamples).

These extensions are optional and are proposed to align URK with UTE capability goals (DS32–DS38).

---

## 2. Extension E1: Weights as a Semiring

### 2.1 Motivation

Today, candidates carry a scalar `score`. This is useful for ranking but limits semantics.

UTE requires richer reasoning modes:

- “best explanation” (most supported)
- “cheapest plan” (minimum cost)
- “most likely hypothesis” (probabilistic semantics)

These can be modeled by generalizing `score` into a **weight** with a small algebra:

- how to combine weights along a path (sequence),
- how to aggregate alternative paths (choice),
- how to compare candidates (ordering).

### 2.2 Proposed interface (engine-level)

```ts
type Weight = unknown

type WeightSemiring = {
  // combine along a trace/sequence
  times(a: Weight, b: Weight): Weight

  // combine across alternatives (choice)
  plus(a: Weight, b: Weight): Weight

  // ordering for topK/beam (higher is better)
  compare(a: Weight, b: Weight): number

  one(): Weight
  zero(): Weight
}
```

URK then treats candidates as:

```ts
type Candidate = { state: State; weight: Weight; provenance?: unknown }
```

### 2.3 Concrete weight families (examples)

- **Witness support (EXACT):** weight = witness count; `plus = +`, `times = *` or `min`, `compare = numeric`.
- **Cost planning:** weight = cost; use min-plus (compare lower cost as “better” by negating or custom compare).
- **Probability:** weight = log-probability; `plus = logsumexp`, `times = +`.
- **Fuzzy confidence:** weight = [0..1]; `plus = max`, `times = min` (or product).

The point is not to commit to one, but to standardize the “pluggable weight algebra” that UTE can reuse across domains.

### 2.4 Relationship to DS42

The fixpoint engine needs only:

- a stable ordering for pruning (`topK`, beam),
- a combine rule if/when URK introduces explicit `SEQ`/`CHOICE` nodes.

Therefore, semiring weights can be introduced incrementally:

- MVP: keep scalar score.
- Later: upgrade to weight + compare, then add `times/plus` when the IR includes sequence/choice.

---

## 3. Extension E2: Constraint Layer Plugin (Numeric + Units)

### 3.1 Motivation

UTE explicitly targets numeric modeling and unit-aware reasoning (DS37), and contradiction/revision workflows (DS34).

HDC representations are excellent for structure and retrieval but insufficient for numeric consistency by themselves.

Therefore URK states should be allowed to carry a **constraints** component in addition to the HDC structure.

### 3.2 Proposed State shape

```ts
type URKState = {
  hdc: State         // existing vector-like representation
  constraints?: ConstraintStore
  evidence?: Evidence
}
```

The `constraints` store is a plugin owned by the session and may support:

- intervals (`x ∈ [a,b]`)
- equalities/inequalities
- unit constraints (dimensional analysis)
- simple linear constraints (future)

### 3.3 Constraint plugin contract (minimal)

```ts
type ConstraintStore = {
  clone(): ConstraintStore
  isSatisfiable(): boolean
  addConstraint(c: unknown): void
  merge(other: ConstraintStore): ConstraintStore
  summarize(): unknown
}
```

URK integrates constraints via:

- `FILTER`: reject candidates whose constraints become unsatisfiable.
- `STEP`: may add/propagate constraints as part of backend provenance (domain-defined).

### 3.4 Widening / narrowing (research)

Once loops (`MU`) interact with numeric constraints, naive closure can diverge (ever-tightening constraints) or explode.

To support invariants (`NU`) or to make `MU` converge in abstract domains, URK may need widening/narrowing policies:

- widening to stabilize iteration,
- narrowing to refine results afterwards.

This is explicitly research-level and should be introduced only after minimal constraint use cases are validated.

---

## 4. Extension E3: Symbolic Execution over Theories (Traces + Path Conditions)

### 4.1 Motivation

URK already produces traces. With extensions, traces can become first-class “executions”:

- a trace is a sequence of steps,
- each step can add conditions/constraints,
- alternative branches correspond to different traces.

This resembles symbolic execution, but URK keeps the HDC substrate for retrieval and structure.

### 4.2 Minimal deliverables (research)

- **Trace Explorer:** enumerate traces up to budgets; show why each branch was kept/pruned.
- **Counterexample Finder:** search for a trace that violates a predicate (requires `TEST`/guards, or FILTER + explicit violation checks).
- **Invariant Checker:** once `NU` is meaningful, attempt greatest-fixpoint style checks for “always true” properties.

### 4.3 Relationship to UTE

- DS34 (provenance/contradictions/revision): traces become evidence objects; path conditions explain contradictions.
- DS35 (causal/mechanistic): traces correspond to mechanism chains; counterexamples correspond to failed mechanisms.
- DS38 (experiment planning): traces correspond to plans; weights correspond to cost/utility; constraints encode feasibility.

---

## 5. Proposed DS split (research package)

URK extensions are broad; to keep specs usable, future work may split:

- DS44a: Semiring weights
- DS44b: Constraint layer + units
- DS44c: Symbolic execution / trace explorer

This DS keeps them together as “extension directions” until there is an implementation plan.

---

*End of DS44*

# AGISystem2 - System Specifications
#
# DS45: URK Extensions for Probabilistic + Mathematical Reasoning (Research)
#
**Document Version:** 0.1  
**Status:** Research / Product proposal (not implemented)  
**Audience:** Core architects, reasoning-engine developers, HDC/VSA researchers, UTE roadmap contributors  
**Scope:** Strategy-agnostic (EXACT, Dense-Binary, Metric-Affine, EMA, future strategies)  

---

## 1. Problem Statement

AGISystem2 can encode structured knowledge in VSA/HDC and answer many queries via strategy-dependent operations (bind/bundle/unbind/similarity + decoding/cleanup).

To advance toward a Universal Theory Engine (UTE), we need two missing capability families:

1. **Probabilistic reasoning:** uncertainty, competing explanations, aggregation across derivations, confidence semantics that can be audited.
2. **Mathematical reasoning:** formulas, units, numeric constraints, satisfiability checks, and bounded inference over numeric consequences.

This DS proposes a strategy-agnostic extension to URK (UTE Reasoning Kernel) that supports both families while keeping:

- VSA/HDC as the universal substrate for **structure and retrieval**,
- explicit plugins for **weights** and **constraints** for correctness,
- one shared reasoning engine loop across EXACT and dense/metric strategies.

This is not a monolithic theorem prover. It is an extensible reasoning runtime that:

- generates candidate derivations using VSA/HDC,
- validates and propagates semantics using small, checkable plugins,
- remains budgeted and instrumented.

---

## 2. Architectural Principle

URK re-frames reasoning as program evaluation:

```
Answer = Eval(Program, SeedState, Backend)
```

instead of “UNBIND once”. URK already introduces program-level control (DS41) and closure/iteration (DS42), plus backend mapping (DS43).

This DS adds the missing semantics layers:

- **Weights** (probabilistic/uncertainty/planning semantics) as an algebra.
- **Constraints** (math/units/numerics) as an explicit domain with satisfiability.

URK then evaluates the *same program semantics* across backends:

- EXACT can enumerate residual candidates and count witnesses.
- Dense/EMA/Metric can propose top-K candidates by similarity (beam search).

---

## 3. Core State Model (Extended)

URK must operate on a state that can carry both VSA structure and semantic payload:

```ts
type URKState = {
  hv: HVec,                   // strategy-owned vector-like representation
  constraints?: Constraint,   // optional: math/units/numeric constraints
  weight?: Weight,            // optional: uncertainty/cost/support weight
  evidence?: Evidence         // provenance, witnesses, trace notes
}
```

Key implications:

- VSA/HDC remains responsible for **candidate generation** and structural matching.
- Correctness and “meaning” for probability/math live in `weight` and `constraints`.
- Evidence is first-class: we must be able to explain “why this weight/constraint exists”.

This state model aligns with UTE provenance goals (DS34) and numeric modeling goals (DS37).

---

## 4. Probabilistic Reasoning via Weight Algebra

### 4.1 Requirements

Probabilistic reasoning in AGISystem2 must support:

- uncertain facts and uncertain retrieval (HDC similarity is not truth),
- competing derivations (“multiple proofs / multiple explanations”),
- aggregation across alternatives (marginals) and selection of best explanation (MAP),
- deterministic ranking under budgets (for reproducible evaluation).

### 4.2 Weight Algebra (plugin contract)

Weights are not “just a score”. They are combined along sequences and aggregated across alternatives.

Proposed interface:

```ts
interface WeightAlgebra<W> {
  one(): W
  zero(): W

  // Sequence: extend a derivation by one more step.
  combineSeq(a: W, b: W): W

  // Alternatives: aggregate multiple derivations for the same answer.
  combineAlt(a: W, b: W): W

  // Ordering used for pruning/beam/topK (must be deterministic).
  better(a: W, b: W): boolean

  normalize?(w: W): W
}
```

**URK obligations:**

- URK must treat `WeightAlgebra` as a session-level component (DS26).
- URK must record which algebra is active in traces for auditability.
- URK must aggregate weights *per answer fingerprint* using `combineAlt`, not silently discard alternatives.

### 4.3 Weight assignment (where weights come from)

Each backend step must attach a weight contribution to each candidate:

- **EXACT:** witness-derived weight (e.g., count of supporting facts, normalized ratios, or log-support).
- **Dense/Metric/EMA:** similarity-derived weight (e.g., normalized similarity/margin), possibly calibrated.
- **Symbolic (optional backend):** deterministic weights (1/0) or rule-provided weights.

Importantly, “HDC similarity” is not probability. The algebra allows us to:

- keep similarity as a heuristic weight,
- later replace it with calibrated weights without changing URK control semantics.

### 4.4 Aggregation modes (answer semantics)

The system must expose which semantics it uses when multiple derivations yield the same answer:

- **MAP:** keep only the best derivation per answer (fast, explainable).
- **Marginal:** combine all derivations per answer using `combineAlt` (more faithful; may be expensive).

This is not an engine detail; it changes the meaning of the output.

Therefore URK evaluation must tag outputs with:

- aggregation mode,
- algebra id,
- budget used (so “marginal under beam search” is not misinterpreted as true marginal).

---

## 5. Mathematical Reasoning via Constraint Domains

### 5.1 Requirements

Mathematical reasoning here means:

- represent formulas structurally (retrieve them via VSA/HDC),
- apply bounded transformation/propagation steps,
- maintain explicit constraints (units, intervals, linear constraints),
- prune inconsistent branches early,
- return conditional results with evidence (“if constraints C hold, then …”).

This is “constraint reasoning over retrieved structure”, not full theorem proving.

### 5.2 Constraint domain contract (plugin)

Constraints must be explicit and checkable.

Proposed interface:

```ts
interface ConstraintDomain<C> {
  empty(): C
  isSat(c: C): boolean
  meet(a: C, b: C): C              // combine constraints (intersection)
  addFact(c: C, fact: unknown): C  // incorporate a derived constraint
  project?(c: C, vars: string[]): C
  widen?(prev: C, next: C): C
  explainUnsat?(c: C): unknown
}
```

URK integration rules:

- each candidate state carries its own constraints object (persistent/immutable style is recommended),
- `FILTER` can reject candidates where `isSat(constraints)` is false,
- steps may call `addFact` to propagate numeric consequences,
- `meet` is used when multiple sources contribute constraints to the same state/answer.

### 5.3 Domain hierarchy (capabilities)

The constraint domain is intentionally pluggable. The following are target capability classes:

- **Units / dimensional analysis:** detect mismatches early; enforce unit-correct transformations.
- **Intervals:** fast bounds propagation (`x ∈ [lo,hi]`); highly valuable for science/engineering.
- **Linear constraints:** inequalities and equalities in a restricted fragment (“Presburger-lite”); contradiction detection and tighter bounds.
- **External solver hook (optional):** SMT/CAS integration without changing URK control semantics.

Each domain must declare:

- supported constraint forms,
- expected complexity,
- and whether `widen` is required for loops.

### 5.4 Formulas as VSA structure

Formulas live in the KB as structured records (DS07a style), strategy-agnostic:

- `EQ(Pos1, lhs, Pos2, rhs)`
- `LT(lhs, rhs)`, `UNIT(x, m/s)`, etc.

Expressions are compositional trees:

- `ADD(x, MUL(a,t))`, `DIV(v,t)`, …

VSA/HDC is used to:

- retrieve relevant axioms and constraints quickly,
- propose substitutions/rewrite candidates,
- unify contexts and variable patterns (with symbolic validation if needed).

Constraint domains are used to:

- decide satisfiability,
- compute propagated numeric consequences (bounds/unit checks),
- produce unsat explanations for pruning and debugging.

---

## 6. URK Program Semantics for Prob+Math

URK’s program semantics are defined by DS41/DS42. This DS specifies the additional expectations when weights and constraints are active.

### 6.1 Step semantics (candidate production)

Each step produces `CandidateState` objects:

```ts
type CandidateState = {
  state: URKState
  stepWeight?: Weight
  stepEvidence?: Evidence
}
```

Engine combination:

- newWeight = combineSeq(parent.weight, stepWeight)
- newConstraints = meet(parent.constraints, stepConstraints)
- evidence is accumulated as a trace (bounded) or as a structured summary

### 6.2 Constraint pruning

Constraint pruning must happen as early as possible:

- immediately after `meet/addFact`,
- before expensive decoding steps (when possible),
- with `explainUnsat` optionally attached for diagnostics.

### 6.3 Fixpoint and convergence with constraints

When `MU` is used with constraints:

- the engine must dedup by fingerprint that includes both structure and the “relevant constraint summary”.
- widening/narrowing may be needed for convergence if constraints keep evolving.

This is a research area. Until an abstract domain is stabilized, URK must require strict budgets and treat results as “bounded inference under constraints”.

---

## 7. Cross-strategy Semantics and Guarantees

URK must remain honest about differences across backends:

### 7.1 EXACT vs dense-like backends

- EXACT can enumerate candidate residuals exactly (subject to budgets) and can count witnesses.
- Dense/Metric/EMA typically operate as similarity-guided decoding; they must prune aggressively and cannot claim enumeration.

URK outputs must therefore include backend metadata:

- strategy id,
- whether the step is enumerative vs heuristic,
- budgets used,
- and whether validation was applied.

### 7.2 “Correctness” model

URK does not replace symbolic validation where needed.

Instead URK becomes:

- a universal control and evidence layer,
- plus strategy-native candidate generation,
- plus plugins that provide explicit semantics for probability and constraints.

Symbolic reasoning remains necessary for:

- precise unification beyond what HDC decoding can guarantee,
- contradictions and proof validation in open-world semantics,
- deep rule chaining when holographic closure is insufficient.

This aligns with DS06 (advanced reasoning) and DS34 (provenance/contradiction).

---

## 8. Reasoning Modes Enabled (Product-facing)

With weights + constraints integrated, URK can express a broad set of reasoning workflows:

1. **Best explanation (MAP):** return best proof trace and its weight.
2. **Aggregate support (marginal):** combine derivation weights per answer and return aggregated support.
3. **Multi-hop inference under uncertainty:** closure with pruning where each hop contributes weight.
4. **Consistency checking:** detect and explain UNSAT branches (unit mismatches, interval contradictions).
5. **Symbolic simulation (conditional results):** return “if constraints C hold, then conclusion K”.
6. **Planning-like search:** treat step weights as costs and search for cheapest/best trace (requires ordering and aggregation).
7. **Counterexample search / invariants (research):** integrate with `NU` and guard predicates to find violating traces (ties to DS35/DS38).

---

## 9. Engineering Risks and Mitigations

### 9.1 Combinatorial explosion

Mitigations are mandatory:

- beam width and topK filters for dense-like strategies,
- witness thresholds and projections for EXACT,
- strict budgets (depth/states/time),
- caching keyed by `kbEpoch` (DS40) when safe.

### 9.2 Misinterpretation of “probability”

Mitigations:

- treat similarity-derived weights as heuristic unless calibrated,
- label outputs with algebra/mode/budget,
- provide calibration evaluation hooks (reliability curves) before claiming “probabilistic correctness”.

### 9.3 Constraint correctness expectations

Mitigations:

- explicitly scope constraint domain capabilities,
- keep domains small and checkable,
- provide `explainUnsat` for transparency,
- make external solver integration optional and pluggable.

### 9.4 Cross-strategy semantic drift

Mitigations:

- URK defines control semantics; backends only provide `STEP`, `project`, and fingerprint.
- “Golden” evaluation programs run on EXACT and on a dense backend to compare qualitative behavior (not necessarily equality).

---

## 10. Metrics (How to evaluate)

### 10.1 Engine metrics

- expansions/sec, generated/admitted/pruned counts
- frontier sizes, dedup rate
- cache hit/miss (if enabled)
- SAT/UNSAT pruning rate and time saved
- trace sizes (memory cost)

### 10.2 Reasoning quality metrics

- agreement against EXACT baseline (when applicable)
- stability of ranking under repeated runs (determinism + tie-breaking)
- calibration of weights (when using probabilistic algebras)
- unit inconsistency detection rate
- interval tightening effectiveness over iterations

These metrics should integrate with fastEval/saturation style evaluation runners.

---

## 11. Relationship to Existing DS Documents

- **URK foundation:** DS41 (IR), DS42 (engine), DS43 (backends), DS44 (extension directions).
- **Closure tactics:** DS39/DS40 (STAR/UNSTAR and integration into HDC-first mode).
- **Advanced reasoning:** DS06 (abduction/induction/what-if) can use URK as a controlled candidate generator and as an evidence layer.
- **UTE roadmap:** DS33–DS38 define the capability targets that weights/constraints enable (provenance, causality, uncertainty, numeric modeling, experiment planning).

---

*End of DS45*


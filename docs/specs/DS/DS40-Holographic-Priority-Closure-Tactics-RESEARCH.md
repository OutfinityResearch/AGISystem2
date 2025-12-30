# AGISystem2 - System Specifications
#
# DS40: Holographic Priority vNext — Closure Tactics (STAR/UNSTAR) (Research)
#
**Document Version:** 0.1  
**Author:** Sînică Alboaie  
**Status:** Research / Proposed (not implemented)  
**Audience:** Reasoning engine developers, HDC strategy developers, UTE roadmap contributors  

---

## 1. Problem Statement

AGISystem2 already has two complementary “reasoning paths”:

- **Holographic path** (HDC-first): fast candidate retrieval from vector equations, then decoding/cleanup and optional validation.
- **Symbolic path**: more complete but can be slower; used for correctness and for cases where holographic decoding is weak.

In the current design, the holographic path is often **one-shot**: attempt one UNBIND-like operation (plus decoding) and either succeed or fall back to symbolic reasoning.

This DS proposes a research upgrade: keep the same HDC-first architecture (DS17), but add **closure tactics** (DS39) that allow the holographic path to perform **bounded multi-step inference** before falling back.

The core idea is not “more HDC tricks”; it is a standard engine loop (worklist / beam / memo) applied to a strategy-provided step operator.

---

## 2. Goals / Non-goals

### 2.1 Goals

1. **More problems solved in holographic-first mode** without expanding symbolic search everywhere.
2. **Explicit budgets**: the closure mechanism must be controlled (depth/state count/beam width/time).
3. **Strategy-aware acceleration**:
   - EXACT should benefit strongly (indexable, monotonic residuals).
   - Dense/Metric/EMA should benefit via beam-search (top-K decoding).
4. **Traceability**: closure results must support provenance summaries and metrics (counts, witnesses, deltas).
5. **Reuse across UTE directions**: the same closure mechanism should later support UTE tasks like provenance, contradiction surfacing, and “theory compilation” experiments.

### 2.2 Non-goals

- Full Datalog semantics or completeness guarantees for all strategies.
- A new DSL operator at v0 (closure is an engine tactic, not user-level syntax).
- Persistent cross-session closure caches (not until KB serialization is designed).

---

## 3. Background: why EXACT is special (and why this matters)

The EXACT strategy models facts as **sets of constraints** (bitsets / monoms). Under EXACT:

- `BIND` behaves like “adding constraints” (set union at monom level).
- `UNBIND_A` behaves like a **quotient / residual**: if `q ⊆ t`, you can compute “what remains” as `t \\ q`.

This turns “multi-step holographic inference” into a fixpoint problem over residuals:

- The useful “STAR” is not “closure under BIND” (which explodes combinatorially),
- but **least fixpoint** over repeated residual extraction.

This makes closure-like reasoning feasible because the engine enumerates *residuals of existing facts*, rather than synthesizing arbitrary new combinations.

Dense/metric strategies do not have exact residual enumeration, so closure becomes a bounded beam search.

---

## 4. Engine Model: HDC-first with Closure Tactics

This DS extends DS17 by adding a new tactic stage between “one-shot holographic attempt” and “fallback to symbolic”.

### 4.1 High-level flow (proposed)

1. **Compile query** to an internal key/state (existing pipeline).
2. **Try one-shot holographic answer**:
   - `u = UNBIND(KB, key)` (or strategy equivalent)
   - decode candidates (top-K / candidate set)
   - validate (optional, strategy-dependent)
3. If the one-shot attempt fails and the query matches a closure-eligible pattern:
   - run **STAR** (forward closure) with strict budgets
   - decode / validate answers from closure frontier (or from the union of seen states)
4. If still unresolved:
   - fall back to symbolic reasoning.

UNSTAR is optionally used for explanation/hypothesis modes (abduction workflows), not for normal query answering by default.

---

## 5. What do we store? Closure Results, Scoping, and Caches

The central engineering risk is “what happens to all those STAR results?”: memory blowup, cross-query pollution, and unclear validity.

This DS proposes a **three-tier storage model** inside a Session Universe (DS26), all session-local:

### 5.1 Tier 0: ephemeral per-run results (always)

STAR returns:

- `seen`: best candidate per state fingerprint
- `frontier`: last expanded layer
- `stats`: expansion counts and pruning counters

These are returned to the caller (engine) and used immediately for decoding/validation. They are not kept by default.

### 5.2 Tier 1: per-query memo (optional, bounded)

For a single high-level query execution, keep a `ClosureMemo` object:

- keyed by `(tacticId, seedFingerprint, budgets, strategyId, geometry, kbEpoch)`
- stores `seen` and `frontier` only while the query is being solved.

This avoids recomputing closure when the engine tries multiple decoders/validators or multiple decoding passes.

### 5.3 Tier 2: session-level reusable cache (optional, aggressively bounded)

For workloads that repeatedly ask similar queries (UTE-style “batch questions over one theory”), a session-level cache can help, but must be safe:

**Key principle:** cached closure results are only valid if the KB state is unchanged.

Proposed mechanism:

- Maintain `session.kbEpoch` (monotonic integer). Increment on any KB mutation.
- Cache key includes `kbEpoch`.
- Evict by size: `maxEntries`, `maxStatesTotal`, and optional `maxBytes`.

Proposed stored payload:

- `seedFingerprint`
- `seen` mapped to fingerprints + a compact “best score + optional witnesses”
- optional: a small list of “top states” rather than all states

For EXACT, store fingerprints + bitset masks (if cheap); for dense strategies, store fingerprints only (state object can be expensive).

### 5.4 Where does fingerprint come from?

The engine requires a stable dedup key for states:

- EXACT: canonical bitset/monom representation → direct fingerprint (e.g., hex of BigInt bitset; or sorted list hash).
- Dense/metric: approximate fingerprint (e.g., quantized bytes + hash), recognizing that collisions are acceptable only inside bounded budgets.

This is an engine contract concern (see DS39).

---

## 6. Closure Algorithms (Proposed)

STAR/UNSTAR are defined in DS39; this DS specifies which algorithm variants the HDC-first engine should use, and when.

### 6.1 STAR for EXACT: semi-naive residual fixpoint

**Model:** KB facts are bitsets/monoms. `Step(q)` enumerates residuals `t \\ q` for all facts `t` that contain `q`.

To avoid O(|KB|) scans, build an index:

- `post[bit] -> set of factIds` (bitset/roaring bitmap)
- candidate facts for `q` computed as intersection of postings for all bits in `q`

**Semi-naive evaluation:**

Maintain:

- `seen`: all states reached so far
- `delta`: newly added states at the current iteration

Next delta computed only from current delta:

```
deltaNext = Step(delta) \ seen
seen = seen ∪ deltaNext
repeat
```

This is the standard way to compute least fixpoints efficiently.

**Normalization (crucial):**

Residuals can contain structural bits that are not useful as “next query keys”. EXACT should provide a `normalize/project` hook to:

- remove markers that are known to be “always present” in a family of facts,
- project onto a subset of atom categories (e.g., only operator/role bits, or only entity bits),
- optionally enforce a canonical “query-state form”.

Without normalization, closure can drift into states that are not meaningful query keys.

### 6.2 STAR for dense/metric/EMA: beam search closure

In dense strategies you cannot enumerate all residual facts; you approximate:

1. compute unbind residual vector(s) from KB and current state
2. decode top-K candidate atoms/facts from a candidate domain
3. turn each decoded candidate into a next state

Use a strict beam:

- `beamWidth` small (tens to hundreds)
- `minScore` thresholding
- `dedup` approximate
- depth cap 1–3 by default

This is best treated as “multi-hop retrieval” rather than formal closure.

### 6.3 UNSTAR: reverse closure for abduction/explanations

UNSTAR is optional and only activated in specific modes:

- explanation generation
- hypothesis search
- “why could this be true?” workflows

For EXACT, reverse step can enumerate preimages `q = t \\ goal`. For dense strategies, reverse step is a heuristic (decode likely keys that would produce the goal).

UNSTAR must always run under strict budgets.

---

## 7. What reasoning families can be accelerated?

This section maps closure tactics to reasoning families already present or planned.

### 7.1 Multi-hop chaining over facts (graph/path reasoning)

If a theory encodes graph-like relations (NEXT/EDGE, containment, membership), STAR can compute “reachable” residuals by repeated stepping.

This is directly useful for:

- transitive-like closures (reachability, ancestry, containment)
- multi-hop retrieval (“find something connected to X through a chain”)

This is also a key capability for UTE “Representation & Query” (DS33), especially for generalization-aware retrieval that is more than lookup.

### 7.2 Horn-like forward chaining (subset-driven)

If a theory’s rules can be compiled into structures where “matching a condition” looks like subset containment, EXACT + STAR can act like a forward-chaining engine over residuals (with witness counts as a ranking signal).

This can help DS06 “Advanced Reasoning” patterns in cases where:

- symbolic search would branch heavily,
- but holographic residual steps can cheaply propose a small candidate frontier.

### 7.3 Abduction / explanation search (UNSTAR)

UNSTAR can generate candidate preconditions or “explanations” for a goal-state.

This aligns with:

- DS06 abduction workflows
- DS34 (UTE provenance/contradictions/revision): explanation candidates can be surfaced as structured evidence objects later.

### 7.4 Proof-guided pruning for symbolic reasoning (hybrid)

Even when the final answer must be symbolic, closure tactics can be used as a **front-end**:

- generate candidate substitutions / intermediate claims holographically
- restrict symbolic search to a much smaller candidate set

This is a controlled form of “holographic guidance” rather than replacement.

### 7.5 UTE relevance

Closure tactics connect to UTE capabilities as follows:

- **DS33 (Representation & Query):** STAR supports multi-step retrieval patterns and path-like queries.
- **DS34 (Provenance / Contradictions / Revision):** UNSTAR + witness counts are natural building blocks for evidence and “why” reports (even before full revision semantics exist).
- **DS35 (Causal / Mechanistic):** closure tactics can be used to traverse mechanism graphs and propose candidate mechanism steps.
- **DS38 (Experiment Planning):** closure can generate candidate “information actions” (queries/experiments) as reachable states in a planning graph, under strict budgets.

---

## 8. Metrics and Reporting (Proposed)

To keep the system honest and tunable, the engine should report:

- closure attempted? (yes/no)
- closure depth reached
- expansions, generated, pruned
- peak frontier size
- cache hits (tier1/tier2)
- EXACT-only: witness counts distribution and posting-intersection cost

These metrics should integrate with evaluation runners (fastEval/saturation) to quantify:

- how often closure avoids symbolic fallback,
- and how much extra work closure adds in the failure cases.

---

## 9. Safety / Correctness Model

Closure tactics are not “more truth”. They are a **search strategy**.

Therefore:

- The engine should remain conservative: when in doubt, validate or fall back to symbolic reasoning.
- Budgets must be strict by default; closure must never become an unbounded workload.
- Cached closure results must be invalidated on KB mutation (`kbEpoch`).

EXACT can be closer to “exact closure” than dense strategies, but the system should still treat it as a tactic unless a future contract explicitly proves soundness for a defined subset of theories.

---

## 10. Implementation Notes (not part of this DS)

This DS is intentionally implementation-agnostic. The concrete API surface and file layout should be specified when the work is scheduled.

At minimum, implementing this DS would require:

- a closure runner (STAR/UNSTAR) (DS39)
- step operator adapters for at least EXACT and one dense-like strategy
- a session-local cache with kbEpoch invalidation
- evaluation instrumentation

---

*End of DS40*

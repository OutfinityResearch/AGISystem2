# AGISystem2 - System Specifications
#
# DS41: URK (UTE Reasoning Kernel) — Reasoning Programs IR (Research)
#
**Document Version:** 0.1  
**Status:** Research / Proposed (not implemented)  
**Audience:** Runtime/Reasoning developers, UTE roadmap contributors  

---

## 1. Purpose

This DS proposes a minimal, strategy-agnostic intermediate representation (IR) for **Reasoning Programs** inside AGISystem2’s Universal Theory Engine (UTE) roadmap (DS32–DS38).

The intent is to separate:

- **Control of reasoning** (composition, filtering, iteration/closure, budgets, traces)
from
- **Representation substrate** (Dense / Metric-Affine / EMA / EXACT) and its decoding/cleanup requirements.

This DS defines the **IR format and semantics** only; execution algorithms and backend mappings are defined in DS42/DS43.

---

## 2. Design Requirements (Research constraints)

1. **Backend independence:** the same IR must run on XOR-like strategies and on non-involutive strategies (EXACT).
2. **Budgeted execution:** the IR must express bounded closure (depth/state/time/beam) so it never becomes an unbounded workload.
3. **Traceability:** execution should produce structured provenance suitable for “Trace Explorer” and later UTE provenance objects (DS34).
4. **Determinism:** given deterministic backend steps, the IR evaluation should be deterministic (ordering rules must be explicit).
5. **Minimal viable core:** start with 3 primitives that are enough to unlock multi-hop reasoning:
   - `STEP`
   - `FILTER`
   - `MU` (least fixpoint / closure)

---

## 3. Core Model

URK evaluates programs over an abstract **State**.

At v0, State is treated as “the session’s internal query-key/state vector form”, not a user-facing DSL term.

Backends are responsible for:

- generating candidate successor states (`STEP`)
- associating scores/witnesses
- optional normalization/projection

---

## 4. IR Nodes (Minimal viable)

URK programs are trees. The following nodes are the MVP.

### 4.1 `STEP`

**Meaning:** perform one reasoning step from the current state.

This corresponds to the backend’s notion of “UNBIND + decode/cleanup” or “residual extraction” (EXACT).

**IR form:**

```json
{ "op": "STEP" }
```

The IR does not dictate how `STEP` is implemented. DS43 defines backend mapping rules.

### 4.2 `FILTER`

**Meaning:** prune / guard a candidate set.

FILTER is a *policy* node: it does not create candidates by itself; it transforms the candidate set produced by a nested program.

**IR form:**

```json
{
  "op": "FILTER",
  "filters": [
    { "type": "minScore", "value": 0.75 },
    { "type": "topK", "k": 50 }
  ],
  "in": { "op": "STEP" }
}
```

**Standard filter types (proposed):**

- `topK(k)`: keep best `k` candidates (ties resolved deterministically).
- `minScore(value)`: discard candidates below threshold.
- `domain(name)`: restrict decoding to a named candidate domain (backend-provided).
- `project(name)`: apply a backend-defined projection/cleanup (e.g., “drop structural atoms”).
- `dedup(mode)`: enforce dedup policy at this boundary (`exact`/`approx`).

Note: FILTER types are intentionally “declarative”. Each backend can implement a subset; unsupported filters must produce a validation error during compilation.

### 4.3 `MU` (least fixpoint / closure)

**Meaning:** iteratively execute a program starting from the current seed state until a fixpoint or a budget is reached.

MU is URK’s minimal “iteration/closure” operator. It is the IR manifestation of STAR (DS39), used as an engine tactic (DS40).

**IR form:**

```json
{
  "op": "MU",
  "body": { "op": "FILTER", "filters": [ { "type": "topK", "k": 50 } ], "in": { "op": "STEP" } },
  "budget": { "maxDepth": 3, "maxStates": 5000, "beamWidth": 50, "minScore": 0.70 }
}
```

Budget defaults must be conservative (engine-defined) and should be recorded in the trace.

---

## 5. Execution Semantics (Abstract)

URK programs are evaluated in the following abstract sense:

- `STEP` maps a single state to a set of candidate states.
- `FILTER` maps a candidate set to a smaller candidate set.
- `MU` maps a seed state to a set of states reachable under repeated execution of its body program.

URK does **not** define “truth” directly; it defines **state-space exploration** under controlled policies.

Correctness remains a property of:

- the backend step operator (strategy + session context),
- the validator (symbolic or strict checks),
- and the budgets chosen.

---

## 6. Provenance and Trace Output (IR-level shape)

URK programs must be able to emit a trace suitable for:

- debugging,
- user-facing explanation summaries,
- later conversion to UTE evidence objects (DS34).

Minimal trace requirements:

- program id/hash and resolved budgets
- for each step expansion:
  - parent state fingerprint
  - candidate fingerprints + scores
  - which filters removed what and why (counts, thresholds)

The exact trace schema is specified by DS42 (engine), but this IR DS requires that IR nodes be representable in trace events (“I ran MU with budget X”, “I applied minScore=Y”).

---

## 7. Compilation and Validation

URK compilation is responsible for:

- schema validation of the IR JSON
- ensuring all referenced filter types and domains are supported by the selected backend
- assigning defaults for omitted budgets in a deterministic way
- normalizing IR (canonical ordering of filters, canonical representation of budgets)

Compilation must fail fast on unknown operators or unknown filter types.

---

## 8. Example Programs (MVP)

### 8.1 Multi-hop retrieval (dense/EMA-style)

“Do one step, decode top-100, then iterate up to depth 2 with a beam of 50.”

```json
{
  "op": "MU",
  "budget": { "maxDepth": 2, "beamWidth": 50, "maxStates": 1000, "minScore": 0.70 },
  "body": {
    "op": "FILTER",
    "filters": [ { "type": "topK", "k": 100 }, { "type": "minScore", "value": 0.70 } ],
    "in": { "op": "STEP" }
  }
}
```

### 8.2 Residual closure (EXACT-style)

“Extract residuals repeatedly; project away structural bits; keep all distinct residuals up to 10k.”

```json
{
  "op": "MU",
  "budget": { "maxDepth": 10, "maxStates": 10000 },
  "body": {
    "op": "FILTER",
    "filters": [ { "type": "project", "name": "queryKeyCanonical" } ],
    "in": { "op": "STEP" }
  }
}
```

---

## 9. Relationship to other DS documents

- DS39 defines the STAR/UNSTAR primitive model; DS41 is the IR form that can express STAR as `MU(FILTER∘STEP)`.
- DS40 proposes engine integration as a closure tactic inside HDC-first mode.
- DS06 (Advanced Reasoning) motivates abduction/induction/what-if patterns that can use URK as a controlled front-end to reduce branching.
- DS33–DS38 define UTE capability areas that URK enables incrementally (trace exploration, evidence, planning graphs, constraint propagation).

---

*End of DS41*


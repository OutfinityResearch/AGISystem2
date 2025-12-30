# AGISystem2 - System Specifications
#
# DS43: URK — Backend Contract and Mappings (EXACT vs EMA vs Dense) (Research)
#
**Document Version:** 0.1  
**Author:** Sînică Alboaie  
**Status:** Research / Proposed (not implemented)  
**Audience:** HDC strategy developers, reasoning engine developers  

---

## 1. Purpose

URK (DS41/DS42) requires a strategy-agnostic way to execute `STEP` and implement filters like `topK`, `minScore`, and `project`.

This DS proposes:

1. a minimal backend contract for URK execution,
2. concrete mapping rules for:
   - **EXACT** (quotient-like residual extraction),
   - **Metric-Affine / EMA** (UNBIND + decode/topK),
   - **Dense-Binary** (UNBIND + decode/topK),
3. fallback rules when a strategy does not implement URK hooks.

This DS is intentionally research-level: the contract must remain small, optional, and compatible with existing strategy implementations.

---

## 2. Backend Contract (proposed)

URK backends are session-scoped: they can depend on the session KB representation, vocabulary, candidate domains, and strategy thresholds.

### 2.1 Minimal interface

```ts
type Candidate = {
  state: State
  score: number
  witnesses?: number
  provenance?: unknown
}

type URKBackend = {
  id: string

  // Produce candidate successor states for one step.
  stepCandidates(seed: State, ctx: URKContext): Candidate[]

  // Optional reverse step (abduction / UNSTAR).
  stepPreimages?(goal: State, ctx: URKContext): Candidate[]

  // Optional normalization/projection hooks referenced by FILTER(project).
  project?(state: State, projectionName: string, ctx: URKContext): State

  // Dedup key; recommended for correctness and determinism.
  fingerprint(state: State, ctx: URKContext): string
}
```

### 2.2 Context

```ts
type URKContext = {
  sessionId: string
  kbEpoch: number
  strategyId: string
  geometry: number

  // Candidate domains (named sets) exposed by the session.
  domains: Record<string, unknown>

  // Policy knobs / thresholds derived from strategy and engine opts.
  thresholds: Record<string, number>

  // Optional: access to structured KB indices (EXACT postings; EMA chunk index; ComponentKB).
  indices?: unknown
}
```

URKContext is not standardized across strategies at v0; it is a carrier for session-owned components (DS26).

---

## 3. Mapping: EXACT backend

### 3.1 Interpretation

In EXACT, a “fact” is representable as a monom/bitset (set of constraints).

`STEP(seed)` should enumerate residuals:

- if `seed ⊆ fact`, emit `residual = fact \\ seed`

This is the quotient-like extraction described in DS25 and referenced by DS39/DS40.

### 3.2 Required acceleration: postings/intersection index

Without an index, `STEP` degenerates to O(|KB|) subset checks per expansion.

The backend should build (or reuse) a session-local index:

- `post[bit] -> set of factIds` (bitset/bitmap)
- candidate facts for `seed` computed as intersection of postings for all bits in `seed`

Then residual extraction loops only over candidate facts.

### 3.3 Scoring

EXACT supports stable scoring via witness counting:

- `witnesses(residual)` = number of facts that yielded the same residual
- `score` can be:
  - normalized witness ratio,
  - or a monotone function such as `log(1 + witnesses)`.

The backend must define score semantics and expose it in traces. URK itself only ranks.

### 3.4 Projection / cleanup

EXACT closure is only useful if residual states are shaped into meaningful “next query keys”.

Therefore EXACT should provide at least one canonical projection (name suggested):

- `project(state, "queryKeyCanonical")`

This projection may:

- drop structural atoms known to be non-informative for chaining,
- keep only a subset of categories (operator/role/entity),
- normalize representation (sorted, unique monoms),
- optionally enforce “one-monom key” form when the engine expects it.

### 3.5 Reverse step (optional)

`stepPreimages(goal)` can enumerate:

- for each fact that contains `goal`, emit `seed = fact \\ goal`

This powers UNSTAR-style explanation search, but must be budgeted heavily.

---

## 4. Mapping: Metric-Affine / EMA backends

### 4.1 Interpretation

For XOR-like byte-vector strategies:

- `unbind(KB, key)` yields a residual vector `u`
- decoding maps `u` to discrete candidates (atoms/entities/facts)

Therefore:

`STEP(key) := decodeTopK(unbind(KB, key))`

### 4.2 Candidate domains are mandatory

Unlike EXACT, dense/metric strategies cannot decode in a vacuum:

- decoding must be performed against a finite domain:
  - vocabulary atoms,
  - entity candidates,
  - operator set,
  - a ComponentKB subset,
  - or any session-provided candidate set.

URK FILTER `domain(name)` selects which domain to decode against.

### 4.3 EMA note: chunked bundling

EMA’s KB may be represented as chunk means. The backend’s `unbind` should follow the strategy semantics:

- unbind applied per chunk (or via strategy-provided unbind)
- decoding uses max similarity over chunks (as strategy defines)

This is entirely strategy-owned; URK should not special-case EMA beyond choosing a sensible default domain and thresholds.

### 4.4 Scoring

Score should be similarity-like, but must be normalized so:

- higher is better,
- comparable within one backend run.

URK does not require cross-strategy score comparability.

### 4.5 Reverse step

`stepPreimages` is heuristic for dense/metric strategies and is optional.

If implemented, it should propose “likely keys” that could unbind to the goal:

- decode candidate key atoms from `bind(KB, goal)`-like constructs,
- or use similarity-guided reverse decoding.

This remains research-only.

---

## 5. Mapping: Dense-Binary backend

Dense-Binary is similar to metric strategies:

- `STEP(key) := decodeTopK(unbind(KB, key))`

The key difference is the similarity baseline and thresholds.

URK should rely on strategy thresholds from the session (already used in holographic mode).

---

## 6. Fallback rules (when strategy hooks are missing)

If the selected strategy does not implement URK hooks, the engine may construct a generic backend:

1. compute `u = strategy.unbind(kb, key)`
2. decode using:
   - `decodeUnboundCandidates(u, domain)` if available,
   - else `topKSimilar(u, domainVectors)` if available,
   - else declare URK unsupported for that strategy.

This preserves backward compatibility while allowing URK to be adopted incrementally.

---

## 7. Relationship to other DS documents

- DS41 defines the program IR.
- DS42 defines the engine execution algorithm.
- DS39/DS40 define closure primitives and their integration into holographic-first mode.
- DS25 defines EXACT’s quotient-like UNBIND and motivates postings-index acceleration.
- DS23 defines EMA chunk semantics relevant for “KB unbind + decode”.

---

*End of DS43*

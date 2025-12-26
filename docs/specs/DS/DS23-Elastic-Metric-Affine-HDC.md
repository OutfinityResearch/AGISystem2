# AGISystem2 - System Specifications

# DS23: Elastic Metric-Affine HDC Strategy (EMA / “Metric-Affine Elastic”)

**Document Version:** 1.0  
**Status:** Proposed (design spec)  
**Audience:** Technical Architects, HDC Researchers, Core Developers  

---

## 1. Executive Summary

This document specifies **Elastic Metric-Affine (EMA)** — an extension of AGISystem2’s **Metric-Affine** strategy (DS18) that preserves the core algebra:

- **Bind:** byte-wise XOR
- **Similarity:** normalized L₁ (Manhattan) similarity over byte channels

…while addressing two practical limitations when Metric-Affine is used as a *KB superposition store*:

1. **Gray convergence under large superpositions:** arithmetic-mean bundling drifts toward ~128 as the number of bundled items grows (signal collapses toward the random baseline ≈ 0.665).
2. **Deep nested bundling:** repeated incremental updates `KB := bundle([KB, v])` compounds gray drift and reduces distinctiveness faster than one-shot bundling.

EMA introduces two engineering mechanisms compatible with AGISystem2’s existing reasoning pipelines:

- **Chunked bundling (bounded depth):** represent a bundle as a set of per-chunk means (no “bundle-of-bundles”).
- **Elastic geometry (optional, controlled):** allow increasing the number of byte channels `D ∈ {32, 64, 96, ...}` between “epochs” to improve discrimination as the KB grows, with prefix-stable deterministic generation.

The implementation is intended as a new strategy ID: `metric-affine-elastic`, without modifying other strategies.

---

## 2. Design Goals / Non-goals

### 2.1 Primary Goals

- **G1 — Preserve Metric-Affine semantics:** keep `createFromName`, `bind`, `bundle`, `similarity` contracts and “feel” consistent with DS18.
- **G2 — Reduce gray convergence impact:** ensure bundling quality degrades slowly and predictably as KB grows.
- **G3 — Avoid deep nested bundling:** incremental KB maintenance must not repeatedly “average an average”.
- **G4 — Elastic discrimination valve:** allow controlled growth of `D` when retrieval margins degrade.
- **G5 — Candidate-set friendly decoding:** designed for pipelines where cleanup is performed over restricted candidate sets (vocabulary subsets / reverse indices / ComponentKB).

### 2.2 Non-goals

- Achieving classic dense-binary capacity at `D=32`.
- Eliminating interference entirely (EMA is still superposition-based).
- Automatic geometry growth *inside* `bundle()` (requires session-wide re-encoding; see §8).

---

## 3. Mathematical Foundation

### 3.1 Core Space

EMA operates on a family of spaces:

```
Z256^D   where D is variable (bytes)
```

Vector element:

```
V = [b0, b1, ..., b(D-1)] with bi ∈ {0..255}
```

EMA generalizes DS18’s fixed `D=32` to a variable `D`.

---

## 4. Deterministic Vector Generation (Elastic + Prefix-Stable)

### 4.1 Prefix stability requirement

For any atom name `N` and any `D1 < D2`:

`V(N, D1)` must equal the first `D1` bytes of `V(N, D2)`.

This allows geometry to grow without changing existing dimensions.

### 4.2 Generation pipeline

EMA reuses AGISystem2’s established deterministic generation pipeline:

- scoping: `theoryId:name`
- `djb2` to a 32-bit seed
- `xorshift128+` PRNG with BigInt state (`src/util/prng.mjs`)
- generate as many bytes as needed for `D`
- optionally mix ASCII bytes for recognizability (as in the current metric-affine implementation)

---

## 5. Operations Specification

### 5.1 Bind (XOR)

Same as DS18, generalized to variable `D`:

```
(A ⊕ B)i = Ai XOR Bi
```

Correctness invariant (exact):

```
(A ⊕ B) ⊕ B = A
```

### 5.2 Bundle (EMA Chunked Mean; bounded depth)

Metric-Affine bundling is arithmetic mean. EMA keeps the mean but changes the representation:

Instead of returning a single “global mean” vector (which becomes gray for large `n`), EMA represents a bundle as **multiple chunk means**:

```
Bundle = [mean0, mean1, ..., mean(m-1)]
```

Each `meanj` summarizes up to `B` items (`B` = chunk capacity, e.g. 32).

**Rule:** EMA must never “bundle chunk means into another mean” (no nested bundling). Merging bundles concatenates chunk lists.

#### 5.2.1 Chunk mean computation

For a chunk with `k` items:

```
mean[i] = round( sum[i] / k )
```

Because inputs are `0..255`, the mean remains `0..255` without saturation; clamping is mathematically unnecessary.

#### 5.2.2 Hidden pitfall: order dependence

Chunking by “append until full” makes `bundle([a,b,c,...])` depend on input order (unlike a global mean).

EMA must therefore define (and document) one of:

- **(A) Order-stable semantics:** bundling is deterministic *for a deterministic insertion order* (acceptable for KB growth where insertion order is stable).
- **(B) Commutative semantics:** chunk assignment is derived from a stable key (e.g., sorted by a deterministic hash), so grouping is order-independent (higher cost).

This choice must be explicit in the implementation.

### 5.3 Similarity (Normalized L₁)

Base similarity between two byte vectors `A,B ∈ Z256^D`:

```
sim(A,B) = 1 - ( Σ|Ai - Bi| / (D * 255) )
```

For EMA bundles (multiple chunk means), similarity is defined as:

- `sim(Bundle, X) = max_j sim(mean_j, X)`  
- `sim(BundleA, BundleB) = max_{i,j} sim(meanA_i, meanB_j)` (or an approximating fast-path, documented)

This matches the operational intent: “best matching chunk wins.”

---

## 6. Structured Records and Position Vectors

EMA inherits AGISystem2’s order-sensitivity pattern using position vectors (DS07a):

```
fact = Rel ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ...
```

No permutation is introduced; EMA remains compatible with extension/prefix-stability requirements.

---

## 7. Retrieval / Reasoning Compatibility

AGISystem2 uses the HDC “master equation” operational pattern:

```
Answer ≈ KB ⊕ QueryKey^-1
```

Under EMA, `KB` may be a bundle with multiple chunk means. The strategy remains compatible with existing engines by defining:

- `unbind(Bundle, key)` = elementwise unbind over chunk means, returning a Bundle-like result
- `topKSimilar(query, vocab)` uses the EMA similarity definition (max over chunks)

This allows current reasoning engines to keep calling `bind`, `bundle`, `unbind`, `similarity` without changes in logic.

**Compatibility requirement:** EMA vectors should still provide `vector.data` (a summary `Uint8Array`) and an instance `clone()` method because some runtime utilities assume those exist (e.g., `Session.addToKB` and proof hashing helpers).

---

## 8. Elastic Geometry Growth Protocol (system-level)

### 8.1 Why this cannot be “just inside the strategy”

EMA growth requires **session-wide consistency**: when `D` changes, all atom vectors and all stored fact vectors must be re-encoded to the new geometry. The strategy alone cannot reconstruct larger-geometry facts unless the system preserves enough provenance (operator/args or a regenerable RecordSpec).

Therefore, **automatic growth is a runtime concern**, not a pure `bundle()` concern.

### 8.2 Recommended integration point

Provide a session-level operation (e.g., `Session.growGeometry(newD)`) that:

1. Updates `session.geometry`
2. Regenerates vocabulary atom vectors via prefix-stable `createFromName(name, newD, theoryId)`
3. Re-encodes all facts from their metadata (`operator`, `args`) using the binding formula and position vectors
4. Clears bundle caches (KB, level bundles) so they are rebuilt under the new geometry

### 8.3 Growth trigger (proposed)

EMA suggests a quality monitor based on a rolling window:

- `top1Sim`, `top2Sim`
- `margin = top1Sim - top2Sim`

Trigger growth if `margin < μ` for `W` consecutive queries (or probe accuracy drops below `τ`).

---

## 9. Thresholds (initial calibration)

EMA shares Metric-Affine’s random baseline:

`RANDOM_BASELINE ≈ 0.665`

Initial thresholds can mirror DS18 / current `metric-affine` thresholds, then be tuned empirically:

- `HDC_MATCH`: 0.75 (start)
- `STRONG_MATCH`: 0.80
- `VERY_STRONG_MATCH`: 0.88
- `MIN_MARGIN`: 0.02–0.04

Note: chunked bundling often improves retrieval margins, so these thresholds may shift upward after evaluation.

---

## 10. Contract Definition (EMA-specific)

EMA preserves the Metric-Affine contract properties:

- XOR bind properties
- normalized L₁ similarity properties
- baseline similarity around 0.67

and introduces:

```
GEOMETRY_ELASTIC: true
BUNDLE_CHUNKED: true
BUNDLE_BOUNDED_DEPTH: true
```

The contract should be implemented in `src/hdc/ema-contract.mjs` and validated similarly to `src/hdc/metric-affine-contract.mjs`.

---

## 11. Implementation Guidance (proposed files)

```
src/hdc/strategies/
  metric-affine-elastic.mjs       # EMA implementation (new)
  index.mjs                       # register 'metric-affine-elastic'

src/hdc/
  ema-contract.mjs                # EMA contract + validator (new)
```

Docs:

```
docs/specs/DS/DS23-Elastic-Metric-Affine-HDC.md
docs/specs/src/hdc/ema-contract.mjs.md
docs/specs/src/hdc/strategies/metric-affine-elastic.mjs.md
```

---

*End of DS23*


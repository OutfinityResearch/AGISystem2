# AGISystem2 - System Specifications
#
# DS46: Discrete Phase Lattice Hologram HDC Strategy (DPLH / “Phase-Lattice”) (Research)
#
**Document Version:** 0.1  
**Status:** Research / Proposed (not implemented)  
**Audience:** HDC/VSA researchers, core architects, strategy implementers  

---

## 1. Executive Summary

This DS proposes a new HDC strategy for AGISystem2: **Discrete Phase Lattice Hologram (DPLH)**.

Instead of representing a concept as an unstructured 1D vector, DPLH represents each concept as a **2D lattice** (a “picture”) where each cell holds a discrete **phase** in `Z_Q`.

The strategy is designed to be:

- **Discrete and CPU-friendly** (Node.js `Uint8Array`), no floating point required.
- **Invertible binding**: `BIND/UNBIND` are exact (modular addition/subtraction).
- **Stable superposition**: `BUNDLE` is a per-cell circular-mean-like projection back into `Z_Q` (lossy but bounded).
- **Retrievable**: `SIMILARITY` is defined coherently with bundling (cosine-like phase agreement), enabling robust cleanup.

The “holographic” claim is operational: information about a concept is spread across the entire lattice pattern; partial corruption still permits recognition by global correlation (similarity).

This is a research strategy: it may be valuable for visualization, interpretability, and CPU-only experimentation, but it introduces new correlation and bundling risks that must be measured in the evaluation suites.

---

## 2. Design Goals / Non-goals

### 2.1 Goals

1. **G1 — Strategy contract compatibility:** implement the existing strategy surface (`createFromName`, `bind`, `unbind`, `bundle`, `similarity`, `topKSimilar`) with minimal runtime changes (DS03/DS09 style).
2. **G2 — Discrete invertible binding:** binding must be group-like and exactly invertible.
3. **G3 — Bounded bundling:** repeated bundling must not blow up numerically; representation stays in `Z_Q`.
4. **G4 — Visual interpretability:** atom vectors should be displayable as “images” with visible structure (rings/bands).
5. **G5 — Works with DS07a records:** position vectors and structured records should be representable in the same way (role/filler patterns).

### 2.2 Non-goals

- Being a replacement for dense-binary HRR (classic 10k-dim real HRR).
- Guaranteeing order invariance for bundling under all variants (depends on chosen bundle operator).
- Providing a proof that similarity baselines match existing strategy thresholds (must be calibrated).

---

## 3. Geometry and Representation

### 3.1 Lattice and phase group

Let the geometry be a 2D torus (wrap-around in both axes):

- lattice size: `Nθ × Nz` cells
- phase alphabet: `Z_Q` where `Q ∈ {4, 8, 16, ...}`

Each vector is a phase field:

```
V[θ,z] ∈ {0,1,...,Q-1}
```

Implementation representation:

- store as `Uint8Array(Nθ * Nz)` in row-major order
- each entry holds `0..Q-1`

**Memory model:** `bytesPerVector = Nθ * Nz` (optionally pack bits if `Q` is a power of two; research optimization).

### 3.2 Geometry parameterization inside AGISystem2

AGISystem2 strategies currently accept `geometry` as a number. DPLH needs multiple parameters (`Nθ`, `Nz`, `Q`).

This DS proposes two acceptable integration options:

**Option A (v0, no runtime change):** interpret `geometry` as total cell count `D = Nθ * Nz`, choose a fixed aspect ratio (e.g., `Nθ = 64`, `Nz = D/64`) and configure `Q` by environment/strategy defaults.

**Option B (v1, runtime enhancement):** allow strategy-specific geometry objects (e.g., `{ w, h, q }`) in Session configuration. This requires a small runtime extension but avoids ambiguous factorization.

Because this strategy is research, both options are acceptable; Option A is preferred for minimal disruption.

### 3.3 Recommended numeric choices (implementation-friendly)

This strategy works for any `Q ≥ 2`, but implementation and performance are significantly simpler when:

- `Q` is a power of two (`Q ∈ {4,8,16,32}`), and
- `Q` is fixed per run/session (recommended).

When `Q` is a power of two, modular arithmetic can be implemented cheaply via bit masks:

```
(a + b) mod Q  ==  (a + b) & (Q - 1)
(a - b) mod Q  ==  (a - b) & (Q - 1)
```

For non power-of-two `Q`, implementations must use explicit mod normalization per cell (still feasible, just slower and easier to get subtly wrong in JS).

---

## 4. Deterministic Atom Initialization (Visual Atoms)

Atoms are generated deterministically from a “center” and a “ring frequency” parameter, producing visible structure.

### 4.1 Toroidal distance

For a center `(cθ, cz)`, define:

```
dθ = min(|θ - cθ|, Nθ - |θ - cθ|)
dz = min(|z - cz|, Nz - |z - cz|)
r² = dθ² + dz²
```

### 4.2 Base pattern (rings/bands)

For a ring scale parameter `k` (integer):

```
A[θ,z] = floor(r² / k) mod Q
```

This yields concentric rings (on the torus) when rendered with a palette.

### 4.3 Deterministic jitter (to reduce unwanted correlations)

Pure `floor(r²/k)` can produce structured correlations between different atoms (especially if centers are close or k values share factors).

Therefore, add a deterministic jitter term:

```
A[θ,z] = ( floor(r²/k) + jitter(θ,z,cθ,cz,k) ) mod Q
```

Where `jitter(...)` is a stable integer hash reduced mod `Q`.

**Important:** jitter must be strong enough to decorrelate atoms but not so strong that it destroys the “visual atom” property. This must be calibrated by measuring random-baseline similarity and false-nearest-neighbor rates.

### 4.4 Name-to-atom parameter mapping

`createFromName(name, geometry, theoryId)` maps `theoryId:name` to:

- `(cθ, cz)` center
- `k` ring scale
- jitter seed

Suggested mapping:

- hash `theoryId:name` to 32-bit seed
- derive `cθ = seed mod Nθ`, `cz = (seed >> 8) mod Nz`
- derive `k` from another hash lane (bounded integer range, excluding `k=0`)

This keeps determinism and supports theory scoping.

---

## 5. Operations Specification

### 5.1 BIND (invertible composition)

Element-wise modular addition:

```
BIND(A,B)[i] = (A[i] + B[i]) mod Q
```

This is an abelian group operation on `Z_Q^(Nθ×Nz)`.

### 5.2 UNBIND (inverse for query)

Element-wise modular subtraction:

```
UNBIND(C,B)[i] = (C[i] - B[i]) mod Q
```

Correctness invariant (exact):

```
UNBIND(BIND(A,B), B) = A
```

### 5.3 BUNDLE (stable superposition)

BUNDLE is the hardest part: we need a lossy operator that:

- stays in `Z_Q` per cell,
- supports many superposed items without numeric explosion,
- and preserves retrievability under UNBIND + similarity.

This DS proposes multiple fully-discrete bundle operators. One is recommended as the default because it is discrete, fast, and matches a cosine-like similarity.

#### 5.3.1 Bundle variant B (recommended): discrete circular mean via integer phasors (no floats)

Interpret each phase `p ∈ Z_Q` as a unit direction on the circle. Precompute fixed-point LUTs:

```
cosLUT[p], sinLUT[p]   for p in 0..Q-1
```

with an integer scale `S` (e.g., `S=1024`) so the LUT values are small signed integers.

For each cell `i`, accumulate:

```
sx = Σ wj * cosLUT[Vj[i]]
sy = Σ wj * sinLUT[Vj[i]]
```

Then project back into a discrete phase via an argmax over dot products:

```
bundle[i] = argmax_p ( sx * cosLUT[p] + sy * sinLUT[p] )
```

Tie-breaking must be deterministic (e.g., pick the smallest `p`).

**Why this is recommended:**

- fully discrete (integer-only), no float required
- constant memory per cell (two accumulators)
- works well for `Q ∈ {8,16,32}`
- aligns naturally with cosine-like similarity (see §5.4.1)

#### 5.3.2 Bundle variant A: per-cell phase histogram / majority vote (robust for small Q)

For each cell `i`, maintain counts over phases:

```
count_i[p] = number of vectors where Vj[i] = p
bundle[i] = argmax_p count_i[p]
```

Tie-breaking must be deterministic (e.g., lowest phase).

**Pros:** simple, stable, bounded, no floats.  
**Cons:** memory/time cost: counts are `O(Q * D)` per bundle operation unless incremental bundling/chunking is used.

This variant is especially attractive for `Q=4/8`, where the histogram is small and tends to be extremely robust for cleanup.

#### 5.3.3 Optional extension: chunked bundling (EMA-like)

Just like EMA mitigates “gray drift” by chunking, DPLH may need chunking to preserve retrievability under large KBs:

- represent a bundle as a list of chunk-bundles
- similarity defined as max-over-chunks

This is optional and should be treated as a separate research variant after baseline DPLH is evaluated.

### 5.4 SIMILARITY (recommended coherence with bundling)

Similarity should be coherent with the chosen bundle operator. This DS recommends cosine-like phase agreement (best match for §5.3.1), and keeps circular-distance similarity as an alternative.

#### 5.4.1 Similarity S2 (recommended): cosine-like agreement via Δ-LUT

Define per-cell phase difference:

```
Δ = (A[i] - B[i]) mod Q
```

Then define a per-cell score by a LUT:

```
scoreDelta[Δ] = cos(2πΔ/Q)   (fixed-point integer LUT)
```

Aggregate:

```
sim(A,B) = Σ scoreDelta[Δ]    // optionally normalized to [0,1]
```

This is effectively a discrete dot-product in phase space. It aligns with the recommended bundling operator because both are based on the same circular geometry.

#### 5.4.2 Similarity S1 (alternative): circular distance in Z_Q

Define per-cell phase difference:

```
Δ = (A[i] - B[i]) mod Q
δ = min(Δ, Q-Δ)       // circular distance in Z_Q
```

Similarity is a normalized score over all cells:

```
sim(A,B) = 1 - ( Σ δ / (D * (Q/2)) )
```

This is simple and robust, but it is less directly aligned with the phasor-mean bundle unless the bundle projection is also distance-minimizing (e.g., a circular median).

**Calibration requirement (all similarity modes):** random baseline similarity depends on `Q`, lattice size, and the atom generator + jitter. Thresholds must be empirically tuned (like DS18/DS23).

---

## 6. Structured Records (DS07a Compatibility)

Facts can be stored as role–filler bindings bundled together:

```
H = BUNDLE( BIND(R1, X1), BIND(R2, X2), ... )
X1_hat = UNBIND(H, R1)
```

This matches the DS07a pattern without requiring permutations.

Position vectors `Pos1..PosN` can be defined as normal atoms from a reserved namespace and used as roles, identical to other strategies.

---

## 7. Expected Behavior and Risks (Critical Analysis)

### 7.1 Correlation risk from structured atoms

If atoms are too structured (rings without enough jitter), unrelated atoms can have elevated similarity.

Mitigation:

- measure random-baseline similarity distribution,
- tune jitter strength,
- ensure centers/k values cover the space well,
- optionally mix in a PRNG-derived “texture” component.

### 7.2 Bundle collapse / loss of retrievability

Like all superposition systems, bundling many items can degrade retrievability.

Risks:

- histogram mode may overfit to dominant phases and lose minority signals,
- phasor mean may converge toward central values depending on distribution (phase “washout” analogue).

Mitigations:

- adopt chunked bundling if needed (EMA-style),
- keep bundle capacity limits and report expected margins,
- use candidate-set decoding rather than full-vocab decoding.

### 7.3 Geometry coupling (2D topology biases)

The torus distance model introduces locality structure. That may:

- help visualization,
- but can introduce bias: nearby centers share regions.

Mitigation:

- rely on jitter and parameter mixing,
- consider alternative atom families (e.g., wave interference patterns rather than rings).

### 7.4 Interoperability with existing “geometry” conventions

AGISystem2 currently treats geometry as a scalar. DPLH needs `(w,h,Q)`.

Mitigation:

- v0: fix `w` and derive `h` from `geometry`,
- v1: introduce strategy-specific geometry objects in Session configuration.

### 7.5 Performance envelope

Operations are `O(D)` for bind/unbind/similarity.

Bundle complexity:

- histogram: `O(numVectors * D)` with a high constant for Q bins,
- phasor mean: `O(numVectors * D)` with small constants, plus a small lookup.

This strategy likely targets medium geometries (e.g., 512B–4096B) rather than extremely small or extremely large.

---

## 8. Implementation Guidance (Proposed, non-binding)

Suggested strategy id: `phase-lattice`.

Files (proposal):

```
src/hdc/strategies/phase-lattice.mjs          # new strategy (not implemented)
docs/specs/DS/DS46-...md                     # this spec
docs/theory/strategies/phase-lattice.html     # optional theory page (future)
```

Key implementation choices to lock down early (before coding):

- fixed `Q` per run (recommended) vs allow variable `Q` per vector (not recommended)
- bundling variant (recommended: phasor-mean; alternative: histogram for small Q)
- how to interpret scalar `geometry` into `(Nθ,Nz)`

### 8.1 Recommended defaults (research)

These are recommended starting points for experiments (not “the one true configuration”):

- `Q = 16` (good separation, still cheap; power-of-two)
- lattice `64×64` (4096 cells/bytes; good balance)
- **roles/keys:** pseudo-random atoms (high orthogonality)
- **fillers/concepts:** radial + deterministic jitter (keeps “visual atoms” while reducing correlations)
- `BUNDLE`: phasor-mean via integer LUTs (§5.3.1)
- `SIMILARITY`: cosine-like Δ-LUT (§5.4.1)

### 8.2 Atom family guidance (roles vs fillers)

This strategy benefits from separating “role atoms” from “filler atoms”:

- roles should be as decorrelated as possible (pseudo-random family),
- fillers can be radial+jitter for interpretability.

This reduces the risk that structured filler patterns leak into role keys and degrade unbinding quality.

### 8.3 Jitter amplitude guidance (non-binding)

Jitter is necessary to reduce unwanted correlations, but must not erase geometry completely.

Rather than specifying a single numeric amplitude, this DS recommends tuning jitter by measuring:

- random baseline similarity distribution,
- nearest-neighbor false positives under `topKSimilar`,
- retrieval accuracy under increasing bundle sizes.

The “right” jitter is the smallest setting that prevents obvious structured collisions while preserving visible pattern structure.

---

## 9. Relationship to Existing DS Documents

- DS07a: structured records pattern (roles/positions) used unchanged.
- DS18/DS23: geometry is “bytes per vector / channels”; DPLH extends this by requiring a 2D lattice interpretation.
- DS39/DS40: closure tactics and holographic-first mode can use DPLH as another backend (step=UNBIND+decode).
- DS45: weights/constraints can treat DPLH similarity as a heuristic weight, with optional calibration.

---

*End of DS46*

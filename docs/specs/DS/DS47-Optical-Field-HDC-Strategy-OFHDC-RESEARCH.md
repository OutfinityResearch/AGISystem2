# AGISystem2 - System Specifications
#
# DS47: OF-HDC — Optical-Field HDC Strategy (Research)
#
**Document Version:** 0.1  
**Author:** Sînică Alboaie  
**Status:** Research / Proposed (not implemented)  
**Audience:** Core architects, HDC/VSA researchers, engine/strategy developers  
**Scope:** Strategy proposal compatible with AGISystem2’s HDC contract and reasoning equation  

---

## 1. Executive Summary

This DS proposes **OF-HDC (Optical-Field HDC)**: a strategy where the “hypervector” is a **discrete complex optical field** (2D), intended to behave like a hologram with real interference (phase + amplitude).

OF-HDC keeps the AGISystem2 contract surface:

- `BIND` / `UNBIND` (invertible for unit-modulus keys)
- `BUNDLE` (superposition by addition, with gain control)
- `SIMILARITY` (complex correlation / matched filtering)
- compatibility with the reasoning equation pattern:
  ```
  Ans ≈ UNBIND(KB, QueryKey)
  ```

The key differentiator is **geometry growth**: the field size `N×N` can increase (aperture/resolution) under a GrowthPolicy, with prefix-stable atom generation by coordinates.

This is a research strategy. It is implementable in Node.js with fixed-point integer arithmetic for the hot loops, but full-fidelity similarity (64-bit accumulation) likely requires WASM for performance and numeric correctness.

---

## 2. Problem Statement

Fixed-geometry VSA/HDC systems accumulate interference under `BUNDLE` as the KB grows. In a fixed space, capacity is limited by signal-to-noise ratio (SNR).

OF-HDC explores a substrate where:

- superposition is literal complex addition (interference),
- binding is phase coding (complex multiplication),
- retrieval uses correlation,
- and the geometry `N` is an explicit, growable parameter that trades compute/memory for capacity.

The goal is not “magic infinite capacity”, but a controllable “aperture knob” that can be tuned per workload and evaluated empirically in saturation experiments.

---

## 3. Design Goals / Non-goals

### 3.1 Goals

1. **G1 — Strategy compatibility:** fits the existing strategy contract (`createFromName`, `bind`, `unbind`, `bundle`, `similarity`, `topKSimilar`).
2. **G2 — Determinism:** atom/role fields are deterministic from `theoryId:name` and coordinates.
3. **G3 — Invertible binding for keys:** `UNBIND(BIND(U,K),K)=U` when `K` is unit modulus.
4. **G4 — Robust superposition:** bundling remains bounded via explicit gain control (no overflow / no hidden float drift).
5. **G5 — Explicit geometry growth:** a well-defined GrowthPolicy with an honest accounting of what must be recomputed to benefit.

### 3.2 Non-goals

- Full theorem proving semantics; OF-HDC is a representation strategy, not a logic.
- Free “capacity without recomputation”: increasing `N` does not help unless existing stored facts can be rendered into the larger field.
- GPU-first implementation (not required for the research prototype).

---

## 4. Representation Model (Optical Field)

### 4.1 Field

Knowledge is represented by a single field:

```
H ∈ C^(N×N)
```

where each cell stores a complex number `(Re, Im)`.

### 4.2 Discretization: phase and fixed-point

OF-HDC uses **phasor fields** for atoms/roles:

- phases quantized into `M` bins:
  ```
  θ ∈ {0, 2π/M, ..., 2π(M-1)/M}
  ```
- atom/role field:
  ```
  V_name(x,y) = e^{i θ_name(x,y)} = cos(θ)+ i sin(θ)
  ```

Implementation is fixed-point:

- phasors stored as `int16` (`Q-format`, e.g. Q15)
- accumulated KB field stored as `int32` per component
- dot products for similarity accumulated in `int64` (recommended via WASM)

### 4.3 Layout

For locality and hot loops, use interleaved arrays:

```
[re0, im0, re1, im1, ...]
```

with length `2 * N * N`.

---

## 5. Geometry (explicit, growable)

OF-HDC makes geometry first-class and multi-parameter:

### 5.1 Spatial geometry

- `N`: field resolution (aperture). Field has `N×N` cells.

### 5.2 Phase geometry

- `M`: number of phase bins (quantization).

Implementation-friendly choices:

- `M` power-of-two for fast mod on phase indices (optional but recommended).

### 5.3 Numeric geometry

- `PhasorFormat`: fixed-point scale for `cos/sin` LUT (e.g. Q15).
- `FieldFormat`: `int32` for accumulated `H`.
- `DotAccumFormat`: `int64` for correlation sums (WASM recommended).
- `GainControl`: a global scale exponent `e` (see §7).

### 5.4 Position/role geometry

Role/position fields are also phasor fields, with a selectable family:

- `RandomPhaseMask` (default): low-correlation key fields.
- `PhaseRamp` (optional): structured ramps that can provide shift/alignment properties if needed.

This is a parameter, not a hidden assumption.

---

## 6. Deterministic Initialization (prefix-stable with N)

The critical property for geometry growth is:

> **Identity must be coordinate-defined.**
> Extending `N` should not change values at existing coordinates.

### 6.1 Seed

For any name, compute a deterministic seed from:

```
seed = hash32(theoryId + ":" + name)
```

### 6.2 Coordinate phase function

For each coordinate `(x,y)`:

- compute a deterministic integer:
  ```
  u_name(x,y) = PRNG(seed, x, y)
  ```
- map to phase bin:
  ```
  p_name(x,y) = u_name(x,y) mod M
  θ_name(x,y) = 2π * p_name(x,y) / M
  ```

### 6.3 Field generation

Phasor field:

```
V_name(x,y) = (cosLUT[p], sinLUT[p])
```

where LUT values are fixed-point integers.

**Prefix stability across growth:** if you grow from `N1` to `N2`, the values for all `(x,y)` with `x<N1`, `y<N1` remain unchanged by construction.

---

## 7. Algebra (Strategy Operations)

### 7.1 BIND (⊗): phase coding

Element-wise complex multiplication:

```
(U ⊗ V)(x,y) = U(x,y) · V(x,y)
```

For fixed-point:

- `V` is unit-modulus (phasor) for keys/atoms,
- `U` may be general complex (after bundling).

### 7.2 UNBIND (inverse for keys)

For unit-modulus phasor fields:

```
V^{-1}(x,y) = conjugate(V(x,y))
UNBIND(U, V) = U ⊗ conjugate(V)
```

Correctness (exact, in ideal arithmetic):

```
UNBIND(BIND(U,V), V) = U
```

In fixed-point arithmetic, this is “approximately exact” and must be validated by correlation margins and evaluation suites.

### 7.3 BUNDLE (⊕): superposition

Superposition is linear addition:

```
(U ⊕ V)(x,y) = U(x,y) + V(x,y)
H = ⊕_{t=1..L} α_t · T_t
```

This is the most literal “interference” model: signals add, noise adds.

However, addition grows magnitude, so gain control is mandatory.

### 7.4 Gain Control (mandatory)

To avoid clipping and preserve linearity, OF-HDC stores `H` with a global scale exponent `e`:

- interpret `H` as `H_real = H_int · 2^{-e}`
- when values exceed a threshold (or energy exceeds a threshold), rescale:
  - shift all `Re/Im` uniformly (right shift by `s`)
  - update `e ← e + s`

This keeps `H` in range without changing relative correlations (normalized similarity is scale-invariant).

**Design choice:** thresholds and shift policy are part of strategy configuration and must be recorded for reproducibility.

---

## 8. SIMILARITY (Complex Correlation / Matched Filtering)

### 8.1 Complex inner product

```
⟨U, V⟩ = Σ_{x,y} U(x,y) · conjugate(V(x,y))
```

### 8.2 Normalized similarity

```
sim(U,V) = |⟨U,V⟩| / (||U|| · ||V||)
```

where `||U|| = sqrt(⟨U,U⟩)` (energy norm).

Implementation notes:

- Computing `⟨U,V⟩` requires stable accumulation (recommended `int64` or equivalent).
- Exact normalization uses square roots; for a discrete CPU prototype, acceptable options include:
  - compute norms in fixed-point with an integer sqrt,
  - or approximate normalization by using energy thresholds and compare unnormalized magnitudes within a fixed `N`.

This DS does not mandate one normalization implementation, but requires that similarity be monotone with correlation and calibrated per strategy.

---

## 9. Structured Records and DS07a Compatibility

OF-HDC supports DS07a-style slot encoding using explicit role/position fields.

One canonical record representation is:

```
F = ⊗_{i=1..k} (P_i ⊗ A_i)
H ← H ⊕ F
```

Query pattern:

- build `Q` from known parts (same encoding)
- compute residual:
  ```
  R = H ⊗ conjugate(Q)
  ```
- to extract a target filler at role `P_k`:
  ```
  A_hat = R ⊗ conjugate(P_k)
  ```
- cleanup by similarity search over a candidate domain `D`:
  ```
  A* = argmax_{A ∈ D} sim(A_hat, A)
  ```

Note: this is compatible with the “reasoning equation” style. It does not require permutations.

---

## 10. Retrieval Scaling: Two-Stage Similarity Search

Brute-force full correlation against a large dictionary is expensive (`O(|D|·N²)`).

OF-HDC therefore defines a two-stage retrieval geometry:

1. **CoarseSignature(U):** a cheap projection of `U`, e.g.:
   - downsample to `n×n`,
   - sample fixed coordinate bands,
   - sample a deterministic subset of points.
2. Keep only top `K` candidates by coarse similarity.
3. Compute **FullSimilarity** only for those `K`.

`CoarseSignature` is part of strategy geometry and must be deterministic.

This approach mirrors “coarse-to-fine matched filtering” common in signal processing, adapted to a discrete CPU runtime.

---

## 11. Geometry Growth Policy (and the critical caveat)

### 11.1 GrowthPolicy

Define a GrowthPolicy `N → N'` (e.g., doubling):

- allocate new field `H'` of size `N'×N'`
- copy old `H` into the top-left `N×N` region
- zero-fill the rest

### 11.2 Critical caveat: growth must re-render old facts to benefit

Prefix-stable atom generation ensures identity preservation, but **capacity does not automatically improve** if old facts remain embedded only in the old region.

To exploit the new aperture, the system must be able to re-encode prior facts into the larger geometry:

- either by storing structured fact metadata (operator/args/roles) and re-binding at the new `N'`,
- or by storing per-fact fields in a regenerable form.

This is the same class of issue described for “system-level growth” in DS23: growth is not “just inside bundle”.

Therefore OF-HDC’s growth is a **session-level operation** that requires provenance sufficient to re-render facts. It is not “paging logic”, but it is a deliberate re-encoding pass.

---

## 12. Complexity Summary

Let `D = N²`.

- `BIND/UNBIND`: `O(D)` element-wise complex multiply.
- `BUNDLE`: `O(D)` element-wise add + occasional `O(D)` rescale.
- `SIMILARITY (full)`: `O(D)` complex dot product + norm computations.
- `Growth N→2N`: `O(D)` copy + `O(D)` zero-fill (plus optional re-encode cost over facts).

The dominant cost is dot products. For Node.js, full-speed similarity likely needs WASM to avoid `BigInt` overhead and numeric precision loss from JS `Number`.

---

## 13. Risks and Research Questions (honest assessment)

1. **Numeric correctness vs JS performance:** full correlation wants `int64` accumulation; pure JS will either be slow (`BigInt`) or approximate (`Number`). WASM is the practical path.
2. **Gain-control interactions:** rescaling must preserve retrieval margins; policies must be tested under saturation.
3. **Growth usefulness:** without re-encoding, growth adds memory but not signal. With re-encoding, growth is expensive and must be justified by improved margins.
4. **Role family choice:** RandomPhaseMask is likely best for decorrelation; PhaseRamp may help special tasks but can introduce correlations.
5. **Calibration:** similarity baselines and thresholds must be re-derived (like DS18/DS23).

---

## 14. Implementation Guidance (Proposed, non-binding)

Suggested strategy id: `optical-field` (OF-HDC).

Proposed file layout:

```
src/hdc/strategies/optical-field.mjs           # OF-HDC (not implemented)
src/hdc/optical-field/wasm/                    # optional WASM dot product kernels
docs/specs/DS/DS47-...md                       # this spec
```

Recommended initial parameter defaults (research starting points):

- `N=64` or `N=128`
- `M=256` (byte-phase bins) or `M=64` (smaller LUT), depending on LUT/cost tradeoffs
- `RandomPhaseMask` for roles/positions
- gain control enabled with conservative rescale thresholds
- coarse signature using downsampling to `16×16` or point sampling (fixed)

---

## 15. Relationship to Existing DS Documents

- DS07a: structured record encoding (roles/positions) remains applicable.
- DS23: geometry growth is system-level; OF-HDC makes this explicit and requires re-encoding to benefit.
- DS39/DS40: closure tactics can treat OF-HDC as a backend (step = unbind+decode under domains).
- DS45: weights/constraints can treat similarity as a heuristic weight and incorporate calibrated uncertainty.

---

*End of DS47*

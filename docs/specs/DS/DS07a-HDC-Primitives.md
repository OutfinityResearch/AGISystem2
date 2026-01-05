# AGISystem2 - System Specifications

# Chapter 7a: HDC Primitives & Binding Formula

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Part Of:** DS07 Runtime Core + Kernel Packs (refactored; formerly “Core theory”)
**Implementation:** `src/core/operations.mjs`, `src/core/position.mjs`

---

## 7a.1 Overview

This document specifies the **Level 0 (L0)** primitives of AGISystem2 - the raw HDC (Hyperdimensional Computing) operations that form the computational foundation. These primitives are:

1. **Implemented in native code** (not DSL)
2. **Never called directly** from user DSL
3. **Always available** in every session

---

## 7a.2 L0: HDC Primitives

| Primitive | Signature | Operation | Notes |
|-----------|-----------|-----------|-------|
| `___Bind` | a b | Bind (XOR in dense-binary): `BIND(a, b)` | XOR cancellation for XOR-based strategies; extension-safe |
| `___Bundle` | a b ... | Majority vote | Superposition, extension-safe |
| `___Similarity` | a b | Hamming similarity | Returns 0.0-1.0 |
| `___MostSimilar` | query set | Find nearest | Best match |
| `___NewVector` | name theory | ASCII stamped | Deterministic from name |
| `___Not` | v | Bitwise NOT | Flip all bits |
| `___GetType` | v | Extract type | Returns type vector |
| `___Extend` | v targetGeo | Clone to size | [v] → [v|v] |

**Notation:** These specs use the explicit words **BIND** and **BUNDLE** (no math symbols). When we need to show bitwise XOR explicitly, we write `XOR(...)` or name XOR in text.

**Critical Design Decision: No Permutation!**

Permutation breaks vector extension. AGISystem2 uses **position vectors** (Pos1, Pos2, ...) instead. See Section 7a.4.

---

## 7a.3 ASCII Stamp Initialization

`___NewVector` creates vectors deterministically from name:

```javascript
___NewVector(name, theoryId, geometry):
    // "John" → ASCII [74,111,104,110] → repeated stamp → XOR with PRNG
    seed = hash(theoryId + ":" + name)
    baseStamp = asciiToStamp(name, 256)  // 256 bits per stamp

    for i in 0..geometry/256:
        vector[i*256:(i+1)*256] = baseStamp XOR PRNG(seed, i)

    return vector
```

**Properties:**
- **Deterministic**: Same name → same vector (across sessions)
- **Recognizable**: ASCII pattern visible in vector
- **Extensible**: Cloning preserves pattern

---

## 7a.4 The Binding Formula

### 7a.4.1 Statement Encoding

Every statement `@dest Op Arg1 Arg2 ... ArgN` is encoded as:

### 7a.4.1 Statement Encoding

Every statement `@dest Op Arg1 Arg2 ... ArgN` is encoded as:

```
dest = Op BIND ( (Pos1 BIND Arg1) BUNDLE (Pos2 BIND Arg2) ... BUNDLE (PosN BIND ArgN) )
```

**Why this works:**
- Each argument is "tagged" with its position vector
- **Bundle** (superposition) aggregates the tagged parts without mixing them (unlike commutative Bind)
- Position vectors are quasi-orthogonal to each other and to arguments
- Extension (cloning) preserves the pattern

### 7a.4.2 Example

```
@fact loves John Mary

# Internally:
fact = loves BIND ( (Pos1 BIND John) BUNDLE (Pos2 BIND Mary) )

# Different from:
@fact2 loves Mary John
fact2 = loves BIND ( (Pos1 BIND Mary) BUNDLE (Pos2 BIND John) )

similarity(fact, fact2) ≈ 0.5  # Different facts!
```

### 7a.4.3 With Graph

When Op has an associated graph:
```
dest = Op BIND graph_result
```

The graph's return value is bound with the operator.

### 7a.4.4 Query (Unbinding)

To find `?who` in `@q loves ?who Mary`:

```
# Build partial (skip the hole)
partial = loves BIND (Pos2 BIND Mary)

# Unbind from fact in KB
# Note: Unbind mechanism depends on strategy. 
# Conceptually for simple cancellation (Dense/XOR):
result = fact BIND partial
       # ... complex terms ...
       = Pos1 BIND John  # + noise
```

# Extract answer
answer = result BIND Pos1
       = John
```

**Important scope note (non-dense-binary strategies):**
The cancellation derivation above is written in the **dense-binary mental model** (bitwise XOR with clean cancellation plus majority-bundle storage). In AGISystem2, other strategies may still support XOR-style cancellation at the `bind/unbind` level, but `unbind(KB, partial)` may yield a **residual / superposition** due to their storage and bundling semantics. For those strategies:

- `unbind(KB, partial)` may produce a **residual / superposition** that contains *more than just* the missing argument.
- Extracting the hole value requires a **decoding / projection** step, which can be strategy-specific.
- Some strategies expose a helper like `decodeUnboundCandidates(unboundVec, ...)` to “clean” structural residue and return ranked entity candidates.

---

## 7a.5 Position Vectors

Position markers are **runtime-reserved atoms** named `Pos1..Pos20`.

They are configured and initialized outside the DSL:

- Config: `config/runtime/reserved-atoms.json`
- Loader: `src/runtime/runtime-reserved-atoms.mjs`

This keeps argument-order internals out of Core `.sys2` theories while preserving deterministic initialization and strategy compatibility.

---

## 7a.6 HDC Strategy Support

AGISystem2 supports multiple HDC strategies (selected per session):

| Strategy | Description | Vector Type | Use Case |
|----------|-------------|-------------|----------|
| `dense-binary` | Traditional bit vectors | `DenseBinaryVector` (Uint32Array-backed) | Fast baseline, bitwise ops |
| `sparse-polynomial` | Sparse polynomial (SPHDC) | `SPVector` (Set&lt;bigint&gt;-backed) | Compact symbolic-friendly strategy |
| `metric-affine` | Metric-affine bytes (Z₂₅₆ᴰ) | Uint8Array-backed | Fuzzy similarity with higher baseline |
| `metric-affine-elastic` | Metric-affine with elastic/chunked bundling | Uint8Array-backed | Large-KB superposition via chunking |
| `exact` | Exact-sparse polynomial (EXACT) | `ExactVector` (term list) | Structural unbind + strategy-aware decoding |

Strategy is set per-session:
```javascript
const session = new Session({ hdcStrategy: 'sparse-polynomial' });
```

---

## 7a.7 Implementation Files

| File | Purpose |
|------|---------|
| `src/hdc/facade.mjs` | Strategy-agnostic bind/bundle/similarity entry point |
| `src/hdc/strategies/dense-binary.mjs` | Dense-binary strategy implementation |
| `src/hdc/strategies/sparse-polynomial.mjs` | SPHDC strategy implementation |
| `src/hdc/strategies/metric-affine.mjs` | Metric-affine strategy implementation |
| `src/hdc/strategies/metric-affine-elastic.mjs` | EMA strategy implementation |
| `src/hdc/strategies/exact.mjs` | EXACT strategy implementation |
| `src/core/operations.mjs` | Backward-compatible re-exports (from HDC facade) |
| `src/core/position.mjs` | Position vector helpers (PosN tagging) |
| `config/runtime/reserved-atoms.json` | Runtime-reserved atoms (includes `Pos1..Pos20`) |

---

*End of DS07a - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*

# AGISystem2 - System Specifications

# Chapter 7a: HDC Primitives & Binding Formula

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Part Of:** DS07 Core Theory (refactored)
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
| `___Bind` | a b | XOR: `a ⊕ b` | Self-inverse, extension-safe |
| `___Bundle` | a b ... | Majority vote | Superposition, extension-safe |
| `___Similarity` | a b | Hamming similarity | Returns 0.0-1.0 |
| `___MostSimilar` | query set | Find nearest | Best match |
| `___NewVector` | name theory | ASCII stamped | Deterministic from name |
| `___Not` | v | Bitwise NOT | Flip all bits |
| `___GetType` | v | Extract type | Returns type vector |
| `___Extend` | v targetGeo | Clone to size | [v] → [v|v] |

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

```
dest = Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ ... ⊕ (PosN ⊕ ArgN)
```

**Why this works:**
- Each argument is "tagged" with its position vector
- XOR is associative and commutative
- Position vectors are quasi-orthogonal to each other and to arguments
- Extension (cloning) preserves the pattern

### 7a.4.2 Example

```
@fact loves John Mary

# Internally:
fact = loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)

# Different from:
@fact2 loves Mary John
fact2 = loves ⊕ (Pos1 ⊕ Mary) ⊕ (Pos2 ⊕ John)

similarity(fact, fact2) ≈ 0.5  # Different facts!
```

### 7a.4.3 With Graph

When Op has an associated graph:
```
dest = Op ⊕ graph_result
```

The graph's return value is bound with the operator.

### 7a.4.4 Query (Unbinding)

To find `?who` in `@q loves ?who Mary`:

```
# Build partial (skip the hole)
partial = loves ⊕ (Pos2 ⊕ Mary)

# Unbind from fact in KB
result = fact ⊕ partial
       = (loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)) ⊕ (loves ⊕ (Pos2 ⊕ Mary))
       = Pos1 ⊕ John  # known parts cancel out!

# Extract answer
answer = result ⊕ Pos1
       = John
```

**Important scope note (non-XOR strategies):**
The cancellation derivation above relies on **XOR-class** binding where `UNBIND` is the same operation as `BIND` and is self-inverse. In AGISystem2, not all strategies have that property (e.g., sparse-polynomial, metric-affine, EXACT). For those strategies:

- `unbind(KB, partial)` may produce a **residual / superposition** that contains *more than just* the missing argument.
- Extracting the hole value requires a **decoding / projection** step, which can be strategy-specific.
- Some strategies expose a helper like `decodeUnboundCandidates(unboundVec, ...)` to “clean” structural residue and return ranked entity candidates.

---

## 7a.5 Position Vectors

Defined in `config/Core/01-positions.sys2`:

```sys2
@Pos1:Pos1 ___NewVector "__Pos1__" "Core"
@Pos2:Pos2 ___NewVector "__Pos2__" "Core"
@Pos3:Pos3 ___NewVector "__Pos3__" "Core"
...
@Pos20:Pos20 ___NewVector "__Pos20__" "Core"
```

The special `__PosN__` naming ensures:
1. Orthogonality between position vectors
2. No collision with user-defined atoms
3. Deterministic creation across sessions

---

## 7a.6 HDC Strategy Support

AGISystem2 supports two HDC strategies:

| Strategy | Description | Vector Type | Use Case |
|----------|-------------|-------------|----------|
| `dense-binary` | Traditional bit vectors | Uint32Array | Fast, memory-efficient |
| `sparse-polynomial` | Polynomial exponents | Set<number> | Better mathematical properties |

Strategy is set per-session:
```javascript
const session = new Session({ hdcStrategy: 'sparse-polynomial' });
```

---

## 7a.7 Implementation Files

| File | Purpose |
|------|---------|
| `src/core/operations.mjs` | bind, bundle, similarity |
| `src/core/position.mjs` | Position vector management |
| `src/core/vectors/dense-binary.mjs` | Uint32Array implementation |
| `src/core/vectors/sparse-polynomial.mjs` | Polynomial implementation |
| `config/Core/01-positions.sys2` | Position vector definitions |

---

*End of DS07a - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*

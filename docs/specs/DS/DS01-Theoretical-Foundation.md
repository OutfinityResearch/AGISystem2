# AGISystem2 - System Specifications

# Chapter 1: Theoretical Foundations

**Document Version:** 5.0  
**Author:** Sînică Alboaie  
**Status:** Draft Specification

---

## 1.1 Why Hyperdimensional Computing?

Hyperdimensional Computing (HDC) bridges symbolic AI and neural networks:

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| Symbolic AI | Compositionality, reasoning | Brittle, no graceful degradation |
| Neural Networks | Noise tolerance, learning | Black box, no structure |
| **HDC** | Both: compositional AND robust | Needs proper operations |

**Key insight:** In high dimensions (16K-64K bits), random vectors are quasi-orthogonal. This gives us "free" symbols that combine algebraically.

---

## 1.2 Core Operations (Strategy-defined)

AGISystem2 is built around a very small **strategy interface**: `BIND`, `UNBIND`, `BUNDLE`, `SIMILARITY` (plus deterministic atom creation).  
This chapter introduces the **baseline intuition** using the classic dense-binary (XOR) instantiation, but **the exact algebra is strategy-dependent** (see DS07a + strategy DS-es).

In particular:
- for XOR-based strategies, `UNBIND` is the same operation as `BIND` (self-inverse cancellation);
- for non-XOR strategies, `UNBIND` is **not** necessarily the same as `BIND` (and may be a quotient/residual-style operator).

### 1.2.1 Bind (Dense-Binary XOR)

```
C = A ⊕ B    (bitwise XOR)
```

**Properties:**
- **Associative**: (A ⊕ B) ⊕ C = A ⊕ (B ⊕ C)
- **Commutative**: A ⊕ B = B ⊕ A
- **Self-inverse**: A ⊕ A = 0
- **Reversible**: (A ⊕ B) ⊕ B = A
- **Preserves extension**: [v|v] ⊕ [u|u] = [v⊕u | v⊕u] ✓

**Use:** Associate concepts, create relationships

> ### ⚠️ XOR Commutativity and Argument Order (Dense-Binary)
>
> **Critical Understanding:** Because XOR is both commutative AND associative, the algebraic result is invariant to the order in which pairs are XORed together:
>
> ```
> (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary) = (Pos2 ⊕ Mary) ⊕ (Pos1 ⊕ John)
> ```
>
> **What this means:**
> - The position vectors `Pos1`, `Pos2`, etc. act as **unique semantic tags**, NOT as strict sequence encoders
> - The final vector correctly encodes WHICH argument occupies WHICH position
> - However, the vector itself does not inherently encode the ORDER 1→2→3
> - Different argument orders with the same atoms at different positions produce mathematically different vectors
> - But **swapping the same atoms** between positions can create algebraic ambiguity
>
> **Mitigation Strategy:**
> 1. **Similarity-based decoding:** Use topK similarity matching to identify most probable arguments
> 2. **Semantic role templates:** The Phrasing Engine (DS11) uses role-annotated templates like `{Pos1:Seller}` to impose logical order at presentation time
> 3. **Domain knowledge:** Operators carry semantic expectations (e.g., `loves(Subject, Object)`) that guide interpretation
>
> **Practical Impact:**
> - Encoding is robust and unambiguous
> - Decoding relies on semantic context and similarity matching
> - The Phrasing Engine is the authoritative component for enforcing output order

### 1.2.2 Bundle (Dense-Binary Majority Vote)

```
C = Bundle(A, B, D, ...)
C[i] = 1 if majority of inputs have 1 at position i
```

**Properties:**
- **Preserves similarity**: C is similar to all inputs
- **Capacity limited**: ~100-200 items before saturation (HDC-Priority mode only)*
- **Non-reversible**: Cannot extract individual items
- **Preserves extension**: Works with cloned vectors ✓

*\*Some runtime modes avoid global BUNDLE superposition by keeping facts as separate items (and using HDC only for candidate generation/cleanup). See DS05 and DS17.*

**Use:** Superposition, memory, sets

### 1.2.3 UNBIND is Strategy-Dependent (Not Always Self-Inverse)

For XOR strategies, unbinding is “free cancellation”:

```
UNBIND(XOR):  UNBIND(C, B) = C ⊕ B
```

But in AGISystem2 we also support strategies where:
- `BIND` is not XOR (e.g., polynomial/field-like binding, metric hybrids),
- the representation is not a fixed-length dense bitvector,
- `UNBIND` may be an **approximate inverse**, a **residual extraction**, or an operator family.

Example: the `exact` strategy (DS25) treats facts as sets (bitsets) and uses a quotient-like `UNBIND` that extracts residues via subset tests (not self-inverse XOR).

### 1.2.3 Why NOT Permutation?

**Problem with permutation and vector extension:**

```
Small vector (16K): [v]
Extended by cloning (32K): [v | v]

Permute by 1 bit:
ρ¹([v | v]) → bits shift ACROSS clone boundary!
               ↓
         Semantic information corrupted
```

**Visual example:**
```
Original 8-bit: [A B C D E F G H]
Cloned to 16:   [A B C D E F G H | A B C D E F G H]
Permute by 1:   [H A B C D E F G | H A B C D E F G]  ← WRONG!
Should be:      [H A B C D E F G | H A B C D E F G]  is actually
                [H|A B C D E F G   H|A B C D E F G]  ← bits cross boundary!
```

Permutation breaks when vectors are extended. We use **position vectors** instead.

---

## 1.3 Vector Geometry

### 1.3.1 Dimensionality Tiers

| Tier | Bits | Bytes | Bundle Capacity | Use Case |
|------|------|-------|-----------------|----------|
| Small | 16,384 | 2 KB | ~50-100 items | Simple domains |
| Standard | 32,768 | 4 KB | ~100-200 items | General purpose |
| Large | 65,536 | 8 KB | ~200-400 items | Complex domains |

### 1.3.2 Vector Extension (Cloning)

When a smaller vector operates with a larger one:

```
Small (16K):    [v]
Extended (32K): [v | v]       (clone once)
Extended (64K): [v | v | v | v]  (clone twice)
```

**Why cloning works:**

1. **XOR preserves pattern:**
   ```
   [v | v] ⊕ [u | u] = [v⊕u | v⊕u]
   ```
   Result is itself a valid cloned vector.

2. **Similarity preserved:**
   ```
   similarity([v|v], [u|u]) = similarity(v, u)
   ```
   Each half contributes equally.

3. **Downgradable:**
   ```
   Original recoverable by taking any segment of original size
   ```

### 1.3.3 Quasi-Orthogonality

At d=32,768 bits, two random vectors share ~50% ± 0.3% bits.

| Similarity | Meaning |
|------------|---------|
| 1.0 | Identical |
| 0.5 | Random/unrelated |
| > 0.6 | Meaningfully similar |
| < 0.4 | Meaningfully different |
| 0.0 | Exact opposite (NOT) |

---

## 1.4 Position Encoding with Role Vectors

### 1.4.1 The Problem

We need to distinguish:
```
loves(John, Mary) ≠ loves(Mary, John)
```

Without permutation, how do we encode position?

### 1.4.2 The Solution: Position Vectors

Core defines position markers `Pos1`, `Pos2`, ... `PosN`:

```
fact = Verb ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ (Pos3 ⊕ Arg3)
```

Each argument is bound with its position marker before being XORed into the fact.

**Example:**
```
# "John loves Mary"
f1 = Loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)

# "Mary loves John" (different!)
f2 = Loves ⊕ (Pos1 ⊕ Mary) ⊕ (Pos2 ⊕ John)

similarity(f1, f2) ≈ 0.5  # Different facts (as expected)
```

### 1.4.3 Recovery (Unbinding)

To extract `Arg1` from a fact where we know `Verb` and `Arg2` (XOR strategies):
```
temp = fact ⊕ Verb ⊕ (Pos2 ⊕ Arg2)
# temp ≈ Pos1 ⊕ Arg1
Arg1 = temp ⊕ Pos1
```

Known parts cancel out via XOR’s self-inverse property.  
Other strategies follow the same **structured-record idea** (role/position markers), but use their own `UNBIND` + decoding/cleanup pipeline (DS07a, DS15, DS18, DS23, DS25).

### 1.4.4 Why Position Vectors Work with Extension

```
Small (16K):
  Pos1 = [p]
  John = [j]
  Pos1 ⊕ John = [p⊕j]

Extended (32K):
  Pos1 = [p | p]
  John = [j | j]
  Pos1 ⊕ John = [p⊕j | p⊕j]  ✓ Same pattern, just doubled!
```

Position vectors clone alongside value vectors, maintaining consistency.

---

## 1.5 Deterministic Initialization: ASCII Stamping

### 1.5.1 Why Deterministic?

- **Reproducibility**: Same name → same vector across runs
- **Extension compatible**: Pattern survives cloning
- **Debuggable**: Can verify vector identity
- **Cross-session**: Vectors persist meaningfully

### 1.5.2 The Algorithm

```javascript
function initVector(name, theoryId, geometry) {
    // Step 1: Create base pattern from name's ASCII
    const ascii = stringToBytes(name);  // "John" → [74, 111, 104, 110]
    
    // Step 2: Create deterministic seed from theory+name
    const seed = hash(theoryId + ":" + name);
    const rng = PRNG(seed);
    
    // Step 3: Define stamp parameters
    const stampSize = 256;  // bits per stamp
    const numStamps = geometry / stampSize;  // 32768/256 = 128 stamps
    
    // Step 4: Create base stamp (ASCII repeated to fill)
    const baseStamp = createBaseStamp(ascii, stampSize);
    
    // Step 5: Fill vector with stamps + positional variation
    const vector = new BitVector(geometry);
    
    for (let i = 0; i < numStamps; i++) {
        const variation = rng.nextBits(stampSize);
        const stamp = xor(baseStamp, variation);
        vector.setRange(i * stampSize, stamp);
    }
    
    return vector;
}

function createBaseStamp(ascii, size) {
    // Convert ASCII bytes to bits, repeat to fill stamp size
    const bits = [];
    while (bits.length < size) {
        for (const byte of ascii) {
            for (let b = 7; b >= 0; b--) {
                bits.push((byte >> b) & 1);
                if (bits.length >= size) break;
            }
            if (bits.length >= size) break;
        }
    }
    return bits.slice(0, size);
}
```

### 1.5.3 Visual Example: "John"

```
Name: "John"
ASCII bytes: [74, 111, 104, 110]
Binary:      [01001010, 01101111, 01101000, 01101110]
              J         o         h         n

Step 1 - Base pattern (32 bits):
  01001010_01101111_01101000_01101110
  J        o        h        n

Step 2 - Stamp (256 bits = base repeated 8×):
  [JohnJohnJohnJohnJohnJohnJohnJohn]

Step 3 - Vector (32,768 bits = 128 stamps):

  ┌──────────────┬──────────────┬─────┬──────────────┐
  │ Stamp₀       │ Stamp₁       │ ... │ Stamp₁₂₇    │
  │ base⊕rand(0) │ base⊕rand(1) │     │ base⊕rand(127)│
  └──────────────┴──────────────┴─────┴──────────────┘

Each stamp: ASCII pattern XOR position-specific random bits
Result: Recognizable pattern + enough variation for uniqueness
```

### 1.5.4 Properties

| Property | Mechanism | Benefit |
|----------|-----------|---------|
| Deterministic | hash(theory+name) as seed | Reproducible |
| Recognizable | ASCII pattern in each stamp | Debuggable |
| Unique | Position-specific PRNG variation | No collisions |
| Extensible | Pattern repeats naturally | Cloning works |

### 1.5.5 Extension Behavior

```
"John" at 16K: [Stamp₀...Stamp₆₃]      (64 stamps)
"John" at 32K: [Stamp₀...Stamp₁₂₇]     (128 stamps)
"John" at 64K: [Stamp₀...Stamp₂₅₅]     (256 stamps)

Clone 16K→32K: [Stamp₀...Stamp₆₃ | Stamp₀...Stamp₆₃]

Native 32K ≠ Cloned 16K→32K  (different stamp sequences)
BUT: similarity is HIGH because ASCII pattern is same
```

### 1.5.6 Theory-Specific Vectors

Same name in different theories → different vectors:

```
initVector("John", "FamilyTheory", 32768) 
  seed = hash("FamilyTheory:John") → vector_A

initVector("John", "BusinessTheory", 32768)
  seed = hash("BusinessTheory:John") → vector_B

similarity(vector_A, vector_B) ≈ 0.5  (unrelated)
```

Within same theory, always identical:
```
initVector("John", "Family", 32768) === initVector("John", "Family", 32768)
```

---

## 1.6 Core Position Vectors

Core predefines position vectors using special names:

```
Pos1  = initVector("__Pos1__",  "Core", geometry)
Pos2  = initVector("__Pos2__",  "Core", geometry)
Pos3  = initVector("__Pos3__",  "Core", geometry)
...
Pos20 = initVector("__Pos20__", "Core", geometry)
```

**Properties:**
- Deterministic across all systems
- Quasi-orthogonal to each other
- Quasi-orthogonal to user vectors (different name patterns)
- Extend correctly via cloning

**Usage in binding:**
```
@dest Op Arg1 Arg2 Arg3

Internally:
dest = Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ (Pos3 ⊕ Arg3)
```

---

## 1.7 Memory Architecture

### 1.7.1 Hot Memory (RAM)

| Aspect | Specification |
|--------|---------------|
| Format | Dense binary, `uint64[]` arrays |
| Operations | XOR, popcount: O(geometry/64) |
| Storage | Native geometry per theory |

**Operation costs:**

| Operation | 16K bits | 32K bits | 64K bits |
|-----------|----------|----------|----------|
| XOR | 256 ops | 512 ops | 1024 ops |
| Similarity | 256+sum | 512+sum | 1024+sum |
| Bundle(n) | n × 256 | n × 512 | n × 1024 |

### 1.7.2 Cold Storage (Disk)

| Aspect | Specification |
|--------|---------------|
| Format | Sparse indices + Roaring Bitmap |
| Threshold | Top 2% bits retained |
| Compression | ~15-20× reduction |

**Sparsification:**
```
Dense 32K (32,768 bits)
  → Keep top 2% = 655 most informative bit indices
  → Store as sorted uint16 array
  → Compress with Roaring Bitmap
  → Result: ~200-300 bytes (vs 4KB dense)
```

---

## 1.8 The Complete Binding Formula

### 1.8.1 Statement Encoding

```
@dest Op Arg1 Arg2 ... ArgN
```

Becomes:
```
dest = Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ ... ⊕ (PosN ⊕ ArgN)
```

### 1.8.2 With Graph

When Op has an associated graph:
```
dest = Op ⊕ graph_result
```

The graph internally uses position vectors for its own structure.

### 1.8.3 Query Execution

Query: `@q Op ?who Arg2` (hole at position 1)

This example uses XOR-style unbinding. The same query surface exists across strategies, but the backend uses strategy-specific `UNBIND` + decoding.

```
# Build partial (without the hole)
partial = Op ⊕ (Pos2 ⊕ Arg2)

# Unbind from knowledge base
result = KB ⊕ partial

# Result contains Pos1 ⊕ who (plus noise from other KB facts)
# Find nearest match in vocabulary after unbinding Pos1:
candidate = result ⊕ Pos1
answer = findMostSimilar(candidate, vocabulary)
```

For non-XOR strategies, the equivalent flow is:
- construct the query key / partial structure,
- apply strategy-defined `UNBIND` against the KB representation,
- decode/cleanup candidates using strategy-defined similarity or exact witnesses.

---

## 1.9 Grounding via Teacher-Student

External embeddings can be projected into HDC:

```
Text "happy"
  → LLM embedding: float[1536]
  → Random projection: M[geometry × 1536] × embedding
  → Binarize: bit[i] = 1 if projection[i] > 0
  → Result: BitVector[geometry]
```

**Hybrid initialization:**
```
ascii_vector = initVector("happy", theory, geometry)
llm_vector = projectEmbedding("happy", geometry)
final_vector = Bundle(ascii_vector, llm_vector)
```

---

## 1.10 Hybrid Reasoning Architecture

AGISystem2 implements a **hybrid reasoning architecture**. In practice there are multiple “engines” that can cooperate:
- a symbolic matcher / backtracker for exact validation and proofs,
- a holographic (HDC/VSA) candidate generator and scorer,
- strategy-specific decoding/cleanup for turning an unbound residue into named symbols.

The runtime can choose different tactics depending on strategy capabilities and query type (DS05, DS06, DS17, DS25).

### 1.10.1 Symbolic-first vs Holographic-first (High Level)

| Mode | HDC role | Symbolic role | Typical use |
|------|----------|---------------|-------------|
| **Holographic-first** | Generate candidates via `UNBIND` + similarity/witnesses | Optional validation / proof | Fast retrieval, approximate reasoning, cleanup |
| **Symbolic-first** | Optional prefilter / scoring | Primary solver (match, chain, CSP) | Proofs, constraints, long chains, exactness |

### 1.10.2 The “Reasoning Equation” (General Form)

Across strategies, the canonical pattern is:

```
AnswerCandidates = UNBIND(KB, QueryKey)
```

Where:
- `UNBIND` is strategy-defined (XOR cancellation, quotient-like extraction, approximate inverse, etc.),
- `AnswerCandidates` typically require decoding/cleanup (similarity search, witness ranking, structural projection),
- symbolic validation may be applied depending on query type and engine policy.

See DS07a (primitives), DS05/DS06/DS17 (reasoning engines), DS25 (EXACT UNBIND), DS15/DS18/DS23 (strategy families).

### 1.10.3 Closure Operators (STAR / UNSTAR) — Research Direction

Some reasoning tasks are naturally multi-step (chains, closure, exploration). For these, a single `UNBIND(KB, QueryKey)` pass is not enough; we can iterate a *step operator* to a fixpoint (with budgets).

URK/closure introduces two operators:
- `STAR(seed)` (least-fixpoint closure / “all reachable derivations”),
- `UNSTAR(goal)` (reverse-closure / abduction-style preimage exploration).

These are strategy-agnostic at the engine level and can be **exact** for strategies like `exact`, or **beam/approx** for dense/metric strategies.

See DS39–DS45 (STAR/UNSTAR, URK programs, fixpoint engine, backends, probabilistic + mathematical extensions) and the overview DS06.

### 1.10.4 Practical Strategy Guidance (Conservative)

Different strategies trade off capacity, speed, and how “literal” unbinding is:
- XOR-style dense strategies are strong at cleanup and graded similarity, but can saturate under large superpositions.
- sparse/metric strategies support scalable storage and structured matching, but rely more on decoding/validation logic.
- `exact` is lossless at the representation level (session-local atom IDs) and supports quotient-like unbinding, but requires careful projection/cleanup for human-readable decoding.

For implementation details and current runtime behavior, prefer DS05/DS06/DS17 and per-strategy DS-es over this chapter.

### 1.10.5 Architecture Implications

The hybrid design means:
1. **Same DSL, multiple backends:** user-level DSL stays stable while engines/strategies evolve.
2. **Engine policy is explicit:** holographic-first may validate symbolically; symbolic-first may use HDC prefilters.
3. **UNBIND is not a single law:** the reasoning pipeline must be designed per strategy family (XOR vs non-XOR).
4. **Advanced reasoning is layered:** STAR/UNSTAR and URK-style programs extend the core without breaking it.

---

## 1.11 Summary

| Concept | Description |
|---------|-------------|
| **Core interface** | Strategy-defined `bind / unbind / bundle / similarity` |
| **Dense-binary baseline** | XOR bind/unbind + majority bundle |
| **No permutation** | Breaks vector extension |
| **Position vectors** | Pos1, Pos2, ... encode argument order |
| **Extension** | Clone: [v] → [v\|v] → [v\|v\|v\|v] |
| **Deterministic init (example)** | ASCII stamping for PRNG-based strategies (others may differ) |
| **Binding formula** | result = Op ⊕ (Pos1⊕A1) ⊕ (Pos2⊕A2) ⊕ ... |
| **Query** | `UNBIND(KB, QueryKey)` + decode/cleanup (+ optional proof/validation) |
| **Closure (research)** | STAR/UNSTAR fixpoint reasoning over a step operator |

**Key design decisions:**
1. Keep a small strategy interface, allow multiple algebras.
2. Use explicit role/position markers (no permutation) for structured records.
3. Prefer deterministic atom creation per strategy (debuggable and reproducible).
4. Separate “candidate generation” (HDC) from “validation/proof” (symbolic) when needed.
5. Extend core reasoning via closure/program semantics (STAR/UNSTAR, URK) without rewriting the DSL.

---

## 1.12 Related Specifications

This chapter is intentionally conceptual. For concrete implementation details and current runtime behavior:

- `docs/specs/DS/DS02-DSL-Syntax.md` — DSL surface used by theories and eval books.
- `docs/specs/DS/DS03-Architecture.md` — layering, Session, strategy pluggability.
- `docs/specs/DS/DS05-Basic-Reasoning-Engine.md` — baseline query processing + proof/validation flow.
- `docs/specs/DS/DS06-Advanced-Reasoning.md` — advanced operators and engine extensions.
- `docs/specs/DS/DS07a-HDC-Primitives.md` — abstract primitives + structured-record encoding.
- `docs/specs/DS/DS11-Decoding-Phrasing-Engine.md` — turning internal results into human-readable form.
- `docs/specs/DS/DS15-Sparse-Polynomial-HDC.md` — sparse polynomial strategy family.
- `docs/specs/DS/DS18-Metric-Affine-HDC.md` and `docs/specs/DS/DS23-Elastic-Metric-Affine-HDC.md` — metric-affine strategy family.
- `docs/specs/DS/DS25-Exact-Sparse-Bitset-Polynomial-HDC.md` — EXACT strategy (quotient-like unbinding).
- `docs/specs/DS/DS17-Holographic-Priority-Mode.md` and `docs/specs/DS/DS17-Meta-Query-Operators.md` — engine policies and meta-operators.
- `docs/specs/DS/DS39-Reasoning-Closure-STAR-UNSTAR-RESEARCH.md` — STAR/UNSTAR closure (research).
- `docs/specs/DS/DS41-URK-Reasoning-Programs-IR-RESEARCH.md` to `docs/specs/DS/DS45-URK-Probabilistic-and-Mathematical-Reasoning-RESEARCH.md` — URK kernel (research).
- `docs/specs/DS/DS46-Discrete-Phase-Lattice-Hologram-HDC-RESEARCH.md` and `docs/specs/DS/DS47-Optical-Field-HDC-Strategy-OFHDC-RESEARCH.md` — additional strategy proposals (research).

*End of Chapter 1*

# AGISystem2 - System Specifications

# Chapter 1: Theoretical Foundations

**Document Version:** 5.0  
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

## 1.2 The Two Fundamental Operations

AGISystem2 uses only **TWO** vector operations:

### 1.2.1 Bind (XOR)

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

> ### ⚠️ THE FOUNDATIONAL LIMITATION: XOR Commutativity and Argument Order
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

### 1.2.2 Bundle (Majority Vote)

```
C = Bundle(A, B, D, ...)
C[i] = 1 if majority of inputs have 1 at position i
```

**Properties:**
- **Preserves similarity**: C is similar to all inputs
- **Capacity limited**: ~100-200 items before saturation
- **Non-reversible**: Cannot extract individual items
- **Preserves extension**: Works with cloned vectors ✓

**Use:** Superposition, memory, sets

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

To extract Arg1 from a fact where we know Verb and Arg2:
```
temp = fact ⊕ Verb ⊕ (Pos2 ⊕ Arg2)
# temp ≈ Pos1 ⊕ Arg1
Arg1 = temp ⊕ Pos1
```

Known parts cancel out via XOR self-inverse property.

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

### 1.8.2 With Macro

When Op has an associated macro:
```
dest = Op ⊕ macro_result
```

The macro internally uses position vectors for its own structure.

### 1.8.3 Query Execution

Query: `@q Op ?who Arg2` (hole at position 1)

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

## 1.10 Summary

| Concept | Description |
|---------|-------------|
| **Two operations only** | XOR (bind) and Bundle (superposition) |
| **No permutation** | Breaks vector extension |
| **Position vectors** | Pos1, Pos2, ... encode argument order |
| **Extension** | Clone: [v] → [v\|v] → [v\|v\|v\|v] |
| **ASCII stamping** | Name → ASCII bits → repeated stamp + PRNG variation |
| **Binding formula** | result = Op ⊕ (Pos1⊕A1) ⊕ (Pos2⊕A2) ⊕ ... |
| **Query** | Unbind known parts, search vocabulary |

**Key design decisions:**
1. XOR + Bundle only → extension works
2. Position via role vectors → no permutation needed
3. ASCII stamping → deterministic, recognizable, extensible
4. Theory-scoped names → same name can exist in multiple theories

---

*End of Chapter 1*

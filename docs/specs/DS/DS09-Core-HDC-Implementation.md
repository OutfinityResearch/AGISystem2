# AGISystem2 - System Specifications

# Chapter 9A: Core HDC Implementation

**Document Version:** 3.0
**Status:** Draft Specification
**Focus:** HDC Strategy Abstraction, Theoretical Foundation, Module Architecture

---

## 9A.0 HDC Strategy Architecture

AGISystem2 uses a **strategy pattern** for HDC operations. This allows swapping the underlying vector representation without changing the reasoning layer.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Application (DSL, Session API)                    │
│  ─────────────────────────────────────────────────────────  │
│  Layer 3: Reasoning (Query, Prove, Rules)                   │
│  ─────────────────────────────────────────────────────────  │
│  Layer 2: HDC Operations Interface (bind, bundle, sim)      │  ← CONTRACT
│  ═══════════════════════════════════════════════════════════│
│  Layer 1: HDC Implementation Strategy                       │  ← SWAPPABLE
│           ├── dense-binary (Uint32Array, XOR, majority)     │  ← DEFAULT
│           └── [future: sparse-polynomial, bigint, etc.]     │
└─────────────────────────────────────────────────────────────┘
```

### Strategy Selection

The HDC strategy is selected via environment variable:

| Variable | Default | Description |
|----------|---------|-------------|
| `SYS2_HDC_STRATEGY` | `dense-binary` | Active HDC implementation |

**Note:** This chapter describes the `dense-binary` strategy (the default and currently only implementation). Future strategies must satisfy the same HDC contract.

---

## 9A.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AGISystem2 Engine                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Parser    │  │  Executor   │  │    Query Engine         │ │
│  │  (DSL→AST)  │  │ (AST→Vecs)  │  │ (holes→answers)         │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│  ┌──────┴────────────────┴──────────────────────┴─────────────┐ │
│  │                    Runtime Layer                            │ │
│  │  Session │ Scope │ TheoryRegistry │ KnowledgeBase          │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                   │
│  ┌──────────────────────────┴─────────────────────────────────┐ │
│  │                    HDC Facade (src/hdc/facade.mjs)          │ │
│  │  bind, bundle, similarity, createFromName, topKSimilar     │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                   │
│  ┌──────────────────────────┴─────────────────────────────────┐ │
│  │              HDC Strategy: dense-binary (DEFAULT)           │ │
│  │  DenseBinaryVector │ XOR binding │ Majority bundle          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Module Map

```
src/
├── hdc/                     # ← HDC ABSTRACTION LAYER (NEW)
│   ├── facade.mjs           # Single entry point for all HDC ops
│   ├── contract.mjs         # Interface definitions (JSDoc)
│   └── strategies/
│       ├── index.mjs        # Strategy registry
│       └── dense-binary.mjs # Default: Uint32Array + XOR
│
├── core/                    # ← BACKWARD COMPATIBILITY (re-exports)
│   ├── vector.mjs           # Re-exports Vector from hdc/facade
│   ├── operations.mjs       # Re-exports operations from hdc/facade
│   ├── position.mjs         # Pos1..Pos20 for argument ordering
│   └── constants.mjs        # GEOMETRY=32768, thresholds
│
├── util/                    # ← UTILITIES
│   ├── ascii-stamp.mjs      # Deterministic initialization
│   ├── prng.mjs             # Seeded randomness
│   └── hash.mjs             # String → seed conversion
│
├── parser/                  # ← CHAPTER 9B
│   ├── lexer.mjs            # Tokenization
│   ├── parser.mjs           # AST construction
│   └── ast.mjs              # Node types
│
├── runtime/                 # ← CHAPTER 9B
│   ├── session.mjs          # Main API surface
│   ├── executor.mjs         # Statement execution
│   ├── scope.mjs            # Variable management
│   └── vocabulary.mjs       # Atom registry
│
├── reasoning/               # ← CHAPTER 9B
│   ├── query.mjs            # Hole-filling queries
│   └── prove.mjs            # Proof construction
│
├── decoding/                # ← TEXT GENERATION
│   ├── structural-decoder.mjs
│   ├── text-generator.mjs
│   └── phrasing.mjs
│
└── nlp/                     # ← NL→DSL TRANSFORMATION
    ├── tokenizer.mjs
    ├── patterns.mjs
    └── transformer.mjs
```

---

## 9A.2 Theoretical Foundation: The Vector

### 9A.2.1 What is a Vector?

A **hyperdimensional vector** is a fixed-size binary array that serves as the universal representation for all concepts, relationships, and knowledge in AGISystem2.

```
┌─────────────────────────────────────────────────────────────┐
│  Vector: 32,768 bits (4 KB)                                 │
│  ═══════════════════════════════════════════════════════════│
│  Bit 0                                           Bit 32,767 │
│  [0][1][0][1][1][0][0][1]...........................[1][0][1]│
└─────────────────────────────────────────────────────────────┘

Storage: 512 words × 64 bits/word = 32,768 bits
```

### 9A.2.2 Why 32,768 Bits?

| Geometry | Capacity | Discrimination | Use Case |
|----------|----------|----------------|----------|
| 1,024 | ~10 items | Poor | Toy examples |
| 8,192 | ~50 items | Moderate | Small domains |
| **32,768** | **~200 items** | **Good** | **Production** |
| 65,536 | ~400 items | Very good | Large KBs |

**Key formulas:**
- Expected similarity of random vectors: **0.5**
- Standard deviation: **1/(2√d)** where d = dimension
- At 32K: std dev ≈ 0.003, so 99% of pairs fall in [0.492, 0.508]

### 9A.2.3 The Quasi-Orthogonality Property

Random vectors in high dimensions are *almost* orthogonal:

```
Two random 32K vectors:
├── Expected similarity: 0.500
├── 99% confidence interval: [0.492, 0.508]
└── Probability of sim > 0.55: < 0.0001%

Implication: Any randomly initialized vector is 
             "far enough" from all others to be unique
```

---

## 9A.3 The Three Core Operations

### 9A.3.1 BIND (XOR) — Association

**Purpose:** Create relationships, tag concepts with roles.

```
Concept:    A ⊕ B creates an association between A and B

Properties:
├── Commutative:   A ⊕ B = B ⊕ A
├── Associative:   (A ⊕ B) ⊕ C = A ⊕ (B ⊕ C)
├── Self-inverse:  A ⊕ A = 0 (zero vector)
├── Reversible:    (A ⊕ B) ⊕ B = A
└── Dissimilar:    sim(A ⊕ B, A) ≈ 0.5

Usage:
├── loves(John, Mary) = Loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)
├── Role binding:     (Agent ⊕ John)
└── Type marking:     (__Person ⊕ John)
```

### 9A.3.2 BUNDLE (Majority) — Superposition

**Purpose:** Store multiple items in one vector, create sets/memory.

```
Concept:    Bundle([A, B, C]) creates superposition of A, B, C

Algorithm:  For each bit position, output 1 if majority of inputs are 1

Properties:
├── Similar to inputs:  sim(Bundle([A,B,C]), A) > 0.5
├── NOT reversible:     Cannot extract A from Bundle([A,B,C])
├── Capacity limited:   ~100-200 items before saturation (dense-binary only*)
└── Order independent:  Bundle([A,B]) = Bundle([B,A])

* Applies to HDC-Priority mode. Symbolic-Priority mode uses metadata
  storage with unlimited capacity. See DS01 Section 1.10.

Capacity degradation (dense-binary):
├── n=10:   sim ≈ 0.66  (clear signal)
├── n=50:   sim ≈ 0.57  (usable)
├── n=100:  sim ≈ 0.55  (marginal)
├── n=200:  sim ≈ 0.535 (threshold)
└── n=500:  sim ≈ 0.52  (noise)
```

### 9A.3.3 SIMILARITY — Comparison

**Purpose:** Find matches, answer queries.

```
Concept:    similarity(A, B) = 1 - (hamming_distance / dimension)

Output:
├── 1.0:  Identical
├── 0.5:  Unrelated (random)
├── 0.0:  Inverse (bitwise NOT)

Interpretation thresholds:
├── > 0.80:  Strong match (trust it)
├── 0.65-0.80:  Good match (probably correct)
├── 0.55-0.65:  Weak match (verify if critical)
└── < 0.55:  Poor match (don't trust)
```

---

## 9A.4 Position Vectors: Solving Argument Order

### 9A.4.1 The Problem with XOR

XOR is commutative, so it cannot encode argument order:

```
WITHOUT positions:
  loves(John, Mary) = Loves ⊕ John ⊕ Mary
  loves(Mary, John) = Loves ⊕ Mary ⊕ John
  ↓
  IDENTICAL! (wrong)
```

### 9A.4.2 The Solution: Position Markers

Pre-defined quasi-orthogonal vectors Pos1, Pos2, ..., Pos20:

```
WITH positions:
  loves(John, Mary) = Loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)
  loves(Mary, John) = Loves ⊕ (Pos1 ⊕ Mary) ⊕ (Pos2 ⊕ John)
  ↓
  DIFFERENT! (correct)
```

### 9A.4.3 Why NOT Permutation?

Original HDC uses permutation (bit rotation). We don't because:

```
PERMUTATION BREAKS EXTENSION:
  v at 16K:     [abcdefgh...]
  v at 32K:     [abcdefgh...|abcdefgh...]  (cloned)
  
  perm(v) at 16K:  [bcdefgha...]
  perm(v) at 32K:  [bcdefgha...|bcdefgha...]
  
  BUT: perm([v|v]) = [bcdefgha...|abcdefgh...]  ← DIFFERENT!
  
  Position vectors extend correctly because XOR distributes over cloning.
```

### 9A.4.4 Position Vector Properties

```
Pos1, Pos2, ..., Pos20:
├── Deterministically initialized (same on all systems)
├── Mutually quasi-orthogonal: sim(Pos_i, Pos_j) ≈ 0.5
├── Quasi-orthogonal to user vectors
└── Extend correctly when geometry changes

Initialization: asciiStamp("__Pos1__", "Core", 32768)
```

---

## 9A.5 ASCII Stamping: Deterministic Initialization

### 9A.5.1 Goals

1. **Deterministic:** Same name → same vector (always)
2. **Recognizable:** ASCII pattern visible (debuggable)
3. **Unique:** Different names → quasi-orthogonal vectors
4. **Theory-scoped:** "John" in TheoryA ≠ "John" in TheoryB

### 9A.5.2 Algorithm Overview

```
INPUT:  name="John", theoryId="Family", geometry=32768

STEP 1: ASCII encoding
        "John" → [74, 111, 104, 110] (bytes)

STEP 2: Seed generation
        seed = hash("Family:John") → deterministic number

STEP 3: Base stamp creation
        Repeat ASCII bytes to fill 256-bit stamp:
        [J][o][h][n][J][o][h][n]... (256 bits)

STEP 4: Fill vector with 128 varied stamps
        FOR i = 0 TO 127:
            variation = PRNG(seed, i)
            stamp_i = base_stamp XOR variation
            write stamp_i to vector[i*256..(i+1)*256]

OUTPUT: 32768-bit vector with recognizable but unique pattern
```

### 9A.5.3 Why Stamps?

```
Simple repetition:
  [JohnJohnJohnJohn...] × 1024
  Problem: Too regular, poor randomness properties

Pure random (from hash):
  [random bits...]
  Problem: No recognizability, hard to debug

ASCII stamps + variation:
  [John⊕rand₀][John⊕rand₁]...[John⊕rand₁₂₇]
  Benefits: Recognizable pattern + good randomness
```

---

## 9A.6 The Complete Binding Formula

### 9A.6.1 Statement Encoding

```
DSL:    @dest Op Arg1 Arg2 Arg3

Vector: dest = Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ (Pos3 ⊕ Arg3)

Example:
  @f1 loves John Mary
  f1 = Loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)
```

### 9A.6.2 Query Execution

```
Query:  @q Op ?who Mary   (find who loves Mary)

ALGORITHM:
1. Build partial vector (everything except hole):
   partial = Op ⊕ (Pos2 ⊕ Mary)

2. Unbind from knowledge base:
   candidate = KB ⊕ partial
   
   If KB contains (Op ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)):
   candidate = (Pos1 ⊕ John) ⊕ noise

3. Remove position marker:
   raw = Pos1 ⊕ candidate = John ⊕ noise

4. Find nearest neighbor:
   answer = mostSimilar(raw, vocabulary)
   → Returns "John" with similarity ~0.7
```

### 9A.6.3 Multi-Hole Queries

```
Query:  @q Op ?who ?whom   (2 holes)

Accuracy degradation:
├── 1 hole:  similarity ~0.7  (good)
├── 2 holes: similarity ~0.55-0.65 (moderate)
├── 3 holes: similarity ~0.52-0.58 (poor)
└── 4+ holes: Not recommended

Reason: Each hole adds noise when unbinding
```

---

## 9A.7 Knowledge Base as Bundle

### 9A.7.1 Structure

```
KB = Bundle([fact1, fact2, fact3, ...])

Each fact is a bound vector:
  fact1 = Loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)
  fact2 = Hates ⊕ (Pos1 ⊕ Bob) ⊕ (Pos2 ⊕ Tax)
  ...

KB = Bundle([fact1, fact2, ...])
```

### 9A.7.2 Capacity Limits (HDC-Priority Mode)

**Note:** These limits apply to dense-binary strategy only. Symbolic-Priority
mode (sparse-polynomial, metric-affine) uses metadata storage with unlimited capacity.

```
CRITICAL THRESHOLDS (dense-binary):
├── KB_WARNING = 100 facts
├── KB_CRITICAL = 200 facts
└── KB_MAXIMUM ≈ 500 facts (unusable accuracy)

When approaching limits (dense-binary only):
├── Issue warning to user
├── Suggest partitioning into multiple KBs
├── Or increase geometry (64K, 128K)
└── Or switch to sparse-polynomial strategy
```

### 9A.7.3 Query Noise Analysis

```
KB with n facts, querying for 1:

Signal:    The matching fact contributes ~0.5 + 0.5/√n to similarity
Noise:     Other (n-1) facts contribute random variation

Formula:   expected_similarity ≈ 0.5 + 0.5/√n

At n=100:  0.5 + 0.05 = 0.55 (marginal but usable)
At n=200:  0.5 + 0.035 = 0.535 (threshold)
```

---

## 9A.8 Extension Mechanics

### 9A.8.1 Cross-Geometry Operations

When vectors from different geometries meet:

```
Scenario: TheoryA (16K) + TheoryB (32K) in same session

Solution: Extend smaller to match larger by cloning

16K vector [v]:
  [v] → [v|v] (32K, cloned)

Key property (PROVEN):
  similarity([v|v], [u|u]) = similarity(v, u)
  
  Proof: Matching bits double, total bits double → ratio preserved
```

### 9A.8.2 What Extends Correctly

```
Operations that preserve similarity after extension:
├── XOR (Bind):     (v⊕u) extended = (v extended)⊕(u extended) ✓
├── Bundle:         Bundle([v,u]) extended ≈ Bundle([v ext, u ext]) ✓
├── Similarity:     Preserved by cloning formula ✓

Operations that DON'T extend:
├── Permutation:    perm(v extended) ≠ (perm(v)) extended ✗
└── Bit rotation:   Same problem ✗

This is why we use position vectors, not permutation.
```

---

## 9A.9 HDC Contract (Strategy Requirements)

All HDC strategies must satisfy these **mathematical properties**:

| Property | Requirement | Verification |
|----------|-------------|--------------|
| `bind(a, a)` | Produces "zero" effect (self-inverse) | Unit test |
| `bind(bind(a, b), b)` | ≈ a (reversibility) | Similarity > 0.95 |
| `similarity(v, v)` | = 1.0 (reflexive) | Exact equality |
| `similarity(a, b)` | = similarity(b, a) (symmetric) | Unit test |
| `similarity(random, random)` | ≈ 0.5 ± 0.05 (quasi-orthogonal) | Statistical test |
| `bundle([a,b,c]).similarity(a)` | > 0.5 for small n (retrievable) | Unit test |

### Required Strategy Functions

```javascript
// Factory
createZero(geometry)           // → zero vector
createRandom(geometry, seed?)  // → random ~50% density vector
createFromName(name, geometry) // → deterministic vector (CRITICAL: same input = same output)
deserialize(obj)               // → vector from storage format

// Core operations
bind(a, b)                     // → associative, commutative, self-inverse
bindAll(...vectors)            // → sequential bind
bundle(vectors, tieBreaker?)   // → superposition (majority vote for binary)
similarity(a, b)               // → [0, 1] range
unbind(composite, component)   // → strategy-defined inverse/quotient; may leave residual structure

// Utilities
clone(v), equals(a, b), serialize(v)
topKSimilar(query, vocabulary, k)
distance(a, b), isOrthogonal(a, b)

// Optional decoding hook (recommended for non-XOR strategies)
decodeUnboundCandidates(unboundVec, options?) // → [{name, similarity, witnesses, source}, ...]
```

**Contract clarification:**
The dense-binary strategy uses XOR binding, so `unbind == bind` and the DS07a cancellation identity applies directly. Other strategies may implement `unbind` as a **quotient-like extraction** that yields a residual vector; in those cases `decodeUnboundCandidates()` provides a strategy-aware “cleanup/projection” step used by holographic (HDC-first) engines.

### Strategy Validation

Use `validateStrategy()` from `src/hdc/contract.mjs`:

```javascript
import { validateStrategy } from './src/hdc/contract.mjs';
const result = validateStrategy(myStrategy, 2048);
console.log(result.valid ? 'OK' : result.errors);
```

---

## 9A.10 Module Responsibilities Summary

### HDC Layer (src/hdc/)

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `facade.mjs` | Single entry point | bind, bundle, similarity, createFromName, initHDC |
| `contract.mjs` | Interface definitions | HDC_CONTRACT, validateStrategy |
| `strategies/index.mjs` | Strategy registry | getStrategy, registerStrategy, listStrategies |
| `strategies/dense-binary.mjs` | Default strategy | DenseBinaryVector, bind, bundle, similarity |

### Core Layer (src/core/) - Backward Compatibility

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `vector.mjs` | Re-export | Vector (from hdc/facade) |
| `operations.mjs` | Re-export | bind, bundle, similarity (from hdc/facade) |
| `position.mjs` | Argument ordering | getPosition, withPosition, removePosition |
| `constants.mjs` | Configuration | GEOMETRY, WORDS, thresholds |

### Utilities (src/util/)

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `ascii-stamp.mjs` | Deterministic init | asciiStamp(name, theory, geo) |
| `prng.mjs` | Seeded random | nextBits, nextInt |
| `hash.mjs` | String→seed | djb2(string) → number |

---

## 9A.11 Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Strategy pattern | Allows future HDC implementations |
| Default strategy | dense-binary | Proven, fast, SIMD-friendly |
| Bit storage (dense-binary) | Uint32Array | Native 32-bit ops in JS |
| Argument order | Position vectors | Permutation breaks extension |
| Initialization | ASCII stamp + hash | Deterministic + debuggable |
| Bundle limit | ~200 facts | Similarity degrades beyond |
| Default geometry | 32,768 | Good capacity/memory tradeoff |
| Position count | 20 | Sufficient for most relations |
| Strategy selection | Env var | Simple, runtime-configurable |

---

## 9A.12 Benchmarking

Benchmark infrastructure is built into the facade:

```javascript
import { benchmarkStrategy, printBenchmark } from './src/hdc/facade.mjs';

const results = benchmarkStrategy('dense-binary', 8192, { iterations: 1000 });
printBenchmark(results);

// Output:
// === HDC Strategy Benchmark ===
// Strategy: dense-binary
// Geometry: 8192
// Operations:
// ────────────────────────────────────────
// bind           0.002 ms    650K ops/sec
// similarity     0.004 ms    250K ops/sec
// bundle         0.195 ms      5K ops/sec
// ────────────────────────────────────────
```

Compare multiple strategies:

```javascript
import { compareStrategies } from './src/hdc/facade.mjs';
const results = compareStrategies(['dense-binary', 'future-strategy'], 8192);
```

---

*End of Chapter 9A - Core HDC Implementation*

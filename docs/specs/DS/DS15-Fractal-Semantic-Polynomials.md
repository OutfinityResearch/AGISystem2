# AGISystem2 - System Specifications

# Chapter 15: Fractal Semantic Polynomials (FSP) - Robust Sparse Hyperdimensional Computing

**Document Version:** 1.0  
**Status:** Draft Specification  
**Audience:** Technical Architects, HDC Researchers, Core Developers

---

## 1. Executive Summary

This document outlines the architecture for a pragmatic, scalable Hyperdimensional Computing (HDC) system based on **Fractal Semantic Polynomials (FSP)**. It addresses the critical conflict between infinite scalability and the self-inverse binding requirement.

The proposed solution replaces standard arithmetic exponent addition with **Integer-XOR based Convolution** combined with **Min-Hash Stability Sampling**. This ensures that:

1. **Binding is Self-Inverse**: $A \otimes A = \emptyset$ (Identity/Noise)
2. **Scalability**: Exponents can grow indefinitely (64-bit or arbitrarily large integers)
3. **Sparsity**: Fixed vector size ($k=500$) is maintained without destroying semantic topology

---

## 2. Mathematical Foundation & Correction

### 2.1 The "Summation" Fallacy

The initial HDC proposal suggested binding via exponent addition: $C = \{a + b \mid a \in A, b \in B\}$.

**Problem**: This operation is not self-inverse.
- $(A + B) - B = A$ requires subtraction, meaning we need to know $B$ exactly to unbind
- HDC requires $(A \otimes B) \otimes B \approx A$
- In additive space: $(a+b)+b = a+2b \neq a$

**Conclusion**: Arithmetic addition cannot be the binding operator for a self-inverse system.

### 2.2 The Robust Solution: Polynomials over GF(2)

We treat the semantic vector not as a sum of powers of $N$, but as a **sparse polynomial over the Galois Field GF(2)**, where the "exponents" are large integers.

**Binding Operator ($\otimes$)**: Integer XOR
```
C = A \otimes B = \{ a \oplus b \mid a \in A, b \in B \}
```

**Properties**:
- **Self-Inverse**: $x \oplus x = 0$. Thus, $(a \oplus b) \oplus b = a \oplus 0 = a$ ✓
- **Associative**: $(a \oplus b) \oplus c = a \oplus (b \oplus c)$ ✓
- **Scalability**: XOR works on integers of any size. It does not saturate like modular arithmetic ✓
- **Fractal Scaling**: Scales with information content ✓

### 2.3 The Sampling Strategy (The Core Fix)

The naive approach of "Keep Top-K Largest Exponents" fails with XOR binding.

**Reason**: XOR is non-monotonic. Two large exponents can XOR to a small number:
- Example: $1000...01_2 \oplus 1000...00_2 = 1$

**Problem**: If we keep only the largest outcomes, we systematically delete relationships between similar high-level concepts.

### 2.4 Proposed Algorithm: Deterministic Min-Hash Sampling

To reduce the $k^2$ expansion of binding back to $k$ elements while preserving Jaccard Similarity probability, we use **content-aware, uniform hashing**.

**Filter Function**:
1. Given intermediate exponents $E_{raw}$ (size $k^2$)
2. Apply uniform hash function $H(x)$ to every exponent $x \in E_{raw}$
3. Sort $E_{raw}$ based on $H(x)$
4. Select the $k$ elements with the smallest hash values

**Theorem (MinHash)**:
> The probability that the hash of an element is the minimum is equal to the Jaccard similarity of the sets. By keeping elements with lowest hash values, we create a statistically representative "signature" of the full set.

---

## 3. System Architecture

### 3.1 Data Structures

**FSPVector**:
```javascript
{
  exponents: SortedSet<uint64>,  // Sorted set of unique 64-bit integers
  MAX_SIZE: 500                  // Constant (e.g., 500)
}
```

### 3.2 Core Operations

#### A. Similarity ($Sim(A, B)$)

**Input**: Two FSPVectors $A, B$
**Logic**: Exact Jaccard Index
**Formula**: $\frac{|A \cap B|}{|A \cup B|}$
**Complexity**: $O(k)$ (since sets are sorted)

#### B. Superposition / Bundle ($+$)

**Input**: Two FSPVectors $A, B$
**Logic**: Set Union
**Sparsification**: If $|A \cup B| > MAX\_SIZE$, apply Min-Hash Sampling

#### C. Binding ($\otimes$)

**Input**: Two FSPVectors $A, B$
**Logic**:
1. Initialize empty set $R$
2. Compute Cartesian XOR: For each $a \in A, b \in B$, compute $x = a \oplus b$
3. Add $x$ to $R$
4. **Sparsification (Crucial)**:
   - Do NOT truncate by magnitude
   - Compute $h = Hash(x)$ for all $x \in R$
   - Sort by $h$ ascending
   - Keep top $MAX\_SIZE$ elements

**Output**: New FSPVector $C$

---

## 4. Why This Works for "Fractal" Spaces

### 4.1 Comparison: Standard HDC vs FSP

| Feature | Standard HDC | FSP Architecture |
|---------|--------------|------------------|
| **Binding** | Arithmetic Add ($+$) | Integer XOR ($\oplus$) |
| **Self-Inverse** | ❌ No ($A+A=2A$) | ✅ Yes ($A \oplus A = 0$) |
| **Associative** | ✅ Yes | ✅ Yes |
| **Scalability** | ✅ Infinite | ✅ Infinite (Fractal) |
| **Sampling** | ❌ Magnitude (Bias) | ✅ Min-Hash (Statistical) |
| **Robustness** | Low (Drift) | High (Holographic) |

### 4.2 Key Advantages

1. **Standard HDC** uses fixed dimensions (e.g., 10,000 bits)
2. **FSP** uses **Sparse Indices**
3. In standard HDC, XORing two orthogonal vectors results in a vector orthogonal to both
4. In FSP, XORing $\{a\}$ and $\{b\}$ results in $\{a \oplus b\}$ - a unique ID for the pair $(a,b)$
5. Because the integer space is $2^{64}$ (or $2^{128}$), collisions are astronomically rare ($P \approx 1/2^{64}$)
6. We simulate an **infinite-dimensional vector space** using only 500 active bits

---

## 5. Implementation Guidelines

### 5.1 Integer Representation

- **Type**: Use unsigned 64-bit integers (`uint64_t` in C++/Rust, `BigInt` in JavaScript)
- **Range**: Full integer range $[0, 2^{64}-1]$ for uniform distribution
- **Avoid**: Clustering near zero

### 5.2 Randomness

- **Base Concepts**: Generate using Uniform Distribution over full integer range
- **Seed**: Use cryptographic-quality randomness for base vectors
- **Deterministic**: For reproducible results, use seeded PRNG

### 5.3 Hash Function

- **Purpose**: Fast, non-cryptographic hash for sampling selection
- **Options**: MurmurHash3, SplitMix64, or xxHash
- **Alternative**: Use exponent value itself as hash (for uniform random numbers)
- **Security**: Explicit hash prevents attacks/bias

### 5.4 Performance Optimization

**Binding Step**: Produces $250,000$ items ($500 \times 500$)

**Optimization Strategies**:
1. **Min-Heap**: Use Min-Heap of size 500 ($O(N \log k)$)
2. **Parallel Processing**: Process Cartesian product in parallel
3. **Early Termination**: Stop when heap is full and remaining elements can't displace current min

**Performance**: For $N=250,000$ and $k=500$, Min-Heap approach is extremely performant (~milliseconds)

---

## 6. AGISystem2 Integration

### 6.1 Strategy Architecture

```
src/hdc/strategies/
├── dense-binary.mjs          # Existing (default)
└── fractal-semantic.mjs     # New FSP strategy
```

### 6.2 Strategy Contract Compliance

FSP strategy must implement the same HDC contract:

```javascript
{
  id: 'fractal-semantic',
  properties: {
    id: 'fractal-semantic',
    displayName: 'Fractal Semantic Polynomials',
    recommendedBundleCapacity: 500,
    maxBundleCapacity: 1000,
    bytesPerVector: (geometry) => 8 * 500,  // 500 uint64 values
    bindComplexity: 'O(k² log k)',
    sparseOptimized: true,
    description: 'FSP: Infinite-dimensional HDC with Min-Hash sampling'
  },
  
  // Factory functions
  createZero,
  createRandom,
  createFromName,
  deserialize,
  
  // Core operations
  bind,
  bindAll,
  bundle,
  similarity,
  unbind,
  
  // Utilities
  clone,
  equals,
  serialize,
  topKSimilar,
  distance,
  isOrthogonal,
  
  // KB Serialization
  serializeKB,
  deserializeKB,
  
  // Internal class
  Vector: FSPVector
}
```

### 6.3 Vector Representation

```javascript
class FSPVector {
  constructor(exponents = new Set()) {
    this.exponents = exponents;
    this.MAX_SIZE = 500;
  }
  
  // Core methods
  size() { return this.exponents.size; }
  
  // Set operations
  union(other) { /* Set union with sparsification */ }
  intersect(other) { /* Set intersection */ }
  
  // Binding
  bind(other) { /* Cartesian XOR with Min-Hash sampling */ }
  
  // Similarity
  jaccard(other) { /* Jaccard index calculation */ }
}
```

---

## 7. Performance Characteristics

### 7.1 Complexity Analysis

| Operation | Complexity | Notes |
|-----------|------------|-------|
| **Similarity** | $O(k)$ | Jaccard on sorted sets |
| **Bundle** | $O(k \log k)$ | Set union + Min-Hash |
| **Bind** | $O(k^2 \log k)$ | Cartesian XOR + Min-Hash |
| **Memory** | $O(k)$ | 500 uint64 values |

### 7.2 Expected Performance

- **Binding**: ~1-5ms for k=500 (250k operations)
- **Similarity**: ~0.1ms for k=500
- **Bundle**: ~0.5ms for k=500
- **Memory**: ~4KB per vector (500 × 8 bytes)

---

## 8. Testing Strategy

### 8.1 Unit Tests

```
tests/unit/hdc/
├── dense-binary.test.mjs      # Existing
└── fractal-semantic.test.mjs  # New FSP tests
```

**Test Coverage**:
- ✅ Vector creation and initialization
- ✅ Binding properties (self-inverse, associative)
- ✅ Similarity calculations
- ✅ Bundle operations
- ✅ Serialization/deserialization
- ✅ Min-Hash sampling correctness

### 8.2 Integration Tests

- ✅ Reasoning engine compatibility
- ✅ Query engine compatibility
- ✅ Knowledge base operations
- ✅ Multi-strategy comparison

### 8.3 Performance Tests

```
performance/
├── benchmarks.mjs             # Benchmark runner
├── theories/                  # Complex test theories
│   ├── medical.fsp            # Medical domain
│   ├── legal.fsp              # Legal domain
│   └── scientific.fsp         # Scientific domain
└── results/                   # Benchmark results
```

---

## 9. Comparative Analysis

### 9.1 vs Dense Binary Strategy

| Aspect | Dense Binary | Fractal Semantic |
|--------|--------------|------------------|
| **Dimensionality** | Fixed (e.g., 32K) | Infinite (sparse) |
| **Memory/Vector** | 4KB | 4KB (500×8 bytes) |
| **Binding** | Bitwise XOR | Integer XOR |
| **Sampling** | N/A | Min-Hash |
| **Scalability** | Limited by geometry | Unlimited |
| **Self-Inverse** | ✅ Yes | ✅ Yes |
| **Associative** | ✅ Yes | ✅ Yes |
| **Performance** | Fast (O(n/32)) | Moderate (O(k² log k)) |

### 9.2 Use Case Recommendations

**Use Fractal Semantic when**:
- ✅ Need infinite scalability
- ✅ Working with very large knowledge bases
- ✅ Need statistical robustness
- ✅ Memory efficiency is critical

**Use Dense Binary when**:
- ✅ Need maximum performance
- ✅ Working with smaller knowledge bases
- ✅ Need backward compatibility
- ✅ Simplicity is preferred

---

## 10. Future Enhancements

### 10.1 Variable Vector Sizes
- Dynamic $k$ based on knowledge base size
- Adaptive sampling strategies

### 10.2 Hybrid Strategies
- Combine FSP with dense vectors
- Use FSP for binding, dense for storage

### 10.3 Advanced Sampling
- Learn optimal sampling strategies
- Domain-specific hash functions

### 10.4 Distributed Computing
- Parallel binding operations
- Distributed knowledge bases

---

## 11. Conclusion

The **Fractal Semantic Polynomials (FSP)** strategy provides a robust, scalable alternative to traditional HDC approaches. By using **Integer-XOR binding** with **Min-Hash sampling**, it achieves:

1. **True Self-Inverse Binding**: Essential for HDC operations
2. **Infinite Scalability**: No dimensionality limits
3. **Statistical Robustness**: Preserves semantic relationships
4. **Memory Efficiency**: Fixed-size sparse representation

This architecture is particularly well-suited for **large-scale knowledge bases** and **complex reasoning scenarios** where traditional HDC approaches may struggle with dimensionality constraints.

---

*End of Chapter 15*
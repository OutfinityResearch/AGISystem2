# Fractal Semantic Polynomials (FSP) Strategy Design

## Overview

This document outlines the design for the Fractal Semantic Polynomials (FSP) HDC strategy implementation in AGISystem2.

## Architecture

### 1. Vector Representation

```javascript
class FSPVector {
  /**
   * @param {Set<bigint>} exponents - Set of 64-bit integers representing semantic dimensions
   * @param {number} maxSize - Maximum number of exponents (default: 500)
   */
  constructor(exponents = new Set(), maxSize = 500) {
    this.exponents = exponents;
    this.maxSize = maxSize;
    this.geometry = maxSize; // For contract compatibility
    this.strategyId = 'fractal-semantic';
  }
  
  /**
   * Get vector size (number of active exponents)
   * @returns {number}
   */
  size() {
    return this.exponents.size;
  }
  
  /**
   * Check if vector is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.exponents.size === 0;
  }
  
  /**
   * Add an exponent to the vector
   * @param {bigint} exponent
   */
  add(exponent) {
    this.exponents.add(exponent);
    return this;
  }
  
  /**
   * Remove an exponent from the vector
   * @param {bigint} exponent
   */
  remove(exponent) {
    this.exponents.delete(exponent);
    return this;
  }
  
  /**
   * Check if vector contains an exponent
   * @param {bigint} exponent
   * @returns {boolean}
   */
  has(exponent) {
    return this.exponents.has(exponent);
  }
  
  /**
   * Get all exponents as sorted array
   * @returns {bigint[]}
   */
  toArray() {
    return Array.from(this.exponents).sort((a, b) => a < b ? -1 : 1);
  }
  
  /**
   * Create a deep copy
   * @returns {FSPVector}
   */
  clone() {
    return new FSPVector(new Set(this.exponents), this.maxSize);
  }
}
```

### 2. Core Operations

#### 2.1 Binding (⊗)

```javascript
/**
 * Bind two FSP vectors using Integer XOR
 * @param {FSPVector} a
 * @param {FSPVector} b
 * @returns {FSPVector}
 */
function bind(a, b) {
  // Cartesian product: a.exponents × b.exponents
  const rawResults = new Set();
  
  for (const expA of a.exponents) {
    for (const expB of b.exponents) {
      rawResults.add(expA ^ expB); // Integer XOR
    }
  }
  
  // Apply Min-Hash sampling to reduce to maxSize
  return sparsify(rawResults, a.maxSize);
}
```

#### 2.2 Sparsification (Min-Hash Sampling)

```javascript
/**
 * Reduce a set of exponents to maxSize using Min-Hash sampling
 * @param {Set<bigint>} exponents
 * @param {number} maxSize
 * @returns {FSPVector}
 */
function sparsify(exponents, maxSize) {
  if (exponents.size <= maxSize) {
    return new FSPVector(exponents, maxSize);
  }
  
  // Convert to array for processing
  const expArray = Array.from(exponents);
  
  // Use Min-Heap for efficient top-k selection
  const heap = new MinHeap(maxSize);
  
  for (const exp of expArray) {
    const hash = hashExponent(exp);
    heap.push({ exponent: exp, hash });
  }
  
  // Extract the k elements with smallest hash values
  const result = new Set();
  while (!heap.isEmpty()) {
    result.add(heap.pop().exponent);
  }
  
  return new FSPVector(result, maxSize);
}

/**
 * Simple hash function for exponents
 * Uses SplitMix64 algorithm for good distribution
 * @param {bigint} exponent
 * @returns {number}
 */
function hashExponent(exponent) {
  // Convert bigint to number (safe for 53-bit precision)
  const num = Number(exponent & 0x1fffffffffffff);
  
  // SplitMix64 hash
  let z = num + 0x9e3779b97f4a7c15;
  z = (z ^ (z >>> 30)) * 0xbf58476d1ce4e5b9;
  z = (z ^ (z >>> 27)) * 0x94d049bb133111eb;
  return z ^ (z >>> 31);
}

/**
 * Min-Heap implementation for efficient top-k selection
 */
class MinHeap {
  constructor(maxSize) {
    this.heap = [];
    this.maxSize = maxSize;
  }
  
  push(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    } else if (item.hash < this.heap[0].hash) {
      this.heap[0] = item;
      this.sinkDown(0);
    }
  }
  
  pop() {
    const result = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.sinkDown(0);
    }
    return result;
  }
  
  isEmpty() {
    return this.heap.length === 0;
  }
  
  bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.hash >= parent.hash) break;
      this.heap[parentIndex] = element;
      this.heap[index] = parent;
      index = parentIndex;
    }
  }
  
  sinkDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];
    
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;
      
      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (leftChild.hash < element.hash) {
          swap = leftChildIndex;
        }
      }
      
      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (
          (swap === null && rightChild.hash < element.hash) ||
          (swap !== null && rightChild.hash < leftChild.hash)
        ) {
          swap = rightChildIndex;
        }
      }
      
      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      this.heap[swap] = element;
      index = swap;
    }
  }
}
```

#### 2.3 Similarity (Jaccard Index)

```javascript
/**
 * Calculate Jaccard similarity between two FSP vectors
 * @param {FSPVector} a
 * @param {FSPVector} b
 * @returns {number} Similarity in range [0, 1]
 */
function similarity(a, b) {
  // Convert to sorted arrays for efficient intersection
  const aArray = a.toArray();
  const bArray = b.toArray();
  
  // Calculate intersection size
  let i = 0, j = 0, intersection = 0;
  
  while (i < aArray.length && j < bArray.length) {
    if (aArray[i] === bArray[j]) {
      intersection++;
      i++;
      j++;
    } else if (aArray[i] < bArray[j]) {
      i++;
    } else {
      j++;
    }
  }
  
  // Calculate union size
  const unionSize = a.size() + b.size() - intersection;
  
  // Jaccard index
  return unionSize === 0 ? 1.0 : intersection / unionSize;
}
```

#### 2.4 Bundle (Superposition)

```javascript
/**
 * Bundle multiple FSP vectors (set union with sparsification)
 * @param {FSPVector[]} vectors
 * @param {FSPVector} [tieBreaker]
 * @returns {FSPVector}
 */
function bundle(vectors, tieBreaker = null) {
  if (vectors.length === 0) {
    throw new Error('bundle requires at least one vector');
  }
  
  if (vectors.length === 1) {
    return vectors[0].clone();
  }
  
  // Start with first vector
  let result = vectors[0].clone();
  
  // Union with remaining vectors
  for (let i = 1; i < vectors.length; i++) {
    const next = vectors[i];
    const union = new Set(result.exponents);
    
    for (const exp of next.exponents) {
      union.add(exp);
    }
    
    // Sparsify if needed
    if (union.size > result.maxSize) {
      result = sparsify(union, result.maxSize);
    } else {
      result = new FSPVector(union, result.maxSize);
    }
  }
  
  return result;
}
```

### 3. Factory Functions

#### 3.1 Create Zero Vector

```javascript
/**
 * Create an empty FSP vector
 * @param {number} geometry - Ignored (for contract compatibility)
 * @returns {FSPVector}
 */
function createZero(geometry = 500) {
  return new FSPVector(new Set(), geometry);
}
```

#### 3.2 Create Random Vector

```javascript
/**
 * Create a random FSP vector with uniform distribution
 * @param {number} geometry - Number of exponents (max size)
 * @param {number} [seed] - Optional seed for determinism
 * @returns {FSPVector}
 */
function createRandom(geometry = 500, seed = null) {
  const prng = seed !== null ? new PRNG(seed) : Math;
  const exponents = new Set();
  
  // Generate unique random exponents
  while (exponents.size < geometry) {
    // Use BigInt for 64-bit range
    const exp = randomBigInt(prng);
    exponents.add(exp);
  }
  
  return new FSPVector(exponents, geometry);
}

/**
 * Generate a random 64-bit integer
 * @param {Object} prng - PRNG object or Math
 * @returns {bigint}
 */
function randomBigInt(prng) {
  // Generate two 32-bit random numbers
  const high = prng.random() * 0xFFFFFFFF >>> 0;
  const low = prng.random() * 0xFFFFFFFF >>> 0;
  
  // Combine into 64-bit BigInt
  return (BigInt(high) << 32n) | BigInt(low);
}
```

#### 3.3 Create from Name (Deterministic)

```javascript
/**
 * Create deterministic FSP vector from name
 * @param {string} name - Identifier
 * @param {number} geometry - Number of exponents
 * @returns {FSPVector}
 */
function createFromName(name, geometry = 500) {
  // Use DJB2 hash as seed for determinism
  const seed = djb2(name);
  const prng = new PRNG(seed);
  
  return createRandom(geometry, prng);
}

/**
 * DJB2 hash function
 * @param {string} str
 * @returns {number}
 */
function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}
```

### 4. Serialization

```javascript
/**
 * Serialize FSP vector
 * @param {FSPVector} vector
 * @returns {Object}
 */
function serialize(vector) {
  return {
    strategyId: 'fractal-semantic',
    geometry: vector.maxSize,
    version: 1,
    data: {
      exponents: Array.from(vector.exponents).map(exp => exp.toString()),
      maxSize: vector.maxSize
    }
  };
}

/**
 * Deserialize FSP vector
 * @param {Object} serialized
 * @returns {FSPVector}
 */
function deserialize(serialized) {
  if (serialized.strategyId !== 'fractal-semantic') {
    throw new Error(`Cannot deserialize ${serialized.strategyId} with FSP strategy`);
  }
  
  const exponents = new Set(
    serialized.data.exponents.map(exp => BigInt(exp))
  );
  
  return new FSPVector(exponents, serialized.data.maxSize);
}
```

### 5. Utility Functions

```javascript
/**
 * Clone an FSP vector
 * @param {FSPVector} vector
 * @returns {FSPVector}
 */
function clone(vector) {
  return vector.clone();
}

/**
 * Check vector equality
 * @param {FSPVector} a
 * @param {FSPVector} b
 * @returns {boolean}
 */
function equals(a, b) {
  if (a.maxSize !== b.maxSize) return false;
  if (a.size() !== b.size()) return false;
  
  // Check if sets are equal
  for (const exp of a.exponents) {
    if (!b.exponents.has(exp)) return false;
  }
  
  return true;
}

/**
 * Find top-K most similar vectors
 * @param {FSPVector} query
 * @param {Map<string, FSPVector>|Object} vocabulary
 * @param {number} k
 * @returns {Array<{name: string, similarity: number}>}
 */
function topKSimilar(query, vocabulary, k = 5) {
  const results = [];
  
  const entries = vocabulary instanceof Map
    ? vocabulary.entries()
    : Object.entries(vocabulary);
  
  for (const [name, vec] of entries) {
    const sim = similarity(query, vec);
    results.push({ name, similarity: sim });
  }
  
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, k);
}

/**
 * Calculate distance (1 - similarity)
 * @param {FSPVector} a
 * @param {FSPVector} b
 * @returns {number}
 */
function distance(a, b) {
  return 1 - similarity(a, b);
}

/**
 * Check if vectors are approximately orthogonal
 * @param {FSPVector} a
 * @param {FSPVector} b
 * @param {number} threshold
 * @returns {boolean}
 */
function isOrthogonal(a, b, threshold = 0.55) {
  const sim = similarity(a, b);
  return sim < threshold && sim > (1 - threshold);
}
```

### 6. Knowledge Base Serialization

```javascript
/**
 * Serialize a knowledge base
 * @param {Array<{vector: FSPVector, name?: string, metadata?: Object}>} facts
 * @returns {Object}
 */
function serializeKB(facts) {
  if (!facts || facts.length === 0) {
    return {
      strategyId: 'fractal-semantic',
      version: 1,
      geometry: 0,
      count: 0,
      facts: []
    };
  }
  
  const geometry = facts[0].vector.maxSize;
  
  return {
    strategyId: 'fractal-semantic',
    version: 1,
    geometry,
    count: facts.length,
    facts: facts.map(f => ({
      data: Array.from(f.vector.exponents).map(exp => exp.toString()),
      maxSize: f.vector.maxSize,
      name: f.name || null,
      metadata: f.metadata || null
    }))
  };
}

/**
 * Deserialize a knowledge base
 * @param {Object} serialized
 * @returns {Array<{vector: FSPVector, name?: string, metadata?: Object}>}
 */
function deserializeKB(serialized) {
  if (!serialized || !serialized.facts || serialized.count === 0) {
    return [];
  }
  
  return serialized.facts.map(f => ({
    vector: new FSPVector(
      new Set(f.data.map(exp => BigInt(exp))),
      f.maxSize
    ),
    name: f.name,
    metadata: f.metadata
  }));
}
```

### 7. Strategy Export

```javascript
/**
 * Fractal Semantic Polynomials Strategy
 * Implements the HDCStrategy contract
 */
export const fractalSemanticStrategy = {
  id: 'fractal-semantic',
  properties: {
    id: 'fractal-semantic',
    displayName: 'Fractal Semantic Polynomials',
    recommendedBundleCapacity: 500,
    maxBundleCapacity: 1000,
    bytesPerVector: (geometry) => 8 * geometry,  // 8 bytes per uint64
    bindComplexity: 'O(k² log k)',
    sparseOptimized: true,
    description: 'FSP: Infinite-dimensional HDC with Min-Hash sampling'
  },
  
  // Factory
  createZero,
  createRandom,
  createFromName,
  deserialize,
  
  // Core operations
  bind,
  bindAll: (...vectors) => {
    if (vectors.length === 0) throw new Error('bindAll requires at least one vector');
    if (vectors.length === 1) return clone(vectors[0]);
    let result = clone(vectors[0]);
    for (let i = 1; i < vectors.length; i++) {
      result = bind(result, vectors[i]);
    }
    return result;
  },
  bundle,
  similarity,
  unbind: (composite, component) => bind(composite, component), // XOR is self-inverse
  
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
};

export default fractalSemanticStrategy;
```

## Integration Plan

### 1. File Structure

```
src/hdc/strategies/
├── dense-binary.mjs          # Existing (default)
├── fractal-semantic.mjs     # New FSP strategy
└── index.mjs                # Updated to register FSP
```

### 2. Registration

Update `src/hdc/strategies/index.mjs`:

```javascript
import { denseBinaryStrategy } from './dense-binary.mjs';
import { fractalSemanticStrategy } from './fractal-semantic.mjs';

// Register strategies
strategies.set('dense-binary', denseBinaryStrategy);
strategies.set('fractal-semantic', fractalSemanticStrategy);
```

### 3. Testing

Create comprehensive tests in `tests/unit/hdc/fractal-semantic.test.mjs`:

- ✅ Vector creation and properties
- ✅ Binding self-inverse property
- ✅ Binding associative property
- ✅ Similarity calculations
- ✅ Bundle operations
- ✅ Serialization/deserialization
- ✅ Min-Hash sampling correctness
- ✅ Contract compliance

### 4. Performance Comparison

Create performance benchmarks in `performance/` directory:

- Binding performance vs dense binary
- Similarity calculation speed
- Memory usage comparison
- Scalability tests with large knowledge bases

## Expected Challenges

### 1. Performance Optimization

- **Binding**: $O(k^2 \log k)$ complexity may be slower than dense binary for small vectors
- **Solution**: Optimize Min-Heap implementation, consider parallel processing

### 2. Memory Usage

- **BigInt Storage**: JavaScript BigInt serialization may be verbose
- **Solution**: Use efficient binary encoding for storage

### 3. Hash Function Quality

- **Collision Resistance**: Need good hash distribution for Min-Hash sampling
- **Solution**: Use well-tested hash functions (SplitMix64, MurmurHash)

## Success Criteria

### Technical
- ✅ FSP strategy passes all HDC contract tests
- ✅ Binding is self-inverse and associative
- ✅ Similarity calculations are accurate
- ✅ Performance is acceptable for target use cases

### Integration
- ✅ Works with existing reasoning engine
- ✅ Compatible with query engine
- ✅ Knowledge base operations function correctly
- ✅ Serialization/deserialization works reliably

### Quality
- ✅ Comprehensive test coverage
- ✅ Good documentation
- ✅ Clean code with consistent style
- ✅ No breaking changes to existing functionality

## Conclusion

The FSP strategy design provides a robust, scalable alternative to dense binary HDC. By implementing **Integer-XOR binding** with **Min-Hash sampling**, it achieves infinite scalability while maintaining the essential properties of HDC. The design is compatible with AGISystem2's architecture and can be implemented as a parallel strategy without disrupting existing functionality.
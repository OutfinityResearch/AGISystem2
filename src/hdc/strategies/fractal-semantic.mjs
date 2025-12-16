/**
 * AGISystem2 - Fractal Semantic Polynomials (FSP) HDC Strategy
 * @module hdc/strategies/fractal-semantic
 *
 * Infinite-dimensional HDC using Integer-XOR binding with Min-Hash sampling.
 * This strategy provides scalable, sparse hyperdimensional computing.
 */

import { PRNG } from '../../util/prng.mjs';
import { djb2 } from '../../util/hash.mjs';

// ============================================================================
// FSP VECTOR CLASS
// ============================================================================

/**
 * Fractal Semantic Polynomial Vector
 * Represents a sparse set of 64-bit integer exponents
 */
class FSPVector {
  /**
   * @param {Set<bigint>} exponents - Set of 64-bit integers
   * @param {number} maxSize - Maximum number of exponents
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
   * @returns {FSPVector}
   */
  add(exponent) {
    this.exponents.add(exponent);
    return this;
  }
  
  /**
   * Remove an exponent from the vector
   * @param {bigint} exponent
   * @returns {FSPVector}
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

// ============================================================================
// MIN-HEAP IMPLEMENTATION (for efficient Min-Hash sampling)
// ============================================================================

/**
 * Min-Heap for efficient top-k selection during sparsification
 */
class MinHeap {
  constructor(maxSize) {
    this.heap = [];
    this.maxSize = maxSize;
  }
  
  /**
   * Push item into heap, maintaining heap property
   * @param {{exponent: bigint, hash: number}} item
   */
  push(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    } else if (item.hash < this.heap[0].hash) {
      this.heap[0] = item;
      this.sinkDown(0);
    }
  }
  
  /**
   * Pop smallest item from heap
   * @returns {{exponent: bigint, hash: number}}
   */
  pop() {
    const result = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.sinkDown(0);
    }
    return result;
  }
  
  /**
   * Check if heap is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }
  
  /**
   * Bubble up operation for heap maintenance
   * @param {number} index
   */
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
  
  /**
   * Sink down operation for heap maintenance
   * @param {number} index
   */
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

// ============================================================================
// HASH FUNCTION (for Min-Hash sampling)
// ============================================================================

/**
 * SplitMix64 hash function for exponents
 * Provides good distribution for Min-Hash sampling
 * @param {bigint} exponent
 * @returns {number}
 */
function hashExponent(exponent) {
  // Convert bigint to number safely
  const num = Number(exponent.toString());
  
  // SplitMix64 hash algorithm
  let z = num + 0x9e3779b97f4a7c15;
  z = (z ^ (z >>> 30)) * 0xbf58476d1ce4e5b9;
  z = (z ^ (z >>> 27)) * 0x94d049bb133111eb;
  return z ^ (z >>> 31);
}

// ============================================================================
// SPARSIFICATION (Min-Hash Sampling)
// ============================================================================

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
  
  // Use Min-Heap for efficient top-k selection
  const heap = new MinHeap(maxSize);
  
  for (const exp of exponents) {
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

// ============================================================================
// CORE OPERATIONS
// ============================================================================

// Maximum operations per bind to prevent infinite loops
const MAX_BIND_OPERATIONS = 50000;

/**
 * Check if a vector is an FSP vector
 * @param {*} v - Value to check
 * @returns {boolean}
 */
function isFSPVector(v) {
  return v && v.exponents instanceof Set && typeof v.maxSize === 'number';
}

/**
 * Bind two FSP vectors using Integer XOR
 * C = A ⊗ B = { a ⊕ b | a ∈ A, b ∈ B }
 * @param {FSPVector} a
 * @param {FSPVector} b
 * @returns {FSPVector}
 */
function bind(a, b) {
  // Type guard: ensure both vectors are FSP vectors
  if (!isFSPVector(a) || !isFSPVector(b)) {
    throw new Error(`FSP bind requires FSPVector inputs. Got: a=${a?.strategyId || typeof a}, b=${b?.strategyId || typeof b}`);
  }

  // Cartesian product: a.exponents × b.exponents
  // With early termination to prevent infinite loops
  const rawResults = new Set();
  let opCount = 0;
  const maxOps = MAX_BIND_OPERATIONS;

  outer:
  for (const expA of a.exponents) {
    for (const expB of b.exponents) {
      rawResults.add(expA ^ expB); // Integer XOR (self-inverse)
      opCount++;
      if (opCount >= maxOps) {
        break outer; // Early termination
      }
    }
  }

  // Apply property-preserving sparsification to reduce to maxSize
  return sparsifyPropertyPreserving(rawResults, a.maxSize);
}

/**
 * Property-preserving sparsification for FSP
 * Uses a deterministic approach that better preserves mathematical properties
 */
function sparsifyPropertyPreserving(exponents, maxSize) {
  if (exponents.size <= maxSize) {
    return new FSPVector(exponents, maxSize);
  }
  
  // For FSP, we need a different approach that preserves mathematical properties
  // Instead of pure Min-Hash, we use a deterministic selection that maintains structure
  
  const expArray = Array.from(exponents);
  
  // Sort exponents deterministically (this helps with reproducibility)
  expArray.sort((a, b) => {
    // Use a deterministic comparison that considers both value and hash
    const hashA = hashExponent(a);
    const hashB = hashExponent(b);
    
    // First by hash (for Min-Hash-like properties), then by value
    if (hashA !== hashB) return hashA - hashB;
    return a < b ? -1 : 1;
  });
  
  // Take the first maxSize elements
  const selected = expArray.slice(0, maxSize);
  return new FSPVector(new Set(selected), maxSize);
}

/**
 * Calculate Jaccard similarity between two FSP vectors
 * sim(A, B) = |A ∩ B| / |A ∪ B|
 * @param {FSPVector} a
 * @param {FSPVector} b
 * @returns {number} Similarity in range [0, 1]
 */
function similarity(a, b) {
  // Convert to sorted arrays for efficient intersection
  const aArray = a.toArray();
  const bArray = b.toArray();
  
  // Calculate intersection size using two-pointer technique
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
  
  // Jaccard index (handle empty vectors)
  return unionSize === 0 ? 1.0 : intersection / unionSize;
}

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

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an empty FSP vector
 * @param {number} geometry - Max size (number of exponents)
 * @returns {FSPVector}
 */
function createZero(geometry = 500) {
  return new FSPVector(new Set(), geometry);
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
    const exp = randomBigInt(prng);
    exponents.add(exp);
  }
  
  return new FSPVector(exponents, geometry);
}

/**
 * Create deterministic FSP vector from name
 * @param {string} name - Identifier
 * @param {number} geometry - Number of exponents
 * @returns {FSPVector}
 */
function createFromName(name, geometry = 500) {
  // Use DJB2 hash as seed for determinism
  const seed = djb2(name);
  
  return createRandom(geometry, seed);
}

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

// ============================================================================
// KNOWLEDGE BASE SERIALIZATION
// ============================================================================

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

// ============================================================================
// STRATEGY EXPORT
// ============================================================================

/**
 * Fractal Semantic Polynomials Strategy
 * Implements the HDCStrategy contract
 */
export const fractalSemanticStrategy = {
  id: 'fractal-semantic',
  properties: {
    id: 'fractal-semantic',
    displayName: 'Fractal Semantic Polynomials',
    recommendedBundleCapacity: 64,   // Reduced for performance (was 500)
    maxBundleCapacity: 256,          // Reduced for performance (was 1000)
    defaultGeometry: 64,             // Default k for FSP vectors
    bytesPerVector: (geometry) => 8 * geometry,  // 8 bytes per uint64
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
  
  // Utility functions
  clone,
  equals,
  serialize,
  topKSimilar,
  distance,
  isOrthogonal,
  
  // Knowledge base serialization
  serializeKB,
  deserializeKB,
  
  // Internal class (for advanced use)
  Vector: FSPVector
};

export default fractalSemanticStrategy;
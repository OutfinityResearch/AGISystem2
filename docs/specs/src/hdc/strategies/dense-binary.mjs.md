# src/hdc/strategies/dense-binary.mjs

## Purpose

Reference HDC implementation using dense binary vectors stored in Uint32Array. Default strategy implementing classic hyperdimensional computing approach.

## Exports

| Export | Description |
|--------|-------------|
| `denseBinaryStrategy` | Complete strategy object |
| `default` | Same as `denseBinaryStrategy` |

## Strategy Properties

```javascript
{
  id: 'dense-binary',
  displayName: 'Dense Binary (Reference)',
  recommendedBundleCapacity: 7,    // Optimal vectors to bundle
  maxBundleCapacity: 200,          // Before accuracy drops
  bytesPerVector: (geo) => Math.ceil(geo / 8),
  bindComplexity: 'O(n/32)',       // Per-word XOR
  sparseOptimized: false,
  description: 'Classic HDC with dense binary vectors and XOR binding'
}
```

## Internal Vector Class

```javascript
class DenseBinaryVector {
  constructor(geometry, data = null)

  // Properties
  geometry: number      // Number of bits
  words: number         // Number of Uint32 words
  data: Uint32Array     // Bit storage
  strategyId: 'dense-binary'

  // Bit manipulation
  getBit(index) → 0|1
  setBit(index, value) → this
  popcount() → number
  density() → number    // popcount / geometry

  // In-place operations
  xorInPlace(other) → this
  andInPlace(other) → this
  orInPlace(other) → this
  notInPlace() → this
  zero() → this
  ones() → this

  // Instance methods
  clone() → DenseBinaryVector
  extend(newGeometry) → DenseBinaryVector
  equals(other) → boolean
  serialize() → Object

  // Static methods
  static random(geometry, randomFn?) → DenseBinaryVector
  static zeros(geometry) → DenseBinaryVector
  static ones(geometry) → DenseBinaryVector
  static deserialize(obj) → DenseBinaryVector
}
```

## Factory Functions

```javascript
createZero(geometry: number) → DenseBinaryVector
createRandom(geometry: number, seed?: number) → DenseBinaryVector
createFromName(name: string, geometry: number) → DenseBinaryVector
deserialize(serialized: Object) → DenseBinaryVector
```

## Core Operations

### bind(a, b)

Bitwise XOR of two vectors.

```
Properties:
- Commutative: bind(a, b) = bind(b, a)
- Associative: bind(bind(a,b), c) = bind(a, bind(b,c))
- Self-inverse: bind(a, a) = zero vector
- Dissimilar: similarity(bind(a,b), a) ≈ 0.5

Algorithm:
FOR i = 0 TO words-1:
  result.data[i] = a.data[i] XOR b.data[i]
```

### bundle(vectors, tieBreaker?)

Majority vote per bit position.

```
Algorithm:
FOR each bit position i:
  count = SUM(v.getBit(i) for v in vectors)
  IF count > vectors.length / 2:
    result.setBit(i, 1)
  ELSE IF count == vectors.length / 2 AND tieBreaker:
    result.setBit(i, tieBreaker.getBit(i))
  ELSE:
    result.setBit(i, 0)
```

### similarity(a, b)

Hamming-based similarity normalized to [0, 1].

```
Algorithm:
differentBits = 0
FOR i = 0 TO words-1:
  xor = a.data[i] XOR b.data[i]
  differentBits += popcount(xor)
RETURN 1 - (differentBits / geometry)
```

## Dependencies

- `../../util/prng.mjs` - Seeded PRNG
- `../../util/hash.mjs` - djb2 hash function

## Serialization Format

```javascript
{
  strategyId: 'dense-binary',
  geometry: 32768,
  version: 1,
  data: [/* Uint32 values as array */]
}
```

## KB Serialization

### serializeKB(facts)

Serialize a knowledge base for persistence.

```javascript
const serialized = serializeKB([
  { vector: v1, name: 'fact1', metadata: { operator: 'isA' } },
  { vector: v2, name: 'fact2', metadata: { operator: 'has' } }
]);

// Result:
// {
//   strategyId: 'dense-binary',
//   version: 1,
//   geometry: 32768,
//   count: 2,
//   facts: [{ data: [...], name: 'fact1', metadata: {...} }, ...]
// }
```

### deserializeKB(serialized)

Deserialize a knowledge base from storage.

```javascript
const facts = deserializeKB(serialized);
// Returns: Array<{vector, name, metadata}>
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| bind | O(n/32) | One XOR per word |
| similarity | O(n/32) | XOR + popcount per word |
| bundle | O(k*n) | k = number of vectors |
| createFromName | O(n) | Hash + PRNG fill |
| serializeKB | O(k*n) | k = number of facts |
| deserializeKB | O(k*n) | k = number of facts |

## Test Cases

1. Geometry must be divisible by 32
2. bind(a, a) produces zero vector
3. bind(bind(a, b), b) recovers a
4. similarity(v, v) = 1.0
5. similarity(random, random) ≈ 0.5
6. createFromName is deterministic
7. Serialization round-trip preserves data
8. Bundle with tieBreaker resolves ties

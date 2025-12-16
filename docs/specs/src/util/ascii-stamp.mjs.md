# Module: src/util/ascii-stamp.mjs

**Purpose:** Generate deterministic hypervectors from ASCII string identifiers.

## Exports

```javascript
export function asciiStamp(identifier: string, geometry: number): Vector;
export function asciiStampBatch(baseId: string, count: number, geometry: number): Vector[];
```

## Algorithm

```
asciiStamp(identifier, geometry):
  seed = djb2(identifier)
  prng = new PRNG(seed)
  vector = new Vector(geometry)
  for i in 0..vector.words:
    vector.data[i] = prng.randomUint32()
  return vector
```

## Dependencies

- `../core/vector.mjs`
- `./prng.mjs`
- `./hash.mjs`

## Test Cases

- Same identifier produces same vector
- Different identifiers produce quasi-orthogonal vectors
- Vectors have ~50% density

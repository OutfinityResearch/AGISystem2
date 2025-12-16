# Module: src/runtime/vocabulary.mjs

**Purpose:** Mapping between atom names and their hypervectors.

## Exports

```javascript
export class Vocabulary {
  constructor(geometry: number)
  getOrCreate(name: string): Vector    // Get or create atom vector
  get(name: string): Vector | undefined
  has(name: string): boolean
  reverseLookup(vec: Vector): string | null
  names(): string[]
  entries(): Iterator
  size: number
  serialize(): object
  static deserialize(data: object): Vocabulary
}
```

## Algorithm

```
getOrCreate(name):
  if atoms.has(name):
    return atoms.get(name)
  vec = asciiStamp(name, geometry)
  atoms.set(name, vec)
  reverse.set(hash(vec), name)
  return vec
```

## Dependencies

- `../core/vector.mjs`
- `../util/ascii-stamp.mjs`

## Test Cases

- Same name returns same vector
- Reverse lookup works for known vectors
- Serialization round-trips correctly

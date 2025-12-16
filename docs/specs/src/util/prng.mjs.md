# Module: src/util/prng.mjs

**Purpose:** Seeded pseudo-random number generator (xorshift128+) for deterministic vector generation.

## Exports

```javascript
export class PRNG {
  constructor(seed?: number)
  random(): number              // Returns 0-1
  randomInt(min, max): number   // Returns integer in [min, max]
  randomUint32(): number        // Returns 32-bit unsigned int
  static fromString(str): PRNG  // Create from string seed
}
```

## Algorithm

```
xorshift128+:
  s1 = state[0]
  s0 = state[1]
  state[0] = s0
  s1 ^= s1 << 23
  s1 ^= s1 >> 17
  s1 ^= s0
  s1 ^= s0 >> 26
  state[1] = s1
  return (s0 + s1) as normalized float
```

## Dependencies

None.

## Test Cases

- Same seed produces same sequence
- Different seeds produce different sequences
- Distribution is approximately uniform

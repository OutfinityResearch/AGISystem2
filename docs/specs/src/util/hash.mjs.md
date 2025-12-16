# Module: src/util/hash.mjs

**Purpose:** Hash functions for string-to-integer conversion.

## Exports

```javascript
export function djb2(str: string): number;
export function fnv1a(str: string): number;
export function stringHash(str: string): number;
```

## Algorithm

```
djb2(str):
  hash = 5381
  for each char in str:
    hash = ((hash << 5) + hash) + charCode
  return hash as uint32

fnv1a(str):
  hash = 2166136261
  for each char in str:
    hash ^= charCode
    hash *= 16777619
  return hash as uint32

stringHash(str):
  return djb2(str) ^ fnv1a(str)
```

## Dependencies

None.

## Test Cases

- Same string produces same hash
- Different strings produce different hashes (usually)
- Hash values are 32-bit unsigned integers

# Module Plan: src/core/operations.mjs

**Document Version:** 2.0
**Status:** Specification (Re-export Module)
**Traces To:** FS-01, FS-02, FS-03, FS-91, NFS-06, NFS-07, NFS-08

---

## 1. Purpose

**BACKWARD COMPATIBILITY MODULE**

Re-exports HDC operations from `src/hdc/facade.mjs`. This module exists to maintain backward compatibility with code that imports directly from `src/core/operations.mjs`.

New code should import from `src/hdc/facade.mjs` instead.

---

## 2. Current Implementation

```javascript
// src/core/operations.mjs
export {
  bind,
  bindAll,
  bundle,
  similarity,
  unbind,
  clone,
  equals,
  serialize,
  deserialize,
  topKSimilar,
  distance,
  isOrthogonal,
  createZero,
  createRandom,
  createFromName
} from '../hdc/facade.mjs';
```

---

## 3. Responsibilities (Delegated)

All responsibilities are handled by `src/hdc/facade.mjs` and the active HDC strategy:

- Implement Bind operation (bitwise XOR)
- Implement Bundle operation (bitwise majority)
- Implement Similarity calculation (normalized Hamming distance)
- Provide batch operations for efficiency
- Support strategy-based implementation selection

---

## 4. Available Operations

For complete API documentation, see `src/hdc/facade.mjs.md`.

### Core Operations

| Function | Description |
|----------|-------------|
| `bind(a, b)` | XOR-based association |
| `bindAll(...vectors)` | Sequential bind |
| `bundle(vectors, tieBreaker?)` | Majority vote superposition |
| `similarity(a, b)` | Hamming-based similarity [0,1] |
| `unbind(composite, component)` | Inverse of bind |

### Utility Operations

| Function | Description |
|----------|-------------|
| `clone(v)` | Deep copy |
| `equals(a, b)` | Exact equality |
| `topKSimilar(query, vocab, k)` | Find K most similar |
| `distance(a, b)` | 1 - similarity |
| `isOrthogonal(a, b, threshold?)` | Check quasi-orthogonality |

---

## 5. Dependencies

- `../hdc/facade.mjs` - HDC facade (re-export source)

---

## 6. Migration Guide

**Old import (still works):**
```javascript
import { bind, bundle, similarity } from './src/core/operations.mjs';
```

**New import (recommended):**
```javascript
import { bind, bundle, similarity } from './src/hdc/facade.mjs';
```

---

*End of Module Plan*

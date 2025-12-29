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
import {
  bind,
  bindAll,
  bundle,
  similarity,
  distance,
  topKSimilar,
  isOrthogonal,
  unbind,
  getDefaultGeometry,
  setDefaultGeometry
} from '../hdc/facade.mjs';

export {
  bind,
  bindAll,
  bundle,
  similarity,
  distance,
  topKSimilar,
  isOrthogonal,
  unbind,
  getDefaultGeometry,
  setDefaultGeometry
};
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
| `bind(a, b)` | Strategy-defined association (XOR for dense-binary/metric-affine; other strategies differ) |
| `bindAll(...vectors)` | Sequential bind |
| `bundle(vectors, tieBreaker?)` | Strategy-defined superposition |
| `similarity(a, b)` | Strategy-defined similarity in [0,1] |
| `unbind(composite, component)` | Strategy-defined inverse/quotient |

### Utility Operations

| Function | Description |
|----------|-------------|
| `topKSimilar(query, vocab, k)` | Find K most similar |
| `distance(a, b)` | 1 - similarity |
| `isOrthogonal(a, b, threshold?)` | Check quasi-orthogonality |

### Geometry Helpers

| Function | Description |
|----------|-------------|
| `getDefaultGeometry()` | Returns the process-default geometry used by the facade |
| `setDefaultGeometry(g)` | Sets the process-default geometry used by the facade |

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

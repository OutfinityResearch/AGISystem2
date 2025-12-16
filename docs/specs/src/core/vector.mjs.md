# Module Plan: src/core/vector.mjs

**Document Version:** 2.0
**Status:** Specification (Re-export Module)
**Traces To:** FS-01, FS-04, FS-91, NFS-30, NFS-34

---

## 1. Purpose

**BACKWARD COMPATIBILITY MODULE**

Re-exports the Vector class from `src/hdc/facade.mjs`. This module exists to maintain backward compatibility with code that imports directly from `src/core/vector.mjs`.

New code should import from `src/hdc/facade.mjs` instead.

---

## 2. Current Implementation

```javascript
// src/core/vector.mjs
import { Vector as HDCVector } from '../hdc/facade.mjs';
export const Vector = HDCVector;
export default Vector;
```

---

## 3. Responsibilities (Delegated)

All responsibilities are handled by `src/hdc/strategies/dense-binary.mjs`:

- Store binary vectors efficiently using Uint32Array
- Provide bit-level read/write access
- Support multiple geometries (1024, 8192, 32768, 65536)
- Enable vector cloning and extension
- Implement serialization/deserialization

---

## 4. Actual Implementation

See `src/hdc/strategies/dense-binary.mjs` for the actual Vector implementation (`DenseBinaryVector` class).

Key differences from the original design:
- Uses **Uint32Array** instead of BigInt[] for better performance
- 32-bit words instead of 64-bit
- Part of the pluggable HDC strategy system

---

## 5. Dependencies

- `../hdc/facade.mjs` - HDC facade (re-export source)

---

## 6. Migration Guide

**Old import (still works):**
```javascript
import { Vector } from './src/core/vector.mjs';
```

**New import (recommended):**
```javascript
import { Vector } from './src/hdc/facade.mjs';
// Or use factory functions:
import { createFromName, createRandom, createZero } from './src/hdc/facade.mjs';
```

---

*End of Module Plan*

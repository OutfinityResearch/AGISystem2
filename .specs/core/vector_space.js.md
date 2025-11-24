# Design Spec: src/core/vector_space.js

Class `VectorSpace`
- **Role**: Allocate and manage raw vector buffers for the conceptual space (>=512 dims), providing low-level clamped arithmetic and loop-unrolling helpers. No semantics beyond math; used by encoder, math engine, temporal memory.
- **Pattern**: Utility class with instance methods; avoids global state. SOLID: single responsibility for buffer ops.
- **Key Collaborators**: `Config` (dimensions, block size, dtype), `MathEngine` (uses helpers), `BoundedDiamond` (allocations), `TemporalMemory`.

## Public API
- `constructor(config)`: store dimensions, block sizes, dtype factory.
- `allocVector()`: returns zeroed Int8Array of size `dimensions`.
- `allocMask()`: returns Uint8Array of length `ceil(dimensions/8)`.
- `clampAdd(dst, srcA, srcB)`: element-wise add with clamping to [-127,127]; writes to `dst`.
- `copy(dst, src)`: fast copy with unrolled loops.
- `blockReduce(vec, fn)`: helper to apply reducer in unrolled blocks (used by distance).

## Pseudocode (comments)
```js
class VectorSpace {
  constructor(config) {
    // this.dim = config.get('dimensions');
    // this.block = config.get('blockSize') || 8;
    // this.VecCtor = Int8Array;
  }

  allocVector() { /* return new this.VecCtor(this.dim); */ }

  allocMask() { /* return new Uint8Array(Math.ceil(this.dim / 8)); */ }

  clampAdd(dst, a, b) {
    // for i in 0..dim step block:
    //   tmp = a[i] + b[i]; if tmp > 127 -> 127; if tmp < -127 -> -127; dst[i]=tmp;
  }

  copy(dst, src) { /* unrolled copy */ }

  blockReduce(vec, reducerFn, init) {
    // apply reducerFn over vec using block stride for JIT-friendly loops
  }
}
```

## Notes/Constraints
- Must not own semantics; purely numeric. Keep YAGNI—no metadata.
- Respect configuration for dimensions and block size; no hard-coded 4096.***

# Design Spec: src/core/math_engine.js

Module `MathEngine`
- **Role**: Stateless vector operations underpinning geometric reasoning: masked distances, saturated add, permutations, rotations. Encapsulates numeric kernels for use across engine components.
- **Pattern**: Pure functions; no state. SOLID: single responsibility for math ops.
- **Key Collaborators**: `VectorSpace` (buffers), `RelationPermuter` (tables), `TemporalMemory` (rotations), `BoundedDiamond`, `Reasoner`, `Encoder`.

## Public Functions (essential)
- `distanceMaskedL1(point, concept, mask?)`: fail-fast box check then L1 with mask.
- `addSaturated(dst, a, b)`: clamped add [-127,127].
- `permute(dst, src, table)`: apply permutation.
- `inversePermute(dst, src, inverseTable)`: reverse permutation.
- `rotate(dst, src, rotationTable)`: time/phase rotation (alias of permute).
- `bitmaskAnd(dstMask, maskA, maskB)`: helper for mask intersection.

## Pseudocode (comments)
```js
function distanceMaskedL1(point, concept, mask=concept.relevanceMask) {
  // for i in 0..dim:
  //   if mask bit off -> continue
  //   if point[i] < min[i] || point[i] > max[i] -> return Infinity
  //   accumulate += abs(point[i] - concept.center[i])
  // return accumulate
}

function addSaturated(dst, a, b) {
  // for i: tmp=a[i]+b[i]; clamp to [-127,127]; dst[i]=tmp;
}

function permute(dst, src, table) { /* dst[i] = src[table[i]]; */ }
function inversePermute(dst, src, inverseTable) { /* dst[inverseTable[i]]=src[i]; */ }
function rotate(dst, src, rotationTable) { /* same as permute; used for time ticks */ }
function bitmaskAnd(dst, a, b) { /* bitwise AND byte arrays */ }
```

## Notes/Constraints
- Must respect configured dimensions; no hard-coded 4096.
- Remain pure; no logging or IO.
- Optimized loops (block/unrolled) delegated to `VectorSpace` helpers where appropriate.***

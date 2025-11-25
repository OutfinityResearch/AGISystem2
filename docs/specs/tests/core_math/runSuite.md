# Suite: core_math

ID: DS(/tests/core_math/runSuite)

Scope: `MathEngine`, `VectorSpace`.

Fixtures: none (inline vectors).

Profile: `auto_test`.

Assertions:
- Clamped add: overflow/underflow saturate at [-127,127].
- Masked L1 distance: skip masked dims; returns finite only if inside box; Infinity on box violation.
- Permute/inverse: permute then inverse returns original vector (exact match).

Sample:
- vecA=[120,120], vecB=[20,20] → clampAdd → [127,127].
- Permute vec=[1,2,3], inversePermute → [1,2,3].***

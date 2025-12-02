# Specification: Base Primitives Theory

ID: DS(/theory/base/primitives.sys2dsl)

Source: `@data/init/theories/base/primitives.sys2dsl`

Status: v3.0

## Purpose

Declares the **hardcoded geometric primitives** - the only relations implemented directly in the geometric engine rather than defined as Sys2DSL verbs. This file serves as documentation and reference, not as executable definitions.

## Design Rationale

### Why Primitives Are Hardcoded

These operations cannot be defined in terms of other operations because they ARE the fundamental geometric operations:

1. **Bootstrap Problem**: You cannot define `READ_DIM` using `READ_DIM`
2. **Performance**: These run millions of times; native code is essential
3. **Atomic Operations**: They map directly to vector/matrix operations
4. **Type Safety**: They enforce constraints the DSL cannot express

### Minimality Principle

The primitive set is deliberately minimal. Any operation that CAN be defined in DSL SHOULD be defined in DSL. This ensures:
- Maximum transparency (definitions are inspectable)
- Maximum flexibility (definitions can be overridden)
- Easier formal verification (fewer trusted components)

## Primitive Categories

### Category 1: Value Operations

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive       │  Signature              │  Geometric Op      │
│  ────────────────│─────────────────────────│──────────────────  │
│  NUMERIC_VALUE   │  label × number → Point │  Create constant   │
│  READ_DIM        │  Point × DimName → num  │  Vector projection │
│  PROJECT_DIM     │  Point × Dim × val → Pt │  Set component     │
│  ZERO_DIMS       │  Point × Dims → Point   │  Zero components   │
└─────────────────────────────────────────────────────────────────┘
```

**NUMERIC_VALUE** creates a point with:
- `kind: "constant"`
- `center[value_dim] = the number`
- `diamond.radii = [0, 0, ...]` (exact value, no uncertainty)

**READ_DIM** extracts a single dimension's value from a point's center vector.

**PROJECT_DIM** sets a dimension value, creating a new point version.

**ZERO_DIMS** sets specified dimensions to zero (used for masking).

### Category 2: Point Operations

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive       │  Signature              │  Geometric Op      │
│  ────────────────│─────────────────────────│──────────────────  │
│  ATTRACT         │  Point × Point → Point  │  Move toward       │
│  EXTEND          │  Point × Point → Point  │  Expand diamond    │
│  NEW_COMPOSITE   │  Point × Point → Point  │  Create composite  │
│  KIND            │  Point × kind → Point   │  Set/read kind     │
└─────────────────────────────────────────────────────────────────┘
```

**ATTRACT** moves subject's center toward object's center:
```
new_center = subject.center + α × (object.center - subject.center)
```
Where α is the learning rate (typically 0.1-0.3).

**EXTEND** expands the diamond boundary to include a new point:
```
new_radii[i] = max(subject.radii[i], |subject.center[i] - object.center[i]|)
```
This is the core learning operation - it NEVER moves the center.

**NEW_COMPOSITE** creates a point representing the combination:
```
composite.center = (subject.center + object.center) / 2
composite.radii = max(subject.radii, object.radii) + distance/2
composite.kind = "composite"
```

**KIND** sets or reads the `kind` field on a point.

### Category 3: Reasoning Primitives

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive       │  Signature              │  Geometric Op      │
│  ────────────────│─────────────────────────│──────────────────  │
│  INDUCT          │  Point × Point → Point  │  Generalization    │
│  DEDUCT          │  Point × Point → Point  │  Specialization    │
│  ABDUCT_PRIM     │  Point × Point → Points │  Reverse inference │
│  ANALOGIZE_PRIM  │  Pair × Point → Point   │  Vector transfer   │
│  PERMUTE         │  Point × Perm → Point   │  Axis permutation  │
└─────────────────────────────────────────────────────────────────┘
```

**INDUCT** (geometric induction):
- Given examples, find the minimal diamond containing all
- Generalization: examples → concept

**DEDUCT** (geometric deduction):
- Project a point onto a parent concept's subspace
- Specialization: concept → instances

**ABDUCT_PRIM** (geometric abduction):
- Given an effect point, find points that could cause it
- Reverse the causal dimension projection

**ANALOGIZE_PRIM** (vector analogy):
- A:B :: C:?
- Compute: D = C + (B - A)
- Transfer the relationship vector to new domain

**PERMUTE** applies axis permutation (for relation inverses, symmetry).

### Category 4: Numeric Operations

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive       │  Signature              │  Geometric Op      │
│  ────────────────│─────────────────────────│──────────────────  │
│  PLUS            │  num × num → num        │  Addition          │
│  MINUS           │  num × num → num        │  Subtraction       │
│  MULTIPLY        │  num × num → num        │  Multiplication    │
│  DIVIDE          │  num × num → num        │  Division          │
│  MIN             │  num × num → num        │  Minimum           │
│  MAX             │  num × num → num        │  Maximum           │
│  EQUALS          │  num × num → bool       │  Equality          │
│  GREATER_THAN    │  num × num → bool       │  Comparison        │
│  LESS_THAN       │  num × num → bool       │  Comparison        │
└─────────────────────────────────────────────────────────────────┘
```

These operate on constant points' values. They're primitives because:
- Numeric computation is fundamental
- They must be exact (no uncertainty)
- Performance-critical for dimension calculations

### Category 5: System Operations

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive       │  Signature              │  Purpose           │
│  ────────────────│─────────────────────────│──────────────────  │
│  CONTROLS        │  value × param → void   │  Set control param │
│  INSPECT         │  Point → PointInfo      │  Return point data │
└─────────────────────────────────────────────────────────────────┘
```

**CONTROLS** sets execution parameters (depth, timeout, etc.).

**INSPECT** returns full point information for debugging/output.

## Implementation Notes

### Engine Integration

Primitives are implemented in `src/core/geometric_primitives.js`:

```javascript
class GeometricPrimitives {
  numericValue(label, value) { /* ... */ }
  readDim(point, dimName) { /* ... */ }
  projectDim(point, dimName, value) { /* ... */ }
  // ... etc
}
```

The DSL engine routes primitive verbs directly to these methods.

### Error Handling

Primitives must handle:
- Dimension not found → return 0
- Division by zero → return NaN (maps to CONFLICT)
- Invalid point → throw with clear message

### Performance Requirements

- READ_DIM: O(1) - direct array access
- PROJECT_DIM: O(1) - single array update
- ATTRACT: O(n) where n = dimensions
- INDUCT: O(n × m) where m = examples

## Future Considerations

### Potential New Primitives

1. **DISTANCE** - L1/L2 distance between points
2. **OVERLAP** - Diamond intersection volume
3. **INTERPOLATE** - Point between two points

### Removal Candidates

If we find a way to define these in DSL:
- MIN/MAX could use LESS_THAN + conditional
- EQUALS could use MINUS + zero check

But performance would suffer, so likely keep as primitives.

## See Also

- [Sys2DSL-grammar.md](../../Sys2DSL-grammar.md) - Lists primitives in grammar
- [conceptual_space.md](../../core/conceptual_space.md) - Geometric model
- [constants.sys2dsl.md](./constants.sys2dsl.md) - Standard constant values

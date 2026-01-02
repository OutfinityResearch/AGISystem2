# Spec: `config/Packs/Numeric/04a-numeric.sys2`

## Purpose

Defines a minimal numeric layer used by other packs (e.g. structural type checks) and by some evaluation suites.

This is not a full arithmetic engine. It provides:

- numeric comparison helpers (`GreaterThan`, `LessThan`, `Equals`, etc.)
- simple arithmetic encodings (`Add`, `Subtract`)
- range/threshold predicates as structured bundles

## Key Constructs

- `NumericType` marker (typed numeric values).
- Comparison graphs:
  - `GreaterThan(a,b)`, `LessThan(a,b)`, `Equals(a,b)`
  - derived: `GreaterThanOrEqual`, `LessThanOrEqual`
- Arithmetic graphs:
  - `Add(a,b)`, `Subtract(a,b)`
- Utility graphs:
  - `InRange(value, min, max)`, `OutOfRange(value, min, max)`

## Runtime Integration

- Some Bootstrap macros (e.g. `IsTypeMacro`) use numeric comparisons to interpret similarity scores.
- Downstream engines treat numeric bundles as ordinary content unless a dedicated numeric backend is selected.

## Design Rationale

Keep numeric operations explicit and inspectable in DSL form, while avoiding “full solver” commitments in baseline packs.


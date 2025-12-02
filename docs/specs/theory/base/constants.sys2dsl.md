# Specification: Base Constants Theory

ID: DS(/theory/base/constants.sys2dsl)

Source: `@data/init/theories/base/constants.sys2dsl`

Status: v3.0

## Purpose

Defines **standard numeric constant points** used throughout the system. These provide:
- Semantic names for dimension values (positive, negative, zero)
- Standardized truth levels
- Control parameter defaults
- Diamond radius presets

## Design Rationale

### Why Constants as Points

In v3.0, constants are NOT special syntax - they are regular points:

```sys2dsl
@positive NUMERIC_VALUE 127
```

This creates a point with:
- `label: "positive"`
- `kind: "constant"`
- `center[value] = 127`
- `diamond.radii = [0, 0, ...]` (exact, no uncertainty)

Benefits:
1. **Uniform Model**: Everything is a point
2. **Inspectable**: Can query constant values like any point
3. **Extensible**: Users can define domain-specific constants
4. **Composable**: Constants work with all verb operations

### The [-127, +127] Range

Dimension values use signed 8-bit range:
- **+127**: Maximum positive (TRUE_CERTAIN, fully exists)
- **0**: Neutral (UNKNOWN, no evidence)
- **-127**: Maximum negative (FALSE_CERTAIN, definitely not)

Why this range:
- Fits in single byte (memory efficient)
- Symmetric around zero
- Sufficient granularity (255 levels)
- Maps naturally to fuzzy truth values

## Constant Categories

### Category 1: Existence Dimension Constants

These map to truth/existence values:

```
┌─────────────────────────────────────────────────────────────────┐
│  Constant        │  Value  │  Semantic Meaning                  │
│  ────────────────│─────────│──────────────────────────────────  │
│  positive        │  +127   │  Maximum positive / TRUE_CERTAIN   │
│  negative        │  -127   │  Maximum negative / FALSE_CERTAIN  │
│  zero            │   0     │  Neutral / UNKNOWN                 │
│  high_positive   │  +100   │  Strong positive                   │
│  low_positive    │  +50    │  Weak positive                     │
│  low_negative    │  -50    │  Weak negative                     │
│  high_negative   │  -100   │  Strong negative                   │
└─────────────────────────────────────────────────────────────────┘
```

### Category 2: Truth Level Constants

Named truth levels for semantic clarity:

```
┌─────────────────────────────────────────────────────────────────┐
│  Constant        │  Value  │  Use Case                          │
│  ────────────────│─────────│──────────────────────────────────  │
│  default_true    │  +80    │  True by default reasoning         │
│  default_false   │  -80    │  False by default reasoning        │
│  plausible       │  +40    │  Likely but uncertain              │
│  implausible     │  -40    │  Unlikely but uncertain            │
└─────────────────────────────────────────────────────────────────┘
```

Usage:
```sys2dsl
@_ Dog HAS fur                      # Implicit: existence = +127
@_ Penguin CAN fly                  # After negation: existence = -127
@_ Bird CAN fly                     # Default true: existence = +80
```

### Category 3: Diamond Radius Constants

For specifying uncertainty boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│  Constant        │  Value  │  Semantic Meaning                  │
│  ────────────────│─────────│──────────────────────────────────  │
│  tight           │   5     │  Very precise concept              │
│  narrow          │  15     │  Well-defined concept              │
│  medium          │  30     │  Moderate uncertainty              │
│  wide            │  60     │  Vague/abstract concept            │
│  maximum         │  127    │  Maximum uncertainty (matches all) │
└─────────────────────────────────────────────────────────────────┘
```

The `any` wildcard concept has `radii = [maximum, maximum, ...]`.

### Category 4: Control Parameter Constants

For reasoning control:

```
┌─────────────────────────────────────────────────────────────────┐
│  Constant           │  Value  │  Purpose                        │
│  ───────────────────│─────────│───────────────────────────────  │
│  depth_shallow      │   3     │  Quick, shallow reasoning       │
│  depth_default      │   5     │  Normal reasoning depth         │
│  depth_deep         │  10     │  Thorough reasoning             │
│  depth_exhaustive   │  20     │  Complete exploration           │
│  limit_low          │  10     │  Minimal backtracking           │
│  limit_default      │  50     │  Normal backtracking            │
│  limit_high         │  200    │  Extensive backtracking         │
│  timeout_fast       │  1000   │  1 second timeout               │
│  timeout_default    │  5000   │  5 second timeout               │
│  timeout_long       │  30000  │  30 second timeout              │
└─────────────────────────────────────────────────────────────────┘
```

Usage:
```sys2dsl
@_ depth_deep CONTROLS reasoning_depth
@_ timeout_long CONTROLS timeout_ms
```

## The `any` Wildcard

The `any` concept is special - it's predefined by the system, not in this file:

```
any = Point {
  label: "any"
  kind: "any"
  center: [0, 0, 0, ...]           # Origin
  diamond.radii: [127, 127, ...]   # Maximum in all dimensions
}
```

Because its diamond spans everything, it matches any point.

**Important**: `any` is a real point, not syntax sugar. This means:
- It can be inspected: `@info any INSPECT any`
- It participates in operations: `@r Dog NEW_COMPOSITE any`
- Its position matters for some operations

## Initialization Order

Constants are loaded in dependency order:

1. **primitives.sys2dsl** - Declares NUMERIC_VALUE
2. **constants.sys2dsl** - Defines standard values (this file)
3. **logic.sys2dsl** - Uses constants for truth operations
4. Other base theories...

## Implementation Notes

### Constant Point Storage

Constants are stored like any other point but with:
- `immutable: true` (cannot be modified)
- `protected: true` (cannot be forgotten)
- `core: true` (essential for system operation)

### Performance Optimization

Frequently used constants (positive, negative, zero) may be cached:

```javascript
// In geometric engine
const POSITIVE = this.getPoint('positive'); // Cached reference
```

### Numeric Precision

Constants use exact integer values. When used in calculations:
- Integer operations stay exact
- Division may produce floats (rounded for storage)
- Comparisons use integer semantics

## Extension Points

### Domain-Specific Constants

Users can define domain constants:

```sys2dsl
# Physics domain
@speed_of_light NUMERIC_VALUE 299792458
@planck_constant NUMERIC_VALUE 6.62607015e-34

# Medical domain
@normal_body_temp NUMERIC_VALUE 37
@fever_threshold NUMERIC_VALUE 38
```

### Custom Truth Levels

Applications may define custom truth semantics:

```sys2dsl
@highly_likely NUMERIC_VALUE 90
@somewhat_likely NUMERIC_VALUE 60
@toss_up NUMERIC_VALUE 50
@somewhat_unlikely NUMERIC_VALUE 40
@highly_unlikely NUMERIC_VALUE 10
```

## Future Considerations

### Floating Point Constants

Currently all constants are integers. If needed:
```sys2dsl
@pi NUMERIC_VALUE 3.14159265359
@e NUMERIC_VALUE 2.71828182846
```

The engine would need to handle float storage.

### Named Dimension Constants

Constants for specific dimensions:
```sys2dsl
@existence_dim NUMERIC_VALUE 0      # Index of existence dimension
@temporal_dim NUMERIC_VALUE 1       # Index of temporal dimension
```

## See Also

- [primitives.sys2dsl.md](./primitives.sys2dsl.md) - NUMERIC_VALUE definition
- [logic.sys2dsl.md](./logic.sys2dsl.md) - Uses truth constants
- [control.sys2dsl.md](./control.sys2dsl.md) - Uses control constants
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Truth as dimension values

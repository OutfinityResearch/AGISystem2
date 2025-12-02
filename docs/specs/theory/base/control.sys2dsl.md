# Specification: Base Control Theory

ID: DS(/theory/base/control.sys2dsl)

Source: `@data/init/theories/base/control.sys2dsl`

Status: v3.0

## Purpose

Defines **execution control parameters** as verbs and control points. These govern reasoning behavior: depth limits, timeouts, inference strategies, and debugging options.

## Design Rationale

### Control as Points in Space

In v3.0, control parameters are NOT configuration files or globals - they're points:

```sys2dsl
@_ depth_deep CONTROLS reasoning_depth
```

This means:
- Control settings are queryable: `@d reasoning_depth INSPECT any`
- Control can be layered (different settings per theory layer)
- Control changes are tracked and versionable
- Settings can be inferred, not just set

### The CONTROLS Primitive

`CONTROLS` is a hardcoded primitive that sets execution parameters:

```
CONTROLS: value_point × parameter_name → void (side effect)
```

It's a primitive because it affects the engine itself.

## Control Categories

### Category 1: Reasoning Depth

#### SET_DEPTH - Set maximum chain length

```sys2dsl
@SET_DEPTH BEGIN
  @return subject CONTROLS reasoning_depth;
END
```

**Parameter**: `reasoning_depth` - max inference steps

**Values**:
```
depth_shallow    = 3   # Quick, surface-level
depth_default    = 5   # Normal reasoning
depth_deep       = 10  # Thorough exploration
depth_exhaustive = 20  # Complete search
```

**Usage**:
```sys2dsl
@_ depth_deep CONTROLS reasoning_depth
@complex_proof Theorem PROVE conclusion
```

#### GET_DEPTH - Query current limit

```sys2dsl
@GET_DEPTH BEGIN
  @return reasoning_depth INSPECT any;
END
```

**Default**: `depth_default` (5)

### Category 2: Backtracking

#### SET_BACKTRACK - Set backtracking limit

```sys2dsl
@SET_BACKTRACK BEGIN
  @return subject CONTROLS backtrack_limit;
END
```

**Parameter**: `backtrack_limit` - max backtrack attempts

**Values**:
```
limit_low     = 10   # Minimal backtracking
limit_default = 50   # Normal backtracking
limit_high    = 200  # Extensive search
```

**Effect**: When inference reaches dead end, how many alternatives to try.

### Category 3: Timeout

#### SET_TIMEOUT - Set time limit (ms)

```sys2dsl
@SET_TIMEOUT BEGIN
  @return subject CONTROLS timeout_ms;
END
```

**Values**:
```
timeout_fast    = 1000   # 1 second
timeout_default = 5000   # 5 seconds
timeout_long    = 30000  # 30 seconds
```

**Usage**:
```sys2dsl
@_ timeout_long CONTROLS timeout_ms
@slow_query Complex PROVE hard_theorem
```

**Timeout Result**:
```json
{
  "truth": "UNKNOWN_TIMEOUT",
  "partial": [...],
  "elapsed_ms": 30000
}
```

### Category 4: Confidence Threshold

#### SET_CONFIDENCE - Minimum acceptance threshold

```sys2dsl
@SET_CONFIDENCE BEGIN
  @return subject CONTROLS confidence_threshold;
END
```

**Effect**: Conclusions below threshold reported as UNKNOWN.

**Values**:
```
+80:  Accept only high confidence
+40:  Accept plausible conclusions
0:    Accept anything non-negative
-40:  Accept even unlikely conclusions
```

**Default**: `plausible` (+40)

### Category 5: Inference Strategy

#### SET_STRATEGY - Choose inference approach

```sys2dsl
@SET_STRATEGY BEGIN
  @return subject CONTROLS inference_strategy;
END
```

**Options**:
```sys2dsl
@exhaustive NUMERIC_VALUE 1    # Try all paths, return all results
@first_match NUMERIC_VALUE 2   # Stop at first valid result
@best_match NUMERIC_VALUE 3    # Try all, return highest confidence
```

**Trade-offs**:
- `exhaustive`: Complete but slow
- `first_match`: Fast but may miss better answers
- `best_match`: Good quality, moderate speed

### Category 6: Reasoning Mode

#### SET_MODE - Logical vs Geometric

```sys2dsl
@SET_MODE BEGIN
  @return subject CONTROLS reasoning_mode;
END
```

**Options**:
```sys2dsl
@logical NUMERIC_VALUE 1     # Use only logical inference
@geometric NUMERIC_VALUE 2   # Use only geometric similarity
@hybrid NUMERIC_VALUE 3      # Combine both (default)
```

**When to use**:
- `logical`: Formal proofs, exact reasoning
- `geometric`: Similarity queries, analogy
- `hybrid`: General-purpose (recommended)

### Category 7: Debug & Trace

#### ENABLE_TRACE / DISABLE_TRACE

```sys2dsl
@ENABLE_TRACE BEGIN
  @return positive CONTROLS trace_enabled;
END

@DISABLE_TRACE BEGIN
  @return zero CONTROLS trace_enabled;
END
```

**Effect**: When enabled, operations log their steps.

#### SET_VERBOSITY

```sys2dsl
@SET_VERBOSITY BEGIN
  @return subject CONTROLS verbosity;
END
```

**Levels**:
```sys2dsl
@quiet NUMERIC_VALUE 0     # No output
@normal NUMERIC_VALUE 1    # Results only
@verbose NUMERIC_VALUE 2   # Steps + results
@debug NUMERIC_VALUE 3     # Everything
```

### Category 8: Resource Limits

#### SET_MAX_FACTS - Limit facts per query

```sys2dsl
@SET_MAX_FACTS BEGIN
  @return subject CONTROLS max_facts;
END
```

**Effect**: Query considers at most N facts.

#### SET_MAX_RESULTS - Limit returned results

```sys2dsl
@SET_MAX_RESULTS BEGIN
  @return subject CONTROLS max_results;
END
```

**Effect**: Return at most N results (pagination).

### Category 9: Dimension Masking

#### MASK_PARTITION - Hide partitions

```sys2dsl
@MASK_PARTITION BEGIN
  @return subject CONTROLS masked_partitions;
END
```

**Usage**:
```sys2dsl
@_ axiology MASK_PARTITION any
# Queries now ignore axiological dimensions (values, ethics)
```

#### MASK_DIMENSION - Hide specific dimensions

```sys2dsl
@MASK_DIMENSION BEGIN
  @return subject CONTROLS masked_dims;
END
```

#### UNMASK_ALL - Remove masks

```sys2dsl
@UNMASK_ALL BEGIN
  @_ zero CONTROLS masked_partitions;
  @return zero CONTROLS masked_dims;
END
```

## Control Point Architecture

### How Control Points Work

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONTROL POINT FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Script                    Engine                          │
│  ───────────                    ──────                          │
│                                                                 │
│  @_ depth_deep CONTROLS ────────► reasoning_depth = 10          │
│     reasoning_depth                                             │
│                                                                 │
│  @r X PROVE Y ──────────────────► check: depth < 10?            │
│                                   if no: return UNKNOWN         │
│                                   if yes: continue              │
│                                                                 │
│  Result ◄───────────────────────  { truth: ..., depth: 7 }      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Control in Theory Layers

Control points can be layer-specific:

```sys2dsl
# Base layer: normal limits
@_ depth_default CONTROLS reasoning_depth

# Hypothetical layer: deeper reasoning
@_ hypothetical PUSH any
@_ depth_exhaustive CONTROLS reasoning_depth
@deep_result Theorem PROVE conclusion
@_ any POP any

# Back to normal limits
```

### Default Initializations

At system start:
```sys2dsl
# Set in control.sys2dsl
@_ depth_default CONTROLS reasoning_depth
@_ limit_default CONTROLS backtrack_limit
@_ timeout_default CONTROLS timeout_ms
@_ plausible CONTROLS confidence_threshold
@_ first_match CONTROLS inference_strategy
@_ hybrid CONTROLS reasoning_mode
@_ normal CONTROLS verbosity
@_ limit_high CONTROLS max_facts
@_ limit_default CONTROLS max_results
```

## Usage Patterns

### Performance Tuning

```sys2dsl
# Fast, shallow queries
@_ depth_shallow CONTROLS reasoning_depth
@_ timeout_fast CONTROLS timeout_ms
@_ first_match CONTROLS inference_strategy
@quick_result X IS_A Y

# Thorough, exhaustive queries
@_ depth_exhaustive CONTROLS reasoning_depth
@_ timeout_long CONTROLS timeout_ms
@_ exhaustive CONTROLS inference_strategy
@complete_result X PROVE Y
```

### Debugging

```sys2dsl
@_ any ENABLE_TRACE any
@_ debug CONTROLS verbosity
@problematic Complex PROVE something
# See detailed trace output
@_ any DISABLE_TRACE any
```

### Bias Control (Masking)

```sys2dsl
# Objective reasoning only
@_ axiology MASK_PARTITION any
@objective_result Person QUALIFIES_FOR job
@_ any UNMASK_ALL any
```

## Implementation Notes

### Control Point Storage

Control points stored in special namespace:
```javascript
const controlPoints = {
  'reasoning_depth': { value: 5, type: 'int' },
  'timeout_ms': { value: 5000, type: 'int' },
  // ...
};
```

### Thread Safety

Control changes are scoped to current execution context:
```javascript
// Each request gets its own control context
const ctx = new ControlContext(defaults);
ctx.set('reasoning_depth', 10);
// Other requests unaffected
```

### Validation

Control values are validated:
```javascript
if (value < 0 || value > MAX_DEPTH) {
  throw new Error('Invalid reasoning_depth');
}
```

## See Also

- [primitives.sys2dsl.md](./primitives.sys2dsl.md) - CONTROLS primitive
- [constants.sys2dsl.md](./constants.sys2dsl.md) - Control value constants
- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Uses control settings
- [theory.sys2dsl.md](./theory.sys2dsl.md) - Layer-specific control

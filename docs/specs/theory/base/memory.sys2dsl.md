# Specification: Base Memory Theory

ID: DS(/theory/base/memory.sys2dsl)

Source: `@data/init/theories/base/memory.sys2dsl`

Status: v3.0

## Purpose

Defines **memory management operations** as verbs. These control the lifecycle of knowledge - forgetting, reinforcement, protection, and versioning.

## Design Rationale

### Memory as Dimension Manipulation

Memory operations work by modifying dimension values:

| Operation | Primary Dimension | Effect |
|-----------|-------------------|--------|
| FORGET | existence | Decrease toward 0 |
| BOOST | existence | Increase toward +127 |
| PROTECT | protected | Set to +127 |
| DECAY | existence | Gradual decrease based on usage |

### Gradual Forgetting

Unlike databases, knowledge isn't deleted instantly:

```
Time 0:  existence = +127 (fully known)
Time 1:  existence = +100 (after FORGET)
Time 2:  existence = +80  (after FORGET)
...
Time N:  existence = 0    (UNKNOWN - effectively forgotten)
```

This models human memory decay and allows recovery.

### Version-Based History

Points maintain version history:

```
Dog_v1 → Dog_v2 → Dog_v3 (current)
```

Forgetting can roll back to previous versions.

## Memory Operations

### Category 1: Forgetting

#### FORGET - Gradual forgetting

```sys2dsl
@FORGET BEGIN
  @curr subject READ_DIM existence;
  @reduced $curr MULTIPLY low_positive;
  @new_ex $reduced DIVIDE positive;
  @return subject PROJECT_DIM existence $new_ex;
END
```

**Semantics**: Reduce existence by ~40% (multiply by 50/127).

**Usage**:
```sys2dsl
@_ Old_fact FORGET any        # Reduce salience
@_ Old_fact FORGET any        # Reduce more
@_ Old_fact FORGET any        # Eventually reaches ~0
```

#### FORGET_COMPLETELY - Immediate forget

```sys2dsl
@FORGET_COMPLETELY BEGIN
  @return subject PROJECT_DIM existence zero;
END
```

**Semantics**: Set existence to 0 immediately.

**Warning**: Use sparingly - loses information.

#### RETRACT - Remove specific fact

```sys2dsl
@RETRACT BEGIN
  @return subject PROJECT_DIM existence negative;
END
```

**Semantics**: Set existence to negative (actively false).

Different from FORGET:
- FORGET: "I don't remember if X"
- RETRACT: "X is not the case"

#### DECAY - Natural forgetting

```sys2dsl
@DECAY BEGIN
  @usage subject READ_DIM usage_count;
  @decay_rate $usage DIVIDE limit_default;
  @curr subject READ_DIM existence;
  @decayed $curr MINUS $decay_rate;
  @return subject PROJECT_DIM existence $decayed;
END
```

**Semantics**: Unused facts decay faster than used facts.

### Category 2: Reinforcement

#### BOOST - Increase salience

```sys2dsl
@BOOST BEGIN
  @curr subject READ_DIM existence;
  @boosted $curr PLUS low_positive;
  @capped $boosted MIN positive;
  @return subject PROJECT_DIM existence $capped;
END
```

**Semantics**: Increase existence, capped at +127.

**Usage**:
```sys2dsl
@_ Important_fact BOOST any   # Make more salient
```

#### REINFORCE - Usage-based strengthening

```sys2dsl
@REINFORCE BEGIN
  @usage subject READ_DIM usage_count;
  @new_usage $usage PLUS 1;
  @_ subject PROJECT_DIM usage_count $new_usage;
  @return subject BOOST any;
END
```

**Semantics**: Record usage and boost.

#### PRIME - Temporary boost

```sys2dsl
@PRIME BEGIN
  @_ subject PROJECT_DIM primed positive;
  @return subject BOOST any;
END
```

**Semantics**: Boost with "primed" flag (temporary).

### Category 3: Protection

#### PROTECT - Prevent forgetting

```sys2dsl
@PROTECT BEGIN
  @return subject PROJECT_DIM protected positive;
END
```

**Semantics**: Mark as protected - FORGET won't work.

**Usage**:
```sys2dsl
@_ Core_axiom PROTECT any     # Never forget this
@_ Core_axiom FORGET any      # No effect - protected
```

#### UNPROTECT - Remove protection

```sys2dsl
@UNPROTECT BEGIN
  @return subject PROJECT_DIM protected zero;
END
```

#### IS_PROTECTED - Check protection status

```sys2dsl
@IS_PROTECTED BEGIN
  @prot subject READ_DIM protected;
  @return $prot GREATER_THAN zero;
END
```

#### CORE - Maximum protection

```sys2dsl
@CORE BEGIN
  @_ subject PROTECT any;
  @return subject PROJECT_DIM core positive;
END
```

**Semantics**: Mark as core knowledge - highest protection level.

### Category 4: Usage Tracking

#### GET_USAGE - Get usage statistics

```sys2dsl
@GET_USAGE BEGIN
  @count subject READ_DIM usage_count;
  @last subject READ_DIM last_used;
  @return subject INSPECT any;
END
```

**Returns**:
```json
{
  "usage_count": 42,
  "last_used": "2024-01-15T10:30:00Z",
  "existence": 120,
  "protected": false
}
```

#### RECORD_USE - Record access

```sys2dsl
@RECORD_USE BEGIN
  @count subject READ_DIM usage_count;
  @new_count $count PLUS 1;
  @_ subject PROJECT_DIM usage_count $new_count;
  @return subject PROJECT_DIM last_used now;
END
```

### Category 5: Garbage Collection

#### COLLECT_GARBAGE - Remove low-existence points

```sys2dsl
@COLLECT_GARBAGE BEGIN
  @threshold low_negative NUMERIC_VALUE -50;
  @candidates any FILTER existence_below $threshold;
  @return $candidates FORGET_COMPLETELY any;
END
```

**Semantics**: Find points with existence < -50, fully forget them.

#### COMPACT - Merge similar points

```sys2dsl
@COMPACT BEGIN
  @similar subject SIMILAR_TO any;
  @merged $similar NEW_COMPOSITE subject;
  @return $merged INSPECT any;
END
```

**Semantics**: Merge nearly-identical points to save space.

### Category 6: Versioning

#### VERSION - Get current version

```sys2dsl
@VERSION BEGIN
  @return subject READ_DIM version;
END
```

#### ROLLBACK - Revert to previous

```sys2dsl
@ROLLBACK BEGIN
  @curr subject READ_DIM version;
  @prev $curr MINUS 1;
  @return subject PROJECT_DIM version $prev;
END
```

**Semantics**: Point to previous version in index.

#### SNAPSHOT - Create version checkpoint

```sys2dsl
@SNAPSHOT BEGIN
  @curr subject READ_DIM version;
  @next $curr PLUS 1;
  @return subject PROJECT_DIM version $next;
END
```

## Memory Model

### Point Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      POINT LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   CREATE          USE           DECAY         COLLECT           │
│      │             │              │              │               │
│      ▼             ▼              ▼              ▼               │
│   ┌──────┐     ┌──────┐      ┌──────┐      ┌──────┐            │
│   │ +127 │ ──► │ +127 │ ──►  │ +80  │ ──►  │  0   │ ──► DELETE │
│   │ NEW  │     │BOOST │      │DECAY │      │FORGOT│            │
│   └──────┘     └──────┘      └──────┘      └──────┘            │
│                    │                                            │
│                    ▼                                            │
│               ┌──────┐                                          │
│               │PROTCT│ ── Never decays                          │
│               └──────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Working Memory vs Long-Term

| Aspect | Working (Theory Layer) | Long-Term (Base) |
|--------|------------------------|------------------|
| Persistence | Session only | Permanent |
| Protection | None by default | Can be protected |
| Decay | Fast | Slow |
| Versioning | No | Yes |

### Memory Pressure Handling

When memory is constrained:
1. Run COLLECT_GARBAGE
2. DECAY unused points
3. COMPACT similar points
4. If still needed, FORGET oldest unprotected

## Usage Patterns

### Temporary Facts

```sys2dsl
@_ Temporary_fact IS_A something
# ... use it ...
@_ Temporary_fact FORGET_COMPLETELY any
```

### Important Knowledge

```sys2dsl
@_ Fundamental_truth IS_A axiom
@_ Fundamental_truth PROTECT any
@_ Fundamental_truth CORE any
```

### Learning with Reinforcement

```sys2dsl
# Each time a fact is useful
@_ Useful_fact REINFORCE any
# Frequently used facts become stronger
```

### Controlled Forgetting

```sys2dsl
# Gradually forget outdated information
@old_facts Outdated FACTS any
@_ $old_facts FORGET any
# Repeat until existence is low enough
```

## Implementation Notes

### Protected Points List

System maintains set of protected point IDs:
```javascript
const protectedPoints = new Set(['core_axiom_1', 'core_axiom_2', ...]);
```

### Decay Schedule

Background process runs decay:
```javascript
// Every hour
for (const point of points) {
  if (!protectedPoints.has(point.id)) {
    point.existence *= DECAY_FACTOR; // ~0.99
  }
}
```

### Version Storage

Old versions stored with suffix:
```
Dog_v1, Dog_v2, Dog_v3
Index: Dog → Dog_v3
```

## See Also

- [theory.sys2dsl.md](./theory.sys2dsl.md) - Theory layers (working memory)
- [control.sys2dsl.md](./control.sys2dsl.md) - Memory limits
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Versioning model

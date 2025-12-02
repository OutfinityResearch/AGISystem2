# Specification: Base Logic Theory

ID: DS(/theory/base/logic.sys2dsl)

Source: `@data/init/theories/base/logic.sys2dsl`

Status: v3.0

## Purpose

Defines **boolean and propositional logic operations** as verbs in the unified triple syntax. These form the foundation for combining truth values and building complex queries.

## Design Rationale

### Why Logic as Verbs, Not Commands

Benefits:
1. **Uniformity**: Logic operations are points like everything else
2. **Composability**: Can combine with other verbs naturally
3. **Inspectability**: `@info AND INSPECT any` shows the definition
4. **Extensibility**: Users can define custom logic operators

### Truth as Dimension Values

Logic operations work on the **existence dimension**:

```
AND(a, b) = point with existence = min(a.existence, b.existence)
OR(a, b)  = point with existence = max(a.existence, b.existence)
NOT(a)    = point with existence = -a.existence
```

This maps fuzzy/multi-valued logic onto dimension operations:
- TRUE_CERTAIN (+127) AND TRUE_CERTAIN (+127) = +127
- TRUE_CERTAIN (+127) AND PLAUSIBLE (+40) = +40 (weakest link)
- TRUE_CERTAIN (+127) OR FALSE (-127) = +127 (strongest)
- NOT TRUE_CERTAIN = FALSE_CERTAIN (-127)

## Logic Operations

### Basic Boolean Operations

#### AND - Conjunction

```sys2dsl
@AND BEGIN
  @s_ex subject READ_DIM existence;
  @o_ex object READ_DIM existence;
  @min_ex $s_ex MIN $o_ex;
  @result subject NEW_COMPOSITE object;
  @return $result PROJECT_DIM existence $min_ex;
END
```

**Semantics**: Both must be true. Result is as strong as weakest input.

**Truth Table** (simplified):
```
subject    object     AND result
+127       +127       +127 (TRUE ∧ TRUE = TRUE)
+127       +40        +40  (TRUE ∧ PLAUSIBLE = PLAUSIBLE)
+127       -127       -127 (TRUE ∧ FALSE = FALSE)
+40        +40        +40  (PLAUSIBLE ∧ PLAUSIBLE = PLAUSIBLE)
0          any        0    (UNKNOWN ∧ any = UNKNOWN)
```

#### OR - Disjunction

```sys2dsl
@OR BEGIN
  @s_ex subject READ_DIM existence;
  @o_ex object READ_DIM existence;
  @max_ex $s_ex MAX $o_ex;
  @result subject NEW_COMPOSITE object;
  @return $result PROJECT_DIM existence $max_ex;
END
```

**Semantics**: At least one must be true. Result is strongest input.

**Truth Table**:
```
subject    object     OR result
+127       +127       +127 (TRUE ∨ TRUE = TRUE)
+127       -127       +127 (TRUE ∨ FALSE = TRUE)
-127       -127       -127 (FALSE ∨ FALSE = FALSE)
+40        -40        +40  (PLAUSIBLE ∨ IMPLAUSIBLE = PLAUSIBLE)
```

#### NOT - Negation

```sys2dsl
@NOT BEGIN
  @s_ex subject READ_DIM existence;
  @neg_ex zero MINUS $s_ex;
  @return subject PROJECT_DIM existence $neg_ex;
END
```

**Semantics**: Inverts truth value.

**Truth Table**:
```
subject    NOT result
+127       -127 (¬TRUE = FALSE)
-127       +127 (¬FALSE = TRUE)
+40        -40  (¬PLAUSIBLE = IMPLAUSIBLE)
0          0    (¬UNKNOWN = UNKNOWN)
```

#### XOR - Exclusive Or

```sys2dsl
@XOR BEGIN
  @both subject AND object;
  @either subject OR object;
  @not_both $both NOT any;
  @return $either AND $not_both;
END
```

**Semantics**: Exactly one must be true.

### Implication Operations

#### IMPLIES - Material Implication

```sys2dsl
@IMPLIES BEGIN
  @not_s subject NOT any;
  @return $not_s OR object;
END
```

**Semantics**: If subject then object. Equivalent to ¬subject ∨ object.

**Truth Table**:
```
subject    object     IMPLIES result
+127       +127       +127 (TRUE → TRUE = TRUE)
+127       -127       -127 (TRUE → FALSE = FALSE)
-127       +127       +127 (FALSE → TRUE = TRUE)
-127       -127       +127 (FALSE → FALSE = TRUE)
```

#### IFF - Biconditional

```sys2dsl
@IFF BEGIN
  @forward subject IMPLIES object;
  @backward object IMPLIES subject;
  @return $forward AND $backward;
END
```

**Semantics**: Subject if and only if object.

### List Predicates

#### NONEMPTY - Non-empty Check

```sys2dsl
@NONEMPTY BEGIN
  @cnt subject COUNT any;
  @return $cnt GREATER_THAN zero;
END
```

**Semantics**: Returns TRUE if subject is a non-empty list/result.

#### EMPTY - Empty Check

```sys2dsl
@EMPTY BEGIN
  @non subject NONEMPTY any;
  @return $non NOT any;
END
```

#### ALL_TRUE / ANY_TRUE

For checking collections of truth values:

```sys2dsl
@ALL_TRUE BEGIN
  @first subject READ_DIM existence;
  @return $first GREATER_THAN zero;
END

@ANY_TRUE BEGIN
  @max_ex subject READ_DIM max_existence;
  @return $max_ex GREATER_THAN zero;
END
```

## Multi-Valued Logic Semantics

### The Existence Spectrum

```
-127                    0                    +127
  │                     │                     │
FALSE_CERTAIN    UNKNOWN              TRUE_CERTAIN
  │         │     │     │     │         │     │
  -127    -80   -40     0    +40      +80   +127
         FALSE  IMPL  UNK   PLAU    TRUE
         DFLT         OWN          DFLT
```

### Handling UNKNOWN (0)

UNKNOWN propagates through logic:
- UNKNOWN AND anything = UNKNOWN (can't confirm conjunction)
- UNKNOWN OR TRUE = TRUE (one true is enough)
- UNKNOWN OR FALSE = UNKNOWN (need more evidence)
- NOT UNKNOWN = UNKNOWN (negation of uncertainty is uncertainty)

### Handling CONFLICT (NaN)

When contradictory evidence exists:
- CONFLICT AND anything = CONFLICT
- CONFLICT OR anything = CONFLICT
- NOT CONFLICT = CONFLICT

CONFLICT requires resolution, not logical operations.

## Usage Patterns

### Combining Query Results

```sys2dsl
@is_dog Dog IS_A animal
@has_fur Dog HAS fur
@is_furry_dog $is_dog AND $has_fur
```

### Building Complex Conditions

```sys2dsl
@cond1 X GREATER_THAN 10
@cond2 X LESS_THAN 100
@in_range $cond1 AND $cond2
```

### Logical Inference

```sys2dsl
# If mammal then warm_blooded
@is_mammal Dog IS_A mammal
@rule $is_mammal IMPLIES warm_blooded
```

## Implementation Notes

### Composite Point Creation

AND and OR create composite points that:
- Reference both operands in metadata
- Have their own existence value
- Can be further combined

### Short-Circuit Evaluation

Unlike programming languages, Sys2DSL does NOT short-circuit:
- All operands are evaluated (declarative model)
- Topological sort determines order
- Both branches may execute in parallel

### Memoization

Results of logic operations are cached:
```javascript
cache[`${subjectId}_AND_${objectId}`] = result;
```

## Relation to Classical Logic

| Classical | Sys2DSL | Notes |
|-----------|---------|-------|
| TRUE | +127 | Maximum certainty |
| FALSE | -127 | Maximum negative |
| ∧ (and) | AND | MIN semantics |
| ∨ (or) | OR | MAX semantics |
| ¬ (not) | NOT | Negation |
| → (implies) | IMPLIES | Material implication |
| ↔ (iff) | IFF | Biconditional |

## Extension: Three-Valued Logic

For explicit "unknown" handling:

```sys2dsl
# Kleene strong three-valued logic
@KLEENE_AND BEGIN
  @s_ex subject READ_DIM existence;
  @o_ex object READ_DIM existence;
  @s_neg $s_ex LESS_THAN zero;
  @o_neg $o_ex LESS_THAN zero;
  @any_false $s_neg OR $o_neg;
  # If either is false, result is false
  # Otherwise MIN
  ...
END
```

## See Also

- [constants.sys2dsl.md](./constants.sys2dsl.md) - Truth level constants
- [modal.sys2dsl.md](./modal.sys2dsl.md) - Modal logic extensions
- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Uses logic for inference
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Truth as dimension values

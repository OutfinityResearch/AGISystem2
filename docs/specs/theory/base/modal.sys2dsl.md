# Specification: Base Modal Logic Theory

ID: DS(/theory/base/modal.sys2dsl)

Source: `@data/init/theories/base/modal.sys2dsl`

Status: v3.0

## Purpose

Defines **modal and deontic logic operations** as verbs. Modal logic extends propositional logic with operators for possibility, necessity, permission, obligation, and belief.

## Design Rationale

### Modalities as Dimensions

Each modal category maps to a dedicated dimension:

```
┌─────────────────────────────────────────────────────────────────┐
│  Modality Type    │  Dimension Name  │  Range Meaning           │
│  ─────────────────│──────────────────│────────────────────────  │
│  Alethic          │  necessity       │  -127=impossible...+127=necessary │
│  Deontic          │  deontic         │  -127=prohibited...+127=obligatory │
│  Epistemic        │  epistemic       │  -127=unknown...+127=known │
│  Temporal         │  temporal        │  past...present...future │
│  Comparative      │  degree          │  relative ordering       │
└─────────────────────────────────────────────────────────────────┘
```

This geometric representation enables:
- Combining modalities (e.g., "possibly permitted")
- Gradations (not just binary possible/impossible)
- Reasoning about modal interactions

### Why Multiple Dimensions

A fact can have independent modal properties:
- "Dogs can fly" - existence: -127, necessity: +127 (necessarily false)
- "Murder is wrong" - existence: +127, deontic: -127 (exists but prohibited)
- "P=NP" - existence: 0, epistemic: -127 (unknown, unresolved)

## Modal Categories

### Category 1: Alethic Modalities (Possibility/Necessity)

#### POSSIBLY - Something might be the case

```sys2dsl
@POSSIBLY BEGIN
  @ex subject READ_DIM existence;
  @poss_ex $ex MULTIPLY low_positive;
  @poss_div $poss_ex DIVIDE positive;
  @return subject PROJECT_DIM existence $poss_div;
END
```

**Semantics**: Reduces certainty to indicate possibility rather than actuality.

- POSSIBLY TRUE → PLAUSIBLE (could be true)
- POSSIBLY FALSE → IMPLAUSIBLE (could be false, i.e., possibly not)

#### NECESSARILY - Something must be the case

```sys2dsl
@NECESSARILY BEGIN
  @ex subject READ_DIM existence;
  @nec_ex $ex MULTIPLY positive;
  @nec_div $nec_ex DIVIDE high_positive;
  @return subject PROJECT_DIM existence $nec_div;
END
```

**Semantics**: Increases certainty to indicate necessity.

#### Modal Logic Axioms

The definitions respect standard modal logic:
- □P → P (necessity implies actuality)
- P → ◇P (actuality implies possibility)
- □P → □□P (S4 axiom - necessity is necessary)

### Category 2: Deontic Modalities (Permission/Obligation)

#### PERMITTED - Allowed to do something

```sys2dsl
@PERMITTED BEGIN
  @return subject PROJECT_DIM deontic positive;
END
```

**Semantics**: Sets deontic dimension to positive (allowed).

#### PROHIBITED - Not allowed to do something

```sys2dsl
@PROHIBITED BEGIN
  @return subject PROJECT_DIM deontic negative;
END
```

**Semantics**: Sets deontic dimension to negative (forbidden).

#### OBLIGATORY - Required to do something

```sys2dsl
@OBLIGATORY BEGIN
  @return subject PROJECT_DIM deontic positive;
END
```

**Note**: OBLIGATORY and PERMITTED both set positive deontic value. The distinction is in the source/strength, which could be tracked in metadata.

#### OPTIONAL - May or may not do

```sys2dsl
@OPTIONAL BEGIN
  @return subject PROJECT_DIM deontic zero;
END
```

#### Deontic Square of Opposition

```
         OBLIGATORY (+127)
              │
    ┌─────────┼─────────┐
    │         │         │
PERMITTED   OPTIONAL  PROHIBITED
  (+127)      (0)      (-127)
    │         │         │
    └─────────┴─────────┘

Obligatory → Permitted (what's required is allowed)
Prohibited → ¬Permitted (what's forbidden is not allowed)
```

### Category 3: Epistemic Modalities (Knowledge/Belief)

#### KNOWN - Subject is known to be true

```sys2dsl
@KNOWN BEGIN
  @return subject PROJECT_DIM epistemic positive;
END
```

**Semantics**: High epistemic certainty - we have evidence.

#### BELIEVED - Subject is believed to be true

```sys2dsl
@BELIEVED BEGIN
  @return subject PROJECT_DIM epistemic high_positive;
END
```

**Semantics**: Medium-high epistemic certainty - justified belief.

#### DOUBTED - Subject is doubted

```sys2dsl
@DOUBTED BEGIN
  @return subject PROJECT_DIM epistemic low_negative;
END
```

#### UNKNOWN_EP - Epistemic status unknown

```sys2dsl
@UNKNOWN_EP BEGIN
  @return subject PROJECT_DIM epistemic zero;
END
```

### Category 4: Temporal Modalities

#### ALWAYS - True at all times

```sys2dsl
@ALWAYS BEGIN
  @return subject PROJECT_DIM temporal positive;
END
```

#### SOMETIMES - True at some times

```sys2dsl
@SOMETIMES BEGIN
  @return subject PROJECT_DIM temporal low_positive;
END
```

#### NEVER - Never true

```sys2dsl
@NEVER BEGIN
  @return subject PROJECT_DIM temporal negative;
END
```

#### EVENTUALLY - Will be true

```sys2dsl
@EVENTUALLY BEGIN
  @return subject PROJECT_DIM temporal_future positive;
END
```

### Category 5: Comparative Modalities

#### MORE_THAN - Subject has more of dimension than object

```sys2dsl
@MORE_THAN BEGIN
  @s_val subject READ_DIM degree;
  @o_val object READ_DIM degree;
  @diff $s_val MINUS $o_val;
  @return $diff GREATER_THAN zero;
END
```

**Semantics**: Triggers constraint negotiation if values don't satisfy relation.

#### LESS_THAN_MOD - Subject has less than object

```sys2dsl
@LESS_THAN_MOD BEGIN
  @result subject MORE_THAN object;
  @return $result NOT any;
END
```

#### EQUAL_TO - Same degree

```sys2dsl
@EQUAL_TO BEGIN
  @s_val subject READ_DIM degree;
  @o_val object READ_DIM degree;
  @return $s_val EQUALS $o_val;
END
```

## Combining Modalities

### Nested Modalities

```sys2dsl
@possibly_permitted subject POSSIBLY any
@_ $possibly_permitted PERMITTED any
```

Represents "it's possible that this is permitted."

### Independence of Dimensions

Modalities on different dimensions are independent:

```sys2dsl
@fact Dog IS_A animal
@_ $fact PROJECT_DIM existence positive       # It's true
@_ $fact PROJECT_DIM deontic positive         # It's permitted (to say)
@_ $fact PROJECT_DIM epistemic positive       # It's known
```

## Usage Patterns

### Normative Reasoning

```sys2dsl
@action Steal INSPECT any
@_ $action PROHIBITED any
@consequence $action CAUSES punishment
@should_not $action IMPLIES $consequence
```

### Uncertain Knowledge

```sys2dsl
@hypothesis Cure_exists INSPECT any
@_ $hypothesis BELIEVED any
@not_proven $hypothesis UNKNOWN_EP any
```

### Temporal Patterns

```sys2dsl
@was_true Past BEFORE Present
@is_true Present INSPECT any
@will_be Future EVENTUALLY any
```

## Implementation Notes

### Dimension Allocation

Modal dimensions are pre-allocated:
- Dimension 0: existence
- Dimension 1: deontic
- Dimension 2: epistemic
- Dimension 3: temporal
- Dimension 4+: domain-specific

### Modal Inference

Modal operators interact with inference:
- NECESSARILY P allows deriving P
- POSSIBLY P does not allow deriving P
- OBLIGATORY P does not imply P is true (is-ought gap)

### Conflict Detection

Contradictory modalities are detected:
- OBLIGATORY AND PROHIBITED → CONFLICT
- NECESSARILY TRUE AND POSSIBLY FALSE → CONFLICT

## Relation to Standard Modal Logic

| Standard | Sys2DSL | Notes |
|----------|---------|-------|
| □ (box/necessary) | NECESSARILY | necessity dimension |
| ◇ (diamond/possible) | POSSIBLY | derived from necessity |
| O (obligatory) | OBLIGATORY | deontic dimension |
| P (permitted) | PERMITTED | deontic dimension |
| F (forbidden) | PROHIBITED | negative deontic |
| K (knows) | KNOWN | epistemic dimension |
| B (believes) | BELIEVED | epistemic dimension |
| G (always) | ALWAYS | temporal dimension |
| F (eventually) | EVENTUALLY | temporal future |

## Future Considerations

### Dynamic Modal Logic

Actions that change modal status:
```sys2dsl
@AFTER_ACTION BEGIN
  # After doing action, what's permitted changes
  ...
END
```

### Multi-Agent Epistemic

What different agents know:
```sys2dsl
@KNOWS_THAT BEGIN
  @agent subject READ_DIM agent;
  @fact object READ_DIM epistemic_$agent;
  ...
END
```

## See Also

- [logic.sys2dsl.md](./logic.sys2dsl.md) - Propositional logic base
- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Modal reasoning
- [axiology_base.sys2dsl.md](./axiology_base.sys2dsl.md) - Uses deontic modalities
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Dimension model

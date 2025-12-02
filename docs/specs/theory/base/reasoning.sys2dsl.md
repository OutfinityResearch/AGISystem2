# Specification: Base Reasoning Theory

ID: DS(/theory/base/reasoning.sys2dsl)

Source: `@data/init/theories/base/reasoning.sys2dsl`

Status: v3.0

## Purpose

Defines **reasoning and inference operations** as verbs. These enable the system to derive new knowledge from existing facts through various reasoning strategies.

## Design Rationale

### Reasoning as Geometric Operations

In v3.0, reasoning operations map to geometric primitives:

| Reasoning Type | Geometric Operation |
|----------------|---------------------|
| Deduction | Project point onto parent subspace |
| Induction | Find minimal diamond containing examples |
| Abduction | Reverse causal dimension projection |
| Analogy | Vector transfer between domains |

### Multi-Strategy Inference

INFER tries multiple strategies automatically:
1. Direct lookup (fastest)
2. Transitive chaining (IS_A chains)
3. Default reasoning (typical properties)
4. Geometric inference (similarity)

This makes queries robust without requiring users to specify strategy.

## Reasoning Categories

### Category 1: Basic Inference

#### INFER - General-purpose inference

```sys2dsl
@INFER BEGIN
  @direct subject IS_A object;
  @trans subject INFER_TRANSITIVE object;
  @default subject INFER_DEFAULT object;
  @best $direct OR $trans;
  @return $best OR $default;
END
```

**Semantics**: Tries multiple strategies, returns strongest result.

**Example**:
```sys2dsl
# Given: Fido IS_A Dog, Dog IS_A mammal, mammal IS_A animal
@r Fido INFER animal    # TRUE via transitive chain
```

#### INFER_TRANSITIVE - Chain through intermediates

```sys2dsl
@INFER_TRANSITIVE BEGIN
  @mid subject IS_A freevar1;
  @final freevar1 IS_A object;
  @return $mid AND $final;
END
```

**Semantics**: Find intermediate concept, chain IS_A relations.

#### INFER_DEFAULT - Apply defaults

```sys2dsl
@INFER_DEFAULT BEGIN
  @default_val subject READ_DIM default_$object;
  @return $default_val GREATER_THAN zero;
END
```

**Semantics**: Check if subject has default property.

**Example**:
```sys2dsl
# Birds typically fly (default)
@r Tweety INFER_DEFAULT can_fly    # TRUE_DEFAULT (+80)
# But penguins override the default
@r Penguin INFER_DEFAULT can_fly   # FALSE (-127, explicit override)
```

### Category 2: Proof Construction

#### PROVE - Build formal proof

```sys2dsl
@PROVE BEGIN
  @chain subject DEDUCT object;
  @return $chain PROJECT_DIM proof_complete positive;
END
```

**Semantics**: Construct deductive chain, return with proof trace.

**Example**:
```sys2dsl
@proof Socrates PROVE mortal
# Returns: {
#   truth: TRUE_CERTAIN,
#   proof_trace: [
#     "Socrates IS_A human",
#     "human IS_A mortal",
#     "∴ Socrates IS_A mortal"
#   ]
# }
```

#### DISPROVE - Prove the negation

```sys2dsl
@DISPROVE BEGIN
  @neg_obj object NOT any;
  @return subject PROVE $neg_obj;
END
```

#### VALIDATE - Check consistency

```sys2dsl
@VALIDATE BEGIN
  @contradicts subject CHECK_CONTRADICTION object;
  @valid $contradicts NOT any;
  @return $valid PROJECT_DIM validated positive;
END
```

**Semantics**: Check if fact is consistent with existing knowledge.

### Category 3: Abductive Reasoning

#### ABDUCT - Generate explanations

```sys2dsl
@ABDUCT BEGIN
  @causes any CAUSES subject;
  @return $causes PROJECT_DIM hypothesis positive;
END
```

**Semantics**: Given an observation (effect), find possible causes.

**Example**:
```sys2dsl
# Observation: the street is wet
@explanations Wet_street ABDUCT any
# Returns: [rain, sprinkler, flood, ...]
```

#### HYPOTHESIZE - Form hypothesis from evidence

```sys2dsl
@HYPOTHESIZE BEGIN
  @patterns subject INDUCT object;
  @return $patterns PROJECT_DIM hypothesis positive;
END
```

**Semantics**: Inductive generalization from evidence.

#### BEST_EXPLANATION - Select most likely

```sys2dsl
@BEST_EXPLANATION BEGIN
  @hyps subject ABDUCT object;
  @scored $hyps RANK_BY confidence;
  @return $scored FIRST any;
END
```

**Semantics**: Inference to best explanation (IBE).

### Category 4: Analogical Reasoning

#### ANALOGIZE - A:B :: C:?

```sys2dsl
@ANALOGIZE BEGIN
  @vector subject ANALOGIZE_PRIM object;
  @return $vector PROJECT_DIM analogy positive;
END
```

**Semantics**:
1. Subject is source pair (A, B)
2. Object is target (C)
3. Compute: D = C + (B - A)

**Example**:
```sys2dsl
# king:queen :: man:?
@pair King NEW_COMPOSITE Queen
@answer $pair ANALOGIZE Man    # → Woman
```

#### SIMILAR_TO - Similarity check

```sys2dsl
@SIMILAR_TO BEGIN
  @s_point subject INSPECT any;
  @o_point object INSPECT any;
  @dist $s_point ATTRACT $o_point;
  @sim $dist READ_DIM distance;
  @return $sim LESS_THAN medium;
END
```

**Semantics**: Check if two points are geometrically close.

### Category 5: Contradiction Detection

#### CHECK_CONTRADICTION - Direct contradiction

```sys2dsl
@CHECK_CONTRADICTION BEGIN
  @s_ex subject READ_DIM existence;
  @o_ex object READ_DIM existence;
  @product $s_ex MULTIPLY $o_ex;
  @return $product LESS_THAN zero;
END
```

**Semantics**: If one is positive and other negative, contradiction.

#### WOULD_CONTRADICT - Hypothetical check

```sys2dsl
@WOULD_CONTRADICT BEGIN
  @existing object FACTS any;
  @test subject CHECK_CONTRADICTION $existing;
  @return $test NONEMPTY any;
END
```

**Semantics**: Check if adding subject would cause contradiction.

#### RESOLVE_CONFLICT - Conflict resolution

```sys2dsl
@RESOLVE_CONFLICT BEGIN
  @s_conf subject READ_DIM confidence;
  @o_conf object READ_DIM confidence;
  @s_wins $s_conf GREATER_THAN $o_conf;
  @return $s_wins PROJECT_DIM resolved positive;
END
```

**Semantics**: Higher confidence wins.

### Category 6: Counterfactual Reasoning

#### CF - Counterfactual query

```sys2dsl
@CF BEGIN
  @_ hypothetical PUSH any;
  @_ subject IS_A object;
  @result subject INFER any;
  @_ any POP any;
  @return $result PROJECT_DIM counterfactual positive;
END
```

**Semantics**:
1. Push hypothetical layer
2. Assert the counterfactual
3. Query within that world
4. Pop layer (discard changes)

**Example**:
```sys2dsl
# "What if dogs could fly?"
@cf Dog CF can_fly
# Inferences made in hypothetical world, then discarded
```

#### WHATIF - Alias for CF

```sys2dsl
@WHATIF BEGIN
  @return subject CF object;
END
```

### Category 7: Rule Application

#### APPLY_RULE - Apply single rule

```sys2dsl
@APPLY_RULE BEGIN
  @rule_def subject INSPECT any;
  @bound $rule_def PROJECT_DIM subject object;
  @return $bound DEDUCT any;
END
```

#### FORWARD_CHAIN - Forward chaining

```sys2dsl
@FORWARD_CHAIN BEGIN
  @rules any WITH_RELATION RULE;
  @applied $rules APPLY_RULE subject;
  @return $applied PROJECT_DIM inferred positive;
END
```

**Semantics**: Apply all applicable rules, derive new facts.

#### BACKWARD_CHAIN - Goal-directed reasoning

```sys2dsl
@BACKWARD_CHAIN BEGIN
  @goal object INSPECT any;
  @prereqs $goal READ_DIM prerequisites;
  @return $prereqs PROVE subject;
END
```

**Semantics**: Start from goal, work backward to find proof.

## Reasoning Strategies

### Strategy Selection

```
┌─────────────────────────────────────────────────────────────────┐
│  Situation                     │  Best Strategy                 │
│  ──────────────────────────────│──────────────────────────────  │
│  Direct fact exists            │  Direct lookup                 │
│  Taxonomic query               │  Transitive IS_A               │
│  Typical properties            │  Default reasoning             │
│  Why questions                 │  Abduction                     │
│  What-if questions             │  Counterfactual (CF)           │
│  Similarity questions          │  Analogical                    │
│  Complex derivation            │  Forward/backward chaining     │
└─────────────────────────────────────────────────────────────────┘
```

### Depth Control

Reasoning depth is controlled via control points:

```sys2dsl
@_ depth_deep CONTROLS reasoning_depth
@r Complex_query PROVE conclusion
```

### Confidence Propagation

Through inference chains, confidence decreases:

```
A (1.0) → B (0.9) → C (0.81) → D (0.73)
```

Each step multiplies by propagation factor (~0.9).

## Usage Patterns

### Simple Inference

```sys2dsl
@is_mortal Socrates INFER mortal
```

### Proof with Trace

```sys2dsl
@proof Theorem1 PROVE conclusion
@explanation $proof SHOW_PROOF any
```

### Hypothesis Generation

```sys2dsl
@observation Patient HAS fever
@hypotheses $observation ABDUCT any
@best $hypotheses BEST_EXPLANATION any
```

### Counterfactual Analysis

```sys2dsl
@scenario Alternative_history CF different_outcome
@consequences $scenario FORWARD_CHAIN any
```

## Implementation Notes

### Inference Cache

Results are cached to avoid recomputation:
```javascript
cache[`${subject}_INFER_${object}`] = result;
```

### Cycle Detection

Reasoning tracks visited nodes to prevent infinite loops:
```javascript
if (visited.has(nodeId)) return UNKNOWN;
visited.add(nodeId);
```

### Timeout Handling

Long reasoning chains respect timeout:
```javascript
if (Date.now() - startTime > timeout_ms) {
  return { truth: 'UNKNOWN_TIMEOUT', partial: results };
}
```

## See Also

- [logic.sys2dsl.md](./logic.sys2dsl.md) - Boolean logic for combining results
- [query.sys2dsl.md](./query.sys2dsl.md) - Queries that feed reasoning
- [theory.sys2dsl.md](./theory.sys2dsl.md) - Theory layers for counterfactuals
- [control.sys2dsl.md](./control.sys2dsl.md) - Reasoning control parameters
- [primitives.sys2dsl.md](./primitives.sys2dsl.md) - Geometric primitives

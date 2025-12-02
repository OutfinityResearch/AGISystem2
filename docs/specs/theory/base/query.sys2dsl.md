# Specification: Base Query Theory

ID: DS(/theory/base/query.sys2dsl)

Source: `@data/init/theories/base/query.sys2dsl`

Status: v3.0

## Purpose

Defines **query and pattern matching operations** as verbs. These are the primary means of retrieving information from the conceptual space.

## Design Rationale

### Queries as Geometric Operations

In v3.0, queries are geometric measurements:

```
IS_A(Dog, animal) = measure how much Dog's diamond
                    overlaps with animal's diamond
                    along taxonomic dimensions
```

The verb measures geometric relationships:
- `@r Dog IS_A animal` (measures taxonomic overlap)

### The `any` Wildcard

Pattern matching uses `any` instead of `*` or `?`:

```sys2dsl
@all_animals any IS_A animal      # What things are animals?
@dog_facts Dog FACTS any          # What facts about Dog?
@causes any CAUSES fever          # What causes fever?
```

`any` is a real point with maximum diamond radius - it matches everything geometrically.

## Query Categories

### Category 1: Taxonomic Queries

#### IS_A - "Is X a kind of Y?"

```sys2dsl
@IS_A BEGIN
  @s_point subject INSPECT any;
  @o_point object INSPECT any;
  @dist $s_point DEDUCT $o_point;
  @return $dist READ_DIM existence;
END
```

**Semantics**:
1. Get both points
2. Project subject onto object's subspace (deduction)
3. Return existence dimension of result

**Examples**:
```sys2dsl
@r1 Dog IS_A animal         # TRUE_CERTAIN (+127)
@r2 Dog IS_A reptile        # FALSE_CERTAIN (-127)
@r3 Platypus IS_A mammal    # TRUE_DEFAULT (+80) - unusual but true
```

#### HAS - "Does X have property Y?"

```sys2dsl
@HAS BEGIN
  @rel subject READ_DIM $object;
  @return $rel GREATER_THAN zero;
END
```

**Semantics**: Read the dimension named after object, check if positive.

**Examples**:
```sys2dsl
@r1 Dog HAS fur             # TRUE (fur dimension positive)
@r2 Dog HAS scales          # FALSE (scales dimension ≤ 0)
```

#### RELATES - "Does X relate to Y somehow?"

```sys2dsl
@RELATES BEGIN
  @facts subject FACTS object;
  @return $facts NONEMPTY any;
END
```

**Semantics**: Check if any facts connect subject and object.

### Category 2: Fact Retrieval

#### FACTS - Get all facts about subject

```sys2dsl
@FACTS BEGIN
  @return subject INDUCT object;
END
```

**Semantics**: Induction from subject, optionally filtered by object.

**Usage**:
```sys2dsl
@all_dog Dog FACTS any           # All facts about Dog
@dog_types Dog FACTS animal      # Facts relating Dog to animal
```

#### INSTANCES - Get all instances of concept

```sys2dsl
@INSTANCES BEGIN
  @return any IS_A subject;
END
```

**Semantics**: What things are this concept?

**Example**:
```sys2dsl
@dogs any IS_A Dog               # [Fido, Rex, Grivei, ...]
@mammals any IS_A mammal         # [Dog, Cat, human, whale, ...]
```

#### SUBTYPES / SUPERTYPES - Taxonomy navigation

```sys2dsl
@SUBTYPES BEGIN
  @return any IS_A subject;
END

@SUPERTYPES BEGIN
  @return subject IS_A any;
END
```

### Category 3: Pattern Matching

#### MATCHING - Find facts by pattern

```sys2dsl
@MATCHING BEGIN
  @return subject RELATES object;
END
```

Pattern positions can be `any`:
```sys2dsl
@pattern1 Dog MATCHING any       # Dog as subject
@pattern2 any MATCHING animal    # animal as object
@pattern3 any MATCHING any       # All facts (expensive!)
```

#### WITH_RELATION - Find facts with specific relation

```sys2dsl
@WITH_RELATION BEGIN
  @return any subject any;
END
```

**Example**:
```sys2dsl
@causes any CAUSES any           # All causal facts
@locations any LOCATED_IN any    # All location facts
```

#### WITH_OBJECT - Find facts with specific object

```sys2dsl
@WITH_OBJECT BEGIN
  @return any any subject;
END
```

### Category 4: Filtered Queries

#### FILTER - Filter results by predicate

```sys2dsl
@FILTER BEGIN
  @return subject INDUCT object;
END
```

**Usage**:
```sys2dsl
@all_mammals any IS_A mammal
@large_mammals $all_mammals FILTER size_large
```

#### COUNT_RESULTS - Count matches

```sys2dsl
@COUNT_RESULTS BEGIN
  @list subject FACTS object;
  @return $list COUNT any;
END
```

#### FIRST / LAST - Get specific result

```sys2dsl
@FIRST BEGIN
  @list subject FACTS object;
  @return $list READ_DIM first;
END

@LAST BEGIN
  @list subject FACTS object;
  @return $list READ_DIM last;
END
```

### Category 5: Relationship Queries

These query specific built-in relations:

#### CAUSES - Causal relationship

```sys2dsl
@CAUSES BEGIN
  @return subject READ_DIM causal_$object;
END
```

**Example**: `@r Fire CAUSES heat` → TRUE

#### PART_OF - Mereological (part-whole)

```sys2dsl
@PART_OF BEGIN
  @return subject READ_DIM part_$object;
END
```

**Example**: `@r Wheel PART_OF car` → TRUE

#### LOCATED_IN - Spatial

```sys2dsl
@LOCATED_IN BEGIN
  @return subject READ_DIM location_$object;
END
```

**Example**: `@r Paris LOCATED_IN France` → TRUE

#### BEFORE / AFTER - Temporal

```sys2dsl
@BEFORE BEGIN
  @s_time subject READ_DIM temporal;
  @o_time object READ_DIM temporal;
  @return $s_time LESS_THAN $o_time;
END

@AFTER BEGIN
  @return object BEFORE subject;
END
```

### Category 6: Existence Queries

#### EXISTS - Does subject exist in knowledge base?

```sys2dsl
@EXISTS BEGIN
  @info subject INSPECT any;
  @ex $info READ_DIM existence;
  @return $ex GREATER_THAN zero;
END
```

#### UNKNOWN_Q - Is subject unknown?

```sys2dsl
@UNKNOWN_Q BEGIN
  @info subject INSPECT any;
  @ex $info READ_DIM existence;
  @return $ex EQUALS zero;
END
```

## Query Execution Model

### Geometric Interpretation

Queries perform geometric operations:

```
┌─────────────────────────────────────────────────────────────────┐
│  Query Type      │  Geometric Operation                        │
│  ────────────────│───────────────────────────────────────────  │
│  IS_A            │  Diamond overlap + deduction                │
│  HAS             │  Dimension reading                          │
│  FACTS           │  Induction (find points in region)          │
│  INSTANCES       │  Reverse IS_A (find specializations)        │
│  RELATES         │  Distance measurement                       │
└─────────────────────────────────────────────────────────────────┘
```

### Result Types

Queries return different point types:

| Query | Returns | kind |
|-------|---------|------|
| IS_A | Truth value | "composite" with existence |
| FACTS | List of facts | "list" |
| INSTANCES | List of points | "list" |
| COUNT | Numeric value | "constant" |
| EXISTS | Truth value | "composite" |

### Performance Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│  Query             │  Complexity    │  Notes                   │
│  ──────────────────│────────────────│────────────────────────  │
│  IS_A (specific)   │  O(1)          │  Direct lookup           │
│  HAS (specific)    │  O(1)          │  Dimension read          │
│  any IS_A X        │  O(n)          │  Scan all instances      │
│  X FACTS any       │  O(k)          │  k = facts about X       │
│  any FACTS any     │  O(total)      │  Full scan - expensive!  │
└─────────────────────────────────────────────────────────────────┘
```

## Usage Patterns

### Simple Queries

```sys2dsl
# Is this a dog?
@is_dog Fido IS_A Dog

# What animals exist?
@animals any IS_A animal

# Does Paris have a river?
@has_river Paris HAS river
```

### Chained Queries

```sys2dsl
# Find all mammals that can fly
@mammals any IS_A mammal
@can_fly $mammals FILTER CAN_fly
@flying_mammals $can_fly INSTANCES any
```

### Negated Queries

```sys2dsl
# What is NOT a mammal?
@mammals any IS_A mammal
@non_mammals $mammals NOT any
```

## Integration with Reasoning

Queries feed into reasoning:

```sys2dsl
# Query provides premises for inference
@premise1 Socrates IS_A human
@premise2 human IS_A mortal
@conclusion Socrates INFER mortal
```

## See Also

- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Uses queries for inference
- [logic.sys2dsl.md](./logic.sys2dsl.md) - Combines query results
- [ontology_base.sys2dsl.md](./ontology_base.sys2dsl.md) - Queryable facts
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Query execution model

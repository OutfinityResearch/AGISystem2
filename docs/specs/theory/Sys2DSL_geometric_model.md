# Design Spec: Sys2DSL Geometric Model

ID: DS(/theory/Sys2DSL_geometric_model)

Status: DRAFT v1.0

## 1. Fundamental Principle

**Everything is a point (or region) in conceptual space.**

- **Concepts** (types) = regions (BoundedDiamonds)
- **Facts** (instances) = points within regions
- **Values** = points (they are concepts too!)
- **Relations** (verbs) = directed connections between points, also represented as concepts

There is NO syntax that compresses multiple points into one. Each entity occupies its own location in the space.

### Visual: The Conceptual Space

```
                     CONCEPTUAL SPACE (N-dimensional)
    ┌────────────────────────────────────────────────────────────┐
    │                                                            │
    │     ┌─────────────────┐                                    │
    │     │  animal         │  ← Concept (BoundedDiamond region) │
    │     │  ┌───────────┐  │                                    │
    │     │  │  mammal   │  │  ← Nested concept (subsumption)    │
    │     │  │    •Fido  │  │  ← Fact/Instance (point)           │
    │     │  │    •Rex   │  │                                    │
    │     │  └───────────┘  │                                    │
    │     │       •Bird1    │                                    │
    │     └─────────────────┘                                    │
    │                    ╲                                       │
    │                     ╲ IS_A (relation = directed edge)      │
    │                      ╲                                     │
    │     ┌──────────────┐  ╲   ┌─────────────┐                  │
    │     │ temperature  │   ╲  │  liquid     │                  │
    │     │  •Celsius100 │    ╲ │   •Water    │                  │
    │     │  •Celsius0   │     ╲│             │                  │
    │     └──────────────┘      └─────────────┘                  │
    │                                                            │
    └────────────────────────────────────────────────────────────┘

    Legend:
    ┌───┐ = BoundedDiamond (concept region with min/max bounds)
    •    = Point (fact/instance within a region)
    ───► = Relation (directed connection between points)
```

---

## 2. Geometric Decomposition

### 2.1 The Hidden Structure

Every property-value relationship involves multiple distinct points in conceptual space:

```
Point 1: water              (concept)
Point 2: boiling_point      (property concept)
Point 3: Celsius100         (value concept)

Relation A: water ──HAS_PROPERTY──► boiling_point
Relation B: boiling_point ──HAS_VALUE──► Celsius100
   OR
Relation C: water ──BOILS_AT──► Celsius100 (direct)
```

### Visual: Correct Decomposition

```
    CORRECT (decomposed):
    ─────────────────────────────────

    ┌─────────┐  HAS_PROPERTY  ┌──────────────┐
    │  water  │ ─────────────► │ boiling_point│
    └─────────┘                └──────┬───────┘
                                      │
                                      │ HAS_VALUE
                                      ▼
                             ┌───────────────┐
                             │  Celsius100   │
                             │  (a POINT in  │
                             │   space!)     │
                             └───────────────┘
```

### 2.2 Why This Matters

1. **Reasoning**: Can reason about `Celsius100` independently (e.g., "what else has value Celsius100?")
2. **Queries**: Can find all properties through proper relations
3. **Composition**: Can combine values as concepts
4. **Geometry**: Every value has a position in space

---

## 3. Correct Decomposition Patterns

### 3.1 Pattern A: DIM_PAIR (Recommended for v3)

```sys2dsl
# Use the DIM_PAIR pattern to set dimensional properties
@p boiling_point DIM_PAIR Celsius100
@_ Water SET_DIM $p
```

**Pro**: Geometrically correct, efficient, v3 standard
**Con**: Requires DIM_PAIR verb support

### 3.2 Pattern B: Direct Relation (Simple cases)

```sys2dsl
# Use a specific relation that encodes the property
@_ Water BOILS_AT Celsius100
```

**Pro**: Simple, one statement
**Con**: Requires defining many relations

### 3.3 Pattern C: Reified Fact (Complex metadata)

```sys2dsl
# Create a fact node that links everything (for complex cases)
@fact WaterBoilingFact REIFY any

@_ WaterBoilingFact HAS_SUBJECT Water
@_ WaterBoilingFact HAS_PROPERTY boiling_point
@_ WaterBoilingFact HAS_VALUE Celsius100
```

**Pro**: Full flexibility, queryable, supports metadata
**Con**: Most verbose

### 3.4 Pattern D: Value Hierarchy

```sys2dsl
# The value itself is a concept in a measurement hierarchy
@_ Celsius100 IS_A temperature
@_ Celsius100 IS_A boiling_temperature
@_ Water HAS_BOILING_POINT Celsius100
```

**Pro**: Values are first-class, can reason about them
**Con**: Need to define value concepts

---

## 4. Recommended Approach

### 4.1 Dimensional Properties: Use DIM_PAIR (Recommended)

For physical/measurable properties, use DIM_PAIR pattern:

```sys2dsl
# Set dimensional properties on concepts
@p1 boiling_point DIM_PAIR Celsius100
@_ Water SET_DIM $p1

@p2 freezing_point DIM_PAIR Celsius0
@_ Water SET_DIM $p2

@p3 weight DIM_PAIR TonsScale5
@_ Elephant SET_DIM $p3

@p4 color DIM_PAIR Blue
@_ Sky SET_DIM $p4
```

### 4.2 Simple Relations: Direct Verb Use

For simple relational properties:

```sys2dsl
# Use direct relations
@_ Water BOILS_AT Celsius100
@_ Water FREEZES_AT Celsius0
@_ Elephant WEIGHS TonsScale5
@_ Sky HAS_COLOR Blue
```

### 4.3 Complex Properties: Use Reification

For properties that need context or metadata:

```sys2dsl
# "Water boils at 100°C at sea level pressure"
@fact WaterBoilingSeaLevel REIFY any
@_ WaterBoilingSeaLevel HAS_SUBJECT Water
@_ WaterBoilingSeaLevel HAS_RELATION BOILS_AT
@_ WaterBoilingSeaLevel HAS_VALUE Celsius100
@_ WaterBoilingSeaLevel HAS_CONDITION SeaLevelPressure
```

### 4.4 Value Hierarchies

Define values as concepts in hierarchies:

```sys2dsl
# Temperature values
@_ Celsius0 IS_A temperature
@_ Celsius100 IS_A temperature
@_ Celsius100 IS_A high_temperature
@_ Celsius0 IS_A low_temperature

# Now we can reason about temperatures
@q1 Celsius100 IS_A high_temperature  # TRUE
@q2 temperature INSTANCES any         # All temperatures
```

---

## 5. The Three Forms of Knowledge

### Visual: Knowledge Forms in Geometric Space

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONCEPTUAL SPACE                                    │
│                                                                             │
│   CONCEPTS (lowercase)              FACTS (Capitalized)                     │
│   ═══════════════════              ═══════════════════                      │
│   BoundedDiamond regions           Points within regions                    │
│                                                                             │
│   ┌─────────────────────┐                                                   │
│   │      animal         │  ← concept region (min/max bounds per dimension)  │
│   │   ┌─────────────┐   │                                                   │
│   │   │   mammal    │   │  ← subconcept (smaller region, IS_A animal)       │
│   │   │  •Fido      │   │  ← fact (point inside mammal region)              │
│   │   │  •Lassie    │   │                                                   │
│   │   └─────────────┘   │                                                   │
│   │      •Eagle1        │  ← fact (in animal but not mammal)                │
│   └─────────────────────┘                                                   │
│              │                                                              │
│              │ RELATIONS (UPPERCASE)                                        │
│              │ ═════════════════════                                        │
│              │ Directed edges + permutation transforms                      │
│              │                                                              │
│              │ IS_A                                                         │
│              ▼                                                              │
│   ┌─────────────────────┐                                                   │
│   │   living_thing      │                                                   │
│   └─────────────────────┘                                                   │
│                                                                             │
│   Relation = edge connecting points + permutation table for vector binding  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Concepts (lowercase) = Type Regions

```
concept = lowercase word
        = BoundedDiamond region in space
        = represents a category/class

Examples: dog, temperature, liquid, legal_entity
```

### 5.2 Facts/Instances (Capitalized) = Specific Points

```
Fact = Capitalized word
     = point in space (within a concept region)
     = represents a specific instance

Examples: Fido, Celsius100, Paris, Alice
```

### 5.3 Relations (UPPERCASE) = Connections

```
RELATION = ALL_CAPS word
         = directed edge between points
         = also a concept (can be queried/modified)

Examples: IS_A, CAUSES, BOILS_AT, LOCATED_IN
```

### 5.4 Permutation Binding Diagram

```
   ENCODING: "Dog IS_A Animal"
   ════════════════════════════

   Step 1: Encode subject          Step 2: Encode object
   ┌─────────────────────┐         ┌─────────────────────┐
   │  "Dog" → hash →     │         │  "Animal" → hash →  │
   │  subject_vec        │         │  object_vec         │
   │  [23, -5, 0, 12...] │         │  [10, 8, -3, 5...]  │
   └─────────────────────┘         └─────────────────────┘
                                             │
                                             ▼
   Step 3: Permute object by relation   ┌─────────────────────────┐
   ════════════════════════════════     │  permute(object, IS_A)  │
   IS_A has a deterministic             │  [5, -3, 10, 8...]      │
   permutation table                    │  (dimensions shuffled)   │
                                        └─────────────────────────┘
                                             │
                                             ▼
   Step 4: Combine (saturated add)     ┌─────────────────────────┐
   ═══════════════════════════════     │  subject + permuted_obj │
                                       │  = result_vec           │
   result = subject_vec                │  [28, -8, 10, 20...]    │
          + permute(object_vec, IS_A)  │  (clamped to [-127,127])│
                                       └─────────────────────────┘
```

---

## 6. Syntax Rules

### 6.1 Valid Statement Forms (v3)

```sys2dsl
# Subject VERB Object - all three are separate concepts
@var subject RELATION object
@var subject VERB object
```

### 6.2 Valid Patterns Only

```sys2dsl
# CORRECT - use DIM_PAIR pattern
@p boiling_point DIM_PAIR Celsius100
@_ Water SET_DIM $p

# CORRECT - use direct relations
@_ Water BOILS_AT Celsius100

# CORRECT - use reification for complex cases
@fact WaterBoilingFact REIFY any
@_ WaterBoilingFact HAS_SUBJECT Water
@_ WaterBoilingFact HAS_VALUE Celsius100
```

### 6.3 Variable Composition

Variables can substitute for ANY concept:

```sys2dsl
@subj Water BIND any
@val Celsius100 BIND any

@p boiling_point DIM_PAIR $val
@_ $subj SET_DIM $p
# Sets water's boiling point to Celsius100
```

---

## 7. Examples Rewritten

### 7.1 Physical Properties

```sys2dsl
# DIM_PAIR pattern:
@p1 boiling_point DIM_PAIR Celsius100
@_ Water SET_DIM $p1

@p2 density DIM_PAIR Density787
@_ Iron SET_DIM $p2
@_ Density787 IS_A high_density

# Direct relation:
@_ Water BOILS_AT Celsius100
@_ Iron HAS_DENSITY Density787
```

### 7.2 Person Attributes

```sys2dsl
# DIM_PAIR pattern:
@p1 age DIM_PAIR Years30
@_ Alice SET_DIM $p1

@p2 occupation DIM_PAIR doctor
@_ Alice SET_DIM $p2

# Direct relations:
@_ Alice HAS_AGE Years30
@_ Alice IS_A doctor
@_ Alice WORKS_AS doctor
```

### 7.3 Configuration/Settings

```sys2dsl
# DIM_PAIR pattern:
@p timeout DIM_PAIR Milliseconds5000
@_ System SET_DIM $p

# With hierarchy:
@_ Milliseconds5000 IS_A duration
@_ Milliseconds5000 IS_A short_duration
@_ System HAS_TIMEOUT Milliseconds5000
```

---

## 8. Impact on Commands

### 8.1 Querying Facts (v3)

Query facts using subject-verb-object pattern:

```sys2dsl
# Find all facts about Water
@props Water FACTS any

# Find specific relationship
@boiling Water BOILS_AT any

# Find all things that boil at Celsius100
@substances any BOILS_AT Celsius100
```

### 8.2 Reasoning About Values

Values are concepts we can reason about:

```sys2dsl
# What substances boil at high temperatures?
@high_temps high_temperature INSTANCES any
@first_high $high_temps FIRST any
@substances any BOILS_AT $first_high
```

---

## 9. Implementation Changes Required

### 9.1 Parser Implementation (v3)

The v3 parser validates triple syntax and supports DIM_PAIR patterns.

### 9.2 Documentation Standard

All documentation uses v3 syntax with DIM_PAIR patterns.

### 9.3 Test Coverage

Tests verify:
- Proper handling of DIM_PAIR patterns
- Correct encoding of dimensional properties
- Triple syntax validation

---

## 10. Syntax Summary

Standard v3 triple syntax:

| Pattern | Syntax |
|---------|--------|
| DIM_PAIR pattern | `@p x DIM_PAIR y` then `@_ Subject SET_DIM $p` |
| Direct relation | `@_ Subject VERB Object` |
| Reification | `@fact F REIFY any` then `@_ F HAS_SUBJECT S` |

**Rule**: Command parameters (e.g., `inverse=REL` in DEFINE_RELATION) can use `=`, but subject-verb-object triplets must not.

---

## 11. Summary

1. **Everything is a point** in conceptual space
2. **No compression** of multiple points into one token
3. **Values are concepts** with their own position in space
4. **Relations connect points** - they don't embed data
5. **Triple syntax** for all subject-verb-object statements
6. **Variables compose** to build complex statements from simple points

---

## 12. Related Documents

- DS(/theory/Sys2DSL_syntax) - Language specification
- DS(/theory/Sys2DSL_commands) - Command reference
- DS(/core/bounded_diamond.js) - Geometric representation
- DS(/knowledge/concept_store.js) - Concept storage

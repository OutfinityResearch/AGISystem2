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

## 2. The Problem with `property=value`

### 2.1 What's Wrong

The syntax `subject HAS_PROPERTY property=value` is **geometrically incoherent** because it tries to encode multiple distinct points as a single token:

```
water HAS_PROPERTY boiling_point=100
       └────┬────┘ └──────┬──────┘
            │              │
     One relation    TWO concepts compressed!
                     (boiling_point AND 100)
```

### 2.2 The Hidden Structure

What this actually represents:

```
Point 1: water              (concept)
Point 2: boiling_point      (property concept)
Point 3: Celsius100         (value concept)

Relation A: water ──HAS_PROPERTY──► boiling_point
Relation B: boiling_point ──HAS_VALUE──► Celsius100
   OR
Relation C: water ──BOILS_AT──► Celsius100 (direct)
```

### Visual: Why property=value is Wrong

```
    WRONG (compressed):                    CORRECT (decomposed):
    ─────────────────────                  ─────────────────────────────────

    ┌───────────────────┐                  ┌─────────┐  HAS_PROPERTY  ┌──────────────┐
    │      water        │                  │  water  │ ─────────────► │ boiling_point│
    │                   │                  └─────────┘                └──────┬───────┘
    │ boiling_point=100 │  ← String,                                        │
    │   (NOT a point!)  │    no geometry!                                   │ HAS_VALUE
    └───────────────────┘                                                   ▼
                                                                   ┌───────────────┐
    Problem: "100" has no                                          │  Celsius100   │
    position in space!                                             │  (a POINT in  │
                                                                   │   space!)     │
                                                                   └───────────────┘
```

### 2.3 Why This Matters

1. **Reasoning**: Can't reason about `100` independently (e.g., "what else has value 100?")
2. **Queries**: Can't find all properties without parsing strings
3. **Composition**: Can't combine values as concepts
4. **Geometry**: The value has no position in space - it's just a string!

---

## 3. Correct Decomposition Patterns

### 3.1 Pattern A: Property-Value Chain

```sys2dsl
# Define the concepts
@c1 DEFINE_CONCEPT boiling_point
@c2 DEFINE_CONCEPT Celsius100

# Assert the relationships
@f1 ASSERT water HAS_PROPERTY boiling_point
@f2 ASSERT boiling_point OF_WATER HAS_VALUE Celsius100
```

**Pro**: Explicit structure
**Con**: Verbose, needs context (OF_WATER)

### 3.2 Pattern B: Reified Fact (Recommended for complex)

```sys2dsl
# Create a fact node that links everything
@fact1 DEFINE_CONCEPT WaterBoilingFact

@f1 ASSERT WaterBoilingFact SUBJECT water
@f2 ASSERT WaterBoilingFact PROPERTY boiling_point
@f3 ASSERT WaterBoilingFact VALUE Celsius100
```

**Pro**: Full flexibility, queryable
**Con**: Most verbose

### 3.3 Pattern C: Direct Relation (Recommended for simple)

```sys2dsl
# Use a specific relation that encodes the property
@f1 ASSERT water BOILS_AT Celsius100
```

**Pro**: Simple, one statement
**Con**: Requires defining many relations

### 3.4 Pattern D: Value as Concept

```sys2dsl
# The value itself is a concept in a measurement hierarchy
@f1 ASSERT Celsius100 IS_A temperature
@f2 ASSERT Celsius100 IS_A boiling_temperature
@f3 ASSERT water HAS_BOILING_POINT Celsius100
```

**Pro**: Values are first-class, can reason about them
**Con**: Need to define value concepts

---

## 4. Recommended Approach

### 4.1 Simple Properties: Use Direct Relations

For common properties, define specific relations:

```sys2dsl
# Define relations
@r1 DEFINE_RELATION BOILS_AT inverse=BOILING_POINT_OF
@r2 DEFINE_RELATION FREEZES_AT inverse=FREEZING_POINT_OF
@r3 DEFINE_RELATION WEIGHS inverse=WEIGHT_OF
@r4 DEFINE_RELATION HAS_COLOR inverse=COLOR_OF

# Use them directly
@f1 ASSERT water BOILS_AT Celsius100
@f2 ASSERT water FREEZES_AT Celsius0
@f3 ASSERT Elephant WEIGHS TonsScale5
@f4 ASSERT Sky HAS_COLOR Blue
```

### 4.2 Complex Properties: Use Reification

For properties that need context or metadata:

```sys2dsl
# "Water boils at 100°C at sea level pressure"
@fact DEFINE_CONCEPT WaterBoilingSeaLevel
@f1 ASSERT WaterBoilingSeaLevel SUBJECT water
@f2 ASSERT WaterBoilingSeaLevel RELATION BOILS_AT
@f3 ASSERT WaterBoilingSeaLevel VALUE Celsius100
@f4 ASSERT WaterBoilingSeaLevel CONDITION SeaLevelPressure
```

### 4.3 Value Hierarchies

Define values as concepts in hierarchies:

```sys2dsl
# Temperature values
@t1 ASSERT Celsius0 IS_A temperature
@t2 ASSERT Celsius100 IS_A temperature
@t3 ASSERT Celsius100 IS_A high_temperature
@t4 ASSERT Celsius0 IS_A low_temperature

# Now we can reason about temperatures
@q1 ASK Celsius100 IS_A high_temperature  # TRUE
@q2 INSTANCES_OF temperature      # All temperatures
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

### 6.1 Valid Statement Forms

```sys2dsl
# subject VERB complement - all three are separate points
@var ASSERT subject RELATION complement
@var ASK subject RELATION complement
@var PROVE subject RELATION complement
```

### 6.2 FORBIDDEN: Compound Tokens

```sys2dsl
# WRONG - property=value is not allowed
@f ASSERT water HAS_PROPERTY boiling_point=100

# WRONG - nested structures
@f ASSERT water HAS properties=[boiling_point, density]

# WRONG - inline JSON
@f ASSERT water DATA {"temp": 100}
```

### 6.3 Variable Composition

Variables can substitute for ANY point:

```sys2dsl
@subj BIND_CONCEPT water
@rel BIND_RELATION BOILS_AT
@val BIND_CONCEPT Celsius100

@fact ASSERT $subj $rel $val
# Expands to: water BOILS_AT Celsius100
```

---

## 7. Examples Rewritten

### 7.1 Physical Properties

```sys2dsl
# OLD (WRONG):
@f ASSERT water HAS_PROPERTY boiling_point=100
@f ASSERT iron HAS_PROPERTY density=7.87

# NEW (CORRECT):
@f1 ASSERT water BOILS_AT Celsius100
@f2 ASSERT iron HAS_DENSITY DensityIron
@f3 ASSERT DensityIron IS_A high_density
```

### 7.2 Person Attributes

```sys2dsl
# OLD (WRONG):
@f ASSERT Alice HAS_PROPERTY age=30
@f ASSERT Alice HAS_PROPERTY occupation=doctor

# NEW (CORRECT):
@f1 ASSERT Alice HAS_AGE Years30
@f2 ASSERT Alice HAS_OCCUPATION doctor
@f3 ASSERT Alice IS_A doctor
# Or simply:
@f4 ASSERT Alice IS_A person
@f5 ASSERT Alice WORKS_AS doctor
@f6 ASSERT Alice AGED Years30
```

### 7.3 Configuration/Settings

```sys2dsl
# OLD (WRONG):
@f ASSERT System HAS_SETTING timeout=5000

# NEW (CORRECT):
@f1 ASSERT System HAS_TIMEOUT Milliseconds5000
# Or with hierarchy:
@f2 ASSERT Milliseconds5000 IS_A duration
@f3 ASSERT Milliseconds5000 IS_A short_duration
```

---

## 8. Impact on Commands

### 8.1 FACTS_MATCHING (Polymorphic)

FACTS_MATCHING supports 0-3 arguments:

```sys2dsl
# Find all things that boil at some temperature (use specialized command)
@results FACTS_WITH_RELATION BOILS_AT

# Find all properties of water (multiple relations, 2-arg form)
@props1 FACTS_MATCHING water BOILS_AT
@props2 FACTS_MATCHING water FREEZES_AT
@props3 FACTS_MATCHING water HAS_DENSITY
@all MERGE_LISTS $props1 $props2
@all2 MERGE_LISTS $all $props3
```

### 8.2 Reasoning About Values

Now values are concepts we can reason about:

```sys2dsl
# What substances boil at high temperatures?
@high_temps INSTANCES_OF high_temperature
@first_high PICK_FIRST $high_temps
@substances FACTS_WITH_OBJECT $first_high
```

---

## 9. Implementation Changes Required

### 9.1 Parser Update

The parser MUST reject `=` in tokens (except in command parameters like `inverse=`):

```javascript
// In dsl_engine.js
if (token.includes('=') && !isCommandParameter(token)) {
  throw new Error(`Invalid token '${token}': property=value syntax not allowed. Use separate concepts.`);
}
```

### 9.2 Documentation Update

All examples using `property=value` must be rewritten.

### 9.3 Test Update

Add tests that verify rejection of `property=value`.

---

## 10. Migration Guide

For existing code using `property=value`:

| Old Syntax | New Syntax |
|------------|------------|
| `HAS_PROPERTY x=y` | `HAS_X Y` or `X IS Y` |
| `threshold=5` | Keep for command params only |
| `name="value"` | Keep for command params only |
| `inverse=REL` | Keep for DEFINE_RELATION |

**Rule**: `=` is only valid in **command parameters**, never in **triplet arguments**.

---

## 11. Summary

1. **Everything is a point** in conceptual space
2. **No compression** of multiple points into one token
3. **Values are concepts** with their own position in space
4. **Relations connect points** - they don't embed data
5. **`property=value` is forbidden** in triplets
6. **Variables compose** to build complex statements from simple points

---

## 12. Related Documents

- DS(/theory/Sys2DSL_syntax) - Language specification
- DS(/theory/Sys2DSL_commands) - Command reference
- DS(/core/bounded_diamond.js) - Geometric representation
- DS(/knowledge/concept_store.js) - Concept storage

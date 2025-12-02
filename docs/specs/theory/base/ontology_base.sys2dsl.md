# Specification: Base Ontology Theory

ID: DS(/theory/base/ontology_base.sys2dsl)

Source: `@data/init/theories/base/ontology_base.sys2dsl`

Status: v3.0

## Purpose

Defines **foundational facts about the world** - the core ontology that serves as common ground for all reasoning. This is the "what is" dimension of knowledge.

## Design Rationale

### Ontology vs Axiology

AGISystem2 separates knowledge into two partitions:

| Partition | Content | Example |
|-----------|---------|---------|
| **Ontology** | Facts about the world | "Dogs are mammals" |
| **Axiology** | Values and norms | "Honesty is good" |

This separation enables:
- Bias-free factual queries (mask axiology)
- Value-aware reasoning (include both)
- Clear audit trails (which partition influenced decision)

### Upper Ontology Approach

The base ontology follows an "upper ontology" design:
- Top-level categories applicable to any domain
- Hierarchical structure for inheritance
- Disjointness constraints to prevent inconsistency

### Syntax

Uses triple-based syntax for all facts:
```sys2dsl
@_ Dog IS_A mammal
```

## Ontology Structure

### Section 1: Fundamental Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPPER ONTOLOGY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        thing                                    │
│                          │                                      │
│                       entity                                    │
│                      /      \                                   │
│        physical_entity      abstract_entity                     │
│          /    |    \            /    |    \                     │
│      object  substance  event  concept  number  property        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Facts**:
```sys2dsl
@_ entity IS_A thing
@_ physical_entity IS_A entity
@_ abstract_entity IS_A entity
@_ physical_entity DISJOINT_WITH abstract_entity
```

**Design Decision**: `physical_entity` and `abstract_entity` are disjoint - nothing can be both.

### Section 2: Living Things

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIVING THINGS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   living_thing                                  │
│                       │                                         │
│                   organism                                      │
│                   /       \                                     │
│               animal      plant                                 │
│                  │                                              │
│             vertebrate                                          │
│          /    |    |    \    \                                  │
│      mammal  bird  reptile  fish  amphibian                     │
│       /  \                                                      │
│    dog  cat  human  horse  whale                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Facts**:
```sys2dsl
@_ animal IS_A organism
@_ plant IS_A organism
@_ animal DISJOINT_WITH plant

@_ mammal IS_A vertebrate
@_ mammal DISJOINT_WITH bird
@_ mammal DISJOINT_WITH reptile

@_ dog IS_A mammal
@_ cat IS_A mammal
@_ human IS_A mammal
```

### Section 3: Physical Properties

**States of Matter**:
```sys2dsl
@_ solid IS_A physical_state
@_ liquid IS_A physical_state
@_ gas IS_A physical_state
@_ solid DISJOINT_WITH liquid
@_ solid DISJOINT_WITH gas
@_ liquid DISJOINT_WITH gas
```

**Common Substances**:
```sys2dsl
@_ water IS_A substance
@_ air IS_A substance
@_ metal IS_A substance
```

### Section 4: Spatial Relations

**Geographic Hierarchy**:
```
location → place/region → country/city/building
                       → continent
```

**Key Facts**:
```sys2dsl
@_ place IS_A location
@_ region IS_A location
@_ country IS_A region
@_ continent IS_A region
@_ city IS_A place

# Continents
@_ Europe IS_A continent
@_ Asia IS_A continent
@_ Africa IS_A continent
```

### Section 5: Temporal Relations

```sys2dsl
@_ past BEFORE present
@_ present BEFORE future
@_ cause BEFORE effect
```

### Section 6: Causal Relations

Universal causal facts:
```sys2dsl
@_ heat CAUSES expansion
@_ cold CAUSES contraction
@_ fire REQUIRES oxygen
@_ life REQUIRES water
@_ life REQUIRES energy
```

### Section 7: Human Roles

**Professional Hierarchy**:
```
person → professional → medical_professional → doctor/nurse
                     → engineer → software_engineer
                     → teacher
```

**Capabilities**:
```sys2dsl
@_ medical_professional CAN diagnose
@_ medical_professional CAN treat
@_ doctor CAN prescribe
@_ engineer CAN design
@_ teacher CAN educate
```

### Section 8: Artifacts

```sys2dsl
@_ artifact IS_A physical_entity
@_ tool IS_A artifact
@_ vehicle IS_A artifact
@_ machine IS_A artifact

@_ car IS_A vehicle
@_ car HAS wheel
@_ boat IS_A vehicle
@_ boat DISJOINT_WITH wheeled_vehicle
```

### Section 9: Logical Facts

```sys2dsl
@_ true DISJOINT_WITH false
@_ mortal DISJOINT_WITH immortal
@_ human IS_A mortal
@_ alive DISJOINT_WITH dead
```

## DISJOINT_WITH Semantics

The `DISJOINT_WITH` relation enforces mutual exclusion:

```sys2dsl
@_ A DISJOINT_WITH B
# Means: nothing can be both A and B
# If X IS_A A, then X ISNT_A B (automatically)
```

**Implementation**:
- Stored as negative correlation in conceptual space
- Contradiction detected if X asserted as both A and B
- Used for consistency checking

## Inheritance Semantics

Properties flow down IS_A chains:

```sys2dsl
@_ mammal IS_A vertebrate
@_ vertebrate IS_A animal
@_ animal IS_A living_thing

# Inference: mammal IS_A living_thing (transitive)
```

**Capabilities inherit**:
```sys2dsl
@_ doctor IS_A medical_professional
@_ medical_professional CAN diagnose
# Inference: doctor CAN diagnose
```

## Usage Patterns

### Querying Categories

```sys2dsl
# What mammals exist?
@mammals any IS_A mammal
# [dog, cat, human, horse, whale, ...]

# What can doctors do?
@abilities doctor CAN any
# [diagnose, treat, prescribe]
```

### Checking Consistency

```sys2dsl
# This should fail:
@_ Platypus IS_A mammal
@_ Platypus IS_A bird      # ERROR: mammal DISJOINT_WITH bird
```

### Spatial Reasoning

```sys2dsl
@_ Paris LOCATED_IN France
@_ France LOCATED_IN Europe
@r Paris LOCATED_IN Europe    # TRUE (transitive)
```

## Extension Guidelines

### Adding Domain Knowledge

When extending the ontology:

1. **Find appropriate parent**
   ```sys2dsl
   @_ Database IS_A software        # software IS_A artifact
   ```

2. **Add disjointness where needed**
   ```sys2dsl
   @_ relational_db IS_A Database
   @_ nosql_db IS_A Database
   @_ relational_db DISJOINT_WITH nosql_db
   ```

3. **Define capabilities**
   ```sys2dsl
   @_ Database CAN store_data
   @_ relational_db CAN join_tables
   ```

### Namespace Convention

Domain-specific extensions should use prefixes:
```sys2dsl
@_ med_symptom IS_A property           # Medical domain
@_ fin_asset IS_A abstract_entity      # Financial domain
```

## Protection Status

The base ontology is:
- **Protected**: Cannot be forgotten
- **Core**: Essential for system operation
- **Read-only**: Cannot be modified in sessions

```sys2dsl
# At load time:
@_ ontology_base PROTECT any
@_ ontology_base CORE any
@_ ontology_base SET_READONLY any
```

## See Also

- [axiology_base.sys2dsl.md](./axiology_base.sys2dsl.md) - Values and norms
- [query.sys2dsl.md](./query.sys2dsl.md) - Querying the ontology
- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Inference over ontology
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Dimension model

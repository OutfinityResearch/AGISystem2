# Design Spec: data/init/theories/base/ontology_base.sys2dsl

ID: DS(/init/ontology_base)

Status: IMPLEMENTED v1.0

## 1. Purpose

Base ontology theory containing foundational facts about the world. This theory is **automatically loaded at system initialization** by `TheoryPreloader` and provides the universal conceptual framework for all reasoning.

**File**: `data/init/theories/base/ontology_base.sys2dsl`
**Format**: Sys2DSL
**Fact Count**: ~90 facts
**Auto-loaded**: Yes (via TheoryPreloader)

---

## 2. Ontological Structure

### 2.1 Upper Ontology (Sections 1-2)

```
thing
└── entity
    ├── physical_entity
    │   ├── object
    │   ├── substance
    │   ├── event
    │   ├── process
    │   ├── living_thing
    │   │   └── organism
    │   │       ├── animal (→ vertebrate/invertebrate → mammal/bird/reptile/fish)
    │   │       └── plant
    │   └── artifact
    │       ├── tool
    │       ├── vehicle
    │       └── machine
    └── abstract_entity
        ├── concept
        ├── number
        ├── property
        ├── relation
        └── location
            ├── place (city, building)
            └── region (country, continent)
```

### 2.2 Disjointness Constraints

Key mutual exclusions enforced:
- `physical_entity` ⊥ `abstract_entity`
- `animal` ⊥ `plant`
- `vertebrate` ⊥ `invertebrate`
- `mammal` ⊥ `bird` ⊥ `reptile` ⊥ `fish`
- `solid` ⊥ `liquid` ⊥ `gas`
- `true` ⊥ `false`
- `alive` ⊥ `dead`
- `mortal` ⊥ `immortal`

---

## 3. Content Sections

### Section 1: Fundamental Category Hierarchy (f001-f012)
- Top-level distinction: physical vs abstract entities
- Physical: objects, substances, events, processes
- Abstract: concepts, numbers, properties, relations

### Section 2: Living Things Hierarchy (f020-f047)
- Organism taxonomy through vertebrate classes
- Common animal instances (dog, cat, human, whale, sparrow, etc.)
- Penguin included for default reasoning tests (bird that can't fly)

### Section 3: Physical Properties and States (f050-f063)
- States of matter: solid, liquid, gas, plasma
- Common substances: water, air, metal, wood

### Section 4: Spatial Relations (f070-f086)
- Geographic hierarchy: location → place/region → country/continent/city
- All 7 continents as instances

### Section 5: Temporal Relations (f090-f092)
- Basic temporal ordering: past → present → future
- Causal ordering: cause → effect

### Section 6: Causal Relations (f100-f105)
- Physical causation: heat→expansion, cold→contraction
- Requirements: fire→oxygen, combustion→fuel, life→water/energy

### Section 7: Human Roles and Professions (f110-f124)
- Professional hierarchy: professional → medical/engineer/teacher
- Capabilities via CAN relation (inherited by subtypes)

### Section 8: Artifacts and Vehicles (f130-f143)
- Artifact taxonomy: tool, vehicle, machine
- Vehicle types with wheel properties

### Section 9: Fundamental Logical Facts (f150-f153)
- Logical opposites: true⊥false, alive⊥dead, mortal⊥immortal
- Human mortality assertion

---

## 4. Usage in System

### Loading
```javascript
// Automatic via TheoryPreloader at session creation
const session = agent.createSession(); // Loads ontology_base automatically

// Manual loading
session.execute('@_ LOAD_THEORY ontology_base');
```

### Querying
```sys2dsl
# Check taxonomy
@result ASK "Is dog a mammal?"        # TRUE_CERTAIN
@result ASK "Is dog an animal?"       # TRUE_CERTAIN (transitive)
@result ASK "Is whale a fish?"        # FALSE (whale IS_A mammal)

# Check disjointness
@result CHECK_WOULD_CONTRADICT Fido IS_A cat  # If Fido IS_A dog
```

### Extension
```sys2dsl
# Add domain-specific facts on top of base ontology
@_ ASSERT Fido IS_A dog
@_ ASSERT Fido LOCATED_IN Paris
```

---

## 5. Design Rationale

1. **Upper Ontology First**: Establishes fundamental categories before instances
2. **Disjointness Early**: Prevents contradictions via ContradictionDetector
3. **Inheritance-Ready**: Properties on types (e.g., `medical_professional CAN diagnose`) inherited by instances
4. **Test-Friendly**: Includes classic examples (penguin/bird, whale/mammal) for reasoning tests
5. **Minimal but Complete**: Covers common reasoning scenarios without bloat

---

## 6. Related Documents

- DS(/init/axiology_base) - Companion theory for values/ethics
- DS(/theory/theory_preloader.js) - Loads this theory automatically
- DS(/knowledge/concept_store.js) - Stores the loaded facts
- DS(/reason/contradiction_detector.js) - Enforces disjointness constraints

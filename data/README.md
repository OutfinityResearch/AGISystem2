# AGISystem2 Data Directory

This directory contains initialization data and base theories for AGISystem2.

## Directory Structure

```
data/
├── init/                      # Initialization data
│   ├── cache/                 # Precompiled theory caches (auto-generated)
│   │   ├── ontology_base.cache.json
│   │   └── axiology_base.cache.json
│   ├── theories/              # Base theories loaded at startup
│   │   └── base/              # Foundational theories
│   │       ├── ontology_base.sys2dsl   # 93 ontology facts
│   │       └── axiology_base.sys2dsl   # 63 axiology facts
│   ├── config_profile.json    # Default configuration profile
│   ├── dimensions.json        # Dimension axis definitions
│   └── relations.json         # Relation type definitions
└── README.md
```

## Base Theories

### ontology_base.sys2dsl
Foundational facts about the world:
- **Categories**: entity, physical_entity, abstract_entity, object, substance
- **Living things**: organism, animal, plant, mammal, bird, reptile, fish
- **Common entities**: dog, cat, human, car, boat, airplane
- **Geography**: continent, country, city (Europe, Asia, etc.)
- **Temporal**: past BEFORE present, present BEFORE future
- **Causal**: heat CAUSES expansion, fire REQUIRES oxygen
- **Roles**: doctor IS_A medical_professional, engineer IS_A professional

### axiology_base.sys2dsl
Foundational facts about values and ethics:
- **Moral categories**: good, bad, neutral, harm, benefit
- **Deontic modalities**: obligation, permission, prohibition
- **Universal ethics**: murder PROHIBITED_BY universal_ethics
- **Rights**: life IS_A human_right, liberty IS_A human_right
- **Professional ethics**: patient_consent REQUIRED_FOR medical_treatment
- **Fairness**: gender NOT_FACTOR_IN hiring_decision

## Configuration Files

### dimensions.json
Defines the 1024-dimensional semantic space:
- Axis definitions (name, index, partition)
- Property mappings (boiling_point → Temperature axis)
- Relation mappings (IS_A → Physicality axis)
- Relation properties (transitive, symmetric, inverse)

### relations.json
Defines relation types with their properties:
- Inverse relations (PART_OF ↔ HAS_PART)
- Transitivity (IS_A is transitive)
- Symmetry (EQUIVALENT_TO is symmetric)
- Domain/range hints

## Cache Files

The `cache/` directory contains precompiled JSON versions of base theories.
These are auto-generated on first load and provide ~10x faster initialization.

**Do not edit cache files manually** - they are regenerated when source files change.

To force cache rebuild:
```javascript
const TheoryPreloader = require('./src/theory/theory_preloader');
const preloader = new TheoryPreloader({ conceptStore });
preloader.rebuildCaches();
```

## Adding New Base Facts

1. Edit the appropriate `.sys2dsl` file in `theories/base/`
2. Use the format: `@fXXX ASSERT subject RELATION object`
3. Delete the corresponding cache file (optional - auto-invalidates on mtime)
4. Restart the system

Example:
```dsl
# Add a new animal
@f200 ASSERT elephant IS_A mammal
@f201 ASSERT elephant HAS trunk
```

## Test Fixtures

Test-specific theories are in `tests/fixtures/theories/`, not in this directory.
This keeps base data clean and auditable.

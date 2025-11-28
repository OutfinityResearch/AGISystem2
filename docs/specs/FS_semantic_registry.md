# FS: Semantic Registry - Single Source of Truth for Dimensions and Relations

## Purpose

This specification establishes the **Semantic Registry** pattern: a single, canonical source of truth for all semantic definitions in AGISystem2. This eliminates hardcoded dimension indices, relation properties, and partition boundaries scattered throughout the codebase.

## Problem Statement

### Before (Anti-Pattern)

Semantic knowledge was duplicated across multiple files:

```javascript
// In encoder.js - WRONG: hardcoded dimension indices
const propertyAxes = {
  boiling_point: 4,  // Temperature axis
  temperature: 4,
  weight: 2,         // Mass axis
};

// In inference_engine.js - WRONG: hardcoded relation properties
this.relationProperties.set('IS_A', { transitive: true, symmetric: false });
this.relationProperties.set('CAUSES', { inverse: 'CAUSED_BY' });

// In config.js - WRONG: hardcoded partition boundaries
config.ontologyPartition = { start: 0, end: 255 };
config.axiologyPartition = { start: 256, end: 383 };
```

**Issues:**
- Changes require modifying multiple files
- Easy to introduce inconsistencies
- No validation that mappings reference valid axes
- Difficult to extend with new properties/relations

### After (Correct Pattern)

All semantic definitions live in `data/init/dimensions.json`:

```json
{
  "axes": [...],
  "partitions": {...},
  "propertyMappings": {...},
  "relationMappings": {...},
  "relationProperties": {...}
}
```

Code reads from `DimensionRegistry`:

```javascript
// CORRECT: lookup from registry
const axis = this.dimRegistry.getPropertyAxis('temperature');
const props = this.dimRegistry.getRelationProperties('IS_A');
```

## Functional Requirements

### FS-SR-01: Single Source of Truth

All semantic definitions MUST be stored in `data/init/dimensions.json`. This includes:

| Category | Description | Example |
|----------|-------------|---------|
| **Axes** | Dimension definitions with index, name, partition | `{ index: 4, name: "Temperature", partition: "ontology" }` |
| **Partitions** | Dimension range boundaries | `{ ontology: { start: 0, end: 255 } }` |
| **Property Mappings** | Property name → axis name | `{ "boiling_point": "Temperature" }` |
| **Relation Mappings** | Relation → activated axes | `{ "IS_A": ["Physicality"] }` |
| **Relation Properties** | Logical properties of relations | `{ "IS_A": { transitive: true, symmetric: false } }` |

### FS-SR-02: DimensionRegistry Module

A `DimensionRegistry` class (`src/core/dimension_registry.js`) MUST:

1. Load definitions from `dimensions.json` at initialization
2. Provide lookup methods:
   - `getAxisIndex(name)` → number
   - `getPropertyAxis(propertyName)` → number
   - `getRelationAxes(relationName)` → number[]
   - `getRelationProperties(relationName)` → { transitive, symmetric, inverse }
   - `getPartition(name)` → { start, end }
3. Support runtime extension via `addPropertyMapping()`, `addRelationMapping()`
4. Provide a singleton instance via `DimensionRegistry.getShared()`

### FS-SR-03: No Hardcoded Indices in Code

Source files MUST NOT contain:

- **Magic numbers** for dimension indices (e.g., `vec[4]` meaning temperature)
- **Inline mappings** of property names to indices
- **Inline relation properties** (transitive, symmetric, inverse)
- **Hardcoded partition boundaries** (0-255, 256-383, etc.)

**Exception:** Loop indices and array bounds checks using `this.dimensions` are allowed.

### FS-SR-04: Validation at Load Time

The test suite MUST validate at load time:

1. All `propertyMappings` reference existing axis names
2. All `relationMappings` reference existing axis names
3. All `relationProperties` have valid inverse references
4. Partition boundaries don't overlap
5. Axis indices are unique and within valid ranges

### FS-SR-05: Backwards Compatibility

When adding new axes or properties:

1. Existing axis indices MUST NOT change
2. New axes SHOULD use previously unused indices
3. Partition boundaries are considered immutable once deployed

## Data Schema

### dimensions.json Structure

```json
{
  "axes": [
    {
      "index": 0,
      "name": "Physicality",
      "partition": "ontology",
      "description": "Degree to which an entity occupies physical space",
      "reserved": false
    }
  ],

  "partitions": {
    "ontology": { "start": 0, "end": 255 },
    "axiology": { "start": 256, "end": 383 },
    "empirical": { "start": 384, "end": null }
  },

  "propertyMappings": {
    "temperature": "Temperature",
    "boiling_point": "Temperature",
    "mass": "MassScale",
    "weight": "MassScale",
    "size": "SizeScale"
  },

  "relationMappings": {
    "IS_A": ["Physicality"],
    "PART_OF": ["Mereological"],
    "CAUSES": ["CausalityStrength"],
    "PERMITS": ["MoralValence"]
  },

  "relationProperties": {
    "IS_A": { "transitive": true, "symmetric": false },
    "PART_OF": { "transitive": true, "symmetric": false },
    "EQUIVALENT_TO": { "transitive": true, "symmetric": true },
    "DISJOINT_WITH": { "transitive": false, "symmetric": true },
    "CAUSES": { "inverse": "CAUSED_BY" },
    "CAUSED_BY": { "inverse": "CAUSES" },
    "PARENT_OF": { "inverse": "CHILD_OF" },
    "CHILD_OF": { "inverse": "PARENT_OF" },
    "HAS_PART": { "inverse": "PART_OF" },
    "CONTAINS": { "inverse": "LOCATED_IN" }
  }
}
```

## Migration Guide

### For Existing Code

1. **Find hardcodings:**
   ```bash
   grep -rn "vec\[[0-9]\+\]" src/
   grep -rn "transitive.*true\|symmetric.*true" src/
   ```

2. **Replace with registry lookups:**
   ```javascript
   // Before
   vec[4] = value;  // temperature

   // After
   const axis = this.dimRegistry.getPropertyAxis('temperature');
   if (axis !== undefined) vec[axis] = value;
   ```

3. **Inject DimensionRegistry:**
   ```javascript
   constructor({ config, dimRegistry }) {
     this.dimRegistry = dimRegistry || DimensionRegistry.getShared();
   }
   ```

### For New Code

Always use the registry:

```javascript
// Looking up property axis
const tempAxis = registry.getPropertyAxis('temperature');

// Looking up relation axes
const axes = registry.getRelationAxes('IS_A');

// Checking relation properties
const props = registry.getRelationProperties('CAUSES');
if (props.inverse) {
  // handle inverse relation
}
```

## Compliance Checklist

Before merging code, verify:

- [ ] No new hardcoded dimension indices
- [ ] No new inline relation property definitions
- [ ] New properties/relations added to dimensions.json
- [ ] Tests validate new mappings exist in registry
- [ ] DimensionRegistry injected where needed

## Related Specifications

- **FS-01**: Concept Representation (dimension count configuration)
- **FS-12**: Safety & Bias Controls (partition separation)
- **FS-14**: Sys2DSL (relation semantics in queries)

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-28 | Initial specification |

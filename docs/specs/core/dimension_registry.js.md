# Design Spec: src/core/dimension_registry.js

ID: DS(/core/dimension_registry.js)

Class `DimensionRegistry`
- **Role**: Central registry for dimension semantics. Loads dimension definitions from `dimensions.json` and provides lookup methods for property→axis and relation→axes mappings. Eliminates hardcoded dimension indices throughout the codebase.
- **Pattern**: Singleton with shared instance; Service Locator for dimension metadata.
- **Key Collaborators**: `Config`, `RelationPermuter`, `Encoder`, `DSLCommandsCore`.

## Public API

### Constructor
```javascript
constructor(options = {})
```
- `options.dimensionsPath` - Path to dimensions.json (default: `data/init/dimensions.json`)
- `options.spec` - Pre-loaded spec object (for testing)

### Axis Lookup
```javascript
getAxisIndex(name: string): number | undefined
getAxisByIndex(index: number): Object | undefined
getAxis(name: string): Object | undefined
getAxisNames(): string[]
```

### Property Mappings
```javascript
getPropertyAxis(propertyName: string): number | undefined
hasProperty(propertyName: string): boolean
getPropertyNames(): string[]
addPropertyMapping(propertyName: string, axisName: string): boolean
```

### Relation Mappings
```javascript
getRelationAxes(relationName: string): number[]
hasRelation(relationName: string): boolean
getRelationNames(): string[]
addRelationMapping(relationName: string, axisNames: string[]): boolean
```

### Relation Properties
```javascript
getRelationProperties(relationName: string): { transitive: boolean, symmetric: boolean, inverse: string|null }
isRelation(relationName: string, property: string): boolean
getInverseRelation(relationName: string): string | null
getRelationPropertyNames(): string[]
```

### Partitions
```javascript
getPartition(name: string): { start: number, end: number } | undefined
getPartitionNames(): string[]
```

### Serialization
```javascript
toSpec(): Object  // Export current state for serialization
```

### Static Methods
```javascript
DimensionRegistry.getShared(options?): DimensionRegistry  // Get singleton instance
DimensionRegistry.resetShared(): void  // Reset singleton (for testing)
```

## Internal Structure

```javascript
{
  axes: Map<string, AxisDefinition>,      // name → { name, index, type, ... }
  axesByIndex: Map<number, AxisDefinition>, // index → AxisDefinition
  propertyMappings: { [propertyName]: axisName },
  relationMappings: { [relationName]: [axisName, ...] },
  relationProperties: { [relationName]: { transitive, symmetric, inverse } },
  partitions: { [partitionName]: { start, end } }
}
```

## Usage Examples

### Basic Axis Lookup
```javascript
const dimReg = DimensionRegistry.getShared();
const tempIndex = dimReg.getAxisIndex('Temperature');  // → 0
const axis = dimReg.getAxisByIndex(0);  // → { name: 'Temperature', index: 0, ... }
```

### Property to Axis Mapping
```javascript
const axis = dimReg.getPropertyAxis('boiling_point');  // → Temperature axis index
```

### Relation Properties
```javascript
const props = dimReg.getRelationProperties('IS_A');
// → { transitive: true, symmetric: false, inverse: null }

if (dimReg.isRelation('SIBLING_OF', 'symmetric')) {
  // handle symmetric relation
}
```

### Runtime Extension
```javascript
dimReg.addPropertyMapping('melting_point', 'Temperature');
dimReg.addRelationMapping('WORKS_FOR', ['Organization', 'Role']);
```

## Configuration Source

Loaded from `data/init/dimensions.json`:
```json
{
  "axes": [
    { "name": "Temperature", "index": 0, "type": "continuous" },
    { "name": "Taxonomy", "index": 1, "type": "hierarchical" }
  ],
  "propertyMappings": {
    "boiling_point": "Temperature",
    "mass": "Mass"
  },
  "relationMappings": {
    "IS_A": ["Taxonomy"],
    "LOCATED_IN": ["Location"]
  },
  "relationProperties": {
    "IS_A": { "transitive": true },
    "SIBLING_OF": { "symmetric": true },
    "PARENT_OF": { "inverse": "CHILD_OF" }
  },
  "partitions": {
    "ontology": { "start": 0, "end": 255 },
    "axiology": { "start": 256, "end": 511 }
  }
}
```

## Notes/Constraints
- Singleton pattern ensures consistent dimension semantics across system
- Graceful degradation: works without dimensions.json (empty mappings)
- Runtime mappings do not persist - use for session-specific extensions only
- Relation properties are the single source of truth (replaces hardcoded checks)

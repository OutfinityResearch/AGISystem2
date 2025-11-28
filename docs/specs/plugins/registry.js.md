# Design Spec: src/plugins/registry.js

ID: DS(/plugins/registry.js)

Class `PluginRegistry`
- **Role**: Manages external computation plugins (math, physics, chemistry, logic, datetime) that handle formal operations on computable concepts. Provides uniform interface for plugin registration, relation mapping, and evaluation delegation.
- **Pattern**: Registry/Facade. SOLID: single responsibility for plugin coordination; plugins handle domain-specific computation.
- **Key Collaborators**: `MathPlugin`, `ConceptStore`, `dimensions.json` (for relation→plugin mappings).

## Public API

- `constructor(config)`: Initialize registry, load dimension config for relation→plugin mappings.
- `register(name, plugin)`: Register a compute plugin by name. Plugin must implement `evaluate(relation, subject, object)`.
- `isComputable(relation)`: Returns true if relation is handled by a registered plugin.
- `getPluginForRelation(relation)`: Get plugin instance for a relation.
- `evaluate(relation, subject, object)`: Delegate computation to appropriate plugin.
- `extractNumericValue(conceptLabel, store)`: Extract numeric value from concept (via HAS_VALUE facts or label parsing).
- `listPlugins()`: Return array of registered plugin names.
- `listComputableRelations()`: Return array of { relation, plugin } objects.

## Pseudocode

```js
class PluginRegistry {
  constructor(config) {
    this.plugins = new Map();           // name → plugin instance
    this.relationToPlugin = new Map();  // relation → plugin name
    this._loadDimensionConfig();        // build relation mapping from dimensions.json
  }

  _loadDimensionConfig() {
    // Load data/init/dimensions.json
    // For each relation in relationProperties with 'computable' field:
    //   relationToPlugin.set(relation, props.computable)
  }

  register(name, plugin) {
    if (!plugin.evaluate || typeof plugin.evaluate !== 'function') {
      throw new Error(`Plugin ${name} must implement evaluate() method`);
    }
    this.plugins.set(name, plugin);
    // Register all relations from plugin.relations array
    for (const relation of plugin.relations) {
      this.relationToPlugin.set(relation, name);
    }
  }

  isComputable(relation) {
    return this.relationToPlugin.has(relation);
  }

  evaluate(relation, subject, object) {
    const plugin = this.getPluginForRelation(relation);
    if (!plugin) {
      return { truth: 'UNKNOWN', confidence: 0, method: 'no_plugin' };
    }
    try {
      const result = plugin.evaluate(relation, subject, object);
      return { ...result, method: 'computed', plugin: this.relationToPlugin.get(relation) };
    } catch (err) {
      return { truth: 'UNKNOWN', confidence: 0, method: 'compute_error', error: err.message };
    }
  }

  extractNumericValue(conceptLabel, store) {
    // 1. Try HAS_VALUE facts from store
    // 2. Try parsing from label: "celsius_20" → 20, "meters_100" → 100
    // 3. Try pure numeric label: "42" → 42
    // Returns: { value: number, raw: string } or null
  }
}
```

## Plugin Interface Contract

Every compute plugin must implement:

```js
{
  name: string,              // Plugin identifier (e.g., 'math', 'physics')
  relations: string[],       // Relations this plugin handles
  evaluate(relation, subject, object): {
    truth: 'TRUE_CERTAIN' | 'FALSE' | 'UNKNOWN' | 'PLAUSIBLE',
    confidence: number,      // 0.0 to 1.0
    value?: any,             // Computed value for arithmetic ops
    computed?: string,       // Human-readable computation string
    reason?: string          // Explanation for UNKNOWN results
  }
}
```

## Configuration (dimensions.json)

Computable relations are declared in `data/init/dimensions.json`:

```json
{
  "relationProperties": {
    "LESS_THAN": { "computable": "math", ... },
    "PLUS": { "computable": "math", ... },
    "CONVERTS_TO": { "computable": "physics", ... }
  },
  "computePlugins": {
    "math": {
      "relations": ["LESS_THAN", "GREATER_THAN", ...],
      "dimensions": ["NumericValue", "NumericScale"],
      "description": "Arithmetic operations and numeric comparisons"
    }
  }
}
```

## Notes/Constraints
- Plugins are stateless; evaluation must not modify any state.
- Results must match the standard reasoning result structure for uniform handling.
- Plugin registration happens at Reasoner construction time.
- Unknown plugins or missing evaluate methods result in graceful UNKNOWN responses.
- Numeric value extraction supports multiple formats for flexibility (label suffixes, prefixes, embedded numbers).

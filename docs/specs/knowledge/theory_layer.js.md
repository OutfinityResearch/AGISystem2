# Design Spec: src/knowledge/theory_layer.js

ID: DS(/knowledge/theory_layer.js)

Class `TheoryLayer`
- **Role**: Contextual overlay specifying overrides (min/max/radius/masks) on dimensions for a set of concepts; supports non-monotonic logic and counterfactuals.
- **Pattern**: Data class with provenance; SOLID: single responsibility for one layer’s overrides.
- **Key Collaborators**: `TheoryStack`, `Reasoner`, `BiasController`, `ValidationEngine`, `Config`.

## State
- `id`, `label`, `priority`.
- `definitionMask`: Uint8Array; dims with opinions.
- `overrideMin`, `overrideMax`: Int8Array sized to dimensions.
- `overrideRadius`: optional scalar.
- `axiologyMask` (optional): highlight value-centric axes.
- `metadata`: provenance (source doc, timestamp).

## Public API
- `constructor(config, params)`: allocate buffers per dimensions; set metadata/priority.
- `applyTo(diamond)`: returns a synthesized view with overrides applied (non-mutating).
- `covers(dimIndex)`: boolean if mask has bit set.
- `toJSON()`: provenance-safe serialization for audit/export.

## Pseudocode (comments)
```js
class TheoryLayer {
  constructor(config, params) {
    // alloc masks/vectors; copy provided overrides; store priority/metadata
  }

  applyTo(baseDiamond) {
    // clone base; for each dim where mask=1, set min/max/radius from overrides if defined
    // return synthesized diamond (new instance or view)
  }

  covers(dim) { /* read bit from definitionMask */ }

  toJSON() { /* return plain object with ids, masks (maybe hashed), provenance */ }
}
```

## Notes/Constraints
- Must be immutable after creation to keep determinism; changes require new instance.
- Masks limited to configured dimensions; enforce validity at construction.
- Avoid concept IDs inside layer; applies broadly via stack logic.***

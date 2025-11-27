# Design Spec: src/knowledge/theory_layer.js

ID: DS(/knowledge/theory_layer.js)

Class `TheoryLayer`
- **Role**: Contextual overlay specifying overrides (min/max/radius/masks) on dimensions for a set of concepts; supports non-monotonic logic and counterfactuals.
- **Pattern**: Data class with provenance; SOLID: single responsibility for one layer's overrides.
- **Key Collaborators**: `TheoryStack`, `Reasoner`, `BiasController`, `ValidationEngine`, `Config`.

## Visual: TheoryLayer Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TheoryLayer Structure                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   TheoryLayer = "Override specification for specific dimensions"            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  TheoryLayer: "Law_Minimal"                                         │   │
│   │  ────────────────────────────                                       │   │
│   │  id: "layer_001"                                                    │   │
│   │  label: "Law_Minimal"                                               │   │
│   │  priority: 10   ← Higher priority overrides lower                   │   │
│   │                                                                     │   │
│   │  definitionMask (which dims this layer affects):                    │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │ dims: 0   1   2   3   ...  256  257  258  ...  383  384      │   │   │
│   │  │       0   0   0   0   ...   1    1    1   ...   1    0       │   │   │
│   │  │                            ↑                                 │   │   │
│   │  │                       Only axiology dims (256-383) active    │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   │  overrideMin[256..383]: [-127, -100, ...] ← Strict negative for    │   │
│   │  overrideMax[256..383]: [-50, -30, ...]     forbidden acts         │   │
│   │                                                                     │   │
│   │  metadata: {source: "theories/law/minimal.sys2dsl", timestamp: ..} │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   HOW applyTo(diamond) WORKS:                                               │
│   ════════════════════════════                                              │
│                                                                             │
│   Base Diamond           Layer Mask              Result Diamond             │
│   ┌──────────────┐      ┌──────────────┐        ┌──────────────┐           │
│   │dim 0: [0,10] │  +   │dim 0: 0 (skip)│   →   │dim 0: [0,10] │unchanged  │
│   │dim 1: [-5,5] │      │dim 1: 0 (skip)│        │dim 1: [-5,5] │unchanged  │
│   │dim 256:[0,50]│      │dim 256: 1     │        │dim 256:[-127,-50]│OVERRIDE│
│   │dim 257:[0,30]│      │dim 257: 1     │        │dim 257:[-100,-30]│OVERRIDE│
│   └──────────────┘      └──────────────┘        └──────────────┘           │
│                                                                             │
│   Key: Layer only changes dimensions where mask bit = 1                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

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

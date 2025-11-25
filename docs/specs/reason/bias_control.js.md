# Design Spec: src/reason/bias_control.js

ID: DS(/reason/bias_control.js)

Class `BiasController`
- **Role**: Apply ontological/axiological masks and bias-audit modes (e.g., veil-of-ignorance) during reasoning; ensure separation of facts vs. values.
- **Pattern**: Decorator/helper for masks. SOLID: single responsibility for bias masking.
- **Key Collaborators**: `Config` (partitions), `Reasoner`, `ValidationEngine`, `AuditLog`.

## Public API
- `constructor({config, audit})`
- `applyBiasMode(mode, diamond)`: returns masked view of diamond per mode (e.g., remove protected attributes, zero axiological dims).
- `maskVector(vec, partitions)`: zero out selected partitions.
- `listModes()`: available modes and their definitions.

## Pseudocode (comments)
```js
class BiasController {
  constructor({config, audit}) {
    // partitions = config.getPartition('ontology'), getPartition('axiology'), etc.
  }

  applyBiasMode(mode, diamond) {
    // clone diamond; adjust relevanceMask per mode; log mode usage
  }

  maskVector(vec, partitions) {
    // zero dims in specified ranges
  }

  listModes() { /* return predefined modes and descriptions */ }
}
```

## Notes/Constraints
- Modes must be deterministic and logged for audit.
- Do not change stored diamonds; operate on copies/views.
- Keep mode set small (YAGNI) but allow config extension.***

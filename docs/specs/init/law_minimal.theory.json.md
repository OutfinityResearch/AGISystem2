# Data Spec: Law Minimal Theory Layer

ID: DS(/init/law_minimal.theory.json)

Status: STABLE

## Purpose

Defines a minimal legal domain theory layer with deontic dimension overrides. Configures axiological partitions for permitted/forbidden reasoning.

## Schema

```json
{
  "kind": "layer",
  "id": "Law_Minimal",
  "dimensions": 1024,
  "overrides": [
    {
      "dim": <dimension_index>,
      "min": <min_value>,
      "max": <max_value>
    }
  ]
}
```

## Current Content

```json
{
  "kind": "layer",
  "id": "Law_Minimal",
  "dimensions": 1024,
  "overrides": [
    { "dim": 256, "min": -127, "max": 0 },
    { "dim": 280, "min": 0, "max": 127 }
  ]
}
```

## Dimension Semantics

| Dimension | Range | Semantic |
|-----------|-------|----------|
| 256 | [-127, 0] | Prohibition axis (negative = forbidden) |
| 280 | [0, 127] | Permission axis (positive = permitted) |

## Usage

Used in deontic reasoning tests and legal compliance scenarios:
```javascript
const lawLayer = storage.loadJSON('data/init/law_minimal.theory.json');
theoryStack.pushLayer(lawLayer);
// Now deontic queries use restricted axiological dimensions
```

## Requirements Trace

- FS-02: Theory layering with dimension overrides
- FS-12: Safety & bias controls (axiological dimensions)
- NFS-020: Configurable dimensions

# Data Spec: Physics Test Theory Layer

ID: DS(/init/physics_test.theory.json)

Status: STABLE

## Purpose

Defines a test theory layer for physics domain testing. Used in `manual_test` profile to verify dimension override behavior.

## Schema

```json
{
  "kind": "layer",
  "id": "Physics_Test",
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

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | string | Yes | Must be `"layer"` |
| `id` | string | Yes | Unique identifier for the theory layer |
| `dimensions` | number | Yes | Must match profile's dimension count (1024 for manual_test) |
| `overrides` | array | No | List of dimension bound overrides |
| `overrides[].dim` | number | Yes | Dimension index (0-based) |
| `overrides[].min` | number | Yes | Minimum bound [-127, 127] |
| `overrides[].max` | number | Yes | Maximum bound [-127, 127] |

## Current Content

```json
{
  "kind": "layer",
  "id": "Physics_Test",
  "dimensions": 1024,
  "overrides": [
    { "dim": 4, "min": 0, "max": 127 }
  ]
}
```

## Usage

Loaded during bootstrap when profile is `manual_test`:
```javascript
const layer = storage.loadJSON('data/init/physics_test.theory.json');
theoryStack.pushLayer(layer);
```

## Requirements Trace

- FS-02: Theory layering and dimension overrides
- NFS-020: Configurable dimensions (1024 for manual_test)

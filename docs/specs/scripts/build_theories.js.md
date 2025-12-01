# Design Spec: scripts/build_theories.js

ID: DS(/scripts/build_theories.js)

Status: IMPLEMENTED v1.0

## 1. Purpose

Build script for converting JSON theory layer descriptions into compact binary format. Produces deterministic binary output for theory layers that can be loaded efficiently at runtime.

**File**: `scripts/build_theories.js`
**Module Type**: CommonJS (executable)
**Shebang**: `#!/usr/bin/env node`

---

## 2. Usage

```bash
node scripts/build_theories.js <theory.json> [more.json...]
```

**Output:** For each `theory.json`, produces `theory.bin` in the same directory.

**Example:**
```bash
node scripts/build_theories.js data/theories/law_minimal.json
# → Built data/theories/law_minimal.bin from data/theories/law_minimal.json
```

---

## 3. JSON Input Schema

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

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `kind` | string | Must be `"layer"` |
| `id` | string | Unique theory identifier |
| `dimensions` | integer | Vector dimension count (must be > 0) |
| `overrides` | array | Dimension constraint overrides |

### Override Object

| Field | Type | Description |
|-------|------|-------------|
| `dim` | integer | Dimension index (0 to dimensions-1) |
| `min` | integer | Minimum value constraint (-127 to 127) |
| `max` | integer | Maximum value constraint (-127 to 127) |

---

## 4. Binary Output Format

### Header (16 + idLength bytes)

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| 0 | 4 | ASCII | Magic: `'AGTL'` |
| 4 | 1 | uint8 | Version: `1` |
| 5 | 3 | uint8[3] | Reserved: `0, 0, 0` |
| 8 | 4 | uint32 LE | Dimensions |
| 12 | 4 | uint32 LE | ID string length |
| 16 | idLen | UTF-8 | ID string |

### Body

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| header | maskBytes | uint8[] | Mask bitmap (ceil(dims/8) bytes) |
| +mask | dims | int8[] | Override min values |
| +min | dims | int8[] | Override max values |
| +max | 2 | int16 LE | Override radius (currently 0) |

### Total Size

```
totalSize = 16 + idLength + ceil(dims/8) + dims + dims + 2
```

---

## 5. Main Function

### buildLayer(jsonPath, outPath)
```javascript
function buildLayer(jsonPath: string, outPath: string): void
```

Builds a binary theory layer file from JSON specification.

**Parameters:**
- `jsonPath` - Path to input JSON file
- `outPath` - Path for output binary file

**Behavior:**
1. Reads and parses JSON specification
2. Validates `kind === 'layer'`
3. Validates dimensions and override ranges
4. Builds mask bitmap for active dimensions
5. Builds min/max override vectors
6. Writes binary file with header and body

**Throws:**
- `Error` if kind is not `'layer'`
- `Error` if dimensions is invalid
- `Error` if override dimension is out of range
- `Error` if override min/max is non-integer or outside [-127, 127]

---

## 6. Mask Bitmap

The mask indicates which dimensions have active overrides:

```javascript
// For dimension 'dim', set bit in mask
const byteIndex = Math.floor(dim / 8);
const bitIndex = dim % 8;
mask[byteIndex] |= (1 << bitIndex);
```

**Example:** For dimension 10:
- byteIndex = 1 (floor(10/8))
- bitIndex = 2 (10 % 8)
- Sets bit 2 in byte 1

---

## 7. Determinism

The build process is **deterministic**: the same JSON input always produces the same binary output. This enables:
- Reproducible builds
- Binary diffing for change detection
- Caching and CI verification

---

## 8. Error Handling

| Error | Cause |
|-------|-------|
| "Unsupported theory kind" | `kind` is not `"layer"` |
| "Invalid dimensions" | dimensions is not positive integer |
| "Override dimension out of range" | dim < 0 or dim >= dimensions |
| "must have integer min/max" | min/max is not integer |
| "min/max outside [-127,127]" | Value out of int8 range |
| "Internal size mismatch" | Bug in size calculation |

---

## 9. Usage Example

### Input: `law_minimal.json`
```json
{
  "kind": "layer",
  "id": "Law_Minimal",
  "dimensions": 512,
  "overrides": [
    { "dim": 100, "min": -50, "max": 50 },
    { "dim": 200, "min": 0, "max": 127 }
  ]
}
```

### Build
```bash
$ node scripts/build_theories.js law_minimal.json
Built law_minimal.bin from law_minimal.json
```

### Output: `law_minimal.bin`
- Size: 16 + 11 + 64 + 512 + 512 + 2 = 1117 bytes
- Magic: `AGTL`
- Dimensions: 512
- ID: "Law_Minimal"
- Mask: bits 100 and 200 set
- Min/Max: -50/50 at dim 100, 0/127 at dim 200

---

## 10. Related Documents

- DS(/knowledge/theory_layer.js) - Runtime theory layer class
- DS(/knowledge/theory_stack.js) - Theory stack management
- DS(/theory/theory_storage.js) - Theory persistence

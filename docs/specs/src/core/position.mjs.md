# Module Plan: src/core/position.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-05, FS-67

---

## 1. Purpose

Provides position vectors (Pos1 through Pos20) for encoding argument order in bound vectors. Solves the problem of XOR commutativity by tagging each argument with its position.

---

## 2. Responsibilities

- Initialize position vectors deterministically
- Provide access to position vectors by index
- Support position binding and unbinding
- Ensure position vectors are mutually quasi-orthogonal

---

## 3. Public API

```javascript
// Get position vector by index (1-20)
function getPosition(index: number): Vector

// Bind value with position marker
function withPosition(position: number, value: Vector): Vector

// Remove position marker from value
function removePosition(position: number, value: Vector): Vector

// Check if all positions are initialized
function positionsReady(): boolean

// Initialize positions for specific geometry
function initPositions(geometry: number): void

// Constants
const MIN_POSITION = 1;
const MAX_POSITION = 20;
```

---

## 4. Internal Design

### 4.1 Position Initialization

```javascript
const positions = new Map();  // geometry -> position vectors

function initPositions(geometry) {
  if (positions.has(geometry)) return;

  const posVectors = [];
  for (let i = 1; i <= MAX_POSITION; i++) {
    // Deterministic initialization from name
    const name = `__Pos${i}__`;
    const vector = asciiStamp(name, 'Core', geometry);
    posVectors.push(vector);
  }

  positions.set(geometry, posVectors);

  // Verify quasi-orthogonality
  verifyOrthogonality(posVectors);
}

function getPosition(index) {
  if (index < MIN_POSITION || index > MAX_POSITION) {
    throw new Error(`Position must be ${MIN_POSITION}-${MAX_POSITION}, got ${index}`);
  }

  const geometry = getDefaultGeometry();
  if (!positions.has(geometry)) {
    initPositions(geometry);
  }

  return positions.get(geometry)[index - 1];
}
```

### 4.2 Position Operations

```javascript
function withPosition(position, value) {
  const pos = getPosition(position);
  return bind(pos, value);
}

function removePosition(position, value) {
  // XOR is self-inverse: removing = binding again
  const pos = getPosition(position);
  return bind(pos, value);
}
```

### 4.3 Orthogonality Verification

```javascript
function verifyOrthogonality(vectors) {
  const threshold = 0.55;  // Should be below this

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = similarity(vectors[i], vectors[j]);
      if (sim > threshold) {
        console.warn(`Position vectors ${i+1} and ${j+1} have high similarity: ${sim}`);
      }
    }
  }
}
```

---

## 5. Dependencies

- `./vector.js` - Vector class
- `./operations.js` - bind, similarity
- `../util/ascii-stamp.js` - deterministic initialization

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| POS-01 | Get Pos1 through Pos20 | All return valid vectors |
| POS-02 | Position determinism | Same position = same vector always |
| POS-03 | Positions quasi-orthogonal | sim(Pos_i, Pos_j) < 0.55 for i != j |
| POS-04 | withPosition/removePosition | Round-trip preserves value |
| POS-05 | Invalid position index | Throws error |
| POS-06 | Different geometries | Positions extend correctly |

---

## 7. Why Position Vectors (Not Permutation)

Permutation (bit rotation) breaks geometry extension:

```
Permutation problem:
  v at 16K:     [abcd...]
  v at 32K:     [abcd...|abcd...]  (cloned)

  perm(v) at 16K:  [bcda...]
  perm(v) at 32K:  [bcda...|bcda...]

  BUT: perm([v|v]) = [bcda...|abcd...]  <- DIFFERENT!
```

Position vectors (XOR-based) extend correctly because XOR distributes over cloning.

---

## 8. Performance Requirements

| Operation | Target | Measurement |
|-----------|--------|-------------|
| getPosition | < 1us | Lookup only |
| withPosition | < 50us | Single bind |
| removePosition | < 50us | Single bind |
| initPositions | < 10ms | One-time init |

---

*End of Module Plan*

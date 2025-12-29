# Module Plan: src/core/position.mjs

**Document Version:** 2.1
**Status:** Implemented
**Traces To:** FS-05, FS-67

---

## 1. Purpose

Provides position vectors (Pos1 through Pos20) for encoding argument order in bound vectors. Solves the problem of commutative binding by tagging each argument with its position.

**Strategy-aware:** Works with any HDC strategy (dense-binary, sparse-polynomial, metric-affine, metric-affine-elastic, exact).

---

## 2. Public API

```javascript
// Get position vector by index (1-20)
// Strategy-aware: returns vector compatible with specified or current HDC strategy
function getPositionVector(position: number, geometry?: number, strategyId?: string, sessionOrHdc?: Session): Vector

// Initialize all position vectors for a geometry
function initPositionVectors(geometry?: number): Vector[]

// Bind value with position marker
// Strategy-agnostic: works with any vector type
function withPosition(position: number, vector: Vector, sessionOrHdc?: Session): Vector

// Remove position marker from value
// Strategy-agnostic: works with any vector type
function removePosition(position: number, vector: Vector, sessionOrHdc?: Session): Vector

// Extract content at a specific position from composite
// Alias for removePosition with clearer semantics
function extractAtPosition(position: number, composite: Vector): Vector

// Clear position vector cache
// Useful when switching strategies or geometries
function clearPositionCache(): void
```

---

## 3. Internal Design

### 3.1 Position Cache (Strategy-Aware)

```javascript
// Cache key includes strategy ID for multi-strategy support
const positionCache = new Map();  // key: `${strategyId}:${geometry}:${position}`

function getPositionVector(position, geometry = DEFAULT_GEOMETRY, strategyId = null, sessionOrHdc = null) {
  // IoC path: if a Session is provided, position vectors must be session-local
  // (some strategies may require per-session allocators / dictionaries).
  if (sessionOrHdc && sessionOrHdc.vocabulary?.getOrCreate) {
    return sessionOrHdc.vocabulary.getOrCreate(`__POS_${position}__`);
  }

  const resolvedStrategyId = strategyId || getStrategyId();
  const cacheKey = `${resolvedStrategyId}:${geometry}:${position}`;

  if (positionCache.has(cacheKey)) {
    return positionCache.get(cacheKey);
  }

  // Generate deterministic position vector using active strategy
  const posVec = createFromName(`__POS_${position}__`, geometry, { strategyId: resolvedStrategyId });
  positionCache.set(cacheKey, posVec);
  return posVec;
}
```

### 3.2 Position Operations

```javascript
function withPosition(position, vector, sessionOrHdc = null) {
  const geometry = getVectorGeometry(vector);
  const posVec = getPositionVector(position, geometry, getStrategyId(vector), sessionOrHdc);
  return bind(vector, posVec);
}

function removePosition(position, vector, sessionOrHdc = null) {
  const geometry = getVectorGeometry(vector);
  const posVec = getPositionVector(position, geometry, getStrategyId(vector), sessionOrHdc);
  return unbind(vector, posVec);
}

function extractAtPosition(position, composite) {
  return removePosition(position, composite);
}
```

### 3.3 Geometry Detection (Strategy-Agnostic)

```javascript
function getVectorGeometry(vector) {
  // dense-binary uses .geometry, SPHDC uses .maxSize
  return vector.geometry || vector.maxSize || DEFAULT_GEOMETRY;
}
```

---

## 4. Dependencies

- `../hdc/facade.mjs` - bind, unbind, getStrategyId, createFromName
- `./constants.mjs` - `MAX_POSITIONS`, `DEFAULT_GEOMETRY` (internal use)

---

## 5. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| POS-01 | Get Pos1 through Pos20 | All return valid vectors |
| POS-02 | Position determinism | Same position = same vector always |
| POS-03 | Positions quasi-orthogonal | sim(Pos_i, Pos_j) < 0.55 for i != j |
| POS-04 | withPosition/removePosition | Round-trip preserves value |
| POS-05 | Invalid position index | Throws RangeError |
| POS-06 | Different geometries | Positions extend correctly |
| POS-07 | extractAtPosition alias | Same result as removePosition |
| POS-08 | clearPositionCache | Cache cleared, new vectors generated |
| POS-09 | Multi-strategy cache | Different strategies get different vectors |

---

## 6. Why Position Vectors (Not Permutation)

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

## 7. Performance Requirements

| Operation | Target | Measurement |
|-----------|--------|-------------|
| getPositionVector | < 1us | Cache lookup |
| withPosition | < 50us | Single bind |
| removePosition | < 50us | Single unbind |
| extractAtPosition | < 50us | Single unbind |
| initPositionVectors | < 10ms | One-time init |
| clearPositionCache | < 1us | Map.clear() |

---

*End of Module Plan*

# AGISystem2 Remediation Plan

**Generated:** 2025-11-26
**Based on:** GLM Check + Codex Check validation
**Priority:** Critical issues blocking core functionality

---

## Executive Summary

After validating the review reports against actual code:
- **GLM Check had several false positives** (RelationPermuter, ClusterManager exist)
- **Both reports correctly identified** TheoryLayer/TheoryStack as incomplete
- **Core integration gaps confirmed** (Encoder↔Permuter, Reasoner↔TheoryStack)

---

## Phase 1: Critical Fixes (Week 1)

### 1.1 Complete TheoryLayer Implementation
**File:** `src/knowledge/theory_layer.js`
**Current:** 14 lines, constructor only
**Required:**

```javascript
class TheoryLayer {
  constructor(id, theory, priority = 0, metadata = {}) {
    this.id = id;
    this.theory = theory;
    this.priority = priority;
    this.metadata = metadata;
    this.facts = [];           // ADD
    this.overrides = new Map(); // ADD
  }

  // ADD: Apply layer overrides to a diamond
  applyTo(diamond) { ... }

  // ADD: Check if layer covers a concept
  covers(conceptId) { ... }

  // ADD: Serialize for persistence
  toJSON() { ... }

  // ADD: Restore from JSON
  static fromJSON(json) { ... }
}
```

**Effort:** 2-3 hours

---

### 1.2 Complete TheoryStack Implementation
**File:** `src/knowledge/theory_stack.js`
**Current:** push/clear/getActiveLayers only
**Required:**

```javascript
class TheoryStack {
  // ADD: Set active layer for modifications
  setActive(layerId) { ... }

  // ADD: Compose diamonds from all layers
  compose(conceptId) { ... }

  // ADD: Detect conflicts between layers
  conflicts() { ... }

  // ADD: Snapshot for counterfactuals
  snapshot() { ... }

  // ADD: Restore from snapshot
  restore(snapshot) { ... }
}
```

**Effort:** 3-4 hours

---

### 1.3 Fix Reasoner.composeConcept to Use Stack
**File:** `src/reason/reasoner.js`
**Problem:** Stack parameter is completely ignored
**Fix:**

```javascript
composeConcept(conceptId, stack) {
  const concept = this.conceptStore.getConcept(conceptId);
  if (!concept || !concept.diamonds || concept.diamonds.length === 0) {
    return null;
  }

  // APPLY theory layer overrides
  let diamond = concept.diamonds[0];
  if (stack && stack.getActiveLayers) {
    const layers = stack.getActiveLayers();
    for (const layer of layers) {
      if (layer.covers && layer.covers(conceptId)) {
        diamond = layer.applyTo(diamond);
      }
    }
  }
  return diamond;
}
```

**Effort:** 1-2 hours

---

## Phase 2: Integration Fixes (Week 2)

### 2.1 Connect Encoder to RelationPermuter
**File:** `src/ingest/encoder.js`
**Problem:** Encoding doesn't use permutation binding
**Fix:**

```javascript
encodeNode(node, depth = 0) {
  // ... existing code ...

  // ADD: Apply relation permutation
  if (this.permuter && node.relation) {
    try {
      const table = this.permuter.get(node.relation);
      const objectVec = this._encodeToken(node.object);
      const permutedObject = MathEngine.permute(objectVec, table);
      vec = MathEngine.addSaturated(vec, permutedObject);
    } catch (e) {
      // Relation not registered, use fallback
    }
  }

  return vec;
}
```

**Effort:** 2-3 hours

---

### 2.2 Fix Retriever Performance
**File:** `src/reason/retrieval.js`
**Problem:** `refreshAll()` called on every query
**Fix:**

```javascript
nearest(vector, { k = 1 } = {}) {
  // REMOVE: this.refreshAll();

  // ADD: Only refresh if store changed
  if (this._needsRefresh) {
    this.refreshAll();
    this._needsRefresh = false;
  }
  // ... rest of method
}

// ADD: Called by ConceptStore when concepts change
markDirty() {
  this._needsRefresh = true;
}
```

**Effort:** 1 hour

---

### 2.3 Complete ValidationEngine
**File:** `src/reason/validation.js`
**Problem:** abstractQuery and findCounterexample are stubs
**Fix:** At minimum, make them return clear errors instead of silent failures

```javascript
abstractQuery(spec) {
  // Minimal implementation: validate spec structure
  if (!spec || !spec.query) {
    return { result: 'ERROR', error: 'Invalid spec' };
  }
  return { result: 'NOT_IMPLEMENTED', spec };
}

findCounterexample(ruleSpec) {
  // Minimal: return structured response
  return { found: false, reason: 'NOT_IMPLEMENTED' };
}
```

**Effort:** 1-2 hours

---

## Phase 3: Test Coverage (Week 3)

### 3.1 Add Missing Test Suites
Create test suites for:
- [ ] `tests/theory_layering/` - Test TheoryStack compose/conflicts
- [ ] `tests/validation_engine/` - Test consistency checks
- [ ] `tests/encoder_permutation/` - Test relation binding

### 3.2 Fix Existing Test Gaps
- [ ] `tests/sys2dsl_commands/` - Add tests for THEORY_PUSH/POP isolation
- [ ] `tests/counterfactual_layering/` - Add persistent layer tests

---

## Phase 4: Documentation Sync (Week 4)

### 4.1 Update DS_map.md
- Fix `.specs` → `docs/specs` references
- Add mapping for Sys2DSL parser/commands modules

### 4.2 Mark Unimplemented Features
In FS.md and NFS.md, explicitly mark:
- ValidationEngine symbolic execution: "Future scope"
- Full theory composition: "MLP partial"

---

## Summary Table

| Issue | Severity | Effort | Phase |
|-------|----------|--------|-------|
| TheoryLayer incomplete | Critical | 2-3h | 1 |
| TheoryStack incomplete | Critical | 3-4h | 1 |
| Reasoner ignores stack | Critical | 1-2h | 1 |
| Encoder no permutation | High | 2-3h | 2 |
| Retriever performance | Medium | 1h | 2 |
| ValidationEngine stubs | Medium | 1-2h | 2 |
| Missing tests | Medium | 4-6h | 3 |
| Doc sync | Low | 2-3h | 4 |

**Total estimated effort: ~20-25 hours**

---

## Notes

1. **GLM Check false positives:** RelationPermuter and ClusterManager EXIST and are functional. The review may have used an older codebase or searched incorrectly.

2. **Codex Check more accurate:** Its analysis of theory layering gaps and integration issues is spot-on.

3. **Tests pass but gaps exist:** The 28 passing tests cover implemented functionality but don't exercise the missing integration points.

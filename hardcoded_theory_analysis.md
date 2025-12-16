# Hardcoded Theory Elements Analysis

## Executive Summary

The analysis reveals **hardcoded theory elements** in the AGISystem2 codebase that are NOT defined in the core theory configuration. These elements are primarily found in the **phrasing templates** and **test fixtures**, creating a potential inconsistency between the system's theoretical foundation and its practical implementation.

### Key Findings

**❌ Hardcoded Relations NOT in Core Theory:**
- `loves`, `hates`, `likes` - Emotional relations
- `parent`, `child`, `sibling` - Family relations  
- `sells`, `buys`, `owns` - Commerce relations
- `seatedAt`, `conflictsWith`, `tableConflict` - Event planning relations
- `can`, `has`, `isSuspect`, `hasStatus` - Capability/state relations

**✅ Properly Defined in Core Theory:**
- `knows` - Defined as `KnowsMacro` in modal.sys2
- `isA` - Defined as `IsAMacro` in core
- `greaterThan`, `lessThan`, `equals` - Comparison relations
- `before`, `after` - Temporal relations
- `causes` - Causal relations
- `Implies`, `And`, `Or`, `Not` - Logical operators

## Detailed Analysis

### 1. Phrasing Templates (`src/decoding/phrasing.mjs`)

**Issue:** 18 hardcoded templates for relations NOT defined in core theory

**Hardcoded Relations Found:**

```javascript
// Emotional relations - NOT in core theory
loves: { pattern: '{Pos1} loves {Pos2}.' }
hates: { pattern: '{Pos1} hates {Pos2}.' }
likes: { pattern: '{Pos1} likes {Pos2}.' }

// Family relations - NOT in core theory  
parent: { pattern: '{Pos1} is a parent of {Pos2}.' }
child: { pattern: '{Pos1} is a child of {Pos2}.' }
sibling: { pattern: '{Pos1} is a sibling of {Pos2}.' }

// Commerce relations - NOT in core theory
sells: { pattern: '{Pos1} sells {Pos2} to {Pos3}.' }
buys: { pattern: '{Pos1} buys {Pos2} from {Pos3}.' }
owns: { pattern: '{Pos1} owns {Pos2}.' }

// Event planning relations - NOT in core theory
seatedAt: { pattern: '{Pos1} is seated at {Pos2}.' }
conflictsWith: { pattern: '{Pos1} conflicts with {Pos2}.' }
tableConflict: { pattern: 'There is a conflict at {Pos1} between {Pos2} and {Pos3}.' }

// Capability/state relations - NOT in core theory
can: { pattern: '{Pos1} can {Pos2}.' }
has: { pattern: '{Pos1} has {Pos2}.' }
isSuspect: { pattern: '{Pos1} is a suspect.' }
hasStatus: { pattern: '{Pos1} has status {Pos2}.' }
```

**Core Theory Equivalents Available:**
- `parent` → Could use `HasPart` or `PartOf` relations
- `child` → Could use `PartOf` relation  
- `sibling` → Could use `siblingOf` (defined in core)
- `sells` → Could use `SellMacro` (defined in core)
- `buys` → Could use `BuyMacro` (defined in core)
- `owns` → Could use `HasPart` relation
- `loves`, `hates`, `likes` → Could use `Liking`/`Fearing` states with custom relations

### 2. Test Fixtures (`src/test-lib/fixtures.mjs`)

**Issue:** Test data uses hardcoded relations and entities

**Hardcoded Examples:**
```javascript
// Family test - uses undefined 'loves' and 'parent' relations
@john isA John Person
@mary isA Mary Person  
@loves loves John Mary  // 'loves' not in core theory
@parent parent John Alice  // 'parent' not in core theory

// Commerce test - uses undefined 'sells' relation  
@sale1 sells Alice Book Bob  // 'sells' not in core theory
@sale2 sells Carol Car David

// Decoding test - uses undefined 'loves' relation
@f loves Romeo Juliet  // 'loves' not in core theory
```

### 3. Core Theory Coverage Analysis

**Core Theory Defines:** 187 relations/macros/types
**Phrasing Templates Use:** 18 relations
**Overlap:** Only 8/18 (44%) are defined in core theory

**Missing Coverage:**
- **Emotional relations:** 0/3 defined
- **Family relations:** 1/3 defined (`siblingOf` exists, but not `parent`/`child`)
- **Commerce relations:** 2/3 defined (`SellMacro`/`BuyMacro` exist, but not `sells`/`buys` as direct relations)
- **Event planning:** 0/3 defined
- **Capability/state:** 0/4 defined

## Impact Assessment

### ⚠️ Problems Caused by Hardcoded Elements

1. **Theoretical Inconsistency**
   - System claims to be theory-driven but uses undefined relations
   - Violates the principle of "everything must be defined in theory"

2. **Maintenance Issues**
   - Hardcoded templates can't be extended without code changes
   - Theory updates won't automatically update phrasing

3. **Semantic Gaps**
   - Relations like `loves` have no formal semantics in the system
   - No way to reason about these relations using core theory

4. **Testing Problems**
   - Tests use relations that aren't part of the formal system
   - May pass tests but fail in real-world scenarios

### ✅ What's Done Correctly

1. **Core Theory is Comprehensive**
   - 187 well-defined relations, macros, and types
   - Covers logic, time, causality, modality, etc.

2. **Extensibility Mechanism Exists**
   - `registerTemplate()` method allows adding custom templates
   - System is designed to be extended

3. **No Hardcoded Entities**
   - Only example names in comments (John, Mary, Alice, Bob)
   - No actual hardcoded entity data

## Recommendations

### 🔴 Critical Fixes (High Priority)

1. **Move phrasing templates to theory configuration**
   ```bash
   # Create new theory file: config/Common/phrasing-theory.sys2
   @loves:loves __Relation
   @hates:hates __Relation
   @likes:likes __Relation
   @parent:parent __Relation
   @child:child __Relation
   # etc.
   ```

2. **Update phrasing engine to load from theory**
   ```javascript
   // Instead of hardcoded TEMPLATES object:
   // Load templates from theory configuration
   ```

3. **Update test fixtures to use core theory relations**
   ```javascript
   // Replace:
   @loves loves John Mary
   // With:
   @loves __Relation
   @loves John Mary
   ```

### 🟡 Important Improvements (Medium Priority)

4. **Create theory-based template registration**
   ```javascript
   // Add to theory files:
   @loves:loves __Relation template "{Pos1} loves {Pos2}."
   ```

5. **Add validation for undefined relations**
   ```javascript
   // Warn when using relations not in theory
   if (!theory.hasRelation(operator)) {
     console.warn(`Relation ${operator} not defined in theory`);
   }
   ```

6. **Document the theory extension process**
   ```markdown
   # Adding New Relations
   1. Define in theory file
   2. Add phrasing template
   3. Register in system
   ```

### 🟢 Nice-to-Have (Low Priority)

7. **Create a theory validation tool**
   - Check all used relations against theory definitions
   - Generate warnings for undefined relations

8. **Add dynamic template loading**
   - Load templates from theory files at runtime
   - Support hot-reloading of templates

## Compliance Matrix

| Relation | In Core Theory | In Phrasing | Status |
|----------|---------------|-------------|--------|
| `loves` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `hates` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `likes` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `knows` | ✅ Yes (KnowsMacro) | ✅ Yes | ✅ OK |
| `parent` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `child` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `sibling` | ✅ Yes (siblingOf) | ✅ Yes | ✅ OK |
| `isA` | ✅ Yes (IsAMacro) | ✅ Yes | ✅ OK |
| `sells` | ✅ Yes (SellMacro) | ✅ Yes | ⚠️ Should use macro |
| `buys` | ✅ Yes (BuyMacro) | ✅ Yes | ⚠️ Should use macro |
| `owns` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `seatedAt` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `conflictsWith` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `can` | ❌ No | ✅ Yes | ⚠️ Hardcoded |
| `has` | ❌ No | ✅ Yes | ⚠️ Hardcoded |

## Files Requiring Changes

### Critical Files
1. `src/decoding/phrasing.mjs` - Remove hardcoded templates
2. `src/test-lib/fixtures.mjs` - Update to use core theory
3. `config/Common/phrasing-theory.sys2` - Create this file

### Supporting Files  
4. `src/decoding/index.mjs` - Update to load from theory
5. `docs/specs/src/decoding/phrasing.mjs.md` - Document new approach

## Migration Plan

### Phase 1: Theory Definition (1 day)
- Create `config/Common/phrasing-theory.sys2`
- Define all missing relations
- Add proper semantics and types

### Phase 2: Engine Updates (2 days)
- Modify phrasing engine to load from theory
- Add template registration from theory files
- Implement validation for undefined relations

### Phase 3: Test Updates (1 day)
- Update test fixtures to use core theory
- Add tests for theory-based phrasing
- Verify all existing tests still pass

### Phase 4: Documentation (1 day)
- Update specifications
- Add theory extension guide
- Document new template system

## Conclusion

The hardcoded theory elements represent a **significant architectural issue** that undermines AGISystem2's claim to be a theory-driven system. While the impact on current functionality is limited (tests pass, system works), this creates **technical debt** and **theoretical inconsistency**.

**Recommendation:** Address this issue in the next major release cycle. The migration is straightforward and will result in a more consistent, maintainable, and theoretically sound system.

**Severity:** High ⚠️
**Priority:** Should be fixed before 1.0 release
**Effort:** 4-5 days total
**Benefit:** Improved consistency, maintainability, and theoretical purity

---

*Generated by VibeCLI - Mistral AI Code Analysis Agent*
*Analysis Date: 2025-01-15*
*Codebase Version: e5c18ec (master branch)*
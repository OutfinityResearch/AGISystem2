# DS-REF: Design Specification - Code Refactoring Plan

**Document ID**: DS-REF-001
**Version**: 1.0
**Date**: 2025-12-03
**Status**: Draft

---

## 1. Overview

### 1.1 Purpose

This document specifies the refactoring strategy to reduce file sizes from 800-2800 lines to the target 400-500 lines per file, following the project coding style guidelines.

### 1.2 Target Files

| File | Current Lines | Target | Status |
|------|---------------|--------|--------|
| `src/reason/inference_engine.js` | 864 | 400-500 | Acceptable (well-structured) |
| `src/knowledge/concept_store.js` | 1017 | 400-500 | **Needs extraction** |
| `src/reason/reasoner.js` | 1243 | 400-500 | **Needs extraction** |
| `evalsuite/run.js` | 2876 | 400-500 | **Critical - needs major refactor** |

---

## 2. Analysis Summary

### 2.1 inference_engine.js (864 lines)

**Assessment**: Acceptable - Well-structured single-responsibility class

**Structure**:
- Lines 1-105: Core inference entry point and method dispatch
- Lines 106-185: Direct and transitive inference
- Lines 186-260: Symmetric and inverse inference
- Lines 261-343: Composition and default reasoning
- Lines 344-459: Inheritance and forward chaining
- Lines 460-864: Private helper methods

**Recommendation**: Keep as-is. The file is cohesive with a single class handling logical inference. All methods are tightly coupled through shared state (`relationProperties`, `rules`, `defaults`).

### 2.2 concept_store.js (1017 lines)

**Assessment**: Needs extraction - Multiple distinct responsibilities

**Identified Modules**:

| Module | Lines | Responsibility |
|--------|-------|----------------|
| Core storage | ~350 | Concept/fact CRUD, indices |
| Usage tracking | ~125 | Access counts, timestamps |
| Forgetting logic | ~165 | Decay, threshold-based cleanup |
| Persistence | ~220 | Load/save, JSON export |
| Query methods | ~157 | Search, filter, aggregation |

### 2.3 reasoner.js (1243 lines)

**Assessment**: Needs extraction - Multiple reasoning paradigms

**Identified Modules**:

| Module | Lines | Responsibility |
|--------|-------|----------------|
| Analogical reasoning | ~200 | Similarity, mapping |
| Abductive reasoning | ~180 | Hypothesis generation |
| IS_A deduction | ~250 | Type hierarchy traversal |
| Type inheritance | ~180 | Property inheritance |
| Transitive closure | ~200 | Chain computation |
| Geometric operations | ~230 | Vector space reasoning |

### 2.4 evalsuite/run.js (2876 lines)

**Assessment**: Critical - Major extraction needed

**Identified Classes/Functions**:

| Component | Lines | Responsibility |
|-----------|-------|----------------|
| DirectDSLExecutor | ~180 | Execute DSL without LLM |
| DirectTranslationEvaluator | ~150 | Test NL→DSL translation |
| TranslationEvaluator | ~120 | Compare DSL strings |
| AGIProcess | ~200 | Spawn AGI subprocess |
| discoverCases | ~180 | Find test case files |
| generateDSLQuery | ~400 | NL to DSL pattern matching |
| evaluateCase | ~250 | Run single test case |
| evaluateTranslation | ~150 | Evaluate translation quality |
| parseStructuredResult | ~90 | Parse JSON results |
| analyzeResponse | ~150 | Compare expected vs actual |
| normalizeTestCase | ~50 | v3 format conversion |
| main | ~200 | CLI entry point |

---

## 3. Extraction Plan

### 3.1 concept_store.js Extraction

#### New Files:
```
src/knowledge/
├── concept_store.js       (~400 lines) - Core storage
├── usage_tracker.js       (~150 lines) - Usage tracking
├── forgetting_policy.js   (~180 lines) - Forgetting logic
└── store_persistence.js   (~220 lines) - Load/save
```

#### usage_tracker.js
```javascript
/**
 * UsageTracker - Tracks access patterns for concepts and facts
 *
 * Responsibilities:
 * - Track access counts per concept/fact
 * - Track last access timestamps
 * - Compute usage statistics
 * - Support decay calculations
 */
class UsageTracker {
  constructor() {
    this._accessCounts = new Map();
    this._lastAccess = new Map();
  }

  recordAccess(key) { ... }
  getAccessCount(key) { ... }
  getLastAccess(key) { ... }
  computeDecay(key, decayRate, currentTime) { ... }
  getUsageStats() { ... }
}
```

#### forgetting_policy.js
```javascript
/**
 * ForgettingPolicy - Implements forgetting mechanisms
 *
 * Responsibilities:
 * - Threshold-based forgetting
 * - Decay-based forgetting
 * - Protected concept handling
 * - Batch cleanup operations
 */
class ForgettingPolicy {
  constructor(store, usageTracker, config) { ... }

  forgetByThreshold(threshold) { ... }
  forgetByDecay(maxDecay) { ... }
  protectConcept(concept) { ... }
  cleanupUnused(maxAge) { ... }
}
```

#### store_persistence.js
```javascript
/**
 * StorePersistence - Handles serialization/deserialization
 *
 * Responsibilities:
 * - Export to JSON
 * - Import from JSON
 * - Incremental save
 * - Backup/restore
 */
class StorePersistence {
  constructor(store) { ... }

  exportToJSON(options) { ... }
  importFromJSON(data, options) { ... }
  saveSnapshot(path) { ... }
  loadSnapshot(path) { ... }
}
```

### 3.2 reasoner.js Extraction

#### New Files:
```
src/reason/
├── reasoner.js              (~350 lines) - Core + coordination
├── geometric_reasoner.js    (~230 lines) - Vector space
├── is_a_reasoner.js         (~300 lines) - Type hierarchy
├── analogical_reasoner.js   (~200 lines) - Similarity
└── abductive_reasoner.js    (~180 lines) - Hypothesis
```

#### geometric_reasoner.js
```javascript
/**
 * GeometricReasoner - Vector space reasoning operations
 *
 * Uses N-dimensional vectors for semantic similarity
 * and analogical reasoning.
 */
class GeometricReasoner {
  constructor(store, encoder) { ... }

  computeSimilarity(concept1, concept2) { ... }
  findNearest(concept, k) { ... }
  computeAnalogy(a, b, c) { ... }
  projectToSubspace(vector, dimensions) { ... }
}
```

#### is_a_reasoner.js
```javascript
/**
 * IsAReasoner - Type hierarchy reasoning
 *
 * Handles IS_A transitivity, inheritance, and existence tracking.
 * Core component for Trustworthy AI existence dimension.
 */
class IsAReasoner {
  constructor(store, config) { ... }

  deduceIsA(subject, target) { ... }
  deduceIsAWithExistence(subject, target) { ... }
  getAllTypes(subject, maxDepth) { ... }
  getTypeHierarchy(type) { ... }
  checkInheritance(subject, property) { ... }
}
```

#### analogical_reasoner.js
```javascript
/**
 * AnalogicalReasoner - Analogical reasoning
 *
 * Implements structure mapping for analogies:
 * A:B :: C:? → finds D
 */
class AnalogicalReasoner {
  constructor(store, geometricReasoner) { ... }

  findAnalogy(a, b, c) { ... }
  mapStructure(source, target) { ... }
  computeStructuralSimilarity(struct1, struct2) { ... }
}
```

#### abductive_reasoner.js
```javascript
/**
 * AbductiveReasoner - Hypothesis generation
 *
 * Given observations, generates plausible explanations.
 */
class AbductiveReasoner {
  constructor(store, isAReasoner) { ... }

  abduct(observation) { ... }
  generateHypotheses(symptoms, maxHypotheses) { ... }
  rankByParsimony(hypotheses) { ... }
}
```

### 3.3 evalsuite/run.js Extraction

#### New Files:
```
evalsuite/
├── run.js                 (~200 lines) - Main CLI entry
└── lib/
    ├── executors/
    │   ├── direct_dsl_executor.js  (~200 lines)
    │   └── agi_process.js          (~220 lines)
    ├── evaluators/
    │   ├── translation_evaluator.js      (~180 lines)
    │   ├── direct_translation_evaluator.js (~170 lines)
    │   └── response_analyzer.js    (~200 lines)
    ├── parsers/
    │   ├── case_parser.js          (~120 lines)
    │   └── dsl_query_generator.js  (~420 lines)
    ├── discovery/
    │   └── case_discovery.js       (~200 lines)
    └── utils/
        ├── colors.js               (~30 lines)
        └── logging.js              (~80 lines)
```

#### direct_dsl_executor.js
```javascript
/**
 * DirectDSLExecutor - Execute DSL directly via AGISystem2 API
 *
 * Bypasses LLM translation, tests pure reasoning engine.
 * Creates session, loads theory, executes queries.
 */
class DirectDSLExecutor {
  constructor(options) { ... }

  async start() { ... }
  async send(dsl, queryId) { ... }
  async stop() { ... }
}
```

#### response_analyzer.js
```javascript
/**
 * ResponseAnalyzer - Analyze and compare responses
 *
 * Parses structured results, detects truth values,
 * compares expected vs actual.
 */
class ResponseAnalyzer {
  parseStructuredResult(response) { ... }
  normalizeTruth(truth) { ... }
  detectTruthFromText(text, expectedTruth) { ... }
  analyzeResponse(response, expected) { ... }
}
```

#### dsl_query_generator.js
```javascript
/**
 * DSLQueryGenerator - Generate DSL from natural language patterns
 *
 * Pattern-based NL→DSL conversion without LLM.
 * Used for direct DSL mode testing.
 */
class DSLQueryGenerator {
  constructor() {
    this.patterns = this._initPatterns();
  }

  generate(query, expectedFacts) { ... }
  _initPatterns() { ... }
  _findConcept(word) { ... }
}
```

---

## 4. Dependency Graph

```
                    ┌─────────────────────┐
                    │    concept_store    │
                    │      (core)         │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ usage_tracker│    │ forgetting  │    │ persistence │
   └─────────────┘    └─────────────┘    └─────────────┘

                    ┌─────────────────────┐
                    │      reasoner       │
                    │    (coordinator)    │
                    └─────────┬───────────┘
                              │
      ┌───────────┬───────────┼───────────┬───────────┐
      │           │           │           │           │
      ▼           ▼           ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│geometric │ │ is_a     │ │analogical│ │abductive │ │inference │
│ reasoner │ │ reasoner │ │ reasoner │ │ reasoner │ │  engine  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

                    ┌─────────────────────┐
                    │    evalsuite/run    │
                    │       (CLI)         │
                    └─────────┬───────────┘
                              │
    ┌─────────────┬───────────┼───────────┬─────────────┐
    │             │           │           │             │
    ▼             ▼           ▼           ▼             ▼
┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
│executors│ │evaluators│ │ parsers │ │discovery│ │  utils   │
└─────────┘ └──────────┘ └─────────┘ └─────────┘ └──────────┘
```

---

## 5. Implementation Order

### Phase 1: evalsuite Extraction (Highest Priority)
1. Create `evalsuite/lib/utils/colors.js`
2. Create `evalsuite/lib/utils/logging.js`
3. Create `evalsuite/lib/parsers/case_parser.js`
4. Create `evalsuite/lib/discovery/case_discovery.js`
5. Create `evalsuite/lib/parsers/dsl_query_generator.js`
6. Create `evalsuite/lib/evaluators/response_analyzer.js`
7. Create `evalsuite/lib/executors/direct_dsl_executor.js`
8. Create `evalsuite/lib/executors/agi_process.js`
9. Create `evalsuite/lib/evaluators/translation_evaluator.js`
10. Create `evalsuite/lib/evaluators/direct_translation_evaluator.js`
11. Refactor `evalsuite/run.js` to use lib modules

### Phase 2: concept_store Extraction
1. Create `src/knowledge/usage_tracker.js`
2. Create `src/knowledge/forgetting_policy.js`
3. Create `src/knowledge/store_persistence.js`
4. Refactor `src/knowledge/concept_store.js`

### Phase 3: reasoner Extraction
1. Create `src/reason/geometric_reasoner.js`
2. Create `src/reason/is_a_reasoner.js`
3. Create `src/reason/analogical_reasoner.js`
4. Create `src/reason/abductive_reasoner.js`
5. Refactor `src/reason/reasoner.js`

### Phase 4: run/ask API Implementation
1. Implement session modes in core
2. Add existence dimension support
3. Create session.run() and session.ask() API

---

## 6. Backward Compatibility

### 6.1 Export Compatibility

All existing public APIs must continue to work:

```javascript
// concept_store.js must still export:
module.exports = ConceptStore;

// ConceptStore must still have all existing methods:
// - addConcept(), getConcept(), removeConcept()
// - addFact(), getFact(), removeFact()
// - getFactsBySubject(), getFactsByRelation()
// etc.

// Internally, it now delegates to extracted modules
```

### 6.2 reasoner.js Compatibility

```javascript
// reasoner.js must still export:
module.exports = Reasoner;

// Reasoner must still have all existing methods:
// - deduceIsA()
// - deduceWithInheritance()
// - abduct()
// - computeAnalogy()
// etc.

// Internally, it delegates to sub-reasoners
```

---

## 7. Test Impact

Each extraction requires corresponding test updates:

| Original Test File | New Test Files |
|-------------------|----------------|
| `tests/concept_store/` | + `tests/usage_tracker/`, `tests/forgetting/` |
| `tests/reasoner/` | + `tests/geometric/`, `tests/is_a/`, `tests/analogical/` |
| `evalsuite/` | Self-testing via `--dry-run` |

---

## 8. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-03 | Initial plan |

# DS-EXI: Design Specification - Existence Dimension

**Document ID**: DS-EXI-001
**Version**: 2.0
**Date**: 2025-12-03
**Status**: Draft
**Implements**: URS-TAI-001 through URS-TAI-012

---

## 1. Overview

### 1.1 Purpose

This document specifies the architectural design for the **Existence Dimension** - a numeric axis encoding the epistemic status of facts.

### 1.2 Design Constraint

**Triple syntax only**. No special operators or block syntax.

---

## 2. Existence Values

```
+127 ── CERTAIN ────── Axioms, learning mode facts
 +64 ── DEMONSTRATED ── Derived through reasoning
   0 ── POSSIBLE ────── Consistent hypothesis
 -64 ── UNPROVEN ────── Reasoning mode hypothesis (needs proof)
-127 ── IMPOSSIBLE ──── Contradicted by facts
```

### 2.1 Constants

```javascript
const EXISTENCE = {
  IMPOSSIBLE: -127,
  UNPROVEN: -64,
  POSSIBLE: 0,
  DEMONSTRATED: 64,
  CERTAIN: 127
};
```

---

## 3. Session Modes

### 3.1 API Entry Points

| API Method | Initial Mode | Behavior |
|------------|--------------|----------|
| `session.run(dsl)` | LEARNING | Executes DSL, creates facts |
| `session.ask(query)` | QUERY | Read-only, derives, returns existence |

### 3.2 Mode Definitions

| Mode | Behavior | Default Existence |
|------|----------|-------------------|
| LEARNING | Creates facts (trusted input) | CERTAIN (+127) |
| QUERY | Read-only, derives, no creation | N/A (doesn't create) |

### 3.3 Mode Semantics

**LEARNING Mode**:
- `session.run()` starts in this mode
- User/teacher is trusted source
- Facts created are authoritative (CERTAIN)
- Theory files load in this mode

**QUERY Mode**:
- `session.ask()` starts in this mode
- Read-only - does NOT create facts
- Derives facts via transitive reasoning
- Returns existence level of found/derived facts
- Returns UNKNOWN for missing (open-world)

### 3.4 Mode Switching via DSL

Modes can be switched during execution:

```sys2dsl
# Switch modes via relation
@m1 session SET_MODE learning   # switch to LEARNING
@m2 session SET_MODE query      # switch to QUERY

# Read current mode
@mode session GET_MODE any
```

### 3.5 Implementation

```javascript
class Session {
  constructor() {
    this.mode = 'learning';  // Default for run()
  }

  // API entry points set initial mode
  run(dsl) {
    this.mode = 'learning';
    return this.execute(dsl);
  }

  ask(query) {
    this.mode = 'query';
    return this.executeQuery(query);
  }

  // Mode can be changed during execution
  setMode(mode) {
    if (!['learning', 'query'].includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }
    this.mode = mode;
  }

  getDefaultExistence() {
    // Only LEARNING mode creates facts
    return this.mode === 'learning'
      ? EXISTENCE.CERTAIN
      : null;  // QUERY mode doesn't create
  }

  canCreateFacts() {
    return this.mode === 'learning';
  }
}
```

---

## 4. IS_A Variants

### 4.1 Variant Relations

| Relation | Existence | Description |
|----------|-----------|-------------|
| IS_A | mode-dependent | Uses session mode default |
| IS_A_CERTAIN | +127 | Forces CERTAIN |
| IS_A_DEMONSTRATED | +64 | Forces DEMONSTRATED |
| IS_A_POSSIBLE | 0 | Forces POSSIBLE |
| IS_A_UNPROVEN | -64 | Forces UNPROVEN |

### 4.2 DSL Usage

```sys2dsl
# Mode-dependent (respects session mode)
@f1 Dog IS_A Mammal

# Explicit existence (overrides mode)
@f2 Unicorn IS_A_POSSIBLE Mammal
@f3 Yeti IS_A_UNPROVEN Primate
@f4 Cat IS_A_CERTAIN Mammal
@f5 Whale IS_A_DEMONSTRATED Mammal
```

### 4.3 Implementation

```javascript
const IS_A_EXISTENCE = {
  'IS_A_CERTAIN': EXISTENCE.CERTAIN,
  'IS_A_DEMONSTRATED': EXISTENCE.DEMONSTRATED,
  'IS_A_POSSIBLE': EXISTENCE.POSSIBLE,
  'IS_A_UNPROVEN': EXISTENCE.UNPROVEN
};

function getExistenceForRelation(relation, session) {
  if (IS_A_EXISTENCE[relation] !== undefined) {
    return IS_A_EXISTENCE[relation];
  }
  // Mode-dependent for plain IS_A
  return session.getDefaultExistence();
}
```

---

## 5. Fact Structure

### 5.1 Extended Fact Object

```javascript
{
  factId: 123,
  subject: "Dog",
  relation: "IS_A",
  object: "Mammal",
  _existence: 127,
  _provenance: {
    source: "ontology_base.sys2dsl",
    line: 59,
    createdAt: 1701619200000,
    derivedFrom: null,
    rule: null
  }
}
```

### 5.2 Provenance Fields

| Field | Type | Description |
|-------|------|-------------|
| source | string | File name or "reasoning" |
| line | number | Line in source file |
| createdAt | number | Timestamp |
| derivedFrom | number[] | Source fact IDs if derived |
| rule | string | Reasoning rule if derived |

---

## 6. Storage Index

### 6.1 Existence Index Structure

```javascript
class ConceptStore {
  constructor() {
    this._factIndex = new Map();      // factId → fact
    this._subjectIndex = new Map();   // subject → Set<factId>
    this._existenceIndex = new Map(); // subject → SortedArray
  }
}

// SortedArray format (descending by existence)
[
  { factId: 123, existence: 127 },
  { factId: 456, existence: 64 },
  { factId: 789, existence: -64 }
]
```

### 6.2 Index Operations

```javascript
// Get best (highest existence) fact - O(1)
getBestFact(subject, relation, object) {
  const entries = this._existenceIndex.get(subject);
  if (!entries?.length) return null;
  return this._factIndex.get(entries[0].factId);
}

// Get facts with minimum existence - O(log n)
getFactsWithMinExistence(subject, minExistence) {
  const entries = this._existenceIndex.get(subject) || [];
  return entries
    .filter(e => e.existence >= minExistence)
    .map(e => this._factIndex.get(e.factId));
}
```

---

## 7. Version Unification

### 7.1 Rule: Upgrade Only

When adding a fact that already exists:
- If new existence > existing: **upgrade**
- If new existence <= existing: **no change**

```javascript
addFact(subject, relation, object, existence) {
  const existing = this.getFact(subject, relation, object);

  if (existing) {
    if (existence > existing._existence) {
      existing._existence = existence;
      this._reindexExistence(existing);
      return { action: 'upgraded', fact: existing };
    }
    return { action: 'unchanged', fact: existing };
  }

  const fact = this._createFact(subject, relation, object, existence);
  return { action: 'created', fact };
}
```

### 7.2 No Duplicates

Only one fact per (subject, relation, object) triple exists. The highest existence wins.

---

## 8. Transitive Chain Computation

### 8.1 Algorithm

For IS_A chains:
1. Compute minimum existence along path
2. Cap at DEMONSTRATED (+64) since derived

```javascript
deduceIsAWithExistence(subject, target) {
  const queue = [{ node: subject, pathExistence: EXISTENCE.CERTAIN }];
  const visited = new Map();

  while (queue.length > 0) {
    const { node, pathExistence } = queue.shift();

    if (node === target) {
      // Derived facts capped at DEMONSTRATED
      const finalExistence = Math.min(pathExistence, EXISTENCE.DEMONSTRATED);
      return { found: true, existence: finalExistence };
    }

    if (visited.has(node)) continue;
    visited.set(node, pathExistence);

    const facts = this.getFactsBySubjectRelation(node, 'IS_A');
    for (const fact of facts) {
      const newExistence = Math.min(pathExistence, fact._existence);
      queue.push({ node: fact.object, pathExistence: newExistence });
    }
  }

  return { found: false };
}
```

### 8.2 Example

```
Dog IS_A Mammal (existence=127)
Mammal IS_A Vertebrate (existence=127)

Query: Dog IS_A Vertebrate
Chain: Dog → Mammal → Vertebrate
Path existence: min(127, 127) = 127
Derived cap: min(127, 64) = 64

Result: { found: true, existence: 64 }
```

---

## 9. Hypothesis Flow (Explicit UNPROVEN)

### 9.1 Adding Hypotheses

To add a hypothesis that needs proving, use explicit IS_A_UNPROVEN:

```sys2dsl
# In LEARNING mode, add as unproven hypothesis
@h1 Yeti IS_A_UNPROVEN Mammal    # existence = -64
```

### 9.2 Proof Attempt

The system can attempt to prove hypotheses:

```javascript
async attemptProof(subject, relation, object) {
  // Search for supporting chain
  const chain = await this.reasoner.findChain(subject, relation, object);

  if (chain.found) {
    // Upgrade to DEMONSTRATED
    const fact = this.store.getFact(subject, relation, object);
    fact._existence = EXISTENCE.DEMONSTRATED;
    fact._provenance.derivedFrom = chain.facts.map(f => f.factId);
    fact._provenance.rule = chain.rule;
    return { status: 'demonstrated', fact };
  }

  // Check for contradiction
  const conflict = this.checkContradiction(subject, relation, object);
  if (conflict) {
    const fact = this.store.getFact(subject, relation, object);
    fact._existence = EXISTENCE.IMPOSSIBLE;
    return { status: 'impossible', fact, conflict };
  }

  // Remains unproven
  return { status: 'unproven' };
}
```

### 9.3 Example Workflow

```sys2dsl
# Add hypothesis
@h1 Platypus IS_A_UNPROVEN Mammal

# Later, if proven via external evidence:
@p1 Platypus IS_A_DEMONSTRATED Mammal
# This upgrades existence from -64 to +64
```

---

## 10. dimensions.json Extension

```json
{
  "axes": {
    "24": {
      "name": "existence",
      "description": "Epistemic status of fact",
      "range": [-127, 127],
      "default": 127,
      "values": {
        "IMPOSSIBLE": -127,
        "UNPROVEN": -64,
        "POSSIBLE": 0,
        "DEMONSTRATED": 64,
        "CERTAIN": 127
      }
    }
  },
  "relationVariants": {
    "IS_A_CERTAIN": { "base": "IS_A", "existence": 127 },
    "IS_A_DEMONSTRATED": { "base": "IS_A", "existence": 64 },
    "IS_A_POSSIBLE": { "base": "IS_A", "existence": 0 },
    "IS_A_UNPROVEN": { "base": "IS_A", "existence": -64 }
  }
}
```

---

## 11. API Integration

### 11.1 Session Methods

```javascript
class Session {
  // Set mode
  setMode(mode) { ... }

  // Add fact respecting mode
  addFact(subject, relation, object) {
    const existence = this.getDefaultExistence();
    return this.store.addFact(subject, relation, object, existence);
  }

  // Add with explicit existence
  addFactWithExistence(subject, relation, object, existence) {
    return this.store.addFact(subject, relation, object, existence);
  }

  // Query (read-only, no creation)
  query(subject, relation, object) {
    // First try direct
    const direct = this.store.getFact(subject, relation, object);
    if (direct) return { found: true, existence: direct._existence };

    // Try transitive
    const transitive = this.reasoner.deduceWithExistence(subject, relation, object);
    if (transitive.found) return transitive;

    // Unknown (open-world)
    return { found: false, status: 'UNKNOWN' };
  }
}
```

---

## 12. Test Cases

| Test | Input | Expected |
|------|-------|----------|
| Learning mode add | mode=learning, add "X IS_A Y" | existence=127 |
| Reasoning mode add | mode=reasoning, add "X IS_A Y" | existence=-64 |
| IS_A_CERTAIN | add "X IS_A_CERTAIN Y" | existence=127 |
| IS_A_UNPROVEN | add "X IS_A_UNPROVEN Y" | existence=-64 |
| Version upgrade | add same fact at 127, then -64 | remains 127 |
| Chain computation | A→B(127), B→C(64) | A→C = 64 |

---

## 13. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-03 | Initial draft |
| 2.0 | 2025-12-03 | Corrected mode semantics: LEARNING=CERTAIN, REASONING=UNPROVEN |

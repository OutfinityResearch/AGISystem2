# FS-OWS: Functional Specification - Open-World Semantics

**Document ID**: FS-OWS-001
**Version**: 1.0
**Date**: 2025-12-03
**Status**: Draft
**Implements**: URS-TAI-010 through URS-TAI-012, URS-TAI-020, URS-TAI-021

---

## 1. Overview

### 1.1 Purpose

This document specifies the functional behavior of **Open-World Semantics** in AGISystem2. The core principle is:

> **Absence of evidence is not evidence of absence.**

A fact not in the knowledge base is UNKNOWN, not FALSE.

### 1.2 Current Problem

The current implementation conflates "not found" with "create as true":

```javascript
// CURRENT (WRONG) behavior:
query("Dog IS_A Fish")
  → Not found in KB
  → Creates: Dog IS_A Fish (existence=127)
  → Returns: true

// EXPECTED (CORRECT) behavior:
query("Dog IS_A Fish")
  → Not found in KB
  → Returns: { found: false, status: 'UNKNOWN' }
  → KB unchanged
```

### 1.3 Scope

This specification covers:

1. Query operation semantics
2. Learning mode behavior
3. Explicit assertion operations
4. Reasoning vs. assertion distinction
5. Explainability and trace output

---

## 2. Query Operations

### 2.1 Query Definition

A **query** is a read-only operation that checks the truth value of a statement against the knowledge base without modifying it.

### 2.2 Query Syntax

| Interface | Syntax | Description |
|-----------|--------|-------------|
| DSL | `? subject RELATION object` | Inline query |
| API | `session.ask('subject RELATION object')` | Programmatic |
| CLI | `ask subject RELATION object` | Command line |

### 2.3 Query Return Values

```javascript
// Success - fact found
{
  found: true,
  existence: 127,           // CERTAIN
  fact: { subject, relation, object, factId },
  derivation: null          // Direct fact, not derived
}

// Success - derived via reasoning
{
  found: true,
  existence: 64,            // DEMONSTRATED
  fact: null,               // Virtual, not stored
  derivation: {
    rule: 'IS_A_TRANSITIVITY',
    chain: [...factIds],
    explanation: 'Dog IS_A Mammal, Mammal IS_A Vertebrate → Dog IS_A Vertebrate'
  }
}

// Not found
{
  found: false,
  status: 'UNKNOWN',
  searchedRelations: ['IS_A'],
  searchedPaths: ['direct', 'transitive']
}

// Explicitly impossible
{
  found: false,
  status: 'IMPOSSIBLE',
  reason: 'Contradicted by: Dog IS_A Mammal, Mammal DISJOINT_WITH Fish',
  conflictingFacts: [factId1, factId2]
}
```

### 2.4 Query Algorithm

```javascript
async query(subject, relation, object, options = {}) {
  const { minExistence = EXISTENCE.IMPOSSIBLE } = options;

  // Step 1: Direct lookup
  const direct = this.store.getFact(subject, relation, object);
  if (direct && direct._existence >= minExistence) {
    return {
      found: true,
      existence: direct._existence,
      fact: direct,
      derivation: null
    };
  }

  // Step 2: Transitive reasoning (for IS_A and similar)
  if (this.isTransitiveRelation(relation)) {
    const derived = await this.reasoner.deduceWithExistence(subject, relation, object);
    if (derived.found && derived.existence >= minExistence) {
      return {
        found: true,
        existence: derived.existence,
        fact: null,  // Virtual
        derivation: derived.derivation
      };
    }
  }

  // Step 3: Check if explicitly impossible
  const impossibility = this.checkImpossibility(subject, relation, object);
  if (impossibility) {
    return {
      found: false,
      status: 'IMPOSSIBLE',
      reason: impossibility.reason,
      conflictingFacts: impossibility.facts
    };
  }

  // Step 4: Unknown (open-world)
  return {
    found: false,
    status: 'UNKNOWN',
    searchedRelations: [relation],
    searchedPaths: ['direct', 'transitive']
  };
}
```

### 2.5 Query MUST NOT Modify State

```javascript
// Verification: No side effects
const beforeSnapshot = this.store.getFactCount();
const result = await this.query(subject, relation, object);
const afterSnapshot = this.store.getFactCount();

assert(beforeSnapshot === afterSnapshot, 'Query must not modify knowledge base');
```

---

## 3. Session Modes

### 3.1 Mode Definition

| Mode | Constant | Behavior |
|------|----------|----------|
| QUERY_MODE | 0 | Read-only, returns UNKNOWN for missing |
| LEARNING_MODE | 1 | Creates facts with UNPROVEN existence |
| TRUSTED_MODE | 2 | Creates facts with CERTAIN existence |

### 3.2 Mode Setting

```javascript
// API
session.setMode('LEARNING');  // or 'QUERY' or 'TRUSTED'

// DSL
@modeSet session SET_MODE learning
```

### 3.3 Mode Behavior

```javascript
async ingest(statement, options = {}) {
  const mode = options.mode || this.currentMode;

  switch (mode) {
    case 'QUERY':
      // Don't create, just check
      return this.query(statement.subject, statement.relation, statement.object);

    case 'LEARNING':
      // Create with UNPROVEN
      return this.store.addFact(
        statement.subject,
        statement.relation,
        statement.object,
        EXISTENCE.UNPROVEN
      );

    case 'TRUSTED':
      // Create with CERTAIN
      return this.store.addFact(
        statement.subject,
        statement.relation,
        statement.object,
        EXISTENCE.CERTAIN
      );
  }
}
```

### 3.4 Theory Loading Mode

Theories are loaded in TRUSTED mode by default:

```javascript
async loadTheory(filepath) {
  const previousMode = this.currentMode;
  this.currentMode = 'TRUSTED';

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    await this.execute(content);
  } finally {
    this.currentMode = previousMode;
  }
}
```

---

## 4. Explicit Assertion Operations

### 4.1 Assertion Verbs

| Verb | Existence Level | Description |
|------|-----------------|-------------|
| IS_A | Mode-dependent | Standard assertion |
| IS_A_CERTAIN | 127 | Force CERTAIN |
| IS_A_PROVEN | 64 | Force DEMONSTRATED |
| IS_A_POSSIBLE | 0 | Force POSSIBLE |
| IS_A_UNPROVEN | -64 | Force UNPROVEN |
| ADD | Mode-dependent | Generic add |
| LEARN | -64 | Always UNPROVEN |
| AXIOM | 127 | Always CERTAIN |

### 4.2 Assertion Behavior

```javascript
const VERB_EXISTENCE = {
  'IS_A_CERTAIN': EXISTENCE.CERTAIN,
  'IS_A_PROVEN': EXISTENCE.DEMONSTRATED,
  'IS_A_POSSIBLE': EXISTENCE.POSSIBLE,
  'IS_A_UNPROVEN': EXISTENCE.UNPROVEN,
  'AXIOM': EXISTENCE.CERTAIN,
  'LEARN': EXISTENCE.UNPROVEN
};

handleVerb(verb, subject, object) {
  const forcedExistence = VERB_EXISTENCE[verb];

  if (forcedExistence !== undefined) {
    return this.store.addFact(subject, this.getBaseRelation(verb), object, forcedExistence);
  }

  // Mode-dependent
  const existence = this.currentMode === 'LEARNING'
    ? EXISTENCE.UNPROVEN
    : EXISTENCE.CERTAIN;

  return this.store.addFact(subject, verb, object, existence);
}
```

---

## 5. Reasoning vs. Assertion

### 5.1 Fundamental Distinction

| Operation | Creates Facts | Max Existence | Stored |
|-----------|---------------|---------------|--------|
| Assertion | Yes | CERTAIN (127) | Yes |
| Derivation | No (virtual) | DEMONSTRATED (64) | No (cached) |
| Learning | Yes | UNPROVEN (-64) | Yes |

### 5.2 Derivation Caching

Derived facts are not stored in the main KB but may be cached:

```javascript
class DerivationCache {
  constructor(ttl = 60000) {
    this._cache = new Map();
    this._ttl = ttl;
  }

  get(key) {
    const entry = this._cache.get(key);
    if (entry && Date.now() - entry.timestamp < this._ttl) {
      return entry.value;
    }
    return null;
  }

  set(key, value) {
    this._cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
}
```

### 5.3 Materialization Request

A user can explicitly request to materialize a derivation:

```javascript
// DSL
@newFact subject MATERIALIZE $derivedResult

// API
session.materialize(derivedResult, { existence: EXISTENCE.DEMONSTRATED });
```

This stores the derived fact with:
- Explicit existence level (default DEMONSTRATED)
- Provenance pointing to derivation
- Marked as materialized (not original)

---

## 6. Impossibility Detection

### 6.1 IMPOSSIBLE Status

A fact is IMPOSSIBLE (not just UNKNOWN) when it contradicts established facts:

```javascript
checkImpossibility(subject, relation, object) {
  // Case 1: DISJOINT_WITH
  if (relation === 'IS_A') {
    // Check if subject is already IS_A something disjoint from object
    const subjectTypes = this.store.getFactsBySubjectRelation(subject, 'IS_A');
    const objectDisjoints = this.store.getFactsBySubjectRelation(object, 'DISJOINT_WITH');

    for (const type of subjectTypes) {
      for (const disjoint of objectDisjoints) {
        if (type.object === disjoint.object || this.isSubtypeOf(type.object, disjoint.object)) {
          return {
            reason: `${subject} IS_A ${type.object}, but ${type.object} DISJOINT_WITH ${object}`,
            facts: [type.factId, disjoint.factId]
          };
        }
      }
    }
  }

  // Case 2: Explicit negation
  const negation = this.store.getFact(subject, `NOT_${relation}`, object);
  if (negation) {
    return {
      reason: `Explicit negation exists: ${subject} NOT_${relation} ${object}`,
      facts: [negation.factId]
    };
  }

  return null;
}
```

### 6.2 Example: DISJOINT_WITH Contradiction

```
KB contains:
  Dog IS_A Mammal
  Mammal DISJOINT_WITH Fish

Query: Dog IS_A Fish

Check:
  Dog IS_A Mammal (exists)
  Fish ancestors: Fish, Vertebrate, Animal...
  Check Mammal DISJOINT_WITH Fish → YES

Result:
  {
    found: false,
    status: 'IMPOSSIBLE',
    reason: 'Dog IS_A Mammal, but Mammal DISJOINT_WITH Fish',
    conflictingFacts: [fact59, fact53]
  }
```

---

## 7. Explainability Output

### 7.1 Explanation Structure

```javascript
{
  query: "Dog IS_A Vertebrate",
  result: {
    found: true,
    existence: 64,
    status: 'DEMONSTRATED'
  },
  explanation: {
    type: 'TRANSITIVE_CHAIN',
    steps: [
      {
        fact: "Dog IS_A Mammal",
        source: "ontology_base.sys2dsl:59",
        existence: 127
      },
      {
        fact: "Mammal IS_A Vertebrate",
        source: "ontology_base.sys2dsl:46",
        existence: 127
      }
    ],
    rule: "IS_A is transitive: A IS_A B ∧ B IS_A C → A IS_A C",
    computation: "existence = min(127, 127) = 127; derived → cap at 64"
  }
}
```

### 7.2 Human-Readable Format

```
Query: Is Dog a Vertebrate?

Answer: YES (DEMONSTRATED, existence=64)

Reasoning:
  1. Dog IS_A Mammal [CERTAIN, ontology_base.sys2dsl:59]
  2. Mammal IS_A Vertebrate [CERTAIN, ontology_base.sys2dsl:46]

Rule Applied: IS_A Transitivity
  A IS_A B ∧ B IS_A C → A IS_A C

Existence Computation:
  Chain minimum: min(127, 127) = 127
  Derivation cap: max(DEMONSTRATED) = 64
  Final: 64 (DEMONSTRATED)
```

### 7.3 Contradiction Explanation

```
Query: Is Dog a Fish?

Answer: NO (IMPOSSIBLE)

Conflict Detected:
  1. Dog IS_A Mammal [CERTAIN, ontology_base.sys2dsl:59]
  2. Mammal DISJOINT_WITH Fish [CERTAIN, ontology_base.sys2dsl:54]

Explanation:
  Dog is known to be a Mammal.
  Mammals and Fish are disjoint categories (cannot overlap).
  Therefore, Dog cannot be a Fish.

Resolution Options:
  - If Dog should be a Fish, retract "Dog IS_A Mammal"
  - If the disjointness is wrong, retract "Mammal DISJOINT_WITH Fish"
  - Neither change: the query remains IMPOSSIBLE
```

---

## 8. API Functional Requirements

### 8.1 Session.ask()

```javascript
/**
 * Query the knowledge base without modification.
 *
 * @param {string} queryString - The query in "subject RELATION object" format
 * @param {Object} options - Query options
 * @param {number} options.minExistence - Minimum existence level to consider
 * @param {boolean} options.explain - Include explanation in result
 * @returns {QueryResult} The query result
 *
 * @example
 * const result = await session.ask('Dog IS_A Vertebrate');
 * // { found: true, existence: 64, ... }
 *
 * @example
 * const result = await session.ask('Dog IS_A Fish');
 * // { found: false, status: 'IMPOSSIBLE', ... }
 */
async ask(queryString, options = {}) {
  const parsed = this.parser.parseQuery(queryString);
  return this.query(parsed.subject, parsed.relation, parsed.object, options);
}
```

### 8.2 Session.learn()

```javascript
/**
 * Add a fact in learning mode (UNPROVEN existence).
 *
 * @param {string} statement - The statement to learn
 * @returns {AddResult} The result of adding the fact
 *
 * @example
 * await session.learn('Platypus IS_A Mammal');
 * // Creates: Platypus IS_A Mammal (existence=-64)
 */
async learn(statement) {
  const parsed = this.parser.parseStatement(statement);
  return this.store.addFact(
    parsed.subject,
    parsed.relation,
    parsed.object,
    EXISTENCE.UNPROVEN
  );
}
```

### 8.3 Session.assert()

```javascript
/**
 * Add a fact with explicit existence level.
 *
 * @param {string} statement - The statement to assert
 * @param {Object} options - Assertion options
 * @param {number} options.existence - Existence level (default: CERTAIN)
 * @returns {AddResult} The result of adding the fact
 */
async assert(statement, options = {}) {
  const { existence = EXISTENCE.CERTAIN } = options;
  const parsed = this.parser.parseStatement(statement);
  return this.store.addFact(
    parsed.subject,
    parsed.relation,
    parsed.object,
    existence
  );
}
```

---

## 9. DSL Functional Requirements

### 9.1 Query Syntax

```sys2dsl
# Query with result binding
@result ? Dog IS_A Vertebrate

# Conditional based on query
@check ? Dog IS_A Fish
@action IF $check.found THEN
  @log subject NOTIFY found
END
```

### 9.2 Mode Setting

```sys2dsl
# Set session mode
@modeSetting session SET_MODE learning

# Assertions in learning mode use UNPROVEN
@newFact Platypus IS_A Mammal  # existence = -64
```

### 9.3 Explicit Existence

```sys2dsl
# Force specific existence
@axiom1 Water IS_A Substance EXISTENCE CERTAIN
@hypothesis1 Alien IS_A LifeForm EXISTENCE POSSIBLE
@claim1 Bigfoot IS_A Mammal EXISTENCE UNPROVEN
```

---

## 10. CLI Functional Requirements

### 10.1 Query Command

```bash
# Simple query
> ask Dog IS_A Vertebrate
? Dog IS_A Vertebrate
  YES (DEMONSTRATED, existence=64)

# Query with explanation
> ask Dog IS_A Vertebrate --explain
? Dog IS_A Vertebrate
  YES (DEMONSTRATED, existence=64)

  Reasoning:
    1. Dog IS_A Mammal [CERTAIN]
    2. Mammal IS_A Vertebrate [CERTAIN]

# Query impossible
> ask Dog IS_A Fish
? Dog IS_A Fish
  NO (IMPOSSIBLE)
  Conflict: Dog IS_A Mammal, Mammal DISJOINT_WITH Fish
```

### 10.2 Mode Command

```bash
# Switch mode
> mode learning
Session mode set to: LEARNING

# Check mode
> mode
Current mode: LEARNING

# Add in learning mode
> add Platypus IS_A Mammal
Added: Platypus IS_A Mammal (existence=-64, UNPROVEN)
```

---

## 11. Test Cases

### 11.1 Query Tests

| Test ID | Input | Expected | Validates |
|---------|-------|----------|-----------|
| OWS-Q01 | ask("Dog IS_A Mammal") | found=true, existence=127 | Direct lookup |
| OWS-Q02 | ask("Dog IS_A Vertebrate") | found=true, existence=64 | Transitive |
| OWS-Q03 | ask("Dog IS_A Fish") | found=false, IMPOSSIBLE | Contradiction |
| OWS-Q04 | ask("Unicorn IS_A Mammal") | found=false, UNKNOWN | Open-world |
| OWS-Q05 | ask("Dog IS_A Mammal") twice | Same result, no duplication | Idempotent |

### 11.2 Mode Tests

| Test ID | Setup | Input | Expected |
|---------|-------|-------|----------|
| OWS-M01 | QUERY mode | ingest("X IS_A Y") | No fact created |
| OWS-M02 | LEARNING mode | ingest("X IS_A Y") | existence=-64 |
| OWS-M03 | TRUSTED mode | ingest("X IS_A Y") | existence=127 |
| OWS-M04 | Theory load | loadTheory() | All facts CERTAIN |

### 11.3 Existence Tests

| Test ID | Input | Expected |
|---------|-------|----------|
| OWS-E01 | IS_A_CERTAIN | existence=127 |
| OWS-E02 | IS_A_PROVEN | existence=64 |
| OWS-E03 | IS_A_POSSIBLE | existence=0 |
| OWS-E04 | IS_A_UNPROVEN | existence=-64 |
| OWS-E05 | LEARN verb | existence=-64 |
| OWS-E06 | AXIOM verb | existence=127 |

---

## 12. Error Handling

### 12.1 Invalid Query

```javascript
ask("InvalidSyntax")
  → Error: "Cannot parse query: missing relation"

ask("")
  → Error: "Empty query"

ask("A IS_A")
  → Error: "Missing object in query"
```

### 12.2 Mode Errors

```javascript
setMode("INVALID")
  → Error: "Unknown mode: INVALID. Valid modes: QUERY, LEARNING, TRUSTED"
```

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | AGISystem2 Team | Initial draft |

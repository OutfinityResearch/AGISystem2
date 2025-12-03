# FS-OWS: Functional Specification - Open-World Semantics

**Document ID**: FS-OWS-001
**Version**: 2.0
**Date**: 2025-12-03
**Status**: Draft
**Implements**: URS-TAI-010 through URS-TAI-012, URS-TAI-030, URS-TAI-031

---

## 1. Overview

### 1.1 Purpose

This document specifies the functional behavior of **Open-World Semantics** in AGISystem2.

**Core Principle**: Absence of evidence is not evidence of absence. A fact not in the knowledge base is UNKNOWN, not FALSE.

### 1.2 Design Constraint

**Triple syntax only**. No special query operators. Query vs. assertion is an API-level distinction, not DSL syntax.

---

## 2. Query vs. Assertion

### 2.1 The Distinction

| Operation | Creates Facts | Method |
|-----------|---------------|--------|
| Query | NO | `session.ask()` API |
| Assertion | YES | `session.run()` DSL |

### 2.2 Query is API-Level

Queries are **not** DSL syntax. They're API calls:

```javascript
// Query - read-only, never creates facts
const result = await session.ask('Dog IS_A Mammal');
// Returns: { found: true, existence: 127 }
// or: { found: false, status: 'UNKNOWN' }

// Assertion - may create facts (depends on mode)
await session.run('@f1 Dog IS_A Mammal');
```

### 2.3 No Special DSL Operators

**WRONG** (removed):
```sys2dsl
@result ? Dog IS_A Mammal  # NO - violates triple syntax
```

**CORRECT**:
```javascript
// In JavaScript/API
session.ask('Dog IS_A Mammal');
```

---

## 3. Session Modes

### 3.1 API Entry Points

| API Method | Initial Mode | Behavior |
|------------|--------------|----------|
| `session.run(dsl)` | LEARNING | Executes DSL, creates facts with CERTAIN |
| `session.ask(query)` | QUERY | Read-only, derives, returns existence |

### 3.2 LEARNING Mode

- `session.run()` starts in this mode
- Facts are **trusted** (from teacher/theory)
- Created facts get existence = CERTAIN (+127)
- Theory loading uses this mode

```javascript
await session.run('@f1 Dog IS_A Mammal');
// Creates: Dog IS_A Mammal, existence=127
```

### 3.3 QUERY Mode

- `session.ask()` starts in this mode
- **Read-only** - does NOT create facts
- Derives facts via transitive reasoning
- Returns existence level or UNKNOWN

```javascript
await session.ask('Dog IS_A Vertebrate');
// Returns: { found: true, existence: 64 } (derived)
// Does NOT create any facts
```

### 3.4 Mode Switching via DSL

Modes can be switched during execution:

```sys2dsl
# Switch to query mode for read-only section
@m1 session SET_MODE query
# ... read operations ...

# Switch back to learning mode
@m2 session SET_MODE learning
@f1 Cat IS_A Mammal   # creates with CERTAIN
```

---

## 4. Query Behavior

### 4.1 Query Algorithm

```javascript
async ask(queryString) {
  const { subject, relation, object } = this.parse(queryString);

  // Step 1: Direct lookup
  const direct = this.store.getFact(subject, relation, object);
  if (direct) {
    return {
      found: true,
      existence: direct._existence,
      fact: direct,
      source: 'direct'
    };
  }

  // Step 2: Transitive reasoning (for IS_A, etc.)
  if (this.isTransitiveRelation(relation)) {
    const derived = await this.reasoner.deduceWithExistence(subject, relation, object);
    if (derived.found) {
      return {
        found: true,
        existence: derived.existence,
        fact: null,  // Virtual, not stored
        source: 'derived',
        chain: derived.chain
      };
    }
  }

  // Step 3: Check if impossible
  const impossibility = this.checkImpossibility(subject, relation, object);
  if (impossibility) {
    return {
      found: false,
      status: 'IMPOSSIBLE',
      reason: impossibility.reason,
      conflicts: impossibility.facts
    };
  }

  // Step 4: Unknown (open-world)
  return {
    found: false,
    status: 'UNKNOWN'
  };
}
```

### 4.2 Query NEVER Creates Facts

```javascript
// Verify no side effects
const countBefore = store.getFactCount();
const result = await session.ask('Dog IS_A Fish');
const countAfter = store.getFactCount();

assert(countBefore === countAfter);  // Must be equal
```

---

## 5. Query Results

### 5.1 Found (Direct)

```javascript
{
  found: true,
  existence: 127,
  fact: { factId: 59, subject: 'Dog', relation: 'IS_A', object: 'Mammal' },
  source: 'direct'
}
```

### 5.2 Found (Derived)

```javascript
{
  found: true,
  existence: 64,  // Capped at DEMONSTRATED
  fact: null,     // Virtual
  source: 'derived',
  chain: [
    { fact: 'Dog IS_A Mammal', existence: 127 },
    { fact: 'Mammal IS_A Vertebrate', existence: 127 }
  ]
}
```

### 5.3 Not Found (Unknown)

```javascript
{
  found: false,
  status: 'UNKNOWN'
}
```

### 5.4 Not Found (Impossible)

```javascript
{
  found: false,
  status: 'IMPOSSIBLE',
  reason: 'Dog IS_A Mammal, Mammal DISJOINT_WITH Fish',
  conflicts: [59, 53]  // Fact IDs
}
```

---

## 6. Impossibility Detection

### 6.1 DISJOINT_WITH Check

```javascript
checkImpossibility(subject, relation, object) {
  if (relation !== 'IS_A') return null;

  // Get what subject IS_A
  const subjectTypes = this.store.getFactsBySubjectRelation(subject, 'IS_A');

  // Get what's disjoint with object
  const disjointWith = this.store.getFactsBySubjectRelation(object, 'DISJOINT_WITH');

  for (const type of subjectTypes) {
    for (const disjoint of disjointWith) {
      if (this.overlaps(type.object, disjoint.object)) {
        return {
          reason: `${subject} IS_A ${type.object}, ${type.object} DISJOINT_WITH ${object}`,
          facts: [type.factId, disjoint.factId]
        };
      }
    }
  }

  return null;
}
```

### 6.2 Example

```
KB contains:
  @on59 Dog IS_A Mammal
  @on53 Mammal DISJOINT_WITH Fish

Query: session.ask('Dog IS_A Fish')

Check:
  Dog IS_A Mammal ✓
  Mammal DISJOINT_WITH Fish ✓
  → Impossible

Result:
  { found: false, status: 'IMPOSSIBLE', reason: '...' }
```

---

## 7. Assertion Behavior

### 7.1 Mode-Dependent Existence

```sys2dsl
# In LEARNING mode
@m1 session SET_MODE learning
@f1 Cat IS_A Mammal
# → existence = 127 (CERTAIN)

# In REASONING mode
@m2 session SET_MODE reasoning
@f2 Alien IS_A LifeForm
# → existence = -64 (UNPROVEN)
```

### 7.2 Explicit Existence Variants

Override mode with explicit variants:

```sys2dsl
# Force specific existence regardless of mode
@f1 Dog IS_A_CERTAIN Mammal         # 127
@f2 Yeti IS_A_UNPROVEN Mammal       # -64
@f3 Whale IS_A_DEMONSTRATED Mammal  # 64
@f4 Unicorn IS_A_POSSIBLE Mammal    # 0
```

---

## 8. Hypothesis Workflow

### 8.1 Adding Hypotheses (Explicit UNPROVEN)

To add a hypothesis that needs proving, use explicit existence variants:

```sys2dsl
# In LEARNING mode, add as unproven hypothesis
@h1 Yeti IS_A_UNPROVEN Mammal    # existence = -64
@h2 Alien IS_A_POSSIBLE LifeForm # existence = 0
```

### 8.2 Proof Attempt

The system can attempt to prove hypotheses on demand:

```javascript
async attemptProof(subject, relation, object) {
  // Search for supporting chain
  const chain = await this.reasoner.findChain(subject, relation, object);

  if (chain.found) {
    // Upgrade to DEMONSTRATED
    const fact = this.store.getFact(subject, relation, object);
    if (fact) {
      fact._existence = EXISTENCE.DEMONSTRATED;
      fact._provenance.derivedFrom = chain.facts.map(f => f.factId);
      fact._provenance.rule = chain.rule;
    }
    return { status: 'demonstrated', chain };
  }

  // Check contradiction
  const conflict = this.checkContradiction(subject, relation, object);
  if (conflict) {
    const fact = this.store.getFact(subject, relation, object);
    if (fact) fact._existence = EXISTENCE.IMPOSSIBLE;
    return { status: 'impossible', conflict };
  }

  return { status: 'unproven' };
}
```

### 8.3 Example Workflow

```sys2dsl
# Add hypothesis
@h1 Platypus IS_A_UNPROVEN Mammal

# Ask system to prove (via API or relation)
@prove Platypus ATTEMPT_PROOF Mammal

# If proven externally, upgrade explicitly
@p1 Platypus IS_A_DEMONSTRATED Mammal
```

---

## 9. Explainability

### 9.1 Provenance Structure

Every fact tracks:

```javascript
{
  factId: 123,
  subject: "Dog",
  relation: "IS_A",
  object: "Vertebrate",
  _existence: 64,
  _provenance: {
    source: "reasoning",
    line: null,
    createdAt: 1701619200000,
    derivedFrom: [59, 46],  // Dog→Mammal, Mammal→Vertebrate
    rule: "IS_A_TRANSITIVITY"
  }
}
```

### 9.2 Query Explanation

```javascript
const result = await session.ask('Dog IS_A Vertebrate', { explain: true });

// Result includes explanation
{
  found: true,
  existence: 64,
  explanation: {
    type: 'TRANSITIVE_CHAIN',
    steps: [
      { fact: 'Dog IS_A Mammal', source: 'ontology_base.sys2dsl:59', existence: 127 },
      { fact: 'Mammal IS_A Vertebrate', source: 'ontology_base.sys2dsl:46', existence: 127 }
    ],
    rule: 'IS_A is transitive',
    existenceComputation: 'min(127, 127) = 127, derived cap → 64'
  }
}
```

### 9.3 Contradiction Explanation

```javascript
const result = await session.ask('Dog IS_A Fish', { explain: true });

{
  found: false,
  status: 'IMPOSSIBLE',
  explanation: {
    conflict: [
      { fact: 'Dog IS_A Mammal', source: 'ontology_base.sys2dsl:59' },
      { fact: 'Mammal DISJOINT_WITH Fish', source: 'ontology_base.sys2dsl:54' }
    ],
    rule: 'DISJOINT_WITH blocks IS_A',
    resolution: 'Dog cannot be both Mammal and Fish'
  }
}
```

---

## 10. CLI Commands

### 10.1 Ask Command

```bash
> ask Dog IS_A Vertebrate
Dog IS_A Vertebrate: YES (DEMONSTRATED, existence=64)

> ask Dog IS_A Fish
Dog IS_A Fish: NO (IMPOSSIBLE)
Conflict: Dog IS_A Mammal, Mammal DISJOINT_WITH Fish

> ask Unicorn IS_A Mammal
Unicorn IS_A Mammal: UNKNOWN
```

### 10.2 Mode Command

```bash
> mode
Current mode: learning

> mode reasoning
Mode set to: reasoning

> add Yeti IS_A Primate
Added: Yeti IS_A Primate (existence=-64, UNPROVEN)
Attempting proof... NOT DEMONSTRATED
```

---

## 11. API Methods

### 11.1 session.ask()

```javascript
/**
 * Query the knowledge base without modification.
 * @param {string} query - "Subject RELATION Object"
 * @param {Object} options
 * @param {boolean} options.explain - Include explanation
 * @param {number} options.minExistence - Minimum existence to consider
 * @returns {QueryResult}
 */
async ask(query, options = {})
```

### 11.2 session.run()

```javascript
/**
 * Execute DSL statements (may create facts).
 * @param {string|string[]} statements - DSL statements
 * @returns {ExecutionResult}
 */
async run(statements)
```

### 11.3 session.setMode()

```javascript
/**
 * Set session mode.
 * @param {'learning'|'reasoning'} mode
 */
setMode(mode)
```

---

## 12. Test Cases

### 12.1 Query Tests

| Test | Input | Expected |
|------|-------|----------|
| Direct fact | ask('Dog IS_A Mammal') | found=true, existence=127 |
| Derived fact | ask('Dog IS_A Vertebrate') | found=true, existence=64 |
| Unknown | ask('Unicorn IS_A Mammal') | found=false, UNKNOWN |
| Impossible | ask('Dog IS_A Fish') | found=false, IMPOSSIBLE |
| No creation | ask() then count facts | Count unchanged |

### 12.2 Mode Tests

| Test | Setup | Input | Expected |
|------|-------|-------|----------|
| Learning | mode=learning | add "X IS_A Y" | existence=127 |
| Reasoning | mode=reasoning | add "X IS_A Y" | existence=-64 |
| Explicit | any mode | "X IS_A_CERTAIN Y" | existence=127 |

### 12.3 Proof Tests

| Test | Setup | Input | Expected |
|------|-------|-------|----------|
| Provable | A→B→C in KB | reason "A IS_A C" | DEMONSTRATED |
| Unprovable | Nothing in KB | reason "X IS_A Y" | UNPROVEN |
| Contradicted | DISJOINT in KB | reason conflicting | IMPOSSIBLE |

---

## 13. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-03 | Initial draft with ? operator |
| 2.0 | 2025-12-03 | Removed ? operator, query is API-level only |

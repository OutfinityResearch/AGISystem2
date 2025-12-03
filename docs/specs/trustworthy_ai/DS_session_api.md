# DS-SES: Design Specification - Session API

**Document ID**: DS-SES-001
**Version**: 2.0
**Date**: 2025-12-03
**Status**: Draft
**Implements**: URS-TAI-010 through URS-TAI-013, DS-EXI, FS-OWS

---

## 1. Overview

### 1.1 Purpose

This document specifies the Session API design that provides the `run()` and `ask()` entry points for AGISystem2, implementing LEARNING and QUERY modes for Trustworthy AI.

### 1.2 Module Location

```
src/core/session.js
```

### 1.3 Fundamental Principles

#### THE SACRED RULE: Single Static Assignment (SSA)

> **Every @variable is declared EXACTLY ONCE. No exceptions.**

This is the foundational constraint of Sys2DSL. Like SSA in compiler design, each variable binding is immutable once created.

```sys2dsl
# CORRECT - each variable declared once
@f1 Dog IS_A Mammal
@f2 Mammal IS_A Animal
@chain $f1 LEADS_TO $f2

# WRONG - @f1 declared twice
@f1 Dog IS_A Mammal
@f1 Cat IS_A Mammal    # VIOLATION: @f1 already exists
```

#### Everything is Triples

All data, queries, and results are expressed as triples. There are NO special operators:
- NO `AND`, `OR`, `NOT` operators
- NO JSON responses
- NO inline expressions

Relations connect points. Sets and chains are built through triples.

---

## 2. Results as Points

### 2.1 Core Concept

Both `run()` and `ask()` return **POINTS** in the semantic space, not JSON objects.

A point can be:
- **Existing**: A concept, fact, or theory already in the store
- **Derived**: A new point representing a proof-chain or fact-set

### 2.2 Point Types

#### Direct Point (Existing Fact)
```sys2dsl
@q1 Dog IS_A Mammal
# Returns: reference to existing fact point
```

#### Derived Point (Proof Chain)
```sys2dsl
# Query triggers derivation
@q1 Dog IS_A Animal

# System constructs proof as chain of triples:
@step1 Dog IS_A Mammal
@step2 Mammal IS_A Animal
@link1 $step1 LEADS_TO $step2
@proof $link1 PROVES $q1
```

#### Set Point (Collection of Facts)
```sys2dsl
# Query for all mammals
@q1 any IS_A Mammal

# System constructs set as triples:
@result mammals_set IS_A fact_set
@m1 Dog MEMBER_OF $result
@m2 Cat MEMBER_OF $result
@m3 Whale MEMBER_OF $result
```

### 2.3 Proof as Macro

A proof is a **macro** - a DSL script that produces the result point:

```sys2dsl
# The proof IS the sequence of triples that derive the conclusion
@premise1 Socrates IS_A Human
@premise2 Human IS_A Mortal
@derivation $premise1 LEADS_TO $premise2
@conclusion Socrates IS_A Mortal
@proof $derivation PROVES $conclusion
```

---

## 3. Relations for Structure

### 3.1 Chain Relations (Proofs)

| Relation | Meaning | Example |
|----------|---------|---------|
| LEADS_TO | Step in derivation | `@link $step1 LEADS_TO $step2` |
| PROVES | Conclusion of proof | `@proof $chain PROVES $conclusion` |
| DERIVED_FROM | Origin of result | `@result $fact DERIVED_FROM $source` |
| BECAUSE | Causal explanation | `@effect $e BECAUSE $cause` |

### 3.2 Set Relations (Collections)

| Relation | Meaning | Example |
|----------|---------|---------|
| MEMBER_OF | Element in set | `@m1 Dog MEMBER_OF $animals` |
| CONTAINS | Set has element | `@s1 $set CONTAINS Dog` |
| SUBSET_OF | Set inclusion | `@sub $mammals SUBSET_OF $animals` |

### 3.3 Building Complex Structures

#### Chain of implications:
```sys2dsl
@s1 A IS_A B
@s2 B IS_A C
@s3 C IS_A D
@c1 $s1 LEADS_TO $s2
@c2 $c1 LEADS_TO $s3
@proof $c2 PROVES conclusion
```

#### Set with recursive structure:
```sys2dsl
@set1 group1 IS_A fact_set
@m1 fact_a MEMBER_OF $set1
@m2 fact_b MEMBER_OF $set1

@set2 group2 IS_A fact_set
@m3 fact_c MEMBER_OF $set2

@superset all_groups IS_A fact_set
@g1 $set1 MEMBER_OF $superset
@g2 $set2 MEMBER_OF $superset
```

---

## 4. API Entry Points

### 4.1 session.run(dsl)

**Purpose**: Execute DSL statements in LEARNING mode (trusted input)

**Behavior**:
1. Sets mode to LEARNING
2. Parses and executes DSL statements (respecting SSA)
3. Creates facts with CERTAIN existence (127)
4. Returns the last created/referenced point

**Example**:
```sys2dsl
# Input
@f1 Dog IS_A Mammal
@f2 Cat IS_A Mammal
@set animals IS_A fact_set
@m1 $f1 MEMBER_OF $set
@m2 $f2 MEMBER_OF $set

# Returns: point reference to $set
```

### 4.2 session.ask(query)

**Purpose**: Query knowledge base in QUERY mode (read-only)

**Behavior**:
1. Sets mode to QUERY
2. Parses triple from query string
3. Attempts direct lookup → returns existing point
4. Attempts derivation → returns proof point
5. Returns UNKNOWN point if no evidence

**Example**:
```sys2dsl
# Direct lookup
@q1 Dog IS_A Mammal
# Returns: existing fact point

# Derived (transitive)
@q2 Dog IS_A Animal
# Returns: proof point with chain

# Unknown
@q3 Unicorn IS_A Mammal
# Returns: unknown point
```

### 4.3 Result Point Structure

Every result is expressible as DSL:

```sys2dsl
# For direct fact
@result $fact_id IS_A direct_result
@source $result FROM knowledge_base

# For derived fact
@result $proof_id IS_A derived_result
@method $result VIA transitive_chain
@existence $result HAS_LEVEL 64

# For unknown
@result unknown_point IS_A query_result
@status $result HAS_STATUS unknown
```

---

## 5. Mode Management

### 5.1 Mode Constants

| Mode | Creates Facts | Default Existence |
|------|---------------|-------------------|
| LEARNING | Yes | CERTAIN (127) |
| QUERY | No | N/A (read-only) |

### 5.2 Mode Switching via DSL

```sys2dsl
# Switch to query mode
@m1 session SET_MODE query

# Switch back to learning mode
@m2 session SET_MODE learning

# Read current mode
@mode session GET_MODE any
```

---

## 6. Existence Levels

### 6.1 Constants

| Value | Name | Description |
|-------|------|-------------|
| -127 | IMPOSSIBLE | Contradicted by facts |
| -64 | UNPROVEN | Hypothesized, not verified |
| 0 | POSSIBLE | Consistent but unconfirmed |
| +64 | DEMONSTRATED | Derived through reasoning |
| +127 | CERTAIN | From trusted source/axiom |

### 6.2 IS_A Variants

```sys2dsl
# Explicit existence levels
@f1 Dog IS_A_CERTAIN Mammal           # existence = 127
@f2 Yeti IS_A_UNPROVEN Primate        # existence = -64
@f3 Pegasus IS_A_POSSIBLE Creature    # existence = 0
```

---

## 7. Complete Examples

### 7.1 Simple Query with Proof

**Theory**:
```sys2dsl
@t1 Dog IS_A Mammal
@t2 Mammal IS_A Vertebrate
@t3 Vertebrate IS_A Animal
```

**Query**:
```sys2dsl
@q1 Dog IS_A Animal
```

**Result (as DSL)**:
```sys2dsl
# The proof chain
@p1 Dog IS_A Mammal
@p2 Mammal IS_A Vertebrate
@p3 Vertebrate IS_A Animal
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@proof $c2 PROVES $q1
@result $proof IS_A transitive_derivation
@existence $result HAS_LEVEL 64
```

### 7.2 Set Query

**Query**:
```sys2dsl
@q1 any IS_A Mammal
```

**Result (as DSL)**:
```sys2dsl
@result mammal_set IS_A fact_set
@m1 Dog MEMBER_OF $result
@m2 Cat MEMBER_OF $result
@m3 Whale MEMBER_OF $result
@count $result HAS_SIZE 3
```

### 7.3 Deontic Reasoning

**Theory**:
```sys2dsl
@r1 manager PERMITTED_TO access_files
@r2 intern PROHIBITED_FROM access_files
```

**Query**:
```sys2dsl
@q1 intern PERMITTED_TO access_files
```

**Result (as DSL)**:
```sys2dsl
@conflict intern PROHIBITED_FROM access_files
@contradiction $q1 CONFLICTS_WITH $conflict
@result $contradiction IS_A impossibility
@status $result HAS_STATUS impossible
```

### 7.4 Temporal/Inverse Relations

**Theory**:
```sys2dsl
@t1 smartphone AFTER personal_computer
```

**Query**:
```sys2dsl
@q1 smartphone BEFORE personal_computer
```

**Result (as DSL)**:
```sys2dsl
@existing smartphone AFTER personal_computer
@inverse BEFORE INVERSE_OF AFTER
@contradiction $q1 CONTRADICTS $existing
@result $contradiction IS_A impossibility
@reason $result BECAUSE $inverse
```

---

## 8. Test Cases

| Test | Input DSL | Expected Result Point |
|------|-----------|----------------------|
| Direct fact | `@q1 Dog IS_A Mammal` | Existing fact point |
| Derived fact | `@q1 Dog IS_A Animal` | Proof chain point |
| Unknown | `@q1 Unicorn IS_A Mammal` | Unknown point |
| Contradiction | `@q1 Fish IS_A Mammal` (when DISJOINT) | Impossibility point |
| Set query | `@q1 any IS_A Mammal` | Fact-set point |
| SSA violation | `@f1 A B C` then `@f1 X Y Z` | Error: SSA violation |

---

## 9. Validation Rules

### 9.1 SSA Check

Before executing any statement, verify:
1. The @variable does not already exist
2. All referenced $variables do exist

### 9.2 Triple Format

Every statement must be exactly:
```
@variable Subject RELATION Object
```

No deviations, no special syntax.

### 9.3 Result Completeness

Every result must be expressible as a valid DSL sequence that:
1. Respects SSA
2. Uses only triples
3. Can be re-executed to reproduce the point

---

## 10. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-03 | Initial implementation |
| 2.0 | 2025-12-03 | Added SSA rule, results as points, proof structures |

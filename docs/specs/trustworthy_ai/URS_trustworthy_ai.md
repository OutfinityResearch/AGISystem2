# URS-TAI: User Requirements Specification - Trustworthy AI

**Document ID**: URS-TAI-001
**Version**: 2.0
**Date**: 2025-12-03
**Status**: Draft
**Author**: AGISystem2 Team

---

## 1. Purpose and Scope

### 1.1 Purpose

This document defines the User Requirements for implementing Trustworthy AI capabilities in AGISystem2/Sys2DSL. These requirements ensure that the semantic reasoning system operates in a manner that is:

- **Explainable**: All reasoning steps can be traced and justified
- **Verifiable**: Knowledge has provenance and epistemic status
- **Aligned**: Reasoning respects ethical boundaries and declared biases
- **Controllable**: System behavior can be audited and modified through declarative policies

### 1.2 Syntax Constraint

**CRITICAL**: All DSL constructs use strict triple syntax:

```
@variable Subject VERB Object
```

No exceptions. No special operators (`?`, `IF THEN`, `BEGIN END` blocks outside macros). Hooks, queries, conditions - everything is expressed as relations/facts.

### 1.3 API and Mode Model

The system provides two API entry points that set the **initial** engine mode:

| API Method | Initial Mode | Default Behavior |
|------------|--------------|------------------|
| `session.run(dsl)` | LEARNING | Creates facts with CERTAIN existence |
| `session.ask(query)` | QUERY | Read-only, derives, returns existence |

**Internal modes can be switched** during execution via DSL relations:

```sys2dsl
@m1 session SET_MODE learning   # switch to LEARNING
@m2 session SET_MODE query      # switch to QUERY
@m3 session GET_MODE any        # read current mode
```

This allows flexible workflows:
- Start with `run()` in LEARNING mode
- Switch to QUERY mode for read-only operations
- Switch back to LEARNING to add more facts

### 1.4 Scope

This URS covers:

1. **Existence Dimension** - Epistemic status of facts and concepts
2. **Session Modes** - LEARNING vs REASONING behavior
3. **Hook System** - Declarative reflexes as relations
4. **Bias Declaration** - Explicit axiological constraints
5. **Audit Trail** - Complete reasoning provenance

---

## 2. User Requirements

### 2.1 Epistemic Status (Existence Dimension)

#### URS-TAI-001: Existence Levels

**Requirement**: The system SHALL support five distinct levels of epistemic status for all facts:

| Level | Name | Value | Description |
|-------|------|-------|-------------|
| 1 | IMPOSSIBLE | -127 | Contradicted by established facts |
| 2 | UNPROVEN | -64 | Hypothesized, not yet demonstrated |
| 3 | POSSIBLE | 0 | Consistent but not confirmed |
| 4 | DEMONSTRATED | +64 | Derived through valid reasoning |
| 5 | CERTAIN | +127 | From trusted source (theory, learning) |

#### URS-TAI-002: Default Existence by Mode

**Requirement**: Facts SHALL receive existence levels based on session mode:

| Mode | Default Existence | Description |
|------|-------------------|-------------|
| LEARNING | CERTAIN (+127) | Trusted teaching, facts are authoritative |
| REASONING | UNPROVEN (-64) | Exploration, facts need demonstration |

**Rationale**: When learning from a trusted source (teacher, theory), facts are certain. When reasoning/exploring, the system hypothesizes and must prove.

#### URS-TAI-003: Existence Propagation in Chains

**Requirement**: In transitive reasoning chains, the derived fact's existence SHALL be:

1. The minimum of the chain's existence levels
2. Capped at DEMONSTRATED (+64) since it's derived, not directly asserted

**Example**:
```
A IS_A B (existence=127)
B IS_A C (existence=64)
Result: A IS_A C (existence = min(127,64) capped at 64 = 64)
```

#### URS-TAI-004: Version Unification

**Requirement**: When the same fact exists at multiple existence levels, the system SHALL retain only the highest existence level (no duplicates).

---

### 2.2 Session Modes

#### URS-TAI-010: Learning Mode

**Requirement**: In LEARNING mode:
- Facts added receive existence = CERTAIN (+127)
- This is the "teaching" mode - trusted input
- Theory loading uses LEARNING mode
- `session.run()` starts in this mode

**DSL**:
```sys2dsl
# Explicit mode switch (if needed)
@m1 session SET_MODE learning
@f1 Dog IS_A Mammal
# f1 gets existence = 127
```

#### URS-TAI-011: Query Mode

**Requirement**: In QUERY mode:
- Read-only operations - does NOT create facts
- Derives facts via transitive reasoning
- Returns existence level of found/derived facts
- Returns UNKNOWN for missing facts (open-world)
- `session.ask()` starts in this mode

**DSL**:
```sys2dsl
# Switch to query mode for read-only section
@m1 session SET_MODE query
# Any assertions in this mode are blocked or ignored
```

#### URS-TAI-012: Mode Switching

**Requirement**: Modes can be switched during execution:

```sys2dsl
# Start in learning (via run())
@f1 Dog IS_A Mammal           # created with CERTAIN

# Switch to query mode
@m1 session SET_MODE query
# ... read-only operations ...

# Switch back to learning
@m2 session SET_MODE learning
@f2 Cat IS_A Mammal           # created with CERTAIN
```

#### URS-TAI-013: Mode-Independent Variants

**Requirement**: Explicit existence variants SHALL override mode defaults:

```sys2dsl
@f1 Dog IS_A_CERTAIN Mammal      # always 127, regardless of mode
@f2 Dog IS_A_UNPROVEN Mammal     # always -64
@f3 Dog IS_A_DEMONSTRATED Mammal # always 64
@f4 Dog IS_A_POSSIBLE Mammal     # always 0
```

---

### 2.3 Hook System (As Relations)

#### URS-TAI-020: Hooks Are Facts

**Requirement**: Hooks SHALL be declared as regular facts/relations in theories. No special syntax.

**Example**:
```sys2dsl
# Declare a hook for ON_FACT_ADDED event
@h1 existence_policy HOOK ON_FACT_ADDED

# The hook references a macro that defines behavior
@h2 existence_policy EXECUTES check_learning_mode
```

#### URS-TAI-021: Event Types

**Requirement**: The system SHALL support hooks for:

| Event | Trigger |
|-------|---------|
| ON_FACT_ADDED | New fact stored |
| ON_CONCEPT_CREATED | New concept first used |
| ON_REASONING_STEP | Inference in axiological region |
| ON_CONTRADICTION | Conflict detected |

#### URS-TAI-022: Hook Isolation

**Requirement**: During hook execution:
1. Other hooks are disabled (no recursion)
2. Direct index writes are blocked
3. Only meta-relations can modify state

#### URS-TAI-023: Meta-Relations for Hooks

**Requirement**: Special relations available in hook context:

```sys2dsl
@e1 $subject SET_EXISTENCE UNPROVEN
@e2 $subject ADD_TAG unknown_domain
@e3 $subject NEEDS_CONFIRMATION ethics_review
@e4 $subject BLOCK_REASONING forbidden_zone
```

---

### 2.4 Explainability

#### URS-TAI-030: Reasoning Trace

**Requirement**: Every derived fact SHALL maintain provenance:

| Field | Description |
|-------|-------------|
| source | Theory file or "reasoning" |
| line | Line number if from file |
| derivedFrom | List of source fact IDs |
| rule | Reasoning rule applied |
| existence | Computed existence level |

#### URS-TAI-031: Contradiction Explanation

**Requirement**: When contradiction detected, system SHALL provide:
1. The conflicting facts
2. The rule that detected conflict
3. Both fact IDs for resolution

---

### 2.5 Bias Detection and Control

#### URS-TAI-040: Declared Bias

**Requirement**: Biases SHALL be declared as facts in theories:

```sys2dsl
# Positive bias - boost existence in climate domain
@b1 climate_domain HAS_BIAS positive
@b2 climate_domain BIAS_AMOUNT 10

# Negative bias - reduce confidence for unverified sources
@b3 unverified_source HAS_BIAS negative
@b4 unverified_source BIAS_AMOUNT -20
```

#### URS-TAI-041: Forbidden Zones

**Requirement**: Axiological regions can be marked as forbidden:

```sys2dsl
@f1 high_ethics_risk FORBIDDEN_FOR reasoning
@f2 $subject BLOCK_REASONING high_ethics_risk
```

#### URS-TAI-042: NOT_FACTOR_IN Relations

**Requirement**: Protected attributes declared via relations:

```sys2dsl
@ax95 gender NOT_FACTOR_IN hiring_decision
@ax96 race NOT_FACTOR_IN hiring_decision
```

---

### 2.6 Alignment

#### URS-TAI-050: Ethical Constraints as Facts

**Requirement**: All ethical constraints expressed as standard facts:

```sys2dsl
@ax47 murder PROHIBITED_BY universal_ethics
@ax53 self_defense PERMITTED_BY universal_ethics
@ax76 patient_consent REQUIRED_FOR medical_treatment
```

---

### 2.7 Verifiability

#### URS-TAI-060: Provenance Tracking

**Requirement**: Every fact tracks origin:

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
    createdAt: timestamp,
    derivedFrom: null,
    rule: null
  }
}
```

#### URS-TAI-061: Consistency Checking

**Requirement**: System provides consistency check via standard relation:

```sys2dsl
@check system RUN_CONSISTENCY_CHECK all
# Returns facts with contradictions
```

---

## 3. Constraints

### 3.1 Syntax Constraint

**ALL constructs MUST use triple syntax**: `@var Subject VERB Object`

No exceptions for:
- Hooks (declared as relations)
- Queries (API-level distinction, not syntax)
- Conditions (use relation-based patterns)
- Loops (use recursion in macros)

### 3.2 Backward Compatibility

- Facts without explicit existence default to CERTAIN (127)
- Existing DSL scripts work unchanged
- Mode defaults to LEARNING

### 3.3 Performance

- Existence lookup: O(1)
- Chain computation: O(n)
- Hook execution: < 10ms

---

## 4. Acceptance Criteria

| Requirement | Test |
|-------------|------|
| URS-TAI-001 | Store facts at all 5 existence levels |
| URS-TAI-002 | LEARNING mode creates CERTAIN, REASONING creates UNPROVEN |
| URS-TAI-003 | Chain returns min(chain) capped at DEMONSTRATED |
| URS-TAI-020 | Hook declared as relation triggers on event |
| URS-TAI-022 | Hook execution blocks other hooks |
| URS-TAI-040 | Bias facts modify existence computation |

---

## 5. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | AGISystem2 Team | Initial draft |
| 2.0 | 2025-12-03 | AGISystem2 Team | Corrected mode semantics, removed non-triple syntax |

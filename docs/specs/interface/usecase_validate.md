# Design Spec: Use Case - Validating Consistency

ID: DS(/interface/usecase_validate)

Status: DRAFT v1.0

## 1. Overview

This document describes how to use AGISystem2 to validate that knowledge bases, theories, and proposed facts are internally consistent and do not contain contradictions.

### 1.1 What is Validation?

Validation checks that:
- No contradictory facts exist
- Relation constraints are respected
- Type hierarchies are consistent
- Proposed changes won't break consistency

### 1.2 When to Validate

- After loading theories
- Before saving a theory
- When proposing new facts
- During reasoning (automatic)
- As a periodic health check

---

## 2. Basic Validation

### 2.1 Validate Current State

```sys2dsl
# Check if current theory stack is consistent
@result VALIDATE

# Returns:
# {
#   valid: true,
#   conflicts: [],
#   warnings: []
# }
```

### 2.2 Validation with Conflicts

```sys2dsl
# Add conflicting facts
@f1 ASSERT Water IS_A solid
@f2 ASSERT Water IS_A liquid
@f3 ASSERT solid DISJOINT_WITH liquid

# Validate
@result VALIDATE

# Returns:
# {
#   valid: false,
#   conflicts: [
#     {
#       type: "DISJOINT_VIOLATION",
#       fact1: { subject: "Water", relation: "IS_A", object: "solid" },
#       fact2: { subject: "Water", relation: "IS_A", object: "liquid" },
#       reason: "Water cannot be both solid and liquid when they are disjoint"
#     }
#   ],
#   warnings: []
# }
```

---

## 3. Types of Conflicts

### 3.1 Disjoint Violation

Two types declared as disjoint both apply to same entity:

```sys2dsl
@f1 ASSERT Animal IS_A living_thing
@f2 ASSERT Rock IS_A non_living_thing
@f3 ASSERT living_thing DISJOINT_WITH non_living_thing

# Conflict:
@f4 ASSERT Coral IS_A Animal
@f5 ASSERT Coral IS_A Rock    # ERROR: Animal and Rock are disjoint
```

### 3.2 Transitivity Conflict

Transitive closure leads to contradiction:

```sys2dsl
@f1 ASSERT A IS_A B
@f2 ASSERT B IS_A C
@f3 ASSERT C DISJOINT_WITH A    # ERROR: A IS_A C by transitivity
```

### 3.3 Inverse Relation Conflict

Inverse relations don't match:

```sys2dsl
@f1 ASSERT Alice PARENT_OF Bob
@f2 ASSERT Bob PARENT_OF Alice    # ERROR if PARENT_OF inverse is CHILD_OF
```

### 3.4 Functional Relation Violation

Functional relation has multiple values:

```sys2dsl
# If BORN_IN is functional (one value only):
@f1 ASSERT Alice BORN_IN Paris
@f2 ASSERT Alice BORN_IN London    # ERROR: can only be born in one place
```

### 3.5 Symmetry Conflict

Symmetric relation not bidirectional:

```sys2dsl
# EQUIVALENT_TO is symmetric
@f1 ASSERT A EQUIVALENT_TO B
# If B EQUIVALENT_TO A is not inferable, inconsistency
```

---

## 4. Validating Proposed Changes

### 4.1 Validate Before Asserting

```sys2dsl
# Check if new fact would cause conflict
@check VALIDATE_FACT Water IS_A gas

# Returns:
# {
#   wouldBeValid: false,
#   conflicts: [
#     { reason: "Water is already asserted as liquid, which is disjoint with gas" }
#   ]
# }

# Only assert if valid
@ifValid ASSERT Water IS_A gas    # Would fail
```

### 4.2 Validate Script Before Running

```sys2dsl
# Validate a multi-line script
@script """
@f1 ASSERT NewConcept IS_A type1
@f2 ASSERT NewConcept IS_A type2
@f3 ASSERT type1 DISJOINT_WITH type2
"""

@check VALIDATE_SCRIPT $script

# Returns conflicts without executing
```

### 4.3 Validate Theory Before Loading

```sys2dsl
@check VALIDATE_THEORY new_theory

# Returns:
# {
#   valid: boolean,
#   conflicts: [...],
#   wouldConflictWith: [
#     { currentFact: "...", newFact: "...", reason: "..." }
#   ]
# }
```

---

## 5. Conflict Resolution

### 5.1 Identify Conflicting Facts

```sys2dsl
@result VALIDATE

# If conflicts found:
# conflicts: [
#   {
#     type: "DISJOINT_VIOLATION",
#     fact1: { subject: "X", relation: "IS_A", object: "A", factId: "f123" },
#     fact2: { subject: "X", relation: "IS_A", object: "B", factId: "f456" },
#     reason: "A and B are disjoint"
#   }
# ]
```

### 5.2 Retract Conflicting Fact

```sys2dsl
# Decide which fact to remove
@removed RETRACT X IS_A B

# Re-validate
@result VALIDATE
# Should now be valid
```

### 5.3 Override in Theory Layer

```sys2dsl
# Instead of removing, override in current layer
# The base theory keeps the fact, but current layer negates it
@override OVERRIDE X IS_A B negated=true
```

### 5.4 Add Exception

```sys2dsl
# Sometimes conflicts are intentional (exceptions)
@exception ASSERT X IS_A A
@exception2 ASSERT X IS_A B
@allowConflict ALLOW_CONFLICT X IS_A B reason="X is a hybrid"
```

---

## 6. Validation Rules

### 6.1 Built-in Rules

| Rule | Description |
|------|-------------|
| DISJOINT_CHECK | No entity can be instance of disjoint types |
| TRANSITIVE_CLOSURE | Check transitive relations don't create cycles |
| INVERSE_MATCH | Inverse relations must be consistent |
| FUNCTIONAL_UNIQUE | Functional relations have single value |
| SYMMETRIC_PAIR | Symmetric relations work both ways |
| ASYMMETRIC_CHECK | Asymmetric relations never go both ways |

### 6.2 Custom Validation Rules

```sys2dsl
# Define domain-specific validation rule
@rule DEFINE_VALIDATION_RULE no_circular_management """
  NOT EXISTS (
    X MANAGES Y AND Y MANAGES X
  )
"""

# Rule will be checked on VALIDATE
```

---

## 7. Validation Modes

### 7.1 Strict Mode

```sys2dsl
@result VALIDATE mode=strict

# Checks:
# - All built-in rules
# - All custom rules
# - Warnings treated as errors
```

### 7.2 Lenient Mode

```sys2dsl
@result VALIDATE mode=lenient

# Checks:
# - Only critical conflicts (disjoint, functional)
# - Warnings reported but don't fail
```

### 7.3 Quick Mode

```sys2dsl
@result VALIDATE mode=quick

# Checks:
# - Only recent changes
# - Skip full transitive closure
# - Faster but may miss some conflicts
```

---

## 8. Continuous Validation

### 8.1 Auto-Validate on Assert

```sys2dsl
# Enable auto-validation
@config SET auto_validate=true

# Now every ASSERT is validated first
@f1 ASSERT Water IS_A gas
# Automatically checks for conflicts before asserting
```

### 8.2 Validation Hooks

```sys2dsl
# Run custom check after each assertion
@hook ON_ASSERT VALIDATE mode=quick
```

### 8.3 Periodic Validation

```javascript
// In configuration:
{
  validation: {
    periodic: {
      enabled: true,
      interval: '1h',
      mode: 'strict',
      alertOnConflict: true
    }
  }
}
```

---

## 9. Complete Example: Medical Knowledge Validation

### 9.1 Setup Domain

```sys2dsl
# Load medical theory
@med LOAD_THEORY medical_knowledge

# Define constraints
@c1 ASSERT bacterial_infection DISJOINT_WITH viral_infection
@c2 ASSERT antibiotic TREATS bacterial_infection
@c3 ASSERT antibiotic CONTRAINDICATES viral_infection
```

### 9.2 Validate New Diagnosis

```sys2dsl
# Proposed treatment
@treatment ASSERT Patient_001 RECEIVES antibiotic

# What infection does patient have?
@diagnosis ASSERT Patient_001 HAS infection

# Validate consistency
@check VALIDATE

# If patient has viral_infection, antibiotic is contraindicated
```

### 9.3 Catch Contraindication

```sys2dsl
# Add viral diagnosis
@viral ASSERT Patient_001 HAS viral_infection

# Validate again
@check VALIDATE

# Returns:
# {
#   valid: false,
#   conflicts: [
#     {
#       type: "CONTRAINDICATION",
#       treatment: "Patient_001 RECEIVES antibiotic",
#       condition: "Patient_001 HAS viral_infection",
#       reason: "antibiotic CONTRAINDICATES viral_infection"
#     }
#   ]
# }
```

---

## 10. Validation Reports

### 10.1 Summary Report

```sys2dsl
@report VALIDATION_REPORT

# Returns:
# {
#   totalFacts: 15420,
#   totalConcepts: 3200,
#   validationTime: "2.3s",
#   status: "VALID",
#   checksPerformed: [
#     { rule: "DISJOINT_CHECK", passed: true, count: 450 },
#     { rule: "TRANSITIVE_CLOSURE", passed: true, count: 1200 },
#     ...
#   ]
# }
```

### 10.2 Conflict History

```sys2dsl
@history VALIDATION_HISTORY limit=10

# Returns last 10 validation runs with results
```

### 10.3 Export Report

```sys2dsl
@report VALIDATION_REPORT format=json
@export TO_FILE $report path="validation_report.json"
```

---

## 11. Best Practices

### 11.1 Validate Early, Validate Often

```sys2dsl
# After each significant change
@f1 ASSERT NewFact IS_A something
@check VALIDATE mode=quick

# Before saving
@fullCheck VALIDATE mode=strict
@saved SAVE_THEORY my_theory
```

### 11.2 Define Domain Constraints First

```sys2dsl
# Start theory with constraints
@d1 ASSERT type_a DISJOINT_WITH type_b
@d2 ASSERT relation_x FUNCTIONAL

# Then add facts
@f1 ASSERT Entity IS_A type_a
```

### 11.3 Use Validation in Tests

```sys2dsl
# Test script
@setup LOAD_THEORY test_theory
@valid VALIDATE
@assert EQUALS $valid.valid true
```

---

## 12. Troubleshooting

### 12.1 Finding Root Cause

```sys2dsl
# Validation fails but conflicts not clear
@detailed VALIDATE verbose=true

# Shows full reasoning chain for each conflict
```

### 12.2 Conflict in Loaded Theory

```sys2dsl
# Identify which theory introduced conflict
@origins CONFLICT_ORIGINS

# Returns:
# {
#   conflict: { ... },
#   sources: [
#     { theory: "medical_base", fact: "..." },
#     { theory: "custom_extension", fact: "..." }
#   ]
# }
```

### 12.3 Performance Issues

```sys2dsl
# Validation taking too long
@result VALIDATE mode=quick timeout=5000

# Or validate subset
@result VALIDATE scope=recent_changes
```

---

## 13. Related Documents

- DS(/theory/Sys2DSL_syntax) - Language reference
- DS(/theory/Sys2DSL_commands) - Command reference
- DS(/reason/validation.js) - Implementation
- DS(/interface/usecase_define_theory) - Theory definition

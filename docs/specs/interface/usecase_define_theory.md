# Design Spec: Use Case - Defining Theories

ID: DS(/interface/usecase_define_theory)

Status: DRAFT v1.0

## 1. Overview

This document describes how to define, manage, and persist theories in AGISystem2. A theory is a named collection of facts, concepts, and relation definitions that can be loaded, extended, and saved.

### 1.1 What is a Theory?

A theory is:
- A **Sys2DSL script** containing assertions and definitions
- **Named** for identification and loading
- **Composable** - theories can stack (base + extensions)
- **Persistent** - saved as text files, versioned in git

### 1.2 Theory Hierarchy

```
┌─────────────────────────────────────────┐
│         Working Theory (Session)        │  ← Your current changes
├─────────────────────────────────────────┤
│         Domain Theory (Loaded)          │  ← e.g., medical_knowledge
├─────────────────────────────────────────┤
│         Base Theory (Root)              │  ← Core facts & relations
└─────────────────────────────────────────┘
```

---

## 2. Creating a New Theory

### 2.1 Start Fresh

```sys2dsl
# Begin with empty working theory (default on session start)

# Add your facts
@f1 ASSERT Water IS_A liquid
@f2 ASSERT Water HAS_PROPERTY boiling_point
@f3 ASSERT Ice IS_A solid
@f4 ASSERT Ice IS_A water_form

# Add your relations
@r1 DEFINE_RELATION TRANSFORMS_TO \
    inverse=TRANSFORMS_FROM \
    symmetric=false \
    transitive=false

# Use the new relation
@f5 ASSERT Water TRANSFORMS_TO Ice
@f6 ASSERT Ice TRANSFORMS_TO Steam

# Save as named theory
@saved SAVE_THEORY physics_water
```

### 2.2 Extend Existing Theory

```sys2dsl
# Load base theory first
@base LOAD_THEORY physics_fundamentals

# Add extensions
@f1 ASSERT Helium IS_A noble_gas
@f2 ASSERT Helium HAS_PROPERTY inert

# Save as new theory (doesn't modify base)
@saved SAVE_THEORY physics_gases
```

### 2.3 Theory File Format

Saved theories are plain Sys2DSL text:

```sys2dsl
# physics_water.sys2dsl
# Theory: Basic water physics
# Created: 2024-03-20
# Author: system

# Concepts and facts
@f1 ASSERT Water IS_A liquid
@f2 ASSERT Water HAS_PROPERTY boiling_point
@f3 ASSERT Ice IS_A solid
@f4 ASSERT Ice IS_A water_form

# Custom relations
@r1 DEFINE_RELATION TRANSFORMS_TO inverse=TRANSFORMS_FROM symmetric=false transitive=false

# Facts using custom relations
@f5 ASSERT Water TRANSFORMS_TO Ice
@f6 ASSERT Ice TRANSFORMS_TO Steam
```

---

## 3. Theory Management Commands

### 3.1 List Available Theories

```sys2dsl
@theories LIST_THEORIES

# Returns:
# [
#   { name: "base", path: "theories/base/root.sys2dsl", factCount: 500 },
#   { name: "physics_fundamentals", path: "theories/science/physics.sys2dsl", factCount: 1200 },
#   { name: "medical_knowledge", path: "theories/domain/medical.sys2dsl", factCount: 8500 },
#   ...
# ]
```

### 3.2 Load Theory

```sys2dsl
# Load single theory
@loaded LOAD_THEORY physics_fundamentals

# Load multiple (stacked, order matters)
@base LOAD_THEORY base
@domain LOAD_THEORY medical_knowledge
@specialty LOAD_THEORY cardiology

# Later theories override earlier ones on conflicts
```

### 3.3 Save Theory

```sys2dsl
# Save current working theory
@saved SAVE_THEORY my_theory

# Save with metadata
@saved SAVE_THEORY my_theory description="My custom physics theory"
```

### 3.4 Merge Theories

```sys2dsl
# Merge working theory into existing
@result MERGE_THEORY target_theory append

# Strategies:
# - append: Add new facts, keep existing
# - override: Replace conflicting facts
# - interactive: Report conflicts for manual resolution
```

### 3.5 Theory Info

```sys2dsl
@info THEORY_INFO physics_fundamentals

# Returns:
# {
#   name: "physics_fundamentals",
#   path: "theories/science/physics.sys2dsl",
#   factCount: 1200,
#   conceptCount: 450,
#   relationCount: 25,
#   lastModified: "2024-03-15T10:30:00Z",
#   description: "Basic physics concepts and laws"
# }
```

---

## 4. Theory Composition

### 4.1 Stacking Order

```sys2dsl
# Order determines override priority (later wins)
@t1 LOAD_THEORY base                    # Priority: 1 (lowest)
@t2 LOAD_THEORY physics_fundamentals    # Priority: 2
@t3 LOAD_THEORY physics_water           # Priority: 3
# Working theory                        # Priority: 4 (highest)
```

### 4.2 Conflict Resolution

When same fact exists in multiple theories:

```sys2dsl
# In physics_fundamentals:
Water boiling_point = 100

# In physics_high_altitude:
Water boiling_point = 95

# If both loaded, later one (high_altitude) wins
@t1 LOAD_THEORY physics_fundamentals
@t2 LOAD_THEORY physics_high_altitude

@answer ASK Water HAS_PROPERTY boiling_point
# Returns: 95 (from high_altitude)
```

### 4.3 Viewing Active Stack

```sys2dsl
@stack THEORY_STACK

# Returns:
# [
#   { name: "base", priority: 1 },
#   { name: "physics_fundamentals", priority: 2 },
#   { name: "physics_high_altitude", priority: 3 },
#   { name: "_working", priority: 4 }
# ]
```

---

## 5. Best Practices

### 5.1 Theory Organization

```
theories/
├── base/
│   └── root.sys2dsl           # Core relations and concepts
├── science/
│   ├── physics.sys2dsl        # Physics fundamentals
│   ├── chemistry.sys2dsl      # Chemistry fundamentals
│   └── biology.sys2dsl        # Biology fundamentals
├── domain/
│   ├── medical.sys2dsl        # Medical knowledge
│   ├── legal.sys2dsl          # Legal concepts
│   └── finance.sys2dsl        # Financial concepts
└── custom/
    └── my_theory.sys2dsl      # User-created theories
```

### 5.2 Naming Conventions

```
# Use lowercase with underscores
physics_fundamentals    ✓
PhysicsFundamentals     ✗

# Be descriptive
water_properties        ✓
wp                      ✗

# Version if needed
medical_v2              ✓
```

### 5.3 Documentation in Theories

```sys2dsl
# physics_water.sys2dsl
#
# Theory: Water Physics
# Version: 1.0
# Author: Science Team
# Created: 2024-03-20
# Description: Physical properties and state transitions of water
#
# Dependencies:
#   - base (core relations)
#   - physics_fundamentals (physical concepts)
#

# === CONCEPTS ===

@f1 ASSERT Water IS_A liquid
# Water at standard conditions is a liquid

@f2 ASSERT Ice IS_A solid
# Frozen water

# === CUSTOM RELATIONS ===

@r1 DEFINE_RELATION TRANSFORMS_TO inverse=TRANSFORMS_FROM symmetric=false transitive=false
# State transitions between phases

# === FACTS ===
...
```

---

## 6. Complete Example: Building a Domain Theory

### 6.1 Step 1: Plan Your Theory

```
Domain: Medical Diagnosis
Purpose: Support diagnostic reasoning
Dependencies: base, biology
Key concepts: symptom, disease, treatment
Key relations: INDICATES, TREATS, CONTRADICTS
```

### 6.2 Step 2: Define Custom Relations

```sys2dsl
# Start session
# Load dependencies
@dep1 LOAD_THEORY base
@dep2 LOAD_THEORY biology

# Define domain-specific relations
@r1 DEFINE_RELATION INDICATES \
    inverse=INDICATED_BY \
    symmetric=false \
    transitive=false \
    domain=ontology \
    range=ontology

@r2 DEFINE_RELATION TREATS \
    inverse=TREATED_BY \
    symmetric=false \
    transitive=false

@r3 DEFINE_RELATION CONTRAINDICATES \
    inverse=CONTRAINDICATED_BY \
    symmetric=false \
    transitive=false
```

### 6.3 Step 3: Add Core Concepts

```sys2dsl
# Disease hierarchy
@f1 ASSERT disease IS_A medical_condition
@f2 ASSERT infection IS_A disease
@f3 ASSERT bacterial_infection IS_A infection
@f4 ASSERT viral_infection IS_A infection

# Symptom hierarchy
@f10 ASSERT symptom IS_A medical_observation
@f11 ASSERT fever IS_A symptom
@f12 ASSERT cough IS_A symptom
@f13 ASSERT fatigue IS_A symptom
```

### 6.4 Step 4: Add Domain Knowledge

```sys2dsl
# Symptom-disease relationships
@f20 ASSERT fever INDICATES infection
@f21 ASSERT cough INDICATES respiratory_infection
@f22 ASSERT fatigue INDICATES viral_infection

# Treatment relationships
@f30 ASSERT antibiotic TREATS bacterial_infection
@f31 ASSERT antiviral TREATS viral_infection

# Contraindications
@f40 ASSERT antibiotic CONTRAINDICATES viral_infection
```

### 6.5 Step 5: Validate and Save

```sys2dsl
# Check for conflicts
@valid VALIDATE

# If valid, save
@saved SAVE_THEORY medical_diagnosis description="Medical diagnosis support"

# Verify it's listed
@theories LIST_THEORIES
```

### 6.6 Step 6: Use the Theory

```sys2dsl
# In a new session:
@loaded LOAD_THEORY medical_diagnosis

# Now you can query:
@q1 ASK fever INDICATES infection
# TRUE_CERTAIN

@q2 HYPOTHESIZE Patient HAS_SYMPTOM fever INDICATES ?
# Returns: infection (and subtypes)

@q3 ASK antibiotic TREATS viral_infection
# FALSE (contraindicated)
```

---

## 7. Theory Versioning

### 7.1 Git Integration

Theories are plain text, ideal for git:

```bash
# In your repository
git add theories/domain/medical_diagnosis.sys2dsl
git commit -m "Add medical diagnosis theory v1.0"
```

### 7.2 Version Tags in Theory

```sys2dsl
# medical_diagnosis.sys2dsl
# Version: 1.0.0
# Changelog:
#   1.0.0 - Initial release
#   1.1.0 - Added cardiology concepts
#   1.2.0 - Added drug interactions
```

### 7.3 Loading Specific Versions

```sys2dsl
# If using versioned file names:
@v1 LOAD_THEORY medical_diagnosis_v1
@v2 LOAD_THEORY medical_diagnosis_v2
```

---

## 8. Common Patterns

### 8.1 Base + Domain + Custom

```sys2dsl
# Standard loading pattern
@base LOAD_THEORY base
@domain LOAD_THEORY my_domain
# Working theory for session-specific changes
```

### 8.2 A/B Theory Comparison

```sys2dsl
# Load theory A, query
@a LOAD_THEORY physics_classical
@resultA ASK light IS_A particle

# Reset and load theory B
@reset RESET_SESSION
@b LOAD_THEORY physics_quantum
@resultB ASK light IS_A particle

# Compare results
```

### 8.3 Theory Templates

```sys2dsl
# Create a template theory with placeholders
# template_experiment.sys2dsl

@r1 DEFINE_RELATION OBSERVES inverse=OBSERVED_BY symmetric=false transitive=false
@r2 DEFINE_RELATION MEASURES inverse=MEASURED_BY symmetric=false transitive=false

# User fills in specifics in working theory
@f1 ASSERT Experiment_001 OBSERVES reaction_rate
@f2 ASSERT Experiment_001 MEASURES temperature
```

---

## 9. Troubleshooting

### 9.1 Theory Won't Load

```sys2dsl
# Check if theory exists
@theories LIST_THEORIES

# Check for syntax errors
@validate VALIDATE theory=problem_theory
```

### 9.2 Unexpected Results

```sys2dsl
# Check active theory stack
@stack THEORY_STACK

# Check which theory a fact comes from
@origin FACT_ORIGIN Water IS_A liquid
```

### 9.3 Merge Conflicts

```sys2dsl
# Use interactive merge to see conflicts
@result MERGE_THEORY target interactive

# Returns conflicts for manual resolution
# {
#   conflicts: [
#     { fact: "...", inSource: "...", inTarget: "..." },
#     ...
#   ]
# }
```

---

## 10. Related Documents

- DS(/theory/Sys2DSL_syntax) - Language reference
- DS(/theory/Sys2DSL_commands) - Command reference
- DS(/knowledge/theory_stack.js) - Implementation
- DS(/interface/usecase_validate) - Validation use case

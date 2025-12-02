# Design Spec: Use Case - Defining Theories

ID: DS(/interface/usecase_define_theory)

Status: v3.0 - Unified Triple Syntax

## 1. Overview

This document describes how to define, manage, and persist theories in AGISystem2 using **v3.0 strict triple syntax**. A theory is a named collection of facts, concepts, and verb definitions that can be loaded, extended, and saved.

**All examples use v3.0 syntax**: `@variable Subject VERB Object`

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

## 2. Creating a New Theory (v3.0)

### 2.1 Start Fresh

```sys2dsl
# Begin with empty working theory (default on session start)

# Add your facts (v3.0: no ASSERT command)
@_ Water IS_A liquid
@_ Water HAS boiling_point
@_ Ice IS_A solid
@_ Ice IS_A water_form

# Define custom verb using BEGIN/END
@TRANSFORMS_TO BEGIN
  @step1 subject CHANGES_STATE freevar1
  @step2 freevar1 BECOMES object
  @return subject TRANSFORMS_TO object
END

# Use the new verb
@_ Water TRANSFORMS_TO Ice
@_ Ice TRANSFORMS_TO Steam

# Save as named theory (v3.0 syntax)
@_ physics_water SAVE any
```

### 2.2 Extend Existing Theory

```sys2dsl
# Load base theory first (v3.0 syntax)
@_ physics_fundamentals LOAD any

# Add extensions (v3.0: direct triple syntax)
@_ Helium IS_A noble_gas
@_ Helium HAS inert_property

# Save as new theory (doesn't modify base)
@_ physics_gases SAVE any
```

### 2.3 Theory File Format (v3.0)

Saved theories are plain Sys2DSL text using v3.0 strict triple syntax:

```sys2dsl
# physics_water.sys2dsl
# Theory: Basic water physics
# Created: 2025-12-02
# Author: system
# Version: 3.0

# Concepts and facts (v3.0: no ASSERT)
@_ Water IS_A liquid
@_ Water HAS boiling_point
@_ Ice IS_A solid
@_ Ice IS_A water_form

# Custom verb definition (v3.0: BEGIN/END blocks)
@TRANSFORMS_TO BEGIN
  @step1 subject CHANGES_STATE freevar1
  @step2 freevar1 BECOMES object
  @return subject TRANSFORMS_TO object
END

# Facts using custom verb
@_ Water TRANSFORMS_TO Ice
@_ Ice TRANSFORMS_TO Steam
```

---

## 3. Theory Management Commands

### 3.1 List Available Theories

```sys2dsl
@theories any THEORIES any

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
@loaded physics_fundamentals LOAD any

# Load multiple (stacked, order matters)
@base base LOAD any
@domain medical_knowledge LOAD any
@specialty cardiology LOAD any

# Later theories override earlier ones on conflicts
```

### 3.3 Save Theory

```sys2dsl
# Save current working theory
@saved my_theory SAVE any

# Save with metadata (use dimensions)
@p description DIM_PAIR "My custom physics theory"
@_ my_theory SET_DIM $p
@saved my_theory SAVE any
```

### 3.4 Merge Theories

```sys2dsl
# Merge working theory into existing
@result target_theory MERGE append

# Strategies:
# - append: Add new facts, keep existing
# - override: Replace conflicting facts
# - interactive: Report conflicts for manual resolution
```

### 3.5 Theory Info

```sys2dsl
@info physics_fundamentals INFO any

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
@t1 base LOAD any                       # Priority: 1 (lowest)
@t2 physics_fundamentals LOAD any       # Priority: 2
@t3 physics_water LOAD any              # Priority: 3
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
@t1 physics_fundamentals LOAD any
@t2 physics_high_altitude LOAD any

@answer Water HAS_PROPERTY boiling_point
# Returns: 95 (from high_altitude)
```

### 4.3 Viewing Active Stack

```sys2dsl
@stack any STACK any

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
# Version: 3.0
# Author: Science Team
# Created: 2024-03-20
# Description: Physical properties and state transitions of water
#
# Dependencies:
#   - base (core relations)
#   - physics_fundamentals (physical concepts)
#

# === CONCEPTS ===

@_ Water IS_A liquid
# Water at standard conditions is a liquid

@_ Ice IS_A solid
# Frozen water

# === CUSTOM RELATIONS ===

# Use BEGIN/END blocks to define custom verbs
@TRANSFORMS_TO BEGIN
  @step1 subject CHANGES_STATE freevar1
  @step2 freevar1 BECOMES object
  @return subject TRANSFORMS_TO object
END
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
@dep1 base LOAD any
@dep2 biology LOAD any

# Define domain-specific relations using BEGIN/END blocks
@INDICATES BEGIN
  @step1 subject SUGGESTS object
  @step2 subject CORRELATES_WITH object
  @return subject INDICATES object
END

@TREATS BEGIN
  @step1 subject REMEDIES object
  @step2 object RESPONDS_TO subject
  @return subject TREATS object
END

@CONTRAINDICATES BEGIN
  @step1 subject UNSAFE_FOR object
  @step2 subject WORSENS object
  @return subject CONTRAINDICATES object
END
```

### 6.3 Step 3: Add Core Concepts

```sys2dsl
# Disease hierarchy
@_ disease IS_A medical_condition
@_ infection IS_A disease
@_ bacterial_infection IS_A infection
@_ viral_infection IS_A infection

# Symptom hierarchy
@_ symptom IS_A medical_observation
@_ fever IS_A symptom
@_ cough IS_A symptom
@_ fatigue IS_A symptom
```

### 6.4 Step 4: Add Domain Knowledge

```sys2dsl
# Symptom-disease relationships
@_ fever INDICATES infection
@_ cough INDICATES respiratory_infection
@_ fatigue INDICATES viral_infection

# Treatment relationships
@_ antibiotic TREATS bacterial_infection
@_ antiviral TREATS viral_infection

# Contraindications
@_ antibiotic CONTRAINDICATES viral_infection
```

### 6.5 Step 5: Validate and Save

```sys2dsl
# Check for conflicts
@valid any VALIDATE any

# If valid, save
@p description DIM_PAIR "Medical diagnosis support"
@_ medical_diagnosis SET_DIM $p
@saved medical_diagnosis SAVE any

# Verify it's listed
@theories any THEORIES any
```

### 6.6 Step 6: Use the Theory

```sys2dsl
# In a new session:
@loaded medical_diagnosis LOAD any

# Now you can query:
@q1 fever INDICATES infection
# TRUE_CERTAIN

@q2 Patient HAS_SYMPTOM fever INDICATES ?
# Returns: infection (and subtypes)

@q3 antibiotic TREATS viral_infection
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
@v1 medical_diagnosis_v1 LOAD any
@v2 medical_diagnosis_v2 LOAD any
```

---

## 8. Common Patterns

### 8.1 Base + Domain + Custom

```sys2dsl
# Standard loading pattern
@base base LOAD any
@domain my_domain LOAD any
# Working theory for session-specific changes
```

### 8.2 A/B Theory Comparison

```sys2dsl
# Load theory A, query
@a physics_classical LOAD any
@resultA light IS_A particle

# Reset and load theory B
@reset any RESET any
@b physics_quantum LOAD any
@resultB light IS_A particle

# Compare results
```

### 8.3 Theory Templates

```sys2dsl
# Create a template theory with placeholders
# template_experiment.sys2dsl

# Define custom verbs using BEGIN/END
@OBSERVES BEGIN
  @step1 subject MONITORS object
  @step2 subject RECORDS object
  @return subject OBSERVES object
END

@MEASURES BEGIN
  @step1 subject QUANTIFIES object
  @step2 subject EVALUATES object
  @return subject MEASURES object
END

# User fills in specifics in working theory
@_ Experiment_001 OBSERVES reaction_rate
@_ Experiment_001 MEASURES temperature
```

---

## 9. Troubleshooting

### 9.1 Theory Won't Load

```sys2dsl
# Check if theory exists
@theories any THEORIES any

# Check for syntax errors
@p theory DIM_PAIR problem_theory
@_ validator SET_DIM $p
@validate any VALIDATE any
```

### 9.2 Unexpected Results

```sys2dsl
# Check active theory stack
@stack any STACK any

# Check which theory a fact comes from
@origin Water IS_A liquid
@factInfo $origin INFO any
```

### 9.3 Merge Conflicts

```sys2dsl
# Use interactive merge to see conflicts
@result target MERGE interactive

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

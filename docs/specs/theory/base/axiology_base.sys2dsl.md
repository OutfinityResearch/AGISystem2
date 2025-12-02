# Specification: Base Axiology Theory

ID: DS(/theory/base/axiology_base.sys2dsl)

Source: `@data/init/theories/base/axiology_base.sys2dsl`

Status: v3.0

## Purpose

Defines **foundational facts about values and norms** - the core axiology that governs ethical reasoning. This is the "what ought to be" dimension of knowledge.

## Design Rationale

### Why Separate Axiology?

The ontology/axiology separation serves critical purposes:

1. **Bias Control**: Factual queries can mask axiological dimensions
2. **Transparency**: Clear audit trail of value influences
3. **Configurability**: Different value systems for different contexts
4. **Safety**: Ethical constraints can be enforced independently

### Axiology Partition

The axiology partition contains:
- Moral categories (good, bad, neutral)
- Deontic status (obligatory, permitted, prohibited)
- Rights and duties
- Ethical principles
- Professional ethics
- Fairness constraints

### Universal Ethics Assumption

The base axiology encodes **universally accepted** ethical principles:
- Harm is bad
- Murder is prohibited
- Honesty is valued
- Human rights exist

Domain-specific ethics (e.g., medical ethics) can extend this.

## Axiology Structure

### Section 1: Moral Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    MORAL ONTOLOGY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    moral_value                                  │
│                    /    |    \                                  │
│                 good  neutral  bad                              │
│                  │              │                               │
│              benefit          harm                              │
│             /   |   \        /  |  \  \                         │
│        helping protecting  killing stealing lying violence      │
│        healing teaching                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Facts**:
```sys2dsl
@_ moral_value IS_A abstract_entity
@_ good IS_A moral_value
@_ bad IS_A moral_value
@_ neutral IS_A moral_value
@_ good DISJOINT_WITH bad
```

### Section 2: Universal Ethical Principles

**Harm Hierarchy**:
```sys2dsl
@_ harm IS_A bad
@_ killing IS_A harm
@_ stealing IS_A harm
@_ lying IS_A harm
@_ violence IS_A harm
```

**Benefit Hierarchy**:
```sys2dsl
@_ benefit IS_A good
@_ helping IS_A benefit
@_ protecting IS_A benefit
@_ healing IS_A benefit
@_ teaching IS_A benefit
```

### Section 3: Deontic Modalities

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEONTIC SQUARE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    deontic_status                               │
│                    /     |     \                                │
│            obligation  permission  prohibition                  │
│                                                                 │
│  Logical relations:                                             │
│  - obligation → permission (what's required is allowed)         │
│  - prohibition ↔ ¬permission (forbidden = not allowed)          │
│  - obligation DISJOINT_WITH prohibition                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Facts**:
```sys2dsl
@_ obligation IS_A deontic_status
@_ permission IS_A deontic_status
@_ prohibition IS_A deontic_status
@_ obligation DISJOINT_WITH prohibition
```

**Universal Prohibitions**:
```sys2dsl
@_ murder PROHIBITED_BY universal_ethics
@_ theft PROHIBITED_BY universal_ethics
@_ fraud PROHIBITED_BY universal_ethics
@_ torture PROHIBITED_BY universal_ethics
```

**Universal Permissions**:
```sys2dsl
@_ self_defense PERMITTED_BY universal_ethics
@_ free_speech PERMITTED_BY universal_ethics
@_ privacy PERMITTED_BY universal_ethics
```

### Section 4: Rights and Duties

**Rights Hierarchy**:
```sys2dsl
@_ right IS_A normative_status
@_ duty IS_A normative_status
@_ human_right IS_A right
```

**Fundamental Human Rights**:
```sys2dsl
@_ life IS_A human_right
@_ liberty IS_A human_right
@_ dignity IS_A human_right
@_ equality IS_A human_right
```

### Section 5: Professional Ethics

**Medical Ethics**:
```sys2dsl
@_ patient_consent REQUIRED_FOR medical_treatment
@_ confidentiality REQUIRED_FOR medical_practice
@_ do_no_harm REQUIRED_FOR medical_practice
```

**General Professional Ethics**:
```sys2dsl
@_ honesty REQUIRED_FOR professional_conduct
@_ competence REQUIRED_FOR professional_conduct
@_ accountability REQUIRED_FOR professional_conduct
```

### Section 6: Fairness and Justice

**Core Concepts**:
```sys2dsl
@_ fairness IS_A good
@_ justice IS_A good
@_ equality IS_A fairness
@_ impartiality IS_A fairness
```

**Bias Prevention (Critical for AI)**:
```sys2dsl
# Protected characteristics
@_ gender NOT_FACTOR_IN hiring_decision
@_ race NOT_FACTOR_IN hiring_decision
@_ age NOT_FACTOR_IN hiring_decision
@_ religion NOT_FACTOR_IN hiring_decision

# Merit-based factors
@_ skills FACTOR_IN hiring_decision
@_ experience FACTOR_IN hiring_decision
@_ qualifications FACTOR_IN hiring_decision
```

### Section 7: Trust and Reliability

```sys2dsl
@_ trustworthiness IS_A good
@_ reliability IS_A trustworthiness
@_ consistency IS_A trustworthiness
@_ transparency IS_A trustworthiness
```

## Axiological Dimensions

The axiology partition uses specific dimensions:

| Dimension | Meaning | Range |
|-----------|---------|-------|
| `deontic` | permission level | -127 (prohibited) to +127 (obligatory) |
| `moral_valence` | good/bad | -127 (evil) to +127 (virtuous) |
| `fairness` | bias level | 0 (irrelevant) to +127 (protected) |

## Masking Axiology

For objective factual queries:

```sys2dsl
@_ axiology MASK_PARTITION any
@result Person QUALIFIES_FOR job
# Decision based only on ontological facts (skills, experience)
# NOT on axiological judgments
```

## Usage Patterns

### Ethical Checking

```sys2dsl
# Is this action permitted?
@permitted Action PERMITTED_BY universal_ethics
@prohibited Action PROHIBITED_BY universal_ethics
@ethical $permitted AND ($prohibited NOT any)
```

### Fairness Audit

```sys2dsl
# Check if decision uses protected characteristics
@uses_gender decision DEPENDS_ON gender
@uses_race decision DEPENDS_ON race
@unfair $uses_gender OR $uses_race
```

### Professional Ethics Query

```sys2dsl
# What does medical practice require?
@requirements any REQUIRED_FOR medical_practice
# [patient_consent, confidentiality, do_no_harm]
```

## Integration with Reasoning

### Ethical Constraints on Inference

```sys2dsl
# INFER checks axiological constraints
@conclusion Premise INFER recommendation
# If recommendation PROHIBITED_BY universal_ethics:
#   warning: "Recommendation violates ethical constraints"
```

### Deontic Reasoning

```sys2dsl
# From "X is obligatory" derive "X is permitted"
@obligated Action IS_A obligation
@permitted $obligated IMPLIES permission
```

## Extension Guidelines

### Adding Domain Ethics

```sys2dsl
# Legal ethics
@_ client_privilege REQUIRED_FOR legal_practice
@_ zealous_advocacy REQUIRED_FOR legal_practice

# Research ethics
@_ informed_consent REQUIRED_FOR human_research
@_ data_privacy REQUIRED_FOR research
```

### Cultural Variations

Different cultural contexts may have extended axiologies:
```sys2dsl
# In theory: eastern_ethics.sys2dsl
@_ filial_piety IS_A good
@_ harmony IS_A good
```

These extend, not replace, the universal base.

## Protection Status

The base axiology is:
- **Protected**: Cannot be forgotten
- **Core**: Essential for ethical reasoning
- **Auditable**: All uses are logged

```sys2dsl
@_ axiology_base PROTECT any
@_ axiology_base CORE any
```

## Implementation Notes

### NOT_FACTOR_IN Relation

Special relation for bias control:
```sys2dsl
@_ characteristic NOT_FACTOR_IN decision_type
```

This creates a **zero mask** on the characteristic dimension when making that decision type.

### REQUIRED_FOR Relation

Creates obligation link:
```sys2dsl
@_ requirement REQUIRED_FOR activity
```

Queries about `activity` check if `requirement` is satisfied.

## See Also

- [ontology_base.sys2dsl.md](./ontology_base.sys2dsl.md) - Factual knowledge
- [modal.sys2dsl.md](./modal.sys2dsl.md) - Deontic modalities
- [control.sys2dsl.md](./control.sys2dsl.md) - Dimension masking
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Partition model

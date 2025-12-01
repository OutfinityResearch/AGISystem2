# Design Spec: data/init/theories/base/axiology_base.sys2dsl

ID: DS(/init/axiology_base)

Status: IMPLEMENTED v1.0

## 1. Purpose

Base axiology theory containing foundational facts about values, ethics, and norms. This theory is **automatically loaded at system initialization** alongside `ontology_base` and provides the normative framework for ethical reasoning and bias control.

**File**: `data/init/theories/base/axiology_base.sys2dsl`
**Format**: Sys2DSL
**Fact Count**: ~60 facts
**Auto-loaded**: Yes (via TheoryPreloader)

---

## 2. Axiological Structure

### 2.1 Value Hierarchy

```
abstract_entity
└── moral_value
    ├── good
    │   ├── benefit (helping, protecting, healing, teaching)
    │   ├── fairness (equality, impartiality)
    │   ├── justice
    │   └── trustworthiness (reliability, consistency, transparency)
    ├── bad
    │   └── harm (killing, stealing, lying, violence)
    └── neutral

deontic_status
├── obligation
├── permission
└── prohibition

normative_status
├── right
│   └── human_right (life, liberty, dignity, equality)
└── duty
```

### 2.2 Key Constraints

- `good` ⊥ `bad` (moral opposites)
- `obligation` ⊥ `prohibition` (deontic exclusion)

---

## 3. Content Sections

### Section 1: Moral Categories (v001-v005)
- Basic moral trichotomy: good, bad, neutral
- Disjointness between good and bad

### Section 2: Universal Ethical Principles (v010-v024)
**Harm (bad):**
- killing, stealing, lying, violence

**Benefit (good):**
- helping, protecting, healing, teaching

### Section 3: Deontic Modalities (v030-v051)
**Obligations, Permissions, Prohibitions**

Universal prohibitions via `PROHIBITED_BY universal_ethics`:
- murder, theft, fraud, torture

Universal permissions via `PERMITTED_BY universal_ethics`:
- self_defense, free_speech, privacy

### Section 4: Rights and Duties (v060-v068)
**Human Rights:**
- life, liberty, dignity, equality

### Section 5: Professional Ethics (v070-v082)
**Medical Ethics:**
- patient_consent REQUIRED_FOR medical_treatment
- confidentiality REQUIRED_FOR medical_practice
- do_no_harm REQUIRED_FOR medical_practice

**General Professional Ethics:**
- honesty, competence, accountability REQUIRED_FOR professional_conduct

### Section 6: Fairness and Justice (v090-v112)
**Bias Masking Principles** (for fair decision-making):
```
NOT_FACTOR_IN hiring_decision:
  - gender, race, age, religion

FACTOR_IN hiring_decision:
  - skills, experience, qualifications
```

### Section 7: Trust and Reliability (v120-v123)
Components of trustworthiness:
- reliability, consistency, transparency

---

## 4. Usage in System

### Ethical Reasoning
```sys2dsl
# Check if action is prohibited
@result ASK "Is murder prohibited by universal_ethics?"  # TRUE_CERTAIN

# Check professional requirements
@result ASK "Is patient_consent required for medical_treatment?"  # TRUE_CERTAIN
```

### Bias Control Integration
```sys2dsl
# Use with BiasController for fair decision-making
@mask MASK_PARTITIONS axiology
@result ASK_MASKED $mask "Should gender affect hiring?"  # FALSE (NOT_FACTOR_IN)
```

### Compliance Checking
```sys2dsl
# Validate medical procedure
@consent ASK "Does procedure have patient_consent?"
@confidential ASK "Is confidentiality maintained?"
@safe ASK "Does procedure follow do_no_harm?"
@compliant BOOL_AND $consent $confidential
@compliant BOOL_AND $compliant $safe
```

---

## 5. Integration with BiasController

The axiology theory provides the normative basis for `BiasController`:

1. **Protected Attributes**: `NOT_FACTOR_IN` relations identify attributes that should be masked in certain decisions
2. **Merit Factors**: `FACTOR_IN` relations identify legitimate decision criteria
3. **Partition Masking**: Axiology dimensions can be selectively applied via `MASK_PARTITIONS axiology`

```javascript
// BiasController uses axiology facts to determine masking
const biasController = new BiasController({ axiologyFacts: store.getFacts() });
biasController.shouldMask('gender', 'hiring_decision'); // true
biasController.shouldMask('skills', 'hiring_decision'); // false
```

---

## 6. Design Rationale

1. **Universal Principles**: Focuses on widely-accepted ethical norms, not culturally-specific rules
2. **Deontic Logic Ready**: Uses standard deontic vocabulary (PERMITTED, PROHIBITED, OBLIGATORY)
3. **Professional Ethics**: Includes medical and general professional standards for domain reasoning
4. **Bias-Aware**: Explicitly encodes fairness principles for bias detection/masking
5. **Extensible**: Domain-specific ethics (legal, medical, etc.) can be layered on top

---

## 7. Extending with Domain Ethics

```sys2dsl
# Load base axiology (automatic)
# Then add domain-specific rules

# Legal domain
@_ ASSERT due_process REQUIRED_FOR legal_proceeding
@_ ASSERT presumption_of_innocence REQUIRED_FOR criminal_trial

# Medical domain (beyond base)
@_ ASSERT informed_consent REQUIRED_FOR surgery
@_ ASSERT second_opinion PERMITTED_BY medical_ethics
```

---

## 8. Related Documents

- DS(/init/ontology_base) - Companion theory for world knowledge
- DS(/reason/bias_control.js) - Uses axiology for bias masking
- DS(/theory/theory_preloader.js) - Loads this theory automatically
- DS(/init/theories/health_compliance.sys2dsl) - Domain extension example

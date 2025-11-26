# Design Spec: Use Case - Generating Hypotheses

ID: DS(/interface/usecase_hypothesize)

Status: DRAFT v1.0

## 1. Overview

This document describes how to use AGISystem2 to generate hypotheses that explain observations. This is **abductive reasoning** - reasoning from effects to possible causes.

### 1.1 What is Hypothesis Generation?

Given an observation (effect), find plausible explanations (causes):

```
Observation: Patient has fever
Hypotheses:  - Bacterial infection
             - Viral infection
             - Autoimmune response
             - Heat exhaustion
```

### 1.2 Key Concepts

- **Observation**: A fact we know to be true
- **Hypothesis**: A proposed explanation
- **Plausibility**: How likely the hypothesis is
- **Support**: Evidence supporting the hypothesis

---

## 2. Basic Hypothesis Generation

### 2.1 Simple HYPOTHESIZE

```sys2dsl
# Observation: Patient has fever
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?

# Returns:
# {
#   observation: { subject: "Patient", relation: "HAS_SYMPTOM", object: "fever" },
#   hypotheses: [
#     {
#       hypothesis: { subject: "infection", relation: "CAUSES", object: "fever" },
#       plausibility: 0.85,
#       confidence: 0.78,
#       supportingFacts: [
#         "infection IS_A disease",
#         "fever INDICATES infection"
#       ]
#     },
#     {
#       hypothesis: { subject: "inflammation", relation: "CAUSES", object: "fever" },
#       plausibility: 0.72,
#       confidence: 0.65,
#       supportingFacts: [...]
#     },
#     ...
#   ]
# }
```

### 2.2 Using ABDUCT

Lower-level abductive command:

```sys2dsl
# Find what could cause fever
@causes ABDUCT fever CAUSED_BY

# Returns nearest concepts that have CAUSES relationship to fever
```

---

## 3. Constrained Hypothesis Generation

### 3.1 With Type Constraints

```sys2dsl
# Only consider diseases as hypotheses
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever \
     CAUSED_BY ? \
     where_type=disease

# Filters hypotheses to only those that IS_A disease
```

### 3.2 With Mask

```sys2dsl
# Only consider physical causes (ontology partition)
@mask MASK_PARTITIONS ontology
@hyp HYPOTHESIZE_MASKED $mask Patient HAS_SYMPTOM fever CAUSED_BY ?
```

### 3.3 With Theory Context

```sys2dsl
# Load specialized theory first
@med LOAD_THEORY infectious_diseases

# Hypotheses limited to concepts in that theory
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?
```

---

## 4. Multiple Observations

### 4.1 Combined Symptoms

```sys2dsl
# Multiple observations to explain
@obs1 ASSERT Patient HAS_SYMPTOM fever
@obs2 ASSERT Patient HAS_SYMPTOM cough
@obs3 ASSERT Patient HAS_SYMPTOM fatigue

# Find hypotheses that explain ALL symptoms
@hyp HYPOTHESIZE_ALL Patient \
     HAS_SYMPTOM fever \
     HAS_SYMPTOM cough \
     HAS_SYMPTOM fatigue \
     CAUSED_BY ?

# Returns hypotheses ranked by how many symptoms they explain
```

### 4.2 Weighted Symptoms

```sys2dsl
# Some symptoms more important
@hyp HYPOTHESIZE_WEIGHTED Patient \
     HAS_SYMPTOM fever weight=0.8 \
     HAS_SYMPTOM cough weight=0.5 \
     HAS_SYMPTOM fatigue weight=0.3 \
     CAUSED_BY ?

# Ranking considers symptom weights
```

---

## 5. Hypothesis Ranking

### 5.1 Plausibility Factors

Hypotheses are ranked by:

1. **Geometric Distance**: How close in vector space
2. **Fact Support**: How many supporting facts exist
3. **Usage Frequency**: How often the hypothesis concept is used
4. **Theory Fit**: How well it fits loaded theories
5. **Parsimony**: Simpler explanations preferred

### 5.2 Custom Ranking

```sys2dsl
# Change ranking weights
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ? \
     rank_by=support \
     min_plausibility=0.5

# Options:
# rank_by: distance | support | frequency | combined
# min_plausibility: filter out low-scoring hypotheses
```

### 5.3 Limiting Results

```sys2dsl
# Get top N hypotheses
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ? limit=5
```

---

## 6. Hypothesis Explanation

### 6.1 Get Detailed Explanation

```sys2dsl
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?

# Get explanation for top hypothesis
@explain EXPLAIN $hyp.hypotheses[0]

# Returns:
# {
#   hypothesis: "infection CAUSES fever",
#   explanation: [
#     "Step 1: fever is a symptom observed in Patient",
#     "Step 2: infection IS_A disease",
#     "Step 3: infection commonly CAUSES fever (82% of cases)",
#     "Step 4: No contradicting evidence found"
#   ],
#   assumptions: [
#     "Patient does not have known autoimmune condition"
#   ],
#   alternatives: [
#     "inflammation (less likely due to lack of localized pain)"
#   ]
# }
```

### 6.2 Natural Language Output

```sys2dsl
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?
@readable TO_NATURAL $hyp

# Returns:
# "Based on the observation that Patient has fever, the most likely causes are:
#  1. Infection (85% plausible) - supported by general medical knowledge
#  2. Inflammation (72% plausible) - common cause of fever
#  3. Heat exhaustion (45% plausible) - possible but less common"
```

---

## 7. Validating Hypotheses

### 7.1 Check Consistency

```sys2dsl
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?

# Validate top hypothesis doesn't conflict with known facts
@firstHyp PICK_FIRST $hyp.hypotheses
@valid VALIDATE_HYPOTHESIS $firstHyp

# Returns:
# {
#   valid: true,
#   conflicts: [],
#   additionalSupport: [...]
# }
```

### 7.2 Find Contradicting Evidence

```sys2dsl
@contra FIND_CONTRADICTIONS $firstHyp

# Returns facts that would disprove the hypothesis
```

### 7.3 What Would Confirm

```sys2dsl
@confirm WHAT_WOULD_CONFIRM $firstHyp

# Returns:
# {
#   hypothesis: "infection CAUSES fever",
#   confirmingObservations: [
#     "Patient HAS elevated_white_blood_cell_count",
#     "Patient HAS positive_culture_test",
#     "Patient RESPONDS_TO antibiotic"
#   ]
# }
```

---

## 8. Iterative Hypothesis Refinement

### 8.1 Add More Observations

```sys2dsl
# Initial hypothesis
@hyp1 HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?
# Top: infection

# Add new observation
@obs ASSERT Patient HAS normal_white_blood_cell_count

# Re-hypothesize
@hyp2 HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?
# Now: infection drops, viral_infection rises (bacterial less likely)
```

### 8.2 Exclude Hypotheses

```sys2dsl
# Rule out a hypothesis
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ? \
     exclude=heat_exhaustion

# Or based on contradicting fact
@obs ASSERT Patient NOT_EXPOSED_TO high_temperature
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?
# heat_exhaustion automatically excluded
```

### 8.3 Focus on Specific Type

```sys2dsl
# We suspect infection, narrow it down
@hyp HYPOTHESIZE Patient HAS infection \
     IS_A ? \
     where_type=infection_subtype

# Returns: bacterial_infection, viral_infection, fungal_infection, etc.
```

---

## 9. Diagnostic Trees

### 9.1 Build Diagnostic Path

```sys2dsl
# Multi-step hypothesis refinement
@step1 HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?
# → infection (top)

@step2 HYPOTHESIZE Patient HAS infection IS_A ?
# → bacterial or viral?

@step3 WHAT_WOULD_CONFIRM bacterial_infection
# → positive blood culture, elevated WBC

# If those observations added:
@obs ASSERT Patient HAS elevated_wbc
@step4 HYPOTHESIZE Patient HAS infection IS_A ?
# → bacterial_infection rises
```

### 9.2 Automated Diagnostic Flow

```sys2dsl
# Run diagnostic script
@diagnosis DIAGNOSE Patient \
    symptoms=[fever, cough, fatigue] \
    mode=iterative

# Returns diagnostic tree with confidence at each branch
```

---

## 10. Complete Example: Medical Diagnosis

### 10.1 Setup

```sys2dsl
# Load medical knowledge
@med LOAD_THEORY medical_knowledge
@inf LOAD_THEORY infectious_diseases
```

### 10.2 Initial Observations

```sys2dsl
# Patient presentation
@o1 ASSERT Patient_X HAS_SYMPTOM high_fever
@o2 ASSERT Patient_X HAS_SYMPTOM dry_cough
@o3 ASSERT Patient_X HAS_SYMPTOM fatigue
@o4 ASSERT Patient_X HAS_SYMPTOM body_aches
```

### 10.3 Generate Hypotheses

```sys2dsl
@hyp HYPOTHESIZE_ALL Patient_X \
    HAS_SYMPTOM high_fever \
    HAS_SYMPTOM dry_cough \
    HAS_SYMPTOM fatigue \
    HAS_SYMPTOM body_aches \
    CAUSED_BY ?

# Returns:
# 1. influenza (92% - explains all symptoms)
# 2. covid_19 (88% - explains all symptoms)
# 3. bacterial_pneumonia (65% - explains most)
# 4. common_cold (45% - explains some)
```

### 10.4 Differentiate Top Hypotheses

```sys2dsl
# What distinguishes influenza from covid?
@diff DIFFERENTIATE influenza covid_19

# Returns:
# {
#   influenza: {
#     distinguishing: ["sudden_onset", "muscle_aches_severe"],
#     contra_indicators: ["loss_of_smell"]
#   },
#   covid_19: {
#     distinguishing: ["loss_of_smell", "loss_of_taste", "gradual_onset"],
#     contra_indicators: ["sudden_onset"]
#   }
# }
```

### 10.5 Add Differentiating Observation

```sys2dsl
# Patient reports loss of smell
@o5 ASSERT Patient_X HAS_SYMPTOM loss_of_smell

# Re-hypothesize
@hyp2 HYPOTHESIZE_ALL Patient_X \
    HAS_SYMPTOM high_fever \
    HAS_SYMPTOM dry_cough \
    HAS_SYMPTOM loss_of_smell \
    CAUSED_BY ?

# Now: covid_19 (95%), influenza (70%)
```

### 10.6 Recommend Next Steps

```sys2dsl
@confirm WHAT_WOULD_CONFIRM covid_19

# Returns:
# {
#   confirmingTests: ["pcr_test", "antigen_test"],
#   confirmingSymptoms: ["loss_of_taste"],
#   timeframe: "test results in 24-48 hours"
# }
```

---

## 11. Other Domains

### 11.1 Technical Troubleshooting

```sys2dsl
@tech LOAD_THEORY computer_diagnostics

@o1 ASSERT Server HAS_SYMPTOM slow_response
@o2 ASSERT Server HAS_SYMPTOM high_cpu

@hyp HYPOTHESIZE Server HAS_SYMPTOM slow_response CAUSED_BY ?

# Returns: memory_leak, infinite_loop, ddos_attack, resource_exhaustion
```

### 11.2 Scientific Discovery

```sys2dsl
@sci LOAD_THEORY chemistry

@obs ASSERT Reaction PRODUCES blue_precipitate

@hyp HYPOTHESIZE Reaction PRODUCES blue_precipitate CAUSED_BY ?

# Returns: copper_ion_presence, cobalt_compound, ...
```

### 11.3 Legal Reasoning

```sys2dsl
@law LOAD_THEORY contract_law

@obs ASSERT Contract IS breach

@hyp HYPOTHESIZE Contract IS breach CAUSED_BY ?

# Returns: non_performance, late_delivery, quality_defect, ...
```

---

## 12. Configuration

### 12.1 Hypothesis Settings

```javascript
{
  hypothesize: {
    maxHypotheses: 10,
    minPlausibility: 0.3,
    includeExplanation: true,
    rankingMethod: 'combined',
    weights: {
      distance: 0.4,
      support: 0.3,
      frequency: 0.2,
      parsimony: 0.1
    }
  }
}
```

### 12.2 Domain Hints

```sys2dsl
# Tell system what domain we're in
@config SET domain=medical

# Hypotheses will prefer medical concepts
```

---

## 13. Best Practices

### 13.1 Start Broad, Then Narrow

```sys2dsl
# 1. Get general hypotheses
@broad HYPOTHESIZE X HAS_SYMPTOM Y CAUSED_BY ?

# 2. Pick most plausible category
@category PICK_FIRST $broad.hypotheses

# 3. Narrow within category
@narrow HYPOTHESIZE X HAS $category IS_A ?
```

### 13.2 Always Validate

```sys2dsl
@hyp HYPOTHESIZE ...
@valid VALIDATE_HYPOTHESIS $hyp.hypotheses[0]

# Don't accept hypotheses that conflict with known facts
```

### 13.3 Consider Alternatives

```sys2dsl
# Even if top hypothesis is strong, consider alternatives
@top PICK_FIRST $hyp.hypotheses
@alternatives FILTER $hyp.hypotheses plausibility > 0.5

# Keep alternatives in mind for differential diagnosis
```

---

## 14. Related Documents

- DS(/theory/Sys2DSL_syntax) - Language reference
- DS(/theory/Sys2DSL_commands) - Command reference
- DS(/reason/reasoner.js) - Abductive reasoning implementation
- DS(/interface/usecase_prove) - Proving theorems

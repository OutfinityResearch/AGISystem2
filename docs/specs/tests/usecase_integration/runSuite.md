# Suite: usecase_integration

ID: DS(/tests/usecase_integration/runSuite)

Scope: High-level integration tests for the four major use cases:
- 11.a Define new theories (named scripts of Sys2DSL commands)
- 11.b Validate scripts against loaded theories (consistency check)
- 11.c Generate hypotheses to explain observations (abduction)
- 11.d Prove or invalidate theorems expressed as scripts (deduction)

Fixtures: Clean session with base ontology; theory files in fixtures/.

Profile: `auto_test` + `manual_test` for extended scenarios.

---

## Use Case 11.a: Define New Theories

References: DS(/interface/usecase_define_theory)

### Test: Create Named Theory from Script

Setup:
```sys2dsl
# Define a theory about physics
@theory THEORY_CREATE name="basic_physics"
@_ ASSERT water IS_A liquid
@_ ASSERT water HAS_PROPERTY boiling_point 100
@_ ASSERT water HAS_PROPERTY freezing_point 0
@_ ASSERT ice IS_A solid
@_ ASSERT ice TRANSFORMS_TO water WHEN temperature > 0
@_ ASSERT steam IS_A gas
@_ ASSERT water TRANSFORMS_TO steam WHEN temperature > 100
@saved THEORY_SAVE name="basic_physics"
```

Assertions:
- Theory "basic_physics" is created and saved
- `@list THEORY_LIST` includes "basic_physics"
- `@info THEORY_INFO name="basic_physics"` returns fact count and metadata
- Theory can be loaded in new session: `@l THEORY_LOAD name="basic_physics"`
- After load, `@q ASK water IS_A liquid` returns TRUE_CERTAIN

### Test: Theory Composition

Setup:
```sys2dsl
@_ THEORY_LOAD name="basic_physics"
@_ THEORY_PUSH name="chemistry_extension"
@_ ASSERT H2O IS_A molecule
@_ ASSERT water COMPOSED_OF H2O
@_ ASSERT H2O HAS_PROPERTY atoms 3
@saved THEORY_SAVE name="physics_chemistry"
```

Assertions:
- Combined theory contains facts from both layers
- `@facts FACTS_MATCHING "? IS_A molecule"` returns H2O
- `@facts FACTS_MATCHING "water ? ?"` returns both physics and chemistry facts

---

## Use Case 11.b: Validate Scripts Against Theories

References: DS(/interface/usecase_validate)

### Test: Consistent Script Validation

Setup:
```sys2dsl
@_ THEORY_LOAD name="basic_physics"
@validation VALIDATE_SCRIPT """
  @_ ASSERT vapor IS_A gas
  @_ ASSERT vapor SIMILAR_TO steam
"""
```

Assertions:
- Validation returns `{consistent: true, conflicts: []}`
- No contradictions detected
- New facts are compatible with existing theory

### Test: Inconsistent Script Detection

Setup:
```sys2dsl
@_ THEORY_LOAD name="basic_physics"
@validation VALIDATE_SCRIPT """
  @_ ASSERT water IS_A solid
  @_ ASSERT ice IS_A liquid
"""
```

Assertions:
- Validation returns `{consistent: false, conflicts: [...]}`
- Conflicts include: "water IS_A solid contradicts water IS_A liquid"
- Conflicts include: "ice IS_A liquid contradicts ice IS_A solid"
- Error messages reference specific assertions

### Test: Partial Consistency

Setup:
```sys2dsl
@_ THEORY_LOAD name="basic_physics"
@validation VALIDATE_SCRIPT """
  @_ ASSERT plasma IS_A state_of_matter
  @_ ASSERT water IS_A gas
"""
```

Assertions:
- First assertion is valid (new fact, no conflict)
- Second assertion conflicts with existing `water IS_A liquid`
- Response indicates which assertions passed/failed

---

## Use Case 11.c: Generate Hypotheses (Abduction)

References: DS(/interface/usecase_hypothesize)

### Test: Causal Hypothesis Generation

Setup:
```sys2dsl
@_ THEORY_LOAD name="medical_knowledge"  # Fixture with symptoms/diseases
@_ ASSERT Patient_X HAS_SYMPTOM fever
@_ ASSERT Patient_X HAS_SYMPTOM cough
@_ ASSERT Patient_X HAS_SYMPTOM fatigue

@hypotheses ABDUCT observation="Patient_X is_sick"
                   relation=CAUSED_BY
                   limit=5
```

Assertions:
- Returns list of plausible causes
- Each hypothesis has confidence score
- Hypotheses are ordered by plausibility
- Response includes supporting evidence

### Test: Missing Link Hypothesis

Setup:
```sys2dsl
@_ ASSERT A LEADS_TO B
@_ ASSERT C LEADS_TO D
# Missing: B LEADS_TO C

@hypotheses ABDUCT gap_between=A,D relation=LEADS_TO
```

Assertions:
- Returns hypothesis "B LEADS_TO C" to complete chain
- Confidence reflects inferential distance
- Multiple alternative paths may be suggested

### Test: Counterfactual Hypothesis

Setup:
```sys2dsl
@_ THEORY_LOAD name="historical_facts"
@hypotheses HYPOTHESIZE_IF """
  NOT(Treaty_of_Versailles OCCURRED)
""" then_ask="WW2 OCCURRED?"
```

Assertions:
- Returns counterfactual analysis
- Explains reasoning chain
- Identifies affected downstream facts

---

## Use Case 11.d: Prove or Invalidate Theorems

References: DS(/interface/usecase_prove)

### Test: Prove Valid Theorem

Setup:
```sys2dsl
@_ THEORY_LOAD name="basic_physics"
@_ ASSERT matter HAS_STATE solid
@_ ASSERT matter HAS_STATE liquid
@_ ASSERT matter HAS_STATE gas
@_ ASSERT ice IS_A matter
@_ ASSERT water IS_A matter
@_ ASSERT steam IS_A matter

@proof PROVE theorem="""
  ALL x WHERE x IS_A matter:
    EXISTS s WHERE x HAS_STATE s
"""
```

Assertions:
- Proof returns `{valid: true, proof_steps: [...]}`
- Proof steps show instantiation for ice, water, steam
- Each step references supporting facts

### Test: Invalidate False Theorem

Setup:
```sys2dsl
@_ THEORY_LOAD name="basic_physics"

@proof PROVE theorem="""
  water IS_A solid AND water IS_A liquid
"""
```

Assertions:
- Returns `{valid: false, counterexample: {...}}`
- Counterexample shows water is liquid but not solid
- References contradicting facts

### Test: Theorem with Preconditions

Setup:
```sys2dsl
@proof PROVE theorem="""
  IF temperature > 100 AND substance IS_A water
  THEN substance TRANSFORMS_TO steam
""" given=["basic_physics"]
```

Assertions:
- Returns `{valid: true}` based on theory facts
- Proof cites transformation rule
- Precondition checking is explicit

### Test: Undecidable Theorem

Setup:
```sys2dsl
@proof PROVE theorem="""
  dark_matter EXISTS
""" given=["basic_physics"]
```

Assertions:
- Returns `{valid: "UNKNOWN", reason: "insufficient_evidence"}`
- Neither proven nor disproven
- Indicates what additional facts would help

---

## End-to-End Workflow Test

### Test: Complete Theory Development Cycle

```sys2dsl
# 1. Create theory
@_ THEORY_CREATE name="biology_test"
@_ ASSERT mammal IS_A animal
@_ ASSERT mammal HAS_PROPERTY warm_blooded true
@_ ASSERT dog IS_A mammal
@_ ASSERT cat IS_A mammal

# 2. Validate extension
@v VALIDATE_SCRIPT """
  @_ ASSERT whale IS_A mammal
  @_ ASSERT whale HAS_PROPERTY lives_in water
"""
# Expected: consistent

# 3. Generate hypothesis
@h ABDUCT observation="whale breathes_air" relation=BECAUSE_OF
# Expected: suggests warm_blooded connection

# 4. Prove theorem
@p PROVE theorem="ALL x WHERE x IS_A mammal: x HAS_PROPERTY warm_blooded true"
# Expected: valid, with dog/cat/whale as instances

# 5. Save completed theory
@_ THEORY_SAVE name="biology_complete"
```

Assertions:
- All steps complete successfully
- Final theory is coherent and queryable
- Workflow demonstrates full capability chain

---

Sample Outputs:

Theory creation: `{name: "basic_physics", facts: 7, saved: true}`

Validation: `{consistent: true/false, conflicts: [], warnings: []}`

Hypothesis: `{hypotheses: [{cause: "...", confidence: 0.85, evidence: [...]}]}`

Proof: `{valid: true/false/"UNKNOWN", proof_steps: [], counterexample: null}`

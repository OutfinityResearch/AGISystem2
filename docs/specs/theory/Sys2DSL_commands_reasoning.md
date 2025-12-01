# Design Spec: Sys2DSL Reasoning Commands

ID: DS(/theory/Sys2DSL_commands_reasoning)

Status: DRAFT v1.0

## Scope
Commands that trigger reasoning flows: validation, proofs, hypothesis generation, counterfactuals, and abduction. Syntax uses `@var COMMAND …`.

---

## 1. Reasoning Commands

### 1.1 VALIDATE
**Purpose:** Check consistency/inclusion using ValidationEngine.

**Syntax:**
```sys2dsl
@v VALIDATE type=consistency concept=Dog
@incl VALIDATE type=inclusion point=$vec concept=Animal
```

**Returns:** Validation report (consistent, contradictions, proofs).

---

### 1.2 PROVE
**Purpose:** Prove a statement using inference and validation.

**Syntax:**
```sys2dsl
@proof PROVE subject RELATION object
```

**Returns:** `{ truth, confidence, proof: [...] }`

---

### 1.3 HYPOTHESIZE
**Purpose:** Generate hypotheses for an observation (abductive).

**Syntax:**
```sys2dsl
@h HYPOTHESIZE observation="fever cough"
```

**Returns:** Ranked hypotheses with bands and provenance.

---

### 1.4 CF (Counterfactual)
**Purpose:** Answer a question under temporary facts (push/pop theory).

**Syntax:**
```sys2dsl
@cf CF "Water boils at 50C" ASK Human SURVIVES_IN environment
```

**Returns:** Answer under counterfactual layer; original theory restored after.

---

### 1.5 ABDUCT
**Purpose:** Abductive reasoning for causes/effects via facts or geometry.

**Syntax:**
```sys2dsl
@a ABDUCT observation=Fever k=5
```

**Returns:** Hypotheses array (concept, band, scores).

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted reasoning commands from DS(/theory/Sys2DSL_commands) |

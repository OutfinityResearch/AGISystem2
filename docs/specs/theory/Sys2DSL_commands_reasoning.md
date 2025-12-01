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

### 1.2 PROVE (subcommand of QUERY/EXPLAIN_QUERY)
**Purpose:** Prove a statement using inference and validation. In the high-level API, `QUERY ... proof=true` or `EXPLAIN_QUERY ...` calls PROVE under the hood.

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

### 1.4 CF (subcommand of WHATIF)
**Purpose:** Answer a question under temporary facts (push/pop theory). High-level form: `WHATIF "<question>" | fact1 ; fact2`.

**Syntax:**
```sys2dsl
@cf CF "Water boils at 50C" ASK Human SURVIVES_IN environment
```

**Returns:** Answer under counterfactual layer; original theory restored after.

---

### 1.5 ABDUCT (subcommand of SUGGEST)
**Purpose:** Abductive reasoning for causes/effects via facts or geometry. High-level form: `SUGGEST observation [relation]`; SUGGEST may fall back to ANALOGICAL when abductive results are empty.

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

# Design Spec: Sys2DSL Reasoning Verbs

ID: DS(/theory/Sys2DSL_commands_reasoning)

Status: v3.0 - Unified Triple Syntax

## Scope
Verbs that trigger reasoning operations. **v3.0 uses strict triple syntax**: `@variable Subject VERB Object`.

See [Sys2DSL-grammar.md](../Sys2DSL-grammar.md) for complete v3.0 syntax rules.

---

## 1. Reasoning Verbs

### 1.1 VALIDATE (Consistency Checking)
**Purpose:** Check consistency of the current theory or specific points.

**v3.0 Syntax:**
```sys2dsl
@result Subject VALIDATE Object
```

**v3.0 Examples:**
```sys2dsl
@v any VALIDATE any              # Validate entire theory
@check Dog VALIDATE any          # Validate Dog concept
```

**Returns:** Point containing validation report (consistent, contradictions found, etc.)

---

### 1.2 PROVE (Proof Generation)
**Purpose:** Prove a statement using inference, returning a proof chain.

**v3.0 Syntax:**
```sys2dsl
@proof Subject PROVE Object
```

**v3.0 Examples:**
```sys2dsl
@p Socrates PROVE mortal         # Prove Socrates is mortal
@proof theorem PROVE conclusion  # Prove theorem
```

**Returns:** Proof point (kind: "proof") containing proof steps and links

**Notes:**
- Returns a composite "proof" point
- Contains steps, links, and validity
- Can be inspected or converted to natural language

---

### 1.3 HYPOTHESIZE (Hypothesis Generation)
**Purpose:** Generate plausible hypotheses for an observation.

**v3.0 Syntax:**
```sys2dsl
@hyps Observation HYPOTHESIZE Domain
```

**v3.0 Examples:**
```sys2dsl
@h fever HYPOTHESIZE medical     # Hypothesize medical causes of fever
@hyps symptom HYPOTHESIZE any    # Generate hypotheses for symptom
```

**Returns:** Composite point containing ranked hypotheses

---

### 1.4 ABDUCT (Abductive Reasoning)
**Purpose:** Abductive reasoning - find causes or explanations.

**v3.0 Syntax:**
```sys2dsl
@causes Observation ABDUCT Domain
```

**v3.0 Examples:**
```sys2dsl
@c Fever ABDUCT medical          # Find medical causes of Fever
@causes effect ABDUCT any        # Find causes of effect
```

**Returns:** Composite point containing potential causes ranked by plausibility

---

### 1.5 ANALOGIZE (Analogical Reasoning)
**Purpose:** Find analogies between domains using geometric transfer.

**v3.0 Syntax:**
```sys2dsl
@analog Source ANALOGIZE Target
```

**v3.0 Examples:**
```sys2dsl
@a legal_domain ANALOGIZE medical  # Find legal-medical analogies
@analog atom ANALOGIZE solar_system  # Atom-solar system analogy
```

**Returns:** Composite point containing analogical mappings

---

### 1.6 COUNTERFACTUAL (Hypothetical Reasoning)
**Purpose:** Reason about counterfactual scenarios (what-if).

**v3.0 Syntax:**
```sys2dsl
# Pattern: PUSH hypothetical layer, assert facts, query, POP
@_ hypothetical PUSH any
@_ Water BOILS_AT 50C
@r Human SURVIVES any
@_ any POP any
```

**v3.0 Example:**
```sys2dsl
@_ counterfactual PUSH any       # Push CF layer
@_ Dog IS_A reptile              # Assert counterfactual
@r Dog HAS fur                   # Query in CF world
@_ any POP any                   # Restore reality
```

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted reasoning commands from DS(/theory/Sys2DSL_commands) |
| **3.0** | **Converted to v3.0 triple syntax. PROVE now returns proof point. HYPOTHESIZE takes Domain parameter. ABDUCT simplified. Added ANALOGIZE and COUNTERFACTUAL patterns. Removed parameter=value syntax. All examples updated.** |

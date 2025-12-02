# Design Spec: src/theory/dsl_commands_reasoning.js

ID: DS(/theory/dsl_commands_reasoning.js)

Class `DSLCommandsReasoning`
- **Role**: Implements Sys2DSL commands for logical reasoning and validation: theory validation, proof construction, hypothesis generation, abductive reasoning, analogical reasoning, and contradiction detection.
- **Pattern**: Command handler collection; Orchestrates Reasoner and ContradictionDetector.
- **Key Collaborators**: `ConceptStore`, `ContradictionDetector`, `DSLParser`, `DSLCommandsCore`, `Reasoner`.

See also: DS(/reason/contradiction_detector.js), DS(/theory/dsl_commands_inference.js), DS(/knowledge/usage_tracking)

## Constructor Dependencies
```javascript
constructor({ conceptStore, contradictionDetector, parser, coreCommands, reasoner })
```

## Commands Implemented

### Validation Commands

#### VALIDATE
```sys2dsl
@result theory VALIDATE none
@result theory VALIDATE all
@result theory VALIDATE ontology
```
Checks consistency of current theory using v3 triple syntax.
- Format: `@var Subject VALIDATE Scope`
- Scope: `none` (default), `all`, or specific partition
- Detects disjoint zone violations (e.g., LOCATED_IN conflicts with CASTS abilities)
- Returns: `{ consistent, issues, scope, factCount }`

#### PROVE
```sys2dsl
@proof Dog PROVE Animal
@proof $subject PROVE $object
```
Attempts to prove a statement using available methods with v3 triple syntax.
- Format: `@var Subject PROVE Object`
- Note: Relation is inferred or specified via extended syntax
- Methods: direct, transitive, symmetric
- Returns: `{ proven: boolean, method, confidence, chain? }`

#### HYPOTHESIZE
```sys2dsl
@hyp Dog HYPOTHESIZE none
@hyp Dog HYPOTHESIZE HAS_PROPERTY_limit_10
```
Generates hypotheses based on peer patterns using v3 triple syntax.
- Format: `@var Subject HYPOTHESIZE Options`
- Options can specify relation and limit with underscore notation
- Finds entities of same type and suggests shared properties
- Returns: `{ subject, hypotheses: [...], count }`

### Abductive Reasoning

#### ABDUCT
```sys2dsl
@causes fever ABDUCT CAUSES
@causes high_blood_pressure ABDUCT limit_3_noTransitive
@causes observation ABDUCT maxDepth_5_transitive
```
Finds candidate causes for an observation using v3 triple syntax.
- Format: `@var Observation ABDUCT Options`

**Options (underscore notation):**
- `CAUSES` - Relation to search (default)
- `limit_N` - Number of candidates (default: 5)
- `maxDepth_N` - Max depth for transitive search (default: 3)
- `noTransitive` - Direct causes only
- `transitive` - Include transitive causes (default)

**Ranking Algorithm:**
1. Finds CAUSES/CAUSED_BY facts linking to observation
2. Adds priority scores from usage tracking
3. Applies depth penalty for transitive causes
4. Sorts by combined score (priority - depth penalty)

Returns:
```javascript
{
  observation: string,
  bestHypothesis: string | null,
  confidence: 'PLAUSIBLE' | 'FALSE',
  hypotheses: [{
    hypothesis: string,
    band: string,
    priorityScore: number,
    combinedScore: number,
    depth?: number
  }],
  count: number,
  method: 'reasoner' | 'fallback'
}
```

### Analogical Reasoning

#### ANALOGICAL
```sys2dsl
@result King_Queen ANALOGICAL Man
```
Performs analogical reasoning using v3 triple syntax: A is to B as C is to ?
- Format: `@var A_B ANALOGICAL C`
- Subject encodes source pair with underscore (A_B)
- Object is target concept (C)
- Computes delta vector between A and B
- Applies delta to C
- Finds nearest concept to predicted point
- Returns: `{ analogy: "A : B :: C : D", result, delta, confidence }`

### Contradiction Detection

#### CHECK_CONTRADICTION
```sys2dsl
@report knowledge CHECK_CONTRADICTION none
@report knowledge CHECK_CONTRADICTION disjointness_functional
@report knowledge CHECK_CONTRADICTION taxonomic_cardinality
```
Checks knowledge base for contradictions using v3 triple syntax.
- Format: `@var Subject CHECK_CONTRADICTION Scopes`

**Scopes (underscore-separated):**
- `none` - Check all scopes
- `disjointness` - Disjoint type violations
- `functional` - Single-valued relation violations
- `taxonomic` - Taxonomy cycles, inherited disjointness
- `cardinality` - Cardinality constraint violations
- Combine multiple: `disjointness_functional`

Returns:
```javascript
{
  consistent: boolean,
  contradictions: [...],
  summary: string,
  factCount: number
}
```

#### CHECK_WOULD_CONTRADICT
```sys2dsl
@test Fluffy CHECK_WOULD_CONTRADICT Dog
```
Checks if adding a new fact would cause contradiction using v3 triple syntax.
- Format: `@var Subject CHECK_WOULD_CONTRADICT Object`
- Note: Relation inferred or specified via extended syntax
- Returns: `{ wouldContradict: boolean, reason?, contradictions, proposedFact }`

### Constraint Registration

#### REGISTER_FUNCTIONAL
```sys2dsl
@r1 BORN_IN REGISTER_FUNCTIONAL none
@r2 BIOLOGICAL_MOTHER REGISTER_FUNCTIONAL none
```
Marks relation as functional (single-valued) using v3 triple syntax.
- Format: `@var RelationName REGISTER_FUNCTIONAL Object`
- Each subject can have at most one value for this relation

#### REGISTER_CARDINALITY
```sys2dsl
@r1 Person_PARENT_OF REGISTER_CARDINALITY min_0_max_*
@r2 Person_HAS_BIOLOGICAL_PARENT REGISTER_CARDINALITY min_2_max_2
```
Sets cardinality constraints on relations using v3 triple syntax.
- Format: `@var Concept_Relation REGISTER_CARDINALITY Constraints`
- Subject encodes concept and relation with underscore
- Constraints use underscore notation
- `min_N` - Minimum required instances
- `max_N` or `max_*` - Maximum allowed instances

## Usage Examples

### Theory Validation
```sys2dsl
# Check entire knowledge base
@report knowledge CHECK_CONTRADICTION none

# If inconsistent, identify issues
@issues theory VALIDATE all
```

### Proof Construction
```sys2dsl
# Try to prove taxonomic relationship
@p1 Poodle PROVE Animal
# → { proven: true, method: 'transitive', chain: ['Poodle', 'Dog', 'Animal'] }

# Check inherited property
@p2 Dog PROVE warm_blooded
```

### Abductive Medical Reasoning
```sys2dsl
# Find causes for symptom
@causes fever ABDUCT limit_5

# Check with priority weighting
# (frequently used causes ranked higher)
@diagnosis elevated_heart_rate ABDUCT maxDepth_2
```

### Before Asserting New Fact
```sys2dsl
# Check if new fact would cause contradiction
@safe Penguin CHECK_WOULD_CONTRADICT Fish

# If safe, assert it
@f1 Penguin IS_A Bird
```

## Notes/Constraints
- All commands follow strict triple syntax `@var Subject VERB Object`
- VALIDATE focuses on domain-specific consistency (zones, abilities)
- CHECK_CONTRADICTION uses ContradictionDetector for logical consistency
- Abductive reasoning uses Reasoner.abductCause if available, falls back to simple fact search
- Priority-weighted ranking in ABDUCT integrates with usage tracking (DS:/knowledge/usage_tracking)
- Analogical reasoning requires concepts to have geometric representations (diamonds)

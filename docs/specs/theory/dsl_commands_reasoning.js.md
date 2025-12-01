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
@result VALIDATE
@result VALIDATE all
@result VALIDATE scope=ontology
```
Checks consistency of current theory.
- Detects disjoint zone violations (e.g., LOCATED_IN conflicts with CASTS abilities)
- Returns: `{ consistent, issues, scope, factCount }`

#### PROVE
```sys2dsl
@proof PROVE Dog IS_A Animal
@proof PROVE $subject $relation $object
```
Attempts to prove a statement using available methods.
- Methods: direct, transitive, symmetric
- Returns: `{ proven: boolean, method, confidence, chain? }`

#### HYPOTHESIZE
```sys2dsl
@hyp HYPOTHESIZE Dog
@hyp HYPOTHESIZE Dog HAS_PROPERTY limit=10
```
Generates hypotheses based on peer patterns.
- Finds entities of same type and suggests shared properties
- Returns: `{ subject, hypotheses: [...], count }`

### Abductive Reasoning

#### ABDUCT
```sys2dsl
@causes ABDUCT fever
@causes ABDUCT "high blood pressure" limit=3 noTransitive
@causes ABDUCT observation maxDepth=5 transitive
```
Finds candidate causes for an observation.

**Options:**
- `limit=N` - Number of candidates (default: 5)
- `maxDepth=N` - Max depth for transitive search (default: 3)
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
@result ANALOGICAL source_a=King source_b=Queen target_c=Man
```
Performs analogical reasoning: A is to B as C is to ?
- Computes delta vector between A and B
- Applies delta to C
- Finds nearest concept to predicted point
- Returns: `{ analogy: "A : B :: C : D", result, delta, confidence }`

### Contradiction Detection

#### CHECK_CONTRADICTION
```sys2dsl
@report CHECK_CONTRADICTION
@report CHECK_CONTRADICTION disjointness functional
@report CHECK_CONTRADICTION taxonomic cardinality
```
Checks knowledge base for contradictions.

**Scopes:**
- `disjointness` - Disjoint type violations
- `functional` - Single-valued relation violations
- `taxonomic` - Taxonomy cycles, inherited disjointness
- `cardinality` - Cardinality constraint violations

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
@test CHECK_WOULD_CONTRADICT Fluffy IS_A Dog
```
Checks if adding a new fact would cause contradiction.
- Returns: `{ wouldContradict: boolean, reason?, contradictions, proposedFact }`

### Constraint Registration

#### REGISTER_FUNCTIONAL
```sys2dsl
@_ REGISTER_FUNCTIONAL BORN_IN
@_ REGISTER_FUNCTIONAL BIOLOGICAL_MOTHER
```
Marks relation as functional (single-valued).
- Each subject can have at most one value for this relation

#### REGISTER_CARDINALITY
```sys2dsl
@_ REGISTER_CARDINALITY Person PARENT_OF min=0 max=*
@_ REGISTER_CARDINALITY Person HAS_BIOLOGICAL_PARENT min=2 max=2
```
Sets cardinality constraints on relations.
- `min=N` - Minimum required instances
- `max=N` or `max=*` - Maximum allowed instances

## Usage Examples

### Theory Validation
```sys2dsl
# Check entire knowledge base
@report CHECK_CONTRADICTION

# If inconsistent, identify issues
@issues VALIDATE
```

### Proof Construction
```sys2dsl
# Try to prove taxonomic relationship
@p1 PROVE Poodle IS_A Animal
# → { proven: true, method: 'transitive', chain: ['Poodle', 'Dog', 'Animal'] }

# Check inherited property
@p2 PROVE Dog HAS_PROPERTY warm_blooded
```

### Abductive Medical Reasoning
```sys2dsl
# Find causes for symptom
@causes ABDUCT fever limit=5

# Check with priority weighting
# (frequently used causes ranked higher)
@diagnosis ABDUCT "elevated heart rate" maxDepth=2
```

### Before Asserting New Fact
```sys2dsl
# Check if new fact would cause contradiction
@safe CHECK_WOULD_CONTRADICT Penguin IS_A Fish

# If safe, assert it
@_ ASSERT Penguin IS_A Bird
```

## Notes/Constraints
- VALIDATE focuses on domain-specific consistency (zones, abilities)
- CHECK_CONTRADICTION uses ContradictionDetector for logical consistency
- Abductive reasoning uses Reasoner.abductCause if available, falls back to simple fact search
- Priority-weighted ranking in ABDUCT integrates with usage tracking (DS:/knowledge/usage_tracking)
- Analogical reasoning requires concepts to have geometric representations (diamonds)

# Design Spec: src/theory/dsl_commands_inference.js

ID: DS(/theory/dsl_commands_inference.js)

Class `DSLCommandsInference`
- **Role**: Implements Sys2DSL commands for inference reasoning: multi-method inference, forward chaining, rule definition, default reasoning, and explanation generation.
- **Pattern**: Command handler collection; Delegates to InferenceEngine.
- **Key Collaborators**: `InferenceEngine`, `DSLParser`.

See also: DS(/reason/inference_engine.js), DS(/theory/dsl_commands_reasoning.js)

## Constructor Dependencies
```javascript
constructor({ inferenceEngine, parser })
```

## Commands Implemented

### INFER (v3.0 Triple Syntax)
```sys2dsl
@result Dog INFER Animal
@result Dog INFER_method_transitive Animal
@result Dog INFER_proof warm_blooded
@result $subject INFER_maxDepth_5 $object
```
Attempts to infer a statement using all available methods.

**v3.0 Options (underscore notation):**
- `INFER_method_X` - Use specific method only (direct, transitive, symmetric, inverse, composition, inheritance, default)
- `INFER_proof` - Include proof chain in result
- `INFER_maxDepth_N` - Maximum depth for recursive methods

**Inference Methods (in order):**
1. `direct` - Exact fact lookup
2. `transitive` - Follow relation chains (for transitive relations)
3. `symmetric` - Check reverse direction (for symmetric relations)
4. `inverse` - Check inverse relation
5. `composition` - Apply user-defined rules
6. `inheritance` - Property inheritance via IS_A
7. `default` - Non-monotonic default reasoning

Returns:
```javascript
{
  truth: 'TRUE_CERTAIN' | 'TRUE_DEFAULT' | 'UNKNOWN',
  method: string,
  confidence: number,
  proof?: ProofChain,
  query: { subject, relation, object }
}
```

### FORWARD_CHAIN (v3.0 Triple Syntax)
```sys2dsl
@derived any FORWARD_CHAIN any
@derived any FORWARD_CHAIN_maxIterations_50 any
```
Derives all possible conclusions via forward chaining.
- Applies composition rules
- Expands transitive relations
- Expands symmetric relations

Returns:
```javascript
{
  derived: Fact[],      // Newly derived facts
  count: number,        // Number of new facts
  originalCount: number // Original fact count
}
```

### DEFINE_RULE (v3.0 Triple Syntax)
```sys2dsl
@rule GRANDPARENT_OF DEFINE_RULE "?x PARENT_OF ?y AND ?y PARENT_OF ?z"
```
Defines a composition/inference rule.

**v3.0 Syntax:**
- Subject: Rule name (e.g., GRANDPARENT_OF)
- VERB: DEFINE_RULE
- Object: Rule body as string with AND/OR logic

**Variables:** Use `?name` for pattern variables.

Example: Uncle rule
```sys2dsl
@rule UNCLE_OF DEFINE_RULE "?x SIBLING_OF ?y AND ?y PARENT_OF ?z"
```

### DEFINE_DEFAULT (v3.0 Triple Syntax)
```sys2dsl
@default Bird_CAN_fly DEFINE_DEFAULT "typical Bird exceptions Penguin_Ostrich"
```
Defines a default reasoning rule (non-monotonic).

**v3.0 Syntax:**
- Subject: Rule pattern with underscores (Type_Property_Value)
- VERB: DEFINE_DEFAULT
- Object: String with typical type and exceptions (underscore-separated)

**Semantics:**
- If X IS_A Type and X is not an exception, then X has property with default value
- Returns `TRUE_DEFAULT` (not `TRUE_CERTAIN`) to indicate defeasibility

### WHY (v3.0 Triple Syntax)
```sys2dsl
@explanation Dog WHY Animal
@explanation Tweety WHY_CAN fly
```
Explains why something is true/false with detailed reasoning chain.

Returns:
```javascript
{
  explanation: string,  // Human-readable explanation
  truth: string,
  proof?: ProofChain,
  query: { subject, relation, object }
}
```

**Explanation Format:**
```
Query: Dog IS_A Animal
Result: TRUE_CERTAIN

Reasoning chain:
  - Dog IS_A mammal (direct_match)
  - mammal IS_A Animal (direct_match)

Method: transitive
Confidence: 90.3%
```

## Proof Chain Structure
```javascript
{
  goal: { subject, relation, object },
  steps: [
    { fact: { subject, relation, object }, justification: string },
    { rule: string, justification: string },
    { assumption: string, justification: string }
  ],
  valid: boolean,
  defeasible?: boolean  // For default reasoning
}
```

## Usage Examples

### Multi-Method Inference (v3.0)
```sys2dsl
# Let inference engine try all methods
@result Poodle INFER Animal

# Force specific method
@result Bob INFER_method_symmetric Alice

# Get proof chain
@result Dog INFER_proof warm_blooded
```

### Define Family Relations (v3.0)
```sys2dsl
# Define rules
@_ GRANDPARENT_OF DEFINE_RULE "?x PARENT_OF ?y AND ?y PARENT_OF ?z"
@_ UNCLE_OF DEFINE_RULE "?x SIBLING_OF ?y AND ?y PARENT_OF ?z"

# Assert facts
@_ Alice PARENT_OF Bob
@_ Bob PARENT_OF Charlie
@_ Dave SIBLING_OF Bob

# Query derived relations
@gp Alice INFER_GRANDPARENT_OF Charlie
@uncle Dave INFER_UNCLE_OF Charlie
```

### Default Reasoning with Exceptions (v3.0)
```sys2dsl
# Define default: birds typically fly
@_ Bird_CAN_fly DEFINE_DEFAULT "typical Bird exceptions Penguin_Ostrich_Kiwi"

# Assert facts
@_ Tweety IS_A Bird
@_ Pete IS_A Penguin
@_ Penguin IS_A Bird

# Query
@q1 Tweety INFER_CAN fly
# → { truth: 'TRUE_DEFAULT', assumptions: ['Tweety is a typical Bird'] }

@q2 Pete INFER_CAN fly
# → { truth: 'FALSE', reason: 'exception_applies', exception: 'Penguin' }
```

### Forward Chaining (v3.0)
```sys2dsl
# Derive all conclusions
@new any FORWARD_CHAIN_maxIterations_100 any

# Check what was derived
@count $new COUNT any
```

## Notes/Constraints
- Inference methods are tried in order; first success wins
- Forward chaining is expensive - use maxIterations to limit
- Rule variables must start with `?`
- Default reasoning returns `TRUE_DEFAULT`, not `TRUE_CERTAIN`
- Exceptions in default rules are checked via IS_A (including transitive)
- WHY command always includes proof=true internally

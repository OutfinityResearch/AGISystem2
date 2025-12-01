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

### INFER (subcommand of QUERY)
```sys2dsl
@result INFER Dog IS_A Animal
@result INFER Dog IS_A Animal method=transitive
@result INFER Dog HAS_PROPERTY warm_blooded proof=true
@result INFER $subject $relation $object maxDepth=5
```
Attempts to infer a statement using all available methods.

**Options:**
- `method=X` - Use specific method only (direct, transitive, symmetric, inverse, composition, inheritance, default)
- `proof=true` - Include proof chain in result
- `maxDepth=N` - Maximum depth for recursive methods

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

### FORWARD_CHAIN (advanced/subcommand)
```sys2dsl
@derived FORWARD_CHAIN
@derived FORWARD_CHAIN maxIterations=50
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

### DEFINE_RULE (advanced)
```sys2dsl
@rule DEFINE_RULE GRANDPARENT_OF head=?x GRANDPARENT_OF ?z body=?x PARENT_OF ?y body=?y PARENT_OF ?z
```
Defines a composition/inference rule.

**Syntax:**
- `name` - Rule name (first arg)
- `head=?x REL ?z` - Conclusion pattern
- `body=?x REL1 ?y` - Premise pattern (multiple allowed)

**Variables:** Use `?name` for pattern variables.

Example: Uncle rule
```sys2dsl
@rule DEFINE_RULE UNCLE_OF head=?x UNCLE_OF ?z body=?x SIBLING_OF ?y body=?y PARENT_OF ?z
```

### DEFINE_DEFAULT (advanced)
```sys2dsl
@default DEFINE_DEFAULT birds_fly typical=Bird property=CAN value=fly exceptions=Penguin,Ostrich
```
Defines a default reasoning rule (non-monotonic).

**Parameters:**
- `name` - Rule name (first arg)
- `typical=Type` - Type that typically has property
- `property=REL` - The relation/property
- `value=V` - The default value
- `exceptions=E1,E2` - Comma-separated exception types

**Semantics:**
- If X IS_A Type and X is not an exception, then X has property with default value
- Returns `TRUE_DEFAULT` (not `TRUE_CERTAIN`) to indicate defeasibility

### WHY
```sys2dsl
@explanation WHY Dog IS_A Animal
@explanation WHY Tweety CAN fly
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

### Multi-Method Inference
```sys2dsl
# Let inference engine try all methods
@result INFER Poodle IS_A Animal

# Force specific method
@result INFER Bob SIBLING_OF Alice method=symmetric

# Get proof chain
@result INFER Dog HAS_PROPERTY warm_blooded proof=true
```

### Define Family Relations
```sys2dsl
# Define rules
@_ DEFINE_RULE GRANDPARENT_OF head=?x GRANDPARENT_OF ?z body=?x PARENT_OF ?y body=?y PARENT_OF ?z
@_ DEFINE_RULE UNCLE_OF head=?x UNCLE_OF ?z body=?x SIBLING_OF ?y body=?y PARENT_OF ?z

# Assert facts
@_ ASSERT Alice PARENT_OF Bob
@_ ASSERT Bob PARENT_OF Charlie
@_ ASSERT Dave SIBLING_OF Bob

# Query derived relations
@gp INFER Alice GRANDPARENT_OF Charlie
@uncle INFER Dave UNCLE_OF Charlie
```

### Default Reasoning with Exceptions
```sys2dsl
# Define default: birds typically fly
@_ DEFINE_DEFAULT birds_fly typical=Bird property=CAN value=fly exceptions=Penguin,Ostrich,Kiwi

# Assert facts
@_ ASSERT Tweety IS_A Bird
@_ ASSERT Pete IS_A Penguin
@_ ASSERT Penguin IS_A Bird

# Query
@q1 INFER Tweety CAN fly
# → { truth: 'TRUE_DEFAULT', assumptions: ['Tweety is a typical Bird'] }

@q2 INFER Pete CAN fly
# → { truth: 'FALSE', reason: 'exception_applies', exception: 'Penguin' }
```

### Forward Chaining
```sys2dsl
# Derive all conclusions
@new FORWARD_CHAIN maxIterations=100

# Check what was derived
@count COUNT $new
```

## Notes/Constraints
- Inference methods are tried in order; first success wins
- Forward chaining is expensive - use maxIterations to limit
- Rule variables must start with `?`
- Default reasoning returns `TRUE_DEFAULT`, not `TRUE_CERTAIN`
- Exceptions in default rules are checked via IS_A (including transitive)
- WHY command always includes proof=true internally

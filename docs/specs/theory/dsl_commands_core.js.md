# Design Spec: src/theory/dsl_commands_core.js

ID: DS(/theory/dsl_commands_core.js)

Class `DSLCommandsCore`
- **Role**: Implements fundamental Sys2DSL commands for knowledge manipulation: queries (ASK, CF, ABDUCT), assertions (ASSERT), fact matching, boolean operations, list operations, concept/relation binding, and masking.
- **Pattern**: Command handler collection; Stateless except for runtime relation definitions.
- **Key Collaborators**: `EngineAPI`, `ConceptStore`, `Config`, `DSLParser`, `DimensionRegistry`.

## Constructor Dependencies
```javascript
constructor({ api, conceptStore, config, parser, dimensionRegistry })
```

## Commands Implemented

### Query Commands

#### ASK
```sys2dsl
@result ASK "Is Dog a mammal?"
@result ASK "$subject IS_A $type"
```
Queries the knowledge base for truth value.
- Expands variables in question string
- Validates no property=value syntax in triplets
- Returns: `{ truth, confidence, method, ... }`

#### CF (Counterfactual)
```sys2dsl
@result CF "Would water boil? | temperature=100 ; pressure=1atm"
```
Counterfactual reasoning with hypothetical facts.
- Format: `"<question> | <fact1> ; <fact2> ; ..."`
- Returns counterfactual query result

#### ABDUCT
```sys2dsl
@causes ABDUCT fever
@causes ABDUCT "high temperature" CAUSES
```
Abductive reasoning - find causes for observations.
- First arg: observation to explain
- Optional second arg: relation to use
- Returns: `{ hypothesis, band, ... }`

#### FACTS_MATCHING
```sys2dsl
@animals INSTANCES_OF Animal
@dogFacts FACTS_MATCHING Dog
```
Pattern matching over facts.
- Uses `*` as wildcard (matches any value)
- **FORBIDDEN**: The `?` character MUST NOT be used as wildcard. This is strictly prohibited.
- Returns: array of matching facts

#### ALL_REQUIREMENTS_SATISFIED
```sys2dsl
@satisfied ALL_REQUIREMENTS_SATISFIED $requirements $satisfied
```
Checks if all requirements in first list are satisfied by second list.
- Returns: `{ truth: 'TRUE_CERTAIN' | 'FALSE' }`

### Boolean Operations

#### BOOL_AND / BOOL_OR / BOOL_NOT
```sys2dsl
@combined BOOL_AND $result1 $result2
@either BOOL_OR $a $b
@negated BOOL_NOT $result
```
Boolean operations on truth values.
- Works with objects containing `truth` property
- Handles TRUE_CERTAIN, FALSE, PLAUSIBLE, CONFLICT

#### NONEMPTY
```sys2dsl
@hasItems NONEMPTY $list
```
Checks if list is non-empty.
- Returns: `{ truth: 'TRUE_CERTAIN' | 'FALSE' }`

### List Operations

#### MERGE_LISTS
```sys2dsl
@combined MERGE_LISTS $list1 $list2
```
Concatenates two lists.

#### PICK_FIRST / PICK_LAST
```sys2dsl
@first PICK_FIRST $list
@last PICK_LAST $list
```
Extracts first/last element from list.

#### COUNT
```sys2dsl
@n COUNT $list
```
Returns: `{ count: number }`

#### FILTER
```sys2dsl
@filtered FILTER $list relation=IS_A
```
Filters list by field=value criterion.

#### POLARITY_DECIDE
```sys2dsl
@decision POLARITY_DECIDE $negatives $positives $regulations
```
Decides polarity based on negative/positive evidence.
- Returns: CONFLICT, FALSE, TRUE_CERTAIN based on matches

### Concept/Relation Binding

#### BIND_CONCEPT
```sys2dsl
@dogRef BIND_CONCEPT Dog
```
Creates or retrieves concept reference.
- Returns: `{ kind: 'conceptRef', label, id }`

#### BIND_POINT
```sys2dsl
@dogPoint BIND_POINT $dogRef
```
Gets geometric point(s) for concept.
- Returns: `{ kind: 'pointRef', conceptId, centers, meta }`

#### BIND_RELATION
```sys2dsl
@isARef BIND_RELATION IS_A
```
Gets relation with its properties.
- Returns: `{ kind: 'relationRef', relation, properties }`

#### DEFINE_CONCEPT
```sys2dsl
@dog DEFINE_CONCEPT Dog
@dog DEFINE_CONCEPT Dog vector=[10,20,30]
```
Creates or updates concept, optionally with initial vector.

#### DEFINE_RELATION
```sys2dsl
@r DEFINE_RELATION SIBLING_OF symmetric
@r DEFINE_RELATION PARENT_OF inverse=CHILD_OF
```
Defines relation with properties (symmetric, transitive, inverse).

#### INSPECT
```sys2dsl
@snapshot INSPECT Dog
```
Returns concept snapshot with all diamonds and metadata.

#### LITERAL
```sys2dsl
@value LITERAL {"key": "value"}
@str LITERAL "hello world"
```
Parses JSON literal or returns string.

### Masking Commands

#### MASK_PARTITIONS
```sys2dsl
@mask MASK_PARTITIONS ontology axiology
```
Creates bitmask covering specified partitions.
- Returns: `{ kind: 'maskRef', dims, spec }`

#### MASK_DIMS
```sys2dsl
@mask MASK_DIMS Temperature Mass Location
```
Creates bitmask for specific dimension names.
- Uses DimensionRegistry for name→index resolution

#### ASK_MASKED
```sys2dsl
@result ASK_MASKED $mask "Is Dog warm-blooded?"
```
Queries with dimension mask applied.
- Restricts comparison to masked dimensions
- Returns result with maskSpec annotation

## Helper Methods

```javascript
getRelationProperties(relation: string): { transitive, symmetric, inverse }
```
Gets relation properties from local overrides or DimensionRegistry.

## Notes/Constraints
- All commands validate input and throw descriptive errors
- Variable expansion happens before command execution
- DimensionRegistry is single source of truth for relation properties
- Local relation definitions (via DEFINE_RELATION) override registry
- Mask commands require Config for dimension count

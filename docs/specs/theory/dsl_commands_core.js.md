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

#### ASK (used via triple syntax)
```sys2dsl
@result Query ASK "Is Dog a mammal?"
@result Query ASK "$subject IS_A $type"
```
Queries the knowledge base for truth value using v3 triple syntax.
- In v3: `@var Subject VERB Object` where VERB is the operation
- Query is the subject, ASK is the verb, question is the object
- Expands variables in question string
- Returns: `{ truth, confidence, method, ... }`

#### CF (Counterfactual)
```sys2dsl
@result Query CF "Would water boil? | water HAS temperature_100 ; water HAS pressure_1atm"
```
Counterfactual reasoning with hypothetical facts using v3 triple syntax.
- Format: `@var Query CF "<question> | <fact1> ; <fact2> ; ..."`
- Query is subject, CF is verb, question with facts is object
- Facts inside string use triple syntax with underscores for values
- Returns counterfactual query result

#### ABDUCT
```sys2dsl
@causes fever ABDUCT CAUSES
@causes high_temperature ABDUCT CAUSES
```
Abductive reasoning - find causes for observations using v3 triple syntax.
- Format: `@var Subject ABDUCT Relation`
- Subject is the observation to explain
- ABDUCT is the verb
- Relation (e.g., CAUSES) is the object/relation type to search
- Returns: `{ hypothesis, band, ... }`

#### FACTS
```sys2dsl
@animals any IS_A Animal
@dogFacts Dog FACTS any
```
Pattern matching over facts using v3 triple syntax.
- Format: `@var Subject FACTS Pattern`
- Subject is the concept to match
- FACTS is the verb
- Pattern uses `any` as wildcard (matches any value)
- Returns: array of matching facts
- For instances: `@var any IS_A Type` returns all instances of Type

#### ALL_REQUIREMENTS_SATISFIED
```sys2dsl
@satisfied $requirements ALL_REQUIREMENTS_SATISFIED $satisfied
```
Checks if all requirements in first list are satisfied by second list using v3 triple syntax.
- Format: `@var Subject ALL_REQUIREMENTS_SATISFIED Object`
- Subject is the requirements list
- Object is the satisfied items list
- Returns: `{ truth: 'TRUE_CERTAIN' | 'FALSE' }`

### Boolean Operations

#### BOOL_AND / BOOL_OR / BOOL_NOT
```sys2dsl
@combined $result1 BOOL_AND $result2
@either $a BOOL_OR $b
@negated $result BOOL_NOT none
```
Boolean operations on truth values using v3 triple syntax.
- Format: `@var Subject BOOL_OP Object`
- Subject is first operand, BOOL_OP is verb, Object is second operand
- For BOOL_NOT: Object can be `none` or placeholder
- Works with objects containing `truth` property
- Handles TRUE_CERTAIN, FALSE, PLAUSIBLE, CONFLICT

#### NONEMPTY
```sys2dsl
@hasItems $list NONEMPTY none
```
Checks if list is non-empty using v3 triple syntax.
- Format: `@var Subject NONEMPTY Object`
- Subject is the list variable
- Object is placeholder (e.g., `none`)
- Returns: `{ truth: 'TRUE_CERTAIN' | 'FALSE' }`

### List Operations

#### MERGE_LISTS
```sys2dsl
@combined $list1 MERGE_LISTS $list2
```
Concatenates two lists using v3 triple syntax.
- Format: `@var Subject MERGE_LISTS Object`

#### PICK_FIRST / PICK_LAST
```sys2dsl
@first $list PICK_FIRST none
@last $list PICK_LAST none
```
Extracts first/last element from list using v3 triple syntax.
- Format: `@var Subject PICK_FIRST/PICK_LAST Object`
- Object is placeholder

#### COUNT
```sys2dsl
@n $list COUNT none
```
Returns: `{ count: number }`
- Format: `@var Subject COUNT Object`

#### FILTER
```sys2dsl
@filtered $list FILTER IS_A
```
Filters list by relation criterion using v3 triple syntax.
- Format: `@var Subject FILTER Relation`

#### POLARITY_DECIDE
```sys2dsl
@decision $negatives POLARITY_DECIDE $positives
```
Decides polarity based on negative/positive evidence using v3 triple syntax.
- Format: `@var NegativeList POLARITY_DECIDE PositiveList`
- Additional regulations can be passed via extended syntax
- Returns: CONFLICT, FALSE, TRUE_CERTAIN based on matches

### Concept/Relation Binding

#### BIND_CONCEPT
```sys2dsl
@dogRef Dog BIND_CONCEPT none
```
Creates or retrieves concept reference using v3 triple syntax.
- Format: `@var ConceptName BIND_CONCEPT Object`
- Returns: `{ kind: 'conceptRef', label, id }`

#### BIND_POINT
```sys2dsl
@dogPoint $dogRef BIND_POINT none
```
Gets geometric point(s) for concept using v3 triple syntax.
- Format: `@var ConceptRef BIND_POINT Object`
- Returns: `{ kind: 'pointRef', conceptId, centers, meta }`

#### BIND_RELATION
```sys2dsl
@isARef IS_A BIND_RELATION none
```
Gets relation with its properties using v3 triple syntax.
- Format: `@var RelationName BIND_RELATION Object`
- Returns: `{ kind: 'relationRef', relation, properties }`

#### DEFINE_CONCEPT
```sys2dsl
@dog Dog DEFINE_CONCEPT none
@dog Dog DEFINE_CONCEPT vector_data
```
Creates or updates concept using v3 triple syntax.
- Format: `@var ConceptName DEFINE_CONCEPT Properties`
- Properties can be `none` or property specification

#### DEFINE_RELATION
```sys2dsl
@r SIBLING_OF DEFINE_RELATION symmetric
@r PARENT_OF DEFINE_RELATION inverse_CHILD_OF
```
Defines relation with properties using v3 triple syntax.
- Format: `@var RelationName DEFINE_RELATION Properties`
- Properties: symmetric, transitive, inverse_RELATION

#### INSPECT
```sys2dsl
@snapshot Dog INSPECT none
```
Returns concept snapshot with all diamonds and metadata using v3 triple syntax.
- Format: `@var ConceptName INSPECT Object`

#### LITERAL
```sys2dsl
@value json_data LITERAL {"key": "value"}
@str text LITERAL "hello world"
```
Parses JSON literal or returns string using v3 triple syntax.
- Format: `@var DataType LITERAL Value`

### Masking Commands

#### MASK
```sys2dsl
@mask ontology MASK any
@mask axiology MASK any
@mask Temperature_Mass_Location MASK any
```
Creates bitmask for dimensions or partitions using v3 triple syntax.
- Format: `@var Subject MASK any`
- Subject can be:
  - Partition name (e.g., `ontology`, `axiology`)
  - Dimension names combined with underscores (e.g., `Temperature_Mass_Location`)
- Returns: `{ kind: 'maskRef', dims, spec }`
- Uses DimensionRegistry for name→index resolution

#### ASK_MASKED
```sys2dsl
@result ASK_MASKED $mask Dog IS_A mammal
```
Queries with dimension mask applied using v3 triple syntax.
- Format: `@var ASK_MASKED MaskRef Subject VERB Object`
- Restricts comparison to masked dimensions
- Returns result with maskSpec annotation

## Helper Methods

```javascript
getRelationProperties(relation: string): { transitive, symmetric, inverse }
```
Gets relation properties from local overrides or DimensionRegistry.

## Notes/Constraints
- All commands follow strict triple syntax `@var Subject VERB Object`
- All commands validate input and throw descriptive errors
- Variable expansion happens before command execution
- DimensionRegistry is single source of truth for relation properties
- Local relation definitions (via DEFINE_RELATION) override registry
- Mask commands require Config for dimension count

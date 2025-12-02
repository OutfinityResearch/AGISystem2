# Design Spec: src/theory/dsl_commands_theory.js

ID: DS(/theory/dsl_commands_theory.js)

Class `DSLCommandsTheory`
- **Role**: Implements Sys2DSL commands for theory/context management: listing, loading, saving, merging theories; counterfactual layers (PUSH/POP); session reset.
- **Pattern**: Command handler collection; Uses pluggable storage interface.
- **Key Collaborators**: `TheoryStorage`, `MetaTheoryRegistry`, `ConceptStore`, `DSLParser`.

See also: DS(/theory/theory_storage.js), DS(/theory/meta_theory_registry.js)

## Constructor Dependencies
```javascript
constructor({ conceptStore, parser, storage, metaRegistry, theoriesDir })
```
- `conceptStore` - For accessing/modifying facts
- `parser` - For variable expansion
- `storage` - TheoryStorage instance (optional, defaults to file storage)
- `metaRegistry` - MetaTheoryRegistry instance (optional, uses shared)
- `theoriesDir` - Custom theories directory path

## Commands Implemented

### THEORIES
```sys2dsl
@list any THEORIES any
```
Lists available and active theories using v3 triple syntax.
- Format: `@var Subject THEORIES Object`
- Returns: `{ available: string[], active: string[], current: string|null, depth: number }`

### LOAD
```sys2dsl
@result health_rules LOAD any
@result $theoryName LOAD any
```
Loads a theory by name from storage using v3 triple syntax.
- Format: `@var TheoryName LOAD Object`
- Parses v3 triple statements and adds facts to ConceptStore
- Registers theory in MetaTheoryRegistry
- Records load for statistics
- Parses `@var Subject VERB Object` triple format
- Returns: `{ ok: boolean, name, loaded: number, errors?: string[], status: 'loaded' }`

### SAVE
```sys2dsl
@result my_session SAVE any
@result my_session SAVE domain_medical_version_1.0
```
Saves current facts to storage using v3 triple syntax.
- Format: `@var TheoryName SAVE Metadata`
- Supports optional metadata in underscore notation
- Generates v3 DSL format with `@fNNN Subject VERB Object` statements
- Returns: `{ ok: boolean, name, factCount, conceptCount, timestamp, status: 'saved' }`

### MERGE_THEORY
```sys2dsl
@result additional_rules MERGE_THEORY none
```
Merges another theory into current knowledge using v3 triple syntax.
- Format: `@var TheoryName MERGE_THEORY Object`
- Does not clear existing facts (additive)
- Returns: `{ ok: boolean, name, merged: number, totalFacts: number, status: 'merged' }`

### DELETE_THEORY
```sys2dsl
@result old_theory DELETE_THEORY none
```
Deletes a theory from storage using v3 triple syntax.
- Format: `@var TheoryName DELETE_THEORY Object`
- Also unregisters from MetaTheoryRegistry
- Returns: `{ ok: boolean, name, status: 'deleted'|'not_found' }`

### PUSH
```sys2dsl
@result context PUSH any
@result context PUSH what_if_scenario
```
Creates new counterfactual layer using v3 triple syntax.
- Format: `@var Subject PUSH LayerName`
- Snapshots current facts
- Pushes layer onto theory stack
- Returns: `{ ok: boolean, name, depth, snapshotFacts }`

### POP
```sys2dsl
@result context POP any
```
Pops counterfactual layer, restoring previous state using v3 triple syntax.
- Format: `@var Subject POP Object`
- Restores facts from snapshot
- Returns: `{ ok: boolean, popped: string, depth, restoredFacts }`

### RESET_SESSION
```sys2dsl
@result session RESET_SESSION none
```
Clears all session state using v3 triple syntax.
- Format: `@var Subject RESET_SESSION Object`
- Clears layers, snapshots, current theory
- Does not affect persisted knowledge
- Returns: `{ ok: boolean, status: 'session_reset' }`

### THEORY_INFO
```sys2dsl
@info health_rules THEORY_INFO none
```
Gets detailed information about a theory using v3 triple syntax.
- Format: `@var TheoryName THEORY_INFO Object`
- Returns metadata, format, and statistics from MetaTheoryRegistry
- Returns: `{ ok: boolean, name, format, metadata, stats, successRate }`

## Internal State

```javascript
{
  _theoryStack: [],       // Array of { name, pushedAt, factCount }
  _factSnapshots: [],     // Array of fact snapshots for each layer
  _currentTheory: null    // Currently loaded theory name
}
```

## Helper Methods

```javascript
getTheoryDepth(): number          // Current stack depth
isHypothetical(): boolean         // Whether in counterfactual context
getCurrentTheory(): string|null   // Currently loaded theory name
setStorage(storage): void         // Inject storage adapter
setMetaRegistry(registry): void   // Inject meta-registry
```

## Counterfactual Reasoning Flow

```
1. @ctx context PUSH hypothesis
   → Snapshot current facts
   → Create new layer

2. @f1 HypotheticalFact IS_A Something
   → Adds to current (hypothetical) context

3. @result Query ASK "Query about hypothetical?"
   → Reasons with base + hypothetical facts

4. @restore context POP any
   → Discard hypothetical facts
   → Restore to snapshot
```

## Notes/Constraints
- All commands follow strict triple syntax `@var Subject VERB Object`
- Theory layers are in-memory only (not persisted)
- LOAD parses v3 `@var Subject VERB Object` format
- Storage is pluggable - default uses file system
- MetaTheoryRegistry tracks all loads and query successes

# Design Spec: src/theory/dsl_commands_theory.js

ID: DS(/theory/dsl_commands_theory.js)

Class `DSLCommandsTheory`
- **Role**: Implements Sys2DSL commands for theory/context management: listing, loading, saving, merging theories; counterfactual layers (THEORY_PUSH/THEORY_POP); session reset.
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

### LIST_THEORIES
```sys2dsl
@list LIST_THEORIES
```
Lists available and active theories.
- Returns: `{ available: string[], active: string[], current: string|null, depth: number }`

### LOAD_THEORY
```sys2dsl
@result LOAD_THEORY health_rules
@result LOAD_THEORY $theoryName
```
Loads a theory by name from storage.
- Parses ASSERT statements and adds facts to ConceptStore
- Registers theory in MetaTheoryRegistry
- Records load for statistics
- Returns: `{ ok: boolean, name, loaded: number, errors?: string[], status: 'loaded' }`

### SAVE_THEORY
```sys2dsl
@result SAVE_THEORY my_session
@result SAVE_THEORY my_session domain="medical" version="1.0"
```
Saves current facts to storage.
- Supports optional metadata as key=value pairs
- Generates DSL format with `@fNNN ASSERT` statements
- Returns: `{ ok: boolean, name, factCount, conceptCount, timestamp, status: 'saved' }`

### MERGE_THEORY
```sys2dsl
@result MERGE_THEORY additional_rules
```
Merges another theory into current knowledge (additive).
- Does not clear existing facts
- Returns: `{ ok: boolean, name, merged: number, totalFacts: number, status: 'merged' }`

### DELETE_THEORY
```sys2dsl
@result DELETE_THEORY old_theory
```
Deletes a theory from storage.
- Also unregisters from MetaTheoryRegistry
- Returns: `{ ok: boolean, name, status: 'deleted'|'not_found' }`

### THEORY_PUSH
```sys2dsl
@result THEORY_PUSH
@result THEORY_PUSH name="what_if_scenario"
```
Creates new counterfactual layer.
- Snapshots current facts
- Pushes layer onto theory stack
- Returns: `{ ok: boolean, name, depth, snapshotFacts }`

### THEORY_POP
```sys2dsl
@result THEORY_POP
```
Pops counterfactual layer, restoring previous state.
- Restores facts from snapshot
- Returns: `{ ok: boolean, popped: string, depth, restoredFacts }`

### RESET_SESSION
```sys2dsl
@result RESET_SESSION
```
Clears all session state (layers, snapshots, current theory).
- Does not affect persisted knowledge
- Returns: `{ ok: boolean, status: 'session_reset' }`

### THEORY_INFO
```sys2dsl
@info THEORY_INFO health_rules
```
Gets detailed information about a theory.
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
1. THEORY_PUSH "hypothesis"
   → Snapshot current facts
   → Create new layer

2. ASSERT HypotheticalFact IS_A Something
   → Adds to current (hypothetical) context

3. ASK "Query about hypothetical?"
   → Reasons with base + hypothetical facts

4. THEORY_POP
   → Discard hypothetical facts
   → Restore to snapshot
```

## Notes/Constraints
- Theory layers are in-memory only (not persisted)
- LOAD_THEORY only parses `@var ASSERT S R O` format
- Storage is pluggable - default uses file system
- MetaTheoryRegistry tracks all loads and query successes

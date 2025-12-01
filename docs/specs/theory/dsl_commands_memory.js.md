# Design Spec: src/theory/dsl_commands_memory.js

ID: DS(/theory/dsl_commands_memory.js)

Class `DSLCommandsMemory`
- **Role**: Implements Sys2DSL commands for knowledge lifecycle management: fact retraction, usage statistics, forgetting mechanisms, priority boosting, and concept protection.
- **Pattern**: Command handler collection; Delegates to ConceptStore for actual operations.
- **Key Collaborators**: `ConceptStore`, `DSLParser`.

See also: DS(/knowledge/usage_tracking), DS(/knowledge/forgetting)

## Constructor Dependencies
```javascript
constructor({ conceptStore, parser })
```

## Commands Implemented

### RETRACT
```sys2dsl
@result RETRACT Dog IS_A mammal
@result RETRACT $subject $relation $object
```
Removes a fact from the knowledge base.
- Matches exact subject/relation/object
- Returns: `{ ok: boolean, removed: number, subject, relation, object }`

### GET_USAGE
```sys2dsl
@stats GET_USAGE Dog
```
Queries usage statistics for a concept.
- Returns usage stats from ConceptStore or error if not found
- Stats include: accessCount, lastAccessed, priority, protected status

### FORGET
```sys2dsl
# Forget by usage threshold
@result FORGET threshold=5

# Forget concepts older than X days
@result FORGET olderThan=30d

# Forget specific concept
@result FORGET concept=OldConcept

# Forget by pattern
@result FORGET pattern=temp_*

# Preview without deletion
@result FORGET threshold=5 dryRun
```
Removes concepts based on criteria.

**Criteria Options:**
- `threshold=N` - Forget concepts with usage count < N
- `olderThan=Xd` - Forget concepts not accessed in X days
- `concept=label` - Forget specific concept
- `pattern=pat` - Forget concepts matching pattern
- `dryRun` - Preview without actual deletion

Returns: `{ removed: [...], count, dryRun }`

### BOOST
```sys2dsl
@result BOOST Dog
@result BOOST ImportantConcept 50
```
Increases usage count for a concept.
- First arg: concept label
- Optional second arg: amount (default: 10)
- Makes concept less likely to be forgotten during cleanup
- Returns: `{ ok: true, label, amount }`

### PROTECT
```sys2dsl
@result PROTECT CoreConcept
```
Marks concept as protected from forgetting.
- Protected concepts are never removed by FORGET operations
- Returns: `{ ok: true, label, protected: true }`

### UNPROTECT
```sys2dsl
@result UNPROTECT CoreConcept
```
Removes protection from a concept.
- Concept becomes eligible for forgetting again
- Returns: `{ ok: true, label, protected: false }`

## Usage Examples

### Cleanup Low-Usage Concepts
```sys2dsl
# First preview what would be forgotten
@preview FORGET threshold=3 dryRun

# Actually forget
@result FORGET threshold=3
```

### Protect Important Concepts
```sys2dsl
# Protect core ontology concepts
@_ PROTECT Animal
@_ PROTECT Person
@_ PROTECT Location

# Boost frequently used concepts
@_ BOOST Dog 100
```

### Retract Incorrect Facts
```sys2dsl
# Retract specific fact
@removed RETRACT Whale IS_A Fish

# Assert correct fact
@added ASSERT Whale IS_A Mammal
```

## Integration with ConceptStore

These commands delegate to ConceptStore methods:
- `RETRACT` → `removeFact(id)`
- `GET_USAGE` → `getUsageStats(label)`
- `FORGET` → `forget(criteria)`
- `BOOST` → `boostUsage(label, amount)`
- `PROTECT` → `protect(label)`
- `UNPROTECT` → `unprotect(label)`

## Notes/Constraints
- RETRACT only removes exact matches (no pattern matching)
- FORGET respects protected concepts even with pattern matching
- Usage statistics persist across sessions (stored with concepts)
- BOOST is additive - multiple boosts accumulate
- Protection is binary - no protection levels

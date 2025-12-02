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
@result Dog RETRACT mammal
@result $subject RETRACT $object
```
Removes a fact from the knowledge base using v3 triple syntax.
- Format: `@var Subject RETRACT Object`
- Note: Relation is inferred from context or can be specified via extended syntax
- Matches exact subject/relation/object
- Returns: `{ ok: boolean, removed: number, subject, relation, object }`

### GET_USAGE
```sys2dsl
@stats Dog GET_USAGE none
```
Queries usage statistics for a concept using v3 triple syntax.
- Format: `@var ConceptName GET_USAGE Object`
- Returns usage stats from ConceptStore or error if not found
- Stats include: accessCount, lastAccessed, priority, protected status

### FORGET
```sys2dsl
# Forget by usage threshold
@result criteria FORGET threshold_5

# Forget concepts older than X days
@result criteria FORGET olderThan_30d

# Forget specific concept
@result OldConcept FORGET none

# Forget by pattern
@result pattern FORGET temp_*

# Preview without deletion
@result criteria FORGET threshold_5_dryRun
```
Removes concepts based on criteria using v3 triple syntax.
- Format: `@var Subject FORGET Criteria`

**Criteria Options (underscore notation):**
- `threshold_N` - Forget concepts with usage count < N
- `olderThan_Xd` - Forget concepts not accessed in X days
- `none` - Forget specific concept (when Subject is concept name)
- `pattern_*` - Pattern as object
- `dryRun` suffix - Preview without actual deletion

Returns: `{ removed: [...], count, dryRun }`

### BOOST
```sys2dsl
@result Dog BOOST none
@result ImportantConcept BOOST amount_50
```
Increases usage count for a concept using v3 triple syntax.
- Format: `@var ConceptName BOOST Amount`
- Amount: `none` (default 10) or `amount_N` for specific value
- Makes concept less likely to be forgotten during cleanup
- Returns: `{ ok: true, label, amount }`

### PROTECT
```sys2dsl
@result CoreConcept PROTECT none
```
Marks concept as protected from forgetting using v3 triple syntax.
- Format: `@var ConceptName PROTECT Object`
- Protected concepts are never removed by FORGET operations
- Returns: `{ ok: true, label, protected: true }`

### UNPROTECT
```sys2dsl
@result CoreConcept UNPROTECT none
```
Removes protection from a concept using v3 triple syntax.
- Format: `@var ConceptName UNPROTECT Object`
- Concept becomes eligible for forgetting again
- Returns: `{ ok: true, label, protected: false }`

## Usage Examples

### Cleanup Low-Usage Concepts
```sys2dsl
# First preview what would be forgotten
@preview criteria FORGET threshold_3_dryRun

# Actually forget
@result criteria FORGET threshold_3
```

### Protect Important Concepts
```sys2dsl
# Protect core ontology concepts
@r1 Animal PROTECT none
@r2 Person PROTECT none
@r3 Location PROTECT none

# Boost frequently used concepts
@r4 Dog BOOST amount_100
```

### Retract Incorrect Facts
```sys2dsl
# Retract specific fact
@removed Whale RETRACT Fish

# Assert correct fact
@added Whale IS_A Mammal
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
- All commands follow strict triple syntax `@var Subject VERB Object`
- RETRACT only removes exact matches (no pattern matching)
- FORGET respects protected concepts even with pattern matching
- Usage statistics persist across sessions (stored with concepts)
- BOOST is additive - multiple boosts accumulate
- Protection is binary - no protection levels

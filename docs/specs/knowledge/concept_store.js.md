# Design Spec: src/knowledge/concept_store.js

ID: DS(/knowledge/concept_store.js)

Status: IMPLEMENTED v3.0 (with Existence Tracking)

Class `ConceptStore`
- **Role**: Central repository for concepts, facts, and usage tracking. Manages concept storage with `BoundedDiamond` clusters, fact triple storage with indexing, usage metrics for priority-based reasoning, and forgetting mechanisms for memory management.
- **Pattern**: Repository with Observer. SOLID: single responsibility for knowledge persistence and lifecycle.
- **Key Collaborators**: `BoundedDiamond`, `AuditLog`, `StorageAdapter`, `Config`.

See also: DS(/knowledge/usage_tracking.md), DS(/knowledge/forgetting.md)

---

## 1. Constructor

```javascript
constructor(deps)
```

**Parameters:**
- `deps.dimensions` (number, required) - Vector dimension count
- `deps.config` (Object, optional) - Configuration object
- `deps.storage` (StorageAdapter, optional) - Persistence adapter
- `deps.audit` (AuditLog, optional) - Audit logging

**Legacy support:** Also accepts `constructor(dimensions)` as number directly.

**Internal State:**
```javascript
{
  dimensions: number,
  config: Object,
  storage: StorageAdapter | null,
  audit: AuditLog | null,
  _concepts: Map<label, ConceptEntry>,
  _facts: Array<Fact>,
  _factIndex: Map<subject, number[]>,
  _existenceIndex: Map<subject, { entries: Array<{factId, existence}> }>,  // v3.0
  _usageMetrics: Map<label, UsageMetrics>,
  _factUsage: Map<factId, UsageMetrics>,
  _relationUsage: Map<relation, UsageMetrics>,
  _protected: Set<label>,
  EXISTENCE: { IMPOSSIBLE: -127, UNPROVEN: -64, POSSIBLE: 0, DEMONSTRATED: 64, CERTAIN: 127 }  // v3.0
}
```

---

## 2. Concept Management API

### ensureConcept(label)
```javascript
ensureConcept(label: string): ConceptEntry
```
Creates concept if it doesn't exist, initializes with empty diamond.
- Returns existing or newly created concept entry
- Initializes usage metrics for new concepts

### getConcept(label)
```javascript
getConcept(label: string): ConceptEntry | null
```
Retrieves concept by label.
- Records usage as 'query' type
- Returns null if not found

### upsertConcept(id, label, diamonds)
```javascript
upsertConcept(id: string, label: string, diamonds: BoundedDiamond[]): ConceptEntry
```
Creates or updates concept with new diamond set.
- Records usage as 'assert' type
- Logs to audit if configured

### addObservation(conceptId, vector)
```javascript
addObservation(conceptId: string, vector: Int8Array): void
```
Adds observation to concept for learning/clustering.
- Expands first diamond to include observation
- Records usage as 'inference' type
- TODO: Integrate with ClusterManager for proper split/merge

### listConcepts()
```javascript
listConcepts(): string[]
```
Returns array of all concept labels.

### snapshot(conceptId)
```javascript
snapshot(conceptId: string): ConceptSnapshot | null
```
Creates immutable snapshot of concept state.

**Returns:**
```javascript
{
  id: string,
  label: string,
  diamonds: Array<{
    center: number[],
    l1Radius: number,
    minValues: number[],
    maxValues: number[]
  }>,
  usage: UsageStats,
  timestamp: ISO8601
}
```

---

## 3. Fact Management API

### addFact(triple, options)
```javascript
addFact(
  triple: { subject: string, relation: string, object: string },
  options?: { existence?: number }
): number
```
Adds fact triple to store with optional existence level.
- `options.existence` - Existence level (-127 to 127), defaults to CERTAIN (127)
- Returns fact ID (index)
- **Version unification**: If a higher existence version exists, skips adding duplicate
- **Existence upgrade**: If lower existence exists, upgrades it to new level
- Indexes by subject and existence for fast lookup
- Records usage for subject and object concepts
- Records relation usage
- Logs to audit with existence level

### removeFact(factId)
```javascript
removeFact(factId: number): boolean
```
Soft-deletes fact by ID.
- Marks as `_deleted: true` for audit trail
- Removes from subject index
- Returns true if removed, false if not found

### getFacts()
```javascript
getFacts(): Array<{ subject: string, relation: string, object: string }>
```
Returns all non-deleted facts.
- Excludes internal `_id` and `_deleted` fields

### getFactsBySubject(subject)
```javascript
getFactsBySubject(subject: string): Fact[]
```
Returns facts where subject matches.
- Uses index for O(1) lookup
- Excludes deleted facts

### snapshotFacts()
```javascript
snapshotFacts(): Array<{ subject: string, relation: string, object: string }>
```
Creates deep copy of all facts for counterfactual reasoning.
- Used by PUSH to save state before hypothetical changes

### restoreFacts(snapshot)
```javascript
restoreFacts(snapshot: Fact[]): void
```
Replaces all facts with snapshot contents.
- Clears existing facts, subject index, and existence index
- Re-adds each fact from snapshot with preserved existence levels
- Rebuilds existence index for fast lookup
- Used by POP to revert to previous state
- Logs to audit

---

## 4. Existence Tracking API (v3.0)

Implements epistemic status tracking per DS(/knowledge/dimensions) Existence dimension.

### getBestExistenceFact(subject, relation, object)
```javascript
getBestExistenceFact(
  subject: string,
  relation: string,
  object?: string
): Fact | null
```
Returns the fact with highest existence level for a triple.
- Used for version unification (higher existence wins)
- If `object` is omitted, returns best existence for any object with that subject/relation

### getFactsByExistence(minExistence)
```javascript
getFactsByExistence(minExistence: number): Fact[]
```
Returns all facts with existence >= minExistence.
- Use `store.EXISTENCE.CERTAIN` for axioms only
- Use `store.EXISTENCE.DEMONSTRATED` for proven facts

### getFactsWithExistence(subject)
```javascript
getFactsWithExistence(subject: string): Fact[]
```
Returns facts for subject sorted by existence (highest first).
- Uses existence index for O(1) "best existence" lookup
- Excludes deleted facts

### getFactsBySubjectAndRelation(subject, relation, minExistence)
```javascript
getFactsBySubjectAndRelation(
  subject: string,
  relation: string,
  minExistence?: number
): Fact[]
```
Returns facts filtered by subject, relation, and optional existence threshold.

### upgradeExistence(factId, newExistence)
```javascript
upgradeExistence(factId: number, newExistence: number): boolean
```
Upgrades a fact to higher existence level.
- Returns false if current existence >= newExistence (no downgrade)
- Updates existence index to maintain sort order
- Logs to audit

---

## 5. Usage Tracking API

Implements DS(/knowledge/usage_tracking) for priority-based reasoning and forgetting.

### getUsageStats(label)
```javascript
getUsageStats(label: string): UsageStats | null
```
Returns computed usage statistics for concept.

**Returns:**
```javascript
{
  usageCount: number,      // Total uses
  assertCount: number,     // Times asserted
  queryCount: number,      // Times queried
  inferenceCount: number,  // Times used in inference
  createdAt: ISO8601,
  lastUsedAt: ISO8601,
  recency: number,         // 0-1, decays over 30 days
  frequency: number,       // 0-1, log scale normalized
  priority: number         // 0-1, combined: recency*0.4 + frequency*0.6
}
```

### getConceptsByUsage(options)
```javascript
getConceptsByUsage(options?: {
  limit?: number,          // Default: 10
  order?: 'priority' | 'frequency' | 'recency' | 'usageCount'  // Default: 'priority'
}): Array<{ label: string, ...UsageStats }>
```
Returns concepts sorted by usage metric.
- Used for prioritizing reasoning candidates

### boostUsage(label, amount)
```javascript
boostUsage(label: string, amount?: number): void
```
Manually increases usage count (default: 10).
- Used by BOOST command for prioritization
- Updates lastUsedAt
- Logs to audit

---

## 5. Forgetting API

Implements DS(/knowledge/forgetting) for memory management.

### protect(label)
```javascript
protect(label: string): void
```
Marks concept as protected from forgetting.
- Logs to audit

### unprotect(label)
```javascript
unprotect(label: string): void
```
Removes protection from concept.
- Logs to audit

### isProtected(label)
```javascript
isProtected(label: string): boolean
```
Checks if concept is protected.

### listProtected()
```javascript
listProtected(): string[]
```
Returns array of protected concept labels.

### forget(criteria)
```javascript
forget(criteria?: {
  threshold?: number,      // Forget if usageCount < threshold
  olderThan?: string,      // Forget if not used within period (e.g., "7d", "30d")
  concept?: string,        // Forget specific concept
  pattern?: string,        // Forget matching pattern (e.g., "temp_*")
  dryRun?: boolean         // Preview only, don't delete (default: false)
}): ForgetResult
```
Removes concepts based on criteria.

**Returns:**
```javascript
{
  removed: string[],       // Labels actually removed (empty if dryRun)
  wouldRemove?: string[],  // Labels that would be removed (if dryRun)
  count: number,           // Number of concepts to remove
  protected: string[],     // Labels skipped due to protection
  skipped: number          // Count of protected concepts
}
```

**Behavior:**
- Protected concepts are never removed
- Associated facts are soft-deleted when concept is forgotten
- Logs to audit with criteria used

**Time format for `olderThan`:**
- `"7d"` - 7 days
- `"24h"` - 24 hours
- `"30m"` - 30 minutes

---

## 6. Data Structures

### ConceptEntry
```javascript
{
  label: string,
  diamonds: BoundedDiamond[]
}
```

### Fact (internal)
```javascript
{
  subject: string,
  relation: string,
  object: string,
  _id: number,
  _existence: number,     // v3.0: Existence level (-127 to 127)
  _deleted?: boolean
}
```

### UsageMetrics (internal)
```javascript
{
  usageCount: number,
  assertCount: number,
  queryCount: number,
  inferenceCount: number,
  createdAt: ISO8601,
  lastUsedAt: ISO8601
}
```

---

## 7. Usage Examples

### Basic Concept Operations
```javascript
const store = new ConceptStore({ dimensions: 512 });

// Create concept
store.ensureConcept('Dog');

// Add facts
store.addFact({ subject: 'Dog', relation: 'IS_A', object: 'Animal' });
store.addFact({ subject: 'Dog', relation: 'HAS_PROPERTY', object: 'loyal' });

// Query
const facts = store.getFactsBySubject('Dog');
// → [{ subject: 'Dog', relation: 'IS_A', object: 'Animal' }, ...]
```

### Existence-Aware Facts (v3.0)
```javascript
// Add facts with different existence levels
store.addFact(
  { subject: 'Dog', relation: 'IS_A', object: 'Animal' },
  { existence: store.EXISTENCE.CERTAIN }  // Axiom
);

store.addFact(
  { subject: 'Unicorn', relation: 'IS_A', object: 'Horse' },
  { existence: store.EXISTENCE.POSSIBLE }  // Hypothetical
);

// Query facts by existence level
const axioms = store.getFactsByExistence(store.EXISTENCE.CERTAIN);
const allKnown = store.getFactsByExistence(store.EXISTENCE.POSSIBLE);

// Get best existence for a triple
const best = store.getBestExistenceFact('Dog', 'IS_A', 'Animal');
console.log(best._existence);  // → 127 (CERTAIN)

// Version unification: higher existence wins
store.addFact(
  { subject: 'Dog', relation: 'IS_A', object: 'Animal' },
  { existence: store.EXISTENCE.POSSIBLE }  // Ignored - CERTAIN already exists
);
```

### Counterfactual Reasoning
```javascript
// Save state before hypothetical
const snapshot = store.snapshotFacts();

// Add hypothetical facts
store.addFact({ subject: 'Dog', relation: 'CAN', object: 'fly' });

// Reason with hypothetical...
const result = reasoner.query('Can Dog fly?');

// Restore original state
store.restoreFacts(snapshot);
```

### Usage-Based Prioritization
```javascript
// Get most important concepts
const top = store.getConceptsByUsage({ limit: 5, order: 'priority' });

// Boost important concept
store.boostUsage('CoreOntologyTerm', 100);

// Protect from forgetting
store.protect('Entity');
store.protect('Animal');
```

### Memory Cleanup
```javascript
// Preview what would be forgotten
const preview = store.forget({ threshold: 3, dryRun: true });
console.log(`Would remove ${preview.count} concepts`);

// Actually forget low-usage concepts
const result = store.forget({ threshold: 3 });
console.log(`Removed: ${result.removed.join(', ')}`);

// Forget old unused concepts
store.forget({ olderThan: '30d' });
```

---

## 8. Audit Events

When `audit` is provided, these events are logged:
- `fact_added` - `{ factId, triple }`
- `fact_removed` - `{ factId, triple }`
- `facts_restored` - `{ count }`
- `usage_boosted` - `{ label, amount }`
- `concept_protected` - `{ label }`
- `concept_unprotected` - `{ label }`
- `concepts_forgotten` - `{ labels, count, criteria }`

---

## 9. Notes/Constraints

- **Soft delete**: Facts are marked `_deleted: true` rather than removed, preserving audit trail
- **No direct LSH**: Expose vectors to `Retriever` for indexing, don't implement LSH here
- **Deterministic updates**: All operations are logged for reproducibility
- **Persistence deferred**: ConceptStore defers all IO to `StorageAdapter` when provided
- **Thread safety**: Single-threaded design; external synchronization needed for concurrent access

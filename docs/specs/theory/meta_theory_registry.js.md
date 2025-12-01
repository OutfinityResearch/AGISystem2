# Design Spec: src/theory/meta_theory_registry.js

ID: DS(/theory/meta_theory_registry.js)

Implements: **FS-17** (Theory Registry and Statistics)

Class `MetaTheoryRegistry`
- **Role**: Maintains a registry of available theories with metadata, dependencies, applicability rules, and usage statistics. This is the "theory about theories" - enables theory suggestion, success tracking, and reasoning method optimization.
- **Pattern**: Singleton with persistence; Registry pattern with statistics tracking.
- **Key Collaborators**: `TheoryStorage`, `DSLCommandsTheory`, `System2Session`.

## Public API

### Constructor
```javascript
constructor(options = {})
```
- `options.registryPath` - Path to registry JSON file (default: `data/init/meta_registry.json`)
- `options.storage` - Storage adapter for persistence

### Theory Registration
```javascript
registerTheory(meta: TheoryMeta): TheoryMeta
```
Registers or updates a theory with metadata:
- `meta.id` (required) - Unique theory identifier
- `meta.name` - Human-readable name
- `meta.description` - Description
- `meta.domain` - Domain (ontology, axiology, medical, legal, etc.)
- `meta.version` - Version string
- `meta.priority` - Priority (higher = applied later)
- `meta.dependencies` - IDs of required theories
- `meta.preferredMethods` - Preferred reasoning methods
- `meta.applicability` - When this theory applies

```javascript
unregisterTheory(theoryId: string): boolean
```
Removes a theory from the registry.

### Theory Query
```javascript
getTheory(theoryId: string): TheoryMeta | null
listTheories(filter?: { domain?: string }): TheoryMeta[]
```
- `listTheories` returns sorted by priority (higher first)

### Usage Statistics
```javascript
recordLoad(theoryId: string): void
recordQueryResult(theoryId: string, success: boolean, method?: string): void
getSuccessRate(theoryId: string): number  // 0-1
clearStats(): void
```

### Reasoning Method Statistics
```javascript
getPreferredReasoningMethods(): string[]  // Sorted by success rate
getReasoningStats(): { [method]: { success, total, rate } }
```

### Theory Suggestion
```javascript
suggestTheories(context: { domain?, concepts? }): ScoredTheory[]
```
Returns theories ranked by combined score:
- Base priority
- Domain match (+10)
- Success rate boost (+5 * rate)
- Frequency boost (+2 if queryCount > 10)

### Static Methods
```javascript
MetaTheoryRegistry.getShared(options?): MetaTheoryRegistry
MetaTheoryRegistry.resetShared(): void
```

## Data Structures

### TheoryMeta
```javascript
{
  id: string,
  name: string,
  description: string,
  domain: string,         // 'general', 'medical', 'legal', etc.
  version: string,
  priority: number,       // Higher = applied later in stack
  dependencies: string[], // IDs of required theories
  preferredMethods: string[], // ['deduction', 'abduction', ...]
  applicability: Object,  // Domain-specific rules
  stats: {
    loadCount: number,
    queryCount: number,
    successCount: number,
    lastUsed: ISO8601 | null
  },
  registeredAt: ISO8601
}
```

### Persisted Registry Format
```json
{
  "version": 1,
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "theories": [...],
  "reasoningStats": {
    "deduction": { "success": 45, "total": 50 },
    "abduction": { "success": 30, "total": 40 }
  }
}
```

## Usage Examples

### Register Theory on Load
```javascript
const registry = MetaTheoryRegistry.getShared();
registry.registerTheory({
  id: 'health_compliance',
  name: 'Health Compliance Rules',
  domain: 'medical',
  version: '1.0',
  priority: 10,
  dependencies: ['ontology_base', 'axiology_base'],
  preferredMethods: ['deduction', 'default']
});
registry.recordLoad('health_compliance');
```

### Track Query Success
```javascript
const result = session.ask('Patient REQUIRES MedicalConsent?');
registry.recordQueryResult('health_compliance', result.truth === 'TRUE_CERTAIN', 'deduction');
```

### Suggest Theories for Context
```javascript
const suggestions = registry.suggestTheories({ domain: 'medical' });
// Returns theories sorted by relevance score
for (const s of suggestions.slice(0, 3)) {
  console.log(`${s.theory.id}: score=${s.score}, successRate=${s.successRate}`);
}
```

### Optimize Reasoning Order
```javascript
const preferredMethods = registry.getPreferredReasoningMethods();
// Returns methods sorted by historical success rate
// Use for inference engine method ordering
```

## Persistence

- Registry auto-loads from `data/init/meta_registry.json` on construction
- Auto-saves on every mutation (register, recordLoad, recordQueryResult, etc.)
- Graceful degradation: works without persistence file
- Directory created automatically if missing

## Notes/Constraints
- Statistics merge on re-registration (preserves existing stats)
- Success rate requires minimum 5 uses to be meaningful
- Thread-safe for single-process use (writes are synchronous)
- Registry is lightweight - designed for frequent reads

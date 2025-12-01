# Design Spec: src/theory/theory_storage.js

ID: DS(/theory/theory_storage.js)

Class `TheoryStorage`
- **Role**: Pluggable storage interface for theories with multiple format support. Provides abstraction over storage backends (file system, memory, database) and handles both DSL and JSON theory formats.
- **Pattern**: Facade over pluggable adapters; Strategy pattern for storage backends.
- **Key Collaborators**: `DSLCommandsTheory`, `TheoryDSLEngine`, `MetaTheoryRegistry`.

## Public API

### Constructor
```javascript
constructor(options = {})
```
- `options.adapter` - Custom storage adapter instance
- `options.theoriesDir` - Directory for file adapter (default: `data/theories`)

### Theory Operations
```javascript
listTheories(): string[]
theoryExists(theoryId: string): boolean
loadTheory(theoryId: string): TheoryData | null
loadTheoryLines(theoryId: string): string[] | null  // For DSL execution
saveTheory(theoryId: string, content: string|string[], metadata?: Object): boolean
saveTheoryFacts(theoryId: string, facts: Fact[], metadata?: Object): boolean
deleteTheory(theoryId: string): boolean
```

### Data Structures

#### TheoryData
```javascript
{
  content: string | Fact[],  // DSL text or facts array
  format: 'dsl' | 'json',
  metadata: {
    name?: string,
    domain?: string,
    version?: string,
    // ... custom fields
  }
}
```

## Storage Adapters

### FileStorageAdapter (default)
```javascript
class FileStorageAdapter {
  constructor({ theoriesDir })
  list(): string[]
  exists(theoryId): boolean
  load(theoryId): TheoryData | null
  save(theoryId, data): boolean
  delete(theoryId): boolean
}
```

**File Formats Supported:**
- `.sys2dsl` - DSL text format with metadata header
- `.theory.json` - JSON format with structured facts

**DSL Metadata Header:**
```
# =============================================================================
# Theory Name
# =============================================================================
# @domain: medical
# @version: 1.0
# @author: System
# =============================================================================

@f001 ASSERT Patient IS_A Person
```

**JSON Format:**
```json
{
  "id": "health_rules",
  "metadata": {
    "name": "Health Rules",
    "domain": "medical"
  },
  "facts": [
    { "subject": "Patient", "relation": "IS_A", "object": "Person" }
  ],
  "savedAt": "2024-01-15T10:30:00.000Z"
}
```

### MemoryStorageAdapter (for testing)
```javascript
class MemoryStorageAdapter {
  constructor()
  list(): string[]
  exists(theoryId): boolean
  load(theoryId): TheoryData | null
  save(theoryId, data): boolean
  delete(theoryId): boolean
  clear(): void  // Clear all theories
}
```

## Usage Examples

### Basic File Storage
```javascript
const storage = new TheoryStorage();

// List available theories
const theories = storage.listTheories();
// → ['health_rules', 'ontology_base', ...]

// Load theory for execution
const lines = storage.loadTheoryLines('health_rules');
for (const line of lines) {
  engine.executeLine(line);
}
```

### Save Current Session
```javascript
const facts = conceptStore.getFacts();
const lines = facts.map((f, i) =>
  `@f${String(i+1).padStart(3,'0')} ASSERT ${f.subject} ${f.relation} ${f.object}`
);

storage.saveTheory('my_session', lines.join('\n'), {
  name: 'My Session',
  domain: 'custom',
  savedAt: new Date().toISOString()
});
```

### Custom Adapter (Database)
```javascript
class DatabaseAdapter {
  constructor(dbConnection) {
    this.db = dbConnection;
  }

  list() {
    return this.db.query('SELECT id FROM theories');
  }

  load(theoryId) {
    const row = this.db.query('SELECT * FROM theories WHERE id = ?', theoryId);
    return row ? { content: row.content, format: row.format, metadata: row.metadata } : null;
  }

  // ... other methods
}

const storage = new TheoryStorage({
  adapter: new DatabaseAdapter(myDbConnection)
});
```

### In-Memory Testing
```javascript
const memAdapter = new TheoryStorage.MemoryStorageAdapter();
const storage = new TheoryStorage({ adapter: memAdapter });

storage.saveTheory('test', '@f1 ASSERT X IS_A Y');
// ... run tests ...
memAdapter.clear();
```

## Format Conversion

### DSL → Executable Lines
```javascript
loadTheoryLines(theoryId) {
  const data = load(theoryId);
  if (data.format === 'dsl') {
    return data.content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  }
  if (data.format === 'json') {
    // Convert facts to ASSERT statements
    return data.content.map((f, i) =>
      `@f${String(i+1).padStart(3,'0')} ASSERT ${f.subject} ${f.relation} ${f.object}`
    );
  }
}
```

## Notes/Constraints
- Theory IDs should be filesystem-safe (alphanumeric, underscore, hyphen)
- DSL format preferred for human-editable theories
- JSON format preferred for programmatic storage
- Directories created automatically if missing
- Metadata preserved on save/load cycle
- Both formats can coexist; DSL takes precedence if both exist

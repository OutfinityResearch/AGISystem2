# DS: theory/theory_preloader.js

## Purpose
Fast loading of base theories (ontology and axiology) at system initialization with caching support.

## Module Info
- **Path**: `src/theory/theory_preloader.js`
- **Implements**: FS-16 (Base Theory Preloading)
- **Dependencies**: `fs`, `path`

## Class: TheoryPreloader

### Constructor
```javascript
new TheoryPreloader({
  conceptStore,    // ConceptStore instance to add facts to
  theoriesPath,    // Optional: custom path to theories directory
})
```

### Key Methods

#### loadBaseTheories()
Loads ontology_base and axiology_base theories synchronously.

```javascript
const result = preloader.loadBaseTheories();
// Returns: { loaded: 156, cached: true, theories: ['ontology_base', 'axiology_base'] }
```

- Uses JSON cache when available (file mtime comparison)
- First load parses DSL and creates cache
- Cache loading is ~10x faster than DSL parsing

#### loadTheory(theoryName)
Load a single theory by name (without extension).

```javascript
preloader.loadTheory('ontology_base');
// Returns: { loaded: 93, cached: false }
```

#### rebuildCaches()
Force rebuild all caches from DSL sources.

```javascript
preloader.rebuildCaches();
// Returns: { rebuilt: ['ontology_base', 'axiology_base'] }
```

#### getStats()
Get information about available theories and cache status.

```javascript
preloader.getStats();
// Returns: { theoriesPath, cachePath, theories: [...] }
```

## File Locations

### DSL Source Files
- `data/init/theories/base/ontology_base.sys2dsl` - 93 foundational ontology facts
- `data/init/theories/base/axiology_base.sys2dsl` - 63 foundational axiology facts

### Cache Files
- `data/init/cache/ontology_base.cache.json`
- `data/init/cache/axiology_base.cache.json`

Cache format:
```json
{
  "version": 1,
  "source": "/path/to/source.sys2dsl",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "factCount": 93,
  "facts": [
    { "subject": "entity", "relation": "IS_A", "object": "thing" },
    ...
  ]
}
```

## Integration with System2Session

TheoryPreloader is called from System2Session constructor:

```javascript
// In system2_session.js
constructor({ loadBaseTheories = true, skipPreload = false } = {}) {
  if (loadBaseTheories && !skipPreload) {
    this._loadBaseTheories();  // Uses TheoryPreloader
  }
}
```

Options:
- `loadBaseTheories: false` - Don't load base theories
- `skipPreload: true` - Skip all preloading (for isolated tests)

## Performance

| Operation | Time |
|-----------|------|
| Cold load (DSL parsing) | ~5-10ms |
| Cached load (JSON) | ~0.5ms |
| Facts loaded | 156 |

## Invariants

1. Cache is only used if mtime(cache) > mtime(source)
2. DSL parsing tolerates comments and blank lines
3. Only ASSERT statements are processed
4. Duplicate facts are silently skipped
5. Cache write failure is non-fatal

## Testing

```javascript
// Test with skipPreload to avoid base theory interference
const session = agent.createSession({ skipPreload: true });

// Verify base theories loaded
const stats = session.getPreloadStats();
expect(stats.loaded).toBeGreaterThan(100);
```

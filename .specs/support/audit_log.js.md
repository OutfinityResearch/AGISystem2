# Design Spec: src/support/audit_log.js

Class `AuditLog`
- **Role**: Append-only logging of config snapshots, theory changes, ingestions, clustering decisions, translator versions, and validation runs for traceability.
- **Pattern**: Logger with pluggable sinks (file/console/custom). SOLID: single responsibility for audit persistence.
- **Key Collaborators**: All orchestrators (`EngineAPI`, `TheoryStack`, `ConceptStore`, `TranslatorBridge`, `ValidationEngine`), `Config`.

## Public API
- `constructor({sink, config})`
- `record(eventType, payload)`: append entry with timestamp, config hash, event data.
- `withContext(contextInfo)`: returns helper to include context in subsequent calls.
- `snapshot()`: retrieve recent entries (for testing); not for production streaming.
- Should log strategy selections (index/persistence) and seeds at startup for reproducibility.

## Pseudocode (comments)
```js
class AuditLog {
  constructor({sink, config}) {
    // this.sink = sink; this.configHash = hash(config.snapshot());
  }

  record(type, payload) {
    // entry = {ts: now(), type, configHash, payload}
    // sink.write(entry)
  }

  withContext(ctx) {
    // return (type, payload) => record(type, {...payload, ctx})
  }

  snapshot(limit=100) {
    // return in-memory buffer if enabled (for tests)
  }
}
```

## Notes/Constraints
- Must be append-only and deterministic (ordering preserved).
- Keep sink pluggable; default in-memory for tests, file/stream for prod.
- Avoid heavy formatting; store structured JSON-ready objects.***

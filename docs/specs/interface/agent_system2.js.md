# Design Spec: src/interface/agent_system2.js

ID: DS(/interface/agent_system2.js)

Class `AgentSystem2`
- **Role**: Top-level entry point for host applications. Owns global configuration and factory logic for creating `System2Session` instances. It is the only class that callers instantiate directly in order to talk to AGISystem2.
- **Pattern**: Application façade + session factory. SOLID: single responsibility for configuration and session lifecycle; all reasoning and data management are delegated to sessions and core engine modules.
- **Key Collaborators**: `Config`, `EngineAPI`, `System2Session`, `TranslatorBridge`, `AuditLog`, `StorageAdapter`.

## Public API
- `constructor({ profile, configPath, overrides } = {})`
  - Loads a `Config` instance using the given profile/config file/overrides.
  - Prepares shared infrastructure such as storage root and audit log base directory.
- `createSession({ baseTheoryFile, id } = {}) -> System2Session`
  - Constructs a new `EngineAPI` wired with the shared `Config`, `TranslatorBridge`, `StorageAdapter`, and other core modules.
  - Creates a new `System2Session` bound to that `EngineAPI`.
  - If `baseTheoryFile` is provided, loads the corresponding Sys2DSL theory programme (text) and applies it as the initial session theory.
  - Ensures that each session starts with its own fresh theory overlay (even if it is seeded from a shared base file), so that user edits remain session-local until explicitly persisted.
- `listTheories()`
  - Returns metadata about available Sys2DSL theory files (names/paths, basic info) discoverable under the configured storage root.
- `close()`
  - Optional clean-up hook; flushes audit logs and closes any open resources if needed.

## Pseudocode (comments)
```js
class AgentSystem2 {
  constructor({ profile, configPath, overrides } = {}) {
    // this.config = new Config().load({ profile, ...overrides, configPath });
    // this.audit = new AuditLog({ sink: 'file', config: this.config });
    // this.storage = new StorageAdapter({ config: this.config, audit: this.audit });
    // this.translator = new TranslatorBridge({ config: this.config, audit: this.audit });
  }

  createSession({ baseTheoryFile, id } = {}) {
    // engine = new EngineAPI({ config: this.config, audit: this.audit, storage: this.storage, translator: this.translator });
    // session = new System2Session({ id, engine, baseTheoryFile });
    // return session;
  }

  listTheories() {
    // scan storageRoot/theories (Sys2DSL files); return metadata only
  }
}
```

## Notes/Constraints
- All user-visible operations (fact creation, queries, theory editing) must flow through a `System2Session` obtained from `AgentSystem2`; direct access to `EngineAPI`, `ConceptStore`, or `Reasoner` from application code is forbidden by design.
- `AgentSystem2` is responsible for applying environment-level policies (profiles, paths, logging) but must not cache per-session state; sessions are independent and may be created/destroyed freely.
- Multiple sessions may coexist; they can share the same persisted theories and concept data via `StorageAdapter`, but each has its own active theory overlay that only becomes globally visible when explicitly saved or merged into an external theory file.***


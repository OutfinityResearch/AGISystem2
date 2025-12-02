# Design Spec: src/interface/system2_session.js

ID: DS(/interface/system2_session.js)

Class `System2Session`
- **Role**: Session-scoped API and Sys2DSL host. Mediates all interactions between callers and the core engine: creating facts, posing queries, importing and editing theories, controlling masks, and exporting the resulting theory as a text file.
- **Pattern**: Session façade. SOLID: single responsibility for one conversational/agentic context; delegates heavy lifting to `EngineAPI` and the Sys2DSL interpreter.
- **Key Collaborators**: `EngineAPI`, `TheoryDSLEngine` (Sys2DSL), `Config`, `AuditLog`, `TranslatorBridge`.

## Sys2Session Command Model
- Callers interact with a `System2Session` primarily by sending it one or more **Sys2DSL lines** of the form:
  - `@varName Subject VERB Object`
- Semantics:
  - `@varName` declares the name under which the result of this command is stored in the session environment.
  - `Subject` is the first element in the triple (concept or entity).
  - `VERB` is the relation/action drawn from the Sys2DSL verb set (for example `IS_A`, `HAS`, `CAUSES`, `ABDUCT`, etc.).
  - `Object` is the target concept or entity.
  - Tokens are interpreted according to Sys2DSL v3 rules:
    - Tokens starting with a lowercase letter denote **concept names** (types, categories).
    - Tokens starting with an uppercase letter denote **individuals or grounded entities** (proper names, concrete instances).
    - Tokens starting with `$` denote **variables** that refer to values stored earlier in the session environment.

## Public API
- `constructor({ id, engine, baseTheoryFile } = {})`
  - Binds the session to a dedicated `EngineAPI` instance and initialises a fresh session environment.
  - Loads an initial Sys2DSL programme from `baseTheoryFile` (if provided) and applies it to bootstrap the active theory.
- `run(sys2dslTextOrLines) -> env`
  - Accepts either a multiline string or an array of Sys2DSL lines.
  - Feeds each line into `TheoryDSLEngine` (Sys2DSL interpreter) with a session-scoped environment.
  - Returns the final environment so callers can inspect variables (e.g., a `@result` binding with a truth object).
- `appendTheory(sys2dslTextOrLines)`
  - Adds the given Sys2DSL lines to the session’s active theory and re-applies them (idempotently) to update the theory stack.
- `saveTheory({ name, path } = {})`
  - Serialises the current session theory (as Sys2DSL text) to a single theory file under the storage root.
  - Used to persist a session’s work as a reusable theory programme.
- `mergeIntoTheory({ sourcePath, targetPath, strategy })`
  - Loads an existing theory file (`targetPath`) and merges the current session theory into it according to a deterministic strategy (for example, append with provenance markers or override specific sections).
  - Writes the merged Sys2DSL back as text; any binary representations are treated as caches and can be regenerated.
- `getVar(name)`
  - Returns the current value bound to a given Sys2DSL variable name (without the leading `@`/`$`), for convenience in host code.
- `reset()`
  - Clears the session environment and active theory overlay, optionally reloading the base theory.

## Pseudocode (comments)
```js
class System2Session {
  constructor({ id, engine, baseTheoryFile } = {}) {
    // this.id = id || randomSessionId();
    // this.engine = engine; // EngineAPI instance
    // this.dsl = new TheoryDSLEngine({ api: engine, conceptStore: engine.conceptStore, config: engine.config });
    // this.env = {};
    // this.activeTheoryLines = [];
    // if (baseTheoryFile) { this._loadAndApplyTheory(baseTheoryFile); }
  }

  run(textOrLines) {
    // const lines = normaliseToLines(textOrLines);
    // Each line is a v3 triple: @var Subject VERB Object
    // this.env = this.dsl.runScript(lines, { initialEnv: this.env });
    // return this.env;
  }

  appendTheory(textOrLines) {
    // const lines = normaliseToLines(textOrLines);
    // this.activeTheoryLines.push(...lines);
    // this.env = this.dsl.runScript(lines, { initialEnv: this.env });
  }

  saveTheory({ name, path } = {}) {
    // path = resolveTheoryPath(name, path);
    // write Sys2DSL text (this.activeTheoryLines.join('\n')) to file
  }

  mergeIntoTheory({ sourcePath, targetPath, strategy }) {
    // load existing Sys2DSL text from targetPath
    // merge with this.activeTheoryLines according to strategy
    // write merged text back to targetPath (or new file)
  }

  getVar(name) {
    // return this.env[name];
  }

  reset() {
    // this.env = {};
    // this.activeTheoryLines = [];
    // optionally reload base theory
  }
}
```

## Notes/Constraints
- `System2Session` is the only place where external callers can create facts, pose queries, or edit theories; it must never expose internal data structures such as raw vectors or diamonds directly.
- Every session has its own active theory overlay; when the session receives Sys2DSL lines that assert new rules, they are applied on top of any base theory used to seed the session.
- Sessions must treat concepts with multiple diamonds carefully: when a Sys2DSL command refers to a concept’s “point”, the engine resolves this into the centres of all diamonds in the union and may branch reasoning over each centre (this policy is detailed further in the Sys2DSL architecture specification).
- Binary representations of theories (if any) are treated purely as caches for faster loading; the canonical form of a theory is always its Sys2DSL text file.***


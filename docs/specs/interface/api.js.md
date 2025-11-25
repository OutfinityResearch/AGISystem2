# Design Spec: src/interface/api.js

ID: DS(/interface/api.js)

Class `EngineAPI`
- **Role**: Internal engine façade for ingest/query/admin operations; orchestrates parser, encoder, reasoner, and theory stack; surfaces provenance and audit hooks. It is used by `System2Session` and the Sys2DSL interpreter, not directly by external callers.
- **Pattern**: Facade. SOLID: single responsibility for coordinating core modules; its surface is intentionally minimal and session-oriented.
- **Key Collaborators**: `NLParser`, `Encoder`, `Reasoner`, `Retriever`, `TheoryStack`, `TranslatorBridge`, `AuditLog`, `Config`, `TheoryDSLEngine` (Sys2DSL).

## Public API (session-facing core methods)
- `constructor(deps)`: wire dependencies; load config snapshot. Called by `AgentSystem2` when constructing a new `System2Session`.
- `ingest(text, {conceptId, context} = {})`: parse → encode → store; returns confirmation (vector hash, clusters affected, provenance). Used by Sys2DSL `ASSERT`/fact commands.
- `ask(question, options)`: parse → encode query → reason; returns answer with reasoning band and active theories. Used by Sys2DSL query commands.
- `setContext(layers)`: replace active theory stack (meta-rational context switching) based on the active session theory.
- `pushTheory(layerConfig)`, `popTheory()`: manage stack when interpreting Sys2DSL theory programmes.
- `listConcepts()`, `inspectConcept(id)`: admin queries for session-level inspection.
- `validate(spec)`: run validation engine (abstract checks) on behalf of Sys2DSL validation commands.
- Optional higher-level helpers (e.g., health/export/narrative convenience methods) may exist temporarily but must be implemented entirely in terms of Sys2DSL programmes and generic primitives. No domain-specific logic (health, law, narrative) may be hard-coded in EngineAPI; instead, EngineAPI executes Sys2DSL theory files.

## Pseudocode (comments)
```js
class EngineAPI {
  constructor({parser, encoder, reasoner, retriever, stack, audit, config}) { /* store deps */ }

  ingest(text, {conceptId}) {
    // ast = parser.parse(text)
    // vec = encoder.ingestFact(ast.root, conceptId)
    // audit log (conceptId, vec hash, translator version)
    // return {conceptId, vectorHash, clustersUpdated}
  }

  ask(question, opts) {
    // ast = parser.parse(question)
    // queryVec = encoder.encodeNode(ast.root)
    // answer = reasoner.answer(queryVec, opts.targetConcept, {contextStack: opts.stack})
    // audit provenance; return answer
  }

  setContext(layers) { /* stack.setActive(layers); audit */ }
  pushTheory(layer) { /* stack.push(layer); audit */ }
  popTheory() { /* stack.pop(); audit */ }

  listConcepts() { /* return store.listConcepts() */ }
  inspectConcept(id) { /* return store.snapshot(id) */ }

  validate(spec) { /* delegate to ValidationEngine */ }
}
```

## Notes/Constraints
- Methods are deterministic; include config/translator versions in outputs made available to the session layer.
- Surface must remain minimal and session-oriented; external callers interact only through `AgentSystem2`/`System2Session` and Sys2DSL, not directly with EngineAPI.
- Natural language is normalised to Sys2DSL-compatible command lines (simple subject–relation–object statements and commands); richer NL must be pre-normalized (e.g., by TranslatorBridge/LLM) before reaching EngineAPI via a session.***

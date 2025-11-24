# Design Spec: src/interface/api.js

Class `EngineAPI`
- **Role**: Stable external interface for ingest/query/admin operations and embedding into agents; orchestrates parser, encoder, reasoner, and theory stack; surfaces provenance and audit hooks.
- **Pattern**: Facade. SOLID: single responsibility for API exposure; delegates work.
- **Key Collaborators**: `NLParser`, `Encoder`, `Reasoner`, `Retriever`, `TheoryStack`, `TranslatorBridge`, `AuditLog`, `Config`, `TheoryDSLEngine`.

## Public API (core methods)
- `constructor(deps)`: wire dependencies; load config snapshot.
- `ingest(text, {conceptId, context} = {})`: parse → encode → store; returns confirmation (vector hash, clusters affected, provenance).
- `ask(question, options)`: parse → encode query → reason; returns answer with reasoning band and active theories.
- `setContext(layers)`: replace active theory stack (meta-rational context switching).
- `pushTheory(layerConfig)`, `popTheory()`: manage stack.
- `listConcepts()`, `inspectConcept(id)`: admin queries.
- `validate(spec)`: run validation engine (abstract checks).
- `getAgenticSession(options)`: returns a session-scoped object with restricted command grammar for embedding (add fact, query, context ops) without exposing internals.
- Optional higher-level helpers (e.g., `checkProcedureCompliance`, `checkExport`, `checkMagicInCity`) may be exposed for convenience, but their behaviour must be implemented entirely in terms of theory DSL macros and generic primitives. No domain-specific logic (health, law, narrative) may be hard-coded in EngineAPI; instead, EngineAPI loads and invokes macros defined in theory files.

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

  getAgenticSession(opts) {
    // return {ingest(text), ask(question), setContext(layers), pushTheory(layer), popTheory()}
    // enforce restricted grammar/commands; reuse EngineAPI methods with scoped context
  }
}
```

## Notes/Constraints
- API methods deterministic; include config/translator versions in outputs.
- Keep surface minimal (YAGNI); prefer structured inputs over free text except ingest/ask.
- Agentic session grammar is limited English (simple subject–relation–object statements/questions); richer NL must be pre-normalized (e.g., by TranslatorBridge/LLM) before reaching the session.***

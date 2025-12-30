# AGISystem2 — System Specifications
#
# DS27: Session High-Level Holographic APIs (Holo Query + Batch Q/A) — Proposed
#
# **Document Version:** 1.0
# **Status:** Proposed (planned for implementation; not yet implemented)
# **Audience:** Runtime/Reasoning developers, application authors
# **Related:** DS02 (DSL), DS03 (Architecture), DS14 (EvalSuite), DS17 (Priority modes), DS19 (Proof-real), DS25 (EXACT)
#
# Goal: expose a small, explicit, high-level Session API for:
# 1) “pure holographic” best-effort query (fast when applicable, incomplete by design),
# 2) batch Q/A over a Session-loaded KB (RAG-like ingestion via theory files),
# without forcing callers to reason about documents/IDs or global env configuration.

---

## 1. Motivation

AGISystem2 already supports holographic (HDC-first) reasoning inside the general `query()` pipeline and evaluation runners, but that machinery is optimized for correctness and coverage across heterogeneous query classes. It mixes multiple sources (direct symbolic matches, transitive closure, rules, CSP, and holographic candidate retrieval), and its behavior depends on the configured “reasoning priority”.

For research and for practical “thinking database / RAG” usage, we also need a simpler contract:

1) a **pure holographic** entry point that is explicit about being best-effort and that can be run as a fast retrieval primitive;
2) a **batch answering** entry point that loads a small set of DSL theory files into one session and answers a list of questions, using either symbolic reasoning or holographic retrieval depending on an explicit per-call mode.

This DS does **not** introduce “holographic closure” (full forward-chaining saturation in vector space). Closure is intentionally out of scope because it is unlikely to beat the symbolic engine on hard classes and risks amplifying superposition noise for approximate strategies.

---

## 2. Design principles

The APIs below are designed to be:

1) **Session-local and deterministic**: no process-global caches; results depend on the session’s KB and selected strategy.
2) **Explicit about trade-offs**: callers choose between exact symbolic reasoning and fast best-effort holographic retrieval.
3) **Compatible with existing formats**: results should be representable in the same shape as `session.query()` results, with optional enrichment fields.
4) **Proof is optional**: symbolic proofs are available; holographic-only calls can provide a lightweight trace but MUST NOT claim DS19 proof validity unless a symbolic validation step ran.

---

## 3. API surface (Session)

### 3.1 `session.loadTheories(paths, options?)`

Purpose: ingest knowledge sources for “RAG-like” usage by loading `.sys2` files into the current session KB.

This is a convenience wrapper over the existing DSL `Load` command (executed by the session executor). It exists so applications do not need to construct DSL strings for loading and can obtain a stable aggregated report.

Signature (conceptual):

```js
await session.loadTheories(
  ['./kb/domain.sys2', './kb/doc1.sys2', './kb/doc2.sys2'],
  { basePath: process.cwd(), stopOnError: true }
)
```

Semantics:
- Each path is loaded in order.
- Loading a theory SHALL behave like executing `@_ Load "<path>"` in the current session (same parser, same canonicalization, same KB side-effects).
- The executor base path SHALL be set to `options.basePath` for relative resolution for the duration of this call.
- The report SHALL include, for each file: loaded/not-loaded, absolute path, errors, and number of asserted facts (as reported by the executor).

This API intentionally hides the concept of “documents” and “doc IDs”. Knowledge is just “theories loaded into a session”.

### 3.2 `session.holoQueryDSL(dsl, options?)`

Purpose: run a best-effort holographic query over the session KB.

This is a separate entry point because `session.query()` is not purely holographic: it may execute multiple symbolic sources and may return results derived by rules/transitivity/CSP.

Signature (conceptual):

```js
const result = session.holoQueryDSL('isA ?x Mammal', {
  maxResults: 5,
  validate: 'none' // or 'light' | 'full'
})
```

Semantics:
- Input is Sys2DSL query text (same grammar as `session.query`).
- The engine SHALL attempt a holographic retrieval path (Master Equation / UNBIND + decode), producing candidate bindings for holes.
- In `validate: 'none'` mode, the engine MUST NOT run symbolic reasoning; it returns candidates as-is with a holographic confidence score.
- In `validate: 'light'` mode, the engine MAY apply cheap structural checks (e.g., direct fact index checks) but MUST NOT run recursive proof search.
- In `validate: 'full'` mode, candidates MUST be validated by symbolic reasoning (`prove`/direct query) before being reported as accepted answers.
- If validation is enabled, candidates that fail validation SHALL be removed from the final results.
- The result SHALL include a `method` label that makes it clear whether the output is holographic-only or holographic+validated.

The intent is to expose a fast “retrieval primitive” that can be used directly when the caller already knows the query class is compatible with holographic decoding (especially for EXACT).

### 3.3 `session.holoQueryNL(text, options?)`

Purpose: same as `holoQueryDSL`, but taking natural-language input.

Semantics:
- The engine SHALL translate `text` into a Sys2DSL query using the existing NL→DSL translator (`src/nlp/nl2dsl.mjs`, question mode).
- If translation fails, it SHALL return `success: false` with translation errors.
- Otherwise, it SHALL behave identically to `holoQueryDSL` on the produced DSL.

This method exists for “assistant-like” RAG usage where the caller does not want to separately invoke NL2DSL.

### 3.4 `session.answerMany(questions, options?)`

Purpose: answer a list of questions against a session KB, using an explicit execution mode (symbolic vs holographic).

Signature (conceptual):

```js
const out = await session.answerMany(
  ['isA ?x Mammal', 'locatedIn Paris ?country'],
  { input: 'dsl', mode: 'holoValidated', includeProof: false }
)
```

Semantics:
- `questions` is a list of strings (DSL or NL; see `options.input`).
- For each question, the session SHALL produce an `AnswerItem` with:
  - the normalized input (DSL),
  - the chosen execution mode for that question,
  - the final answers (0..N),
  - optional proof (when symbolic reasoning is used or when holographic candidates were fully validated),
  - and warnings (e.g., “best-effort holographic; not validated”).

Modes:

| Mode | Meaning | Intended use |
|------|---------|--------------|
| `symbolic` | Use the standard `session.query()` / `prove()` pipeline (exact) | correctness, complete coverage |
| `holo` | Use holographic retrieval only (best-effort, no symbolic) | very fast retrieval when the query class is known to work |
| `holoValidated` | Holographic retrieval to propose candidates, then symbolic validation of those candidates | fast + correct for fact-like queries |
| `auto` | Choose per-question based on query classification and budgets | mixed workloads |

Proof handling:
- If `includeProof` is false, the implementation SHOULD avoid generating symbolic proof traces, even in `symbolic` mode, unless required by other runtime invariants.
- If `includeProof` is true, `symbolic` mode SHALL return DS19-compatible proof objects (as today), while `holoValidated` mode SHALL include proof steps corresponding to the validation phase.
- `holo` mode MUST NOT claim DS19 proof validity; it may return a holographic trace for debugging.

Output rendering:
- `answerMany` MAY optionally attach a natural-language rendering of answers using the existing text generator and response translator, but correctness MUST be defined by the structured result (bindings + operator).

---

## 4. Result shapes

The high-level APIs SHOULD align with the existing query result conventions:

1) `success`: whether at least one accepted answer exists,
2) `bindings`: a best binding map for convenience,
3) `allResults`: ordered list of results (each with bindings + score + method),
4) `ambiguous`: whether multiple accepted results exist,
5) `confidence`: a numeric score (holographic similarity/witness score, or symbolic default).

Each API additionally MAY include:
- `dsl`: the normalized DSL used for execution (especially when input was NL),
- `errors`: parse/translation errors,
- `warnings`: best-effort disclaimers or budget exhaustion,
- `trace`: a holographic trace when requested (unbind/decode summaries).

The core invariant is that existing consumers of `session.query()` should be able to consume these results with minimal adaptation, while still being able to detect “validated vs unvalidated” holographic outputs.

---

## 5. Where this is used

These APIs are intended for:

1) **Interactive tools and assistants** that want a fast “try HDC first” call for simple queries, with optional validation only when needed.
2) **RAG-like pipelines** where a small number of `.sys2` knowledge sources are loaded into a session and a list of user questions is answered; optional proofs can be attached as structured context for a downstream LLM.
3) **Evaluation tooling** that wants to cleanly separate “pure holographic retrieval” from “symbolic correctness”, without conflating the two inside one mixed engine.

---

## 6. Compatibility notes

- This DS does not change Sys2DSL itself; it only adds session-level convenience APIs.
- Strategies remain pluggable; EXACT is a primary beneficiary because holographic decoding can be made reliable for fact-like queries without similarity thresholds.
- Environment variables remain supported for default session configuration, but the APIs described here are explicitly per-call so evaluation runners and applications do not need to rely on global process state.

---

*End of DS27*

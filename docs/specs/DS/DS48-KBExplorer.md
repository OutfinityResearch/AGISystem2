# AGISystem2 - System Specifications

# Chapter 48: KBExplorer — Interactive Theory + Session KB Explorer (HTTP + HTML UI)

**Document Version:** 0.1  
**Author:** Sînică Alboaie (spec), contributors (implementation)  
**Status:** Draft Specification  
**Audience:** Application authors, knowledge engineers, core integrators  
**Related:** URS-40 (debug/inspection), URS-06/07/11/14/15, NFS-01..05, DS02 (DSL), DS03 (Session API), DS10 (Codebase map), DS13/DS21 (NL→DSL), DS26 (session isolation)

---

## 48.1 Goal

Provide a small, local-first, zero-dependency **interactive UI** for exploring and operating a live `Session`:

1) a chat-like panel to submit commands in **Natural Language (NL)** or **Sys2DSL**,  
2) a synchronized **KB facts browser** for the current session, including an expandable **BIND/BUNDLE expression tree** per fact,  
3) UI-driven **theory ingestion** (upload `.sys2` files / text) into the current session.

The module is implemented outside the core runtime in a new top-level folder `KBExplorer/` (parallel to `src/`) and uses AGISystem2 as a library.

---

## 48.2 Scope

### 48.2.1 In scope

- A Node.js HTTP server (local dev tool) that:
  - serves a static HTML/JS client,
  - hosts one or more in-memory AGISystem2 `Session` instances,
  - exposes JSON endpoints for command execution, KB listing, and fact inspection,
  - supports uploading/ingesting theory text/files into the active session.
- A browser client UI that:
  - shows a conversation history (user inputs and system responses),
  - provides a selector for execution mode: `learn`, `query`, `prove`, `abduce`, `findAll`,
  - provides an input mode selector: `NL` vs `DSL`,
  - renders a right-side KB tree listing all current session facts (with expandable structure).

### 48.2.2 Out of scope (for v0.1)

- Remote deployment hardening (authn/authz, multi-tenant isolation, TLS).
- Streaming token-by-token responses (the UI is request/response).
- Persisting sessions across restarts (pure in-memory by default).
- A full AST visualizer for arbitrary nested DSL compounds (v0.1 focuses on fact-level structure).

---

## 48.3 User Stories

- As a user, I can type a question in NL, choose `query` or `prove`, and get a structured result plus a readable explanation.
- As a knowledge engineer, I can paste or upload a `.sys2` theory and see the KB grow immediately.
- As a debugger, I can click a fact and see how it is composed as a **BUNDLE of BIND(Position, Arg)** parts (plus the operator).
- As an experimenter, I can reset the session to a clean universe (DS26 isolation) and rerun the same sequence deterministically.

---

## 48.4 High-Level Architecture

### 48.4.1 Module placement

```
KBExplorer/
├── server/                 # Node HTTP server (local tool)
├── client/                 # Static web app (no build step required)
└── README.md               # How to run + usage notes
```

KBExplorer MUST import AGISystem2 via the local package entrypoint (same repo):

- `import { Session } from '../src/index.mjs'` (dev-in-repo), or
- `import { Session } from 'agisystem2'` (when consumed as a package).

### 48.4.2 Runtime model (sessions)

The server maintains an in-memory map:

- `sessions: Map<sessionId, { session: Session, chat: ChatItem[], createdAt, lastUsedAt }>`

Each browser tab uses one `sessionId` (sent via `x-session-id`).

Session lifecycle invariants:

- Creating a new session MUST create a fresh `new Session()` (DS26 isolation).
- Resetting a session MUST call `session.close()` and replace it with a new `Session`.
- Sessions MUST be independent: no shared vocabulary, KB, or strategy allocator state (inherits DS26).

### 48.4.3 Client persistence rules

- **Session IDs are not persisted.** On every page load (including refresh), the client MUST create a new server session universe.
- **Configuration is persisted.** The selected HDC strategy and reasoning priority MUST be saved in `localStorage` so the user’s preferences carry across tabs/reloads.

---

## 48.5 Execution Semantics

### 48.5.1 Supported call types

KBExplorer exposes the existing `Session` API (DS03) through the UI:

| UI mode | Library call | Input expectation |
|--------:|--------------|------------------|
| `learn` | `session.learn(dsl)` | DSL statements; NL optionally translated to DSL context |
| `query` | `session.query(dsl)` | DSL query with holes; NL translated to DSL question |
| `prove` | `session.prove(dsl)` | DSL proposition; NL translated to DSL question/proposition |
| `abduce` | `session.abduce(dsl)` | DSL proposition/query (engine-defined) |
| `findAll` | `session.findAll(dsl)` | DSL pattern (single statement) |

### 48.5.2 NL → DSL translation policy

When input mode is `NL`, KBExplorer uses `translateNL2DSL()` (DS21):

- Recommended import (library surface):
  - `import { translateNL2DSL } from 'agisystem2'`, or
  - `import { translateNL2DSL } from 'agisystem2/nl2dsl'`

- For `query`/`prove`: `translateNL2DSL(text, { isQuestion: true, source: 'generic' })`
- For `learn`: `translateNL2DSL(text, { isQuestion: false, source: 'generic' })`

If translation fails (`success: false`), KBExplorer MUST NOT mutate the session and MUST return the translation errors to the UI.

### 48.5.3 Result rendering policy

The server returns both:

- `result`: the structured `Session` output (bindings/proof/warnings),
- `text`: a best-effort English summary using `session.formatResult(...)` and/or `session.describeResult(...)`.

The client renders:

- the user’s input (with inferred/translated DSL if available),
- the system response text,
- expandable raw JSON for debugging (optional UI toggle).

### 48.5.4 User-selectable Session configuration (HDC + reasoning)

KBExplorer MUST allow selecting:

1) the Session’s **HDC strategy** (`Session({ hdcStrategy })`), and  
2) the Session’s **reasoning priority** (`Session({ reasoningPriority })`).

Persistence:

- `localStorage["kbexplorer.hdcStrategy"] = "<strategyId>"`
- `localStorage["kbexplorer.reasoningPriority"] = "<priorityId>"`

Behavior on change:

- When either selection changes, the UI MUST warn the user that the Session will be reset.
- If the user confirms, KBExplorer MUST create a **new** Session universe using the new options.
- If the user cancels, the selection MUST revert to the previous value.

---

## 48.6 KB Fact Listing and Expression Tree

### 48.6.1 Facts list (first level)

KBExplorer MUST display all current session KB facts (in insertion order) in a right-side panel.

For each fact, the server provides:

- `factId` (stable within the session),
- `name` (if present),
- `operator` and `args` (from fact metadata when available),
- an English label string for display.

Implementation note: the current runtime stores facts in `session.kbFacts` with `metadata: { operator, args, ... }` (see `src/runtime/executor-metadata.mjs` and `Session.addToKB`).

### 48.6.2 Expression tree (expand on click)

On selecting a fact, KBExplorer shows an expression tree explaining the vector construction:

```
FactVector = BUNDLE(
  ATOM(operator),
  BIND(ATOM(Pos1), ATOM(arg1)),
  BIND(ATOM(Pos2), ATOM(arg2)),
  ...
)
```

Notes:

- The UI uses the abstract names `BIND` and `BUNDLE` for readability across strategies.
- Position atoms use `PosN` naming (Core theory) in the display.
- For `Not`, `Implies`, `And`, `Or`, `Exists`, `ForAll`, the display SHOULD use the structured metadata fields (`inner*`, `condition`, `conclusion`, `parts`, `body`) when available, but v0.1 MAY still display them as a flat operator + args list.

### 48.6.3 ExpressionNode JSON shape

Server response for a fact tree MUST be JSON with this minimal shape:

```js
// ExpressionNode
{
  kind: 'BUNDLE' | 'BIND' | 'ATOM' | 'FACT',
  label: string,             // UI-facing label (English)
  ref?: { type: string, id: string|number }, // optional stable reference
  children?: ExpressionNode[]
}
```

---

## 48.7 HTTP API (Server)

### 48.7.1 Endpoints (v0.1)

All endpoints are JSON over HTTP.

- `GET /`  
  Serves the client HTML.

- `POST /api/session/new` → `{ sessionId }`  
  Creates a new session universe.
  Optionally accepts:
  ```json
  { "sessionOptions": { "hdcStrategy":"dense-binary", "reasoningPriority":"symbolicPriority" } }
  ```

- `POST /api/session/reset` (header/query identifies session) → `{ ok: true }`  
  Resets the session universe.

- `POST /api/command` body:
  ```json
  { "mode":"query|prove|learn|abduce|findAll", "inputMode":"nl|dsl", "text":"..." }
  ```
  response:
  ```json
  {
    "ok": true,
    "mode": "query",
    "inputMode": "nl",
    "text": "original user text",
    "dsl": "translated or original DSL (when available)",
    "result": { },
    "rendered": "English text",
    "warnings": [],
    "errors": []
  }
  ```

- `GET /api/kb/facts` → `{ facts: FactSummary[] }`
  Supports pagination/filtering/sorting:
  - `q` (substring search)
  - `offset`, `limit`
  - `namedOnly` (show only named facts)
  - facts are sorted by `complexity` descending (then by id)

- `GET /api/kb/facts/:factId/tree` → `{ tree: ExpressionNode }`

- `GET /api/kb/facts/:factId/bundle` → `{ fact, bundle }`
  Returns a “bundle view” for a fact:
  - `metadata` (structured fact metadata)
  - `dsl` (best-effort DSL string from metadata)
  - `bundle.operator`
  - `bundle.binds` (PosN → arg) with `argFactId` when the arg is a named fact
  - `bundle.items` (operator + binds), for simple UI rendering

- `POST /api/theory/ingest` body:
  ```json
  { "filename":"example.sys2", "text":"...sys2dsl..." }
  ```
  response includes `learn` report plus updated KB counts.

### 48.7.2 Safety defaults (local dev tool)

Because the underlying DSL supports file IO via `Load`, KBExplorer SHOULD implement a safe default:

- By default, reject DSL statements containing `Load`/`Unload` (configurable override).
- Prefer ingestion by sending theory text to `session.learn(text)` rather than invoking `Load` with server-side paths.

---

## 48.8 Client UI Requirements

### 48.8.1 Layout

- The UI SHOULD use a tabbed layout:
  - **Chat** tab: conversation history + command input (with mode + input selectors) + theory ingestion.
  - **KB Explorer** tab: compact explorer for the current session KB.
  - **Examples** tab: built-in usage docs with separate NL and DSL example sets.

KB Explorer presentation:

- A compact, paginated facts list (supports hundreds/thousands of facts).
- Facts are sorted with the most structurally complex facts first.
- Selecting a fact expands a filesystem-style tree:
  - `FACT` nodes are folders (named facts),
  - `BUNDLE` nodes are folders (icon: `+` in a circle),
  - `BIND` nodes are folders (icon: `×` in a circle),
  - `ATOM` nodes are files (leaf nodes).
- The KB tree supports deep nesting via indentation; the tree view MUST allow horizontal scrolling when depth grows.
- Clicking any node shows a details panel (including metadata such as L0 operators like `__NewVector` when present).

### 48.8.2 Interaction rules

- After every successful `learn` / theory ingestion, refresh the KB panel.
- After every `query`/`prove`, keep KB unchanged but still allow refresh (in case of side effects in future modes).
- Show translation output:
  - when `inputMode=NL`, display the produced DSL in the chat entry.
- Chat input UX:
  - `Enter` submits (send)
  - `Ctrl+Enter` inserts a newline (multi-line authoring)
- Theory ingestion UX:
  - The UI SHOULD provide a `Load...` action that lets users select multiple `.sys2` files.
  - Selecting files SHOULD auto-ingest them sequentially into the current session.
  - The UI MUST provide `Cancel` to abort an in-progress load.
- The UI MUST expose selectors for `hdcStrategy` and `reasoningPriority` and persist them to localStorage.
- On any page load, the UI MUST start with a fresh Session universe (new `sessionId`).

---

## 48.9 Non-Functional Requirements (KBExplorer-specific)

- **Determinism:** Given the same sequence of commands, the session result and KB list MUST be identical (inherits DS26 + URS-01).
- **Responsiveness:** UI should stay usable for up to ~500 facts (align with NFS-12/13 limits depending on strategy).
- **No external deps:** v0.1 SHOULD use Node built-ins only (`http`, `fs`, `url`), to avoid toolchain friction.

---

## 48.10 Test Requirements (v0.1)

- A minimal smoke test (node `--test`) that:
  - starts the server on an ephemeral port,
  - creates a session, ingests a tiny theory, runs `query` and `prove`,
  - requests `/api/kb/facts` and `/api/kb/facts/:id/tree`,
  - validates stable JSON shapes.

---

## 48.11 Open Questions

1) Should KBExplorer support multiple concurrent sessions in the UI (tabs) or only one at a time?
2) Should the KB tree display **only persistent KB facts** or also current scope bindings (`Session.scope`)?
3) For complex facts originating from graphs/macros, do we want to show:
   - only the surface operator/args metadata, or
   - also graph expansion traces (executor-level), or
   - HDC-level decode traces (`session.decode/summarize`)?
4) Should ingestion support `.sys2` files that themselves contain `Load` statements (requires file IO policy)?

---

*End of DS48*

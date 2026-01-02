# AGISystem2 - System Specifications

# DS48: KBExplorer (Local HTTP UI for Session Inspection)

**Document Version:** 0.1  
**Status:** Implemented (iterating)  
**Scope:** `KBExplorer/` (server + client UI)

## 1. Purpose
KBExplorer is a local, zero-dependency HTTP + HTML UI for:
- Interacting with AGISystem2 via Natural Language (NL) and Sys2DSL.
- Inspecting the current in-memory Knowledge Base (KB) of a `Session`.
- Navigating the *real* structure of statements (operator + position-tagged arguments) and the vectors that back them.

KBExplorer is a developer tool. It does not persist state on disk and does not require any external services.

## 2. Constraints
- **No external dependencies**: Node.js built-ins only (HTTP server), browser DOM APIs on the client.
- **Runs from repo**: uses the AGISystem2 library (`src/`) directly.
- **English UI**: all user-facing UI strings and server messages are in English.

## 3. Top-Level UX
KBExplorer uses **4 top-level tabs**:
1. **Chat**: send NL/DSL commands to the current session.
2. **KB Explorer**: unified session browser (KB facts, graphs, vocabulary, scope) as a tree with a fixed details panel.
3. **DSL Examples**: quick copy/paste examples in Sys2DSL.
4. **NL Examples**: quick copy/paste examples in Natural Language.

### 3.1 Chat input behavior
- **Enter** sends the message.
- **Ctrl+Enter** (or Cmd+Enter) inserts a newline into the textarea.

### 3.2 Load theories
In the Chat tab:
- `Load...` opens a file picker (`.sys2`, `.txt`) with **multi-select** enabled.
- Selection triggers immediate ingest (no extra “ingest” button).
- `Cancel` aborts the current ingest loop.

## 4. Session Model (Isolation + Multi-session Server)
### 4.1 Server-side
- The server maintains an in-memory map of sessions: `sessionId -> universe`.
- Universes are **fully independent** (KB, vocabulary, graphs, chat state).
- The server can support multiple concurrent sessions in parallel.

### 4.2 Client-side
- Each page load calls `POST /api/session/new` and receives a new `sessionId`.
- `sessionId` is stored only in memory (not persisted), so:
  - **Refresh** creates a new session.
  - **New tab** creates a new session.

## 5. Strategy + Reasoning Mode (LocalStorage + Reset-on-change)
KBExplorer exposes session-local configuration:
- `hdcStrategy` (HDC strategy)
- `reasoningPriority` (reasoning engine priority)
- `packs` (explicit set of config packs to load)

Rules:
- The selected values are persisted in `localStorage`.
- Changing either value **prompts the user** and then **resets** the session.
- Changing packs also **prompts the user** and **restarts** the session (clears KB + chat).

URC fact materialization:
- By default, URC audit data is kept **in-memory only** (Artifacts/Evidence/Provenance), to keep the UI responsive.
- To enable best-effort URC audit-line materialization (derived DSL lines for debugging; **not injected into the KB truth store**), run:
  - `@_ Set urcMaterializeFacts True`

## 6. KB Explorer Semantics
### 6.0 What “Session State” means (and why duplicates exist)
KBExplorer is a **session browser**, not only a KB browser.

In a running `Session`, the same surface token (e.g. `isA`, `Pos1`, `StressCompat`) may appear in multiple *stores* with different meanings:
- **KB Facts (`session.kbFacts`)**: persisted statements (what the session “believes”).
- **Graphs (`session.graphs`)**: executable `graph ... end` definitions (procedural library).
- **Lexicon (`session.vocabulary`)**: token → vector dictionary (not “knowledge”; it grows as tokens are referenced).
- **Working Memory (`session.scope`)**: temporary bindings created during execution.

Because these stores are separate, it is normal for a token to show up more than once across the tree.

### 6.1 Tree view
The tree is a filesystem-like explorer:
- **Fact** nodes represent persisted KB facts.
- Expanding a fact reveals:
  - The **verb/operator** node.
  - One **bind** node per argument position (`#1`, `#2`, ...), each containing the corresponding **atom** child.
- Atoms that have a KB definition (`definitionFactId`) are expandable; expanding them reveals the operator/binds/atoms of their definition fact, recursively.

Additional session-audit surfaces are shown under:
- **Reasoning (URC)**:
  - **Artifacts** (compiled DSL, logs, etc.)
  - **Evidence** (solver/run results with status + references)
  - **Provenance** (NL→DSL translation log)
  - **Policy: current view** (derived policy materialization; no KB mutation)

### 6.2 Details panel (always visible)
Selecting any node shows a fixed right panel with:
- **Definition**: the statement/graph text as loaded; when a fact is named, it is shown with an `@:` prefix for visibility.
- **Encoding**: statement encoding form `Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ ...` (this is the *fact vector* formula, not an “entity definition”).
- **Vector**: the selected node’s vector only, as an array (truncated).
- **Raw**: the raw payload returned/assembled by the UI for debugging.

For URC nodes:
- **Artifact**: shows artifact metadata and text (truncated).
- **Evidence**: shows canonical evidence fields (kind/method/status/supports/artifactId).
- **Provenance**: shows the stored NL and DSL texts (when available).

### 6.3 Graph visibility
Operators may have a graph definition (`session.graphs`). When available:
- the verb node displays the graph DSL in the **Definition** section.

## 7. HTTP Server
### 7.1 Run
From the repo root:
- `npm run runserver`

### 7.2 Restart prompt
When started in a TTY, the server provides a console prompt:
- typing `y` + Enter restarts the HTTP server and drops all in-memory sessions.

### 7.3 Theory library load (KBExplorer policy)
Each session universe is created with a **baseline pack list** (DS51 direction):

- default: a minimal, generic list of packs (server-owned)
- optional: a client-selected list of packs (via the `Packs…` dialog)

Rationale:
- KBExplorer is a research/developer UI; the goal is to make *what is loaded* explicit and inspectable.
- Packs are the canonical home for semantic libraries. Runtime core should not auto-load semantic theories by default (URC direction).

## 8. API (v0)
All APIs are JSON. The client identifies its session via `X-Session-Id`.

### 8.1 Session
- `POST /api/session/new` → creates a new universe
  - body: `{ sessionOptions: { hdcStrategy, reasoningPriority }, packs?: string[] }`
  - response includes: `loadedPacks`
- `POST /api/session/reset` → resets an existing universe (same `sessionId`)
  - body: `{ sessionOptions: { hdcStrategy, reasoningPriority }, packs?: string[] }`
  - response includes: `loadedPacks`
- `GET /api/session/stats` → basic session counters for the UI
  - response includes: `kbFactCount`, `graphCount`, `vocabCount`, `scopeCount`, `urcArtifactCount`, `urcEvidenceCount`, `urcProvenanceCount`

### 8.2 Packs
- `GET /api/packs` → lists available packs and server defaults
  - response: `{ availablePacks, defaultPacks }`

### 8.3 KB
- `GET /api/kb/facts?q=&namedOnly=&namedFirst=&limit=&offset=` → lists KB facts (sorted by estimated complexity)
- `GET /api/kb/facts/:id/bundle` → returns a faithful view of a fact:
  - metadata, statement DSL, operator + binds, and vector previews (fact/operator/positioned binds)

### 8.4 Theory ingest (UI “Load...”)
- `POST /api/theory/ingest` → learns a `.sys2` file sent as text
  - body: `{ filename, text }`
  - DSL `Load`/`Unload` is enabled by default (disable with `KBEXPLORER_ALLOW_FILE_OPS=0`)

### 8.5 Chat command execution
- `POST /api/command` → executes one user command
  - body: `{ mode: learn|query|prove|abduce|findAll, inputMode: nl|dsl, text }`
  - for `inputMode=nl`, the server performs `translateNL2DSL(...)` and returns the translated DSL alongside the reasoning result.

### 8.6 Policy (derived view)
- `GET /api/policy/view` → returns the derived policy view for the session (no KB mutation)
  - response: `{ currentFactIds, supersedes, negates, warnings }`

### 8.7 URC audit surfaces (in-memory stores)
These endpoints expose URC stores used for inspection/debug:

- `GET /api/urc/artifacts` → lists artifacts (id/format/hash/size)
- `GET /api/urc/artifacts/:id` → returns one artifact record
- `GET /api/urc/evidence` → lists evidence objects
- `GET /api/urc/evidence/:id` → returns one evidence record
- `GET /api/urc/provenance` → lists provenance log entries (NL→DSL)
- `GET /api/urc/provenance/:id` → returns one provenance entry

## 9. Non-goals (v0)
- Persistent storage of sessions or KB state across reloads.
- Multi-user auth or remote deployment hardening.
- Editing/re-writing facts from the UI (currently add-only via learn/ingest).

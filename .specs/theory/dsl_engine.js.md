# Design Spec: src/theory/dsl_engine.js

Class `TheoryDSLEngine`
- **Role**: Provide a small, deterministic domain-specific language (DSL) that lives inside theory files and composes core reasoning primitives into reusable “thinking macros” (e.g., health compliance checks, export controls, narrative rules) without hard-coding domain behaviour in JS.
- **Pattern**: Interpreter over a line-oriented script. SOLID: single responsibility for parsing and executing DSL commands; it delegates all semantic work to `EngineAPI`, `Reasoner`, and `ConceptStore`.
- **Key Collaborators**: `EngineAPI` (for `ask`, `abduct`, `counterfactualAsk` and config), `ConceptStore` (for fact search), `Reasoner` (for low-level truth bands when needed), `Config` (for limits and profile).

## DSL Overview

- Scripts are plain text theory files (often alongside canonical facts) interpreted line by line.
- Two kinds of content are recognised:
  - Canonical facts in the constrained grammar (`Subject REL Object`) which are passed through the normal ingest pipeline.
  - DSL assignments of the form `@varName COMMAND arg1 arg2 ...` which define variables and call built-in primitives.
- Variables:
  - Names start with `@` at definition time and are referenced with `$name` inside arguments.
  - Values are opaque JS values from the engine’s point of view (strings, truth objects like `{truth: 'TRUE_CERTAIN'}`, arrays of fact triples, etc.).
  - The engine maintains an environment map `{ name: value }` updated in order of appearance.
- Control flow:
  - MVP: scripts are straight-line; no loops or conditionals. Macros are small pipelines that glue queries together.
  - Meta-rationality is expressed by composing multiple primitives (e.g., check base facts, then temporary context, then combine into a final decision) rather than by imperative branching.

## Public API

- `constructor({ api, conceptStore, config })`
  - `api`: instance of `EngineAPI` used for ingest, `ask`, `abduct`, `counterfactualAsk`.
  - `conceptStore`: the shared `ConceptStore`, used for direct fact enumeration when needed.
  - `config`: `Config` instance; DSL engine is deterministic and respects same limits.

- `runScript(lines, { initialEnv } = {}) -> env`
  - `lines`: array of trimmed, non-empty strings from a theory file.
  - `initialEnv` (optional): seed environment, for example binding `$proc` or `$action` before executing a macro.
  - Returns final environment map; callers conventionally read a specific variable (e.g. `result`) to interpret macro output.
  - Facts encountered in `lines` are not auto-ingested to long-term memory; the caller decides whether to:
    - treat them as temporary context (counterfactual) facts, or
    - pre-ingest them before running macros.

- `executeCommand(env, tokens) -> updatedEnv`
  - Internal helper: interpret one `@var COMMAND ...` line.
  - Dispatches to primitive operations described below, stores the result under `env[varName]`.

## Built-in Commands (MVP)

These commands are intentionally minimal; they are building blocks for higher-level health, export, and narrative macros.

- `ASK <question-string>`
  - Delegates to `EngineAPI.ask(question)`.
  - Stores the raw result object, typically `{ truth: 'TRUE_CERTAIN' | 'FALSE' | 'PLAUSIBLE' | 'UNKNOWN_TIMEOUT' }`.

- `CF <question-string> | <fact1> ; <fact2> ; ...`
  - Runs `EngineAPI.counterfactualAsk(question, extraFacts)` with the given inline facts.
  - Intended for “what-if” macro steps (e.g., emergency context in law or narrative variations).

- `ABDUCT <observation> [RELATION]`
  - Delegates to `EngineAPI.abduct(observation, relation)` and stores result `{ hypothesis, band }`.
  - Supports both `CAUSES` and `CAUSED_BY` (and future causal relations) depending on facts.

- `FACTS_MATCHING <pattern>`
  - Pattern syntax: `SUBJ REL OBJ...` with `?` wildcards (e.g., `? REQUIRES ?`, `$proc REQUIRES ?`, `? PERMITS Magic_IN $city`).
  - Searches across base facts (and optional additional contexts supplied by the caller) via `ConceptStore.getFacts()`.
  - Returns an array of `{subject, relation, object}` triples.

- `ALL_REQUIREMENTS_SATISFIED <requirementsVar> <satisfiedVar>`
  - Reads two variables from the environment:
    - `$requirementsVar`: list of required items (e.g., all objects from `ProcedureX REQUIRES ?`).
    - `$satisfiedVar`: list of facts that might satisfy them (e.g., `Consent GIVEN yes`, `AuditTrail PRESENT yes`).
  - Returns a normalised truth object `{ truth: 'TRUE_CERTAIN' | 'FALSE' }` by checking that every requirement is covered.

- `BOOL_AND <varA> <varB>`
  - Combines two truth objects (with `truth` fields) into a stricter result:
    - If either is `'FALSE'`, the result is `'FALSE'`.
    - If both are `'TRUE_CERTAIN'`, result is `'TRUE_CERTAIN'`.
    - Any other combination may degrade to `'PLAUSIBLE'` in future; MVP sticks to TRUE/FALSE.

- `PICK_FIRST <listVar>`
  - Returns first element of an array variable, used for simple abduction macros where only one hypothesis is needed.

- `NONEMPTY <listVar>`
  - Interprets a list-valued variable as a truth object: returns `{ truth: 'TRUE_CERTAIN' }` if the list is non-empty, `{ truth: 'FALSE' }` otherwise.

- `MERGE_LISTS <listVarA> <listVarB>`
  - Concatenates two list variables (used to union hits from separate `FACTS_MATCHING` calls, e.g. different positive evidence shapes) and stores the combined array.

- `POLARITY_DECIDE <negListVar> <posListVar> <regsVar>`
  - Aggregates negative and positive evidence for a set of “active” labels (e.g., regulations) supplied in `regsVar`.
  - For the active set:
    - if both negative and positive lists contain hits for some label, returns `{ truth: 'CONFLICT' }`;
    - if only negative hits exist, returns `{ truth: 'FALSE' }`;
    - if only positive hits exist, returns `{ truth: 'TRUE_CERTAIN' }`;
    - if there are no hits at all, returns `{ truth: 'FALSE' }`.
  - This is used for export-style decisions but remains semantically generic: it reasons about conflicting vs. aligned signals without naming any specific domain.

The exact set of primitives may evolve, but every addition must:
- remain deterministic;
- have a clear mapping to geometric or symbolic operations in the core engine;
- avoid embedding domain-specific knowledge (no “health” or “magic” logic inside the interpreter).

## Script Structure and Macro Conventions

- Theory files are free to mix facts and DSL assignments:
  - Facts prepare the conceptual space (root knowledge, domain axioms).
  - DSL lines define named macros that callers can reuse by seeding variables.
- A typical health-compliance macro might look like:
  - `@reqs FACTS_MATCHING "$procId REQUIRES ?"`
  - `@satGiven FACTS_MATCHING \"? GIVEN yes\"`
  - `@satPresent FACTS_MATCHING \"? PRESENT yes\"`
  - `@allSat MERGE_LISTS $satGiven $satPresent`
  - `@result ALL_REQUIREMENTS_SATISFIED $reqs $allSat`
- CLI and higher-level APIs agree on conventional result variable names (`result`, `decision`, etc.) when interpreting macro outcomes.

## Notes and Constraints

- The DSL engine must not mutate shared state except through the public `EngineAPI` calls it wraps; it is a pure orchestrator over existing primitives.
- All parsing is whitespace-based and must be robust to extra spaces but not to arbitrary natural language; inputs are canonical sentences, not free text.
- Timeouts and limits (e.g., `maxReasonerIterations`) still apply because DSL primitives call back into the same reasoning paths; the interpreter itself should remain O(number of lines).
- Meta-rationality: complex domain behaviour (e.g., combining multiple regulations or narrative layers) is expressed by chaining primitives and reading environment variables rather than by bespoke JS code per domain.
- Future extensions (conditionals, loops, higher-order macros) must be specified explicitly in this DS before implementation; MVP intentionally restricts expressive power to keep execution predictable.***

### Macro File Locations and Override Rules

- Built-in macros (for example `health_procedure`, `export_action`, `narrative_magic`) are shipped under `data/init/macros/*.dsl` and are considered the library defaults.
- User or deployment-specific macros can be placed under a `macros` folder next to the engine’s `storageRoot`. For the CLI, this is typically `.AGISystem2/macros/*.dsl`. The engine searches for macro files in this order:
  1. `<storageRoot>/../macros/<name>.dsl` (user override scope).
  2. `data/init/macros/<name>.dsl` (built-in defaults).
- If a user macro with the same name exists, it overrides the built-in definition without requiring any change in code. This keeps domain behaviour configurable and aligns with the requirement that no hard-coded domain logic lives inside the core engine.***

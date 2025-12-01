# Design Spec: src/theory/dsl_engine.js

ID: DS(/theory/dsl_engine.js)

Class `TheoryDSLEngine`
- **Role**: Interpret the Sys2DSL language that lives inside theory files and sessions, composing core reasoning primitives into reusable programmes (e.g., health compliance checks, export controls, narrative rules) without hard-coding domain behaviour in JS.
- **Pattern**: Interpreter over a line-oriented script. SOLID: single responsibility for parsing and executing Sys2DSL commands; it delegates all semantic work to `EngineAPI`, `Reasoner`, and `ConceptStore`.
- **Key Collaborators**: `EngineAPI` (for `ask`, `abduct`, `counterfactualAsk` and config), `ConceptStore` (for fact search), `Reasoner` (for low-level truth bands when needed), `Config` (for limits and profile), `System2Session`.

## Sys2DSL Overview

- Scripts are plain text Sys2DSL programmes interpreted line by line. They appear in two main places:
  - Theory files (persisted under version control).
  - Session scripts sent to a `System2Session`.
- Every script is a sequence of **statements**. A statement has the general form:
  - `@varName action param1 param2 ...`
- Statement boundaries:
  - An `@` token that appears after other content on a line starts a new statement from that point.
  - Comments (for example lines starting with `#`) are ignored.
- Variables:
  - Names start with `@` at definition time and are referenced with `$name` inside arguments.
  - Values are opaque JS values from the engine’s point of view (strings, truth objects like `{truth: 'TRUE_CERTAIN'}`, arrays of fact triples, concept/point references, masks, etc.).
  - The engine maintains an environment map `{ name: value }` updated in order of appearance.
- Token conventions for `param*`:
  - Tokens starting with a lowercase letter denote **concept names** (types, categories) in the conceptual space.
  - Tokens starting with an uppercase letter denote **individuals or grounded entities** (proper names, concrete instances).
  - Tokens starting with `$` denote **variables**, which are resolved to previously bound environment values.
  - Other punctuation (such as `?`, `=`, or `_`) is allowed inside tokens but does not affect their category.
- Control flow:
  - For the MLP, scripts are straight-line; no loops or conditionals. Programmes are small pipelines that glue queries together.
  - Meta-rationality is expressed by composing multiple primitives (e.g., check base facts, then temporary context, then combine into a final decision) rather than by imperative branching.

## Public API

- `constructor({ api, conceptStore, config })`
  - `api`: instance of `EngineAPI` used for ingest, `ask`, `abduct`, `counterfactualAsk`.
  - `conceptStore`: the shared `ConceptStore`, used for direct fact enumeration when needed.
  - `config`: `Config` instance; DSL engine is deterministic and respects same limits.

- `runScript(lines, { initialEnv } = {}) -> env`
  - `lines`: array of raw Sys2DSL lines (possibly containing multiple statements separated by additional `@` tokens).
  - `initialEnv` (optional): seed environment, for example binding `$proc` or `$action` before executing a programme.
  - The engine first splits all lines into individual statements and then analyses variable dependencies between them.
  - Statements are evaluated in a **topologically sorted** order based on their `$var` references, not purely in textual order:
    - if statement `@b ... $a ...` depends on `@a`, then `@a` must be evaluated before `@b` even if `@b` appears first in the file;
    - references to not-yet-bound variables are allowed as long as the dependency graph is acyclic.
  - Cyclic dependencies between variables (for example `@a ... $b ...` and `@b ... $a ...`) must be detected and reported as deterministic errors.
  - Returns final environment map; callers conventionally read a specific variable (e.g. `result`) to interpret outcomes.
  - Facts are only ingested when a statement uses an explicit `ASSERT` action; there is no implicit ingestion of free-standing triples.

- `executeCommand(env, tokens) -> updatedEnv`
  - Internal helper: interpret one `@var action ...` line.
  - Dispatches to primitive operations described below, stores the result under `env[varName]`.

## Built-in Actions (MLP Scope)

These actions form the stable core required for the MLP; they are intentionally small but sufficient to express the higher-level health, export, and narrative reasoning described in the specs.

- `ASK <question-string>`
  - Delegates to `EngineAPI.ask(question)`.
  - Stores the raw result object, typically `{ truth: 'TRUE_CERTAIN' | 'FALSE' | 'PLAUSIBLE' | 'UNKNOWN_TIMEOUT' }`.

- `ASSERT <Subject REL Object>`
  - Treats the arguments as a canonical fact triple in the constrained grammar (subject–relation–object), using token conventions (lowercase concepts, uppercase individuals).
  - Delegates to `EngineAPI.ingest` to update concepts, diamonds, and fact storage; returns a simple acknowledgment object (for example `{ ok: true, conceptId }`).

- `CF <question-string> | <fact1> ; <fact2> ; ...`
  - Runs `EngineAPI.counterfactualAsk(question, extraFacts)` with the given inline facts.
  - Intended for “what-if” macro steps (e.g., emergency context in law or narrative variations).

- `ABDUCT <observation> [RELATION]`
  - Delegates to `EngineAPI.abduct(observation, relation)` and stores result `{ hypothesis, band }`.
  - Supports both `CAUSES` and `CAUSED_BY` (and future causal relations) depending on facts.

- `FACTS_MATCHING <pattern>`
  - Pattern syntax: `SUBJ REL OBJ...` with `?` wildcards (e.g., `? REQUIRES *`, `$proc REQUIRES *`, `? PERMITS Magic_IN $city`).
  - Searches across base facts (and optional additional contexts supplied by the caller) via `ConceptStore.getFacts()`.
  - Returns an array of `{subject, relation, object}` triples.

- `ALL_REQUIREMENTS_SATISFIED <requirementsVar> <satisfiedVar>`
  - Reads two variables from the environment:
    - `$requirementsVar`: list of required items (e.g., all objects from `ProcedureX REQUIRES *`).
    - `$satisfiedVar`: list of facts that might satisfy them (e.g., `Consent GIVEN yes`, `AuditTrail PRESENT yes`).
  - Returns a normalised truth object `{ truth: 'TRUE_CERTAIN' | 'FALSE' }` by checking that every requirement is covered.

- `BOOL_AND <varA> <varB>`
  - Combines two truth objects (with `truth` fields) into a stricter result:
    - If either is `'FALSE'`, the result is `'FALSE'`.
    - If both are `'TRUE_CERTAIN'`, result is `'TRUE_CERTAIN'`.
    - Any other combination may degrade to `'PLAUSIBLE'` in future; the current MLP keeps a strict TRUE/FALSE combination without introducing new bands here.

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

- `BIND_CONCEPT <conceptToken>`
  - Treats `conceptToken` (lowercase identifier) as the name of a concept in the knowledge base.
  - Returns a **concept reference** object that can be stored in the environment and passed to other actions (for example, point-binding or explicit mask-controlled queries).

- `BIND_POINT <conceptToken>`
  - Resolves the concept’s geometric definition into one or more representative points in the conceptual space.
  - By default, returns a **point reference** representing the centres of all diamonds in the concept’s union; downstream actions may branch reasoning over each centre.

- `MASK_PARTITIONS <partition1> <partition2> ...`
  - Builds a mask reference that selects one or more named partitions (`ontology`, `axiology`, `empirical`, etc.) defined by `Config`.
  - Intended to give Sys2DSL programmes explicit control over which semantic subspaces participate in a reasoning step.

- `MASK_DIMS <dimName1> <dimName2> ...`
  - Builds a mask reference from a list of **named ontology/axiology dimensions** defined in the dimension catalog (for example `Temperature`, `MoralValence`, `Legality`).
  - The interpreter resolves each name to its configured index in the ontology/axiology partitions and sets the corresponding bits in a `Uint8Array` mask. Empirical/unnamed dimensions are not addressed by this action.

- `ASK_MASKED <maskVar> <question-string>`
  - Variant of `ASK` that takes a mask reference stored in `$maskVar` and applies it while reasoning about the question.
  - The effective mask is the intersection of the concept’s relevanceMask, any bias mode masks, and the explicit mask built through `MASK_*` actions.

The exact set of primitives may evolve, but every addition must:
- remain deterministic;
- have a clear mapping to geometric or symbolic operations in the core engine;
- avoid embedding domain-specific knowledge (no “health” or “magic” logic inside the interpreter).

## Script Structure and Theory Programmes

- Theory files and session scripts are free to mix:
  - Canonical facts in the constrained grammar (`Subject REL Object`) that prepare the conceptual space (root knowledge, domain axioms).
  - Sys2DSL assignments of the form `@varName action ...` that define intermediate values and final decisions.
- A typical health-compliance programme might look like:
  - `@reqs FACTS_MATCHING $procId REQUIRES`
  - `@givenAll FACTS_WITH_RELATION GIVEN`
  - `@satGiven FILTER $givenAll object=yes`
  - `@presentAll FACTS_WITH_RELATION PRESENT`
  - `@satPresent FILTER $presentAll object=yes`
  - `@allSat MERGE_LISTS $satGiven $satPresent`
  - `@result ALL_REQUIREMENTS_SATISFIED $reqs $allSat`
- CLI and higher-level APIs agree on conventional result variable names (`result`, `decision`, etc.) when interpreting outcomes.

## Notes and Constraints

- The DSL engine must not mutate shared state except through the public `EngineAPI` calls it wraps; it is a pure orchestrator over existing primitives.
- All parsing is whitespace-based and must be robust to extra spaces but not to arbitrary natural language; inputs are canonical sentences and command tokens, not arbitrary free text.
- Timeouts and limits (e.g., `maxReasonerIterations`) still apply because Sys2DSL primitives call back into the same reasoning paths; the interpreter itself should remain O(number of lines).
- Meta-rationality: complex domain behaviour (e.g., combining multiple regulations or narrative layers) is expressed by chaining primitives and reading environment variables rather than by bespoke JS code per domain.
- Future extensions (conditionals, loops, higher-order constructs) must be specified explicitly in this DS before implementation; the MLP intentionally restricts expressive power to keep execution predictable and easily auditable.

## Related Documents

For complete language specification and additional commands, see:

- **DS(/theory/Sys2DSL_syntax)** - Complete language syntax specification
- **DS(/theory/Sys2DSL_commands)** - Full command reference including:
  - Theory management: `LIST_THEORIES`, `LOAD_THEORY`, `SAVE_THEORY`, `MERGE_THEORY`
  - Relation commands: `DEFINE_RELATION`, `MODIFY_RELATION`, `BIND_RELATION`
  - Reasoning: `VALIDATE`, `PROVE`, `HYPOTHESIZE`
  - Memory: `GET_USAGE`, `FORGET`, `BOOST`
  - Output: `TO_NATURAL`, `EXPLAIN`
- **DS(/theory/Sys2DSL_arch)** - Data mapping and architecture
- **DS(/knowledge/usage_tracking)** - Usage counters for prioritization
- **DS(/knowledge/forgetting)** - Forgetting mechanisms

## Architectural Note

Sys2DSL is the **sole interface** for communicating with the AGISystem2 engine. All interactions - queries, assertions, theory management - must be expressed as Sys2DSL scripts. The engine receives scripts and returns scripts (or structured results that can be converted to natural language via `TO_NATURAL`).

This design ensures:
1. **Determinism**: Same script + same state = same results
2. **Auditability**: All operations are logged as Sys2DSL
3. **Composability**: Complex behaviors built from simple primitives
4. **Portability**: Scripts are plain text, version-controllable

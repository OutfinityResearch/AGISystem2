# Design Spec: src/theory/dsl_engine.js

ID: DS(/theory/dsl_engine.js)

Class `TheoryDSLEngine`
- **Role**: Interpret the Sys2DSL language that lives inside theory files and sessions, composing core reasoning primitives into reusable programmes (e.g., health compliance checks, export controls, narrative rules) without hard-coding domain behaviour in JS.
- **Pattern**: Interpreter over a line-oriented script. SOLID: single responsibility for parsing and executing Sys2DSL commands; it delegates all semantic work to `EngineAPI`, `Reasoner`, and `ConceptStore`.
- **Key Collaborators**: `EngineAPI` (for `ask`, `abduct`, `counterfactualAsk` and config), `ConceptStore` (for fact search), `Reasoner` (for low-level truth bands when needed), `Config` (for limits and profile), `System2Session`.

## Sys2DSL Overview (v3.0)

- Scripts are plain text Sys2DSL programmes interpreted line by line. They appear in two main places:
  - Theory files (persisted under version control).
  - Session scripts sent to a `System2Session`.
- Every script is a sequence of **statements**. **v3.0 enforces strict triple syntax**:
  - `@varName Subject VERB Object`
  - **Exactly 4 tokens**: variable, subject, verb, object
- Statement boundaries:
  - An `@` token that appears after other content on a line starts a new statement from that point.
  - Comments (for example lines starting with `#`) are ignored.
- Variables:
  - Names start with `@` at definition time and are referenced with `$name` inside arguments.
  - Values are opaque JS values from the engine's point of view (strings, truth objects like `{truth: 'TRUE_CERTAIN'}`, arrays of fact triples, concept/point references, masks, etc.).
  - The engine maintains an environment map `{ name: value }` updated in order of appearance.
- **v3.0 Token conventions**:
  - **Subject position**: Concept names (lowercase), Individuals (First_cap), or variables ($var)
  - **VERB position**: Relations/operations in ALL_CAPS (IS_A, HAS_PROPERTY, QUERY, etc.)
  - **Object position**: Concepts, values, or variables
  - **Special**: `any` replaces wildcards
  - **Options**: Use underscore notation (e.g., `limit_5` not `limit=5`)
  - **NO `property=value` syntax**: Replaced by underscore notation or separate statements
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
  - **v3.0**: Facts are ingested using triple syntax `@var Subject VERB Object` where VERB is a relation like IS_A, HAS_PROPERTY, etc.

- `executeCommand(env, tokens) -> updatedEnv`
  - Internal helper: interpret one `@var Subject VERB Object` statement.
  - **v3.0**: Enforces exactly 4 tokens (variable, subject, verb, object)
  - Dispatches to primitive operations described below, stores the result under `env[varName]`.

## Built-in Actions (MLP Scope) - v3.0 Triple Syntax

These actions form the stable core required for the MLP; they are intentionally small but sufficient to express the higher-level health, export, and narrative reasoning described in the specs.

**All actions now use strict triple syntax: `@var Subject VERB Object`**

- `@var Subject RELATION Object` (Facts)
  - Treats the statement as a canonical fact triple using triple syntax.
  - Subject is the entity, RELATION is the verb (IS_A, HAS, CAUSES, etc.), Object is the value.
  - Delegates to `EngineAPI.ingest` to update concepts, diamonds, and fact storage.
  - Whether this is a query or assertion is determined by geometric reasoning

- `@var Query CF <question-string>`
  - Runs `EngineAPI.counterfactualAsk(question, extraFacts)` with the given inline facts.
  - Question format: `"<query> | <fact1> ; <fact2> ; ..."`
  - Intended for "what-if" macro steps (e.g., emergency context in law or narrative variations).
  - **v3.0**: Query is subject, CF is verb, question with facts is object

- `@var Observation ABDUCT Relation`
  - Delegates to `EngineAPI.abduct(observation, relation)` and stores result `{ hypothesis, band }`.
  - Supports `CAUSES`, `CAUSED_BY` (and future causal relations) depending on facts.
  - **v3.0**: Observation is subject, ABDUCT is verb, relation is object

- `@var Subject FACTS Object`
  - Object uses `any` as wildcard
  - Searches across base facts via `ConceptStore.getFacts()`.
  - Returns an array of `{subject, relation, object}` triples.
  - Example: `@facts Dog FACTS any` returns all facts about Dog

- `@var $requirements ALL_REQUIREMENTS_SATISFIED $satisfied`
  - Reads two variables from the environment:
    - `$requirements`: list of required items (e.g., all objects from `ProcedureX REQUIRES any`).
    - `$satisfied`: list of facts that might satisfy them (e.g., `Consent GIVEN yes`, `AuditTrail PRESENT yes`).
  - Returns a normalised truth object `{ truth: 'TRUE_CERTAIN' | 'FALSE' }` by checking that every requirement is covered.
  - **v3.0**: Requirements is subject, ALL_REQUIREMENTS_SATISFIED is verb, satisfied is object

- `@var $varA BOOL_AND $varB`
  - Combines two truth objects (with `truth` fields) into a stricter result:
    - If either is `'FALSE'`, the result is `'FALSE'`.
    - If both are `'TRUE_CERTAIN'`, result is `'TRUE_CERTAIN'`.
    - Any other combination may degrade to `'PLAUSIBLE'` in future; the current MLP keeps a strict TRUE/FALSE combination without introducing new bands here.
  - **v3.0**: First operand is subject, BOOL_AND is verb, second operand is object

- `@var $list PICK_FIRST none`
  - Returns first element of an array variable, used for simple abduction macros where only one hypothesis is needed.
  - **v3.0**: List is subject, PICK_FIRST is verb, object is placeholder

- `@var $list NONEMPTY none`
  - Interprets a list-valued variable as a truth object: returns `{ truth: 'TRUE_CERTAIN' }` if the list is non-empty, `{ truth: 'FALSE' }` otherwise.
  - **v3.0**: List is subject, NONEMPTY is verb, object is placeholder

- `@var $listA MERGE_LISTS $listB`
  - Concatenates two list variables (used to union hits from separate `FACTS` calls, e.g. different positive evidence shapes) and stores the combined array.
  - **v3.0**: First list is subject, MERGE_LISTS is verb, second list is object

- `@var $negList POLARITY_DECIDE $posList`
  - Aggregates negative and positive evidence for a set of "active" labels (e.g., regulations).
  - For the active set:
    - if both negative and positive lists contain hits for some label, returns `{ truth: 'CONFLICT' }`;
    - if only negative hits exist, returns `{ truth: 'FALSE' }`;
    - if only positive hits exist, returns `{ truth: 'TRUE_CERTAIN' }`;
    - if there are no hits at all, returns `{ truth: 'FALSE' }`.
  - This is used for export-style decisions but remains semantically generic: it reasons about conflicting vs. aligned signals without naming any specific domain.
  - **v3.0**: Negative list is subject, POLARITY_DECIDE is verb, positive list is object

- `@var ConceptName BIND_CONCEPT none`
  - Treats `ConceptName` (lowercase identifier) as the name of a concept in the knowledge base.
  - Returns a **concept reference** object that can be stored in the environment and passed to other actions (for example, point-binding or explicit mask-controlled queries).
  - **v3.0**: Concept name is subject, BIND_CONCEPT is verb, object is placeholder

- `@var ConceptName BIND_POINT none`
  - Resolves the concept's geometric definition into one or more representative points in the conceptual space.
  - By default, returns a **point reference** representing the centres of all diamonds in the concept's union; downstream actions may branch reasoning over each centre.
  - **v3.0**: Concept name is subject, BIND_POINT is verb, object is placeholder

- `@var partition_name MASK any`
  - Builds a mask reference that selects one or more named partitions (`ontology`, `axiology`, `empirical`, etc.) defined by `Config`.
  - Intended to give Sys2DSL programmes explicit control over which semantic subspaces participate in a reasoning step.
  - **v3.0**: Partition name is subject, MASK is verb, object is `any`
  - For dimension-specific masks, use dimension names in subject position (e.g., `Temperature_MoralValence_Legality`)
  - The interpreter resolves each name to its configured index in the ontology/axiology partitions and sets the corresponding bits in a `Uint8Array` mask.

- `@var Subject QUERY Object` with mask
  - Apply masks through theory layer or control points (see theory documentation)
  - The effective mask is the intersection of the concept's relevanceMask, any bias mode masks, and the explicit mask built through `MASK` verb
  - Example: First create mask with `@mask ontology MASK any`, then use in query context

The exact set of primitives may evolve, but every addition must:
- remain deterministic;
- have a clear mapping to geometric or symbolic operations in the core engine;
- avoid embedding domain-specific knowledge (no “health” or “magic” logic inside the interpreter).

## Script Structure and Theory Programmes (v3.0)

- Theory files and session scripts use strict triple syntax:
  - Canonical facts: `@var Subject RELATION Object` (e.g., `@f1 Dog IS_A mammal`)
  - Operations: `@var Subject VERB Object` (e.g., `@result Dog QUERY mammal`)
  - All statements have exactly 4 tokens: variable, subject, verb, object
- A typical health-compliance programme might look like:
  - `@reqs $procId FACTS REQUIRES`
  - `@givenAll all FACTS GIVEN`
  - `@satGiven $givenAll FILTER yes`
  - `@presentAll all FACTS PRESENT`
  - `@satPresent $presentAll FILTER yes`
  - `@allSat $satGiven MERGE_LISTS $satPresent`
  - `@result $reqs ALL_REQUIREMENTS_SATISFIED $allSat`
- CLI and higher-level APIs agree on conventional result variable names (`result`, `decision`, etc.) when interpreting outcomes.

## Notes and Constraints (v3.0)

- **v3.0 Strict Triple Syntax**: Every statement MUST have exactly 4 tokens: `@var Subject VERB Object`
- The DSL engine must not mutate shared state except through the public `EngineAPI` calls it wraps; it is a pure orchestrator over existing primitives.
- All parsing is whitespace-based and must be robust to extra spaces but not to arbitrary natural language; inputs are canonical sentences and command tokens, not arbitrary free text.
- **v3.0 Parser Validation**: Parser enforces triple syntax and rejects:
  - `property=value` syntax (use underscore notation instead)
  - Wildcard `any` replaces all wildcards
- Timeouts and limits (e.g., `maxReasonerIterations`) still apply because Sys2DSL primitives call back into the same reasoning paths; the interpreter itself should remain O(number of lines).
- Meta-rationality: complex domain behaviour (e.g., combining multiple regulations or narrative layers) is expressed by chaining primitives and reading environment variables rather than by bespoke JS code per domain.
- Future extensions (conditionals, loops, higher-order constructs) must be specified explicitly in this DS before implementation; the MLP intentionally restricts expressive power to keep execution predictable and easily auditable.

## Related Documents

For complete language specification and additional commands, see:

- **DS(/theory/Sys2DSL_syntax)** - Complete language syntax specification
- **DS(/theory/Sys2DSL_commands)** - Full command reference including:
  - Theory management: `THEORIES`, `LOAD`, `SAVE`, `MERGE_THEORY`
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

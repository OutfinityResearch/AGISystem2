# AGISystem2 - System Specifications
#
# DS24: Pure Symbolic Term Engine (Baseline Backend) — Exploratory
#
# **Document Version:** 1.0
# **Status:** Exploratory (not planned for implementation)
# **Audience:** Runtime/Reasoning developers, eval authors
# **Related:** DS02 (DSL), DS03 (Architecture), DS05/DS06 (Reasoning), DS16 (CSP), DS17 (Priority modes), DS19 (Proof real)
#
# Goal: define a *purely symbolic* backend that accepts the same Sys2DSL but executes on
# symbolic terms + unification + backtracking (no HDC vectors), so we can measure what
# (if anything) HDC adds over a strong symbolic baseline.

---

## 1. Executive Summary

AGISystem2 currently supports two “motors” selected by HDC strategy and reasoning priority (DS01 §1.10, DS17):
- **HDC-Priority** (`dense-binary`): Master Equation + similarity-based retrieval, with symbolic validation/fallback.
- **Symbolic-Priority** (`sparse-polynomial`, `metric-affine`): reasoning is primarily symbolic, while vectors still exist as a structural substrate.

This spec introduces a **third backend**:

> **Pure Symbolic Term Engine**: a runtime that executes Sys2DSL on **symbolic terms** (atoms, numbers, lists, compound terms), using **unification + backtracking** for `query/findAll/prove/solve`, and **without requiring vectors** at all.

This backend is designed for:
- **Ablation studies**: “HDC vs pure symbolic” under the same DSL and test harness (FastEval).
- **Deterministic proofs**: proofs are native derivation objects (DS19), not “decoded from vectors”.
- **Extensibility**: performance-critical operators can be accelerated via **JavaScript extensions** while keeping semantics and proofs consistent (“fastEval path”).

**Note (project status):** This document is kept as an exploratory design reference. Implementing a fully separate symbolic-term backend is intentionally **not** planned in the near term due to high compatibility and maintenance costs (proof rendering, graph/macro execution parity, semantic drift risk). When we need a “pure symbolic” baseline for performance comparisons, the preferred approach is to add a *symbolic-only profile* to the existing engine (disable HDC candidate generation) rather than introducing a new backend.

---

## 2. Design Goals / Non-goals

### 2.1 Goals

G1. **DSL compatibility (front-end)**  
The engine SHALL accept the same Sys2DSL grammar as DS02 and the current parser (`src/parser/*`): statements, `@dest` forms, `$refs`, `?holes`, lists, compound `(op ...)`, graphs/macros, solve blocks.

G2. **Symbolic semantics (backend)**  
Execution SHALL be defined in terms of symbolic values and term unification (no vector algebra, no similarity thresholds).

G3. **Proof-real outputs**  
`prove()` and derived answers SHALL emit a machine-checkable proof object compatible with DS19’s schema requirements (or a strict subset), and be convertible into the existing “proof_nl” textual expectations used by FastEval.

G4. **Extension / acceleration**  
The engine SHALL support registering JS evaluators (“extensions”) for selected operators (e.g. arithmetic, rewrite systems, domain packs). Extensions MUST be:
- deterministic (unless explicitly marked “nondeterministic” and then forbidden in FastEval),
- semantics-preserving (producing equivalent canonical terms),
- proof-producing (each extension evaluation yields a proof step that can be validated/replayed).

G5. **Comparable evaluation to current engines**  
FastEval runs SHOULD be able to swap between:
- existing vector+hybrid engine
- pure symbolic term engine
and get identical answers, and proofs that are either identical or accepted as `alternative_proof_nl`.

### 2.2 Non-goals

N1. **Analogical / fuzzy similarity** is not a goal for the pure symbolic backend (that’s HDC’s domain).

N2. **Replacing current engines** is not the goal. This backend is additive and used for research + benchmarking.

---

## 3. Architecture: Multi-Backend Runtime (Proposed)

### 3.1 Backend selection

Introduce a runtime-level selector (proposed; does not exist today):

- `SYS2_BACKEND=vector` (default; current engine)
- `SYS2_BACKEND=symbolic-term` (new; this spec)

Programmatic equivalent:

```js
new Session({ backend: 'symbolic-term' })
```

### 3.2 Shared front-end, backend-specific execution

The system SHALL be structured as:

```
DSL text
  → Parser (existing) → AST
  → Canonicalizer (DS19) → Canonical AST / Canonical metadata
  → Backend Executor:
        - Vector backend (existing)
        - Symbolic-Term backend (this DS24)
  → Query / Prove / FindAll / Solve engines for the selected backend
```

**Key invariant:** the AST and canonicalization pipeline are shared so that the same `.sys2` theory files and FastEval suites can be reused.

---

## 4. Core Data Model (Symbolic)

### 4.1 Values and Terms

The symbolic backend SHALL represent computed values using a small closed set:

```ts
Value :=
  Atom(name: string)
| Num(value: number)              // DSL numeric literals
| Str(value: string)              // DSL string literals
| List(items: Value[])
| Term(functor: string, args: Value[])
```

Notes:
- `functor` is the operator name as written in DSL after canonicalization (DS19).
- `Atom` is used for identifiers (entities, predicates-as-values, etc.).

### 4.2 Patterns (for matching/unification)

For matching, we need variables:

```ts
Pattern :=
  PAtom(name: string)
| PNum(value: number)
| PStr(value: string)
| PList(items: Pattern[])
| PTerm(functor: string, args: Pattern[])
| PVar(name: string)              // from ?x holes
```

### 4.3 Environments and substitutions

- `Env` is a map `VarName -> Value`.
- Substitutions MUST be applied recursively (deep substitution).

---

## 5. Statement Semantics (Execution Model)

The symbolic backend MUST preserve DS02’s persistence rules for destinations.

### 5.0 Expression evaluation (AST → Value)

The backend SHALL evaluate DSL expressions as follows:

- `Identifier(name)` → `Atom(name)` (after canonicalization).
- `Literal(number)` → `Num(n)`; `Literal(string)` → `Str(s)`.
- `List([e1,...])` → `List([v1,...])`.
- `Reference($x)` → lookup `x` in the current scope; error if unbound.
- `Compound((op a b ...))`:
  - evaluate as a nested operator application using the same operator-resolution order as statements (builtins → graph → constructor),
  - returning a `Value` to be used as an argument to the outer statement.

`Hole(?x)` is not a `Value` and SHALL only be valid in:
- query patterns (`query/findAll`),
- rule templates / graph templates (where it becomes a `PVar("x")`).

### 5.1 Destinations

For a statement of the form:

```
@dest[:persist] op arg1 arg2 ...
```

Destinations map to where the produced `Value` is stored:

| DSL form | Scope binding | KB assertion |
|---------|---------------|--------------|
| `@x ...` | yes (`x`) | no |
| `@:name ...` | no | yes (named fact) |
| `@x:name ...` | yes (`x`) | yes (named fact) |
| `@_ ...` | no | no (discard) |
| no `@` | no | yes (anonymous fact) |

### 5.2 Operator resolution order

Given operator `op`:

1) If `op` is a registered **builtin/extension evaluator** → evaluate it (may yield a Value and/or KB updates).  
2) Else if `op` is a defined **graph/macro** → execute the graph body (new child scope) and use its `return`.  
3) Else → treat it as a **predicate constructor** and build `Term(op, args)` (no evaluation).

### 5.2.1 Theory/import handling (compatibility)

Sys2DSL includes `theory` and `import` blocks. For the pure symbolic backend:
- A `theory` declaration SHOULD define a namespace for atoms/graphs (no vector identity required).
- `import TheoryName` SHOULD be treated as “load that namespace into the active resolution stack”.
- `Load`/`Unload` (Core theory management verbs) MAY be implemented as builtins that alias `import`/unimport behavior to remain compatible with existing `.sys2` files and FastEval runners.

### 5.2.2 `rule` declarations (syntax sugar)

If the parser produces a `rule` AST node (DS02 / current parser support), the backend SHOULD desugar it into the canonical Core connective form:

```
@cond ...        # condition term
@conc ...        # conclusion term
@r Implies $cond $conc
```

The exact desugaring shape is not user-visible as long as the resulting KB rule is equivalent under canonicalization and produces DS19-compatible proof objects.

### 5.3 Facts in KB

The KB stores **facts** as canonical surface terms:

```ts
Fact := {
  id: stableId,
  name?: string | null,     // from @:name or @x:name
  term: Term,               // surface form: Term(op, [...args])
  provenance?: object       // optional: source location, canonicalization steps, extension used
}
```

**Rule:** A statement becomes a KB fact iff its destination rules say “KB assertion”.

### 5.4 Graph invocation and “surface vs expansion”

To keep DS19’s “canonical metadata is authoritative” consistent with today’s engine:
- The **surface fact** of a statement is always `Term(op, args)` (after canonicalization), regardless of whether `op` is implemented as a graph.
- Graph execution MAY additionally produce an **expansion term** (internal structure). The backend MAY:
  - discard expansions (minimal mode), or
  - store expansions as separate facts (introspection mode), or
  - attach them as provenance.

FastEval compatibility requires only the surface semantics and proof chain to be correct.

---

## 6. Knowledge Base Indexing (Symbolic)

### 6.1 Required indices

To avoid full scans, the KB SHOULD maintain:

1) `pred/arity -> factIds[]`  
2) Optional per-position index: `pred/arity/pos/value -> factIds[]` for ground arguments.

The minimum required for correctness is (1); (2) is an optimization.

### 6.2 Canonicalization boundary

All KB storage and all matching MUST use **canonicalized** operator names and argument tokens per DS19 (alias/canonical/synonym handling), so that different surface DSL spellings unify in the KB.

---

## 7. Reasoning Semantics

This backend is “symbolic-first by construction”. It defines reasoning in terms of:
- unification,
- backtracking search,
- theory-driven relation properties (transitive/symmetric/reflexive/inheritable) consistent with `SemanticIndex` (DS19/`src/runtime/semantic-index.mjs`),
- optional CSP solving (DS16).

### 7.1 Unification (normative)

`unify(pattern, value, env)` returns either failure or an extended environment.

Rules:
- `PVar(x)`:
  - if `env[x]` unbound → bind `x := value`
  - else → must unify `env[x]` with `value`
- `PTerm(f,args)` unifies only with `Term(f,args2)` with same functor and arity and recursive unification on args.
- Lists unify element-wise.
- Atoms/numbers/strings unify only if equal.

Occurs-check is OPTIONAL; if omitted, the implementation MUST remain terminating for the DSL subset used in FastEval.

### 7.2 findAll(pattern)

`findAll("pred ?x A")` enumerates **all** bindings consistent with KB facts (DS16).

Algorithm:
- Parse into a goal pattern `PTerm(pred, [...])`.
- Use `pred/arity` index to iterate candidate facts.
- Unify each fact term with the pattern; collect successful bindings.
- Return a list of substitutions in a stable order (e.g., insertion order of facts).

### 7.3 query (hole-filling)

For a single-hole query, `query()` can be implemented as `findAll()` plus a selection policy.

For multi-hole queries:
- the backend SHOULD return all solutions (like `findAll`) when used by CSP,
- but MAY return “top-N” solutions for UI parity with the vector engine.

**Important:** Unlike HDC unbinding, symbolic query is exact. Ranking is optional and must not affect correctness (only ordering).

### 7.4 prove(goal): backward chaining + theory properties

`prove` SHALL attempt to establish whether a ground goal `Term(op,args)` is derivable.

Minimum supported inference (matching current system capabilities):

1) **Direct fact**: goal unifies with an existing KB fact.
2) **Rules (`Implies`)**: treat a rule fact as `Implies(cond, concl)`.
   - If `concl` unifies with goal under bindings `θ`, recursively prove `condθ`.
3) **Compound conditions**: `And/Or/Not` over sub-goals.
4) **Transitive relations**: if `SemanticIndex.isTransitive(op)`, allow chain proof for binary relations (e.g., `isA`, `before`, `causes`).
5) **Symmetric/reflexive/inverse** if declared by theory (same source as current engine).
6) **Default reasoning / exceptions** if enabled (DS06 + config/Core/08-defaults.sys2 semantics).
7) **Negation handling**:
   - explicit negation facts (`Not inner`) MUST block positive proofs (as in current engine),
   - optional CWA (`Set CWA on`) MAY enable negation-as-failure as an assumption, recorded in proofs.

### 7.5 Proof object (DS19 compatibility)

The symbolic backend SHALL produce:
- a structured proof tree (internal),
- and a DS19-compatible proof object with `steps[]` that can be validated/replayed.

It MUST be possible to derive the user-facing `proof_nl` text from proof steps in a stable way (FastEval uses substring containment checks).

---

## 8. CSP Integration (DS16)

The symbolic backend SHOULD expose the same solve surface:
- `findAll` for domain enumeration,
- `solve` blocks for structured CSP problems,
- backtracking with pruning (MRV/forward-checking optional).

Constraints MAY call:
- builtins that return boolean values, and/or
- `prove()` on derived subgoals.

Proof output for CSP SHOULD include constraint satisfaction evidence (at least: which constraint rejected which assignment).

---

## 9. Extensions and “fastEval path” (JS Accelerators)

### 9.1 Extension registry

The backend SHALL provide a registry:

```ts
registerBuiltin(name: string, fn: (args: Value[], ctx: EvalContext) => EvalResult)
```

where:

```ts
EvalResult := {
  value: Value,
  // optional side effects (disciplined):
  assertedFacts?: Term[],
  proofStep: ProofStep
}
```

### 9.1.1 “Fast vs canonical” execution modes (recommended)

To keep “language-defined semantics” as the source of truth while still allowing speed:
- each operator MAY have:
  - a **fast evaluator** (JS builtin) and
  - a **canonical evaluator** (symbolic derivation, graph expansion, or rewrite system).

When both exist, the engine SHOULD support a mode where:
1) fast evaluator produces a candidate result quickly, and
2) canonical evaluator validates equivalence (or proves the same conclusion) within a budget.

Proofs MUST record which path was taken:
- `kind: "derived"` for a direct canonical derivation,
- `kind: "validation"` when a fast result was symbolically validated,
- and MUST NOT claim validation if the canonical check was skipped or timed out.

### 9.2 Semantics preservation requirement

Extensions MUST be semantics-preserving under canonicalization:
- If the extension returns a reduced value (e.g., arithmetic), it MUST be provably equivalent to the unreduced term form.
- Equivalence MUST be recorded in the proof:
  - either as a rewrite step (`derived`),
  - or as a `validation` step referencing the rule set used.

### 9.3 Partial evaluation (recommended)

For arithmetic-like operators:
- if arguments are fully concrete → compute immediately,
- else → return an uninterpreted term so other reasoning can proceed.

Example policy:

```
add(Num(2), Num(3)) → Num(5)
add(Num(2), Atom("x")) → Term("add",[Num(2), Atom("x")])
```

### 9.4 Determinism for FastEval

FastEval runs assume deterministic behavior. Therefore:
- any builtin that uses randomness MUST be disallowed (or must accept a provided deterministic seed and record it in proof).
- any builtin that depends on wall-clock, filesystem state, or network MUST be disabled under FastEval.

---

## 10. FastEval Compatibility Contract

FastEval (`evals/fastEval`) validates:
1) expected answer text (normalized substring checks), and
2) proof text presence and minimum length, and
3) that `proof_nl` (or `alternative_proof_nl`) substrings appear under “Proof: …”.

Therefore the symbolic-term backend MUST:
- produce the same answers (or equivalent paraphrases via `Session.generateText`),
- produce proofs that include the expected proof fragments, even if the internal proof structure differs.

Recommended proof-to-text strategy:
- Include the concrete supporting facts as `op arg1 arg2` fragments (or their NL rendering).
- Prefer “Because A. And B. Therefore C.” structure to avoid circular/tautological traces.

---

## 11. Evaluation Plan: HDC vs Pure Symbolic

### 11.1 Metrics

For each suite and configuration:
- Pass rate (FastEval)
- Runtime per step and per suite
- Proof quality proxies (length, number of evidence steps, absence of tautologies)
- Method counts (for existing engine: `reasoningStats.hdcUsefulOps`; for symbolic-term: `reasoningStats.symbolicOps` analog)

### 11.2 Comparison matrix

At minimum compare:
- Current engine: `dense-binary` + `symbolicPriority`
- Current engine: `dense-binary` + `holographicPriority`
- Pure symbolic backend

Optionally add:
- Current engine: `sparse-polynomial` (`k=1`) as “symbolicPriority + minimal vector substrate”

### 11.3 Acceptance criteria

The symbolic-term engine is “good enough as baseline” when:
- FastEval pass rate matches current `symbolicPriority` pass rate on the same suites.
- Proofs satisfy all `proof_nl` expectations, using `alternative_proof_nl` where allowed.
- Performance is within an acceptable factor (goal: within 2× of current `symbolicPriority` on CPU-bound suites).

---

## 12. Implementation Notes (Non-normative)

Suggested module layout (parallel to `src/runtime` + `src/reasoning`):

```
src/symbolic-term/
  values.mjs          // Value/Term constructors
  unify.mjs           // unification + substitution
  kb.mjs              // facts + indices
  executor.mjs        // statement execution (scope + KB)
  query.mjs           // query / findAll
  prove.mjs           // backward chaining + proof
  builtins/           // extension packs (math, sets, ...)
```

Maintain a thin adapter layer so `Session` can delegate to either backend while keeping:
- parser,
- canonicalization,
- response translation / proof formatting,
unchanged.

---

*End of DS24*

# AGISystem2 - System Specifications
#
# DS50: CompilationCore — Deterministic Compilation to SMT-LIB2 (v0)
#
**Document Version:** 0.1  
**Status:** Draft / Proposed  
**Audience:** Runtime + reasoning + tooling developers  
**Scope:** Deterministic compilation + artifacts + evidence contracts  

---

## 1. Purpose

Define a deterministic compilation target for a constrained subset of AGISystem2 Content IR into SMT-LIB2:

- suitable for audit and reproducibility (stable hashing),
- compatible with URC storage semantics (DS49),
- integrated with Evidence/Artifact records,
- usable as a backend under an Orchestrator (capabilities + fragments).

This DS defines compilation semantics only. Executing an external SMT solver is handled by an adapter (out of scope for v0).

---

## 2. Input model (v0 fragment)

The v0 compilation target supports a conservative fragment:

- Boolean structure: `And`, `Or`, `Not`, `Implies`
- Quantifiers: optional in v0; disabled by default unless a solver policy enables them
- Equality and order predicates: `equals`, `lt`, `leq`, `gt`, `geq`
- Arithmetic terms (typed):
  - `Add`, `Sub`, `Mul`, `Div`, `Neg`
  - `Pow` is **not** supported in v0 (route to a different backend)

Canonical predicate anchors for this DS (URC pack):

- `config/Packs/URC/01-content-core.sys2` defines `lt/leq/gt/geq` and related constructor helpers.

Implementation note:

- The current Kernel numeric layer does not yet provide a single canonical term IR for `Add/Sub/Mul/Div/Neg`.
- DS50 treats those term constructors as part of the *future* normalized Content IR expected by compilation.

Types (v0):

- `Bool`, `Int`, `Real`

Units (v0):

- units must be normalized away before compilation; dimensional checks happen upstream (Type/Unit services).

---

## 3. Deterministic normalization pipeline

Compilation requires a deterministic normalization step (recorded in provenance):

1) Parse Content IR into a typed AST (or reject).
2) Alpha-rename variables deterministically (`?x0`, `?x1`, ...), based on first occurrence in a stable traversal.
3) Canonicalize commutative operators:
   - `And` / `Or` / `Add` / `Mul`: sort operands by a stable key.
4) Normalize numeric literals to canonical string form:
   - integers as decimal,
   - rationals as `(/ p q)` representation when possible,
   - reals in a canonical decimal string (avoid float formatting drift).
5) Type-check (must succeed for SMT compilation).
6) Unit-check (must succeed; otherwise route away or produce evidence of failure).

All normalization decisions must be attachable to ProvenanceCore objects (UTE direction; DS34/DS49).

---

## 4. SMT-LIB2 emission rules

### 4.1 Sort mapping

- `Bool` → `Bool`
- `Int` → `Int`
- `Real` → `Real`

### 4.2 Symbols

Variables:

- Sys2 holes/variables (e.g. `?x`) compile to SMT symbols with a stable prefix:
  - `?x` → `v_x` (or `v0`, `v1` after alpha-renaming).

Constants / entities:

- In v0, compilation targets numeric/boolean fragments only.
- Uninterpreted entities require a different fragment policy and are out of scope.

### 4.3 Term mapping

- `Add(a,b,...)` → `(+ a b ...)`
- `Sub(a,b)` → `(- a b)`
- `Mul(a,b,...)` → `(* a b ...)`
- `Div(a,b)`:
  - Int division is disallowed in v0 (route away), unless a policy chooses `div`
  - Real division → `(/ a b)`
- `Neg(a)` → `(- a)`

### 4.4 Predicate mapping

- `equals(a,b)` → `(= a b)`
- `lt(a,b)` → `(< a b)`
- `leq(a,b)` → `(<= a b)`
- `gt(a,b)` → `(> a b)`
- `geq(a,b)` → `(>= a b)`

### 4.5 Boolean mapping

- `And(a,b,...)` → `(and a b ...)`
- `Or(a,b,...)` → `(or a b ...)`
- `Not(a)` → `(not a)`
- `Implies(a,b)` → `(=> a b)`

---

## 5. Goal mapping (v0)

URC Goals (DS49) map to SMT requests:

- `Prove(target)`:
  - compile `Not(target)` as the assertion and request `check-sat`
  - `unsat` is evidence of validity (within the fragment and solver trust model)
- `Find(vars, constraints)`:
  - assert constraints and request `check-sat` + `get-model`

Optimization is out of scope for SMT-LIB2 v0 (route to MIP/LP backends later).

---

## 6. Artifacts and evidence

Compilation must emit a SolverArtifact record:

- `artifactFormat = SMTLIB2`
- `artifactHash = sha256(text)` (stable)
- `artifactText = emitted SMT-LIB2` (stored or referenced)

Backend execution (outside this DS) returns Evidence shapes:

- `Sat` with `Model` artifact (for Find)
- `Unsat` with `UnsatCore` artifact when enabled by solver settings
- `Unknown` with diagnostic artifacts (optional)

Evidence must link back to:

- the compiled artifact,
- the normalized input object(s),
- solver tool/method metadata.

---

## 7. Capability registry integration

A backend that supports DS50 must advertise at least:

- `supportsFragment(Frag_SMT_LIA|Frag_SMT_LRA)`
- `supportsGoal(Prove|Find)`
- evidence kinds produced (`Model`, `UnsatCore`, `ProofLog` if available)

The Orchestrator uses fragment + goal kind + evidence requirements to decide routing.

### 7.1 v0 internal backend name

In the current repository implementation, a compile-only internal backend adapter is used:

- backend id: `Compile_SMTLIB2`
- output: an `Artifact(format=SMTLIB2, hash=...)`

Default preference/capability facts are shipped under the URC pack:

- `config/Packs/URC/14-backend-capabilities-defaults.sys2`
- `config/Packs/URC/15-backend-preferences-defaults.sys2`

---

## 8. Non-goals (v0)

- Full FOL with quantifiers and uninterpreted functions.
- Floating-point semantics.
- Nonlinear arithmetic (`Pow`, `Mul(var,var)` under `Real`).
- Proof production / proof checking.
- External process execution and sandbox policy.

---

*End of DS50*

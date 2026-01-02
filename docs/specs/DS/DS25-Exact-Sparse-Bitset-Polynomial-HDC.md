# AGISystem2 - System Specifications

# DS25: Exact Sparse Bitset Polynomial HDC (EXACT / “Exact-Sparse”)

**Document Version:** 0.9  
**Author:** Sînică Alboaie  
**Status:** Implemented (v0; persistence deferred)  
**Audience:** Technical Architects, HDC Researchers, Core Developers  

---

## 1. Executive Summary

This document specifies **EXACT** — a new HDC strategy for AGISystem2 that keeps the HDC Facade/Contract (`createFromName`, `bind`, `bundle`, `unbind`, `similarity`, `topKSimilar`, serialization) while changing the internal representation to an **exact, lossless** sparse polynomial over **bitset monomials**.

EXACT is designed for cases where you want:

- **Zero collisions for declared atoms** (no hash/PRNG identity risk inside a session)
- **Elastic capacity by construction** (BigInt grows as new atoms appear)
- A query flow that can expose **explicit ambiguity** via multiple candidates rather than relying on noisy geometric cleanup

Core idea:

- Each **atom** gets a deterministic **appearance index** `i` inside a session (a stable integer ID).
- The atom vector is **one-hot**: `2^i` (a `BigInt` with one bit set).
- A “hypervector” is a **set of monomials**, each monomial a `BigInt` bitset of included atoms.
- `BUNDLE` is **set union** (lossless superposition).
- `BIND` is **polynomial multiplication** where monomial×monomial = bitwise **OR** (set union of atoms).
- `UNBIND` is not required to equal `BIND`; for EXACT it is defined as a **quotient-like extraction** (see §6).

This strategy is compatible with structured records built with **position markers** (DS07a) by encoding facts as a single monomial that ORs operator, positions, and arguments, then bundling (union) them into the KB.

---

## 2. Design Goals / Non-goals

### 2.1 Primary Goals

- **G1 — Strategy contract compatibility:** pluggable strategy under `src/hdc/strategies/` registered in the strategy registry (DS03/DS09 patterns).
- **G2 — Exactness (lossless):** no sparsification/hashing inside the strategy; representation is exact for the atom dictionary of the session.
- **G3 — Position-vector compatibility:** preserve DS07a “no permutation; use Pos1..Pos20” modeling pattern.
- **G4 — Deterministic atom identity within a session:** stable appearance indices with a fast dictionary mapping.
- **G5 — Reasoning-friendly UNBIND:** define UNBIND semantics for “pattern completion” on set-of-facts KBs, plus optional richer unbind variants for scoring.

### 2.2 Non-goals

- Order-independent, global determinism across arbitrary load orders. EXACT is deterministic **given a deterministic load order** (core then user, stable file order).
- Matching dense-binary “random quasi-orthogonality” behavior; EXACT is not a random geometry.
- “UNBIND ≡ BIND” (self-inverse) behavior; that equivalence is strategy-dependent and not required by the contract.

---

## 3. Atom Appearance Index Dictionary (New Requirement)

EXACT introduces a strategy-level/session-level concept: an **Atom Appearance Index Dictionary**.

### 3.1 Definition

Let `A` be the set of atom names declared/seen in a session. EXACT maintains:

- `atomToIndex: Map<string, number>` (name → appearance index)
- `indexToAtom: string[]` (appearance index → name)

For any atom `name`:

- If `name` is present, its index is returned.
- If absent, a new index is assigned by **append** (next available integer).

### 3.2 Fast dictionary lookup

This dictionary is intended to be the “rapid mapping” from the numeric ID to the atom (and back) requested for future use:

- In encoding: `createFromName(name)` uses `atomToIndex`.
- In decoding: strategies can map set bits back to atom names using `indexToAtom`.

### 3.3 Reserved indices (Core bootstrap)

To remain compatible with DS07a structured-record patterns, EXACT MUST reserve indices early for:

- `Pos1 .. Pos20` (these are the canonical position-marker names used by `src/core/position.mjs`)

Recommended policy:

1. During strategy/session initialization, register the 20 position atoms first in numeric order.
2. Then register Core Theory atoms (operators, types) in deterministic load order.
3. Then user atoms.

**Note:** In the current AGISystem2 runtime, position atoms are created on demand. Pre-initializing them is recommended for stable early indices, but not strictly required if load/order is deterministic and consistent.

### 3.5 Budget ceilings: `TOP_INEFFABLE` and `BOTTOM_IMPOSSIBLE` (URC alignment)

EXACT closure and multi-step inference can produce an explosion in:

- monom density (number of atom bits in a monom),
- polynomial size (number of monoms).

To keep closure practical while remaining deterministic and auditable, URC reserves two atoms:

- `BOTTOM_IMPOSSIBLE`: absorbing contradiction / dead-end.
- `TOP_INEFFABLE`: absorbing resource boundary / unknown.

Recommended normalization (backend-owned):

- If a monom contains `BOTTOM_IMPOSSIBLE`, normalize it to the singleton monom `{BOTTOM_IMPOSSIBLE}`.
- Else if a monom contains `TOP_INEFFABLE`, normalize it to `{TOP_INEFFABLE}`.
- If `popcount(monom) > ineffableBitThreshold`, replace it with `{TOP_INEFFABLE}`.
- If `polyTermCount > ineffableTermThreshold`, replace the polynomial with `{TOP_INEFFABLE}`.

These ceilings integrate naturally with DS39 STAR/UNSTAR via the `normalize(state)` hook.

### 3.4 Persistence (Deferred)

Because atom identity depends on the dictionary, EXACT MUST serialize the dictionary alongside KB data:

- `serializeKB()` includes `indexToAtom` (or a compact equivalent) and the KB polynomial data.
- `deserializeKB()` restores the dictionary before decoding KB terms.

**Current scope note:** As of this spec version, AGISystem2 typically reloads theories from text files and re-vectorizes on each run; persistent KB serialization is not a primary workflow. Therefore dictionary persistence is **deferred** to the future “KB serialization” milestone. The initial EXACT implementation may keep the dictionary purely in-memory.

---

## 4. Mathematical Foundation

### 4.1 Atom encoding (one-hot)

If an atom has appearance index `i`, its atomic vector is:

```
enc(atom_i) = 2^i  (BigInt)
```

### 4.2 Monomials as bitsets

A monomial represents a set of atoms `S`:

```
enc(S) = OR_{a_i ∈ S} 2^i
```

Monomial “multiplication” is set union:

```
enc(S ⊗ T) = enc(S) OR enc(T)
```

### 4.3 Polynomials as sorted unique arrays

An EXACT vector is a **set of monomials**:

- Implementation form: `bigint[]` sorted ascending, unique (canonical).
- Interpretations:
  - Atomic vector: polynomial with one monomial of one bit.
  - Fact vector: polynomial with one monomial containing multiple bits (operator + positions + args).
  - KB: bundle (union) of many fact monomials (potentially large).

---

## 5. Operations Specification (Contract)

### 5.1 `createFromName(name)`

Returns an atomic EXACT vector:

1. Lookup/allocate `i = atomIndex(name)`.
2. Return polynomial `[2^i]`.

Note: unlike DS15/DS18 strategies, this is dictionary-based rather than PRNG-based, and is deterministic **given the session’s dictionary state and deterministic load order**.

### 5.2 `bundle(vectors[])` (lossless union)

```
bundle(P1..Pk) = uniqueSort(P1 ∪ ... ∪ Pk)
```

### 5.3 `bind(a, b)` (polynomial multiplication with OR)

If `A` and `B` are polynomials (sets of monomials), then:

```
bind(A, B) = uniqueSort({ x OR y | x ∈ A, y ∈ B })
```

This is exact but can be expensive if |A| and |B| are large; see §10.

### 5.4 `similarity(a, b)`

Default similarity is Jaccard over monomial sets:

```
sim(A, B) = |A ∩ B| / |A ∪ B|
```

This is deterministic and well-defined for set-valued representations.

### 5.5 `unbind(composite, component)` (default UNBIND_A)

`unbind` MUST be provided by the strategy contract. For EXACT it is not self-inverse and is defined as the **existential quotient** in §6.1.

### 5.6 UNBIND mode selection (runtime)

The implementation can select which UNBIND variant is exposed as the default `unbind()` used by reasoning engines:

- Session option: `new Session({ hdcStrategy: 'exact', exactUnbindMode: 'A' | 'B' })`
- Environment default: `SYS2_EXACT_UNBIND_MODE=A` (overridden by session options)

---

## 6. UNBIND Family (A / B / C1 / C2)

AGISystem2’s reasoning pipelines often use an “unbind known key from KB” pattern (DS07a). For XOR-based strategies this matches “inverse binding”. For EXACT we define a compatible family:

### 6.1 UNBIND_A — Existential Quotient (default `unbind()`)

Given:

- Theory polynomial `T` (e.g., KB monomials)
- QueryKey polynomial `Q` (usually a single monomial, but defined for sets)

For every `t ∈ T` and `q ∈ Q`, if `q ⊆ t` (bitset subset), produce `t \ q`.

Bitset checks/ops:

- Subset: `q ⊆ t` iff `(t & q) == q`
- Remove: `t \ q` is `t & ~q` (masked to `t`’s domain implicitly)

Definition:

```
UNBIND_A(T, Q) = uniqueSort({ t \ q | t ∈ T, q ∈ Q, q ⊆ t })
```

This acts as “pattern completion”: remove known structure from facts that match the partial query.

### 6.2 UNBIND_B — Right Residual (strict intersection)

`UNBIND_B` returns only results consistent with *all* query keys in `Q`:

```
r ∈ UNBIND_B(T, Q)  iff  ∀q∈Q: (r OR q) ∈ T
```

Efficient construction:

- For each `q`, compute `S_q = { t \ q | t∈T, q⊆t }`
- Return intersection `⋂_q S_q`

### 6.3 UNBIND_C1 — Count distinct solutions

```
C1(T, Q) = |UNBIND_A(T, Q)|
```

Useful for “how ambiguous is this unbind?”

### 6.4 UNBIND_C2 — Witness counting (scoring)

Return witness statistics without requiring geometric similarity:

- `totalWitnesses = |{(t,q): q⊆t}|`
- Optional `histogram[r] = #pairs (t,q) yielding r`

This enables ranking candidates by support (“how many facts agree?”).

---

## 7. Structured Records & Query Flow Compatibility (DS07a)

### 7.1 Fact encoding (recommended)

Encode a k-ary fact as a **single monomial**:

```
factMonomial = Op OR (Pos1 OR Arg1) OR (Pos2 OR Arg2) OR ...
factVector = [factMonomial]
KB = bundle([factVector1, factVector2, ...])  // union of monomials
```

### 7.2 Query flow analog

Given a query with a hole at position N:

1. Build `partialMonomial = Op OR (known positions+args)`
2. `candidates = UNBIND_A(KB, {partialMonomial})`
3. `answers = UNBIND_A(candidates, {PosN})`
4. Decode answer bits using `indexToAtom` (exact) or rank via UNBIND_C2 witnesses.

**Residue / “cleanup” note (important):**
In real workloads, the raw UNBIND result may contain **structural residue** (extra atoms) rather than a clean one-hot answer. This happens when:
- KB is a `bundle` (superposition) of many facts, so unbind yields multiple residuals.
- Some facts are wrapped (e.g., graph operators use `bind(Op, graph_result)`), introducing operator-level atoms that can “leak” into residuals.

Therefore EXACT benefits from a strategy-level decoding step that **projects** residual terms to plausible entity atoms and filters out non-entities (`Pos*`, `__*` markers, operator tokens, known args, etc.).

This preserves the DS07a “remove known pieces to expose unknown piece” reasoning pattern, without requiring XOR-inverse binding.

### 7.3 Optional decoder: `decodeUnboundCandidates(unboundVec, …)`

EXACT may expose an optional helper to decode UNBIND residuals into ranked candidate atoms:

- Input: `unboundVec` (EXACT vector, potentially multi-term) plus query context (operator, hole index, knowns, optional candidate domain).
- Output: ranked list of `{name, similarity, witnesses, source}` where:
  - `witnesses` counts how many residual terms support the atom,
  - `similarity` can be derived from witness ratios (or other scoring),
  - “cleanup” filters out structural/non-entity atoms.

This decoder is used by holographic (HDC-first) query engines to avoid relying on `similarity(unboundVec, atomVec)` when the unbound result is not a clean one-hot.

---

## 8. Strategy Contract (Node.js-first)

The EXACT strategy exports the standard contract required by the HDC Facade (DS09), plus optional UNBIND extensions:

```js
export const exactStrategy = {
  id: 'exact',
  properties: {
    id: 'exact',
    displayName: 'Exact Sparse Bitset Polynomial HDC (EXACT)',
    lossless: true,
    sparseOptimized: true,
    bindComplexity: 'O(|A||B|·W)',
  },

  // Factory
  createZero,
  createFromName,     // dictionary-backed (appearance index allocator)
  deserialize,

  // Core ops
  bind,
  bundle,
  similarity,
  unbind,             // UNBIND_A

  // Optional extras
  unbindResidual,     // UNBIND_B
  unbindCountDistinct,// UNBIND_C1
  unbindWitnesses,    // UNBIND_C2
  decodeUnboundCandidates, // optional: decode UNBIND residuals into ranked entity candidates

  // Utilities
  clone, equals, serialize, topKSimilar,
  serializeKB, deserializeKB
};
```

---

## 9. Implementation Guidance (proposed files)

```
src/hdc/strategies/
  exact.mjs                    # EXACT strategy (new)
  index.mjs                    # register 'exact'
```

Minimal integration points:

- **Dictionary scope:** The dictionary must be session-local (not process-global). The recommended approach is to instantiate the strategy per Session (see §9.1) so each Session has a fresh allocator.
- **Position atoms:** Pre-initialize `Pos1..Pos20` early for stable low indices in appearance-index strategies. (The runtime can do this before loading any theories.)
- **Persistence:** Do not implement dictionary persistence until KB serialization is introduced (see §3.4). Until then, evaluation workflows can reload theories from text and re-vectorize each run.

### 9.1 Session-local dictionary without KB serialization (v0 guidance)

AGISystem2 can run many Sessions sequentially in the same Node.js process (e.g., evaluation runners). If the appearance-index dictionary were stored as a single module-global map without scoping, it would leak across Sessions and make “appearance index” depend on prior runs.

**Implemented approach (recommended): per-Session strategy instances.**

EXACT is instantiated per Session via a `createInstance({ session })` hook, and the instance owns:

- `atomToIndex: Map<string, number>`
- `indexToAtom: string[]`

This keeps the allocator session-local, supports concurrent Sessions safely, and avoids any need for a global `reset()`.

**Contract note:** The strategy registry may still expose a process-global “fallback instance” for legacy facade calls, but Session-owned code paths MUST use the session-local HDC context (IoC) so the per-Session allocator is used.

**Concurrency note:** Per-Session instances are safe for concurrent Sessions. A module-global dictionary + `reset()` is not safe in concurrent server-style deployments and is not recommended even as a v0 pattern.

---

## 10. Complexity Summary

Let:

- `M = |T|` (#monomials in Theory/KB)
- `N = |Q|` (#monomials in QueryKey set; often 1)
- `W` = BigInt limb cost (grows with highest atom index)

Then:

- `bundle`: `O((M+N)·W)` (merge unique-sorted arrays)
- `bind`: `O(M·N·W)` plus sort/unique
- `UNBIND_A`: `O(M·N·W)` plus sort/unique
- `UNBIND_C2` (total only): `O(M·N·W)` with O(1) extra memory

Practical note: EXACT is best when facts are encoded as single monomials and queries use UNBIND-style extraction on KB-as-set-of-facts.

---

## 11. Testing Requirements

At minimum, tests MUST cover:

- Dictionary determinism under deterministic load order (core then user)
- Canonicalization invariants (sorted unique arrays)
- `bundle` idempotence and commutativity (set union)
- `bind` behavior for monomial facts (OR) and for general polynomials
- UNBIND_A query flow: fact → partial → candidates → position removal → answer
- (Future) KB serialization roundtrip including atom dictionary (when serialization becomes a workflow requirement)

---

## 12. Notes on Naming

Short name: **EXACT** (preferred)  
Alternative label: **Exact-Sparse**  
Strategy ID: `exact`

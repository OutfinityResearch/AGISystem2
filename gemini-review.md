**Gemini Review — AGISystem2 Specs**

**Scope**
- Recursive review of `docs/specs/` with priority on `docs/specs/DS/*` (HDC strategy docs). Reviewed files include core theory, DSL, architecture, reasoning engine, HDC primitives and strategy specs (`exact`, `sparse-polynomial`, `metric-affine`, `metric-affine-elastic`) and the decoding/phasing engine.

**High-Level Summary**
- The design is coherent in the high-level architecture: small HDC contract (`bind/unbind/bundle/similarity`), multiple pluggable strategies, and a separation between candidate-generation (HDC) and validation (symbolic engine).
- Several contradictions, underspecified behaviors, and risky assumptions appear across documents. These may cause runtime bugs, surprising behavior, or hard-to-compare benchmarks if not addressed.

**Critical Issues (must-fix / high priority)**
- Argument order vs algebraic claims — reliance on Phrasing Engine: The spec repeatedly states that XOR-style binding does NOT encode sequence and that order is re-imposed by templates. This is noted in multiple places: `DS01` (XOR commutativity block) — `docs/specs/DS/DS01-Theoretical-Foundation.md:49`, `DS02` DSL (same warning) — `docs/specs/DS/DS02-DSL-Syntax.md:42`, and `DS11` Phrasing (the “savior component”) — `docs/specs/DS/DS11-Decoding-Phrasing-Engine.md:52`.
  - Risk: The system’s correctness of human-facing output depends on templates being present and correct for every operator. If templates are missing or misaligned, the system can produce misleading/incorrect orderings even when internal reasoning was correct.
  - Recommendation: Make template presence a first-class requirement for any theory that defines operators used in user-facing output; add tooling checks (lint) to warn on missing templates for operators declared in loaded theories.

- Vector extension / cloning inconsistency: The specs assert both that cloning preserves patterns and that native vectors at larger geometry differ from cloned smaller vectors. See `DS01` (extension discussion and contradictory notes) — `docs/specs/DS/DS01-Theoretical-Foundation.md:45` and `docs/specs/DS/DS01-Theoretical-Foundation.md:46-48`.
  - Risk: Inconsistent claims about downgrade/upgrade behavior cause ambiguity in operations that rely on extracting segments or comparing cloned vs native vectors.
  - Recommendation: Unify the model: either (A) adopt a strict cloning model (where larger-native vectors are exact concatenations of smaller stamps) or (B) treat native larger vectors as independent but prefix-stable (explicitly documented). Add deterministic definitions and tests for cloning/upgrade/downgrade semantics.

- Incoherent benchmark geometry and metric baselines: Different docs use different reference geometries in examples and comparisons (e.g., `dense-binary` referenced as 2K/2048 in DS15 vs 32K/32768 in DS01/DS03). See `DS03` env var table (`SYS2_GEOMETRY` defaults) — `docs/specs/DS/DS03-Architecture.md:117`; and `DS15` benchmark table — `docs/specs/DS/DS15-Sparse-Polynomial-HDC.md:141`.
  - Risk: Benchmarks and capacity claims are not comparable across docs (invalid conclusions about speed/accuracy/memory). Thresholds tuned for one geometry/strategy will not generalize.
  - Recommendation: Centralize canonical benchmark geometry choices and record them explicitly for each comparison table. Add a canonical benchmarking appendix and ensure all reported numbers reference it.

**Medium Priority Issues (inconsistencies & implausible claims)**
- SPHDC (DS15) claims: k=4 is optimal and k=1 still gives 100% accuracy; also claims "HDC Retrieval 0% success (Jaccard doesn't work)" while touting symbolic accuracy 100%. See `DS15` (k-study and conclusions) — `docs/specs/DS/DS15-Sparse-Polynomial-HDC.md:141` and summary claims — `docs/specs/DS/DS15-Sparse-Polynomial-HDC.md:16`.
  - Risk: Claims that k=1 or tiny k achieves 100% symbolic accuracy are suspicious and could mislead implementers into under-provisioning. Also claiming 0% HDC retrieval success but presenting SPHDC as HDC strategy may confuse engine selection.
  - Recommendation: Clarify scope: SPHDC is optimized for symbolic, exact matching; explicitly mark it as "symbolic-first" strategy and avoid presenting it as a drop-in replacement for holographic retrieval. Re-run/record benchmark datasets, seeds, and exact geometry used.

- Threshold mismatches across specs: Operator/argument thresholds differ between docs (examples: `OPERATOR_THRESHOLD=0.5` in decoder `DS11` — `docs/specs/DS/DS11-Decoding-Phrasing-Engine.md:30`, `DS05` acceptance >0.6 for similarity — `docs/specs/DS/DS05-Basic-Reasoning-Engine.md:29`, `DS18` HDC_MATCH = 0.72 — `docs/specs/DS/DS18-Metric-Affine-HDC.md:103`).
  - Risk: Engine selection, result filtering, and fallback logic may behave inconsistently when thresholds are not unified per-strategy.
  - Recommendation: Provide a single `REASONING_THRESHOLDS` canonical table per strategy (and geometry), and reference it across docs. Document calibration methodology.

- EMA chunked-bundling semantics are underspecified w.r.t. commutativity/order: DS23 notes the hidden pitfall and presents two alternative semantics (order-stable vs. commutative via hashing), but the choice is not decided. See `DS23` chunking and order dependence note — `docs/specs/DS/DS23-Elastic-Metric-Affine-HDC.md:35`.
  - Risk: Different implementations (append-chunk vs hash-placement) will produce different KBs and different query results; this is a breaking change for reproducibility.
  - Recommendation: Choose and document one canonical approach; prefer deterministic chunk assignment (hash-based stable ordering) if commutativity is required, or explicitly accept order-dependence but record insertion sequence in metadata and include re-ordering tools.

**Exact/EXACT strategy concerns**
- UNBIND semantics and complexity: `DS25` defines multiple UNBIND variants (A/B/C) and recommends UNBIND_A as default but acknowledges heavy complexity O(M·N·W). See `DS25` UNBIND family — `docs/specs/DS/DS25-Exact-Sparse-Bitset-Polynomial-HDC.md:36`.
  - Risk: EXAC T-based engines will likely be expensive for large KBs; default thresholds for monom/poly limits are very large and may postpone failures to runtime OOM/timeouts.
  - Recommendation: Provide clear guidance for typical safe thresholds, incremental indexes, and recommended workflows (e.g., prefer per-fact monomials, not huge polynomials). Add explicit algorithmic complexity tests and examples showing practical limits.

- Dictionary persistence deferred: EXACT depends on a session-local atom index; persistence is deferred and noted as a limitation `DS25` — `docs/specs/DS/DS25-Exact-Sparse-Bitset-Polynomial-HDC.md:121`.
  - Risk: Without persisted dictionaries, serialized KB blobs are not portable across sessions; reloading will change atom indices and break decoding.
  - Recommendation: Prioritize dictionary serialization or include stable global names (hashes) inside serialized KB to reconstruct index deterministically.

**Operational / implementation gaps**
- Strategy mixing: Several docs warn HDC ops reject mixed-strategy inputs but the facade/contract does not show explicit runtime checks for mixed inputs in the public API. See `DS03` session isolation note — `docs/specs/DS/DS03-Architecture.md:29` and DS07a strategy list — `docs/specs/DS/DS07a-HDC-Primitives.md:60`.
  - Recommendation: Add explicit contract documentation and runtime behavior for mixing strategies (error, automatic conversion, or clear reject) and unit tests for cross-strategy calls.

- Tests & reproducibility: Many specs present evaluation benchmark numbers but do not consistently include: dataset, random seeds, exact configuration (geometry, thresholds), or runtime environment. See `DS15` reported timings/accuracy — `docs/specs/DS/DS15-Sparse-Polynomial-HDC.md:16`.
  - Recommendation: Add a `docs/specs/benchmarks/README.md` with canonical datasets, exact commands, seeds, and hardware notes. Ensure all reported results include reproducibility metadata.

**Low Priority / Nice-to-have**
- Move all threshold constants and default geometries into a single `docs/specs/configuration.md` (or `config/README`) and reference from strategy docs.
- Add explicit examples demonstrating decode failures and recommended fallback flows (e.g., when `summarize()` fails because templates missing).
- Add a short checklist for theory authors: mandatory `PhraseTemplate` entries for any operator used in public queries.

**Suggested Immediate Actions**
- Add an ADR (architecture decision record) to lock the vector-extension semantics (clone vs native) and the EMA chunk assignment rule.
- Create a central `REASONING_THRESHOLDS` table per strategy with documented calibration process and place it in `docs/specs/config/`.
- Require unit/integration tests for: cloning/downgrade behavior, EMA chunk determinism, EXACT dictionary persistence roundtrip, and cross-strategy rejection behavior.
- Add a linter that flags missing `PhraseTemplate` entries for public operators in loaded theory packs.

**References (selected)**
- `docs/specs/DS/DS01-Theoretical-Foundation.md:49` (XOR commutativity & argument order)
- `docs/specs/DS/DS02-DSL-Syntax.md:42` (DSL-level warning about commutativity)
- `docs/specs/DS/DS03-Architecture.md:117` (environment/geometry defaults)
- `docs/specs/DS/DS07a-HDC-Primitives.md:44` (ASCII stamp / init semantics)
- `docs/specs/DS/DS15-Sparse-Polynomial-HDC.md:141` (SPHDC k-study and benchmark claims)
- `docs/specs/DS/DS18-Metric-Affine-HDC.md:26` (metric-affine baseline similarity & thresholds)
- `docs/specs/DS/DS23-Elastic-Metric-Affine-HDC.md:35` (EMA chunking order-dependence)
- `docs/specs/DS/DS25-Exact-Sparse-Bitset-Polynomial-HDC.md:36` (UNBIND family / exact semantics)

If you want, I can:
- Open a short PR that (A) adds `gemini-review.md` (this file) and (B) creates the canonical `docs/specs/config/thresholds.md` & `docs/specs/config/benchmarks.md` scaffolds with recommended fields to fill in, or
- Create concrete issues/tasks (one per recommended action) in a TODO file (e.g., `docs/specs/TODO-review.md`).

Would you like me to create the thresholds & benchmarks scaffold now (I can add the files and basic structure)?

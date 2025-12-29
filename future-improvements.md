# Future Improvements (Backlog)

This file is the single backlog for AGISystem2 “next work”.

**How to use**
- Pick a decision under **Decisions (blocking)**, delete the options you don’t want, and keep the chosen one.
- For tasks under **Action Items**, delete what you don’t want and convert the rest into a concrete plan.

**Risk priority legend**
- **P0**: Safety/correctness risks (security, data corruption, wrong answers, crashes)
- **P1**: Measurement/research validity risks (misleading evals/metrics, wrong conclusions)
- **P2**: UX/product quality risks (bad proofs, confusing outputs)
- **P3**: Maintainability risks (refactors, duplication, cleanup)
- **P4**: Research/feature expansion (bigger experiments, new capabilities)

## Decisions (blocking)

### D1 — DS08 status (spec vs runtime)
- **Option A (Implement DS08):** add DS08 theories under `config/` and add unit tests that load them via `Session`.
  - Deliverable: DS08 content is loadable and used by at least one eval suite.
- **Option B (Mark exploratory):** edit DS08 to explicitly state “exploratory, not implemented in runtime”, and remove/soften any claims that imply runtime coverage.
  - Deliverable: DS08 no longer looks like a runtime guarantee.

### D2 — `config/Core/index.sys2` policy
- **Option A (Single entrypoint):** make `config/Core/index.sys2` include/orchestrate all Core `.sys2` files.
  - Pros: one canonical entry; simpler docs.
  - Cons: any include-order bug becomes “global”.
- **Option B (Intentionally minimal):** keep `index.sys2` minimal and document that the loader enumerates Core files directly.
  - Pros: less coupling to a single orchestrator file.
  - Cons: docs must be explicit about enumeration/order.

### D3 — Where “metrics meaning” lives (spec vs docs vs generated artifacts)
- **Option A (Specs as source of truth):** document definitions in DS (DS14/DS17), keep reports generated-only.
- **Option B (Docs as source of truth):** maintain a single HTML/MD doc explaining metrics, keep DS minimal.
- **Option C (Hybrid):** DS defines semantics; docs show UI/layout; reports stay generated-only.

### D4 — HDC-first fallback policy (performance vs completeness)
- **Option A (Always fallback):** always run symbolic fallback after HDC-first (safest completeness, but can double work).
  - Required: reporting must clearly show “HDC validated” vs “symbolic final”.
- **Option B (Conditional fallback):** skip symbolic fallback when HDC produced ≥1 validated result.
  - Required: define what “complete” means for the engine; add tests that prove no regressions for suites where completeness matters.

### D5 — Percent rounding policy in reporters
- **Option A (Keep `Math.floor()`):** conservative, but can understate near-100% results.
- **Option B (Use `Math.round()`):** closer to user expectation; less misleading for small denominators.
- **Option C (Always show counts):** keep floor/round but always show `x/y` in summaries so rounding matters less.

## Action Items (prioritized by risk)

### P0 — Safety / correctness

#### T0.1 Harden scripts against shell/path/file-size hazards
- Replace shell pipelines (ex: `exec('... | grep ...')`) with `spawn` + explicit args in `scripts/*`.
- Validate CLI inputs that are used in path construction (domain allowlists).
- Add file-size checks before `readFile()` on paths that can point to large files.
- Add minimal JSON schema validation for any JSON ingestion used by evals/autodiscovery.

#### T0.2 Clamp similarity outputs where numeric drift can leak into thresholds
- Ensure strategy similarity returns are clamped to `[0,1]` where float math can drift (ex: metric-affine normalized L1).
- Add a unit test: similarity never `<0` or `>1` under random vectors and edge vectors (zero/identical/maximally different).

#### T0.3 Reduce “strategy inference” surface (avoid silent mis-dispatch)
- Prefer `vector.strategyId` / explicit `strategyId` and minimize heuristic inference by vector shape.
- Decide whether heuristic inference remains only for legacy/test vectors or is removed entirely.

### P1 — Measurement / research validity

#### T1.1 Make eval metrics unambiguous and comparable across engines
- Track/print separate counters for:
  - **Tried** (HDC attempted), **Validated** (HDC candidate proved), **Equivalent** (same answer-set as symbolic), **Final** (chosen method).
- Decide whether to split counters “by engine” (symbolic vs holographic) to avoid double-count ambiguity.

#### T1.2 Count “heavy ops” consistently (or explicitly don’t)
- Decide: count `bind/bundle/unbind/topKSimilar` as first-class counters, or keep only `kbScans/simChecks`.
- Ensure `.filter(...)` full scans over `kbFacts` are either counted or replaced with counted loops.
- Acceptance: “counts” reflect the work users intuitively expect when comparing strategies.

#### T1.3 Reporting policy cleanup
- Apply D5 (rounding policy) and document it in one place.
- Ensure `--help`/docs describe the exact meaning of each column in fastEval/saturation reports.

### P2 — UX / product quality

#### T2.1 Improve `proof_nl` relevance (avoid irrelevant chains)
- Make proofs cite the deciding evidence (negation/rule premises) rather than dumping long taxonomic chains.
- Add a “proof quality lint” in evals (heuristics; does not block correctness by default).

### P3 — Maintainability / refactors

#### T3.1 Reduce `Session` responsibilities (SRP)
- Extract: core bootstrapping, KB management/indexing, stats/report formatting into separate modules/classes.
- Keep `Session` as orchestrator (IoC root) for its universe.

#### T3.2 Reduce `Executor` responsibilities
- Separate builtins vs graph expansion vs metadata vs persistence concerns.

#### T3.3 Parser decomposition (optional)
- Split large parsing logic into specialized modules (statement vs expression vs theory blocks).

#### T3.4 Docs/spec hygiene
- Add/refresh module specs under `docs/specs/src/` where missing/stale (especially `src/reasoning/*`, `src/output/*`, `src/nlp/*`).
- Keep module specs aligned to exports and current runtime behavior (avoid “spec drift”).

### P4 — Research / feature expansion

#### T4.1 Semantic unification across theories (suggestion-first, no auto-merge)
- Alpha-equivalence signatures for graphs/rules (detect “same definition, different name”).
- Contextual fingerprints for operator/entity equivalence suggestions.
- Generate DSL proposals (`canonical` / `synonym`) for manual review (don’t auto-apply).
- Canonicalize “activation operator” patterns so macro vs manual composition converge.

#### T4.2 Operator upgrades (prioritized)
- `analogy`: add an HDC relational algebra path (bind/unbind proportional reasoning).
- `abduce`: add Bayesian scoring (priors/likelihoods, evidence combination).
- `induce`: add statistical significance testing (chi-square / Fisher exact).
- `whatif`: extend beyond causal chains toward intervention semantics.
- `explain`: contrastive explanations + “why fail”.

#### T4.3 Constructivist Levels (optional performance experiment)
- Add level-indexed KB + level-segmented HDC bundles.
- Benchmark on large KBs (stress/saturation style) before committing to deeper integration.

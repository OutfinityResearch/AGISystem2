# AGISystem2 User Requirements Specification (URS)
**Document ID:** URS

## Overview
- <a id="URS-001"></a>**URS-001:** Users need a neuro-symbolic assistant that complements or replaces LLMs by providing deterministic, explainable answers from natural-language inputs.
- <a id="URS-002"></a>**URS-002:** Central paradigm: thinking as geometric navigation in a configurable conceptual space (>=512 dims) where concepts are unions of learned bounded diamonds; rules shape these volumes.
- <a id="URS-003"></a>**URS-003:** The system must behave as a "System 2" reasoning partner: it maintains layered theories, can hold contradictions, and selects the appropriate context when answering (meta-rationality: multiple theories coexist; the engine chooses/justifies which layers govern a query).
- <a id="URS-004"></a>**URS-004:** Users interact purely in natural language; the system translates intent into rigid operations without exposing internal math or APIs.

## Goals and Outcomes
- <a id="URS-005"></a>**URS-005:** Provide consistent, reproducible answers with an attached reasoning trace ("demonstration") for every conclusion.
- <a id="URS-006"></a>**URS-006:** Support teaching-by-mentoring: domain experts describe vocabulary, rules, and exceptions; the system internalizes them without manual coding.
- <a id="URS-007"></a>**URS-007:** Enable meta-rational behavior: manage multiple, hierarchical theory stacks and apply the relevant layers to a query or task.
- <a id="URS-008"></a>**URS-008:** Allow what-if exploration by spinning up temporary theories or parallel reasoning branches.
- <a id="URS-009"></a>**URS-009:** Operate efficiently on commodity CPUs while handling large knowledge bases (millions of concepts/facts).

## Primary User Types
- <a id="URS-010"></a>**URS-010:** Domain experts (law, engineering, medicine) who teach rules, theories, and exceptions in natural language must be able to externalize knowledge without coding.
- <a id="URS-011"></a>**URS-011:** Operators/analysts must be able to query the system for determinations, diagnostics, and audits.
- <a id="URS-012"></a>**URS-012:** Integrators must be able to embed the system in applications, expecting deterministic API behavior and provenance.

## Core Capabilities (User-Facing)
- <a id="URS-013"></a>**URS-013:** Support natural-language ingestion of facts, rules, and exceptions, with confirmations that definitions are understood.
- <a id="URS-014"></a>**URS-014:** Provide query answering with explicit context selection and justification (which theories applied, which dimensions mattered).
- <a id="URS-015"></a>**URS-015:** Provide narrative consultation: ingest scenarios with sequence handling and return determinations with confidence bands (True/Plausible/False).
- <a id="URS-016"></a>**URS-016:** Support layered, possibly contradictory theories with explicit conflict signaling and prioritization prompts; meta-rational mode chooses or compares theory sets and explains why.
- <a id="URS-017"></a>**URS-017:** Expose geometric reasoning modes to users: deductive (inclusion), inductive (envelope building), abductive (inverse relation probing), analogical (vector translation), counterfactual/non-monotonic (theory layering), temporal/causal (rotations), deontic/normative (forbidden/obligation volumes), sparsity/attention (relevance masks), and validation/abstract interpretation runs for consistency checks.
- <a id="URS-018"></a>**URS-018:** Allow creation of temporary or parallel theory contexts for simulation and "what-if" analysis.
- <a id="URS-019"></a>**URS-019:** Use English as the primary interaction language; other languages require an external translation/LLM bridge.

## Constraints and Assumptions
- <a id="URS-020"></a>**URS-020:** Determinism over stochasticity: identical inputs and theory stacks must yield identical outputs.
- <a id="URS-021"></a>**URS-021:** Explanations must cite the theory layers and semantic dimensions that drive outcomes.
- <a id="URS-022"></a>**URS-022:** System runs on CPU-only Node.js; no GPU or native/wasm dependencies are required for the MLP (future versions may add optional accelerators behind the same interfaces).
- <a id="URS-023"></a>**URS-023:** Knowledge is stored as geometric constructs (vectors, bounded shapes) rather than free text.
- <a id="URS-024"></a>**URS-024:** Theory data is persisted separately from runtime working memory.

## Success Criteria
- <a id="URS-025"></a>**URS-025:** Every answer includes a provenance trail (active theories, dimensional rationale, acceptance band).
- <a id="URS-026"></a>**URS-026:** Users can add or adjust rules in natural language and see the system update behavior immediately.
- <a id="URS-027"></a>**URS-027:** The system refuses to answer when contradictions make a conclusion impossible without user clarification.
- <a id="URS-028"></a>**URS-028:** Performance remains acceptable for interactive use on modern CPUs with millions of stored concepts.

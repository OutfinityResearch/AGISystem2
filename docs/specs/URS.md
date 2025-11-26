# AGISystem2 User Requirements Specification (URS)
**Document ID:** URS

## Overview
- <a id="URS-001"></a>**URS-001:** Users need a neuro-symbolic assistant that complements or replaces LLMs by providing deterministic, explainable answers grounded in geometric reasoning.
- <a id="URS-002"></a>**URS-002:** Central paradigm: thinking as geometric navigation in a configurable conceptual space (>=512 dims) where concepts are unions of learned bounded diamonds; rules shape these volumes.
- <a id="URS-003"></a>**URS-003:** The system must behave as a "System 2" reasoning partner: it maintains layered theories, can hold contradictions, and selects the appropriate context when answering (meta-rationality: multiple theories coexist; the engine chooses/justifies which layers govern a query).

## Goals and Outcomes
- <a id="URS-004"></a>**URS-004:** Provide consistent, reproducible answers with an attached reasoning trace ("demonstration") for every conclusion, including active theories, dimensional rationale, and acceptance band.
- <a id="URS-005"></a>**URS-005:** Support teaching-by-mentoring: domain experts describe vocabulary, rules, and exceptions via Sys2DSL; the system internalizes them without manual coding and updates behavior immediately.
- <a id="URS-006"></a>**URS-006:** Enable what-if exploration by spinning up temporary theories or parallel reasoning branches for simulation and counterfactual analysis.
- <a id="URS-007"></a>**URS-007:** Operate efficiently on commodity CPUs (Node.js, no GPU/native/wasm) while handling large knowledge bases (millions of concepts/facts) with interactive latency.

## Primary User Types
- <a id="URS-008"></a>**URS-008:** Domain experts (law, engineering, medicine) who teach rules, theories, and exceptions must be able to externalize knowledge without coding.
- <a id="URS-009"></a>**URS-009:** Operators/analysts must be able to query the system for determinations, diagnostics, and audits.
- <a id="URS-010"></a>**URS-010:** Integrators must be able to embed the system in applications, expecting deterministic API behavior and provenance.

## Core Capabilities (User-Facing)
- <a id="URS-011"></a>**URS-011:** Support Sys2DSL-based ingestion of facts, rules, and exceptions, with confirmations that definitions are understood. Natural language input is translated externally before reaching the engine.
- <a id="URS-012"></a>**URS-012:** Provide query answering with explicit context selection and justification (which theories applied, which dimensions mattered).
- <a id="URS-013"></a>**URS-013:** Provide narrative consultation: ingest scenarios with sequence handling and return determinations with confidence bands (True/Plausible/False).
- <a id="URS-014"></a>**URS-014:** Support layered, possibly contradictory theories with explicit conflict signaling and prioritization prompts.
- <a id="URS-015"></a>**URS-015:** Expose geometric reasoning modes to users: deductive (inclusion), inductive (envelope building), abductive (inverse relation probing), analogical (vector translation), counterfactual/non-monotonic (theory layering), temporal/causal (rotations), deontic/normative (forbidden/obligation volumes), sparsity/attention (relevance masks), and validation/abstract interpretation runs for consistency checks.
- <a id="URS-016"></a>**URS-016:** Use English as the primary interaction language; other languages require an external translation/LLM bridge.

## Constraints and Assumptions
- <a id="URS-017"></a>**URS-017:** Determinism over stochasticity: identical inputs and theory stacks must yield identical outputs.
- <a id="URS-018"></a>**URS-018:** Explanations must cite the theory layers and semantic dimensions that drive outcomes.
- <a id="URS-019"></a>**URS-019:** Knowledge is stored as geometric constructs (vectors, bounded shapes) rather than free text.
- <a id="URS-020"></a>**URS-020:** Theory data is persisted separately from runtime working memory.

## Success Criteria
- <a id="URS-021"></a>**URS-021:** The system refuses to answer when contradictions make a conclusion impossible without user clarification.

## Requirement Cross-Reference

The following table shows how the consolidated requirements map to the original IDs for traceability:

| New ID | Original IDs | Consolidation Notes |
|--------|--------------|---------------------|
| URS-001 | URS-001 | Simplified, removed "natural-language inputs" (now Sys2DSL) |
| URS-002 | URS-002 | Unchanged |
| URS-003 | URS-003, URS-007, URS-016 (partial) | Merged meta-rationality definitions |
| URS-004 | URS-005, URS-025 | Merged provenance/trace requirements |
| URS-005 | URS-006, URS-026 | Merged teaching + immediate update |
| URS-006 | URS-008, URS-018 | Merged what-if/temporary theories |
| URS-007 | URS-009, URS-022, URS-028 | Merged CPU/performance/scale requirements |
| URS-008 | URS-010 | Renumbered |
| URS-009 | URS-011 | Renumbered |
| URS-010 | URS-012 | Renumbered |
| URS-011 | URS-004, URS-013 | Merged NL→Sys2DSL clarification |
| URS-012 | URS-014 | Renumbered |
| URS-013 | URS-015 | Renumbered |
| URS-014 | URS-016 (partial) | Extracted layered theories (meta-rational in URS-003) |
| URS-015 | URS-017 | Renumbered |
| URS-016 | URS-019 | Renumbered |
| URS-017 | URS-020 | Renumbered |
| URS-018 | URS-021 | Renumbered |
| URS-019 | URS-023 | Renumbered |
| URS-020 | URS-024 | Renumbered |
| URS-021 | URS-027 | Renumbered |
| - | URS-022 | Consolidated into URS-007 |
| - | URS-025 | Consolidated into URS-004 |
| - | URS-026 | Consolidated into URS-005 |
| - | URS-028 | Consolidated into URS-007 |

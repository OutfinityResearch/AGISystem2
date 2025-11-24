# AGISystem2 User Requirements Specification (URS)

## Overview
- Users need a neuro-symbolic assistant that complements or replaces LLMs by providing deterministic, explainable answers from natural-language inputs.
- Central paradigm: thinking as geometric navigation in a configurable conceptual space (>=512 dims) where concepts are unions of learned bounded diamonds; rules shape these volumes.
- The system must behave as a "System 2" reasoning partner: it maintains layered theories, can hold contradictions, and selects the appropriate context when answering (meta-rationality: multiple theories coexist; the engine chooses/justifies which layers govern a query).
- Users interact purely in natural language; the system translates intent into rigid operations without exposing internal math or APIs.

## Goals and Outcomes
- Provide consistent, reproducible answers with an attached reasoning trace ("demonstration") for every conclusion.
- Support teaching-by-mentoring: domain experts describe vocabulary, rules, and exceptions; the system internalizes them without manual coding.
- Enable meta-rational behavior: manage multiple, hierarchical theory stacks and apply the relevant layers to a query or task.
- Allow what-if exploration by spinning up temporary theories or parallel reasoning branches.
- Operate efficiently on commodity CPUs while handling large knowledge bases (millions of concepts/facts).

## Primary User Types
- Domain experts (law, engineering, medicine) who teach rules, theories, and exceptions in natural language.
- Operators/analysts who query the system for determinations, diagnostics, and audits.
- Integrators who embed the system in applications, expecting deterministic API behavior and provenance.

## Core Capabilities (User-Facing)
- Natural-language ingestion of facts, rules, and exceptions; confirmations that definitions are understood.
- Query answering with explicit context selection and justification (which theories applied, which dimensions mattered).
- Narrative consultation: ingest scenarios with sequence handling and return determinations with confidence bands (True/Plausible/False).
- Support for layered, possibly contradictory theories with explicit conflict signaling and prioritization prompts; meta-rational mode chooses or compares theory sets and explains why.
- Geometric reasoning modes available to users: deductive (inclusion), inductive (envelope building), abductive (inverse relation probing), analogical (vector translation), counterfactual/non-monotonic (theory layering), temporal/causal (rotations), deontic/normative (forbidden/obligation volumes), sparsity/attention (relevance masks), and validation/abstract interpretation runs for consistency checks.
- Creation of temporary or parallel theory contexts for simulation and "what-if" analysis.
- English as the primary interaction language; other languages require an external translation/LLM bridge.

## Constraints and Assumptions
- Determinism over stochasticity: identical inputs and theory stacks must yield identical outputs.
- Explanations must cite the theory layers and semantic dimensions that drive outcomes.
- System runs on CPU-only Node.js; no GPU or native/wasm dependencies permitted for the MVP.
- Knowledge is stored as geometric constructs (vectors, bounded shapes) rather than free text.
- Theory data is persisted separately from runtime working memory.

## Success Criteria
- Every answer includes a provenance trail (active theories, dimensional rationale, acceptance band).
- Users can add or adjust rules in natural language and see the system update behavior immediately.
- The system refuses to answer when contradictions make a conclusion impossible without user clarification.
- Performance remains acceptable for interactive use on modern CPUs with millions of stored concepts.

## Risks and Open Issues (User Impact)
- Dimension count is configurable but restricted to a small set of supported values (512, 1024, 2048, 4096); different profiles may emphasize speed (lower counts) or fidelity (higher counts), and this trade-off must be communicated clearly to users of each deployment.
- Reliance on English may limit adoption; translation quality affects correctness and trust.
- User understanding of "theories" and "dimensions" may need onboarding aids to avoid mis-teaching.
- Conflict resolution policies (e.g., priority rules) must be exposed clearly to avoid user surprise.

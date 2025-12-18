# Codex Review – Specs Compliance & Improvement Plan

## Issues vs. Specs
- `src/reasoning/query.mjs:260-338` – `similar` meta-operator builds `matches` but returns an empty `bindings`, so `@q similar X ?Y` decodes as “No results”. Spec DS17 (Meta-Query Operators) requires binding the hole with ranked similar entities.
- Meta-query operators beyond `similar` are absent in the Query engine: no implementations for `induce`, `bundle`, `difference`, or `analogy` despite being defined in DS17 (and referenced in DS07h). Queries using these macros will silently fall back to “No results” rather than performing the specified computations.
- Reasoning macros from DS07h/DS06 (abduce/induce/deduce/whatif/analogy) are not wired into the runtime: no execution paths in `Session`, `prove`, or `query` handle these macro atoms, so the Core theory vocabulary for these capabilities is inert.
- Counterfactual/default reasoning atoms (DS06 6.2–6.4) have no operational semantics in the prover: the engine only supports direct, transitive, rule chaining, inheritance, and disjoint checks. Requests involving `Default`, `Exception`, or `Counterfactual` will be treated as opaque predicates instead of the intended non-monotonic/what-if behavior.

## Improvement Ideas (toward a robust System 2)
- Implement full DS17 meta-operators: `induce` (property intersection pattern), `bundle` (union superposition), `difference` (discriminative properties), `analogy` (A:B::C:? with proportional binding), with bindings + traces for DSL→NL.
- Wire DS06/DS07h reasoning macros into the runtime: abduction (score candidate causes by coverage), induction (learn implied rules from examples), counterfactual/what-if (evaluate modified KB snapshots), and deductive macro plumbing with confidence scores.
- Add default/exceptional reasoning: support `Default`/`Exception` facts with priority ordering and blocking semantics in the prover; surface traces explaining which defaults fired or were overridden.
- Strengthen HDC↔symbolic co-validation in holographic priority mode: always symbolically verify top-K HDC candidates before surfacing, and emit deterministic traces for accepted/rejected candidates.
- Expand temporal/causal reasoning beyond chains: interval reasoning (overlaps, during), causal graph scoring (explanatory power), and bidirectional checks for violation explanations.
- Add structural discovery for complex domains: rule synthesis from observed bundles (schema induction) and numeric/functional constraint support (align with DS16 CSP expectations).

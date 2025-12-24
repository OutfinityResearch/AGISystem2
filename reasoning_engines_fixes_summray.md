# Reasoning engines – fixes summary + next steps

This repo has two reasoning “engines” exposed via priorities:

- `symbolicPriority`: `src/reasoning/prove.mjs` (symbolic orchestration) + supporting modules.
- `holographicPriority`: HDC-first (`src/reasoning/holographic/*`) but it validates and/or falls back to the same symbolic engine (`new ProofEngine(...)`).

So fixes in the shared symbolic modules improve **both** priorities.

## Fixed: compound rule conclusions (BUG001-class)

### Symptom
Rules like:

```
Implies (And A B C) (And X Y Z)
```

were effectively unusable for proving a leaf goal such as `Y`, because the prover tried to match the goal against the **whole** conclusion vector (operator `And`) instead of against the **leaf** conclusion facts.

This is why `prontoqa_21768947` could not prove `isA Sally Zumpus` even though the rule concluded `isA ?x Zumpus`.

### Root cause
- We extracted `conditionParts` (And/Or/Not) for the rule antecedent, but **did not extract** an equivalent structure for the consequent.
- `src/reasoning/kb-matching.mjs::tryRuleMatch()` and `src/reasoning/unification.mjs::tryUnification()` assumed the rule conclusion was a single atomic statement.
- `src/reasoning/query-rules.mjs::searchViaRules()` had the same limitation for queries.

### Fix
- `src/runtime/session-rules.mjs`: store `conclusionParts` (same structure as `conditionParts`) when tracking `Implies`.
- `src/reasoning/kb-matching.mjs`: when a rule has no variables, match the goal against **any leaf** conclusion (instead of only the top-level `And`).
- `src/reasoning/unification.mjs`: for variable rules, unify the goal against **each leaf** conclusion and then prove the instantiated antecedent.
- `src/reasoning/query-rules.mjs`: allow rule-derived query answers from **leaf** conclusions.

### Regression coverage
- Added `evals/fastEval/suite26_compound_conclusions/cases.mjs` to prove/query against a leaf inside an `And` consequent.

## Hardened: do not treat `Not(P)` as `P` in consequents

While adding “leaf matching”, we initially flattened `Not(P)` by descending into `P`. That is incorrect:

- It can make the prover match a positive goal `P` against a rule that actually concludes `Not(P)`.
- In some cases this created recursion/cycles that manifested as `Maximum call stack size exceeded`.

Fix:
- `src/reasoning/kb-matching.mjs`, `src/reasoning/unification.mjs`, `src/reasoning/query-rules.mjs`: do **not** descend into `Not` when enumerating leaf conclusions.

## Improved: variable conditions inside compound antecedents (partial)

Many RuleBERT-style rule sets require using *derived* facts to satisfy leaf conditions inside an `And` antecedent when those leaf conditions still contain unbound variables.

Previously:
- Condition backtracking (`And`) only matched leaf conditions against KB facts (plus a few special cases), so it could not “discover” bindings via multi-step rule reasoning.

Fix (bounded, best-effort):
- `src/reasoning/conditions/instantiated.mjs`: if a leaf condition still has unbound variables and has no direct KB matches, perform a **bounded grounding search** over known entities and call `proveGoal()` on each grounded candidate to obtain bindings.

Implementation note:
- `src/reasoning/conditions.mjs` is now a small delegating wrapper; the implementation is split into `src/reasoning/conditions/*` to keep files <500 LOC.

Notes:
- This is intentionally capped (`MAX_DOMAIN`, `MAX_ASSIGNMENTS`) to avoid combinatorial blowups.
- It is still not a complete Datalog-style solver; it’s a pragmatic bridge for chained rule sets.

## Verification runs (local)

- `node evals/runFastEval.mjs suite26_compound_conclusions --priority=symbolicPriority`
- `node evals/runFastEval.mjs suite26_compound_conclusions --priority=holographicPriority`
- `node evals/runFastEval.mjs suite03_rules --priority=symbolicPriority`
- `node autoDiscovery/bugsAutoDiscovery.mjs --batch=200 --workers=8`
  - `Translation Issues: 0`
  - `autoDiscovery/quarantine/` remained empty
  - `autoDiscovery/nlpBugs/` absent
  - No `Maximum call stack size exceeded` occurrences after the `Not`-flatten fix

## Remaining issues (not fixed in this pass)

### BUG003 (“Deep chain failure”) bucket is not a precise diagnosis
`autoDiscovery/processQuarantine.mjs` currently assigns `BUG003` largely by `Implies` count (≥4), so it mixes multiple failure modes. A lot of these cases also appear to be impacted by NL→DSL semantic loss (quantifiers like “No/Some”, and “destination” statements that act as templates rather than asserted facts).

### BUG006 (“Multi-choice ambiguity”)
This is primarily an eval/harness/output-selection problem (choice selection / expected-vs-produced mapping), not a core proof-search bug. It needs dedicated evaluation logic and clearer “expected_nl” structure per choice.

## Next steps (recommended plan)

1. Tighten bug bucketing:
   - Replace the current `Implies`-count heuristic with evidence-based classification (e.g., “compound consequent leaf not matched”, “needs symmetric/inverse relation”, “template fact not asserted”, “choice-selection failure”).
2. Improve rule-condition binding (beyond bounded grounding):
   - Implement a proper recursive rule-derived matcher for non-ground leaf conditions (a constrained, memoized search that returns bindings), instead of grounding over the whole entity domain.
3. Theory-driven relation properties:
   - Extend symbolic proving/query to use `SemanticIndex` properties (inverse/symmetric) during proof search (not only in search traces), but only for relations declared in `config/Core/00-relations.sys2` (no “invented” semantics).

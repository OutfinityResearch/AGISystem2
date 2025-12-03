# AGISystem2 Evaluation Suite - Improvement List

Updated: 2025-12-03

## Summary After Fixes
- **Total suites**: 30
- **Passing 8/8**: 17 suites (was 14)
- **Pass rate**: 82.5% (198/240) - improved from 61.7%
- **Suites still failing**: 13 (need more work)

---

## COMPLETED FIXES (Session Progress)

| Suite | Before | After | Issue Fixed |
|-------|--------|-------|-------------|
| suite_12_recursive_large | 0/8 | 8/8 | DSL triple format |
| suite_22_merge_theory_patch | 0/8 | 8/8 | DSL triple format |
| suite_13_variable_composition | 1/8 | 8/8 | DSL triple format |
| suite_16_memory_forgetting | 1/8 | 8/8 | DSL triple format |
| suite_21_boost_forget | 2/8 | 8/8 | DSL triple format |
| suite_25_theory_management | 1/8 | 8/8 | DSL triple format |
| suite_26_tool_planning | 1/8 | 8/8 | DSL triple format |

---

## REMAINING FAILING SUITES (needs fix)

| Suite | Pass Rate | Issue |
|-------|-----------|-------|
| suite_05_bias_masking | 7/8 | 1 query fails |
| suite_07_compositional_rules | 5/8 | 3 queries fail |
| suite_08_default_reasoning | 5/8 | 3 queries fail |
| suite_09_contradictions | 4/8 | 4 queries fail |
| suite_14_error_edge_cases | 3/8 | 5 queries fail |
| suite_15_masks | 5/8 | 3 queries fail |
| suite_17_theory_storage | 4/8 | 4 queries fail |
| suite_18_polarity_decision | 3/8 | 5 queries fail |
| suite_19_output_format | 6/8 | 2 queries fail |
| suite_20_format_summarize | 4/8 | 4 queries fail |
| suite_23_summarize_perspective | 5/8 | 3 queries fail |
| suite_24_expand_essay | 3/8 | 5 queries fail |

---

## TRIVIAL/SHALLOW SUITES (pass but need complex reasoning)

These suites pass syntactically but have NO genuine reasoning:

| Suite | Status | Problem |
|-------|--------|---------|
| suite_10_theory_layers | 8/8 PASS | "All 8 proofs are trivial fact lookups" |
| suite_11_recursive_small | 8/8 PASS | "All 8 proofs are trivial fact lookups" |
| suite_12_recursive_large | 8/8 PASS | "All 8 proofs are trivial fact lookups" |
| suite_18_polarity_decision | 3/8 FAIL | "All 8 proofs are trivial fact lookups" |
| suite_24_expand_essay | 3/8 FAIL | "All 8 proofs are trivial fact lookups" |

---

## GOOD QUALITY SUITES (reference)

| Suite | Pass | Genuine Reasoning | Notes |
|-------|------|-------------------|-------|
| suite_01_ontology | 8/8 | 88% | EXCELLENT - good variety |
| suite_02_causation | 8/8 | 63% | GOOD - abduction, deduction |
| suite_03_deontic | 8/8 | 50% | GOOD - exception handling |
| suite_04_counterfactual | 8/8 | 63% | GOOD - counterfactual reasoning |
| suite_08_default_reasoning | 5/8 | 75% | GOOD quality but needs fix |
| suite_27_workflow_planning | 8/8 | 38% | Complex with deep reasoning |
| suite_28_api_orchestration | 8/8 | 38% | Complex with deep reasoning |
| suite_30_resource_planning | 8/8 | 50% | GOOD - sophisticated proofs |

---

## Quality Targets

- Minimum 40% genuine reasoning per suite
- Average proof depth > 6 steps
- Mix of reasoning types (deduction, abduction, transitive, counterfactual)
- No suite should have "all trivial fact lookups"

---

## Next Steps

1. Fix remaining 12 failing suites (priority: 3/8 and 4/8 first)
2. Rewrite trivial suites (10, 11, 12, 18, 24) with genuine reasoning
3. Improve low-quality suites to reach 40%+ genuine reasoning

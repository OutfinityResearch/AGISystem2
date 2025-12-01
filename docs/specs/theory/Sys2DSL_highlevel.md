# Sys2DSL High-Level Command Set

ID: DS(/theory/Sys2DSL_highlevel)

Purpose: shrink the number of top-level commands exposed to NL→DSL generation. Each high-level command fans out into existing “subcommands” (ASK/INFER/PROVE/etc.) so backward compatibility is preserved.

## Commands and Strategy Order

- `QUERY Subject Relation Object [mode=logical|geometric|both] [proof=true] [mask=$maskVar]`
  - Tries `ASK` (or `ASK_MASKED` when mask is supplied). If `truth` is `UNKNOWN` and mode allows logic, falls back to `INFER` (multi-method). Returns the first non-UNKNOWN result with `method` set to `ask` or the inference method.
  - Subcommands: ASK/ASK_MASKED, INFER (direct, transitive, symmetric, inverse, composition, default, inheritance).

- `WHATIF <question> | <fact1> ; <fact2> ...`
  - Counterfactual wrapper over `CF` (THEORY_PUSH + ASSERT facts + ASK + THEORY_POP).
  - Subcommand: CF.

- `EXPLAIN_QUERY Subject Relation Object`
  - Proof-oriented query; uses `PROVE` (InferenceEngine) and returns an explanation text (via `EXPLAIN` formatter).
  - Subcommands: PROVE, EXPLAIN (output).

- `SUGGEST Observation [Relation] [Alt1 Alt2 Alt3]`
  - Generates hypotheses: first `ABDUCT` (relation optional), then falls back to `ANALOGICAL` if three positional concepts are provided.
  - Subcommands: ABDUCT, ANALOGICAL.

- `SUMMARIZE_FACTS Subject Relation Object`
  - Runs `FACTS_MATCHING` with the pattern, then `SUMMARIZE` to produce a human-readable summary. Returns `truth=TRUE_CERTAIN` when matches exist, else `FALSE`.
  - Subcommands: FACTS_MATCHING, SUMMARIZE.

- `MANAGE_THEORY action=LIST|SAVE|LOAD|MERGE|DELETE name=<id>`
  - Single entry point for theory storage ops.
  - Subcommands: LIST_THEORIES, SAVE_THEORY, LOAD_THEORY, MERGE_THEORY, DELETE_THEORY.

- `MEMORY action=BOOST|FORGET|PROTECT|UNPROTECT|USAGE target=<concept> [options]`
  - Wraps lifecycle commands for concepts/usage.
  - Subcommands: BOOST, FORGET, PROTECT, UNPROTECT, GET_USAGE.

- `MASK <partition1> <partition2>...` or `MASK dims=Name1,Name2`
  - Builds a maskRef using partitions (ontology/axiology/etc.) or named axes.
  - Subcommands: MASK_PARTITIONS, MASK_DIMS.

- `FORMAT_RESULT style=natural|json|summary $var`
  - Formatting wrapper preserving truth metadata.
  - Subcommands: TO_NATURAL, TO_JSON, SUMMARIZE.

## Backward Compatibility
- Existing commands remain valid and unchanged; these high-level forms are thin dispatchers that reuse them.
- DS for the granular commands should be read as “sub-modes” of the corresponding high-level command above.

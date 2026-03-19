# MRP Reference Audit

Date: 2026-03-19

Scope: `docs/MRP/*.html`, excluding `index.html` and `article-template.html`

Method:

- structural pass with `skills/check-reference/scripts/check_reference.py`
- local semantic pass based on the cited passage, the local reference entry, and the source type or title
- no external fetching was used in this run, so semantic judgments are conservative
- no URL integrity pass was run because the article-local reference sections mostly do not contain URLs and no external catalog with URLs was supplied

## Skill Installation

The `check-reference` skill was installed into the global Codex skills folder:

- `~/.codex/skills/check-reference`

## Structural Summary

| Article | Inline citations | Unique keys | Reference entries | Missing refs | Unused refs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `a-new-foundational-intuition-for-neuro-symbolic-ai.html` | 7 | 6 | 6 | 0 | 0 |
| `executable-natural-language.html` | 18 | 11 | 11 | 0 | 0 |
| `meta-rational-pragmatics-in-context.html` | 48 | 12 | 12 | 0 | 0 |
| `meta-rational-pragmatics.html` | 10 | 8 | 8 | 0 | 0 |
| `meta-rationality-ai-scientific-inquiry.html` | 0 | 0 | 0 | 0 | 0 |
| `meta-rationality-difficulties-misunderstandings-risks.html` | 0 | 0 | 0 | 0 | 0 |
| `meta-rationality-psychology-philosophy-executable-pragmatics.html` | 18 | 18 | 18 | 0 | 0 |
| `mrp-vm-implementation-path.html` | 9 | 7 | 7 | 0 | 0 |
| `regime-selection-tractable-computation-regime-induction.html` | 22 | 19 | 19 | 0 | 0 |
| `related-research-meta-rational-executable-pragmatics.html` | 34 | 32 | 32 | 0 | 0 |

## Incorrect Citations

No structurally incorrect citations were found in the audited articles.

Important limitation:

- this means `no broken citation keys or local reference entries`
- it does **not** yet mean `all external links were verified to exist`
- it does **not** yet mean `all cited external sources were opened and checked against the title`

More precisely:

- no inline citation key was missing from the final reference list
- no cited article had unused reference entries
- no malformed reference-key pattern was detected by the extraction pass

## Weak Citations

### 1. `KAHNEMAN-2011`

- Document: `docs/MRP/meta-rationality-psychology-philosophy-executable-pragmatics.html`
- Location: `Psychological and Developmental Roots`
- Passage: the paragraph argues that developmental and dialectical traditions emphasize tolerance for contradiction, perspective shifts, and structural revision, then adds Kahneman as part of the same support line.
- Reason: `Thinking, Fast and Slow` is relevant to reflective control and error-prone fluent cognition, but it is not a strong source for dialectical development, perspectival plurality, or structural revision in the same sense as Basseches and Kegan.
- Verdict: weak, not incorrect

### 2. `LUKACS-2013`

- Document: `docs/MRP/meta-rational-pragmatics-in-context.html`
- Location: `Meta-Rational Pragmatics as a Contemporary Technical Rediscovery`
- Passage: the opening sentence claims that older philosophical intuitions had already identified the instability of fixed meaning, the contextual character of understanding, and the revisability of knowledge.
- Reason: Lukács is a strong source for reification and historically constituted categories, but it is not the cleanest support for the whole package named in that sentence, especially the parts about contextual understanding and revisability of knowledge taken together.
- Verdict: weak, not incorrect

### 3. `DEMOURA-2008`

- Document: `docs/MRP/related-research-meta-rational-executable-pragmatics.html`
- Location: `Why Related Research Matters`
- Passage: the text says that if a trustworthy runtime must recognize structure before choosing how to reason, it becomes useful to survey representational and computational families that could support regime selection in practice.
- Reason: the Z3 paper is a strong source for one solver family, but it is too specific to ground the broad methodological claim of that introductory paragraph by itself.
- Verdict: weak, not incorrect

## Coverage Gaps

These are not incorrect citations, but they are documentation gaps for a scholarly-looking series:

### 1. No inline citations or reference section

- `docs/MRP/meta-rationality-ai-scientific-inquiry.html`
- `docs/MRP/meta-rationality-difficulties-misunderstandings-risks.html`

These two articles currently cannot be audited semantically because they contain no scholarly citations at all.

### 2. Sparse support for broad claims

Some articles are structurally clean but still rely on a relatively small number of citations for broad conceptual claims. The clearest example is:

- `docs/MRP/a-new-foundational-intuition-for-neuro-symbolic-ai.html`

This article did not show broken citations, but several long argumentative sections are supported by a small set of high-level references. That is a coverage issue rather than a citation-correctness issue.

## Recommended Next Fixes

1. Replace or narrow the use of `KAHNEMAN-2011` in the psychological-history article.
2. Narrow the sentence supported by `LUKACS-2013`, or add a second source more directly about interpretation and revisability.
3. Remove `DEMOURA-2008` from the broad framing sentence in the related-research article, or move it down into the solver-specific discussion.
4. Add explicit citations to the two uncited articles so they meet the standard now used by the rest of the MRP section.

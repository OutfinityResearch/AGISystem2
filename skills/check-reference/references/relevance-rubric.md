# Relevance Rubric

Use this rubric after extracting the citation map with `scripts/check_reference.py`.

If URLs are available and `--check-urls` was used, combine this rubric with the URL integrity results. URL reachability helps detect hallucinated or dead links, but it does not replace semantic review.

If `--validate-content` was used, inspect the cached extracted source text and the script's `best_snippet`, `matched_terms`, and `verdict_hint`. These are support signals, not final truth.

## Core question

Does the cited source support the actual claim made in the surrounding passage, at the same level of specificity?

## Verdicts

### Correct

Use `correct` when the source clearly supports the claim in the passage.

Typical signs:

- the cited source discusses the same concept, result, architecture, or risk
- the level of support matches the strength of the passage
- the source type fits the claim type

### Weak

Use `weak` when the source is relevant but not strong enough for the claim as written.

Typical signs:

- the source is broader or more general than the claim
- the passage makes a sharper claim than the source justifies
- the source is a survey or encyclopedia entry used to support a precise empirical or architectural statement

### Incorrect

Use `incorrect` when the citation is structurally or semantically wrong.

Typical signs:

- inline citation key has no matching reference entry
- reference entry exists but points to a different topic
- source is topically adjacent but does not support the cited proposition
- source type mismatches the claim so strongly that the citation is misleading
- the reference URL is dead or redirects to a clearly different artifact
- the fetched page title is clearly incompatible with the cited reference title

### Unresolved

Use `unresolved` when the source could not be checked.

Typical signs:

- URL is inaccessible
- only a citation key exists, with no usable source information
- the reference is too incomplete to inspect reliably
- the document has no URLs and no external catalog with URLs was supplied

## Claim-type checks

### Definitional or conceptual claim

Prefer:

- primary philosophical text
- encyclopedia entry
- formal conceptual paper

Be cautious when:

- the source only mentions the term but does not define or analyze it

### Historical or genealogical claim

Prefer:

- historical overview
- original work
- authoritative secondary source

Be cautious when:

- the source is contemporary and only loosely connected to the claimed lineage

### Empirical or benchmark-based claim

Prefer:

- empirical paper
- benchmark report
- official evaluation documentation

Be cautious when:

- a conceptual essay is used to support measured performance claims

### Architectural or implementation claim

Prefer:

- technical paper
- official documentation
- implementation-oriented report

Be cautious when:

- the source discusses the area in general but not the actual mechanism named in the passage

### Risk, critique, or safety claim

Prefer:

- source that explicitly discusses the cited failure mode or risk class

Be cautious when:

- the source is generally critical of the field but does not support the specific risk claim

## Minimal argument format

For every non-correct citation, explain the mismatch in one sentence:

- `The source discusses X, but the passage claims Y.`
- `The source is relevant to the area, but it does not support the specific claim about Z.`
- `The citation key appears inline, but no matching reference entry exists.`

## Cache Discipline

Use `.tmp/cache` for fetched source artifacts.

- keep cache out of git
- reuse cache on repeated runs
- inspect the cached extracted text when deciding whether a citation is genuinely aligned with the text

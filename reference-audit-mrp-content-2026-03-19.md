# MRP Content Reference Audit

Date: 2026-03-19

Scope:

- all `docs/MRP/*.html` articles
- excluded: `docs/MRP/index.html`, `docs/MRP/article-template.html`

Method:

- structural citation extraction
- live URL checks against an external catalog
- cached source retrieval into `.tmp/cache`
- HTML or PDF text extraction
- content-alignment hints produced from each citation passage against extracted source text
- manual triage of the high-signal failures

Cache:

- location: `.tmp/cache`
- size at audit time: about `34M`

Important limitation:

- the automatic content-alignment heuristic is useful for surfacing likely problems, but broad conceptual passages often produce false positives
- the findings below keep only the cases with a strong signal after manual review of the context, extracted source title, and cached content

## Summary

There are three kinds of problems:

1. references whose URL is clearly wrong or broken
2. references whose URL is probably valid but blocked to automated access
3. citations whose source exists, but the source is only weakly aligned with the actual sentence being supported

## High-Confidence Problems That Should Be Changed

### Wrong or broken reference URLs

These are the clearest issues in the current MRP set.

#### `FLEMING-2021`

- Used in:
  - `docs/MRP/meta-rationality-psychology-philosophy-executable-pragmatics.html`
- Current URL:
  - `https://metacogni.tion.org/know-thyself/`
- Result:
  - DNS failure
- Assessment:
  - this URL is almost certainly wrong or obsolete

#### `BASSECHES-1984`

- Used in:
  - `docs/MRP/meta-rationality-psychology-philosophy-executable-pragmatics.html`
- Current URL:
  - Google Books endpoint returning `404`
- Assessment:
  - the citation target exists as a book, but the stored URL is broken

#### `BRAULTBARON-2016`

- Used in:
  - `docs/MRP/regime-selection-tractable-computation-regime-induction.html`
- Current URL:
  - `https://arxiv.org/abs/1301.6565`
- Fetched title:
  - `Tripartite Composite Fermion States`
- Assessment:
  - definitely wrong target

#### `HERSCHE-2024`

- Used in:
  - `docs/MRP/regime-selection-tractable-computation-regime-induction.html`
- Current URL:
  - `https://arxiv.org/abs/2412.05586`
- Fetched title:
  - `Towards Learning to Reason: Comparing LLMs with Neuro-Symbolic on Arithmetic Relations in Abstract Reasoning`
- Assessment:
  - definitely wrong target

#### `KG-SURVEY`

- Used in:
  - `docs/MRP/related-research-meta-rational-executable-pragmatics.html`
- Current URL:
  - `https://arxiv.org/abs/2002.03888`
- Fetched title:
  - `An introduction to Bousfield localization`
- Assessment:
  - definitely wrong target

#### `VERGARI-2021`

- Used in:
  - `docs/MRP/regime-selection-tractable-computation-regime-induction.html`
- Current URL:
  - `https://arxiv.org/abs/2102.01185`
- Fetched title:
  - `A blind ATCA HI survey of the Fornax galaxy cluster: properties of the HI detections`
- Assessment:
  - definitely wrong target

## References That Look Valid but Are Access-Blocked

These should not be called false based on this audit alone.

#### `HARNAD-1990`

- Redirects away from the original host and then hits a `403` gate
- Likely still a real target, but blocked to this client

#### `LECUN-2022`

- OpenReview endpoint returns `403`
- The target is plausible, but this exact URL is not machine-friendly

#### `LUKACS-2013`

- MIT Press page returns `403`
- The target is plausible, but blocked

#### `BACH-2008`

- PhilPapers returns `403`
- The target is plausible, but blocked

#### `FLEMING-DAW-2017`

- DOI resolves onward, but the publisher target returns `403`
- The target is plausible, but blocked

## Citations That Are Structurally Fine but Weakly Aligned with the Sentence

These are the cases where the source exists, but the passage probably overstates what that source directly supports.

### 1. `BOMMASANI-2021`

- File:
  - `docs/MRP/meta-rational-pragmatics.html`
- Section:
  - `Pragmatics Before Full Semantic Stabilization`
- Passage:
  - the sentence claims that current AI systems are unreliable or overconfident, and that fluent output is not the same as epistemically controlled reasoning
- Assessment:
  - the foundation-model risks paper is relevant, but it is too broad to serve as a strong source for the whole cluster of claims in that sentence
- Verdict:
  - weak, not incorrect

### 2. `KAHNEMAN-2011`

- File:
  - `docs/MRP/meta-rationality-psychology-philosophy-executable-pragmatics.html`
- Section:
  - `Psychological and Developmental Roots`
- Passage:
  - the paragraph is mainly about developmental and dialectical tolerance for contradiction and structural revision
- Assessment:
  - Kahneman supports reflective control over fast cognition, but not the broader developmental-dialectical claim made by the paragraph
- Verdict:
  - weak, not incorrect

### 3. `DEMOURA-2008`

- File:
  - `docs/MRP/related-research-meta-rational-executable-pragmatics.html`
- Section:
  - `Why Related Research Matters`
- Passage:
  - the sentence uses Z3 to support a very broad framing claim about surveying representational and computational families
- Assessment:
  - Z3 is relevant as one regime example, but it is too narrow for that introductory sentence
- Verdict:
  - weak, not incorrect

### 4. `DSPY-2023` and `WILLARD-LOUF-2023` in the final hybrid-architecture sentence

- File:
  - `docs/MRP/executable-natural-language.html`
- Section:
  - `Constraints, Schemas, and Hardening Layers`
- Passage:
  - the sentence claims that the future likely combines controlled authoring, explicit IR, agentic runtime, and boundary constraints
- Assessment:
  - `XU-2024` is a direct fit for runtime-oriented execution
  - `WILLARD-LOUF-2023` is a good fit for constrained generation
  - `DSPY-2023` is about LM pipeline optimization and is only indirectly supportive of the whole hybrid architecture sentence
- Verdict:
  - `DSPY-2023` is weak in that sentence
  - `WILLARD-LOUF-2023` is acceptable for the constraint part, but not for the whole architectural synthesis by itself

## Articles with No Scholarly Apparatus Yet

These still cannot be meaningfully audited for citations because they do not yet contain a real citation apparatus.

- `docs/MRP/meta-rational-pragmatics-competitive-direction.html`
- `docs/MRP/meta-rationality-ai-scientific-inquiry.html`
- `docs/MRP/meta-rationality-difficulties-misunderstandings-risks.html`

## What I Would Change First

1. Fix the clearly wrong URLs:
   - `FLEMING-2021`
   - `BASSECHES-1984`
   - `BRAULTBARON-2016`
   - `HERSCHE-2024`
   - `KG-SURVEY`
   - `VERGARI-2021`
2. Replace or narrow the weak sentence-level uses of:
   - `BOMMASANI-2021`
   - `KAHNEMAN-2011`
   - `DEMOURA-2008`
   - `DSPY-2023` in the final architecture sentence of `executable-natural-language.html`
3. Add real citations to the uncited MRP articles so the section has a consistent scholarly standard.

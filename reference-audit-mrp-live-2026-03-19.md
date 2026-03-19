# MRP Live Reference Audit

Date: 2026-03-19

Scope:

- all `docs/MRP/*.html` articles
- excluded only `docs/MRP/index.html` and `docs/MRP/article-template.html`

Inputs:

- local article references
- external catalog: `skills/check-reference/references/mrp-reference-catalog.txt`

Method:

- structural extraction with `skills/check-reference/scripts/check_reference.py`
- live URL checks with `--check-urls`
- page-title comparison against the cited reference title when the fetched page exposed a usable HTML title

Important limits:

- a `403` or anti-bot block does not prove that the reference is false
- a page-title mismatch on documentation homepages does not automatically mean the link is wrong
- semantic relevance was not re-reviewed source-by-source in this pass; this report is about link integrity and source-target consistency

## High-Level Result

- article-level URL checks executed: `113`
- reachable checks: `104`
- failed checks: `9`
- partial title matches: `3`
- title mismatches: `13`
- unique URLs checked: `76`

## Likely Incorrect or Broken Reference Links

These are the problems that most likely indicate a wrong or broken reference URL rather than a simple access restriction.

### 1. `FLEMING-2021`

- Current URL: `https://metacogni.tion.org/know-thyself/`
- Result: DNS failure, host could not be resolved
- Assessment: likely incorrect or mistyped URL
- A web search confirms the book exists, but this domain does not currently resolve

### 2. `BASSECHES-1984`

- Current URL: `https://books.google.com/books/about/Dialectical_Thinking_and_Adult_Developme.html?id=oIscAAAAMAAJ`
- Result: redirects and ends in `404`
- Assessment: current Google Books URL is broken
- Better public candidates found during follow-up search:
  - `https://philpapers.org/rec/BASDTA-2`
  - `https://www.bloomsbury.com/us/dialectical-thinking-and-adult-development-9780893910174/`

### 3. `BRAULTBARON-2016`

- Current URL: `https://arxiv.org/abs/1301.6565`
- Fetched page title: `Tripartite Composite Fermion States`
- Assessment: incorrect URL, points to the wrong arXiv paper
- Strong correction signal: the cited title is *Hypergraph Acyclicity Revisited*, while the fetched title is unrelated
- Better candidate found during follow-up search:
  - DOI-based public landing: `https://doi.org/10.1145/2983573`

### 4. `HERSCHE-2024`

- Current URL: `https://arxiv.org/abs/2412.05586`
- Fetched page title: `Towards Learning to Reason: Comparing LLMs with Neuro-Symbolic on Arithmetic Relations in Abstract Reasoning`
- Assessment: incorrect URL, points to the wrong arXiv paper

### 5. `KG-SURVEY`

- Current URL: `https://arxiv.org/abs/2002.03888`
- Fetched page title: `An introduction to Bousfield localization`
- Assessment: incorrect URL, points to the wrong arXiv paper
- Better candidate found during follow-up search:
  - likely correct arXiv: `https://arxiv.org/abs/2002.00388`

### 6. `VERGARI-2021`

- Current URL: `https://arxiv.org/abs/2102.01185`
- Fetched page title: `A blind ATCA HI survey of the Fornax galaxy cluster: properties of the HI detections`
- Assessment: incorrect URL, points to the wrong arXiv paper
- Better candidate found during follow-up search:
  - likely correct arXiv via DBLP: `https://arxiv.org/abs/2102.03815`

## Reachable but Access-Blocked or Certificate-Blocked

These references should not be called false on the basis of this audit alone. The target appears to exist, but automated access is blocked or constrained.

### `HARNAD-1990`

- Current URL redirects to a Southampton archive endpoint
- Result: original host redirects, final archive endpoint returns `403`
- Assessment: target appears to exist, but is bot-blocked or access-controlled

### `LECUN-2022`

- Current URL: OpenReview PDF
- Result: `403`
- Assessment: likely valid source, but blocked to automated fetching at this endpoint

### `LUKACS-2013`

- Current URL: MIT Press book page
- Result: `403`
- Assessment: likely valid source, but blocked to automated fetching

### `BACH-2008`

- Current URL: PhilPapers record
- Result: `403`
- Assessment: likely valid source, but blocked to automated fetching

### `FLEMING-DAW-2017`

- Current URL: DOI link
- Result: DOI resolves onward, then APA endpoint returns `403`
- Assessment: likely valid source, but blocked at the target publisher layer

## Generic or Benign Title Mismatches

These links resolved successfully. The page title differs from the cited title, but the mismatch is explainable and not, by itself, evidence of a wrong reference.

### Likely acceptable despite mismatch

- `AGISYSTEM2`
- `CUCUMBER-2025`
- `GOTTLOB-2001`
- `OAI-SKILLS-2026`
- `PGMPY`
- `PYSHEAF`
- `PYKEEN`
- `PYRO`
- `TENPY`

Reason:

- the target is a homepage, documentation root, project page, or generic landing page
- the page title is shorter or more generic than the bibliographic title

## Partial Matches That Look Acceptable

- `CHAPMAN-2026`
- `TENSORNETWORK-LIB`
- `WOLFRAM-2002`

These resolved and the fetched title still overlaps substantially with the cited title.

## Article-by-Article Impact

### `docs/MRP/a-new-foundational-intuition-for-neuro-symbolic-ai.html`

- blocked or unresolved:
  - `HARNAD-1990`
- partial but acceptable:
  - `WOLFRAM-2002`

### `docs/MRP/executable-natural-language.html`

- generic title mismatch:
  - `CUCUMBER-2025`

### `docs/MRP/meta-rational-pragmatics-competitive-direction.html`

- no inline citations

### `docs/MRP/meta-rational-pragmatics-in-context.html`

- blocked or unresolved:
  - `HARNAD-1990`
  - `LECUN-2022`
  - `LUKACS-2013`

### `docs/MRP/meta-rational-pragmatics.html`

- no live link problems detected

### `docs/MRP/meta-rationality-ai-scientific-inquiry.html`

- no inline citations

### `docs/MRP/meta-rationality-difficulties-misunderstandings-risks.html`

- no inline citations

### `docs/MRP/meta-rationality-psychology-philosophy-executable-pragmatics.html`

- likely broken:
  - `FLEMING-2021`
  - `BASSECHES-1984`
- blocked:
  - `BACH-2008`
  - `FLEMING-DAW-2017`
- partial but acceptable:
  - `CHAPMAN-2026`

### `docs/MRP/mrp-vm-implementation-path.html`

- no live link problems detected

### `docs/MRP/regime-selection-tractable-computation-regime-induction.html`

- likely wrong URL target:
  - `BRAULTBARON-2016`
  - `HERSCHE-2024`
  - `VERGARI-2021`
- generic or debatable mismatch:
  - `GOTTLOB-2001`
  - `OAI-SKILLS-2026`
- blocked:
  - `LECUN-2022`

### `docs/MRP/related-research-meta-rational-executable-pragmatics.html`

- likely wrong URL target:
  - `KG-SURVEY`
- generic homepage or documentation-title mismatch:
  - `AGISYSTEM2`
  - `PGMPY`
  - `PYSHEAF`
  - `PYKEEN`
  - `PYRO`
  - `TENPY`
- partial but acceptable:
  - `TENSORNETWORK-LIB`

## Recommended Next Fixes

1. Replace the clearly wrong URLs for `FLEMING-2021`, `BASSECHES-1984`, `BRAULTBARON-2016`, `HERSCHE-2024`, `KG-SURVEY`, and `VERGARI-2021`.
2. Leave blocked-but-plausible references in place for now, but consider replacing deep PDF or publisher endpoints with more stable public landing pages.
3. Add citations to the uncited articles:
   - `meta-rational-pragmatics-competitive-direction.html`
   - `meta-rationality-ai-scientific-inquiry.html`
   - `meta-rationality-difficulties-misunderstandings-risks.html`

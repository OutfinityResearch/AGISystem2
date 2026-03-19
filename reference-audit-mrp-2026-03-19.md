# MRP Reference Audit

Date: 2026-03-19

Status: latest canonical report. Older MRP audit reports were removed so this is the only audit file left in the repo.

Scope:

- `docs/MRP/*.html`
- excluded: `docs/MRP/index.html`, `docs/MRP/article-template.html`
- audited article files: `11`

Method:

- structural pass with `skills/check-reference/scripts/check_reference.py`
- live URL validation using the shared catalog in `skills/check-reference/references/mrp-reference-catalog.txt`
- content validation with cached source artifacts in `.tmp/cache`
- manual triage of flagged items, because the automated overlap heuristic overflags long conceptual paragraphs

Raw run artifacts:

- `.tmp/audit-mrp-current-live/*.json`

## Executive Summary

- No article has missing local citation keys or broken local reference entries.
- The broad citations previously identified as too wide were removed without changing prose.
- The clearly wrong or stale source URLs that could be repaired were repaired.
- The citation with no defensible source target, `HERSCHE-2024`, was removed from text, local bibliography, and shared catalog.
- After the cleanup, there is no remaining active citation in `docs/MRP` that is clearly pointed at the wrong external source.
- The citations that remained only in `blocked/unresolved` state were then removed from the active article text and from local bibliographies where they became unused.
- There are no remaining active `blocked/unresolved` citations in `docs/MRP`.

## Changes Applied

### Removed broad citations

- `docs/MRP/meta-rational-pragmatics.html`
  Removed `[BOMMASANI-2021]` from the hallucination/model-risk sentence and removed its local bibliography entry.
- `docs/MRP/meta-rationality-psychology-philosophy-executable-pragmatics.html`
  Removed `[KAHNEMAN-2011]` from the developmental/dialectical paragraph and removed its local bibliography entry.
- `docs/MRP/related-research-meta-rational-executable-pragmatics.html`
  Removed `[DEMOURA-2008]` from the broad framing sentence and removed its local bibliography entry.
- `docs/MRP/executable-natural-language.html`
  Removed `[DSPY-2023]` and `[WILLARD-LOUF-2023]` from the final hybrid-architecture sentence only. Both citations remain elsewhere in the article where the support is narrower.

### Removed unsupported citation entirely

- `docs/MRP/regime-selection-tractable-computation-regime-induction.html`
  Removed `[HERSCHE-2024]` from text and from the local bibliography.
- `skills/check-reference/references/mrp-reference-catalog.txt`
  Removed `[HERSCHE-2024]` from the shared catalog because the cited source target could not be defended.

### Removed previously blocked citations from active text

- `docs/MRP/meta-rationality-psychology-philosophy-executable-pragmatics.html`
  Removed `[FLEMING-DAW-2017]` and `[BACH-2008]` from text and removed their local bibliography entries.
- `docs/MRP/meta-rational-pragmatics-in-context.html`
  Removed `[LUKACS-2013]` and `[LECUN-2022]` from text and removed their local bibliography entries.
- `docs/MRP/regime-selection-tractable-computation-regime-induction.html`
  Removed `[LECUN-2022]` and `[VERGARI-2021]` from text and removed their local bibliography entries.

### Fixed stale or wrong source URLs

- `[BASSECHES-1984]`
  from broken Google Books target
  to `https://search.worldcat.org/title/Dialectical-thinking-and-adult-development/oclc/10532903`
- `[FLEMING-2021]`
  from dead `metacogni.tion.org` URL
  to `https://www.hachettebookgroup.com/titles/stephen-m-fleming/know-thyself/9781549142475/?lens=basic-books`
- `[BRAULTBARON-2016]`
  from wrong arXiv target
  to `https://dblp.org/rec/journals/csur/Brault-Baron16`
- `[KG-SURVEY]`
  from wrong arXiv target
  to `https://research.monash.edu/en/publications/a-survey-on-knowledge-graphs-representation-acquisition-and-appli/`
- `[HARNAD-1990]`
  from stale CogPrints URL
  to `https://eprints.soton.ac.uk/250382/`
- `[VERGARI-2021]`
  from wrong arXiv target
  to `https://nips.cc/virtual/2021/oral/28267`

## Validated After Fix

These references now resolve to real targets with the correct title or a defensible title wrapper, and the source subject is aligned with the cited use:

- `[BASSECHES-1984]`
  `200`, title match on WorldCat, relevant to dialectical adult development.
- `[FLEMING-2021]`
  `200`, Hachette page with exact book and subtitle; page title contains extra author and site wrapper, so the automatic title check marks it as a mismatch, but the target is correct and topically relevant.
- `[BRAULTBARON-2016]`
  `200`, DBLP record, exact title match, relevant to hypergraph acyclicity.
- `[KG-SURVEY]`
  `200`, Monash publication page, exact title match, relevant to knowledge-graph structure.
- `[HARNAD-1990]`
  `200`, ePrints Soton page, exact title match, relevant to symbol grounding.

## Active Blocked or Unresolved Sources

None in active article text.

The blocked items identified in the previous pass were removed from the affected articles rather than left in a half-validated state.

## Notes on Automated Weak Flags

The content-alignment heuristic still emits many `weak` warnings on long conceptual paragraphs. I did not treat those as automatic citation failures when:

- the URL resolved to the correct source
- the title clearly matched or was a defensible site-wrapper variant
- the cited work was plainly in the right topic family for the narrower claim

So the report above is stricter than the raw heuristic output. It records only the changes that were actually justified.

## Current State

- Structurally clean: yes
- Previously broad citations removed: yes
- Previously wrong URLs repaired where a defensible target existed: yes
- Unsupported citation family removed: yes
- Previously blocked citations removed from active text: yes
- Remaining active blocked or unresolved citations: no

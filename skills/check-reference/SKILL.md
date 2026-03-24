---
name: check-reference
description: Validate academic or technical citations in HTML, Markdown, or plain-text documents that use inline citation keys such as [WITTGENSTEIN-1953] and a references section. Use when Codex needs to audit whether citations exist, whether a cited source is relevant to the surrounding claim, whether references are missing or malformed, or when producing a list of incorrect, weak, or unsupported citations.
---

# Check Reference

## Overview

Audit a document in four passes when the inputs allow it:

1. Run a deterministic extraction pass to find citation zones, inline keys, final references, and obvious structural problems.
2. Run a relevance pass to compare each cited passage with the cited source and decide whether the citation is correct, weak, incorrect, or unresolved.
3. Run a URL integrity pass when reference URLs are available, so dead links and obvious title mismatches can be detected.
4. Run a content-validation pass that caches the remote source into `.tmp/cache`, extracts readable text, and compares the cited passage with the actual source content.

Use `scripts/check_reference.py` first. Do not start by reading the whole document line by line manually unless the script fails.

## Workflow

### 1. Extract the citation map

Run:

```bash
python3 skills/check-reference/scripts/check_reference.py <document-path>
```

Use `--json` and redirect output to a temporary file in `.tmp/` when you want machine-readable output:

```bash
mkdir -p .tmp/audit
python3 skills/check-reference/scripts/check_reference.py <document-path> --json > .tmp/audit/$(basename <document-path>).json
```

If the document cites keys from a shared bibliography stored elsewhere, pass that file too:

```bash
python3 skills/check-reference/scripts/check_reference.py <document-path> --catalog <catalog-path>
```

If URLs are available in the document or in the catalog, verify them too:

```bash
python3 skills/check-reference/scripts/check_reference.py <document-path> --catalog <catalog-path> --check-urls
```

If you want a real audit rather than a title-only audit, run content validation with cache:

```bash
python3 skills/check-reference/scripts/check_reference.py <document-path> \
  --catalog <catalog-path> \
  --check-urls \
  --validate-content \
  --cache-dir .tmp/cache
```

The script identifies:

- inline citation occurrences and their surrounding passage
- reference entries found in the document
- missing reference entries
- unused reference entries
- reference URLs when present
- optional URL reachability and page-title checks when `--check-urls` is used
- cached source content and local content-alignment hints when `--validate-content` is used

### 2. Fail fast on structural problems

Treat these as incorrect unless the document explicitly uses an external catalog:

- inline citation key with no matching reference entry
- malformed reference entry with no parseable key
- duplicate keys that point to different sources

List these first. They do not require semantic judgment.

### 3. Classify the surrounding claim

For each citation zone, identify what kind of claim the citation is supposed to support:

- definitional or conceptual
- historical or genealogical
- empirical or benchmark-based
- architectural or implementation-oriented
- methodological
- risk, safety, or critique

This matters because a citation can be topically adjacent yet still be wrong for the actual claim being made.

### 4. Resolve and inspect the source

Prefer primary or official sources.

- If the cited source is local, open the local artifact.
- If the reference contains a URL and browsing is available, inspect the cited page, paper abstract, introduction, or official documentation.
- If URL checking is enabled, use the fetched HTTP status, final URL, and page title as a first integrity check.
- If content validation is enabled, inspect the cached extracted text in `.tmp/cache/...` and compare it to the surrounding citation passage.
- If the source cannot be accessed, mark the citation as `unresolved`, not `correct`.

Do not infer more support than the accessible source justifies.

### 5. Judge relevance, not just topic similarity

Use the rubric in [references/relevance-rubric.md](references/relevance-rubric.md).

A citation is not correct merely because it is from the same field. Check whether the source actually supports the claim's level and type:

- a general survey does not automatically support a precise architectural claim
- a conceptual encyclopedia entry does not automatically support an empirical claim
- a safety critique does not automatically support a specific failure mode unless that failure mode is discussed

### 6. Produce the verdicts

Use these labels:

- `correct`: the source clearly supports the cited passage
- `weak`: the source is adjacent or partially supportive, but the passage overstates what it establishes
- `incorrect`: the source is missing, irrelevant, mismatched, clearly does not support the claim, or resolves to the wrong target
- `unresolved`: the source could not be accessed or checked sufficiently

### 7. Return only the actionable problems first

When the user asks for incorrect citations, output:

1. `Incorrect citations`
2. `Weak citations`
3. `Unresolved citations` if any remain

For each problematic citation include:

- citation key
- document location or section
- short excerpt of the cited passage
- reference entry or URL if available
- reason the citation is problematic
- short argument showing the mismatch

## Output Template

Use this structure when reporting:

```markdown
**Incorrect Citations**

- `[KEY]` in `Section Title`: "quoted or summarized passage"
  Reason: the cited source does not support the specific claim being made.
  Evidence: the source discusses X, while the passage claims Y.

**Weak Citations**

- `[KEY]` in `Section Title`: "quoted or summarized passage"
  Reason: the source is relevant but too general for the strength of the claim.

**Unresolved Citations**

- `[KEY]` in `Section Title`
  Reason: source URL exists but could not be accessed from the current environment.
```

## Notes

- Treat internal cross-links such as local article links separately from scholarly references.
- Do not call a citation correct just because the reference exists.
- Do not claim that link integrity was checked unless URLs were present and `--check-urls` was actually used.
- Do not claim that semantic alignment was checked unless `--validate-content` was used and usable source text was extracted.
- Prefer saying `unresolved` over fabricating semantic support.
- When comparing against a source, explicitly state whether the conclusion is direct or inferred.

## Resources

### scripts/check_reference.py

Use this script to build the citation map, populate `.tmp/cache`, and generate URL and content-alignment hints before semantic review.

### references/relevance-rubric.md

Use this rubric to decide whether a citation is correct, weak, incorrect, or unresolved.

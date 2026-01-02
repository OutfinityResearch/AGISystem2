# Spec: Canonicalization pack (`config/Packs/Canonicalization/*`)

## Purpose

Provides theory-declared canonicalization surfaces used to normalize equivalent DSL formulations into a canonical representative.

This pack supports DS19 (Semantic Unification) by making canonicalization:

- explicit (stored as facts),
- directional (alias → canonical),
- and auditable (normalization steps can be recorded as provenance/evidence).

## Files

- `config/Packs/Canonicalization/13-canonicalization.sys2`
  - defines the `canonical` relation and `alias` sugar.
- `config/Packs/Canonicalization/13c-canonical-rewrites.sys2`
  - defines `canonicalRewrite` templates to normalize common primitive formulations into higher-level verbs (e.g. `_mtrans` → `tell` under constraints).

## Runtime Integration

- The runtime can build a canonicalization index from these facts (when canonicalization is enabled) and rewrite incoming facts and/or queries.
- Canonical rewrites are intended to be deterministic and explainable; they should never silently change user-visible content without provenance.

## Design Rationale

Canonicalization is treated as a semantic library, not a hard-coded feature. This keeps equivalence classes inspectable and makes eval/test semantics reproducible.


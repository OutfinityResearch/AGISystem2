# Pack Specs

This directory documents baseline semantic theory files shipped under `config/Packs/*`.

The classic “Kernel stack” still exists as a legacy aggregate manifest:
- `config/Packs/Kernel/index.sys2`

**Taxonomy note (DS51):** semantic libraries live in explicit packs under `config/Packs/*`. Tests and evaluation suites must ship their own domain vocabularies; baseline packs should remain domain-agnostic and minimal.

| Spec | Pack File | Theme |
|------|-----------|-------|
| [00-types](./00-types.sys2.md) | `config/Packs/Bootstrap/00-types.sys2` | Base type markers |
| [02-constructors](./02-constructors.sys2.md) | `config/Packs/Bootstrap/02-constructors.sys2` | Typed constructors (including `__Atom`) |
| [03-structural](./03-structural.sys2.md) | `config/Packs/Bootstrap/03-structural.sys2` | Structural macros (`__Role`, `__Pair`, `__Bundle`) |
| [09-roles](./09-roles.sys2.md) | `config/Packs/Bootstrap/09-roles.sys2` | Semantic role relations |
| [00-relations](./00-relations.sys2.md) | `config/Packs/Relations/00-relations.sys2` | Relation metadata (transitive/symmetric/etc.) |
| [04a-numeric](./04a-numeric.sys2.md) | `config/Packs/Numeric/04a-numeric.sys2` | Minimal numeric terms and comparisons |
| [04-semantic-primitives](./04-semantic-primitives.sys2.md) | `config/Packs/Semantics/04-semantic-primitives.sys2` | L2 semantic primitives |
| [05-logic](./05-logic.sys2.md) | `config/Packs/Logic/05-logic.sys2` | Logic atoms + macros |
| [06-temporal](./06-temporal.sys2.md) | `config/Packs/Temporal/06-temporal.sys2` | Temporal & causal macros |
| [07-modal](./07-modal.sys2.md) | `config/Packs/Modal/07-modal.sys2` | Modal + epistemic operators |
| [08-defaults](./08-defaults.sys2.md) | `config/Packs/Defaults/08-defaults.sys2` | Default reasoning |
| [10-properties](./10-properties.sys2.md) | `config/Packs/Properties/10-properties.sys2` | Properties, location, capability |
| [11-bootstrap-verbs](./11-bootstrap-verbs.sys2.md) | `config/Packs/Lexicon/11-bootstrap-verbs.sys2` | L3 composed verbs (domain-agnostic) |
| [12-reasoning](./12-reasoning.sys2.md) | `config/Packs/Reasoning/12-reasoning.sys2` | Reasoning verbs + meta ops |
| [13-canonicalization](./13-canonicalization.sys2.md) | `config/Packs/Canonicalization/13-canonicalization.sys2` | Canonical rewrite declarations |
| [14-constraints](./14-constraints.sys2.md) | `config/Packs/Consistency/14-constraints.sys2` | Consistency constraints (theory-driven) |
| [index](./index.sys2.md) | `config/Packs/Kernel/index.sys2` | Legacy aggregate load order |

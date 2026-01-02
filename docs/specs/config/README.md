# Config Specs

This directory documents each `.sys2` file under `config/Core`.  Every spec explains what the file contributes to the Core theory bundle, how those constructs are used at runtime, and where they are exercised in tests.  Use these specs when auditing theory coverage or deciding how to evolve the DSL.

| Spec | Config File | Theme |
|------|-------------|-------|
| [00-relations](./00-relations.sys2.md) | `config/Core/00-relations.sys2` | Relation metadata (transitive/symmetric/etc.) |
| [00-types](./00-types.sys2.md) | `config/Core/00-types.sys2` | Base type markers |
| [02-constructors](./02-constructors.sys2.md) | `config/Core/02-constructors.sys2` | Typed constructors |
| [03-structural](./03-structural.sys2.md) | `config/Core/03-structural.sys2` | Structural macros (__Role, __Pair, etc.) |
| [04-semantic-primitives](./04-semantic-primitives.sys2.md) | `config/Core/04-semantic-primitives.sys2` | L2 Conceptual Dependency primitives |
| [05-logic](./05-logic.sys2.md) | `config/Core/05-logic.sys2` | Logic atoms + macros |
| [06-temporal](./06-temporal.sys2.md) | `config/Core/06-temporal.sys2` | Temporal & causal macros |
| [07-modal](./07-modal.sys2.md) | `config/Core/07-modal.sys2` | Modal + epistemic operators |
| [08-defaults](./08-defaults.sys2.md) | `config/Core/08-defaults.sys2` | Default reasoning |
| [09-roles](./09-roles.sys2.md) | `config/Core/09-roles.sys2` | Semantic role relations |
| [10-properties](./10-properties.sys2.md) | `config/Core/10-properties.sys2` | Properties, location, capability |
| [11-bootstrap-verbs](./11-bootstrap-verbs.sys2.md) | `config/Core/11-bootstrap-verbs.sys2` | L3 composed verbs |
| [12-reasoning](./12-reasoning.sys2.md) | `config/Core/12-reasoning.sys2` | Reasoning verbs + meta ops |
| [index](./index.sys2.md) | `config/Core/index.sys2` | Load orchestration |

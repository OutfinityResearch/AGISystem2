# Suite: translator_bridge_normalization

ID: DS(/tests/translator_bridge_normalization/runSuite)

Scope: TranslatorBridge + Parser normalization.

Fixtures: richer English text (inline) plus constrained grammar fixtures.

Profile: `auto_test`.

Steps/Assertions:
- Input rich NL: "Could you tell me whether dogs fall under animals?" → Bridge normalizes to "Dog IS_A Animal"; parser returns S-R-O AST; recursion horizon enforced.
- Confirm deterministic output with same model/prompt; provenance records version.

Sample:
- Input: "Could you tell me whether dogs fall under animals?"
- Expected normalized: "Dog IS_A Animal"; AST root=Dog, relation=IS_A, child=Animal.***

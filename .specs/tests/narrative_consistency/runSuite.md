# Suite: narrative_consistency

Scope: Narrative/world consistency for literary agents; Reasoner + ValidationEngine with domain layers.

Fixtures: `fixtures/narrative/basics.txt`, `scifi_techmagic.bin`, optional genre rules layer.

Profile: `manual_test`.

Steps/Assertions:
- Ingest basics: Alice Human, CityX, CityX DISJOINT_WITH MagicZone, Alice CASTS Magic → expect conflict (magic disallowed).
- Apply `SciFi_TechMagic` layer permitting tech-magic in CityX → conflict resolves; query "Is Alice allowed to cast magic in CityX?" → TRUE/PLAUSIBLE with provenance citing layer.
- Continuity: Chapter2 fact "Alice IS_A Human" confirmed; no contradiction across chapters.
- Genre rules (optional layer): enforce payoff/foreshadowing; validation flags missing payoff if foreshadow events lack resolution (simplified check).

Sample:
- Base: conflict on Alice CASTS Magic (CityX disallows) → reported.
- With SciFi_TechMagic: query "Can Alice cast magic in CityX?" → TRUE/PLAUSIBLE; provenance layer=Scifi_TechMagic.
- Continuity: "Is Alice Human in Chapter2?" → TRUE_CERTAIN unless contradicted.***

# Suite: narrative_consistency

ID: DS(/tests/narrative_consistency/runSuite)

Scope: Narrative/world consistency for literary agents; Reasoner + ValidationEngine with domain layers, driven via Sys2DSL in a `System2Session`.

Fixtures: `fixtures/narrative/basics.txt`, SciFi tech-magic theory (`scifi_techmagic.sys2dsl`), optional genre rules theory (Sys2DSL text; binary caches optional).

Profile: `manual_test`.

Steps/Assertions:
- Use Sys2DSL triple syntax in a `System2Session` to ingest basics: `@_ Alice IS_A Human`, `@_ CityX DISJOINT_WITH MagicZone`, `@_ Alice CASTS Magic_IN CityX` → expect a conflict (magic disallowed) when querying permissions.
- Append the `SciFi_TechMagic` theory from `scifi_techmagic.sys2dsl` permitting tech-magic in CityX → conflict resolves; query via triple syntax → TRUE/PLAUSIBLE with provenance citing the SciFi layer.
- Continuity: append Chapter2 facts (e.g. `@_ Alice IS_A Human` again) and confirm no contradiction across chapters.
- Genre rules (optional theory) may enforce payoff/foreshadowing; validation flags missing payoff if foreshadow events lack resolution (simplified check).

Sample:
- Base: conflict on Alice casting magic in CityX (CityX disallows) → reported.
- With SciFi_TechMagic: query via triple syntax → TRUE/PLAUSIBLE; provenance layer=Scifi_TechMagic.
- Continuity: query via triple syntax → TRUE_CERTAIN unless contradicted.***

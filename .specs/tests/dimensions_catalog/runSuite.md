# Suite: dimensions_catalog

Scope: loading ontology/axiology catalog.

Fixtures: `data/init/dimensions.json`.

Profile: `auto_test`.

Assertions:
- Ontology axes length = 256; axiology length = 128.
- Names match `.specs/knowledge/dimensions.md` for selected samples (Physicality, Moral valence).
- Reserved ranges untouched (zeros).

Sample:
- Check axis 0 labeled Physicality, axis 256 labeled Moral valence; axes 336–383 marked reserved/zero.***

# revi_specs_docs.ms — Fix Report (specs/docs alignment)

Ultima actualizare: 2026-01-02

Acest fișier consemnează deciziile aplicate și modificările făcute pentru a elimina contradicțiile dintre:
- specificațiile din `docs/specs/*`
- documentația HTML din `docs/`
- implementare (unde a fost cerut explicit)

---

## Rezumat

- Default strategy este acum `exact` (documentat + setat în cod pentru Session/KBExplorer/EvalSuite).
- Coliziunea DS17 a fost eliminată prin renumerotare.
- `geometry` este documentat ca “strategy-defined” (inclusiv în paginile HTML relevante).
- Keywords `import` / `rule` au fost eliminate din lexer/parser (evităm false affordances).
- URS audit logs/traces au fost marcate ca milestone (SHOULD) ca să nu contrazică FS (“not implemented”).
- `docs/specs/matrix.html` afișează separat “Spec maturity” vs “Implementation maturity”.

---

## Decizii aplicate (Q1–Q8)

### Q1) Coliziuni DS17 (două documente diferite cu același DS) — APLICAT

Decizie: Renumerotare (DS17a).

Schimbări:
- `docs/specs/DS/DS17-Meta-Query-Operators.md` → `docs/specs/DS/DS17a-Meta-Query-Operators.md`
- Link-uri actualizate în:
  - `docs/specs/matrix.html`
  - `docs/specsLoader.html` (prin link-uri din matrix/research/specs)
  - `docs/specs/DS/DS07-Core-Theory.md`
  - `docs/specs/DS/DS07-Core-Theory-Index.md`
  - `docs/specs/DS/DS07h-Reasoning.md`
  - `docs/specs/DS/DS01-Theoretical-Foundation.md`
  - `docs/research/ute-representation-and-query.html`

### Q2) `SYS2_GEOMETRY`: semantica per strategie — APLICAT

Decizie: “geometry” este “strategy-defined”.

Schimbări:
- Specificațiile explică unitățile diferite pe strategii (ex: dense-binary bits, metric-affine bytes, SPHDC k, exact default 256).
- Pagini HTML aliniate: `docs/api/index.html`, `docs/wiki/index.html`.

### Q3) URS CON-04 vs strategii multiple — APLICAT

Decizie: eliminăm constrângerea “XOR/Majority only”.

Schimbări:
- `docs/specs/URS.md`: CON-04 a devenit “strategy-defined bind/bundle semantics” (nu mai limitează la XOR/Majority).

### Q4) `holographicPriority` acuratețe (claims) — APLICAT

Decizie: eliminăm complet procentele/claims de acuratețe din DS17.

Schimbări:
- `docs/specs/DS/DS17-Holographic-Priority-Mode.md`: scoase procentele din note/tabele/output examples și “Success Criteria” rescris pe “correctness/validation”.

### Q5) `import` / `rule` keywords — APLICAT

Decizie: eliminate complet din lexer/parser.

Schimbări:
- Cod:
  - `src/core/constants.mjs`: scoase din `KEYWORDS`
  - `src/parser/parser.mjs`: eliminat parsing pentru `import`/`rule`
  - `src/parser/ast.mjs`: eliminate node types `ImportStatement` / `RuleDeclaration`
  - `src/runtime/dsl-to-nl.mjs`, `src/runtime/session-check-dsl.mjs`: eliminate ramurile pentru aceste node types
- Specs:
  - `docs/specs/src/parser/ast.mjs.md` actualizat
  - `docs/specs/DS/DS24-Pure-Symbolic-Term-Engine-EXPLORATORY.md` aliniat (import/rule sunt “future MAY”, nu “current surface”)
- Teste:
  - ajustate testele lexer pentru faptul că `import`/`rule` sunt IDENTIFIER, nu KEYWORD.

### Q6) CommonJS support — APLICAT

Decizie: “CommonJS supported via dynamic import wrapper” (cu limitări documentate).

Schimbări:
- `index.cjs`: wrapper CJS care returnează Promise către ESM namespace.
- `package.json`: conditional exports (`import` → `./src/index.mjs`, `require` → `./index.cjs`).
- `docs/specs/NFS.md`: notă despre limitări (subpath exports rămân ESM-only).
- Test adăugat: `tests/unit/index-exports-cjs.test.mjs`.

### Q7) Audit logs / replayable traces — APLICAT

Decizie: URS devine “SHOULD / future milestone”, FS rămâne “current state”.

Schimbări:
- `docs/specs/URS.md`: URS-16 și URS-30 au prioritate SHOULD (milestone).

### Q8) `docs/specs/matrix.html`: status badges vs status din fișiere — APLICAT

Decizie: două câmpuri separate “Spec maturity” vs “Implementation maturity”.

Schimbări:
- `docs/specs/matrix.html`: păstrează badge-ul existent ca “Impl: …” și adaugă dinamic “Spec: …” citit din `**Status:**` din fișierul markdown.

---

## Notă: EXACT ca default (cerință separată) — APLICAT

- Documentație: `docs/api/index.html`, `docs/wiki/index.html`, `docs/specs/URS.md` (și alte specs relevante).
- Cod: default `Session` folosește `exact`; KBExplorer și EvalSuite pornesc cu `exact` by default.

# Coverage Codex

## Rezumat
- Acoperirea DS este incompletă: lipsesc fișiere de specificație cerute explicit de `DS_map.md`, iar unele puncte din specificații nu sunt implementate.
- Majoritatea fișierelor din `src/**` au DS dedicate, dar există codepaths auxiliare (CLI/chat/scripts) fără DS sau cu implementări parțiale față de cerințe.

## Găuri de acoperire DS (cod fără specificație)
- `src/theory/dsl_commands_theory.js` nu are corespondent `docs/specs/theory/dsl_commands_theory.js.md`, deși legătura este declarată în `docs/specs/DS_map.md`. Acoperirea DS_map este deci invalidată.
- Nu există specificații pentru bazele inițiale `data/init/theories/base/ontology_base.sys2dsl` și `.../axiology_base.sys2dsl` (așteptate ca `.specs/init/ontology_base.md` și `.specs/init/axiology_base.md` în DS_map), deși aceste fișiere sunt livrate și folosite de preloader.
- Entry-points auxiliare fără DS dedicat: CLI (`cli/*.js`), chat (`chat/chat_handlers.mjs`, `chat/llm_loader.mjs`, `chat/prompts.mjs`, `chat/chat_repl.mjs`, `chat/index.mjs`) și utilitarul `scripts/build_theories.js`. DS_map acoperă doar `src/**`, deci aceste suprafețe rămân nespecificate.

## Derapaje cod vs specificație
- ConceptStore nu respectă rolul din `docs/specs/knowledge/concept_store.js.md` (persistență + clustering):
  - Implementarea este in-memory și nu folosește `storage`/`audit` pentru persistență sau jurnalizare (vezi instanțierea fără utilizare în `src/knowledge/concept_store.js:15-35`).
  - `addObservation` are TODO pentru integrare cu `ClusterManager` și nu actualizează LSH/diamonds conform DS (`src/knowledge/concept_store.js:112-118`).
- CLI nu acoperă toate cerințele din `docs/specs/interface/cli.md`:
  - Comenzile `SAVE_THEORY`/`INIT-SAMPLES` descrise în FS-CLI-004 nu există; teoria se poate doar încărca/lista/crea fișier text (`cli/cli_commands.js:223-251`).
  - Helperii de domeniu (`check-procedure|check-export|check-magic`) sunt doar stub-uri cu mesaj generic, nu execuție reală (`cli/cli_commands.js:257-260`), contrar FS-CLI-009.
- InferenceEngine nu implementează complet forward chaining-ul specificat (DS §10 cere expansiune pentru inverse):
  - `forwardChain` derivă doar reguli de compoziție + transitive + simetrice; nu generează relațiile inverse sau altele menționate în DS (`src/reason/inference_engine.js:395-458`).
- Harta DS este desincronizată: `docs/specs/DS_map.md` nu listează `src/theory/dsl_commands_ontology.js` (existent și documentat) și revendică un DS pentru `dsl_commands_theory.js` care lipsește, astfel raportarea de acoperire este necorectă.

## Observații
- Restul modulelor din `src/**` au DS prezente și, la o inspecție rapidă, API-urile principale corespund descrierilor; problemele critice de acoperire rămân cele de mai sus.

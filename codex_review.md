# Acoperire a specificațiilor
- Lipsesc DS-uri dedicate pentru componentele DSL (`src/theory/dsl_parser.js`, toate `src/theory/dsl_commands_*.js`), deși DS_map cere câte un fișier per modul.
- `src/reason/contradiction_detector.js` are spec generic (`docs/specs/reason/contradiction_detection.md`) dar fără pereche cu același path/număr de fișier.
- Modulul de chat are spec doar pentru `chat/chat_engine.mjs`; celelalte fișiere (`chat/llm_loader.mjs`, `chat/chat_repl.mjs`, `chat/index.mjs`, `chat/prompts.mjs`, `chat/chat_handlers.mjs`) nu au DS.
- CLI-ul (`cli/*.js`) și artefactele de inițializare (macro-urile și teoriile din `data/init/macros` și `data/init/theories`) nu au DS dedicate, iar spec-ul `docs/specs/init/bootstrap.md` menționează binare care nu sunt livrate/încărcate.

# Nealinieri majore Cod ↔ DS
## Core/ingest
- `src/core/math_engine.js` nu oferă API-ul din DS (lipsește `rotate`, `bitmaskAnd`, nici nu respectă semnăturile cu buffer de destinație).
- `src/core/bounded_diamond.js` nu are `expand` (este chemat din `ConceptStore.addObservation`), iar structura salvată în snapshot nu aliniază cu câmpurile actuale (`radius`, `minBounds`, `maxBounds` vs. `l1Radius`, `minValues`, `maxValues`).
- `src/ingest/parser.js` implementează doar un parser trivial SVO/întrebări, fără arbori, fără `recursionHorizon` din Config, fără hints din Translator, contrar DS(/ingest/parser.js).
- `src/ingest/encoder.js` nu trimite observații către store conform DS (nu apelează `ConceptStore.addObservation`, doar cluster), are mapări de proprietăți hard-codate și nu folosește `recursionHorizon` pentru subarbori.
- `src/ingest/clustering.js` folosește praguri constante și nu citește configurabil split/merge din Config sau Audit, deși DS cere asta.

## Knowledge/persistență
- `src/knowledge/concept_store.js` primește doar dimensiuni (nu Config/Storage/Audit), nu persistă nimic prin `StorageAdapter`, iar `snapshot` folosește câmpuri inexistente. `addObservation` va arunca pentru că invocă `BoundedDiamond.expand`, metodă inexistentă.
- `src/support/storage.js` nu este conectat la `ConceptStore` sau la fluxul de ingestie; DS de bootstrap prevede binare pentru teorii care nu sunt generate/încărcate.
- `src/knowledge/theory_stack.js` și alte componente cheamă `audit.log`, dar `AuditLog` expune `write`, deci logging-ul din DS nu se întâmplă.

## Reasoning
- `src/reason/reasoner.js` nu implementează fluxurile cerute (nu există `counterfactual`/`temporalRecall`, band-ul/provenance nu includ straturile active și măști), iar `deduceIsA`/`factExists` ignoră `TheoryStack` la compunerea diamantului.
- `src/reason/validation.js` folosește câmpul inexistent `radius` și apelează `stack.conflicts()` fără diamant de bază; nu aplică bias/măști conform DS.
- `src/reason/contradiction_detector.js` nu acoperă contradicții temporale, inverse sau negări directe prevăzute în spec și nu folosește constrângerile de profunzime/recursie; denumirea DS nu corespunde fișierului.
- `src/reason/inference_engine.js` lipsește inferența pe tip de argument și alte moduri din DS; nu există integrare cu proprietățile relațiilor definite în DS/knowledge/default_relations.md.
- `src/reason/retrieval.js` implementează un LSH simplificat (semn pe dimensiuni) fără strategiile din Config (`lsh_pstable`/`simhash`/`grid`), fără probe pe permutări de relații și fără mască; strategia implicită din Config este `lsh_pstable`, dar codul o tratează generic ca „lsh”.
- `src/reason/temporal_memory.js` folosește `relationSeed` în loc de `rotationSeed` și nu validează `maxTemporalRewindSteps` conform DS.

## Interface/DSL
- `src/interface/api.js` construiește `TheoryLayer` cu argumentele inversate (va arunca în `pushTheory`), creează `ConceptStore` fără Config/Storage/Audit, iar `ingest`/`ask` nu returnează provenance-ul sau limitele de iterații cerute în DS.
- `src/interface/translator_bridge.js` este doar un normalizator ad-hoc; lipsesc `toStructure/translate/getVersion` și logarea deterministă din DS.
- `src/theory/dsl_engine.js` folosește module fără DS și nu acoperă toate comenzile din `docs/specs/theory/Sys2DSL_commands.md` (ex: modurile de export/output, relațiile nu sunt persistate global). Dependențele către Reasoner/Validator nu propagă măști/bias așa cum cere DS.

## Chat/Bootstrap
- `chat/chat_engine.mjs` implementează pending actions, dar restul pipeline-ului (încărcare/gestiune teorii, mapping NL→Sys2DSL) nu are DS și nu urmărește pașii din `docs/specs/init/bootstrap.md` (nu se încarcă dimensiuni/relations/profile din data/init, nu se generează binarele de teorie).

# Propuneri de îmbunătățire
1) **Acoperire DS și nomenclatură**: adaugă DS-uri pentru parserul DSL și toate `dsl_commands_*`, pentru fișierele din `chat/` și `cli/`; aliniază denumirea spec-ului de contradicții la fișierul JS și acoperă macro-urile/teoriile din `data/init`.
2) **Repară ingestia geometrică**: extinde `NLParser` cu orizont de recursie și hints, conectează `Encoder.ingestFact` la `ConceptStore.addObservation` (sau implementează `BoundedDiamond.expand`), fixează mapările de proprietăți pe baza catalogului de dimensiuni din Config și folosește `ClusterManager`/Config pentru split/merge configurabile.
3) **Persistență și bootstrap**: trece `ConceptStore` pe `StorageAdapter` și asigură încărcarea din `data/init/*.json`/`.theory.json`; generează și consumă binarele de teorie conform `docs/specs/init/bootstrap.md`; propagă `AuditLog.write` în toate locurile unde se loghează acum cu `audit.log`.
4) **Reasoning conform DS**: completează Reasoner cu `counterfactual`/`temporalRecall` și provenance extins, ajustează `ValidationEngine` la câmpurile reale (`l1Radius`, măști) și apelul corect la `TheoryStack.conflicts`, adaugă inferența de tip de argument și verificările de contradictii temporale/negări în `InferenceEngine`/`ContradictionDetector`.
5) **Retrieval/matematică**: implementează strategiile de indexare din Config (p-stable LSH cu seed, simhash, grid) și probe inverse pe permutări de relații; completează `MathEngine` cu `rotate`/`bitmaskAnd` și semnăturile cu buffer de destinație ca în DS; folosește `rotationSeed` în `TemporalMemory`.
6) **Sys2DSL și translator**: aliniază implementarea DSL la referința din `Sys2DSL_commands.md` (inclusiv output/formatting), fixează `EngineAPI.pushTheory` și propagă măștile/bias-urile către Reasoner/Validation. Extinde `TranslatorBridge` cu `toStructure` determinist (versiuni, audit) pentru a face tranziția NL→Sys2DSL mai sistematică.
7) **Chat end-to-end**: conformează ChatEngine la fluxul de bootstrap (profil/dimensiuni/relații încărcate din `data/init`), documentează handler-ele lipsă și tratează explicit transformarea mesajelor NL în script-uri Sys2DSL, nu doar intenții LLM.***

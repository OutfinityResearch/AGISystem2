# Codex Check Report – AGISystem2

## 1. Scope

- Analiză statică a specificațiilor URS/FS/NFS și DS din `docs/specs`.
- Verificare punctuală a documentației HTML din `docs/**` (arhitectură, usage, syntax, wiki).
- Inspecție a modulelor principale din `src/**` (core, knowledge, ingest, reason, theory, interface, support).
- Analiză a harness‑ului de test și a suitelor din `tests/**` și a DS‑urilor de test din `docs/specs/tests/**`.
- Nu au fost rulate teste și nu a fost modificat codul sursă; s‑a adăugat doar acest raport.

---

## 2. Aliniere globală (URS/FS/NFS ↔ DS ↔ cod ↔ teste)

- **URS/FS/NFS clare și consistente**  
  - `docs/specs/URS.md` și `docs/specs/FS.md` descriu coerent capabilitățile majore (spațiu conceptual geometric, layering de teorii, Sys2DSL, tipuri de raționament, bias control, temporal, validare, persistență).  
  - `docs/specs/NFS.md` fixează explicit constrângeri (dimensiuni admise {512, 1024, 2048, 4096}, determinism, loguri de audit, profiluri de test/prod).

- **Acoperire DS la nivel de modul**  
  - Pentru modulele principale din `src/core`, `src/knowledge`, `src/ingest`, `src/reason`, `src/interface`, `src/support` există DS‑uri dedicate în `docs/specs/**` (ex.: `vector_space.js.md`, `bounded_diamond.js.md`, `concept_store.js.md`, `relation_permuter.js.md`, `bias_control.js.md`, `temporal_memory.js.md`, `agent_system2.js.md`, `storage.js.md`, etc.).
  - `docs/specs/global_arch.md` oferă un model geometric global și conectează clar FS‑01…FS‑14 cu tipologiile de raționament și cu fluxurile principale (Ingest, Answer, Conflict Handling, Validation).

- **Test harness și suite bine structurate**  
  - `tests/runTests.js` corespunde DS‑ului `docs/specs/tests/runTests.js.md` (descoperire de suite, profiluri `auto_test`/`manual_test`/`prod`, timeout, rezultate JSON în `tests/results`).
  - Suitele existente acoperă multe capabilități declarate: geometrie (`vector_space`, `bounded_diamond`, `core_math`), ingest & storage (`concept_store`, `storage_adapter`), relații și permutări (`relation_permuter`, `dimensions_catalog`, `property_mapping`), raționament (`reason_smoke`, `reasoner_timeout`, `inference_engine`, `contradiction_detector`, `abductive_causal`, `abductive_geometric`, `analogical_reasoning`, `counterfactual_layering`, `narrative_consistency`, `health_compliance`), Sys2DSL (`sys2dsl_core`, `sys2dsl_commands`), bias/temporal (`bias_control`, `temporal_memory`), usage/forgetting (`usage_tracking`, `forgetting`), CLI (`cli_integration`).

- **Determinism și configurare**  
  - `src/support/config.js` aplică dimensiunile și profilele exacte din NFS, validează `recursionHorizon`, partitionările ontologie/axiologie și strategiile de indexare/persitență.
  - `src/core/vector_space.js`, `src/core/math_engine.js` implementează aritmetică saturată și operații deterministe; `src/interface/translator_bridge.js` folosește un bridge determinist simplu, în linie cu contractul NFS (fără dependențe LLM în engine).

---

## 3. Gaps spec ↔ implementare (pe module)

### 3.1 Organizare și trasabilitate DS

- **`.specs` vs `docs/specs`**  
  - `docs/specs/DS_map.md` și `docs/specs/agent.md` tratează `.specs/**` ca root canonic pentru DS, dar în proiect există doar `docs/specs/**` și nu există director `.specs`.  
  - Consecință: mapping‑ul formal „fișier cod → fișier DS” este corect conceptual, dar referințele de path din DS_map sunt out‑of‑date; orice tooling automat care se bazează literal pe `.specs` ar eșua.

- **Denumiri DS vs fișiere cod**  
  - `docs/specs/reason/contradiction_detection.md` are ID `DS(/reason/contradiction_detection)`, în timp ce implementarea este în `src/reason/contradiction_detector.js`.  
  - Ar fi utilă aliniera ID‑ului la numele efectiv de fișier pentru claritate GAMP (sau o notă explicită în DS_map).

- **Lipsă DS dedicate pentru unele module Sys2DSL**  
  - Pentru `src/theory/dsl_parser.js` și modulele `src/theory/dsl_commands_*.js` există documentație conceptuală bogată în `docs/specs/theory/Sys2DSL_*.md` și `docs/specs/theory/dsl_engine.js.md`, dar nu există DS‑uri per fișier modul, deși aceste fișiere conțin logică substanțială (parsing, evaluare topologică, comenzi).  
  - Din perspectivă GAMP, ar ajuta fie DS per modul, fie o explicitare în DS_map că aceste fișiere sunt acoperite integral de specificațiile de limbaj.

### 3.2 ValidationEngine vs DS

- **Spec mult mai bogat decât implementarea actuală**  
  - `docs/specs/reason/validation.js.md` cere:  
    - `checkConsistency(conceptId, stack)`: analiză pe straturi, detectare de intersecții goale/contradicții.  
    - `proveInclusion(point, conceptId, stack)`: membership simbolic cu măști și pași de „proof”.  
    - `abstractQuery(spec)`: rulări simbolice fără efecte secundare, cu provenance.  
    - `findCounterexample(ruleSpec)`: căutare deterministă de contr exemple.  
  - `src/reason/validation.js` oferă doar:  
    - un `checkConsistency` simplu (verificare `minValues[i] <= maxValues[i]` pe diamond‑uri), fără a folosi `TheoryStack` sau măști;  
    - un `proveInclusion` minim, care doar calculează o distanță L1 masked și întoarce `{result, distance}`;  
    - `abstractQuery` returnează `{ result: 'UNIMPLEMENTED' }`;  
    - `findCounterexample` returnează `null`.
  - Nu există suite dedicate `tests/validation_engine`, deși există DS pentru ea (vezi secțiunea 4).
  - Impact: FS‑13 / NFS‑006 / NFS‑017 („Validation & Abstract Interpretation”) sunt doar parțial realizate și nu sunt acoperite de teste; la nivel GAMP ar trebui marcat explicit ca funcționalitate „not yet implemented / out of MLP scope” sau completată.

### 3.3 TheoryStack și layering de teorii

- **TheoryStack minimal față de designul planificat**  
  - DS‑ul `docs/specs/knowledge/theory_stack.js.md` cere API bogat (`setActive`, `compose`, `compareStacks`, `conflicts`, `snapshot`) și descrie clar overlay‑uri de teorii peste concepte.  
  - `src/knowledge/theory_stack.js` conține doar `push`, `clear`, `getActiveLayers`; nu există compunere de diamante, snapshot‑uri sau detecție de conflicte.

- **Integrare Reasoner / TheoryStack încă neimplementată**  
  - `src/reason/reasoner.js` are `composeConcept(conceptId, stack)` dar implementează doar `this.conceptStore.getConcept(conceptId)` și ia primul diamond, ignorând complet straturile de teorii (stack).  
  - `EngineAPI.ask()` folosește `Reasoner.answer()` și `Reasoner.deduceIsA` fără să combine efectiv overlay‑urile din `TheoryStack`.

- **Comenzi Sys2DSL pentru teorii sunt în mare parte placeholder**  
  - `src/theory/dsl_commands_theory.js` gestionează un `_theoryStack` propriu (separat de `TheoryStack` geometric) și doar:  
    - stochează numele layer‑elor (`cmdTheoryPush`),  
    - salvează un snapshot de facts, dar `cmdTheoryPop` nu restaurează efectiv `ConceptStore` (comentat ca „placeholder”).  
  - Capabilitățile din `docs/specs/interface/usecase_define_theory.md` și `docs/specs/interface/usecase_validate.md` (definire, salvare, încărcare și compoziție de teorii) nu sunt încă reflectate în cod; CLI expune doar o variantă simplificată prin `push/pop/layers`.

### 3.4 ConceptStore vs DS și BoundedDiamond

- **Constructor și dependențe diferite de DS**  
  - DS‑ul `docs/specs/knowledge/concept_store.js.md` prevede `constructor({config, vspace, storage, audit})`.  
  - Implementarea din `src/knowledge/concept_store.js` acceptă fie un număr `dimensions`, fie `{dimensions, config, storage, audit}`; `EngineAPI` o instanțiază cu un simplu număr (`new ConceptStore(this.config.get('dimensions'))`), deci integrarea cu `Config`/`StorageAdapter` este indirectă (prin alte componente), nu prin `ConceptStore`.

- **addObservation și clustering nealiniate**  
  - DS‑ul spune că `addObservation` ar trebui să delege către `ClusterManager`.  
  - Implementarea curentă a `addObservation` apelează un metodă inexistentă `diamond.expand(vector)` pe primul diamond; `BoundedDiamond` nu are `expand`.  
  - Funcția nu este folosită nicăieri (clusteringul real se face în `src/ingest/encoder.js` prin `this.cluster.updateClusters(...)`), deci nu produce bug‑uri runtime, dar indică un API vechi neactualizat.

- **snapshot folosește câmpuri vechi de la BoundedDiamond**  
  - `BoundedDiamond` folosește `minValues`, `maxValues`, `center`, `l1Radius`.  
  - `ConceptStore.snapshot()` serializează `radius`, `minBounds`, `maxBounds`, care nu există, deci snapshot‑ul geometric este incomplet / neconform DS‑ului; testele verifică doar `label`, nu și geometria.

### 3.5 Explainability și provenance (URS‑004 / FS‑07 / NFS‑007)

- **Provenance parțială în `EngineAPI.ask`**  
  - URS/FS cer explicit: pentru fiecare răspuns, să existe traseu de raționament cu teorii active, dimensiuni relevante, bandă de acceptare și eventuale override‑uri.  
  - `src/interface/api.js` returnează pentru `ask()` un obiect care poate include:  
    - `truth` (din `Reasoner.deduceIsA` / `factExists`),  
    - `band`, `distance`, `scepticRadius`, `optimistRadius` (de la `Reasoner.answer()`),  
    - dar nu include explicit liste de teorii active sau descrieri de dimensiuni.  
  - `AuditLog` înregistrează evenimentele `ask`/`ingest`, dar nu cinează stack‑ul de teorii/măști utilizate în decizie.

- **ValidationEngine nu produce încă „proof steps” sau contraexemple**  
  - DS‑ul pentru `ValidationEngine` cere pași de proof, counterexemple și rulări abstracte logate; implementarea actuală nu face acest lucru (vezi secțiunea 3.2).

### 3.6 Alte observații de implementare vs DS

- **Comenzi Sys2DSL de teorii și use‑case‑uri avansate**  
  - DS‑urile din `docs/specs/interface/usecase_*.md` descriu comenzi precum `THEORY_CREATE`, `THEORY_SAVE`, `THEORY_LOAD`, `VALIDATE_SCRIPT`, `HYPOTHESIZE_IF`, `PROVE theorem=...` etc.  
  - În cod există doar subsetul MLP: `ASSERT`, `ASK`, `CF`, `ABDUCT`, `FACTS_MATCHING`, `ALL_REQUIREMENTS_SATISFIED`, `MASK_*`, management simplu de teorii (`LIST_THEORIES`, `LOAD_THEORY`, `SAVE_THEORY`, `MERGE_THEORY`, `THEORY_PUSH/POP`, `RESET_SESSION`), plus comenzi de inferență (`INFER`, `FORWARD_CHAIN`, etc.).  
  - CLI are hook‑uri stub pentru `check-procedure` / `check-export` / `check-magic` care doar întorc un mesaj generic, nu fluxuri pe deplin specificate în use‑case DS.

- **Retriever și indexare**  
  - DS‑ul global și FS/NFS cer LSH/p‑stable sau echivalent; implementarea din `src/reason/retrieval.js` folosește un hash binar simplu pe primele N dimensiuni și reindexează complet la fiecare `nearest()`.  
  - Pentru MLP, acest design este acceptabil, iar testele (`abductive_geometric`, `analogical_reasoning`) verifică corectitudinea logică, nu performanța; totuși, pentru conformitate strictă cu NFS‑001/NFS‑002 este utilă clarificarea că actuala strategie este un placeholder „LSH‑like” și nu o implementare scalată la „milioane de concepte”.

---

## 4. Gaps spec ↔ teste (nume suite, fixture‑uri, acoperire)

### 4.1 DS de test fără suite implementate

Comparând `tests/**` cu `docs/specs/tests/**`:

- Suite listate în DS dar **lipsite în `tests/`** (nu există director sau `index.js`):  
  - `deontic_reasoning` (deși fixture‑ul deontic este descris și referit în DS‑uri de init);  
  - `validation_engine` (pentru `ValidationEngine`);  
  - `usecase_integration` (use‑case‑uri 11.a–11.d);  
  - `bias_audit` (separat de `bias_control`);  
  - `persistence_file_binary` (în practică avem `storage_adapter`);  
  - `relations_bootstrap`;  
  - `sys2dsl_syntax` (testare la nivel de gramatică).

- În plus, `docs/specs/tests/fixtures/README.md` marchează mai multe fișiere drept „proposed” (ex.: `fixtures/deontic/law_minimal.txt`, `fixtures/bias/skills_only.txt`) care nu există încă în `tests/fixtures/**`.  
  → Pentru GAMP, acestea sunt clar funcționalități/teste planificate, nu implementate; ar fi bine să fie marcate explicit ca „future work” în matricea de trasabilitate.

### 4.2 Suite implementate fără DS de test dedicat

Suite prezente în `tests/` dar fără DS omonim în `docs/specs/tests/**` (în schimb, sunt acoperite indirect de DS‑urile de modul):

- `abductive_geometric`, `bounded_diamond`, `concept_store`, `contradiction_detector`, `inference_engine`, `property_mapping`, `reason`, `reasoner_timeout`, `results`, `storage_adapter`, `temporal_memory`, `vector_space`, `cli_integration`, `bias_control`, etc.

Aceste suite sunt bine venite (și aduc valoare practică), dar pentru trasabilitate GAMP ar ajuta:

- fie DS concise per suită (chiar și doar cu scop și mapping către DS‑urile de modul),  
- fie o secțiune în DS‑ul modulului care listează suitele care îl exercită.

### 4.3 Acoperire parțială pentru ariile „Validation” și „Theory Layering”

- **ValidationEngine**  
  - Nu există suite dedicate `validation_engine` în `tests/`, deși DS‑ul de test și DS‑ul de modul specifică scenarii concrete (intersecții goale, counterexample etc.).  
  - Singura folosire a `validate` în CLI este prin `Sys2DSL` (`VALIDATE` din `dsl_commands_reasoning`), care implementează o regulă narativă simplă (ex. `LOCATED_IN` + `DISJOINT_WITH`), nu `ValidationEngine` geometric.

- **Theory layering / use‑case‑uri**  
  - `tests/counterfactual_layering` acoperă bine `CF` (context fact set local) dar nu layering persistent pe `TheoryStack`.  
  - `tests/sys2dsl_commands` verifică `THEORY_PUSH`, `THEORY_POP`, `RESET_SESSION`, însă doar la nivel de semnal (OK/depth), nu și izolarea/restaurarea efectivă a faptelor.

---

## 5. Observații punctuale de cod (riscuri și TODO‑uri)

- **`ConceptStore.addObservation` și API‑uri moștenite**  
  - Metodă nefolosită, bazată pe un API (`diamond.expand`) care nu mai există; ar trebui fie actualizată conform DS & `ClusterManager`, fie eliminată și clarificat fluxul oficial de „learning”.

- **`ConceptStore.snapshot` și `INSPECT`**  
  - Snapshot‑ul nu serializază corect câmpurile geometrice actuale; `INSPECT` (Sys2DSL) este testat doar superficial (label), deci nu se detectează această discrepanță.

- **`ValidationEngine.abstractQuery` / `findCounterexample`**  
  - Stubs „UNIMPLEMENTED” / `null`. E bine că nu sunt folosite în CLI, dar pentru NFS‑016 ar fi util să fie documentat explicit în FS/NFS că aceste funcții sunt „future scope” sau să returneze erori clare „not yet supported” către caller.

- **`DSLCommandsTheory.cmdTheoryPop`**  
  - Raportează un număr de „restoredFacts”, dar nu modifică efectiv `ConceptStore`; layering‑ul rămâne în practică doar un stack de metadate.  
  - Atât DS‑ul cât și documentația de user sugerează izolarea efectivă a faptelor pe layer‑e; este un gap funcțional de notat.

- **Retrieval și indexare**  
  - `Retriever.nearest()` reindexează toate conceptele la fiecare apel și folosește fallback exhaustiv când bucket‑ul e gol; pentru MLP este acceptabil, dar nu atinge încă obiectivele de scalare din NFS (milioane de concepte).  
  - Nu există teste de performanță sau verificări pentru parametrii LSH din `Config` (hashes/bands/bucketWidth).

---

## 6. Recomandări de next steps (stil GAMP)

1. **Curățare și sincronizare DS_map / agent.md**  
   - Actualizarea referințelor `.specs` → `docs/specs` și aliniera ID‑urilor DS la numele reale de fișiere și module.  
   - Clarificarea în DS_map a relației dintre modulele Sys2DSL (parser + commands) și specificațiile de limbaj.

2. **Decizie clară pentru „Validation & Theory Layering”**  
   - Fie se implementează funcționalitatea planificată (ValidationEngine complet, TheoryStack compozit, DS‑uri de test pentru `validation_engine` și `deontic_reasoning`), fie se recadrează scope‑ul MLP și se marchează explicit aceste părți ca „planned / not yet implemented” în FS/NFS și în docs.

3. **Întărirea trasabilității testelor**  
   - Adăugarea de DS scurte pentru suitele existente fără DS dedicat (în `docs/specs/tests/**`), cu mapping către FS/NFS/DS relevante.  
   - Implementarea (sau scoaterea oficială din scope) a suitelor descrise deja în DS (`deontic_reasoning`, `validation_engine`, `usecase_integration`, etc.).

4. **Refinarea ConceptStore și snapshot‑urilor**  
   - Alinierea API‑ului `ConceptStore` la DS‑ul actual (constructor, snapshot, integrare cu `ClusterManager`/`BoundedDiamond`).  
   - Asigurarea că `INSPECT` expune date coerente cu geometria actuală și, ideal, extinderea testelor pentru a verifica acest lucru.

5. **Clarificarea nivelului de explainability la MLP**  
   - Definirea clară a minimului garantat pentru provenance la MLP (ce câmpuri sunt obligatorii în răspunsuri, ce se loghează în `AuditLog`) și reflectarea acestui lucru atât în cod (`EngineAPI`, `Reasoner`, `ValidationEngine`), cât și în documentație.

Per ansamblu, proiectul are o arhitectură de specificații foarte solidă (URS/FS/NFS/DS) și un set de teste care acoperă deja majoritatea capabilităților declarate. Gaps‑urile identificate sunt în principal pe zona de „Validation & theory layering” (spec‑ul este mai ambițios decât implementarea) și pe sincronizarea formală DS ↔ tests ↔ cod, aspecte tipice într‑un proiect aflat în fază MLP avansată.***


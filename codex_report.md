# Codex Report – Conformitate Cod vs. Specificații (`docs/specs`)

Acest raport rezumă principalele neconformități, conflicte și elemente extra găsite între specificațiile din `docs/specs/` și codul actual.

## 1. Probleme și conflicte în specificații

- **FS-02 / FS-08 (convergență parțială)**  
  - FS.md declară că toate interacțiunile externe trebuie să meargă prin `AgentSystem2` → `System2Session` → Sys2DSL (FS-08) și că teoria layering-ului (FS-02) este consolidată cu sesiunea.  
  - În practica documentației, mai multe DS-uri se referă la `EngineAPI` ca façade internă, dar și ca suprafață folosită de interpretor. În matrix și în DS(/theory/dsl_engine.js) se acceptă ca Sys2DSL să apeleze direct `EngineAPI`.  
  - Nu e o contradicție directă, dar există o ambiguitate: FS insistă că doar `System2Session` este suprafața publică, DS-urile admit `EngineAPI` ca punct de intrare pentru modulul DSL. Codul urmează această abordare hibridă (vezi mai jos).

- **FS-03: Ingestion "Sys2DSL commands" vs. NL ingest**  
  - FS-03 spune că ingestia pornește de la comenzi Sys2DSL (triple) și le encodează.  
  - DS(/interface/api.js) introduce clar două niveluri: un API intern determinist pe DSL (`ingestDSL`) și un API opțional NL (`ingest` cu TranslatorBridge). FS-03/FS-09/FS-20 extind această idee, dar textul este parțial redundant și poate crea impresia că NL ingest nu există sau e "în afara" scope-ului.  
  - Codul implementează explicit ambele căi; documentația ar trebui clar să diferențieze layer-ul DSL (FS-19) de layer-ul NL (FS-20) pentru a evita confuzii.

- **ContradictionDetector – status vs. "Not yet implemented"**  
  - DS(/reason/contradiction_detector.js) declară Status: IMPLEMENTED v1.0, dar în același document există secțiuni marcate "Not yet implemented (TODO)" (negări directe și temporal).  
  - Codul implementează tipurile enumerate ca "implemented", nu și cele marcate explicit TODO. Nu e o abatere de cod, dar în specificații amestecul dintre "IMPLEMENTED" și TODO poate crea impresia că toate tipurile sunt gata. Ar fi utilă o clarificare de status per-tip.

## 2. Neconformități majore cod vs. FS / DS

### 2.1 FS-05 / FS-07 – Răspunsuri cu proveniență completă

- FS-05 și FS-07 cer ca fiecare răspuns să includă:
  - stiva de teorii active,
  - dimensiuni contributoare (per relevance mask),
  - banda de acceptare,
  - overrides, plus o justificare NL concisă.
- `src/reason/reasoner.js`:
  - are comentarii FS-05/FS-07 și produce obiecte cu `band`, liste de teorii active și dimensiuni contributoare în anumite căi (e.g. `answer`, `adversarialCheck`).  
  - totuși, nu toate metodele expuse (analogical, abductive, deduceTransitive etc.) returnează același format îmbogățit – unele întorc doar distanțe și etichete sau structuri parțial consistente.
- Concluzie: acoperire parțială a FS-07 – nu există un contract unitar "rezultat cu proveniență completă" pentru toate modurile de raționare, deși spec-ul o cere.

### 2.2 FS-08 – "Must flow through System2Session" vs utilizarea directă a EngineAPI în module interne

- FS-08 afirmă că toate operațiile vizibile pentru utilizator trebuie să treacă prin `System2Session` și Sys2DSL; `EngineAPI` nu trebuie folosit direct de codul aplicației.  
- Codul:
  - `src/interface/agent_system2.js` respectă această regulă la nivel "public": creează `System2Session` cu un `EngineAPI` intern, iar CLI/chat/testele folosesc `AgentSystem2`.  
  - `evalsuite/run.js`, CLI și chat folosesc doar `AgentSystem2`; nu există utilizări directe ale `EngineAPI` în cod de aplicație → conform.  
  - În interior, `TheoryDSLEngine` și alte module cooperează direct cu `EngineAPI`, ceea ce e permis de DS, dar FS-ul nu precizează explicit această excepție internă.
- Concluzie: din perspectiva API public, codul este conform; totuși, FS ar beneficia de o clarificare că modulul DSL poate apela `EngineAPI` intern.

### 2.3 FS-10 – Persistență și versionare – parțial implementat

- FS-10 cere:
  - separarea clară a stocării teoriilor de runtime,
  - snapshot-uri versionate și audit trail pentru modificări,
  - adapter pluggable `TheoryStorage` cu cache JSON / invalidare.  
- Cod:
  - `src/support/storage.js` implementează un `StorageAdapter` pentru concepte și teorii pe fișier, cu root configurabil; există și integrare cu `Config` și `AuditLog`.  
  - `src/theory/theory_storage.js` acoperă cache-ul JSON pentru fișiere `.sys2dsl` cu invalidare simplă.  
  - `System2Session.saveTheory/mergeIntoTheory` scriu doar text Sys2DSL, fără gestionare clară de versiune sau scheme de snapshot/version ID cerute explicit de FS-10.
- Concluzie: cerința de "pluggable storage + cache" este în mare parte satisfăcută; partea de "versionare" formală este doar minimală/implicită (prin fișiere), nu există gestionare clară de versiuni numerotate sau API de snapshot-uri.

### 2.4 FS-11 / FS-14 / FS-15 – Comenzi de administrare și ontologie

- FS-11 cere operații administrative: listarea teoriilor, inspecții de concepte, vizualizare conflicte, re-clustering etc.  
- Cod:
  - `EngineAPI` nu expune încă o suprafață administrativă completă; majoritatea operațiilor sunt în DSL: comenzi în `src/theory/dsl_commands_core.js`, `dsl_commands_ontology.js`, `theory_preloader.js`.  
  - `AgentSystem2` oferă doar `createSession()`; nu există o metodă `listTheories()` conform DS(/interface/agent_system2.js).  
  - `docs/specs/interface/agent_system2.js.md` cere explicit `listTheories()`→ această metodă lipsește complet din cod.
- Concluzie: FS-11 și DS(/interface/agent_system2.js) nu sunt complet implementate – lipsește `AgentSystem2.listTheories()` și nu există o suprafață directă de administrare la nivel de API.

### 2.5 FS-16 / FS-17 – Preloading și registry meta-teorii

- FS-16 (base theory preloading) și FS-17 (meta registry) prevăd:
  - preîncărcarea teoriilor de bază (ontologie/axiologie etc.) cu cache,  
  - un registry de teorii cu metadate, și integrarea lor în Strategia de reasoning.
- Cod:
  - `src/theory/theory_preloader.js` există și este folosit de `System2Session._loadBaseTheories()` – preloading-ul este implementat și conectat la Config/profile.  
  - `src/theory/meta_theory_registry.js` există, dar este slab integrat în fluxul principal (nu e folosit sistematic de Reasoner/EngineAPI pentru selecția inteligentă de teorii).  
- Concluzie: FS-16 este în mare parte acoperit; FS-17 e numai parțial – registry-ul există dar este puțin folosit în codul curent.

### 2.6 DS(/interface/api.js) – API public al EngineAPI vs. implementare

- Spec cere metode: `ingest`, `ask`, `setContext`, `pushTheory`, `popTheory`, `listConcepts`, `inspectConcept`, `validate`.  
- Cod (`src/interface/api.js`):
  - implementează `ingest` (NL), `ingestDSL` (DSL-only, în plus față de spec), `ask`/`askDSL`/`counterfactualAsk`, metode pentru IS_A (deduceIsA/deduceTransitive/deduceWithInheritance), și `validate`.  
  - `setContext`/`pushTheory`/`popTheory` apar doar indirect prin DSL/theory stack; nu există metode publice simple cu acele nume în clasă.  
  - `listConcepts` și `inspectConcept` sunt implementate via `ConceptStore.listConcepts()` și `snapshot()` (nume de metode potrivite cu DS).  
- Concluzie: EngineAPI are o suprafață mai bogată decât DS și lipsește exact analogul unor metode (`setContext`, `pushTheory`, `popTheory`). Funcționalitatea este disponibilă indirect (prin DSL/theoryStack), deci nu e o lipsă fatală, dar DS nu reflectă fidel API-ul real.

### 2.7 DS(/support/config.js) – Conformitate aproape completă, dar cu câteva deviații minore

- Spec cere:
  - dimensiuni în {512, 1024, 2048, 4096},  
  - partiții fixe ontology [0–255], axiology [256–383],  
  - `get`, `getPartition`, `getIndexStrategy`, `getPersistenceStrategy`, `snapshot`,  
  - profiluri `auto_test`, `manual_test`, `prod` cu valori recomandate.  
- Cod (`src/support/config.js`):
  - respectă domeniile de valori și profilurile; aplică profile defaults și validează cu `_validate`.  
  - implementează metodele publice cerute și setează partițiile exact ca în spec.  
  - folosirea `_loadProfileFile()` pentru `config_profile.json` este un plus față de DS (nu contrazice nimic, doar extinde mecanismul).  
- Concluzie: conformitate bună; nu s-au identificat abateri majore.

### 2.8 ValidationEngine – acum complet aliniat cu DS

- DS(/reason/validation.js) cere metode: `checkConsistency`, `proveInclusion`, `abstractQuery`, `findCounterexample`.  
- Cod actual (`src/reason/validation.js`):
  - implementează `checkConsistency` și `proveInclusion` cu logică detaliată (inclusiv integrare cu `TheoryStack`);  
  - implementează `abstractQuery(spec)` cu mai multe tipuri suportate (`intersection`, `union`, `subsumption`, `nearest`, `exists`) și este apelat și prin `EngineAPI.validate`;  
  - implementează `findCounterexample(assertion, options)` cu subrutine concrete pentru tipuri de afirmații (`inclusion`, `exclusion`, `subsumption`) și contorizarea `_stats.counterexamplesFound`.  
- Concluzie: față de versiunea raportată inițial, ValidationEngine este acum în mare măsură conform cu DS – toate metodele publice specificate există și au implementări funcționale, în plus față de ce prevedea pseudocodul.

## 3. Zone în care codul conține funcționalități neacoperite de specificații

### 3.1 EngineAPI – DSL-only API și IS_A variants

- `EngineAPI.ingestDSL` / `askDSL`:
  - DS(/interface/api.js) menționează doar API-ul "session-facing" agregat; metodele DSL-only nu sunt descrise, dar sunt folosite extensiv de teste/DSL.  
- Gestionare IS_A variants în `EngineAPI` și `ConceptStore`:
  - Codul introduce niveluri de existență (CERTAIN/DEMONSTRATED/POSSIBLE/UNPROVEN/IMPOSSIBLE) și mapări `IS_A_CERTAIN` etc.; FS/DS tratează existența doar conceptual (prin FS-open-world și DS-existence-dimension).  
  - Documentele de existență/FS_open_world acoperă parțial această semantică, dar mapping-ul concret pe valori [-127..127] și modul în care `ConceptStore.getBestExistenceFact` funcționează nu este descris explicit în DS pentru `EngineAPI`/Reasoner.

### 3.2 System2Session – preloading / mergeIntoTheory / reset detaliate

- DS(/interface/system2_session.js) descrie doar API-ul de bază.  
- Cod adaugă:
  - `getPreloadStats()` – nu are corespondent în DS.  
  - parametrii `loadBaseTheories` și `skipPreload`, plus integrarea cu `TheoryPreloader`.  
  - opțiuni `strategy` pentru `mergeIntoTheory` implementate simplu (prepend/append) fără ca DS să detalieze strategia.

### 3.3 DSL Engine – comenzi high-level și utilitare

- `src/theory/dsl_engine.js` conectează un modul `DSLCommandsHighLevel` și `DSLCommandsOntology` care implementează comenzi agregate (e.g. programe de sănătate/narativă, introspecție ontologică).  
- DS(/theory/dsl_engine.js) menționează doar setul "MLP" de primitive; multe comenzi high-level testate în fixtures (health, narrative, export) apar în specificații separate (macros), însă mapping-ul exact între comenzi și implementări JS nu este complet documentat în DS-ul de motor.

### 3.4 ChatEngine și handler-ele de chat

- `chat/chat_engine.mjs` are un DS DRAFT destul de detaliat; codul:
  - implementează pending actions, istoricul conversațiilor, integrarea cu AgentSystem2, heuristici + LLM pentru detectarea intenției, etc.;  
  - conține logica pentru gestionarea directorului `.AGISystem2` (data/theories) și a sesiunilor, care nu este pe deplin descrisă în DS (DS-ul e mai degrabă conceptual).  
- Diferențele sunt în zona de UX (mesaje, fallback-uri), nu în miezul arhitecturii.

## 4. Zone importante în care lipsesc implementări față de DS, dar sunt marcate explicit ca TODO

În aceste cazuri, specificațiile recunosc explicit că funcționalitatea nu e încă implementată:

- DS(/knowledge/concept_store.js): clustering cu `ClusterManager` – codul are doar `// TODO: Implement proper clustering via ClusterManager`.  
- DS(/reason/contradiction_detector.js): contradictii de tip "direct negation" cu temporalitate; codul nu le implementează, după cum DS anunță.  
- DS(/reason/validation.js): `abstractQuery` și `findCounterexample` lipsesc în cod.  
- DS-uri de trustworthy_ai (FS_open_world_semantics, DS_existence_dimension, DS_hook_system) descriu mecanisme de hook-uri și control al execuției; în cod există doar piese parțiale (e.g. audit log, existence index), nu un sistem complet de hook-uri conform DS.

## 5. Rezumat pragmatic

- **În mare**, structura globală (VectorSpace/ConceptStore/Reasoner/TheoryStack/DSL/AgentSystem2/System2Session) este bine aliniată cu FS și DS – modulele-cheie există și sunt conectate conform arhitecturii descrise.  
- **Nonconformități notabile**:
  - `ValidationEngine` nu are toate metodele promise de DS.  
  - `AgentSystem2` nu implementează `listTheories()` deși este cerut în DS.  
  - Reasoner nu expune un format unitar de rezultat cu proveniență completă pentru toate modurile, cum cere FS-07.  
  - Registry-ul de meta-teorii nu este integrat suficient pentru a satisface complet FS-17.  
  - Unele features sunt doar parțial implementate sau marcate TODO (clustering complet, tipuri de contradicții avansate, abstract validation).
- **Elemente extra în cod, fără acoperire completă în specificații**:
  - API-uri DSL-only în `EngineAPI` (`ingestDSL`, `askDSL`) și logica detaliată de existență.  
  - Parametri suplimentari și statistici de preloading în `System2Session`.  
  - Comenzi high-level în DSL și integrarea lor practică pentru use-case-uri (health, law, narrative) depășesc descrierea minimală din DS-urile de bază.  
  - ChatEngine are o implementare mai bogată decât DS-ul DRAFT (confirmări multi-limbă, fallback-uri, configurarea directoarelor).

Aceste observații ar trebui să ofere o bază pentru:
- actualizarea DS-urilor unde codul a evoluat (ex. EngineAPI, System2Session, Reasoner),  
- marcarea mai clară a stării reale (IMPLEMENTED/PARTIAL/TODO) per cerință,  
- planificarea etapelor următoare pentru alinierea completă la FS/NFS/URS.

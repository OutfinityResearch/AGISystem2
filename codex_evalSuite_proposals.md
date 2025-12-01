# Evaluation Suite Coverage & Improvement Plan

## Observații rapide (acoperire actuală)
- Rezultate raportate: `tests/results/test_results.json` are timestamp 2025-12-01 și profile `auto_test`; e probabil stocat/învechit, nu o execuție recentă.
- 34 suite raportate, dar 26/34 au un singur test (`total <= 1`) – ex. `abductive_causal`, `analogical_reasoning`, `relation_permuter`, `temporal_memory`, `vector_space`. Testarea este superficială pentru majoritatea modulelor.
- Doar câteva suite au volum: `phase3_edge_cases` (29), `sys2dsl_commands` (20), `cli_integration` (19), `theory_layering` (12), `forgetting` (11), `usage_tracking` (11). Acestea domină scorul, ceea ce poate masca lacunele altor componente.
- Divergență specificații vs. cod: `docs/specs/tests/` conține suite inexistente (`bias_audit`, `deontic_reasoning`, `persistence_file_binary`, `relations_bootstrap`, `sys2dsl_syntax`, `usecase_integration`, `validation_engine`) și lipsesc specificații pentru suite prezente (`abductive_geometric`, `bounded_diamond`, `contradiction_detector`, `inference_engine`, `phase2_integration`, `phase3_*`, `property_mapping`, `reasoner_timeout`, `storage_adapter`, `temporal_memory`, `theory_layering`, `theory_persistence`, `vector_space`). Matrix-ul de acoperire nu este de încredere.
- Evaluarea NL în `evalsuite/runSuite.js` este laxă: ignoră `expected_facts` în modul NL (nu validează extracția factelor), iar analiza răspunsului folosește regex-uri simple pe text („yes/no/maybe”), acceptând pasarea chiar cu DSL `UNKNOWN` dacă există indicatori în text. Asta crește riscul de fals pozitive și deducții exagerate.
- Execuția standard a evalsuite depinde de `bin/AGISystem2.sh` + LLM/translator extern; fără verificare deterministă sau fallback mock, rezultatele pot varia și nu sunt repetabile în CI.

## Goluri și suprapuneri
- Lipsă acoperire pentru plugin-urile computabile (math/datetime/logic/physics) și pentru determinismul translatorului: nu există teste care să valideze că relațiile computabile dau rezultate deterministe sau că normalizarea NL→Sys2DSL e stabilă.
- Persistență/stres: există `storage_adapter` și `theory_persistence` cu câte un test; nu există teste de volum, concurență sau recuperare după corupție/întrerupere.
- Geometric/LSH: nu se măsoară performanță sau calitatea ranking-ului retrieverului (LSH vs. exact), nici sensibilitatea la dimensiuni/config.
- Bias/deontic: `suite_05_bias_masking` acoperă axiologia, dar nu există suite dedicate pentru deontic în `tests/` (doar în evalsuite). Testele formale `deontic_reasoning` lipsesc din repo.
- Contradictii/consistență: `contradiction_detector` are un singur test; nu verifică cardinalități, cicluri complexe sau disjuncții moștenite multiple.
- Contrafactual și temporal: `counterfactual_layering` are 1 test și e marcat failed în rezultatele curente; `temporal_memory` are 1 test superficial. Nu există scenarii mixte counterfactual+temporal.
- Rezultatele evalsuite (NL) nu verifică că faptele extrase din `natural_language` corespund `expected_facts`; în modul implicit, succesul poate veni doar din răspunsul la întrebări, fără a valida baza de cunoștințe învățată.

## Plan propus (iterativ, orientat pe acoperire și rigoare)
1) **Sincronizare specificații/teste**  
   - Actualizează `docs/specs/tests` și `matrix.html` cu liste reale de suite; marchează suitele inexistente ca „missing” și adaugă DS pentru suitele prezente fără documentație (abductive_geometric, contradiction_detector, inference_engine, temporal_memory, phase2/3, storage_adapter, theory_layering/persistence etc.).  
   - Regenerarea `tests/results/test_results.json` din rulări actuale și eliminarea timestamp-ului în viitor; alimentează fallback-ul din `matrix.html` cu rezultate reale.

2) **Întărire evalsuite (determinism + asprime)**  
   - Fă `--direct-dsl` modul default în CI; cere `expected_dsl` pentru fiecare query și eșuează dacă lipsește sau nu se poate parsa.  
   - După încărcarea teoriei, validează că store-ul conține toate `expected_facts` (diferență simetrică) înainte de a rula întrebările.  
   - În modul NL, loghează și verifică și DSL-ul efectiv returnat (`[Structured Result]`), nu doar heurstici de text; eșuează dacă DSL e `UNKNOWN` sau lipsește.  
   - Scoate „weak NL pass” (acceptarea răspunsurilor textuale când DSL zice UNKNOWN); require concordanță între DSL și așteptat.

3) **Extindere acoperire pe zone critice**  
   - **Plugins computabile**: suite noi pentru `MathPlugin` (PLUS/MINUS/LESS_THAN), viitor `datetime/logic/physics` cu valori concrete și erori așteptate.  
   - **Translator determinism**: suite cu translator stub (fără LLM) care validează mapping NL→Sys2DSL pentru șabloane repetitive; măsurăm drift/aleator.  
   - **Retriever/LSH**: teste de ranking (cazuri cu vecini apropiați vs. distanți), comparație cu distanță exactă, și sensibilitate la parametrii LSH din `Config`.  
   - **Persistență/reziliență**: scenarii de salvare/încărcare cu snapshot-uri, întrerupere simulată, plus verificarea integrității binare.  
   - **Contradicții și cardinalități**: seturi mai mari cu disjuncții moștenite, relații funcționale multiple, cardinalități min/max, și așteptare de erori explicite.  
   - **Counterfactual + temporal**: cazuri mixte unde o teorie temporară afectează rotația temporală și apoi se revine la starea anterioară.

4) **Adâncire suitele cu 1 test**  
   - Extinde suitele minimaliste (abductive_causal/geometric, contradiction_detector, inference_engine, relation_permuter, temporal_memory, vector_space) cu cel puțin 5-10 cazuri care acoperă happy path + edge cases (ex. permutări inverse, saturare int8, limite de rază, cazuri de timeout).  
   - Adaugă teste negative/PLAUSIBLE/UNKNOWN pentru a evita „deducții” marcate TRUE de heurstici textuale.

5) **CI și raportare**  
   - Rulează evalsuite în CI în modul DSL (determinist), separă job pentru NL+translator marcat ca „non-blocking” dar raportat.  
   - Publică rezultate în `tests/results/test_results.json` și sincronizează fallback-ul din `matrix.html`; eșuează CI dacă există suite documentate dar lipsă sau invers.  
   - Adaugă un mic raport de acoperire (nr. teste per suite, % negative/plaubile) pentru a monitoriza progresul și pentru a preveni superficialitatea.

6) **Curățare documentație**  
   - Actualizează `evalsuite/README.md` la structura actuală (`suite_01_ontology`…`suite_12_recursive_large`) și documentează modul default (DSL vs. NL), plus criteriile stricte de verdict.  
   - Leagă fiecare suite eval din README și din `docs/architecture/evalsuite.html` de URS/FS/DS relevante, pentru a vedea ce cerințe acoperă și ce rămâne descoperit.

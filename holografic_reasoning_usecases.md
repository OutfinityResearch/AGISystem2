# Holografic Reasoning (HDC) — Use cases & trade-offs

Document de analiză (AGISystem2) pentru 3 direcții:
1) dacă merită “closure” holografic (A: pre-closure, B: query-time closure),
2) un “reasoning engine” pur holografic expus la nivel de Session,
3) folosirea sistemului ca “thinking database” / RAG holografic (KB mic, documente).

## Context: ce avem deja în runtime

- `Session` deține un context HDC session-local: `session.hdc` (ops: `bind/bundle/unbind/similarity/topKSimilar`), plus `session.vocabulary`, `session.componentKB`, `session.factIndex`, `session.getKBBundle()`, `session.query(dsl, options)`, `session.generateText(...)`, `session.describeResult(...)`.
- Motorul “query” **nu e pur holografic** azi:
  - în `symbolicPriority` (QueryEngine) HDC e o sursă de “candidates” (Master Equation), dar rezultatul final e dominat de metode simbolice (direct matches, transitive, rules, etc.).
  - în `holographicPriority` (HDC-first engine), se încearcă UNBIND+decode+validare, apoi există fallback la symbolic **doar dacă** HDC n-a validat nimic.
- Interfața `Session` lucrează cu DSL ca input (`session.query(dsl)`); NL→DSL e în “pipeline”-uri/evals, nu ca API single-call în `Session`.

---

## 1) Merită “closure” holografic? (A vs B)

### Definiție scurtă
Prin “closure” înțelegem să aplicăm reguli / inferențe repetat până la un punct fix (forward-chaining / saturare) ca să putem răspunde mai rapid la query-uri.

### A) Pre-closure / offline closure (la load sau incremental)

**Idee:** la încărcarea teoriei/KB, derivezi fapte suplimentare și le adaugi (eventual până la fixed-point, sau până la un depth/limit).

**Ce câștigi (când chiar câștigi):**
- Query-time: mai multe răspunsuri devin “direct matches” sau “shallow retrieval”.
- Pentru clase simple (ex. `isA` transitive), poți transforma query-uri de lanț în lookup-uri.

**Cost / risc:**
- Explozie de KB (mai ales la reguli generale); crește `kbScans`, degradează performanța la scanări, și poate face orice “semantic retrieval” mai scump.
- Pentru strategii aproximative (dense/metric/sparse aprox): adăugarea de derivați în superpoziție crește saturația și scade separabilitatea (în practică, exact ce vrei să măsori în “saturation” eval).
- Pentru EXACT: closure e “mai sigur” (dedup exact), dar costul poate exploda în număr de termeni dacă produci multe derivații.

**Când e recomandat:**
- KB mic (zeci/sute/mii de fapte), reguli puține, domeniu restrâns.
- Closure controlat: “doar transitive closure pe relații marcate transitive”, cu depth cap + dedup + caching.

**Când nu merită:**
- KB mare sau reguli puternic generative (ex. combinatoriale).
- Când scopul experimentului e chiar să vezi degradarea holografică sub superpoziție: pre-closure îți schimbă “geometria” problemei.

### B) Query-time closure (closure “în timpul query-ului”)

**Idee:** în timpul rezolvării, faci iterare/expansiune (beam search / BFS) în spațiul holografic: UNBIND → decode → aplici operatori → re-UNBIND etc.

**Ce câștigi (teoretic):**
- Nu “poluezi” KB cu derivați permanenți.
- Poți adapta depth/beam la dificultatea query-ului.

**De ce e greu să fie *mai rapid decât symbolic* în practică:**
- HDC-first are de obicei costuri mari în:
  - `topKSimilar` (similarity checks),
  - `kbScans` (scanări/iterări),
  - și validare (proof checks) ca să elimini false positives.
- Closure query-time amplifică exact acești termeni (mai multe iterații, mai multe decode-uri, mai multe verificări).

**Când are sens:**
- Query-uri “template” foarte structurate (puține holes), unde un UNBIND bun îți dă direct un set mic de candidați și poți opri repede.
- KB mic sau KB pre-indexat pe componente.
- Strategie EXACT, unde “witness/subset” poate reduce masiv spațiul de căutare (fără similarity floating).

### Concluzie pragmatică (A vs B)

- Dacă “closure” e scop de cercetare: merită implementat **într-o formă limitată** (o relație, depth mic, metrici clare).
- Dacă “closure” e scop de performanță generală: în AGISystem2 curent, cel mai probabil **nu** bate motorul simbolic pe clasele grele (rules/transitive/CSP), pentru că symbolic are indexuri, pruning, și reprezentații exact verificabile.
- Câștigul realist e să identifici **clase** unde holografic e “magic de rapid” (lookup/retrieval), nu să încerci să reproduci complet deductive closure.

---

## 2) “Pure holographic reasoning engine” expus în `Session`

### Întrebarea 1 (direct): avem expusă “ecuația holografică” și utilitare ca să interoghez direct?

**Da, la nivel low-level există deja:**
- `session.hdc` expune `bind/bundle/unbind` (ecuația holografică).
- `session.getKBBundle()` îți dă vectorul KB (superpoziția de fapte) pentru ecuația `UNBIND(KB, question)`.
- `session.vocabulary` + `session.resolve(name)` îți permit să construiești vectori de atomi din simboluri.
- Pentru “traducere”, ai:
  - `session.generateText(operator, args)` (generator de text),
  - `session.describeResult(...)` / `session.formatResult(...)` pentru output structurat.

**Ce nu e încă “one-call” și ar trebui definit dacă vrei un API `holoreasoning(query)->NL`:**
- un wrapper NL→DSL (astăzi NL2DSL e folosit în eval runners; `Session.query` primește DSL),
- un mod “HDC-only” explicit (fără fallback/validare simbolică), cu semantici clare:
  - best-effort,
  - incomplet,
  - posibil false positives,
  - output cu `confidence` + “nu știu” când nu se decodează.

### E fezabil un engine “pur holografic, magic de rapid când merge”?

**Fezabil, dar trebuie să fie explicit ca un mod *heuristic*.** Propunerea realistă:
- `session.holoQueryDSL(dsl, { maxResults, decode, validate: 'none'|'light' })`
- `session.holoQueryNL(text, ...)` (dacă vrei și NL2DSL în interior)

**Ce ar face:**
1) Construiește vectorul “question” (din operator + Pos + arg-uri cunoscute).
2) Rulează ecuația (una sau mai multe): `UNBIND(KB, question)` + `UNBIND(..., PosN)` pentru holes.
3) Decode:
   - EXACT: decode bazat pe subset/witness (nu similarity).
   - restul: `topKSimilar` pe vocabular filtrat (de ex. domeniu tipuri) ca să reduci costul.
4) Returnează:
   - candidați + scor/confidență,
   - eventual “trace” holografic (ce unbind-uri au fost aplicate).

**De ce ar fi rapid în scenariile potrivite:**
- Pentru query-uri care sunt “single-hop retrieval” dintr-o superpoziție (ceea ce e foarte apropiat de RAG), poți evita motorul simbolic complet.

**De ce nu va acoperi tot (și e ok):**
- Query-uri cu closure (transitive/rules), sau cu constrângeri combinatoriale (CSP), sunt exact clasele unde HDC-only devine fie incomplet, fie scump.

---

## 3) “Super RAG” holografic / Thinking database (KB mic, documente)

### Întrebarea 2 (direct): suport pentru “search semantic” și context bun pentru LLM?

**Da, ca direcție, și e una dintre cele mai naturale utilizări pentru HDC în AGISystem2**, mai ales când:
- KB-ul are 1–N documente mari (“book vectors”),
- vrei să extragi rapid “facts/relations relevant to X” ca context pentru un LLM.

### Model recomandat (2-level retrieval)

**Level 1 (doc retrieval):**
- reprezintă fiecare document ca un vector (bundle de capitole/idei/fapte).
- query-ul userului (sau un “topic vector”) → `topKSimilar` pe doc-vectors.
- aici poți folosi `dense/metric` (similarity continuă) sau EXACT (set-based), depinde de ce vrei să măsori.

**Level 2 (fact expansion / grounding):**
- după ce alegi docurile, extragi “facts” candidate:
  - fie prin indexuri simbolice (`factIndex`, `componentKB`) dacă query-ul e expresabil ca pattern,
  - fie holografic (UNBIND/decoding) dacă ai “question templates”.
- apoi convertești în text:
  - DSL statements (pentru LLM ca “structured context”),
  - și/sau NL via `session.generateText(...)`.

### Ce e “decent text” și cum îl produci

În practică, “context bun” pentru LLM înseamnă:
- set mic de fapte (top-N) + relațiile lor relevante (neighbors),
- ordonare (ex. by confidence, by connectivity, by proof depth),
- plus eventual “explanations” scurte (de unde vin: direct / transitive / rule).

Holografic, partea grea nu e să găsești “aproape”, ci:
- să nu bagi zgomot,
- să ai “ground truth” (de ex. proof symbolic) când ai nevoie de fiabilitate.

### Când AGISystem2 devine “thinking database”

Poți folosi sistemul ca:
- **store**: încarci documente ca facts/graphs/macros (DSL),
- **retrieve**:
  - fie `session.query(dsl)` pentru întrebări structurale (exact/logic),
  - fie `session.hdc` + `topKSimilar` pentru retrieval semantic,
- **render**: scoți DSL/NL ca payload pentru LLM.

Pentru KB mic, scanarea brută e acceptabilă. Dacă vrei KB mediu/mare, ai nevoie de:
- indexuri pe componente / tipuri,
- caching pentru `topKSimilar`,
- eventual “doc-first retrieval” ca să reduci spațiul.

---

## Recomandări (pragmatice)

1) **Merită să investim în closure (A/B) doar targetat**: începe cu o singură relație (transitive) și măsoară: timp, KB growth, degradare similarity, recall/precision vs symbolic.
2) **Merită să expunem un API “HDC-only” în Session** pentru:
   - benchmark-uri (să separi clar “retrieval” de “proof”),
   - și pentru un mod RAG/assistant “best-effort” (rapid + incomplet).
3) **Super-RAG holografic e probabil cel mai bun ROI**: retrieval pe doc-vectors + grounding pe facts, cu output DSL/NL curat pentru LLM.


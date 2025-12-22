# Plan de lucru: îmbunătățire reasoning (HDC-priority), convergență semantică, contradicții, planning

Acest plan extinde direcțiile din `hardcoded_theory_analysis.md` (K1–K5) și le operationalizează pentru execuție ulterioară, cu focus pe:
- (1) detectare/gestionare contradicții în `learn()` (theory-driven, atomic),
- (2) demonstrații de contradicție (proof_nl) și suport pentru reducere la absurd (controlat),
- (3) convergența reprezentărilor (același concept exprimat prin 2 căi DSL),
- (4) evoluția `solve` către planning (planuri extrase prin query cu găuri),
- (5) optimizări pentru motorul `holographicPriority` + diferențe între strategii HDC.

---

## 0) Constrângeri / decizii (invariante)

1) **Fără “legacy modes”**: dacă ceva e invalid (DSL sau dependențe), trebuie să pice explicit și devreme.
2) **Atomicitate**: orice `learn()`/load de teorie trebuie să fie “all-or-nothing” (nu poluăm sesiunea cu half-load).
3) **Not ≠ contradicție de load**: `Not` e “negare explicită / blocker”, nu un motiv de respingere automată la `learn()`. Contradicțiile “hard” sunt cele definite de constrângeri (ex. `mutuallyExclusive`, `contradictsSameArgs`).
4) **Nu stricăm suitele rapide**: `npm run eval` trebuie să rămână stabil; orice schimbare de logică trebuie acoperită cu teste + evaluare.

---

## 1) Starea actuală (baseline tehnic)

### 1.1 Pipeline-ul de învățare și rollback
- `src/runtime/session.mjs`: `Session.learn()` rulează `checkDSL()` și apoi `beginTransaction()`; la eșec sau excepție face `rollbackTransaction()` (atomic).
- `src/runtime/session-transaction.mjs`: snapshot complet (scope, vocabulary, kbFacts, rules, graphs, operators etc) + rebuild `ComponentKB`.

### 1.2 Validarea DSL (sintaxă + “dependențe de operatori”)
- `src/runtime/session-check-dsl.mjs`:
  - parse strict (syntax),
  - validează **operatorii**: trebuie să fie builtins / core catalog / declarați în teorie / grafuri existente,
  - validează `$refs` (trebuie să existe în bindings),
  - controlează găuri (holes) pe mod (`prove` fără holes).
- Notă: validarea actuală NU validează încă “depedențe de concepte” din argumente (identificatori în poziție de arg).

### 1.3 Contradicții (azi)
- `src/runtime/session.mjs#addToKB`: cheamă `checkContradiction()` înainte de insert.
- `src/runtime/session-contradictions.mjs`:
  - `Not` este ignorat (nu produce respingere),
  - “hard contradictions” vin din `SemanticIndex`:
    - `contradictsSameArgs` (ex. before/after),
    - `mutuallyExclusive operator valueA valueB` (ex. `hasState Door Open` vs `hasState Door Closed`).
  - Implementarea curentă face scan în `session.kbFacts` (O(n) per fact).

### 1.4 Două motoare de reasoning + trei strategii HDC
- Engines: `symbolicPriority` vs `holographicPriority` (`src/reasoning/index.mjs`).
- Strategii HDC: `dense-binary`, `sparse-polynomial`, `metric-affine` (`src/hdc/strategies/*`).
- Există diferențe majore de cost pe operații (hash/similarity/bind/unbind), care afectează timpul de încărcare și de query/prove.

---

## 2) Workstream A — Contradicții: model unificat, indexare, proof_nl

### 2.1 Definiții (ce tratăm ca “contradicție”)
Separăm explicit:
- **Contradicție hard (reject)**: încalcă o constrângere a teoriilor încărcate (ex. `mutuallyExclusive`, `contradictsSameArgs`, eventual “inverseRelation” + constrângeri de ciclu dacă alegem).
- **Negare explicită (nu reject)**: `Not(...)` sau “Not op x y”; poate coexista cu fapte pozitive pentru a bloca inferență sau a marca excepții.
- **Inconsistență logică derivată (pentru proof, nu neapărat reject)**: se poate demonstra că KB implică `False` (ex. prin două reguli care duc la `P` și `Not P`). Asta e relevant pentru reducere la absurd.

### 2.2 Deliverable: `Contradiction` ca obiect, nu ca string
În loc de string warnings, introducem obiect standard (serializabil):
```js
{
  kind: 'mutuallyExclusive' | 'contradictsSameArgs' | 'inverseCycle' | 'other',
  severity: 'reject' | 'warn',
  newFact: { operator, args, factId?: number },
  conflictingFact?: { operator, args, factId?: number },
  constraint?: { sourceFile?: string, line?: number, text?: string },
  proof?: { steps: Array<...> } // DS19-friendly
}
```
Țintă: `Session.addToKB()` să poată arunca o excepție cu payload (pentru learn rollback + raportare).

### 2.3 Indexare O(1) pentru verificare contradicții
Refactor propus:
- Adăugăm `src/runtime/fact-index.mjs`:
  - `byOpArgsKey`: `Map<string, number[]>` (cheie canonicală: `op|arg1|arg2|...`),
  - `byOpArg0Arg1`: index rapid pentru operatori binari (hot path pentru constraints),
  - helpers pentru “canonical key” (respectă `canonicalizeMetadata`).
- Update `Session.addToKB()`:
  - după insert, actualizează indexele.
- Update `rollbackTransaction()`:
  - rebuild indexele din `kbFacts` (sau le snapshot-uim).

### 2.4 `SemanticIndex` cu “source mapping”
Extindem `src/runtime/semantic-index.mjs`:
- parser-ele (`parseMutuallyExclusive`, `parseContradictsSameArgs`, etc.) să captureze și:
  - fișier + linie (minim) pentru fiecare constraint,
  - textul liniei pentru raportare.
Astfel putem genera proof_nl: “constraint from `config/Core/14-constraints.sys2:12`”.

### 2.5 Proof pentru contradicții (proof_nl)
Deliverable: `buildContradictionProof(contradiction)`:
- include “faptul nou”, “faptul conflictual”, și “regula/constraint”.
- mapare în DS19 (`src/reasoning/proof-schema.mjs`) printr-un `kind: 'contradiction'` sau `kind: 'validation'`.
- `src/output/response-translator.mjs`: când `learn()` e respins din contradicție, să traducă “why” + pași scurți.

### 2.6 Tests (obligatoriu)
Adăugăm teste unit:
- `tests/unit/runtime/contradiction-index.test.mjs`:
  - (a) detectează `mutuallyExclusive` fără scan O(n),
  - (b) detectează `contradictsSameArgs`,
  - (c) `Not` nu produce reject.
- `tests/unit/runtime/session-transaction.test.mjs`: validăm că rollback revine și indexele la starea inițială.

### 2.7 Criterii de acceptanță
- `learn()` respins ⇒ `facts=0`, sesiunea e identică cu snapshot-ul (KB + scope + vocabulary + rules + graphs).
- `learn()` respins din contradicție ⇒ output include `proof_nl` cu “fapte + constraint”.
- Costul “contradiction check” la load de core/stress nu mai este O(n²) (măsurăm prin benchmark).

---

## 3) Workstream B — Reducere la absurd (controlată) + demonstrații

### 3.1 De ce “controlată”
În logici intuitioniste, “reductio” complet (P ↔ ¬¬P) nu e mereu valid. Dar avem cazuri utile:
- detectarea inconsistențelor din constrângeri (hard),
- demonstrații de conflict (“nu se poate învăța X pentru că …”),
- “negation-as-failure” (deja existent) pentru `Not` în condiții.

### 3.2 Extindere minimă: goal `contradiction` / `False`
Adăugăm un goal special în prove:
- `@goal contradiction` sau `@goal False` (decidem un token din core).
Implementare:
- `src/reasoning/prove.mjs` (și hdc-first variant) să poată:
  - scana indexul de contradicții,
  - returna “valid=true” + proof steps când găsește o contradicție hard sau `P` și `Not P`.

### 3.3 “Assume-and-check” pentru explicații (nu default în prove)
O extensie opțională:
- API: `session.assume(dsl, fn)` (transaction nesting) sau `session.whatifAssume(...)`.
- Folosit în:
  - “de ce nu pot dovedi X?” — încearcă să asume premise minime și arată conflictul.
  - “reductio” pentru cazuri strict definite (ex. constraints).
Țintă: să nu afecteze path-ul standard de prove (performance).

### 3.4 Tests
- Test pentru `prove contradiction` (caz `mutuallyExclusive`).
- Test pentru “assume” care nu poluează sesiunea (rollback corect).

---

## 4) Workstream C — Convergență semantică (2 căi DSL → același concept)

Acest workstream este direct în linia `hardcoded_theory_analysis.md`:
- K1: L0 builtins în runtime
- K3: canonicalize Not + pattern-uri macro
- K4: alias/synonym map în ComponentKB

### 4.1 L0 builtins: `___*` devin executabile
Implementare în `src/runtime/executor.mjs` (+ module dedicat):
- `___NewVector(name,theory)` (determinist; nu “random”),
- `___Bind`, `___Bundle`, `___Similarity`, `___MostSimilar`, `___Extend`, `___GetType`.
Notă: pentru început suport minim (doar signature-urile folosite în Core).

### 4.2 Disciplină de atomi (“gate”)
Obiectiv: să reducem cazurile `resolveIdentifier()` → atom ad-hoc.
Pași:
- definim în Core constructori canonici (`__Atom`, `__Named`) și îi facem executabili via L0.
- introducem un “strict dependency mode” (feature flag) în `Session.checkDSL()`:
  - în mode `learn` pentru teorii: refuză identificatori “concept-level” nedeclarați,
  - în mode `learn` pentru user: permite entități noi dacă sunt declarate explicit (ex. `@Alice:Alice __Person`).

### 4.3 Canonicalization structurală (nu doar token names)
Extindem `src/runtime/canonicalize.mjs`:
- `Not (expr)` ↔ `Not $ref` să convergă și în metadata și în vector (unde posibil).
- canonicalize pattern-uri macro (ex. `_mtrans + Request` → `tell`) pe baza unei liste de reguli declarate în Core (`11-bootstrap-verbs.sys2`).

### 4.4 “Amprenta Contextuală” (Distributional Similarity)
Obiectiv: detectăm automat cand 2 concepte sunt probabil echivalente (sau foarte apropiate).
Design:
- construim “context fingerprint” pentru fiecare simbol:
  - set/multiset de (operator, position) în care apare,
  - eventual roluri `__Role` + tipuri (dacă există `typeOf`),
  - normalizare prin canonical names.
- metrici:
  - Jaccard pe seturi discrete,
  - Cosine pe vectori de frecvență,
  - HDC similarity pe vectori “context bundling” (opțional).
Livrare:
- `src/reasoning/distributional-similarity.mjs` + API:
  - `session.suggestSynonyms({ topK, minScore })`
  - sau query meta-op: `similarConcept ?x ?y` etc.
Politică de siguranță:
- nu auto-merge în KB; doar propune;
- merge explicit prin `canonical`/`alias` facts.

### 4.5 Tests
- test că `synonym`/`canonical` determină canonicalizarea token-urilor în metadata.
- test că două forme DSL declarate ca echivalente converg în query/prove (cross-engine).
- test că “suggestSynonyms” e determinist (aceleași rezultate în aceeași sesiune).

---

## 5) Workstream D — `solve` ca planning (planuri extrase prin query cu găuri)

### 5.1 Obiectiv
Să putem scrie probleme de planning în DSL și să obținem:
- un plan (secvență de acțiuni),
- stocat în KB (ca facts + vector compus), astfel încât `query` cu holes să poată extrage pașii.

### 5.2 Design minim al DSL (extindere incrementală)
Reutilizăm `SolveBlock` existent (`src/parser/parser.mjs`), cu `problemType = planning`.
Propunere de declarații (format deja suportat: `varName from Type`):
- `actions from Action` (enumerăm acțiuni),
- `states from State` (enumerăm stări; opțional dacă derivăm din KB),
- `start from StartState`,
- `goal from GoalState`,
- `maxDepth from DepthLimit` (DepthLimit poate fi un literal numeric, necesitând suport numeric real).

Acțiuni în KB (variantă 1, minimă):
- `precond Action Fact`
- `effect  Action Fact`
și un state este un bundle de Facts (`__Sequence`/`__Bundle`).

### 5.3 Implementare motor planning (MVP)
Cod nou: `src/reasoning/planning/*`:
- BFS/IDA* cu limită de adâncime (`maxDepth`),
- reprezentare de stare:
  - symbolic: `Set` de facts (metadata keys),
  - HDC: vector “state bundle” pentru heuristici (opțional).
- verificare precondiții:
  - direct match pe metadata/index (fără similarity).
- aplicare efecte:
  - adaugă/șterge facts (pentru delete, definim `Not` sau `remove` semantics).

Integrare:
- `src/runtime/executor-solve.mjs`: dacă `problemType === 'planning'`, apelează PlanningSolver.
- Output:
  - `planStep planName stepIdx actionName`
  - `planAction planName actionName arg1 arg2 ...` (dacă vrem acțiuni parametric).
  - plus un vector compus similar cu CSP “compoundSolutions”.

### 5.4 Query cu holes pentru plan
După ce planul e stocat:
- `@q planStep myPlan ?i ?a` ⇒ lista de pași.
- `@q planAction myPlan ?a ?x ?y` ⇒ parametri.

### 5.5 Tests
- test e2e: definim 2–3 acțiuni simple + goal, `solve planning` produce plan, query îl enumeră.
- test cross-engine: același plan în `symbolicPriority` și `holographicPriority` (dacă folosim HDC doar ca heuristică).

---

## 6) Workstream E — Optimizări pentru `holographicPriority` + diferențe între strategii HDC

### 6.1 Profilare: unde pierdem timp
Adăugăm instrumentare minimă (fără a polua output normal):
- timers per operație (bind/unbind/similarity/hash) în `src/hdc/facade.mjs` (opțional, sub env flag),
- counters deja există în `session.reasoningStats`.

Țintă: explicăm diferențele observate între:
- `dense-binary` (bitwise rapid),
- `sparse-polynomial` (set ops + sort/hashing),
- `metric-affine` (float/byte ops + thresholds diferite).

### 6.2 Caching/optimizări “safe”
- cache hash per vector în `Vocabulary.hashVector()` (ex. atașăm `vec.__hash`), mai ales pentru SPHDC.
- cache `withPosition(n, vec)` pentru operatori hot (pos vectors).
- reducere similarity checks:
  - dacă metadata match există (direct), evităm HDC fallback.

### 6.3 Calibrare thresholds / candidate ordering (HDC-first)
În `src/reasoning/holographic/*`:
- top-K limit pentru candidați din unbind,
- scoring combinat: similarity + “metadata plausibility” (ex. arg count, operator match),
- păstrăm validarea simbolică ca gardă de corectitudine.

### 6.4 Acceptance
- `npm run eval` rămâne 100% pe toate 6 combinațiile.
- Timpul total pe `sparse-polynomial` și `metric-affine` scade fără a reduce corectitudinea.

---

## 7) Roadmap (ordine recomandată)

1) Workstream A (contradicții + index + proof_nl) — impact mare, risc controlabil.
2) Workstream E (profilare + caching) — quick wins, reduce costul viitoarelor iterații.
3) Workstream C (L0 builtins + canonicalization structurală + atom discipline).
4) Workstream B (contradiction goal + assume-and-check).
5) Workstream D (planning MVP în `solve` + query extraction).
6) Workstream C.4 (distributional similarity) — după ce avem canonical forms stabile.
7) Workstream F (review + consolidare teorii `config/`) — pentru a elimina “teorii superficiale” și incoerențe generate automat.

---

## 8) Checklist de validare la fiecare milestone
- `npm run tests`
- `npm run eval` (toate cele 6 moduri)
- `evals/runStressCheck.js` (default + `--full`), verificat că:
  - nu poluăm `.errors` inutil,
  - raportarea de contradictii/depedențe e stabilă.

---

## 9) Suite noi (deep) pentru a testa aspectele discutate

Obiectiv: să testăm explicit (end-to-end) **validarea strictă**, **atomicitatea la learn**, **contradicțiile hard**, **convergența semantică** și (în viitor) **planning via solve** — fără să facem `npm run eval` semnificativ mai lent.

### 9.1 Extensie minimă pentru EvalSuite (ca să putem testa “learn trebuie să pice”)
Necesare schimbări mici în `evalSuite/lib/runner.mjs`:
- Suport pentru `expect_success: false` pe `action: 'learn'` (și eventual `action: 'prove'/'query'` când vrem să validăm “DSL invalid ⇒ error”).
- Suport pentru `expect_error_includes: string | string[]` ca să verificăm motivul (ex. “DSL validation failed: Unknown operator …”, “Contradiction rejected: …”).
- (Opțional) `assert_state_unchanged: true` pentru o etapă `learn` respinsă: runner-ul face snapshot înainte, apoi compară `session.dump()`/`kbFacts.length`/`scopeBindings` după.

Pentru a păstra rapiditatea:
- Adăugăm un mod separat, ex. `node evalSuite/run.js --deep` sau `npm run eval:deep`, care rulează și suitele din `evalSuite/deep/`.
- `npm run eval` rămâne pe suitele existente (rapide).

### 9.2 Suite deep propuse (rulate doar în `--deep`)

#### `evalSuite/deep/suite23_contradictions_atomicity`
Scop: validează politicile de contradicție + rollback “all-or-nothing”.
- Cazuri:
  - `learn` valid (baseline) + `prove` confirmare.
  - `learn` respins pe `mutuallyExclusive` (hard) + verifică `expect_error_includes`.
  - după respingere: `prove/query` confirmă că KB nu e poluată (faptele “dinainte” încă țin, faptele “din learn respins” nu există).
  - `learn` cu `Not` + un fapt pozitiv compatibil: nu trebuie respins; `prove` arată că `Not` blochează inferența unde e cazul (exceptions).

#### `evalSuite/deep/suite24_strict_dsl_validation`
Scop: verifică strict `checkDSL()` pe toate modurile.
- Cazuri:
  - `prove` cu holes ⇒ trebuie respins (holes disallowed).
  - `learn` cu operator nedeclarat ⇒ trebuie respins (Unknown operator + locație).
  - `learn` cu `$ref` nedefinit ⇒ trebuie respins.
  - `query` cu holes ⇒ trebuie permis.

#### `evalSuite/deep/suite25_semantic_convergence`
Scop: aceeași semantică exprimată în 2–3 moduri ⇒ aceeași comportare în query/prove (și, când avem L0 builtins, aceeași formă canonică).
- Cazuri:
  - `synonym` + `canonical/alias` ⇒ query/prove trebuie să fie invariant la sinonime.
  - `Not $ref` vs `Not (expr)` (după canonicalizarea structurală) ⇒ comportament identic în “exception blocks”.
  - (după K1/K3) macro-vs-manual: `tell` vs pattern echivalent ⇒ query/prove identic.
- (Opțional) acțiune nouă `assert_similar_vectors: { aRef, bRef, min }` pentru a valida convergența HDC fără să depindem de NL.

#### `evalSuite/deep/suite26_planning_solve` (după Workstream D)
Scop: `solve planning` produce plan + planul e query-able.
- Cazuri:
  - definire mini-domeniu (2–4 acțiuni) + start/goal + `solve planning`.
  - `query planStep myPlan ?i ?a` enumeră pașii în ordine.
  - negative: “no plan exists” ⇒ rezultat coerent (fără poluare în KB).

#### `evalSuite/deep/suite27_cross_engine_consistency`
Scop: același set de facts/rules ⇒ rezultate consistente între `symbolicPriority` și `holographicPriority`.
- Cazuri:
  - 5–10 query/prove reprezentative (isA chains, rules, defaults/exceptions, solve CSP, meta-ops ca `difference/analogy`).
  - runner-ul raportează “divergențe” între cele două motoare (nu doar pass/fail).

### 9.3 Suite complementare în `tests/` (mai rapide, mai precise)
Pentru comportamente care sunt greu de exprimat în EvalSuite (vector/metadata/index intern):
- `tests/regression/learn-atomicity.test.mjs`: învață un script care ar trebui să pice la jumătate și verifică explicit că `kbFacts`, `scope`, `graphs`, `operators` nu s-au modificat.
- `tests/regression/contradiction-proof.test.mjs`: când respingem o contradicție hard, verificăm că payload-ul include pași suficienți pentru `proof_nl` (după implementarea din Workstream A).
- `tests/regression/canonicalization-convergence.test.mjs`: aceleași query/prove rezultate pe forme DSL diferite (și, când e disponibil, similaritate HDC peste un prag).

---

## 10) Workstream F — Review complet pentru teoriile de bază din `config/` (coerență + “realness”)

Scop: să validăm că teoriile din `config/` sunt:
- coerente intern (nu se contrazic prin constraints),
- coerente între ele (nu definesc semantici incompatibile pentru aceleași predicate),
- “reale” (nu doar liste de cuvinte / roluri arbitrare), adică au operatori/graph-uri care se leagă prin Core și sunt folosite de reasoning fără hacks.

### 10.1 Criterii de acceptanță (“ce înseamnă real/coerent”)
1) **Syntactic + strict DSL**: fiecare fișier `.sys2` parsează și trece `Session.checkDSL()` în mod strict (fără operatori inexistenți).
2) **Dependințe explicite**: orice operator folosit de domeniu e:
   - declarat în același domeniu (graph/Relation), sau
   - definit în Core, sau
   - încărcat explicit ca dependință (nu “merge din noroc”).
3) **Fără definiții “decorative”**: evităm graph-uri care doar “bundles random roles” fără legătură cu kernel-ul (ex. folosirea excesivă de tokens de tip `Domain X` fără sens operațional).
4) **Consistență de semnătură**: pentru operatorii comuni (ex. `locatedIn`, `hasStatus`, `equal/equals`, `at/locatedAt`) stabilim o semnătură canonică și aliasuri direcționale (nu duplicări divergente).
5) **Constraints explicite**: dacă există `mutuallyExclusive`/`contradictsSameArgs`/`inverseRelation`, ele trebuie:
   - să fie localizabile (sursă + linie),
   - să fie compatibile cu grafurile/operatorii pe care se aplică,
   - să nu facă sistemul inutilizabil (ex. constraints care blochează majoritatea învățării).

### 10.2 Metodă de audit (semi-automată + manuală)
Deliverables:
- `config/REVIEW.md` (status + decizii + “canonical operator registry” pe care îl respectăm).
- Raport per domeniu (ex. `config/Biology/REVIEW.md`) cu:
  - operatori exportați + semnături,
  - dependențe (core + alte domenii),
  - probleme detectate (superficial, inconsistent, missing deps, constraint misuse),
  - acțiuni de remediere (rename/alias/merge/delete).

Automatizare (folosind ce avem deja):
- rulează `evals/runStressCheck.js` (sau un script dedicat) pe `config/Core` + `config/*`:
  - syntax errors,
  - unknown operator errors,
  - dependințe lipsă (concepte/operatoare neîncărcate),
  - contradicții hard (când Workstream A e complet).

Manual review (sampling ghidat, nu “citit tot la întâmplare”):
- `config/Core`: verificăm prioritar fișierele care definesc semantici folosite de runtime (`00-relations`, `05-logic`, `10-properties`, `12-reasoning`, `14-constraints`).
- Domenii: începem cu cele folosite în eval (`Law`, `History`, `Biology`, `Physics`, `Math`, `Geography`, `Constraints`) apoi restul.

### 10.3 Strategii de remediere (fără a distruge eval)
1) **Alias înainte de rename**: când schimbăm nume/semnătură, introducem `alias/canonical` astfel încât query/prove să rămână stabile.
2) **Consolidare către Core**: operatori care apar în mai multe domenii (ex. `equal/equals`) se mută în Core sau se standardizează.
3) **Eliminare superficială**: graph-uri fără semantică clară se:
   - înlocuiesc cu operatori core + roluri consistente, sau
   - se elimină dacă nu sunt folosite.
4) **Teste de regresie**: orice modificare de domeniu care atinge suitele din eval trebuie să aibă:
   - un test unit/integration relevant, sau
   - un caz în deep eval suites (secțiunea 9).

### 10.4 Output final așteptat
- “Registry” de operatori canonici (per domeniu + cross-domain).
- `config/` încărcabil strict, fără surprize.
- Teorii cu definiții “reale”: relații exprimate prin graph-uri care compun roluri/structuri canonice, nu doar etichete.

# Plan de lucru (rămas): optimizări reasoning + convergență semantică + planning

Acest plan continuă direcțiile din `hardcoded_theory_analysis.md` și reflectă **starea actuală** din implementare. Este intenționat **scurt**: include doar pașii rămași și, pentru fiecare etapă, unde modificăm codul.

## Status actual (implementat deja)
- Validare strictă DSL înainte de execuție: `Session.checkDSL()` (`src/runtime/session-check-dsl.mjs`) verifică sintaxa + operatori/grafuri + `$refs` + “holes” (în `prove` nu sunt permise) și returnează AST (reutilizat ulterior).
- `learn()` este atomic: rollback complet la orice eroare (`src/runtime/session.mjs`, `src/runtime/session-transaction.mjs`) și returnează numărul de fapte învățate în `result.facts`.
- Contradicții la `learn/addToKB`: reject doar pe constrângeri definite în teorii (ex. `mutuallyExclusive`, `contradictsSameArgs`) + contradicții derivate (lanțuri tranzitive / moștenire), cu `proof_nl` pentru motivare (`src/runtime/session-contradictions.mjs`, `src/runtime/fact-index.mjs`).
- EvalSuite poate testa explicit “learning trebuie să pice” (și că starea nu se schimbă) + avem suită de regresie pentru contradicții (`evalSuite/lib/runner.mjs`, `evalSuite/suite24_contradictions/*`, `tests/unit/runtime/*`).

## Invariante (nu negociem)
- Fără “legacy modes”: dacă DSL-ul e invalid sau cere operatori inexistenți, pica devreme.
- Fără “half-load”: orice load/learn e all-or-nothing (prin tranzacție).
- `Not` nu e motiv de respingere la load; contradicția “hard” vine din constrângeri declarate în teorii.
- Nu inventăm teorii superficiale pentru eval; folosim definiții reale din `config/` (și, dacă lipsește ceva, îl definim corect în Core, nu ad-hoc în evalSuite).

---

## E) Profilare + optimizare `holographicPriority` / HDC (prioritate 1)
Țintă: explicăm și reducem diferențele mari de timp între strategii (în special `sparse-polynomial` și `metric-affine`) fără a schimba semantica rezultatului.

**Schimbări (unde):**
- Script de profiling dedicat (nu `evals/runStressCheck.js`): `scripts/profile-reasoning.mjs`
  - rulează matrici de scenarii (load Core, câteva query/prove reprezentative) și raportează “hotspots” per operație.
- Instrumentare “off by default” (controlată prin env flag):
  - `src/hdc/facade.mjs` (timers/counters per `createFromName`, `bundle/bind/unbind`, `similarity`, `serialize/deserialize`)
  - `src/reasoning/holographic/*` (candidate generation, top‑K pruning, backtracking counts)
  - opțional: `src/runtime/vocabulary.mjs` (hash/reverseLookup cost).
- Optimizări țintite după profilare (doar “safe”):
  - caching (hash / vectori poziționali / operator vectors) în `src/runtime/vocabulary.mjs` și/sau `src/hdc/*`
  - scurtcircuitare: dacă există match simbolic (metadata), nu mai facem fallback HDC inutil (`src/reasoning/*`).

**Teste (unde):**
- Regresie “nu schimbăm rezultate”: cazuri fixe în `tests/unit/reasoning/*` (aceleași bindings și aceeași validitate prove, indiferent de optimizări).

---

## D) `solve` ca planning (prioritate 2)
Țintă: pentru probleme tip planning, `solve` produce un plan ca facts, iar planul e interogabil prin query cu holes (pași/parametri).

**Schimbări (unde):**
- Solver planning MVP: `src/reasoning/planning/*`
  - BFS/IDA* cu limită; state ca set de facts (pe metadata keys), precond/effect ca fapte.
- Integrare în executor: `src/runtime/executor-solve.mjs`
  - suport `problemType=planning` + output canonic în KB: `planStep`, `planAction`.
- EvalSuite (fără “deep mode”):
  - extindere `evalSuite/suite21_goat_cabbage_plus/cases.mjs` cu interogări “următorul pas” pentru stări intermediare.
  - suită nouă “tool usage planning”: `evalSuite/suite25_tool_planning/*` (capabilități tool-uri descrise ca grafuri; motorul scoate un plan de pași pentru un goal).

**Teste (unde):**
- `tests/unit/reasoning/planning.test.mjs` (plan minim, no‑plan, și garanții de non‑poluare la eșec).

---

## C) Convergență semantică + “Operatorul de Activare” (prioritate 3)
Țintă: două căi DSL pentru același concept (ex. “noun→verb action”, macro vs compoziție) să convergă în runtime și între motoare, fără artificii superficiale.

**Schimbări (unde):**
- Păstrarea structurii în metadata pentru expresii compuse (ca să putem recunoaște pattern-uri): `src/runtime/executor-metadata.mjs`
  - evităm degradarea la “doar numele `$ref`” când nu putem face reverse lookup complet.
- Canonicalizare structurală (pattern-uri macro + rolul `Action`/`__Action`): `src/runtime/canonicalize.mjs`
  - reguli clare (de preferat declarative) care normalizează forme echivalente înainte de indexare/prove/query.
- Clarificarea arității grafurilor:
  - fie ajustăm executorul să nu ignore argumente extra (`src/runtime/executor-graphs.mjs`),
  - fie schimbăm grafurile Core care se bazează pe “varargs” (de evitat dacă se poate).
- Builtins `___*` (DS19) doar pentru ce folosim efectiv:
  - modul nou sau extindere în executor (ex. `src/runtime/executor-builtins.mjs`) + wiring în `src/runtime/executor.mjs`.

**Teste (unde):**
- Convergență “macro vs manual”: `tests/unit/runtime/canonicalization-convergence.test.mjs` (aceleași rezultate query/prove).

---

## B) Extinderi pentru demonstrații / reducere la absurd (prioritate 4)
Țintă: explicații mai utile pentru eșecuri și contradicții indirecte, fără a transforma `Not` în motiv de respingere la load.

**Schimbări (unde):**
- Goal explicit “contradicție” în prove (opțional, fără impact pe path-ul standard): `src/reasoning/prove.mjs`
- “What‑if assume” prin tranzacții nested (pentru explain/analysis): `src/runtime/session.mjs`, `src/runtime/session-transaction.mjs`

**Teste (unde):**
- `tests/unit/runtime/assume-rollback.test.mjs` (izolare totală, zero poluare a sesiunii).


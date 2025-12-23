# Plan (următoarele 5–7 zile): operatori de reasoning + unificare semantică între teorii

Țintă: să putem rula reasoning robust (în special `analogy`, `induce`, `abduce`, `deduce`) chiar când teoriile folosesc **nume diferite** pentru același concept / aceeași relație, iar sistemul să poată:
- detecta automat candidate de echivalență (cu “evidence”),
- aplica unificarea **controlat** (numai prin `canonical`/`alias`/`synonym`, fără auto‑merge),
- păstra compatibilitatea între `symbolicPriority` și `holographicPriority`.

## Out of scope (doar sub observație)
- Profilare/perf: folosim `scripts/profileSessionLoad.js` și `evals/runQueryEval.mjs` când apare regresie; nu dezvoltăm tooling nou aici.
- Solve/planning: nu extindem solver-ul acum; doar adăugăm evaluări dacă operatorii noi au nevoie de coverage.

---

## Step  1 — Unificare semantică: semnături de definiții (grafuri/ruli)

### 1.1 Semnături pentru grafuri (alpha‑equivalence) + raport de duplicate
**Scop:** detectăm “aceeași definiție, alt nume” (în special între teorii diferite).

**Cod (unde):**
- Fișier nou: `src/runtime/unification/signatures.mjs`
  - `signatureGraph(graphDeclAst): string`
  - `signatureRule(ruleDeclAst): string`
  - normalizează (alpha‑rename) parametrii (`p1`, `p2`…) și temporarele (`v1`, `v2`…), apoi produce un hash stabil.
- Integrare colectare în timpul `learn`:
  - `src/runtime/session-learn.mjs` (la `GraphDeclaration` / `RuleDeclaration`)
  - index: `session.definitionIndex` (Map signature → array `{ kind, name, source, line }`).
- API:
  - `src/runtime/session.mjs`: `session.reportEquivalentDefinitions({ minDuplicates = 2 })`.

**Tests (unde):**
- `tests/unit/runtime/unification-signatures.test.mjs`
  - 2 grafuri identice cu nume/variabile diferite ⇒ aceeași semnătură
  - 2 reguli alpha‑equivalente ⇒ aceeași semnătură

---

## Step  2 — Unificare semantică: “Amprenta Contextuală” (Distributional Similarity)

### 2.1 Index de contexte pentru operatori și entități
**Scop:** găsim echivalențe între concepte (operatori/entități) chiar dacă nu sunt textual similare.

**Cod (unde):**
- Fișier nou: `src/runtime/unification/context-fingerprint.mjs`
  - extrage “features” din `session.kbFacts` (pe metadata canonicalizată):
    - pentru entități: `(operator, position, otherArg)` (ex. `hasState@1:Door → Open`)
    - pentru operatori: distribuții de tip `(arg0Type, arg1Type)` (din `isA`) + parteneri frecvenți
  - metrici:
    - Jaccard pe seturi de feature‑uri (rapid, robust)
    - Cosine pe feature counts (când avem suficiente date)
- API:
  - `src/runtime/session.mjs`: `session.suggestEquivalences({ kind: 'operator'|'entity', topK, minScore })`
  - fiecare sugestie include `evidence` (top features shared) + scor.

**Tests (unde):**
- `tests/unit/runtime/context-fingerprint.test.mjs` (determinism + sugerează perechi așteptate într-un KB mic)

---

## Step  3 — Unificare aplicabilă: generare DSL + canonicalizare “Activation Operator”

### 3.1 Aplicare controlată: generăm DSL de `canonical`/`synonym` (nu aplicăm automat)
**Scop:** din sugestii → un snippet `.sys2` pe care îl putem accepta/revizui manual.

**Cod (unde):**
- Fișier nou: `src/runtime/unification/suggestions-to-dsl.mjs`
  - transformă sugestiile în linii DSL (`canonical A B`, `synonym A B`)
  - filtrează token-uri rezervate / builtins / non‑tokens.
- Script nou: `scripts/unificationSuggestions.mjs`
  - încarcă Core + teorii țintă, rulează `suggestEquivalences`, scrie un raport Markdown + snippet `.sys2` (propuneri).

**Tests (unde):**
- `tests/unit/runtime/unification-suggestions-to-dsl.test.mjs` (nu generează linii pentru token-uri rezervate, scorul determină ordinea)

### 3.2 Canonicalizare pentru “Operatorul de Activare” (noun→verb)
**Scop:** formele compuse din Core (ex. pattern-uri cu `Action`/`__Action` și roluri) să convergă la aceeași formă canonică în metadata, astfel încât operatorii de reasoning să “vadă” aceeași semantică.

**Cod (unde):**
- `src/runtime/executor-metadata.mjs`
  - păstrează metadata structurală pentru expresii compuse (mai ales când apar `$refs` către vectori compuși).
- `src/runtime/canonicalize.mjs`
  - reguli de rewrite pentru pattern-uri canonice (declarate în Core) astfel încât:
    - macro vs manual composition → aceeași semnătură metadata
    - `Action`/`__Action` rolurile să fie normalizate consistent.

**Tests (unde):**
- `tests/unit/runtime/activation-canonicalization.test.mjs`
  - două forme DSL echivalente ⇒ metadata canonicalizată identică (operator + args)

---

## Step  4 — Operator upgrade (REASONING_OPERATORS): `analogy` + `induce`

### 4.1 `analogy`: cross-operator (bazat pe unificare)
**Scop:** analogii care funcționează și când relația are alt nume (după `synonym/canonical` sau după “aproape echivalent” din fingerprint).

**Cod (unde):**
- `src/reasoning/query-meta-ops.mjs` (`searchAnalogy`)
  - candidat relație R:
    - exact facts între A și B
    - sinonime/canonice ale operatorului (via `componentKB`)
    - operatori “aproape echivalenți” (din `session.suggestEquivalences(kind:'operator')`, cache-uit)
  - găsește D din facts `R(C, D)`
  - scoring: `score = opSimilarity * directnessBonus * support`
  - `proof` include: `chosenRelation`, `opSimilarity`, `supportFacts`.

**Tests + eval (unde):**
- `tests/unit/reasoning/analogy.test.mjs` (2 relații diferite, unify prin `synonym` ⇒ răspuns corect)
- `evalSuite/suite14_meta_queries/cases.mjs` (2–3 cazuri noi pentru `analogy`)

### 4.2 `induce`: filtrare statistică a pattern-urilor spurious
**Scop:** `induce` să nu returneze “corelații întâmplătoare” ca reguli “certe”.

**Cod (unde):**
- Fișier nou: `src/reasoning/statistics.mjs`
  - Fisher exact / chi‑square (pentru features binare de tip “are property”)
  - helper pentru counts din ComponentKB.
- `src/reasoning/query-meta-ops.mjs` (`searchInduce`)
  - pentru fiecare property candidat: calculează `support`, `pValue`, `confidence`
  - filtrează după praguri (constante noi în `src/core/constants.mjs`)

**Tests + eval (unde):**
- `tests/unit/reasoning/induce-statistics.test.mjs` (KB noisy → filtrează pattern fals)
- `evalSuite/suite14_meta_queries/cases.mjs` (1 caz nou cu noisy data controlată)

---

## Step  5 — Operator upgrade (REASONING_OPERATORS): `abduce` + `explain`

### 5.1 `abduce`: scoring Bayesian (fără “method modes”)
**Scop:** ranking corect când există mai multe explicații (base rates / priors).

**Cod (unde):**
- Fișier nou: `src/reasoning/bayesian-abduce.mjs`
  - priors din `frequency X p` (dacă există) sau estimate din KB
  - likelihoods din `causes` (și/sau rules simple)
  - calculează posterior + include în `proof`.
- `src/reasoning/abduction.mjs`
  - integrează Bayesian scoring când sunt 2+ candidați.

**Tests + eval (unde):**
- `tests/unit/reasoning/abduce-bayesian.test.mjs` (două cauze cu priors diferite → ranking stabil)
- suită nouă: `evalSuite/suite25_abduce_probabilistic/cases.mjs` (1–2 cazuri)

### 5.2 `explain`: contrastiv + “why fail”
**Scop:** explicații utile pentru utilizator: “de ce A și nu B?” / “de ce nu pot demonstra X?”.

**Cod (unde):**
- Fișier nou: `src/reasoning/explanation.mjs`
  - `summarizeProof(proveResult)` (minimal chain + highlights)
  - `explainWhyNot(goalDsl, foilDsl?)` (prima premisă lipsă / conflict relevant)
- Integrare API (decizie):
  - fie adăugăm `Session.explain(...)` în `src/runtime/session.mjs`,
  - fie extindem `session.prove()` să includă câmp explicit de explain (în payload) și îl randăm via `ResponseTranslator`.
- Dacă introducem `action: "explain"` în EvalSuite:
  - update `evalSuite/lib/runner.mjs`
  - update specs: `docs/specs/DS/DS14-EvalSuite.md`, `docs/specs/DS/DS07h-Reasoning.md`
[ore_ont_457.owl](../../Downloads/ore2015_sample/pool_sample/files/ore_ont_457.owl)
**Tests (unde):**
- `tests/unit/reasoning/explain-contrastive.test.mjs`

---

## Criterii de acceptanță (practic)
- `evals/runQueryEval.mjs` arată îmbunătățiri măsurabile pentru query-urile de `analogy`/`induce`/`abduce` (pe minim `dense-binary` și `metric-affine`).
- `npm run tests` și `npm run eval` rămân verzi.
- Unificarea semantică rămâne controlată: sistemul doar **sugerează**; unificarea efectivă se face numai prin facts (`canonical`/`synonym`/`alias`) acceptate explicit.

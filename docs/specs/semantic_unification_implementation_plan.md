# Semantic Unification (DS19) — Plan de implementare

**Status:** draft, plan de lucru (non-normativ)  
**Leagă:** `docs/specs/DS/DS19-Semantic-Unification.md`  
**Scop:** să ajungem la canonicalizare + „proof real” pentru ambele motoare (symbolicPriority și holographicPriority)

---

## 1) Rezultatul dorit (ce înseamnă „done”)

1. Orice input DSL (learn/prove/query) trece printr-o **canonicalizare unică**, deterministă.
2. **Fapte echivalente semantic** (definite pe căi diferite) ajung la aceeași reprezentare canonicală:
   - metadata canonicală identică (operator/args normalizate),
   - vectori HDC identici sau explicabil echivalenți printr-un pas canonical (de ex. alias-map).
3. `Session.prove(...)` returnează **un proof object verificabil** (validabil offline) pentru:
   - reasoning simbolic,
   - reasoning holografic (HDC-first) cu pas explicit de validare simbolică.
4. Proprietățile de relații (transitivitate/simetrie/reflexivitate/…​) sunt **theory-driven** (din `config/Core/*.sys2` încărcate), nu din liste JS hardcodate sau fallback-uri opace.
5. Există teste DS19 care blochează regresii (canonical equivalence, proof validation, dual-engine consistency).

---

## 2) Ce am verificat în cod (starea curentă, pe scurt)

| Zonă | Observație | De ce contează pentru DS19 |
|---|---|---|
| `src/runtime/executor.mjs` | Construiește vectori + metadata (în unele locuri) dar NU are o etapă explicită de canonicalizare AST/metadata înainte de commit. | Fapte echivalente pot ajunge la vectori/metadata diferite, deci „semantic unification” se rupe. |
| `src/reasoning/prove.mjs` + `src/reasoning/holographic/prove-hdc-first.mjs` | Returnează rezultate cu `steps`, `confidence`, `method`, dar nu un proof schema unificat + validator robust. | DS19 cere „proof real” identic ca schemă între motoare. |
| `src/reasoning/transitive.mjs` | Încarcă unele relații din `config/Core/00-relations.sys2`, dar are și un `defaults` hardcodat. | DS19 cere theory-driven fără hardcodări care schimbă semantica. |
| `config/Core/*.sys2` | Există definiții de relații/roluri/proprietăți și macro-uri (graphs). | Putem extrage meta-informații din theory pentru canonicalizare (alias, properties, templates). |

---

## 3) Arhitectură țintă (componente noi / refactor)

### 3.1 Module propuse

| Modul | Rol | Integrare |
|---|---|---|
| `src/runtime/canonicalize.mjs` | Canonicalizează AST-ul și metadata: alias/synonym, Not normalization, typed atoms, macro normalization. | Apelat în `Session.learn`, `Session.query`, `Session.prove` înainte de execuție/proving. |
| `src/runtime/semantic-index.mjs` | Index determinist derivat din theories: operator properties, alias-map, templates, semantic classes. | Populat la încărcarea core theories; folosit de canonicalizer + reasoners. |
| `src/runtime/builtins.mjs` | Implementarea executabilă a L0 `___*` (NewVector/Bind/Bundle/Similarity/MostSimilar/…). | Folosit de executor (learn-time) și de macro-expansion dacă apar builtins în theory. |
| `src/reasoning/proof-schema.mjs` | Definește schema (shape) unificată a proof object + helperi de construire. | Folosit de ambele motoare + validator. |
| `src/reasoning/proof-validator.mjs` | Verifică proof object: referințe fact/rule, pași transitive, sinonime, defaults, negation. | Folosit în mod debug/CI/test; opțional și în runtime (flag). |

### 3.2 Fluxuri țintă

1. **Learn**
   - parse DSL → AST
   - canonicalize AST (semantic index) → canonical AST + canonical metadata
   - executor evaluează builtins L0 (dacă apar) și persistă fapte cu metadata canonicală stabilă
2. **Prove/Query**
   - parse goal → canonicalize goal (aceleași reguli ca la learn)
   - rule engine lucrează cu metadata canonicală (și cu alias-map când e necesar)
   - returnează proof object conform `proof-schema`
   - validator poate revalida proof fără re-run (replayable)

---

## 4) Workstreams (paralelizabile)

### WS-A — Meta-model în theory (config/Core)

**Obiectiv:** să putem exprima în `*.sys2` (și să extragem) meta-informațiile necesare canonicalizării.

Deliverables:
- convenție minimă pentru:
  - `__TransitiveRelation`, `__SymmetricRelation`, `__ReflexiveRelation`, `__InheritableProperty` (deja există),
  - `synonym` (deja există ca macro/rol) + definirea unui *canonical representative* (ex: `@canonicalName`),
  - tipizare pentru atomi (ex: `__Person`, `__Place`, …) și constructori canonici (ex: `__Named`),
  - template-uri de macro canonicale pe semantic classes (ex: Communication).

### WS-B — Canonicalizer + SemanticIndex (runtime)

**Obiectiv:** un singur loc care decide „cum arată canonical”.

Deliverables:
- `SemanticIndex` populat determinist din core theories încărcate (fără heuristici hardcodate).
- Canonicalizer care:
  - normalizează `Not`,
  - aplică alias/synonym mapping,
  - aplică canonical macro templates (sau respinge în `enforceCanonical`),
  - normalizează nume + tipuri pentru atomi (disciplină de atom).

### WS-C — Execuție builtins L0 `___*` (runtime/executor)

**Obiectiv:** dacă theory folosește `___*`, runtime trebuie să execute sau să dea eroare determinist.

Deliverables:
- map `builtinName -> function` cu:
  - truthy parsing consistent pentru flags (ex: debug / strict modes),
  - determinism pentru `___NewVector(name, theoryId)` (seeded).

### WS-D — Proof schema unificat + validator (reasoning)

**Obiectiv:** „proof real” comun între motoare.

Deliverables:
- schema + `ProofBuilder`
- `ProofValidator` (offline, fără căutare) care verifică:
  - pași `fact` referă KB entries (prin `id` sau metadata canonicală),
  - pași `rule` referă reguli `Implies` existente,
  - `transitive` chain e justificat de property din semantic index,
  - `synonym` step justificat de synonym/alias mapping,
  - `validation` step prezent în holographic mode.

### WS-E — Teste + EvalSuite hooks

**Obiectiv:** să blocăm divergentele și să putem măsura progresul.

Deliverables:
- teste unit (DS19) pentru:
  - canonical equivalence,
  - proof validation,
  - dual-engine consistency.
- ulterior: scenarii EvalSuite care verifică canonical/proof invariants pe seturi mari.

---

## 5) Roadmap fazat (cu dependențe & criterii de ieșire)

### Faza 0 — Stabilizare interfețe (1–2 zile)

| Task | Depinde de | Output |
|---|---|---|
| Definește `proof-schema` minim (structură + tipuri) | nimic | `src/reasoning/proof-schema.mjs` |
| Definește API `SemanticIndex` (ce proprietăți expune) | nimic | `src/runtime/semantic-index.mjs` (schelet) |
| Adaugă teste DS19 ca `todo` (nu blochează CI încă) | nimic | fișiere noi în `tests/unit/semantic-unification/` |

Exit:
- testele DS19 există și rulează (todo), fără import errors.

### Faza 1 — SemanticIndex real (2–4 zile)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Încarcă/parcurge core theories pentru meta (relations/synonyms/templates) | Faza 0 | `src/runtime/semantic-index.mjs`, `src/runtime/session.mjs` |
| Elimină fallback-ul hardcodat pentru relation properties (sau îl face explicit „dev-only”) | cache funcțional | `src/reasoning/transitive.mjs`, `src/reasoning/*` |

Exit:
- `TRANSITIVE_RELATIONS` și similar vin din cache derivat din theories încărcate.

### Faza 2 — Canonicalizer (3–6 zile)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Canonicalizează `Not` (ref vs inline) într-o reprezentare unică | Faza 1 | `src/runtime/canonicalize.mjs`, `src/runtime/executor.mjs` |
| Canonicalizează alias/synonym (metadata + proof steps) | Faza 1 | `src/runtime/canonicalize.mjs`, `src/reasoning/*` |
| Canonicalizează atomi tipizați (disciplină `__*`/`___*`) | Faza 1 | `config/Core/00-types.sys2`, `config/Core/02-constructors.sys2`, canonicalizer |

Exit:
- două formulări DSL echivalente produc metadata canonicală identică (test DS19 devine activ).

### Faza 3 — Builtins L0 executabile (2–5 zile)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Introdu executor builtins map pentru `___*` | Faza 2 | `src/runtime/builtins.mjs`, `src/runtime/executor.mjs` |
| Fail-fast dacă apare builtin necunoscut | Faza 2 | `src/runtime/executor.mjs` |
| Determinism pentru `___NewVector` (seeded) | Faza 2 | `src/runtime/builtins.mjs` |

Exit:
- core theories pot folosi `___*` fără să „bage garbage vectors” silent.

### Faza 4 — Proof unificat + Validator (4–8 zile)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Unifică output-ul dintre `ProofEngine` și `HolographicProofEngine` | Faza 0/2 | `src/reasoning/prove.mjs`, `src/reasoning/holographic/prove-hdc-first.mjs` |
| Implement `ProofValidator` (replayable) | schema stabilă | `src/reasoning/proof-validator.mjs` |
| Introdu `validation` step obligatoriu în holographic mode | unificare | `src/reasoning/holographic/prove-hdc-first.mjs` |

Exit:
- `validate(proof, sessionSnapshot)` întoarce true pentru rezultate valide; teste DS19 devin active.

### Faza 5 — Activare treptată + EvalSuite (continuă)

| Task | Depinde de | Output |
|---|---|---|
| Feature flag `SYS2_CANONICAL=1` + `SYS2_PROOF_VALIDATE=1` | Faze 2/4 | modificări runtime |
| Migrare incrementală a theory files către noile convenții | Faza 2/3 | `config/Core/*.sys2` |
| Scenarii EvalSuite pentru canonical/proof invariants | Faze 2/4 | `evalSuite/*` |

Exit:
- canonical/proof validate ON by default în CI.

---

## 6) Propuneri concrete de schimbări în `config/Core/*` (minim necesar pentru DS19)

| Fișier | Schimbare propusă | Motiv DS19 |
|---|---|---|
| `config/Core/00-relations.sys2` | Adăugare meta pentru proprietăți (ex: `__TransitiveRelation` deja) + eventual un „registry” de properties consumabil de cache (format stabil). | Reasoner trebuie să citească properties din theory, nu din JS. |
| `config/Core/10-properties.sys2` | Clarificare/standardizare `synonym` (ce e canonical vs alias) + reguli de proof step pentru alias expansion. | Sinonimele trebuie să devină pași expliciți în proof. |
| `config/Core/02-constructors.sys2` | Introducere/standardizare constructori pentru atomi tipizați (ex: `__Named`, `__TypedAtom`). | Evităm atomi high-level arbitrar; impunem disciplină. |
| `config/Core/05-logic.sys2` | Standardizare reprezentare `Not` (și ce înseamnă negation-as-failure în core). | Negation canonicală și validabilă. |
| `config/Core/12-reasoning.sys2` | Template-uri canonice pentru macro-urile de reasoning (și semantic classes), folosite de canonicalizer. | „Aceeași semnificație → aceeași formă canonicală”. |

---

## 7) Cum transformăm testele DS19 din `todo` în „active”

1. Faza 0: testele sunt `todo` (doar definesc cerința).
2. După Faza 2: activezi testele de canonicalization (unskip).
3. După Faza 4: activezi testele de proof validation + dual-engine consistency.

---

## 8) Riscuri (și cum le controlăm)

| Risc | Simptom | Mitigare |
|---|---|---|
| Canonicalizer schimbă masiv comportamentul | testele existente se rup | feature flag + compat layer: acceptă vechi forme, dar rescrie la canonical; log warnings. |
| ProofValidator prea strict / incomplet | false negatives | începe minimal (fact/rule/transitive), extinde incremental; în proof păstrezi `detail` suficient. |
| Alias/synonym creează ambiguitate | două canonical candidates | impune „canonical representative” în theory sau o regulă de tie-break deterministă. |

# FastEval Test Cases Assessment Report

**Data analizei:** 2025-12-25
**Autor:** Claude (analiză automată)

Acest raport analizează toate cazurile de test din directorul `evals/fastEval/`, evaluând:
1. Dacă textul NL (natural language) se poate traduce plauzibil în DSL
2. Dacă `expected_nl` este un răspuns plauzibil pentru query/prove
3. Dacă `proof_nl` este clar și înțeles

---

## Sumar Executiv

Din cele 28 de suite analizate, au fost identificate următoarele categorii de probleme:

| Categorie | Număr cazuri | Severitate |
|-----------|--------------|------------|
| Erori semantice (ontologie incorectă) | 8 | Critică |
| Numărare incorectă a pașilor | 15+ | Medie |
| Gramatică incorectă în expected_nl | 12+ | Mică |
| proof_nl neclar/incomplet | 18+ | Medie |
| NL-DSL mismatch (descriere incompletă) | 20+ | Medie |
| Erori logice în dovezi | 5 | Critică |

---

# Capitole pentru Cazuri Problematice

---

## Capitolul 1: Suite 01 - Foundations

### Problema 1.1: Lanțul Carbon este semantic incorect

**Locație:** `suite01_foundations/cases.mjs`, Case 1 (Learn)

**Problema:**
```
input_nl: "Deep chain: Carbon→Atom→Molecule→Cell→Tissue→Organ→Organism→Species→Ecosystem"
```

Lanțul `Carbon isA Atom isA Molecule isA Cell` este **semantic greșit**. În realitate:
- Carbon ESTE un Atom (corect)
- Un Atom NU ESTE o Moleculă - moleculele CONȚIN atomi
- O Moleculă NU ESTE o Celulă - celulele CONȚIN molecule

Acest lanț confundă relația "is-a" (taxonomică) cu "is-part-of" (mereologică).

**Consecință:** Cazurile 4, 6, 10 produc răspunsuri semantic absurde:
- "True: Carbon is an organ." (Case 4)
- "True: Carbon is an organism." (Case 6)
- "True: Carbon is an ecosystem." (Case 10)

**Recomandare:** Restructurați ontologia pentru a folosi `partOf` sau `composedOf` în loc de `isA` pentru acest lanț.

### Problema 1.2: NL incomplet pentru Learn

**Locație:** Case 1

NL-ul menționează doar lanțul Carbon și Rex, dar DSL-ul include și:
- Tweety, Sparrow, Songbird, Bird, Penguin, Opus
- Faptul de negație pentru Opus care nu poate zbura

---

## Capitolul 2: Suite 02 - Hierarchies

### Problema 2.1: Numărare inconsistentă a pașilor

**Locație:** Multiple cazuri

| Caz | Descriere în NL | Pași reali |
|-----|-----------------|------------|
| Case 3 | "7 steps" | 8 pași |
| Case 4 | "8-level inheritance" | 9 hops în proof |
| Case 5 | "7-level inheritance" | 8 hops în proof |
| Case 6 | "6-level inheritance" | 7 hops în proof |
| Case 7 | "5-level inheritance" | 6 hops în proof |

### Problema 2.2: Gramatică stângace

expected_nl folosește formule ca "Poodle has Breathes" sau "Poodle has Mortal" în loc de:
- "Poodle breathes"
- "Poodle is mortal"

---

## Capitolul 3: Suite 03 - Rules

### Problema 3.1: EROARE CRITICĂ - Mismatch Eve/Dan

**Locație:** Case 12 (Dan Negation Setup)

```javascript
input_nl: 'Eve had her account frozen (negated payment capability)'
// DAR DSL-ul definește fapte despre DAN, nu Eve:
input_dsl: `
  isA Dan Customer
  has Dan ExpiredCard
  Not $negDanPay  // Negează capacitatea lui DAN
`
```

Acest mismatch între NL și DSL este o eroare critică de consistență.

### Problema 3.2: Gramatică

- Case 5: "is suspect" → ar trebui "is a suspect"
- Case 9: "is isCapable" → ar trebui "is capable"

---

## Capitolul 4: Suite 04 - Deep Chains

### Problema 4.1: Measurement42 nedescrispersiune în NL

**Locație:** Case 4 (Knowledge Chain Setup)

NL descrie lanțul `DataPoint->Detail->...->Idea` (10 fapte), dar DSL include și `isA Measurement42 DataPoint` care nu este menționat.

---

## Capitolul 5: Suite 05 - Negation

### Problema 5.1: Ontologie semantică greșită pentru păsări

**Locație:** Case 1 (Bird Taxonomy Setup)

Lanțul `Flightless isA Antarctic isA Seabird` este biologic incorect:
- "Flightless" este o categorie, nu o specie care aparține "Antarctic"
- Ratite (struți, emu) NU sunt păsări antarctice

### Problema 5.2: proof_nl greșit pentru Bob

**Locație:** Case 9 (Bob Not Good Driver)

proof_nl arată ierarhia de tip a lui Bob (`Bob isA Professional...`) în loc să explice de ce condiția And eșuează (Bob are Violations, deci `Not(has Violations)` eșuează).

---

## Capitolul 6: Suite 06 - Compound Logic

### Problema 6.1: Numărare incorectă a pașilor

| Caz | Descriere NL | Pași reali |
|-----|--------------|------------|
| Dave->LeadershipLvl | "9-step chain" | 10 pași |
| Sally->LeadershipLvl | "5-step chain" | 7 pași |

### Problema 6.2: Entitate "Voter" tautologică

Folosirea numelui "Voter" pentru o entitate care trebuie să demonstreze că poate vota este tautologică - rezultatul este implicit în nume.

---

## Capitolul 7: Suite 07 - Temporal

### Problema 7.1: NL incomplet pentru Case 5

NL menționează doar lanțul cauzal, dar DSL include și o ierarhie `isA` complet separată (6 fapte) care nu este descrisă.

### Problema 7.2: Eroare logică potențială în Case 11

**Locație:** Case 11 (Erosion -> FoodShortage)

Regula de prevenție definită funcționează doar pentru lanțuri de 2 hops (A->B->C), dar Erosion->FoodShortage este un lanț de 3 hops. proof_nl pretinde că a găsit `causes Flooding FoodShortage` direct, care nu există.

---

## Capitolul 8: Suite 08 - Modal

### Problema 8.1: Numărare sistematică incorectă

Aproape fiecare caz "X-step chain" este incorect cu ±1:

| Caz | Descris | Real |
|-----|---------|------|
| Case 2 | 7-step | 8 pași |
| Case 3 | 9-step | 10 pași |
| Case 4 | 5-step | 4 pași |
| Case 5 | 8-step | 7 pași |
| Case 8 | 6-step | 7 pași |
| Case 9 | 4-step | 3 pași |
| Case 13 | 6-step | 7 pași |

---

## Capitolul 9: Suite 09 - Composition

### Problema 9.1: Pattern sistematic de numărare

Toate cazurile subestimează cu 1 numărul de hops/pași.

### Problema 9.2: proof_nl excesiv de verbose

Cazurile 7, 8, 12, 13 au proof_nl extrem de lung și repetitiv care este greu de citit.

---

## Capitolul 10: Suite 10 - Integration

### Problema 10.1: "healthissue" fără spațiu

expected_nl: "COVID is a healthissue" - ar trebui "health issue" (două cuvinte).

---

## Capitolul 11: Suite 11 - Wedding Seating

### Problema 11.1: Gramatică - plural incorect

- Case 1: "Found 2 seating" → ar trebui "Found 2 seatings"
- Case 4: "Found 18 arrangement" → ar trebui "Found 18 arrangements"

---

## Capitolul 12: Suite 12 - Fuzzy Matching

### Problema 12.1: Numărare incorectă pași

| Caz | Descris | Real |
|-----|---------|------|
| Case 5 | 7-step | 6 hops |
| Case 8 | 5-step | 4 hops |
| Case 9 | 5-step | 4 hops |

### Problema 12.2: Alternative proof invalid

Case 5 are un `alternative_proof_nl` care arată un path prin `isA Cat Mammal` direct - acest fapt nu există în KB (există doar `isA Cat Feline` și `isA Feline Mammal`).

### Problema 12.3: Erori de gramatică

Case 14:
- "Car has a wheels" → "Car has wheels"
- "Car has a seats" → "Car has seats"
- "Car has a steering" → "Car has steering"

---

## Capitolul 13: Suite 13 - Property Inheritance

### Problema 13.1: Ontologie semantică greșită - "Antarctic"

`isA Penguin Antarctic` nu are sens semantic - pinguinii nu SUNT Antarctice (continentul).

### Problema 13.2: Patern gramatical greșit

Sistemul inserează "a" înainte de toate substantivele:
- "has a fur" → "has fur"
- "has a cells" → "has cells"
- "has a dna" → "has DNA"
- "has a feathers" → "has feathers"

### Problema 13.3: NL-DSL mismatch în Case 26

NL întreabă "What can Tweety do or have from birds?" dar DSL interogă doar `can`, nu și `has`.

---

## Capitolul 14: Suite 14 - Meta Queries

### Problema 14.1: expected_nl prea vag pentru difference

Cazurile difference răspund doar "Car differs from Truck" fără a specifica CE diferă. proof_nl conține informația utilă.

### Problema 14.2: bundle vs induce - NL confuz

Case 12 NL întreabă "what properties remain shared?" (intersecție) dar `bundle` este operator de uniune.

### Problema 14.3: Analogie slabă

Case 5 (Truck:Haul::Bicycle:?): "Transport" este un răspuns slab deoarece Truck poate și Transport.

---

## Capitolul 15: Suite 15 - Reasoning Macros

### Problema 15.1: CONTRADICȚIE - Comment vs Expected

**Locație:** Case 2 (Abduce WetGrass)

Comentariul spune "reject Sprinkler by DryPath" dar expected_nl INCLUDE Sprinkler ca explicație.

### Problema 15.2: NL meta-descriere, nu traducibil

Cazurile de learn folosesc descrieri meta ("Causal world: Rain vs Sprinkler") în loc de propoziții traducibile.

---

## Capitolul 16: Suite 16 - Macro Aggregation

### Problema 16.1: Numărare incorectă

Case 2 (outbreak graph): Expected "14 facts" dar calculul arată 12 (7×2 - 2 duplicate).

### Problema 16.2: Comentariu misleading

Case 13 este etichetat "NEGATIVE" dar este de fapt un caz pozitiv.

---

## Capitolul 17: Suite 17 - Macro Composition

### Problema 17.1: Design problematic - atomi partajați

Macro-ul manufacturingBatch folosește atomi globali (Supplies, Production, QA, ProductReady) care sunt partajați între furnizori diferiți. SupplierA și SupplierB nu ar trebui să partajeze același lanț de producție.

---

## Capitolul 18: Suite 18 - Set Theory

### Problema 18.1: proof_nl confuz pentru caz negativ

Case 6: proof_nl spune "Missing: elementOf x ?A" dar x ESTE element al SetA. Problema reală este că nu există path de la vreun set care conține x la SetZ.

---

## Capitolul 19: Suite 19 - Biology

### Problema 19.1: Regulă semantic greșită

Case 8: Regula severity folosește `@sev2 causes VirusX Infection` ca fapt ground (nu variabilă), ceea ce înseamnă că orice host cu RiskFactor declanșează regula, indiferent dacă este infectat.

### Problema 19.2: Comentariu semantic incorect

Comentariul spune "DrugD blocks ElectronTransport" dar DSL creează `Not(causes DrugD ElectronTransport)`. A "bloca" și a "nu cauza" sunt concepte diferite.

---

## Capitolul 20: Suite 20 - Predicate Logic

### Problema 20.1: EROARE GRAMATICALĂ SISTEMATICĂ

Toate cazurile folosesc "X is holds" în loc de "X holds":
- Case 3: "True: R is holds" → "True: R holds"
- Case 4: "True: S is holds" → "True: S holds"
- Case 5: "True: T is holds" → "True: T holds"
- Case 7: "Cannot prove: W is holds" → "Cannot prove: W holds"

### Problema 20.2: proof_nl folosește nume DSL interne

Cazurile 2, 9, 10, 11 folosesc referințe ca `@brCond`, `@h2m1` care nu au sens pentru utilizator.

### Problema 20.3: expected_nl incomplet

Cazurile 14, 16: expected_nl este doar "True:" fără conținut real.

---

## Capitolul 21: Suite 21 - Goat Cabbage

### Problema 21.1: proof_nl tautologic

Cazurile 3, 7, 10 au proof_nl de forma "X. Therefore X." pentru fapte directe.

### Problema 21.2: WH-question ca prove, nu query

Case 8: "What is the boat capacity?" este o întrebare WH dar folosește prove în loc de query.

### Problema 21.3: Stare intermediară incorectă

Case 17: NL descrie "starea după luarea lupului la dreapta" dar starea DSL arată Farmer, Goat, și Wolf toate pe dreapta - ceea ce nu este starea corectă în soluția canonică.

---

## Capitolul 22: Suite 22 - Deduction

### Problema 22.1: Rezultate inconsistente pentru depth/limit

| Caz | Depth | Limit | Rezultate așteptate |
|-----|-------|-------|---------------------|
| Case 2 | 4 | 5 | Doar 1 (ar trebui mai multe) |
| Case 4 | 5 | 5 | Doar 1 (ar trebui mai multe) |
| Case 6 | 4 | 5 | Doar 1 (ar trebui mai multe) |

### Problema 22.2: proof_nl format stângaci

"X via causes via Y" este gramatical incorect și greu de citit.

---

## Capitolul 23: Suite 23 - Tool Planning

**Această suită nu are probleme semnificative.** Toate cazurile sunt bine structurate.

---

## Capitolul 24: Suite 24 - Contradictions

### Problema 24.1: EROARE CRITICĂ - proof_nl contrazice expected

Cazurile 4, 7, 14, 19, 22, 25 au proof_nl care afirmă ceva ce expected_nl spune că NU poate fi dovedit:

| Caz | expected_nl | proof_nl (GREȘIT) |
|-----|-------------|-------------------|
| 4 | "Cannot prove: Door is in Kitchen" | "Door is in Kitchen" |
| 7 | "Cannot prove: Door is in Attic" | "Door is in Attic" |
| 14 | "Cannot prove: X causes Y" | "X causes Y" |
| 19 | "Cannot prove: Foo causes Bar" | "Foo causes Bar" |
| 22 | "Cannot prove: Tea is in Cupboard" | "Tea is in Cupboard" |
| 25 | "Cannot prove: Foo is in Bar" | "Foo is in Bar" |

### Problema 24.2: Gramatică

Case 29: "Tea has Hot" ar trebui "Tea is Hot".

---

## Capitolul 25: Suite 25 - RuleTaker Bugs

### Problema 25.1: NL misleading

Case 12: NL spune "Tom is smart (positive fact)" dar DSL creează și `@notP Not $p` fără să menționeze.

### Problema 25.2: Gramatică stângace

"X has Y" pentru `hasProperty` ar trebui "X is Y" sau "X has property Y".

### Problema 25.3: proof_nl criptic

Case 16: proof_nl este doar "Search" fără explicație.

---

## Capitolul 26: Suite 26 - Compound Conclusions

### Problema 26.1: NL cu notație simbolică

Case 1: NL folosește `∧` și `->` în loc de limbaj natural:
```
'Setup: Sally is wumpus+sterpus+gorpus. Rule: (w∧s∧g) -> (z∧i).'
```

### Problema 26.2: Eroare gramaticală

Case 3: "Sally is a impus" → ar trebui "Sally is an impus" (articol "an" înainte de vocală).

### Problema 26.3: proof_nl inconsistent

Case 3 are proof_nl trunchiat comparativ cu Case 2.

---

## Capitolul 27: Suite 27 - Contrapositive Negation

### Problema 27.1: Numărare confuză

expected_nl: "Learned 1 facts" pare incorect pentru ambele cazuri de learn care au reguli multiple și fapte.

---

## Capitolul 28: Suite 28 - Induction

### Problema 28.1: Inducție din n=1

Case 4 face inducție dintr-un singur exemplu (Bernhard yellow), ceea ce este epistemic slab. proof_nl ar trebui să indice incertitudinea.

---

# Anexă: Statistici Complete

## Probleme per Suită

| Suită | Critice | Medii | Minore |
|-------|---------|-------|--------|
| 01 - Foundations | 1 | 1 | 1 |
| 02 - Hierarchies | 0 | 1 | 5 |
| 03 - Rules | 1 | 0 | 2 |
| 04 - Deep Chains | 0 | 1 | 1 |
| 05 - Negation | 0 | 2 | 0 |
| 06 - Compound Logic | 0 | 2 | 1 |
| 07 - Temporal | 0 | 2 | 0 |
| 08 - Modal | 0 | 1 | 7 |
| 09 - Composition | 0 | 2 | 0 |
| 10 - Integration | 0 | 0 | 2 |
| 11 - Wedding Seating | 0 | 0 | 2 |
| 12 - Fuzzy Matching | 1 | 2 | 3 |
| 13 - Property Inheritance | 0 | 2 | 5 |
| 14 - Meta Queries | 0 | 3 | 1 |
| 15 - Reasoning Macros | 1 | 1 | 0 |
| 16 - Macro Aggregation | 0 | 2 | 0 |
| 17 - Macro Composition | 0 | 1 | 0 |
| 18 - Set Theory | 0 | 1 | 0 |
| 19 - Biology | 0 | 2 | 0 |
| 20 - Predicate Logic | 1 | 2 | 2 |
| 21 - Goat Cabbage | 0 | 3 | 0 |
| 22 - Deduction | 0 | 2 | 0 |
| 23 - Tool Planning | 0 | 0 | 0 |
| 24 - Contradictions | 6 | 0 | 1 |
| 25 - RuleTaker Bugs | 0 | 2 | 2 |
| 26 - Compound Conclusions | 0 | 2 | 1 |
| 27 - Contrapositive | 0 | 1 | 0 |
| 28 - Induction | 0 | 1 | 0 |

## Suite Fără Probleme Semnificative

- **Suite 23 - Tool Planning**: Toate cazurile sunt bine structurate

---

# Recomandări Generale

1. **Standardizați numărarea pașilor**: Decideți dacă "steps" înseamnă muchii sau noduri și aplicați consistent.

2. **Corectați erorile gramaticale sistematice**:
   - "X is holds" → "X holds"
   - "has a [plural]" → "has [plural]"
   - "a [vocală]" → "an [vocală]"

3. **Îmbunătățiți proof_nl pentru cazuri negative**: Explicați DE CE dovada eșuează, nu doar "Cannot prove" sau "Search".

4. **Asigurați consistența NL-DSL**: Descrierile NL ar trebui să menționeze toate faptele definite în DSL.

5. **Revizuiți ontologiile semantice**:
   - Carbon->Atom->Molecule->Cell este greșit (is-part-of vs is-a)
   - Flightless->Antarctic->Seabird este biologic incorect

6. **Eliminați notația simbolică din NL**: Înlocuiți `∧`, `->` cu text natural.

7. **Corectați contradicțiile proof_nl**: Suite 24 are 6 cazuri unde proof_nl afirmă ce expected_nl neagă.

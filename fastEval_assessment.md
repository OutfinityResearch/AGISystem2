# FastEval Assessment Report - Unconvincing Proofs

**Data analizei:** 2025-12-25
**Focus:** Cazuri unde `proof_nl` este prea scurt, neconvingător, sau nerealist legat de subiect

---

## Sumar Executiv

Din cele 28 de suite analizate, au fost identificate **~60 cazuri** cu proof_nl problematic, grupate în următoarele categorii:

| Categorie | Număr cazuri | Severitate |
|-----------|--------------|------------|
| Dovezi circulare/tautologice ("X. Therefore X.") | 8 | Critică |
| Dovezi prea scurte (1-2 cuvinte fără explicație) | 12 | Critică |
| Lipsă conexiune logică (salt la concluzie) | 18 | Mare |
| Conținut irelevant (trasează ierarhii nerelate) | 6 | Mare |
| Descrieri de căutare în loc de raționament | 10 | Medie |
| Pași intermediari lipsă | 8 | Medie |

---

# Capitole Detaliate per Suită

---

## Suite 01 - Foundations

### Caz 1.1: "Is Charlie a Dog?" (linia ~126-132)
**Probe NL:** `"Search: Searched isA Charlie ?type in KB. Not found. Entity unknown. No applicable inheritance paths."`

**Problemă:** Prea scurt și neconvingător. Doar restaturează că Charlie nu a fost găsit, fără a arăta ce căutări s-au încercat sau ce căi de inferență au fost explorate.

### Caz 1.2: "Can Opus fly?" (linia ~76-82)
**Probe NL:** Trasează întregul lanț isA (Penguin→FlightlessBird→...→LivingThing) înainte de a găsi negația.

**Problemă:** Lanțul de moștenire prin FlyingAnimal este irelevant - motivul real este negația explicită `Not(can Opus Fly)`. Proba pare să sugereze că sistemul a încercat să demonstreze zborul prin ierarhie, ceea ce este logic incorect pentru pinguini.

---

## Suite 02 - Hierarchies

### Caz 2.1-2.4: Moștenire proprietăți (liniile 67-100)
**Cazuri afectate:** "Does Poodle exist?", "Does Poodle breathe?", "Is Poodle mortal?", "Does Poodle have a spine?"

**Probe NL Pattern:**
```
Poodle is a toy. Toy is a dog... [chain]. LivingThing has Breathes.
Poodle has Breathes. Transitive chain verified. Therefore Poodle has Breathes.
```

**Problemă:** Toate aceste probe conflată două operații logice diferite:
1. **Închidere tranzitivă isA** (corect demonstrată)
2. **Moștenire proprietăți** (doar afirmată, nu demonstrată)

Probele ar trebui să explice explicit: "Deoarece Poodle este tranzitiv un LivingThing, ȘI LivingThing are Breathes, ȘI proprietățile se moștenesc prin isA, DECI Poodle are Breathes."

---

## Suite 03 - Rules

### Caz 3.1: "Can Opus fly?" (linia 38-44)
**Probe NL:** `"Applied rule: Implies @birdCond @birdFly. Opus isA Bird. Opus isA Penguin..."`

**Problemă:** Proba afirmă "Opus isA Bird" imediat după regula, dar aceasta este CONCLUZIA care ar trebui derivată, nu o premisă. Fluxul logic este inversat - se afirmă ținta înainte de a o demonstra.

### Caz 3.2: "Is Alice capable?" (linia 146-153)
**Probe NL:**
```
"Applied rule: Implies @chainUse2 @chainCapable. Applied rule: rule implies can Alice Use.
Applied rule: rule implies can Alice Own..."
```

**Problemă:** Proba este dezorganizată și vagă. Listează "Applied rule" de 5 ori în ordine inversă fără a arăta derivarea fiecărei concluzii intermediare. Spune "rule implies can Alice Use" fără a demonstra DE CE Alice poate Use.

---

## Suite 04 - Deep Chains

### Caz 4.1: "Is AI before Antiquity?" (linia 205-212)
**Probe NL:** `"Search: Searched before AI ?next in KB. Not found... Reverse path: Antiquity -> Medieval ->... Path exists in opposite direction only. Temporal order violated."`

**Problemă:** Proba descrie CE a făcut algoritmul de căutare în loc să explice DE CE răspunsul este "Cannot prove". Afirmă vag "Temporal order violated" fără a explica că tranzitivitatea nu funcționează în sens invers.

---

## Suite 05 - Negation

### Caz 5.1: "Is Bob a good driver?" (linia 128-134) - **CRITIC**
**Probe NL:** `"Search: Bob isA Professional. Professional isA Worker. Worker isA Adult. Adult isA Person. Person isA Human. Human isA Entity."`

**Problemă:** Proba trasează ierarhia taxonomică a lui Bob (Professional→Worker→Adult→Person→Human→Entity) care este COMPLET IRELEVANTĂ pentru a demonstra de ce Bob nu este un good driver.

Motivul real: Bob are Violations, deci condiția `And(has License, Not(has Violations))` eșuează. Proba nu menționează deloc regulile sau constrângerile relevante.

### Caz 5.2: "Can a Rock fly?" (linia 145-152)
**Probe NL:** `"Search: Searched isA Rock ?type in KB. Not found. Entity unknown. No applicable inheritance paths."`

**Problemă:** Prea scurt - doar restaturează problema. Nu arată ce verificări au fost făcute sau de ce Rock nu poate zbura logic.

---

## Suite 06 - Compound Logic

### Caz 6.1: "Can Eve pay?" (linia 129-136)
**Probe NL:** `"Applied rule: Implies @payOr2 @payConc. Or condition satisfied via has Eve Crypto. Therefore Eve can Pay."`

**Problemă:** Proba sare pașii intermediari. Regula @payOr2 are Or-uri imbricate, dar proba nu explică cum `has Eve Crypto` satisface structura Or(@payOr1, @payCrypto).

### Caz 6.2: Query "Who can pay?" (linia 198-212)
**Probe NL (per rezultat):**
- `"has Alice Cash. Applied rule: Implies @payOr2 @payConc"`

**Problemă:** Prea terse - doar listează faptul și numele regulii fără a conecta premisele de concluzie.

---

## Suite 07 - Temporal

### Caz 7.1: "Would preventing Erosion prevent FoodShortage?" (linia 131-137)
**Probe NL:**
```
"Searched causes Flooding ?b. Found: Flooding causes CropLoss.
Searched causes CropLoss ?c. Found: CropLoss causes FoodShortage..."
```

**Problemă:** Proba este plină de trace-uri de căutare și variabile (?b, ?c, ?d, ?e) care sunt detalii de implementare, nu raționament logic. Obscurizează lanțul de raționament actual.

### Caz 7.2-7.3: Probe negative temporale (liniile 140-155)
**Probe NL Pattern:** `"Search: Searched before AIAge ?next in KB. Not found... Path exists in opposite direction only."`

**Problemă:** Probele negative se bazează pe trace-uri de căutare în loc de raționament logic. Nu explică proprietățile relațiilor temporale (antisimetrie, ireflexivitate) care fac inversarea imposibilă.

---

## Suite 08 - Modal

### Caz 8.1-8.3: "Can Socrates think/feel/respire?" (liniile 62-86)
**Probe NL Pattern:**
```
"Applied rule: Implies @humanThink @humanThinkC. Socrates is a human.
Socrates is a philosopher. Philosopher is a thinker..."
```

**Problemă:** Toate probele afirmă "Socrates is a human/animal/organism" la ÎNCEPUTUL lanțului, când aceasta ar trebui să fie CONCLUZIA derivată din lanț. Raționamentul apare circular și logic inversat.

---

## Suite 09 - Composition

### Caz 9.1: "Can Rock do clinical trials?" (linia 188-195)
**Probe NL:** `"Search: Searched isA Rock ?type in KB. Not found. Entity unknown. No applicable inheritance paths."`

**Problemă:** Proba descrie eșecul căutării în loc să explice DE CE Rock nu poate face studii clinice. Ar trebui să arate că Rock nu are proprietățile necesare (Analytical pentru Innovate, Compassionate pentru ClinicalTrials).

---

## Suite 10 - Integration

### Caz 10.1: "Does Trial cause Crime?" (linia 163-170)
**Probe NL:** `"Search: Searched causes Trial ?next in KB. Not found... Reverse path: Crime -> Investigation ->... Causal direction violated."`

**Problemă:** Raportează trace-uri de căutare în loc de raționament logic. Nu explică DE CE cauzalitatea nu poate fi inversată.

### Caz 10.2: "Is COVID a Court?" (linia 154-161)
**Probe NL:** `"Search: COVID isA ViralDisease... No path exists from COVID to Court."`

**Problemă:** Explorează taxonomia medicală (ViralDisease→Infectious→Disease→...) dar nu explică DE CE această cale dovedește că COVID NU ESTE Court. Nu stabilește disjuncția între domenii.

---

## Suite 11 - Wedding Seating

**Niciun caz problematic identificat.** Probele sunt minime dar adecvate pentru verificarea constrângerilor.

---

## Suite 12 - Fuzzy Matching

### Caz 12.1: "Is Rex in Europe?" (linia 127-134) - **CRITIC**
**Probe NL:**
```
"Search: Rex isA GermanShepherd. GermanShepherd isA Shepherd... Mammal isA Vertebrate.
Vertebrate isA Animal. Animal isA LivingThing. Searched locatedIn Rex ?next in KB. Not found."
```

**Problemă:** Proba listează ÎNTREAGA taxonomie animală (GermanShepherd→Shepherd→...→LivingThing) când încearcă să demonstreze o relație GEOGRAFICĂ (locatedIn). Ierarhia animală este COMPLET IRELEVANTĂ pentru locație.

### Caz 12.2: "Is Car a Concept?" (linia 189-196)
**Probe NL:** `"Car isA Vehicle. Vehicle isA Transport. Transport isA Mobility. Mobility isA Service. Service isA Utility. Utility isA Concept."`

**Problemă:** Simpla enumerare a faptelor fără nicio justificare logică. Nu explică DE CE fiecare pas rezultă în următorul.

---

## Suite 13 - Property Inheritance

### Caz 13.1-13.3: Lanțuri incomplete (liniile 142-236)
**Cazuri:** "Is Tweety a Vertebrate?", "Is Whiskers a Carnivore?", "Is Opus a Vertebrate?"

**Probe NL Pattern:** `"Tweety isA HouseSparrow. HouseSparrow isA Sparrow... Bird isA Vertebrate."`

**Problemă:** Toate probele arată lanțul DAR nu afirmă explicit concluzia finală. Se opresc la ultimul pas din lanț fără a declara că "Tweety isA Vertebrate".

---

## Suite 14 - Meta Queries

### Caz 14.1-14.2: SIMILAR queries (liniile 82-109)
**Probe NL:** `"shared Tool, Handle, Head, and Pound"`

**Problemă:** Listează doar proprietățile comune fără a explica LOGICA similarității. Nu arată CUM sau DE CE aceste proprietăți comune stabilesc similaritate.

### Caz 14.3: ANALOGY "Car:Engine::Bicycle:?" (linia 241-254)
**Probe NL:** `"Car has Engine maps to Bicycle has Wheels"`

**Problemă:** Analogia este logic defectuoasă. Engine este o SURSĂ DE PUTERE, Wheels sunt COMPONENTE. Proba conflată tipuri de relații incompatibile.

### Caz 14.4: BUNDLE "Sparrow and Hawk" (linia 202-213)
**Probe NL:** `"union of Sparrow and Hawk properties"`

**Problemă:** Complet abstract și neexplicativ. Nu listează efectiv care proprietăți sunt unite sau justifică rezultatul.

### Caz 14.5: INDUCE "Fish and Trout" (linia 215-226) - **CRITIC**
**Probe NL:** `"empty intersection"`

**Problemă:** Logic contradictoriu. KB arată `isA Trout Fish`, deci ar trebui să aibă cel puțin "Fish" și "Animal" în comun. Proba afirmă incorect "intersecție goală".

---

## Suite 15 - Reasoning Macros

### Caz 15.1-15.2: Counterfactual queries (liniile 49-72)
**Probe NL:** `"Rain → WetGrass"` / `"PowerOutage → SprinklerOff"`

**Problemă:** Probele doar restaturează relația cauzală fără a efectua raționament contrafactual real. Nu explică DE CE eliminarea cauzei ar schimba efectul.

---

## Suite 16 - Macro Aggregation

### Caz 16.1: "Must TeamAlpha assist?" (linia 140-144) - **CRITIC**
**Probe NL:** `"TeamAlpha must Assist. Therefore TeamAlpha must Assist."`

**Problemă:** RAȚIONAMENT CIRCULAR PUR. Proba restaturează concluzia fără niciun lanț logic.

### Caz 16.2-16.3: Public Health Emergency (liniile 181-212)
**Probe NL:** `"Applied rule: implies @conj @conseq. VirusX causes Infection. VirusX is a virus. And condition satisfied. Therefore VirusX causes PublicHealthEmergency."`

**Problemă:** Menționează aplicarea unei reguli dar nu explică CE ESTE regula sau CUM funcționează. Nu arată consecința regulii.

---

## Suite 17 - Macro Composition

**Niciun caz problematic identificat.** Toate probele arată lanțuri complete și aplicări clare ale regulilor.

---

## Suite 18 - Set Theory

### Caz 18.1: "Is x in SetZ?" (linia 94-101)
**Probe NL:** `"Search: Checked rule: implies @ax_cond2 @ax_conseq2. Missing: elementOf x ?A, subsetOf ?A ?B."`

**Problemă:** Descrie ce LIPSEȘTE fără a explica DE CE lipsesc acestea face imposibilă proba. Nu arată că SetZ este disjunct de lanțul de submulțimi.

---

## Suite 19 - Biology

### Caz 19.1: "Can Prokaryote respire?" (linia ~118)
**Probe NL:** `"Search: Searched isA Prokaryote ?type in KB. Not found. Entity unknown."`

**Problemă:** Proba nu arată DE CE Prokaryote nu poate respira. Tratează ca un eșec de căutare a entității în loc de eșec al condițiilor regulii (lipsă Mitochondria și Eukaryote).

### Caz 19.2: "Does DrugD cause ElectronTransport?" (linia ~162)
**Probe NL:** `"Search: Found explicit negation: Not(causes DrugD ElectronTransport). Negation blocks inference."`

**Problemă:** Confuzie conceptuală. DSL-ul declară o afirmație și o neagă, dar proba vorbește de "căutare și găsire de negație" ca și cum ar fi un mecanism de căutare.

---

## Suite 20 - Predicate Logic

### Caz 20.1: "Does P imply S via chain?" (linia 44-51)
**Probe NL:** `"Applied rule: implies @brCond @brConseq. Applied rule: rule implies implies Q S..."`

**Problemă:** Proba este incoerentă și confuză. Sare între diferite implicații fără o secvență logică clară. Gramatic defectă ("rule implies implies Q S").

### Caz 20.2: "Is Socrates mortal?" (linia 138-145)
**Probe NL:** `"Applied rule: implies @h2m1 @h2m2."`

**Problemă:** PREA SCURT. Doar referențiază nume de reguli (@h2m1, @h2m2) fără a explica ce sunt sau cum se aplică la Socrates.

### Caz 20.3: "Is it impossible for something to be both a plant and a mushroom?" (linia 190-196)
**Probe NL:** `"No Plant can also be Mushroom"`

**Problemă:** RESTATURARE A CONCLUZIEI, nu probă. Ar trebui să arate: Plant(?x)→¬Fungus(?x), Mushroom(?x)→Fungus(?x), deci contradicție.

---

## Suite 21 - Goat Cabbage Plus

### Caz 21.1-21.4: Probe circulare (liniile 68-168) - **CRITIC**
**Cazuri:** "Wolf conflicts Goat", "Goat conflicts Cabbage", "Boat capacity", "Farmer must be in boat"

**Probe NL Pattern:** `"Wolf conflicts Goat. Therefore Wolf conflicts Goat."`

**Problemă:** RAȚIONAMENT COMPLET CIRCULAR. Toate restaturează concluzia fără nicio justificare. "X. Therefore X." nu este o probă.

### Caz 21.5-21.6: Aplicare reguli vagă (liniile 76-168)
**Probe NL:** `"Applied rule: implies @pres1 @pres2."`

**Problemă:** Referențiază constructe DSL interne fără a explica ce înseamnă sau cum susțin concluzia.

---

## Suite 22 - Deduction

### Caz 22.1-22.3: Lanțuri cauzale incomplete (liniile 42-228)
**Probe NL Pattern:** `"Inflation via causes via ReducedSpending"`

**Problemă:** Sare pași intermediari. Lanțul real este Inflation→HigherPrices→ReducedSpending, dar proba omite HigherPrices. Format vag "via causes via" nu arată raționamentul.

---

## Suite 23 - Tool Planning

**Niciun caz problematic identificat.** Toate probele sunt rezultate directe de query care răspund corect întrebărilor.

---

## Suite 24 - Contradictions

### Caz 24.1-24.5: Canonicalizare alias omisă (liniile 32-273)
**Cazuri afectate:** Door/Closed, Portal/Shut, Water/Icy, Start/End temporal, Sun/Moon operator

**Probe NL Pattern:**
```
['mutuallyExclusive hasState Open Closed', 'Therefore reject hasState Door Closed']
```

**Problemă:** Pentru contradicții indirecte prin aliasuri sau sinonime, probele sar complet peste pasul de canonicalizare. Nu arată cum Portal→Door sau Shut→Closed sau later→after.

---

## Suite 25 - RuleTaker Bugs

### Caz 25.1: "Not(Harry big)" (linia 49-57)
**Probe NL:** `"Not"`

**Problemă:** DOAR CUVÂNTUL "Not". Nu explică deloc de ce nu poate fi demonstrat.

### Caz 25.2: "CWA: Not(Zed big)" (linia 60-66)
**Probe NL:** `"Closed world assumption"`

**Problemă:** Doar numește principiul invocat fără a arăta raționamentul: "Zed big nu există în KB, deci prin CWA, Not(Zed big) este adevărat."

### Caz 25.3: "Water frozen" (linia 212-218)
**Probe NL:** `"Search"`

**Problemă:** DOAR CUVÂNTUL "Search". Nu conectează premisa (Water nu este cold) de concluzie (Water frozen neprovabil).

---

## Suite 26 - Compound Conclusions

**Niciun caz problematic identificat.** Probele arată aplicări clare ale regulilor cu condiții And satisfăcute.

---

## Suite 27 - Contrapositive Negation

### Caz 27.1: "Stella is not a yumpus" (linia 43-52)
**Probe NL:** `['Not (isA Stella Tumpus)', 'Stella is a rompus', 'Stella is a lorpus']`

**Problemă:** Nu arată raționamentul contrapozitiv. Afirmă Not(Tumpus) dar nu explică CUM aceasta implică Not(Yumpus). Faptele pozitive (rompus, lorpus) sunt premise date, nu pași de derivare.

### Caz 27.2: "Alex is not a vumpus" (linia 68-74)
**Probe NL:** `['Not (isA Alex Brimpus)']`

**Problemă:** PREA SCURT. Doar restaturează premisa fără a arăta aplicarea contrapozitivului: Vumpus→(Brimpus∧Zumpus), ¬Brimpus, deci ¬Vumpus.

---

## Suite 28 - Induction

**Niciun caz problematic identificat.** Probele arată clar baza inductivă (n/n peers cu proprietatea).

---

# Rezumat Final

## Suite fără probleme semnificative:
- Suite 11 (Wedding Seating)
- Suite 17 (Macro Composition)
- Suite 23 (Tool Planning)
- Suite 26 (Compound Conclusions)
- Suite 28 (Induction)

## Tipuri de probleme identificate:

### 1. Probe Circulare/Tautologice (8 cazuri)
- Suite 16: TeamAlpha must Assist
- Suite 21: Wolf/Goat, Goat/Cabbage, Boat capacity, Farmer in boat

### 2. Probe Prea Scurte (12 cazuri)
- Un singur cuvânt: "Not", "Search", "Closed world assumption"
- Doar referințe la reguli: "@h2m1 @h2m2", "@pres1 @pres2"

### 3. Conținut Irelevant (6 cazuri)
- Suite 05: Trasează ierarhia Professional→Human pentru good driver
- Suite 12: Trasează ierarhia animală pentru locație geografică

### 4. Descrieri de Căutare în loc de Raționament (10 cazuri)
- "Searched X in KB. Not found." fără a explica de ce
- Afișare trace-uri cu variabile interne (?a, ?b, ?c)

### 5. Pași Intermediari Lipsă (8 cazuri)
- Suite 22: Omite pași din lanțuri cauzale
- Suite 24: Omite canonicalizarea aliasurilor

### 6. Lipsă Conexiune Logică (18 cazuri)
- Afirmă concluzia înainte de a o deriva
- Nu explică cum premisele duc la concluzie
- Restaturează concluzia ca probă

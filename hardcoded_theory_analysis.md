# Raport: Echivalență Semantică & Disciplină de Atomi (Core + Domenii)

## 0) Intenție (cerința pe care o optimizăm)
AGISystem2 trebuie să respecte o cerință de tip “semantici intuitioniste”:

> Dacă două formulări DSL exprimă același obiect semantic, sistemul trebuie să poată produce aceeași reprezentare canonică (și ideal același vector HDC), sau să poată forța echivalența printr-un mecanism explicit.

Practic: KB nu trebuie să devină o colecție de forme sintactice, ci o colecție de concepte.

## 1) Ce am re-analizat (concret)
| Zonă | Ce am verificat |
|------|------------------|
| `config/Core/*.sys2` | tipuri, constructori, structuri, logică, temporal/modal, defaults, roluri/proprietăți, bootstrap verbs, reasoning verbs, relații |
| Execuția DSL | `src/runtime/executor.mjs` (cum rezolvă identificatori, literali, cum construiește vectorul statement-ului, ce operatori “speciali” are) |
| Reasoning | `src/reasoning/*` (în ce măsură se bazează pe metadata vs vectori; unde are liste hardcodate) |
| Riscuri de divergență | “aceeași semantică” exprimată prin 2 căi (macro vs manual; nume vs referință; negare vs referință) |

## 2) Gap major: primitivele L0 (`___*`) sunt în spec, dar nu sunt evaluate de runtime
Spec DS07a definește primitivele L0 (`___NewVector`, `___Bind`, `___Bundle`, `___Similarity`, `___MostSimilar`, `___Extend`, `___GetType`) ca primitive native și indică faptul că teoriile Core se bazează pe ele.

În implementarea actuală, `Executor` tratează orice operator ca un simbol și construiește vectorul statement-ului ca:

`Op ⊕ withPosition(1,arg1) ⊕ withPosition(2,arg2) ...`

și nu are un mecanism explicit de evaluare pentru `___NewVector/___Bind/___Bundle/...`. În plus, literalii numerici sunt rezolvați ca vectori din vocabulary, nu ca valori.

**Consecință directă:** o parte din `config/Core` este în practică “descriptivă”, nu “executabilă”, deci nu poate impune canonicitatea; canonicitatea rămâne în cod (JS) și în convenții umane.

## 3) Ce blochează cerința “aceeași semantică ⇒ același vector”
| Problemă | Unde apare | Mecanismul concret de divergență |
|----------|------------|-----------------------------------|
| Atomi ne-tipizați / ad hoc | orice graph custom; orice identificator nelegat în scope | `resolveIdentifier()` cade pe vocabulary și produce un atom fără tip și fără disciplină |
| “Nume” vs “referință” | DSL: `John` vs `$john` | `John` (vocabulary) ≠ `$john` (vector creat de constructor) dacă nu există o punte canonică |
| Macro bypass | `_mtrans` manual vs `tell`, `Implies` manual vs `ImpliesMacro` | structura semantică diferă (roluri/ordine/aliasing) |
| Negare | `Not $ref` vs `Not (expr)` | metadata diferită → facts diferite → query/prove diferite |
| Sinonime | `Doctor` vs `Physician` | fără mapare canonical, sunt doi atomi |
| “Liste” în cod | transitive/logical/reserved/templates | teoria se schimbă, codul rămâne, semantica “alunecă” |

## 4) Gaps / definiții incomplete în `config/Core` (care trebuie adresate)
| Fișier | Problemă | De ce contează pentru canonicitate |
|--------|----------|-------------------------------------|
| `config/Core/00-types.sys2` | marker-ele de tip folosesc `___NewVector` fără `name/theory` | fără evaluare L0, nu sunt markeri reali; cu evaluare L0, pierzi determinismul între sesiuni |
| `config/Core/01-positions.sys2` vs `src/core/position.mjs` | naming diferit (`__PosN__` vs `__POS_N__`), plus generator diferit | două scheme → incompatibilități dacă cineva încearcă să “depindă” de poziții din teorie |
| `config/Core/03-structural.sys2` | folosește identificatori care nu au semnificație operațională (ex: `___BundlePositioned`, `___GetType`, `GreaterThan`) | tipizarea, secvențele și “isType” nu sunt verificabile fără runtime support |
| `config/Core/00-relations.sys2` | proprietăți de relații marcate prin convenție text (`@isA:isA __TransitiveRelation`) citită cu regex în JS | meta-model implicit; nu e KB-driven; greu de extins și de verificat |
| `config/Core/12-reasoning.sys2` | macro-uri care “apelează” primitive L0 (`___MostSimilar`, etc.) | fără L0 builtins, macro-urile sunt doar etichete |

## 5) Kernel semantic obligatoriu (≥ 20 concepte) + dependențe
Acesta este setul minim de concepte care, dacă există în Core și sunt susținute de runtime, permite:
- disciplină de atomi (un singur “gate” de creare),
- canonicalizare (alias/synonym/semantic class),
- logică, timp, default reasoning,
- măsurători, surse, evidență.

| # | Concept | Tip (propus) | Definiție canonică | Depinde de |
|---|---------|--------------|--------------------|------------|
| 1 | `AtomType` | marker | marker universal pentru orice atom | `___NewVector` determinist |
| 2 | `typeOf` | relație meta | `typeOf x PersonType` | `TypeMarker`, metadata |
| 3 | `SemanticClass` | categorie | “Communication”, “Ownership”, “Measurement” | `__Category` |
| 4 | `semanticClassOf` | relație meta | `semanticClassOf x Communication` | `SemanticClass` |
| 5 | `canonicalName` | relație meta | `canonicalName Physician Doctor` | `Name` |
| 6 | `synonym` | relație | `synonym Doctor Physician` | `__SymmetricRelation` |
| 7 | `aliasOf` | relație meta | `aliasOf Physician Doctor` | `synonym`, `canonicalName` |
| 8 | `EntityType` | marker | marker de entitate concretă | `___NewVector` |
| 9 | `AbstractType` | marker | marker de abstract | `___NewVector` |
| 10 | `EventType` | marker | marker de event | `___NewVector` |
| 11 | `RoleType` | marker | marker de rol | `___NewVector` |
| 12 | `__Atom` | constructor | creează atom tipizat cu `AtomType` | L0 builtins |
| 13 | `__Named(type,name)` | constructor | creează determinist atom pentru un nume și îl tipizează | `___NewVector(name,theory)` + `typeOf` |
| 14 | `__Role(RoleName, filler)` | structură | rol canonic pentru event-uri | `___Bind` |
| 15 | `__Pair(a,b)` | structură | pereche canonică | `___Bind`, Pos vectors |
| 16 | `__Bundle(items...)` | structură | superpoziție | `___Bundle` |
| 17 | `Implies` | logic | regulă (antecedent → consequent) | `__Pair`, `__Role` |
| 18 | `And` | logic | compunere condiții | `__Pair`, `__Role` |
| 19 | `Or` | logic | disjuncție | `__Pair`, `__Role` |
| 20 | `Not` | logic | negare canonică (metadata completă) | negation normalization |
| 21 | `Before/After` | timp | relații temporale | `__Pair`, `__Role` |
| 22 | `Causes` | cauzal | relație cauzală | `Before`, `__Pair` |
| 23 | `Default/Exception` | non-monotonic | default vs excepție | `isA`, `typeOf` |
| 24 | `Measure` + `Unit` | măsurare | `__Measure(value, unit)` | literali numerici + unități |

## 6) Schimbări concrete în `config/Core` (propuneri 1:1)
| ID | Fișier(e) | Propunere | Ce concept/definiție se schimbă |
|----|-----------|-----------|----------------------------------|
| C1 | `00-types.sys2` | toate type markers devin deterministe: `___NewVector "<Name>" "Core"` | TypeMarker devine stabil |
| C2 | `00-types.sys2` | adăugare `AtomType` | introduce conceptul #1 |
| C3 | `02-constructors.sys2` | adăugare `__Atom` și refactor constructorii să pornească din el | gate de creare |
| C4 | `02-constructors.sys2` | adăugare `__Named(name,typeMarker)` + sugar (`__PersonNamed`, etc.) | rezolvă “John” vs `$john` |
| C5 | `00-relations.sys2` | meta-model explicit pentru proprietăți de relații: `relationProperty rel Transitive` etc | elimină regex parsing |
| C6 | `03-structural.sys2` | elimină `___BundlePositioned` sau definește builtin; elimină `GreaterThan` din Core dacă nu există numeric layer | evită pseudo-semantici |
| C7 | `05-logic.sys2` | definește negarea canonică (cum se stochează metadata pentru Not) | echivalență logică |
| C8 | `10-properties.sys2` | standardizează `synonym`/`aliasOf` ca primitive declarative + recomandare canonicalName | unificare lexicală |
| C9 | `11-bootstrap-verbs.sys2` | adaugă anotări de canonical form (ex: `tell` este forma canonică pentru un anumit pattern) | canonicalizer are reguli |
| C10 | `index.sys2` | clarifică: ori încarcă tot, ori e explicit “minimal” | predictibilitate |

## 7) Schimbări concrete în cod (fără ele, teoria nu poate impune semantica)
| ID | Cod | Propunere | Motiv |
|----|-----|-----------|-------|
| K1 | `src/runtime/executor.mjs` | builtin evaluation pentru operatorii `___*` (cel puțin `___NewVector`, `___Bind`, `___Bundle`, `___Similarity`, `___Extend`, `___GetType`) | altfel `config/Core` nu poate calcula structuri canonice |
| K2 | `src/runtime/executor.mjs` | literal numeric real (nu vector) + operații minime de comparație dacă sunt păstrate în teorii | altfel `Measure`, thresholds, `GreaterThan` sunt ficțiuni |
| K3 | `src/runtime/executor.mjs` | canonicalize pentru `Not (expr)` și alte pattern-uri (ex: `_mtrans + Request` → `tell`) | convergență semantică |
| K4 | `src/reasoning/component-kb.mjs` | alias/synonym map (din KB) care normalizează numele la canonical | sinonime sistemice |
| K5 | `src/reasoning/transitive.mjs` | consumă meta-model `relationProperty`, nu parsează text | theory-driven reasoning |

## 8) Pachete de domeniu (teorii separate) – propuneri utile (≥ 20 concepte fiecare)
Aceste pachete sunt propuneri de “theory bundles” ce pot fi încărcate separat (nu în Core). Ele presupun că kernel-ul din secțiunea 5 există.

### 8.1 Matematică (`config/Math`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Set | `__Category` | Category | mulțime |
| ElementOf | `__Relation` | Relation | element-of |
| SubsetOf | `__Relation` | Transitive | subset |
| Union | `graph` | Bundle | reuniune |
| Intersection | `graph` | Bundle | intersecție |
| Complement | `graph` | Not | complement |
| Function | `__Category` | Category | funcție |
| Domain | `__Relation` | Relation | domeniu |
| Codomain | `__Relation` | Relation | codomeniu |
| AppliesTo | `__Relation` | Relation | aplicare |
| Equals | `__Relation` | Logic | egalitate |
| LessThan | `__Relation` | Numbers | ordine |
| GreaterThan | `__Relation` | Numbers | ordine |
| NaturalNumber | `__Category` | Category | ℕ |
| Integer | `__Category` | Category | ℤ |
| Rational | `__Category` | Category | ℚ |
| Real | `__Category` | Category | ℝ |
| Vector | `__Category` | Entity/Abstract | vector |
| Matrix | `__Category` | Abstract | matrice |
| Proof | `__Category` | Evidence | dovadă |

### 8.2 Fizică (`config/Physics`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Quantity | `__Category` | Measure | mărime |
| Unit | `__Category` | Unit | unitate |
| Mass | `__Property` | Quantity | masă |
| Length | `__Property` | Quantity | lungime |
| Time | `__Property` | Quantity | timp |
| Velocity | `__Property` | Quantity | viteză |
| Acceleration | `__Property` | Quantity | accelerație |
| Force | `__Property` | Quantity | forță |
| Energy | `__Property` | Quantity | energie |
| Power | `__Property` | Quantity | putere |
| Charge | `__Property` | Quantity | sarcină |
| Field | `__Category` | Abstract | câmp |
| ElectricField | `__Category` | Field | E |
| MagneticField | `__Category` | Field | B |
| ConservationLaw | `__Category` | Implies | conservare |
| System | `__Category` | Entity | sistem |
| Interaction | `__Category` | Relation | interacțiune |
| BoundaryCondition | `__Category` | Constraint | condiție |
| Experiment | `__Category` | Evidence | experiment |
| Measurement | `__Category` | Measure/Evidence | măsurare |

### 8.3 Biologie (`config/Biology`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Organism | `__Category` | Entity | organism |
| Cell | `__Category` | Entity | celulă |
| Tissue | `__Category` | Entity | țesut |
| Organ | `__Category` | Entity | organ |
| Species | `__Category` | Category | specie |
| Genus | `__Category` | Category | gen |
| Family | `__Category` | Category | familie |
| Taxon | `__Category` | Category | taxon |
| Gene | `__Category` | Entity | genă |
| Protein | `__Category` | Entity | proteină |
| Mutation | `__Action` | Event | mutație |
| Selection | `__Action` | Event | selecție |
| Metabolism | `__Action` | Event | metabolism |
| Reproduction | `__Action` | Event | reproducere |
| Habitat | `__Category` | Place | habitat |
| SymbiosisWith | `__Relation` | Symmetric | simbioză |
| PredatorOf | `__Relation` | Relation | prădător |
| PreyOf | `__Relation` | Relation | pradă |
| Population | `__Category` | Entity | populație |
| Trait | `__Property` | Property | trăsătură |

### 8.4 Medicină (`config/Medicine`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Patient | `__Category` | Person | pacient |
| Clinician | `__Category` | Person | clinician |
| Disease | `__Category` | State/Abstract | boală |
| Symptom | `__Category` | State | simptom |
| Sign | `__Category` | State | semn |
| Syndrome | `__Category` | Category | sindrom |
| Diagnosis | `__Category` | Abstract | diagnostic |
| Diagnoses | `__Relation` | Relation | clinician→patient→disease |
| Treatment | `__Category` | Action | tratament |
| Prescribes | `__Relation` | Relation | prescripție |
| Test | `__Category` | Action | test |
| TestResult | `__Category` | Abstract | rezultat |
| Biomarker | `__Category` | Property | biomarker |
| Contraindication | `__Category` | Not/Default | contraindicație |
| Dosage | `__Measure` | Measure | dozaj |
| AdverseEffect | `__Category` | State | reacție adversă |
| RiskFactor | `__Category` | Property | risc |
| Guideline | `__Category` | Source | ghid |
| EvidenceLevel | `__Category` | Evidence | nivel |
| Prognosis | `__Category` | Abstract | prognostic |

### 8.5 Critică literară (`config/LitCrit`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Work | `__Category` | Entity | operă |
| Author | `__Category` | Person | autor |
| Genre | `__Category` | Category | gen |
| Theme | `__Property` | Abstract | temă |
| Motif | `__Property` | Abstract | motiv |
| Symbol | `__Property` | Abstract | simbol |
| Narrator | `__Category` | Role | narator |
| PointOfView | `__Property` | Abstract | perspectivă |
| Plot | `__Category` | Abstract | intrigă |
| Character | `__Category` | Entity | personaj |
| Setting | `__Category` | Place | cadru |
| Conflict | `__Category` | Abstract | conflict |
| Irony | `__Property` | Abstract | ironie |
| Intertext | `__Relation` | Relation | intertext |
| Critic | `__Category` | Person | critic |
| Interpretation | `__Category` | Abstract | interpretare |
| Claim | `__Category` | Abstract | teză |
| SupportsClaim | `__Relation` | Evidence | suport textual |
| CounterClaim | `__Category` | Not/Or | contra |
| Framework | `__Category` | Abstract | framework |

### 8.6 Drept (`config/Law`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| LegalPerson | `__Category` | Person/Org | persoană juridică |
| Contract | `__Category` | Abstract | contract |
| Obligation | `__Category` | Deontic | obligație |
| Right | `__Category` | Deontic | drept |
| Duty | `__Category` | Deontic | datorie |
| Prohibition | `__Category` | Forbidden | interdicție |
| Liability | `__Category` | Abstract | răspundere |
| Breach | `__Action` | Event | încălcare |
| Damages | `__Measure` | Measure | despăgubiri |
| Statute | `__Category` | Source | lege |
| Regulation | `__Category` | Source | regulament |
| CaseLaw | `__Category` | Source | jurisprudență |
| PrecedentOf | `__Relation` | Relation | precedent |
| Jurisdiction | `__Category` | Place | jurisdicție |
| Court | `__Category` | Org | instanță |
| Ruling | `__Category` | Event | hotărâre |
| Evidence | `__Category` | Evidence | probă |
| BurdenOfProof | `__Category` | Abstract | sarcină |
| StandardOfProof | `__Category` | Abstract | standard |
| Validity | `__Property` | State | validitate |

### 8.7 Etică & Filosofie (`config/Philosophy`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| MoralAgent | `__Category` | Person | agent |
| Value | `__Category` | Abstract | valoare |
| Virtue | `__Category` | Abstract | virtute |
| Vice | `__Category` | Abstract | viciu |
| Duty | `__Category` | Obligatory | datorie |
| Consequence | `__Category` | Event | consecință |
| Intention | `__Category` | Abstract | intenție |
| Harm | `__Category` | State | rău |
| Benefit | `__Category` | State | bine |
| Justice | `__Category` | Abstract | dreptate |
| Autonomy | `__Category` | Abstract | autonomie |
| Knowledge | `__Category` | Known | cunoaștere |
| Belief | `__Category` | Believed | credință |
| Justified | `__Property` | Evidence | justificat |
| Argument | `__Category` | Logic | argument |
| Premise | `__Category` | Logic | premisă |
| Conclusion | `__Category` | Logic | concluzie |
| Fallacy | `__Category` | Not/Logic | sofism |
| Worldview | `__Category` | Abstract | viziune |
| EthicsFramework | `__Category` | SemanticClass | utilitarism etc |

### 8.8 Geografie (`config/Geography`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Country | `__Category` | Place | țară |
| Region | `__Category` | Place | regiune |
| City | `__Category` | Place | oraș |
| BorderWith | `__Relation` | Symmetric | graniță |
| Contains | `__Relation` | Transitive | conține |
| LocatedIn | `__Relation` | locatedIn | localizare |
| River | `__Category` | Entity | râu |
| Mountain | `__Category` | Entity | munte |
| ClimateZone | `__Category` | Abstract | climă |
| Resource | `__Category` | Entity | resursă |
| Population | `__Measure` | Measure | populație |
| Density | `__Measure` | Measure | densitate |
| CapitalOf | `__Relation` | Relation | capitală |
| Language | `__Category` | Abstract | limbă |
| Religion | `__Category` | Abstract | religie |
| Infrastructure | `__Category` | Entity | infrastructură |
| TradeRoute | `__Category` | Relation | rută |
| Hazard | `__Category` | Event/State | hazard |
| Migration | `__Action` | Event | migrație |
| Map | `__Category` | Source | hartă |

### 8.9 Istorie (`config/History`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| HistoricalEvent | `__Event` | Event | eveniment |
| Period | `__TimePeriod` | Temporal | perioadă |
| Era | `__Category` | Period | epocă |
| Actor | `__Category` | Person/Org | actor |
| War | `__Category` | Event | război |
| Treaty | `__Category` | Source/Contract | tratat |
| Revolution | `__Category` | Event | revoluție |
| Empire | `__Category` | Org | imperiu |
| Colonization | `__Category` | Event | colonizare |
| Alliance | `__Relation` | Symmetric | alianță |
| Causes | `__Relation` | causes | cauzalitate |
| ConsequenceOf | `__Relation` | After/Causes | consecință |
| PrimarySource | `__Category` | Source | primară |
| SecondarySource | `__Category` | Source | secundară |
| Chronology | `__Category` | Before/After | cronologie |
| DatingConfidence | `__Property` | Evidence | încredere |
| Interpretation | `__Category` | Abstract | interpretare |
| Bias | `__Property` | Abstract | bias |
| Continuity | `__Property` | Temporal | continuitate |
| Rupture | `__Property` | Temporal | ruptură |

### 8.10 Psihologie (`config/Psychology`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Emotion | `__Category` | State | emoție |
| Mood | `__Category` | State | dispoziție |
| Trait | `__Category` | Property | trăsătură |
| Personality | `__Category` | Abstract | personalitate |
| Cognition | `__Category` | Abstract | cogniție |
| Memory | `__Category` | Abstract | memorie |
| Attention | `__Category` | Abstract | atenție |
| Perception | `__Category` | Abstract | percepție |
| Motivation | `__Category` | State | motivație |
| Behavior | `__Category` | Action | comportament |
| Reinforcement | `__Category` | Default | întărire |
| Conditioning | `__Category` | Implies | condiționare |
| Therapy | `__Category` | Action | terapie |
| Disorder | `__Category` | State | tulburare |
| Stressor | `__Category` | Cause | stresor |
| Coping | `__Category` | Action | coping |
| SelfConcept | `__Category` | Abstract | sine |
| Belief | `__Category` | Believed | credință |
| Decision | `__Category` | Action | decizie |
| Bias | `__Property` | Abstract | bias |

### 8.11 Sociologie (`config/Sociology`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Society | `__Category` | Entity | societate |
| Group | `__Category` | Entity | grup |
| Institution | `__Category` | Org | instituție |
| Norm | `__Category` | Default/Rule | normă |
| Role | `__Category` | Role | rol social |
| Status | `__Category` | Property | statut |
| Class | `__Category` | Category | clasă socială |
| Power | `__Category` | Relation | putere |
| Authority | `__Category` | Relation | autoritate |
| Inequality | `__Category` | Abstract | inegalitate |
| SocialCapital | `__Category` | Abstract | capital social |
| Network | `__Category` | Abstract | rețea |
| Tie | `__Relation` | Relation | legătură |
| Influence | `__Relation` | causes/enables | influență |
| Socialization | `__Action` | Event | socializare |
| Culture | `__Category` | Abstract | cultură |
| Deviance | `__Category` | Not/Norm | devianță |
| Sanction | `__Category` | Action | sancțiune |
| CollectiveAction | `__Category` | Action | acțiune colectivă |
| Migration | `__Category` | Event | migrație |

### 8.12 Antropologie (`config/Anthropology`)
| Concept | Tip | Depinde de | Definiție (scurt) |
|---|---|---|---|
| Culture | `__Category` | Abstract | cultură |
| Ritual | `__Category` | Event | ritual |
| Myth | `__Category` | Abstract | mit |
| Kinship | `__Category` | Relation | rudenie |
| Descent | `__Relation` | Transitive | descendență |
| Marriage | `__Relation` | Relation | căsătorie |
| Exchange | `__Category` | Action | schimb |
| Gift | `__Category` | Entity | dar |
| Taboo | `__Category` | Forbidden | tabu |
| Totem | `__Category` | Symbol | totem |
| Artifact | `__Category` | Object | artefact |
| Technology | `__Category` | Abstract | tehnologie |
| Subsistence | `__Category` | Action | subzistență |
| Settlement | `__Category` | Place | așezare |
| Migration | `__Category` | Event | migrație |
| Identity | `__Category` | Abstract | identitate |
| Ethnicity | `__Category` | Category | etnie |
| Language | `__Category` | Abstract | limbă |
| Tradition | `__Category` | Default | tradiție |
| Acculturation | `__Category` | Event | aculturație |

Notă: aceste liste sunt bootstrap; valoarea apare când legăm conceptele prin reguli (`Implies`), default-uri, și mapări sinonim→canonical.

### 8.13 Operatori canonici (per domeniu) – definiții mai “executabile”
Scopul acestor tabele: să nu rămânem doar cu “vocabular”, ci să stabilim **predicatele/graph-urile** prin care domeniul se exprimă coerent peste Core.

#### Math: operatori (`config/Math/01-relations.sys2`, `config/Math/02-rules.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `elementOf` | `elementOf x S` | `Set`, `Entity`, `isA` | apartenență |
| `subsetOf` | `subsetOf A B` | `__TransitiveRelation` | incluziune (transitiv) |
| `equals` | `equals a b` | `__ReflexiveRelation` | egalitate (folosită ca identitate logică) |
| `definedOn` | `definedOn f DomainSet` | `Function`, `Set` | domeniu funcție |
| `mapsTo` | `mapsTo f CodomainSet` | `Function`, `Set` | codomeniu |
| `apply` | `apply f x y` | `Function` | y = f(x) (reprezentare relațională) |
| `implies` | `ImpliesMacro a b` | logic core | regulă matematică (axiom/teoremă) |
| `forallIn` | `forallIn var Domain predicate` | cuantificatori + domeniu | cuantificare restricționată |
| `existsIn` | `existsIn var Domain predicate` | cuantificatori + domeniu | existențial restricționat |
| `proofOf` | `proofOf proof theorem` | `Evidence`, `Implies` | atașare dovadă la afirmație |
| `usesLemma` | `usesLemma proof lemma` | `Proof`, `Implies` | dependență între dovezi |
| `counterExample` | `counterExample claim witness` | `Not`, `Evidence` | invalidare constructivă |

#### Physics: operatori (`config/Physics/01-relations.sys2`, `config/Physics/02-laws.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `hasQuantity` | `hasQuantity system quantity measure` | `Measure`, `Unit` | atașează o mărime măsurată |
| `measuredBy` | `measuredBy quantity instrument` | `Entity`, `Evidence` | legătură cu instrument |
| `inFrame` | `inFrame observation frame` | `Place/Abstract` | cadru de referință |
| `conserves` | `conserves system quantity` | `ConservationLaw` | conservare |
| `causedBy` | `causedBy effect cause` | `Causes` | cauzalitate (specializare) |
| `before` | `before event1 event2` | temporal core | ordine temporală |
| `supportsLaw` | `supportsLaw evidence law` | `Evidence`, `Implies` | evidență pentru lege |
| `violatesLaw` | `violatesLaw observation law` | `Not`, `Implies` | contradicție experimentală |
| `approxEquals` | `approxEquals a b tolerance` | numeric layer | egalitate aproximativă |
| `unitOf` | `unitOf measure unit` | `Unit` | unitate asociată |

#### Biology: operatori (`config/Biology/01-relations.sys2`, `config/Biology/02-processes.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `taxonOf` | `taxonOf organism species` | `isA`/`subclass` | clasificare |
| `partOf` | `partOf organ organism` | `__TransitiveRelation` | parte-întreg (transitiv) |
| `locatedIn` | `locatedIn organism habitat` | `locatedIn` | habitat |
| `expresses` | `expresses gene protein` | `Entity` | expresie genetică |
| `mutatesTo` | `mutatesTo gene variant` | `Event` | mutație |
| `reproducesBy` | `reproducesBy organism method` | `Action` | reproducere |
| `predatorOf` | `predatorOf predator prey` | `Relation` | prădare |
| `symbiosisWith` | `symbiosisWith a b` | `__SymmetricRelation` | simbioză |
| `causes` | `causes factor phenotype` | `Causes` | cauzalitate biologică |
| `hasTrait` | `hasTrait organism trait` | `hasProperty` | trăsătură |

#### Medicine: operatori (`config/Medicine/01-relations.sys2`, `config/Medicine/02-guidelines.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `hasSymptom` | `hasSymptom patient symptom` | `State` | simptomatologie |
| `hasSign` | `hasSign patient sign` | `State` | semn clinic |
| `diagnoses` | `diagnoses clinician patient disease` | `Relation` | diagnostic |
| `ordersTest` | `ordersTest clinician patient test` | `Action` | investigație |
| `testResult` | `testResult patient test result` | `Evidence` | rezultat |
| `treats` | `treats treatment disease` | `Action` | tratament |
| `prescribes` | `prescribes clinician patient treatment` | `Action` | prescripție |
| `contraindicatedFor` | `contraindicatedFor treatment condition` | `Not/Default` | contraindicație |
| `riskFactorFor` | `riskFactorFor factor disease` | `Causes` | factor de risc |
| `evidenceLevel` | `evidenceLevel guideline level` | `Evidence` | grad evidență |
| `improves` | `improves treatment outcome` | `Default` | efect tipic |
| `adverseEffect` | `adverseEffect treatment effect` | `State` | reacție adversă |

#### LitCrit: operatori (`config/LitCrit/01-relations.sys2`, `config/LitCrit/02-arguments.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `writtenBy` | `writtenBy work author` | `Relation` | autorie |
| `hasGenre` | `hasGenre work genre` | `hasProperty` | gen |
| `hasTheme` | `hasTheme work theme` | `hasProperty` | temă |
| `hasMotif` | `hasMotif work motif` | `hasProperty` | motiv |
| `featuresCharacter` | `featuresCharacter work character` | `Relation` | personaj |
| `setIn` | `setIn work setting` | `locatedIn` | cadru |
| `usesSymbol` | `usesSymbol work symbol` | `Relation` | simbol |
| `intertextWith` | `intertextWith work otherWork` | `Relation` | intertext |
| `claims` | `claims critic claim` | `Abstract` | teză critic |
| `supportedByText` | `supportedByText claim quote` | `Evidence` | suport textual |
| `counterClaim` | `counterClaim claim otherClaim` | `Not/Or` | opoziție |
| `interpretsAs` | `interpretsAs critic work interpretation` | `Abstract` | interpretare |

#### Law: operatori (`config/Law/01-relations.sys2`, `config/Law/02-reasoning.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `partyTo` | `partyTo person contract` | `Relation` | parte într-un contract |
| `obligates` | `obligates contract party obligation` | deontic | obligație contractuală |
| `permits` | `permits law action` | deontic | permis |
| `forbids` | `forbids law action` | deontic | interzis |
| `breachOf` | `breachOf party contract` | `Event` | încălcare |
| `liableFor` | `liableFor party damages` | `Measure` | răspundere |
| `governedBy` | `governedBy contract jurisdiction` | `Place` | jurisdicție |
| `precedentFor` | `precedentFor case issue` | `Source` | precedent |
| `evidenceFor` | `evidenceFor evidence claim` | `Evidence` | probă |
| `standardOfProof` | `standardOfProof case standard` | `Abstract` | standard |
| `valid` | `valid contract` | `State` | validitate |
| `invalid` | `Not (valid contract)` | negare | invaliditate |

#### Philosophy/Ethics: operatori (`config/Philosophy/01-relations.sys2`, `config/Philosophy/02-arguments.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `values` | `values agent value` | `Abstract` | preferință/valoare |
| `intends` | `intends agent action` | `Action` | intenție |
| `causes` | `causes action consequence` | `Causes` | consecință |
| `harms` | `harms action agent` | `State` | vătămare |
| `benefits` | `benefits action agent` | `State` | beneficiu |
| `obligatory` | `must agent action` | deontic core | obligatoriu |
| `forbidden` | `mustNot agent action` | deontic core | interzis |
| `permitted` | `may agent action` | deontic core | permis |
| `supports` | `supports premise conclusion` | logic | suport inferențial |
| `refutes` | `refutes claim counter` | `Not` | refutare |
| `fallacyOf` | `fallacyOf argument fallacyType` | `Abstract` | sofism |
| `justifiedBy` | `justifiedBy belief evidence` | `Evidence` | justificare |

#### Geography: operatori (`config/Geography/01-relations.sys2`, `config/Geography/02-processes.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `locatedIn` | `locatedIn place region` | transitive list | localizare |
| `borders` | `borders a b` | symmetric | graniță |
| `contains` | `contains region place` | transitive | conține |
| `capitalOf` | `capitalOf city country` | Relation | capitală |
| `flowsThrough` | `flowsThrough river region` | Relation | râu |
| `hasClimate` | `hasClimate region climateZone` | hasProperty | climă |
| `hasResource` | `hasResource region resource` | has | resursă |
| `population` | `population place measure` | Measure | populație |
| `density` | `density place measure` | Measure | densitate |
| `migration` | `migration group from to` | `_ptrans` | migrație |
| `hazardRisk` | `hazardRisk region hazard` | Default/State | risc |
| `routeBetween` | `routeBetween route a b` | Relation | rută |

#### History: operatori (`config/History/01-relations.sys2`, `config/History/02-narratives.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `happenedDuring` | `happenedDuring event period` | temporal | perioadă |
| `before` | `before event1 event2` | temporal core | ordine |
| `causes` | `causes event1 event2` | causal core | cauză |
| `actorIn` | `actorIn actor event` | Role/Event | actor |
| `alliedWith` | `alliedWith a b` | symmetric | alianță |
| `treatyBetween` | `treatyBetween treaty a b` | Contract | tratat |
| `sourceFor` | `sourceFor source claim` | Evidence | sursă |
| `biasOf` | `biasOf source biasType` | Abstract | bias |
| `interpretationOf` | `interpretationOf historian claim` | Abstract | interpretare |
| `confidence` | `confidence claim level` | Evidence | încredere |
| `continuity` | `continuity period property` | temporal | continuitate |
| `rupture` | `rupture event property` | temporal | ruptură |

#### Psychology: operatori (`config/Psychology/01-relations.sys2`, `config/Psychology/02-models.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `experiences` | `experiences person emotion` | State/Role | emoție |
| `hasTrait` | `hasTrait person trait` | hasProperty | trăsătură |
| `believes` | `believes person proposition` | modal core | credință |
| `knows` | `knows person proposition` | modal core | cunoaștere |
| `motivatedBy` | `motivatedBy person motive` | State | motivație |
| `does` | `does person behavior` | Action | comportament |
| `reinforcedBy` | `reinforcedBy behavior reinforcer` | Default | întărire |
| `conditionedTo` | `conditionedTo person stimulus response` | Implies | condiționare |
| `copingWith` | `copingWith person stressor` | Action | coping |
| `treatedBy` | `treatedBy disorder therapy` | Action | terapie |
| `riskOf` | `riskOf factor disorder` | Causes | risc |
| `biasInfluences` | `biasInfluences bias decision` | Causes | bias → decizie |

#### Sociology: operatori (`config/Sociology/01-relations.sys2`, `config/Sociology/02-dynamics.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `memberOf` | `memberOf person group` | Relation | apartenență |
| `hasRole` | `hasRole person role` | Role | rol social |
| `hasStatus` | `hasStatus person status` | Property | statut |
| `hasNorm` | `hasNorm institution norm` | Default/Rule | normă |
| `enforces` | `enforces institution sanction` | Action | sancțiune |
| `deviatesFrom` | `deviatesFrom person norm` | Not | devianță |
| `influences` | `influences group behavior` | Causes | influență |
| `powerOver` | `powerOver a b` | Relation | putere |
| `inequalityIn` | `inequalityIn society metric` | Measure | inegalitate |
| `networkTie` | `networkTie a b tieType` | Relation | legătură |
| `collectiveAction` | `collectiveAction group action` | Action | acțiune |
| `migration` | `migration group from to` | `_ptrans` | migrație |

#### Anthropology: operatori (`config/Anthropology/01-relations.sys2`, `config/Anthropology/02-practices.sys2`)
| Operator | Semnătură DSL | Depinde de | Semnificație / notă |
|----------|----------------|------------|----------------------|
| `practices` | `practices group ritual` | Event | practică culturală |
| `believesMyth` | `believesMyth group myth` | Believed | mit |
| `kinship` | `kinship a b relation` | Relation | rudenie |
| `descentFrom` | `descentFrom child parent` | Transitive | descendență |
| `marriedTo` | `marriedTo a b` | Symmetric | căsătorie |
| `tabooAgainst` | `tabooAgainst group practice` | Forbidden | tabu |
| `exchanges` | `exchanges group gift otherGroup` | Action | schimb |
| `usesArtifact` | `usesArtifact group artifact` | Object | artefact |
| `settledIn` | `settledIn group place` | locatedIn | așezare |
| `migrates` | `migrates group from to` | `_ptrans` | migrație |
| `hasTradition` | `hasTradition group tradition` | Default | tradiție |
| `acculturatesWith` | `acculturatesWith group otherGroup` | Event | aculturație |

## 9) Cum verificăm că domeniile nu introduc semantici necanonice (test plan)
| Test | Ce dovedește | Implementare recomandată |
|------|--------------|--------------------------|
| Atom discipline | nu există `___NewVector` “scăpat” în teorii de domeniu | script care parsează graphs și semnalează apeluri directe |
| Canonical macro equivalence | `tell` ≡ `_mtrans + Request` (după canonicalizare) | test `Vector.equals` sau echivalență de metadata |
| Synonym collapse | `Doctor` și `Physician` răspund identic | `synonym` + alias map în Component KB + query tests |
| Negation collapse | `Not $ref` și `Not (expr)` → aceeași reprezentare | prove/query tests |

## 10) Concluzie
Fără evaluarea efectivă a primitivelelor L0 în runtime (K1–K5) și fără un kernel explicit pentru atom/name/alias/semantic-class (secțiunea 5), `config/Core` nu poate impune canonicitatea. Rezultatul: divergențe inevitabile între formulări DSL.

Direcția corectă este:
1) să facem teoria **executabilă** (nu doar descriptivă),
2) să introducem un meta-model explicit (tipuri, aliasuri, proprietăți de relații),
3) să adăugăm canonicalization + test harness care verifică echivalențe.

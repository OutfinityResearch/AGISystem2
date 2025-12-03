# Codex Proposal – Open-World Hooks, Existence, and Reflexes

Scopul acestui document este să descrie un design în care:

- “Hook‑urile” sunt **declarate în teorii**, ca verbe Sys2DSL.  
- Hook‑urile pot interveni în:
  - modul de existență (UNPROVEN vs CERTAIN),
  - reacții automate (reflexe) la evenimente (creare concept, fact nou, reasoning într-o zonă axiologică).  
- Execuția hook‑urilor este controlată:
  - nu se modifică indexul de concepte/fapte cât timp rulează un hook,
  - alte hook‑uri sunt dezactivate pe perioada execuției lui (evităm recursie și bucle).

Nu modificăm aici codul, doar propunem arhitectura.

---

## 1. Context: Existence & Open World

Există deja suport pentru o axă de existență în `ConceptStore`:

- `EXISTENCE`:
  - `IMPOSSIBLE`, `UNPROVEN`, `POSSIBLE`, `DEMONSTRATED`, `CERTAIN`.
- `addFact(triple, options?)`:
  - dacă nu dai `existence`, default este `CERTAIN`,
  - folosește `getBestExistenceFact` + `upgradeExistence` ca să păstreze varianta cu existență maximă pentru același `subject/relation/object`.

Din punctul de vedere al open‑world learning:

- **modul de învățare** ar trebui să adauge fapte cu `UNPROVEN` (sau `POSSIBLE`),
- **modul de query/trusted** folosește `CERTAIN/DEMONSTRATED`,
- contradicțiile trebuie verificate și în modul de învățare, nu doar pe teorii “curate”.

Hook‑urile declarate în teorii sunt un mecanism natural pentru a exprima aceste politici la nivel de DSL, nu doar în JS.

---

## 2. Model: Hook‑uri Declarate în Teorii (DSL)

### 2.1. Ideea de bază

În loc să avem doar hook‑uri definite în JS, definim **verbe specializate în Sys2DSL** care se comportă ca hook‑uri la anumite evenimente.

Tipuri de evenimente relevante:

- `ON_CONCEPT_CREATED` – când se creează pentru prima dată un concept/vector.  
- `ON_FACT_ADDED` – când se adaugă un fact nou în store.  
- `ON_REASONING_STEP` – când se evaluează o anumită relație (ex. CAUSES, PERMITTED_TO) într-o regiune axiologică.  
- `ON_CONTRADICTION` – când `ContradictionDetector` găsește o inconsistență.  

### 2.2. Posibilă sintaxă hook (variantă A – “hook blocks”)

Într-o teorie `.sys2dsl` am putea declara:

```sys2dsl
@HOOK existence_policy ON_FACT_ADDED BEGIN
  # subject, relation, object disponibile implicit
  # exemplu: dacă suntem în modul de învățare, forțează UNPROVEN
  @mode session GET_MODE any
  @isLearning $mode EQUAL_TO learning
  @result IF $isLearning THEN
    @newExistence existence SET_DIM UNPROVEN
  END
END
```

Interpretare:

- `@HOOK <name> ON_FACT_ADDED BEGIN ... END`
  - definește un *program DSL* care se execută automat când se adaugă un fact nou.
  - în interior, există variabile implicite (`subject`, `relation`, `object`, eventual `oldExistence`) și un canal special pentru a indica modificări (ex. `SET_DIM`, `SET_EXISTENCE`).

Engine:

- la încărcarea teoriei, parsează hook‑urile și le înregistrează ca:

  ```js
  hooks.onFactAdded.push({ name: 'existence_policy', program: [...] });
  ```

- la runtime, când apare un fact nou, engine:
  - intră în mod “hook context” (vezi 2.4),
  - rulează programul hook‑ului cu binding‑urile:

    ```sys2dsl
    subject = S
    relation = R
    object = O
    ```

### 2.3. Posibilă sintaxă hook (variantă B – “annotated verbs”)

Alternativ, putem avea o sintaxă de tip “meta‑fact”:

```sys2dsl
@_ existence_policy HOOK_FOR ON_FACT_ADDED
@existence_policy BEGIN
  # logică similară, folosește subject/relation/object din context
END
```

Avantaj:

- Reciclează mecanismul `BEGIN/END` existent; `HOOK_FOR` devine doar un meta‑verb care:
  - spune engine‑ului “când se întâmplă ON_FACT_ADDED, rulează verbul @existence_policy”.

### 2.4. Reguli de execuție a hook‑urilor

Cerința importantă din întrebare:

- Când rulează un hook:
  - **hook‑urile sunt dezactivate** (nu vrem hook‑uri recursive),
  - **indexul de concepte/fapte nu se modifică** (nu vrem ca hook‑ul să declanșeze alte efecte).

Propunere:

- Introducem un “hook execution context” în Reasoner/DSL engine:

  ```js
  engine.runHook('ON_FACT_ADDED', { subject, relation, object }, hookProgram) {
    this.inHookContext = true;
    this.indexWritesBlocked = true;
    this.hooksEnabled = false;
    try {
      this.executeProgram(hookProgram, {
        subject, relation, object,
        // scrierile în index sunt redirectate într-un buffer local
        // sau complet interzise (în funcție de policy)
      });
    } finally {
      this.inHookContext = false;
      this.indexWritesBlocked = false;
      this.hooksEnabled = true;
    }
  }
  ```

- În timpul execuției:
  - orice verb care ar modifica ConceptStore (ex. `IS_A`, `HAS`, `FACTS` cu side‑effects) este fie:
    - interzis (aruncă eroare “not allowed in hook context”),
    - fie rerutat într-un “shadow env” (doar pentru calcul, fără a scrie în store).

### 2.5. Legătura cu existence

Hook‑urile pentru existence devin DSL pur:

- În loc de `factHooks` în JS, scriem:

  ```sys2dsl
  @HOOK existence_policy ON_FACT_ADDED BEGIN
    @mode session GET_MODE any
    @isLearning $mode EQUAL_TO learning
    @result IF $isLearning THEN
      @_ subject SET_EXISTENCE UNPROVEN
    END
  END
  ```

Engine:

- `SET_EXISTENCE` este un verb special, fără efect în afara hook‑urilor, care:
  - contrazice sau upgradează nivelul de existență pentru fact-ul curent **după** ce hook-ul a rulat.

---

## 3. Reflexe și Reacții Automate la Evenimente

Pe lângă ON_FACT_ADDED, putem avea și alte evenimente:

- `ON_CONCEPT_CREATED` – când se creează un concept nou (primul vector).  
- `ON_REASONING_IN_REGION` – când reasoning se întâmplă într-o zonă axiologică interzisă / sensibilă.  
- `ON_CONTRADICTION_DETECTED` – când `ContradictionDetector` găsește inconsistențe.  

### 3.1. Axiologie: zone interzise și bias‑uri

Exemplu: avem o axă axiologică (dimensiuni pentru “ethical_risk”, “privacy”, etc.) și vrem:

- să interzicem reasoning în anumite regiuni,
- sau invers, să **favorizăm** anumite zone (bias pozitiv).

Hook‑uri posibile:

1. **Blocare în zone interzise**:

   ```sys2dsl
   @HOOK ethics_guard ON_REASONING_IN_REGION BEGIN
     @risk subject READ_DIM ethical_risk;
     @tooHigh $risk GREATER_THAN threshold;
     @decision IF $tooHigh THEN
       @_ subject SET_EXISTENCE IMPOSSIBLE   # sau marcare specială
     END
   END
   ```

   - Engine cheamă acest hook când încearcă o inferență într-o regiune cu `ethical_risk` mare.
   - Hook-ul poate:
     - opri reasoning-ul,
     - marca rezultatul ca `IMPOSSIBLE` sau `UNKNOWN`,
     - genera `NEEDS_CONFIRMATION` pentru user.

2. **Bias pozitiv**:

   ```sys2dsl
   @HOOK climate_bias ON_REASONING_IN_REGION BEGIN
     @isClimate subject IS_IN_DOMAIN climate_policy;
     @decision IF $isClimate THEN
       @_ subject BOOST_EXISTENCE DEMONSTRATED
     END
   END
   ```

   - În contextul unei teorii de climate policy, hook-ul poate “trage în sus” existența unor concluzii (bias declarat, nu ascuns).

### 3.2. ON_CONCEPT_CREATED

Când un concept nou apare (primul usage), putem:

- inițializa dimensiuni implicite,
- seta tag-uri de domeniu,
- porni macro-uri de învățare locală.

Exemplu:

```sys2dsl
@HOOK init_new_concept ON_CONCEPT_CREATED BEGIN
  @hasDomain subject HAS_DOMAIN any;
  @isUnknownDomain $hasDomain EQUAL_TO false;
  @result IF $isUnknownDomain THEN
    @_ subject TAG unknown_domain
  END
END
```

Engine:

- pe primul `ensureConcept(label)` pentru un `label` nou, declanșează `ON_CONCEPT_CREATED`.

---

## 4. Alternative de Implementare: DSL vs JS

### Variantă 1 – Hook‑uri DSL “pure”

- Toate politicile (existence, axiologie, reflexe) sunt exprimate ca macro-uri DSL:
  - `@HOOK name ON_EVENT BEGIN ... END`.
- Engine:
  - le înregistrează la load,
  - le execută în context de hook:
    - fără hook‑uri reentrante,
    - fără modificări directe de index (doar comenzi speciale de meta‑control, ex. `SET_EXISTENCE`).

Avantaj:

- Comportamentul este complet declarativ și portabil între implementări.
- Teoriile pot include propriile politici de învățare și etică.

Dezavantaj:

- Necesită extinderi clare în DSL (BEGIN/END + ON_EVENT + comenzi meta).
- Execuția unui hook DSL poate fi mai grea decât un hook JS simplu pentru cazuri triviale.

### Variantă 2 – JS Hook Engine + DSL ca “config”

- Hook‑urile sunt declarate în DSL (ca mai sus), dar:
  - engine compilează hook‑urile în structuri JS (de ex., un mic AST),
  - execuția efectivă este optimizată în JS (nu trece prin același pipeline complet ca un program DSL normal).

Avantaj:

- Mai ușor de optimizat și integrat cu structuri interne (ConceptStore, Reasoner).
- Putem avea hook‑uri care lucrează direct cu `_existenceIndex`, `_factIndex` etc., dar controlate de declarativul DSL.

Dezavantaj:

- Implementarea este mai complexă (compilare parțială DSL).

### Variantă 3 – JS Hooks “simple” + DSL Hooks “avansate”

Hibrid:

- Pentru cazuri simple (ex. existence default):
  - folosim un hook JS direct, configurat de `SET_MODE`.
- Pentru poliții complexe (axiologie, reflexe structurale):
  - folosim hook‑uri declarate în DSL.

Aceasta variantă minimă poate fi adoptată incremental:

- În prima fază:
  - se introduce `SET_MODE` + hook JS pentru existence.
- În faza următoare:
  - se introduce infrastructura DSL-level `@HOOK ... ON_EVENT`.

---

## 5. Are sens acest model?

Răspuns scurt: da, are sens și se aliniază bine cu arhitectura Sys2DSL/AGISystem2:

- Evenimentele (creare concept, fact nou, reasoning într-o zonă, contradicții) sunt deja detectabile în engine.
- Existența este deja reprezentată numeric și unificată în ConceptStore.
- DSL-ul v3 are deja mecanisme de:
  - `BEGIN/END`,
  - macro-uri,
  - `FACTS`, `IS_A`, `HAS`, etc., care pot fi reutilizate în hook-uri.

Cheile de proiectare:

1. **Context de hook clar:**
   - `hooksEnabled = false` + `indexWritesBlocked = true` în timpul hook-ului,
   - doar comenzi meta (“SET_EXISTENCE”, “TAG”, etc.) au voie să genereze efecte persistente.

2. **Evenimente bine definite:**
   - `ON_FACT_ADDED`, `ON_CONCEPT_CREATED`, `ON_REASONING_IN_REGION`, `ON_CONTRADICTION_DETECTED` acoperă majoritatea cazurilor de reflexe dorite.

3. **Compatibilitate:**
   - Hook-urile pot fi complet opționale:
     - dacă nu sunt declarate în teorii, engine se comportă ca acum.
   - Implementarea poate începe cu un subset (ex. doar `ON_FACT_ADDED` și `SET_EXISTENCE`), apoi extinsă.

În plus, prin faptul că hook‑urile sunt declarate în teorii, **politicile de învățare, etică și bias devin parte a cunoașterii**, nu cod hard‑codat – exact ce vrei într-un sistem open‑world controlabil și inspectabil.***

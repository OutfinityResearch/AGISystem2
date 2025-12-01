# Propuneri de Îmbunătățire pentru Suita de Evaluare AGISystem2

## 1. Analiza Generală

După o analiză a specificațiilor detaliate ale proiectului (`docs/specs/**`) și a suitei de evaluare existente (`evalsuite/`), s-au constatat următoarele:

*   **Specificații:** Proiectul beneficiază de o documentație excepțional de amănunțită (URS, FS, NFS, DS), care descrie o arhitectură robustă, centrată pe un model geometric și un limbaj dedicat (`Sys2DSL`).
*   **Suita de Evaluare (`evalsuite`):** Suita actuală este compusă din 12 teste data-driven care validează capabilitățile de raționament de nivel înalt (ontologie, cauzalitate, contradicții etc.). Abordarea este una de tip "black-box", testând sistemul prin interogări în limbaj natural.
*   **Acoperire:** Suita existentă acoperă bine principalele tipologii de raționament descrise în `global_arch.md`. Totuși, există câteva zone funcționale importante, specificate în documentație, care nu sunt validate de `evalsuite`.

## 2. Lacune Identificate în Acoperirea Testelor (`evalsuite`)

Suita de evaluare se concentrează pe validarea comportamentală a raționamentului, dar omite testarea unor module funcționale esențiale și a unor capabilități administrative.

### Lacuna 1: Module Core și Plugin-uri
*   **Descriere:** Nu există teste în `evalsuite` care să valideze direct plugin-urile de calcul (`src/plugins`), în special `MathPlugin`. Specificațiile (`FS-18`, `DS(/plugins/math.js.md)`) descriu relații computabile (`LESS_THAN`, `PLUS`, etc.) care nu sunt acoperite.
*   **Impact:** Fără aceste teste, corectitudinea operațiunilor numerice și a integrării plugin-urilor nu este garantată la nivel de evaluare end-to-end.

### Lacuna 2: Managementul Memoriei și al Cunoștințelor
*   **Descriere:** Specificațiile `forgetting.md` și `usage_tracking.md` descriu mecanisme complexe pentru "uitarea" conceptelor neutilizate și prioritizarea celor frecvent accesate. Aceste funcționalități critice pentru menținerea performanței pe termen lung nu sunt validate în `evalsuite`.
*   **Impact:** Riscul de regresie sau comportament neașteptat în managementul ciclului de viață al cunoștințelor este ridicat.

### Lacuna 3: Acoperire Incompletă a Sys2DSL
*   **Descriere:** `evalsuite` utilizează interogări în limbaj natural care sunt transpuse în `Sys2DSL`. Totuși, numeroase comenzi `Sys2DSL` avansate (ex: managementul teoriei, măști dimensionale, operațiuni pe liste) definite în `DS(/theory/Sys2DSL_commands.md)` nu sunt testate explicit.
*   **Impact:** Capabilitățile avansate ale limbajului, esențiale pentru utilizatorii experți și pentru crearea de programe de raționament complexe, nu sunt validate sistematic.

## 3. Plan de Îmbunătățire a Suitei de Evaluare

Pentru a adresa aceste lacune, se propune extinderea `evalsuite` cu următoarele suite de testare:

### Propunerea 1: Adăugarea unei Suite pentru Plugin-uri (`suite_13_plugins`)

*   **Obiectiv:** Validarea corectitudinii și integrării `MathPlugin` și a relațiilor computabile.
*   **Fișier `case.json`:**
    *   **Teorie:** Fapte care conțin concepte numerice (ex: `celsius_20`, `meters_100`, `value_10`, `value_5`).
    *   **Interogări:**
        *   "Is 20 less than 50?" (`@q1 ASK "20" LESS_THAN "50"`)
        *   "What is 10 plus 5?" (`@q2 ASK "10" PLUS "5"`)
        *   "Is 100 greater than 100?" (`@q3 ASK "100" GREATER_THAN "100"`)
    *   **Specificații acoperite:** `FS-18`, `DS(/plugins/math.js.md)`, `DS(/plugins/registry.js.md)`.

### Propunerea 2: Adăugarea unei Suite pentru Managementul Memoriei (`suite_14_memory`)

*   **Obiectiv:** Validarea funcționalităților de "uitare" și prioritizare a conceptelor.
*   **Fișier `case.json`:**
    *   **Teorie:** Un set de concepte cu frecvențe de utilizare diferite, ingerate printr-o serie de comenzi `ASSERT` și `ASK`.
    *   **Interogări/Comenzi:**
        *   Utilizarea directă a comenzilor `Sys2DSL`: `FORGET`, `BOOST`, `PROTECT`, `GET_USAGE`.
        *   `@stats GET_USAGE concept_X` pentru a verifica contorii de utilizare.
        *   `@protected_list PROTECT concept_Y`.
        *   `@forgotten_list FORGET threshold=5`.
    *   **Aserțiuni:**
        *   Se verifică dacă `FORGET` elimină conceptele corecte.
        *   Se verifică dacă `PROTECT` previne eliminarea unui concept.
        *   Se verifică dacă `BOOST` influențează persistența unui concept.
    *   **Specificații acoperite:** `FS-04`, `DS(/knowledge/forgetting.md)`, `DS(/knowledge/usage_tracking.md)`.

### Propunerea 3: Adăugarea unei Suite pentru Capabilități Avansate Sys2DSL (`suite_15_dsl_features`)

*   **Obiectiv:** Testarea explicită a comenzilor `Sys2DSL` care nu sunt acoperite implicit de interogările în limbaj natural.
*   **Fișier `case.json`:**
    *   **Teorie:** O ontologie de bază simplă.
    *   **Interogări/Comenzi:**
        *   **Măști:** `@mask MASK_PARTITIONS ontology`, `@q ASK_MASKED $mask "Query"`
        *   **Managementul Teoriei:** `@s THEORY_SAVE "test_theory"`, `@l THEORY_LOAD "test_theory"`
        *   **Operațiuni pe Liste:** `@facts FACTS_MATCHING "? IS_A animal"`, `@first MERGE_LISTS $facts`, `@count COUNT $facts`
    *   **Aserțiuni:** Se verifică dacă rezultatele comenzilor corespund specificațiilor din `DS(/theory/Sys2DSL_commands.md)`.
    *   **Specificații acoperite:** `DS(/theory/Sys2DSL_commands.md)`, `DS(/theory/Sys2DSL_arch.md)`.

### Propunerea 4: Actualizarea Documentației (`evalsuite/README.md`)

*   **Obiectiv:** Aducerea la zi a documentației pentru a reflecta structura reală a suitei și noile propuneri.
*   **Acțiuni:**
    *   Actualizarea listei de suite pentru a include cele 12 suite existente.
    *   Adăugarea descrierilor pentru suitele noi propuse (13, 14, 15).
    *   Revizuirea secțiunii "Probleme Identificate" pentru a reflecta starea curentă a testelor.

## 4. Concluzie

Prin implementarea acestor propuneri, suita de evaluare `evalsuite` va oferi o validare mult mai cuprinzătoare a capabilităților sistemului AGISystem2, crescând încrederea în corectitudinea implementării și reducând riscul de regresii în zonele funcționale critice, dar mai puțin vizibile.

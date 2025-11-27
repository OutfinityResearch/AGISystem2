# Propunere – Sys2DSL (forma actuală + îmbunătățiri aliniate la analiză)

## Sintaxa de bază (păstrată)
- Linie canonică: `@var COMMAND subject RELATION object`
- `@var` este obligatoriu (numele variabilei de rezultat).
- `subject` și `object` pot fi:
  - `$nume` – referință la o variabilă existentă;
  - token cu literă mică – concept (centrul curent al conceptului ca punct);
  - token cu literă mare – individ/punct explicit.
- `RELATION` este verb/relație în majuscule (standard sau custom).
- Nu există wildcard `?` în propunerea curentă; selecțiile se fac prin comenzi dedicate.

## Comenzi esențiale și semnături
- Ingest/întrebări:  
  - `@f ASSERT subject RELATION object`  
  - `@q ASK subject RELATION object [mask?]`  
  - `@qm ASK_MASKED $mask subject RELATION object`
- Counterfactual:  
  - `@cf CF "<intrebare> | fact1 ; fact2 ; ..."`. Separator `|` între întrebare și fapte temporare; faptele sunt în forma triplet, despărțite prin `;`.
- Teorii (straturi):  
  - `@p THEORY_PUSH name="..."`  
  - `@f ASSERT ...` (în strat)  
  - `@q ASK ...` (în strat)  
  - `@pop THEORY_POP`
- Măști/bias:  
  - `@m MASK_PARTITIONS ...`  
  - `@md MASK_DIMS ...`  
  - (opțional) `@b BIAS_MODE veil_of_ignorance`
- Altă logică/analiză:  
  - `@h ABDUCT subject RELATION object`  
  - `@a ANALOGICAL source_a=$... source_b=$... target_c=$...`  
  - `@c CHECK_CONTRADICTION ...`  
  - `@w CHECK_WOULD_CONTRADICT subject RELATION object`  
  - `@v VALIDATE ...`
- Export/explicații:  
  - `@e EXPLAIN $q`  
  - `@j TO_JSON $q`  
  - `@n TO_NATURAL $q`

## Exemple (aliniate la sintaxa curentă)
1) Fapt + întrebare  
   ```
   @f1 ASSERT Dog IS_A Animal
   @q1 ASK Dog IS_A Animal
   ```
2) Refolosire variabile  
   ```
   @dog BIND_CONCEPT dog
   @animal BIND_CONCEPT animal
   @f1 ASSERT $dog IS_A $animal
   @q1 ASK $dog IS_A $animal
   ```
3) Counterfactual (forma existentă)  
   ```
   @cf CF "Drone PERMITS HospitalFlight?" | Drone PERMITS HospitalFlight
   ```
4) Strat de teorie (alternativ la CF)  
   ```
   @p THEORY_PUSH name="what_if"
   @f ASSERT Drone PERMITS HospitalFlight
   @q ASK Drone PERMITS HospitalFlight
   @pop THEORY_POP
   ```
5) Întrebare cu mască  
   ```
   @mask MASK_PARTITIONS axiology
   @q ASK_MASKED $mask DrugX IS_A Safe
   ```

## Observații din analiza inițială (gap-uri majore)
- Translator/Parser acceptă doar gramatică foarte restrânsă; multe intrări valide conform spec vor eșua.
- Sys2DSL incomplet: tipurile de rezultate, comenzi (mask, explain, provenance) și erorile nu respectă DS/FS.
- Layering/what-if: `THEORY_PUSH/POP` din DSL nu sunt conectate la `TheoryStack`; `EngineAPI.pushTheory` construiește `TheoryLayer` cu argumente greșite.
- Reasoning minimal: `ASK` face lookup de fapte, fără selecție de teorie, mască combinată, proveniență sau bandă completă.
- Mask/bias neaplicate în Reasoner; `ASK_MASKED` nu există în API.
- Persistență lipsă pentru fapte/teorii (StorageAdapter nu este folosit pentru acestea).
- Validare/siguranță: Contradicțiile nu sunt verificate la ingest/ask; nu se returnează `CONFLICT` conform URS.

## Direcție de îmbunătățire (fără schimbarea formei liniei)
1) Documentare clară a gramaticii actuale (fără wildcard, fără `=`) și a rolului literă mică/mare/`$`.
2) Completarea setului de comenzi conform DS/FS și alinierea semnăturilor (inclusiv ASK_MASKED, EXPLAIN, TO_JSON/TO_NATURAL).
3) Legarea DSL de engine: ASSERT/ASK/CF folosesc Encoder/Reasoner cu TheoryStack, BiasController, Retriever; `THEORY_PUSH/POP` operează pe TheoryStack real.
4) Proveniență: EXPLAIN/TO_JSON returnează teorii active, dimensiuni/măști, bandă și distanțe.
5) Persistență/versionare: fapte și teorii salvate/încărcate prin StorageAdapter.
6) Validare: CHECK_CONTRADICTION/CHECK_WOULD_CONTRADICT integrate la ingest/ask cu răspuns `CONFLICT` când e cazul.
7) Teste e2e pe dimensiuni {512, 1024, 2048} pentru ingest/ask/cf/mask/layer/abducție/analogie și determinism.

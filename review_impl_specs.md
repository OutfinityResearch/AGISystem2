# Review implementare vs specificații

## Rezumat rapid (ACTUALIZAT 2025-12-01)

### Probleme rezolvate ✓
- **DS-uri create** pentru fișierele lipsă: `dimension_registry.js`, `dsl_parser.js`, `meta_theory_registry.js`, `theory_storage.js`, `dsl_commands_core.js`, `dsl_commands_memory.js`, `dsl_commands_reasoning.js`, `dsl_commands_inference.js`, `dsl_commands_output.js`
- **DS_map.md actualizat** cu toate modulele noi din `src/core/`, `src/reason/`, și `src/theory/`
- **Specificații aliniate cu codul**:
  - `reasoner.js.md` - eliminat `counterfactual()` și `temporalRecall()`, adăugat metodele reale (`deduceIsA`, `abductCause`, `factExists`, etc.)
  - `inference_engine.md` - corectat structura default rules (folosește `typicalType/property/value` nu `typical: {...}`)
  - `contradiction_detector.js.md` - redenumit din `contradiction_detection.md`, marcat temporal/direct negation ca TODO

### Probleme anterioare (acum rezolvate)
- ~~Am inventariat `docs/specs` versus codul din `src/**` și lipsesc DS-uri explicite pentru 11 fișiere de cod, plus două DS-uri cu denumiri diferite de fișierele sursă.~~
- ~~Anumite specificații existente nu mai descriu comportamentul curent (Reasoner, InferenceEngine, ContradictionDetector) și pot induce în eroare când sunt folosite ca referință de implementare.~~
- ~~DS_map nu acoperă module nou-introduse (ex. DimensionRegistry, MetaTheoryRegistry), iar unele întrebări „open" rămân nerezolvate în documentație.~~

## Lipsuri DS per fișier sursă (REZOLVATE ✓)

Toate fișierele au acum DS-uri corespunzătoare:

- ✓ `src/core/dimension_registry.js` → `.specs/core/dimension_registry.js.md`
- ✓ `src/reason/contradiction_detector.js` → `.specs/reason/contradiction_detector.js.md`
- ✓ `src/reason/inference_engine.js` → `.specs/reason/inference_engine.md` (naming menținut pentru compatibilitate)
- ✓ `src/theory/dsl_parser.js` → `.specs/theory/dsl_parser.js.md`
- ✓ `src/theory/dsl_commands_core.js` → `.specs/theory/dsl_commands_core.js.md`
- ✓ `src/theory/dsl_commands_memory.js` → `.specs/theory/dsl_commands_memory.js.md`
- ✓ `src/theory/dsl_commands_output.js` → `.specs/theory/dsl_commands_output.js.md`
- ✓ `src/theory/dsl_commands_inference.js` → `.specs/theory/dsl_commands_inference.js.md`
- ✓ `src/theory/dsl_commands_reasoning.js` → `.specs/theory/dsl_commands_reasoning.js.md`
- ✓ `src/theory/dsl_commands_theory.js` → `.specs/theory/dsl_commands_theory.js.md`
- ✓ `src/theory/meta_theory_registry.js` → `.specs/theory/meta_theory_registry.js.md`
- ✓ `src/theory/theory_storage.js` → `.specs/theory/theory_storage.js.md`

## Derapaje între cod și DS existente (REZOLVATE ✓)

- ✓ `docs/specs/reason/reasoner.js.md` - **ACTUALIZAT**: eliminat metodele inexistente (`counterfactual`, `temporalRecall`), adăugat metodele reale: `deduceIsA`, `abductCause`, `factExists`, `deduceWithInheritance`, `deduceTransitive`. Dependențele actualizate să includă `DimensionRegistry`.
- ✓ `docs/specs/reason/inference_engine.md` - **ACTUALIZAT**: corectat structura default rules să folosească câmpurile reale (`typicalType`, `property`, `value`); adăugat notă că `inferArgumentType` nu este implementat (folosiți `inferInheritance` în schimb).
- ✓ `docs/specs/reason/contradiction_detector.js.md` - **REDENUMIT și ACTUALIZAT**: marcat explicit că temporal și direct negation sunt TODO; documentat default disjoint pairs și tipurile reale de contradiction.
- ✓ `docs/specs/DS_map.md` - **ACTUALIZAT**: listează toate modulele noi (DimensionRegistry, InferenceEngine, ContradictionDetector, DSL commands, etc.).

## Goluri de documentație arhitecturală / how-to
- Până acum nu existau pagini în secțiunea „Architecture” care să explice fluxurile de învățare (fapte/concepte/relații) și modul de alegere a mecanismelor de raționament (inducție/deducție/abducție). Am adăugat paginile `docs/architecture/learning.html` și `docs/architecture/inference.html` pentru a acoperi cerința.

## Recomandări următoare (ACTUALIZATE)

### Completate ✓
1. ~~Adaugă DS-uri pentru fișierele lipsă de mai sus, cu formatul `<path>.js.md` și ID-uri DS consistente cu DS_map.~~ ✓ FĂCUT
2. ~~Aliniază specificațiile existente cu comportamentul curent~~ ✓ FĂCUT
3. ~~Actualizează `docs/specs/DS_map.md` pentru noile module~~ ✓ FĂCUT

### Rămân de făcut
4. Pentru relații/dimensiuni noi, folosește extensii de teorie în loc de a modifica fișierele base de inițializare: creează teorii suplimentare (`data/init/theories/*_extension.sys2dsl` sau JSON-uri adiționale) și înregistrează-le în `MetaTheoryRegistry` cu dependențe pe baza existentă.
5. Adaugă teste de acoperire minimă pentru noile funcționalități documentate (ex. regresie pentru `DimensionRegistry`, integrarea MetaTheoryRegistry/TheoryStorage).
6. Închide „Open DS Questions" în DS_map.md cu decizii explicite:
   - Dimensiuni minime configurate
   - Backend LSH/stocare
   - Strategie de determinism pentru TranslatorBridge
7. Implementează funcționalitățile marcate ca TODO în ContradictionDetector:
   - Direct negations (A and NOT A)
   - Temporal inconsistencies 

# AGISystem2 Evaluation Suite

Suite de testare pentru validarea capabilităților AGISystem2 de a procesa limbaj natural și de a răspunde corect la interogări.

## Structura

```
evalsuite/
├── README.md
├── runSuite.js          # Test runner principal
├── results.json         # Rezultate (generat automat)
├── 01_taxonomy/         # Taxonomie și IS_A tranzitiv
│   └── case.json
├── 02_physical_properties/  # Proprietăți fizice
│   └── case.json
├── 03_deontic_reasoning/    # Permisiuni/interdicții
│   └── case.json
├── 04_counterfactual/       # Raționament what-if
│   └── case.json
└── 05_abductive/            # Găsirea cauzelor
    └── case.json
```

## Utilizare

### Validare structură (dry-run)
```bash
node evalsuite/runSuite.js --dry-run
```

### Rulare completă
```bash
node evalsuite/runSuite.js
```

### Rulare caz specific
```bash
node evalsuite/runSuite.js --case 01_taxonomy
```

### Cu output detaliat
```bash
node evalsuite/runSuite.js --verbose
```

## Format Case.json

```json
{
  "id": "unique_id",
  "name": "Human Readable Name",
  "description": "What this case tests",

  "theory": {
    "natural_language": "Text în limbaj natural cu faptele de învățat...",
    "expected_facts": [
      "Subject RELATION Object",
      "..."
    ]
  },

  "queries": [
    {
      "id": "q1",
      "natural_language": "Întrebarea în limbaj natural?",
      "expected_answer": {
        "natural_language": "Răspunsul așteptat...",
        "truth": "TRUE_CERTAIN|FALSE|PLAUSIBLE|UNKNOWN",
        "explanation": "De ce acest răspuns"
      }
    }
  ],

  "tags": ["taxonomy", "transitive", ...]
}
```

## Probleme Identificate

Din rularea inițială, următoarele gap-uri au fost identificate:

### 1. Inferență Tranzitivă Incompletă
- **Problemă**: Sistemul nu deduce că Sparky (bird) NU este mammal
- **Cauză**: Reasoner-ul nu face inferență negativă (bird != mammal)
- **Fix necesar**: Implementare `DISJOINT_WITH` sau inferență closed-world

### 2. HAS_PROPERTY cu Valori String
- **Problemă**: LLM-ul generează `Fido HAS_PROPERTY Belongs to my neighbor`
- **Cauză**: Prompt-ul LLM nu specifică să evite `HAS_PROPERTY` cu string-uri
- **Fix necesar**: Îmbunătățire prompt sau post-procesare

### 3. Răspuns UNKNOWN în loc de FALSE
- **Problemă**: La "Is Sparky a mammal?", sistemul zice "nu pot determina"
- **Cauză**: Open-world assumption - dacă nu știe, zice UNKNOWN
- **Fix necesar**: Inferență closed-world pe anumite relații

### 4. Lanțuri de Inferență
- **Problemă**: mammal IS_A animal lipsește din faptele extrase
- **Cauză**: LLM extrage incomplet, sau Reasoner nu face chain reasoning
- **Fix necesar**: Verificare completitudine la ingest

## Metrici

| Caz | Queries | Passed | Failed | Pass Rate |
|-----|---------|--------|--------|-----------|
| 01_taxonomy | 3 | 2 | 1 | 66.7% |
| 02_physical_properties | 3 | TBD | TBD | - |
| 03_deontic_reasoning | 3 | TBD | TBD | - |
| 04_counterfactual | 3 | TBD | TBD | - |
| 05_abductive | 3 | TBD | TBD | - |

## Contribuție

Pentru a adăuga un nou caz de test:

1. Creează folder `XX_name/`
2. Adaugă `case.json` cu structura descrisă mai sus
3. Rulează `--dry-run` pentru validare
4. Rulează testul complet cu `--verbose`

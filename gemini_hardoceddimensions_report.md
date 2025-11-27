# Raport privind Mapările Hardcodate ale Dimensiunilor

Acest raport documentează toate locațiile din codul sursă unde proprietățile și relațiile sunt mapate direct (hardcodate) la indecși specifici într-un spațiu vectorial. Această analiză are rolul de a clarifica de ce există aceste valori și care este rolul lor în arhitectura sistemului.

### Context Arhitectural: Spații Conceptuale

Implementarea acestor mapări nu este o eroare sau o soluție temporară, ci o decizie de design deliberată, bazată pe paradigma **Spații Conceptuale** (Conceptual Spaces). În acest model, cunoștințele sunt reprezentate geometric, iar fiecare dimensiune a spațiului vectorial are o semnificație calitativă predefinită.

- **Sursa Principală a Logicii:** Toată logica de encodare se găsește în `src/ingest/encoder.js`.
- **Sursa de Adevăr pentru Ontologie:** Semnificația fiecărei dimensiuni este documentată în fișierul `data/init/dimensions.json`.

---

## 1. Maparea Proprietăților (`_encodePropertyObject`)

Această funcție se activează pentru relația `HAS_PROPERTY` și mapează proprietăți de tip `cheie=valoare` la axe specifice din spațiul vectorial, encodând valoarea numerică pe axa corespunzătoare.

**Fragment de cod relevant:**
```javascript
const propertyAxes = {
  boiling_point: 4,  // Temperature axis
  temperature: 4,
  weight: 2,         // Mass axis
  mass: 2,
  size: 3,           // Size axis
  age: 10            // Temporal axis
};
```

**Tabel de corespondență:**

| Proprietate | Index Dimensiune | Nume Dimensiune (din JSON) | Descriere Dimensiune |
| :--- | :--- | :--- | :--- |
| `boiling_point` | 4 | `Temperature` | Abstracted temperature axis used for physical processes and states. |
| `temperature` | 4 | `Temperature` | Abstracted temperature axis used for physical processes and states. |
| `weight` | 2 | `MassScale` | Rough magnitude of mass or weight on a normalized scale. |
| `mass` | 2 | `MassScale` | Rough magnitude of mass or weight on a normalized scale. |
| `size` | 3 | `SizeScale` | Overall spatial extent or size of an entity on a normalized scale. |
| `age` | 10 | `TemporalPersistence`| Distinguishes transient events from long-lived or permanent entities. |

---

## 2. Maparea Relațiilor (`_activateRelationDimensions`)

Această funcție activează anumite dimensiuni pentru a marca prezența unui anumit tip de relație în vectorul final. Acest lucru ajută sistemul de raționament să identifice rapid natura unei legături între concepte.

**Fragment de cod relevant:**
```javascript
const relationDims = {
  IS_A: [0],           // Taxonomic
  PART_OF: [1],        // Mereological
  HAS_PART: [1],
  CAUSES: [5],         // Causal
  CAUSED_BY: [5],
  LOCATED_IN: [6],     // Spatial
  CONTAINS: [6],
  BEFORE: [7],         // Temporal
  AFTER: [7],
  PERMITS: [256],      // Deontic (axiology range)
  PROHIBITS: [257],
  OBLIGATES: [258]
};
```

**Tabel de corespondență:**

| Relație | Index Dimensiune | Nume Dimensiune (din JSON) | Descriere Dimensiune |
| :--- | :--- | :--- | :--- |
| `IS_A` | 0 | `Physicality` | Degree to which an entity occupies physical space and has material properties. |
| `PART_OF` | 1 | *(nedefinit în `dimensions.json`)* | *(Descriere absentă)* |
| `HAS_PART` | 1 | *(nedefinit în `dimensions.json`)* | *(Descriere absentă)* |
| `CAUSES` | 5 | `Pressure` | Abstracted pressure axis for fluids, gases, or systems under load. |
| `CAUSED_BY` | 5 | `Pressure` | Abstracted pressure axis for fluids, gases, or systems under load. |
| `LOCATED_IN` | 6 | `Density` | Relative density or compactness of an entity or medium. |
| `CONTAINS` | 6 | `Density` | Relative density or compactness of an entity or medium. |
| `BEFORE` | 7 | `Phase` | Encodes state such as solid, liquid, gas, or plasma via discrete bands. |
| `AFTER` | 7 | `Phase` | Encodes state such as solid, liquid, gas, or plasma via discrete bands. |
| `PERMITS` | 256 | `MoralValence` | Represents moral goodness or badness of an act or state. |
| `PROHIBITS` | 257 | *(nedefinit în `dimensions.json`)* | *(Descriere absentă)* |
| `OBLIGATES` | 258 | *(nedefinit în `dimensions.json`)* | *(Descriere absentă)* |

**Notă:** Se observă că unii indecși (ex: 1, 257, 258) nu au o intrare corespunzătoare în `data/init/dimensions.json`, ceea ce indică o posibilă lipsă de sincronizare între cod și fișierul de ontologie. De asemenea, unele mapări par contraintuitive (ex: `CAUSES` -> `Pressure`), ceea ce ar putea sugera fie o eroare, fie o utilizare mai abstractă a dimensiunilor decât implică numele lor.

---

### Concluzii

Mapările hardcodate sunt o parte integrantă și deliberată a arhitecturii sistemului, fiind fundamentale pentru modelul de reprezentare a cunoștințelor bazat pe Spații Conceptuale. Această abordare permite sistemului să efectueze raționamente geometrice pe baza unei ontologii predefinite.

Deși sistemul nu este flexibil în a învăța dinamic noi proprietăți, este consistent în aplicarea ontologiei definite. Raportul evidențiază o transparență ridicată a modelului, dar și câteva posibile neconcordanțe între cod și fișierul de descriere a dimensiunilor, care ar merita investigate.

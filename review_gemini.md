# Review AGISystem2: Analiză și Propuneri de Îmbunătățire Hibridă

## 1. Analiza Implementării Curente

În urma analizei suitei `evalSuite/suite11_wedding_seating` și a modulelor asociate (`solver.mjs`, `executor.mjs`, `query-compound.mjs`), am ajuns la următoarele concluzii:

### Nu există "Hardcodări" Malițioase, dar există "Scurtături" Simbolice
Nu am găsit instrucțiuni de tipul `if (input === 'Wedding') return 'Alice'`, însă sistemul ocolește procesarea HDC (Holographic Dense Concept) în etapele critice:

1.  **Rezolvarea (Reasoning) este 100% Clasică**:
    *   Fișierul `src/reasoning/csp/solver.mjs` implementează un algoritm standard de **Backtracking** cu propagare de constrângeri (AC-3/Forward Checking).
    *   Vectorii HDC nu sunt folosiți pentru a găsi soluția, ci doar pentru a stoca rezultatul final.

2.  **Stocarea este Hibridă (Vector + Metadata)**:
    *   În `src/runtime/executor.mjs`, când o soluție este găsită, aceasta este împachetată într-un vector compus (`bundle`), dar simultan toate detaliile sunt salvate într-un obiect clasic JavaScript în câmpul `metadata`.

3.  **Interogarea se bazează pe Metadata (Authoritative)**:
    *   În `src/reasoning/query-compound.mjs`, funcția `searchCompoundSolutions` folosește HDC pentru a găsi *care* soluție este relevantă (calculând similaritatea), dar **extrage răspunsurile (bindings) direct din metadata**.
    *   Există comentariul: `// Verification is informational only - metadata extraction is authoritative`.

**Concluzie:** Sistemul actual este un solver simbolic robust, care folosește HDC doar ca un mecanism de indexare și stocare, nu ca un motor de raționament.

---

## 2. Propuneri pentru Arhitectură Hibridă (HDC-Driven)

Pentru a trece de la un sistem "Simbolic cu stocare HDC" la un sistem "HDC cu verificare Simbolică", propun următoarele direcții. Acest lucru va permite sistemului să scaleze intuitiv (prin similaritate) păstrând precizia.

### A. Accelerarea Solver-ului CSP folosind HDC (Heuristică)

În loc să parcurgem domeniul de valori arbitrar (sau în ordinea definirii), putem folosi similaritatea semantică din vectori pentru a ghida backtracking-ul.

**Sugestie:**
Dacă avem o constrângere "Alice vrea să stea lângă Bob", vectorul lui Alice va avea o similaritate mai mare cu locurile "compatibile" semantic.

*   **Modificare în `solver.mjs`**:
    În loc de `domain.forEach(...)`, ordonează valorile din domeniu bazat pe similaritatea vectorială cu constrângerile.
    ```javascript
    // Pseudo-cod pentru sortarea domeniului
    values.sort((valA, valB) => {
        // Calculează scorul de "rezonanță" vectoriala pentru valoarea curentă în context
        const scoreA = session.similarity(bind(variableVec, valA_Vec), constraintVec);
        const scoreB = session.similarity(bind(variableVec, valB_Vec), constraintVec);
        return scoreB - scoreA; // Încearcă întâi valorile cu scor HDC mare
    });
    ```
    **Beneficiu:** Solver-ul va găsi soluția mult mai repede în spații mari de căutare, "intuind" răspunsul corect.

### B. Verificare Reală a Soluțiilor HDC (Unbind)

Trebuie să demonstrăm că vectorul compus conține într-adevăr informația, nu doar metadatele.

**Sugestie:**
Modifică `query-compound.mjs` pentru a încerca decodarea reală. Metadatele trebuie folosite doar ca *fallback* sau pentru antrenarea sistemului (Ground Truth).

1.  Aplică operația `unbind(SolutionVector, RelationVector)`.
2.  Rezultatul trebuie să fie similar cu vectorul entității căutate.
3.  Dacă similaritatea este > 0.8, acceptă răspunsul din vector.

### C. Reutilizarea Soluțiilor prin Analogie (Reasoning prin Similaritate)

Acesta este marele avantaj HDC. Dacă am rezolvat o problemă de "Nuntă cu 3 invitați", și primim o problemă de "Ședință cu 3 colegi" care are o structură similară a conflictelor, nu ar trebui să rulăm solver-ul de la zero.

**Sugestie:**
Înainte de a lansa `CSPSolver`:
1.  Creează un vector al *problemei* (bundle de constrângeri și variabile).
2.  Caută în KB dacă există o problemă similară rezolvată (`similarity > 0.9`).
3.  Dacă există, mapează soluția veche peste noile entități (Analogical Mapping).

---

## 3. Plan de Implementare (Roadmap)

### Etapa 1: "HDC First" Decoding (Creșterea încrederii în vectori)
Modificăm `src/reasoning/query-compound.mjs` pentru a prioritiza decodarea vectoriala.

```javascript
// În searchCompoundSolutions
const extractedVec = unbind(sol.vector, queryParts);
const candidates = topKSimilar(extractedVec, session.vocabulary);

// Dacă cel mai bun candidat are scor bun, îl folosim pe el, ignorând metadata
if (candidates[0].similarity > 0.75) {
    return candidates[0].name; // Răspuns pur HDC
} else {
    // Fallback la metadata (simbolic) și logăm un warning că vectorul e "zgomotos"
    console.warn("Low HDC confidence, using symbolic metadata fallback");
    return sol.metadata.assignments[...];
}
```

### Etapa 2: Constraint Encoding
Trebuie să reprezentăm constrângerile (`conflictsWith`, `mustSitTogether`) vectoral mai puternic.
Momentan, ele sunt doar fapte logice.
*   **Acțiune:** Când definim `conflictsWith A B`, să adăugăm un vector de "tensiune" ortogonal vectorului de "soluție validă".
*   Astfel, orice stare care include A și B împreună va avea similaritate scăzută cu conceptul de "Valid".

### Etapa 3: Optimizarea Strategiei `sparse-polynomial`
Testele arată că strategia `sparse-polynomial` are acuratețe 100% și este mai rapidă.
*   **Recomandare:** Setați această strategie ca default pentru probleme complexe de reasoning.
*   Eliminați pragurile hardcodate mici (`0.02`) din `query-compound.mjs` și folosiți praguri dinamice bazate pe densitatea vectorului.

## 4. Concluzie

Sistemul actual este funcțional și trece testele ("Green tests"), dar nu exploatează potențialul "AGI" al arhitecturii HDC. El funcționează ca o bază de date vectorială pentru un solver clasic.

Prin implementarea **Step-ului A (Heuristica HDC)** și **Step-ului C (Analogie)**, sistemul va demonstra capabilități pe care un solver clasic nu le are: intuiție și învățare din experiențe anterioare.

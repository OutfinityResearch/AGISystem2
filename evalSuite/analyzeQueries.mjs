/**
 * Analyze query cases to understand what reasoning they need
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dirs = fs.readdirSync(__dirname)
  .filter(d => d.startsWith('suite') && fs.statSync(path.join(__dirname, d)).isDirectory());

console.log('═'.repeat(80));
console.log('ANALIZA QUERY-URI - Ce demonstrații ar trebui să producă?');
console.log('═'.repeat(80));
console.log();

let totalQueries = 0;
let categories = {
  directLookup: [],      // Simple KB lookup, no reasoning
  transitiveIsA: [],     // Requires isA chain traversal
  transitiveOther: [],   // Requires other transitive (locatedIn, causes, etc.)
  propertyInherit: [],   // Requires property inheritance via isA
  ruleApplication: [],   // Requires rule inference
  multiResult: []        // Returns multiple results
};

for (const dir of dirs.sort()) {
  const casesFile = path.join(__dirname, dir, 'cases.mjs');
  if (!fs.existsSync(casesFile)) continue;

  const content = fs.readFileSync(casesFile, 'utf-8');

  // Parse the steps array more carefully
  const stepsMatch = content.match(/export const steps = \[([\s\S]*?)\];/);
  if (!stepsMatch) continue;

  // Find all query cases
  const queryRegex = /\{\s*action:\s*'query'[\s\S]*?expected_nl:\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = queryRegex.exec(content)) !== null) {
    const fullBlock = match[0];
    const expectedNl = match[1];

    const inputNlMatch = fullBlock.match(/input_nl:\s*['"]([^'"]+)['"]/);
    const inputDslMatch = fullBlock.match(/input_dsl:\s*[`'"]([^`'"]+)[`'"]/);

    const inputNl = inputNlMatch ? inputNlMatch[1] : '';
    const inputDsl = inputDslMatch ? inputDslMatch[1].trim() : '';

    totalQueries++;

    const query = {
      suite: dir,
      inputNl,
      inputDsl,
      expectedNl,
      reasoningNeeded: [],
      suggestedProof: ''
    };

    // Analyze what reasoning this query needs
    const resultCount = (expectedNl.match(/\./g) || []).length;

    // Check DSL patterns
    if (inputDsl.match(/@q\s+isA\s+\?\w+\s+\w+/)) {
      // Query: isA ?x Type - find all instances of Type
      query.reasoningNeeded.push('Find all X where isA X Type (+ transitive subtypes)');
      categories.transitiveIsA.push(query);
    } else if (inputDsl.match(/@q\s+isA\s+\w+\s+\?\w+/)) {
      // Query: isA Entity ?type - find all types of Entity
      query.reasoningNeeded.push('Find all types of Entity via transitive isA chain');
      categories.transitiveIsA.push(query);
    } else if (inputDsl.match(/@q\s+(locatedIn|causes|before|partOf)/)) {
      query.reasoningNeeded.push('Transitive relation traversal');
      categories.transitiveOther.push(query);
    } else if (inputDsl.match(/@q\s+(can|has|likes|knows|owns|uses)\s+\w+\s+\?\w+/)) {
      query.reasoningNeeded.push('Property lookup (may need inheritance)');
      categories.propertyInherit.push(query);
    } else if (inputDsl.match(/@q\s+(can|has)\s+\?\w+\s+\w+/)) {
      query.reasoningNeeded.push('Find all X with property (needs inheritance + rules)');
      categories.ruleApplication.push(query);
    } else {
      query.reasoningNeeded.push('Direct KB lookup');
      categories.directLookup.push(query);
    }

    if (resultCount > 1) {
      query.reasoningNeeded.push(`Returns ${resultCount} results`);
      categories.multiResult.push(query);
    }

    // Generate suggested proof based on query type
    if (query.reasoningNeeded.includes('Find all types of Entity via transitive isA chain')) {
      query.suggestedProof = `Proof: ${inputDsl.match(/isA\s+(\w+)/)?.[1] || 'X'} isA T1. T1 isA T2. T2 isA T3... (chain traversal)`;
    }

    // Print analysis
    console.log(`[${dir}] ${inputNl}`);
    console.log(`  DSL: ${inputDsl}`);
    console.log(`  Response: ${expectedNl}`);
    console.log(`  Reasoning: ${query.reasoningNeeded.join(', ')}`);
    console.log();
  }
}

console.log('═'.repeat(80));
console.log('SUMAR CATEGORII');
console.log('═'.repeat(80));
console.log();
console.log(`Total queries: ${totalQueries}`);
console.log();
console.log(`1. Direct lookup (no reasoning):     ${categories.directLookup.length}`);
console.log(`2. Transitive isA:                   ${categories.transitiveIsA.length}`);
console.log(`3. Transitive other (locatedIn...):  ${categories.transitiveOther.length}`);
console.log(`4. Property inheritance:             ${categories.propertyInherit.length}`);
console.log(`5. Rule application:                 ${categories.ruleApplication.length}`);
console.log(`6. Multi-result queries:             ${categories.multiResult.length}`);

console.log();
console.log('═'.repeat(80));
console.log('CONCLUZIE: CE AR TREBUI SĂ CONȚINĂ UN PROOF PENTRU QUERY?');
console.log('═'.repeat(80));
console.log();

console.log(`
TIPURI DE QUERY ȘI DEMONSTRAȚIILE LOR:

1. "isA ?x Bird" (găsește toate instanțele de Bird)
   Proof actual necesar:
   - Sparrow isA Bird (direct).
   - Tweety isA Sparrow. Sparrow isA Bird. Therefore Tweety isA Bird (2-step).
   - Opus isA Penguin. Penguin isA Bird. Therefore Opus isA Bird (2-step).

2. "isA Poodle ?what" (găsește toate tipurile lui Poodle)
   Proof actual necesar:
   - Poodle isA Toy (direct).
   - Poodle isA Toy. Toy isA Dog. Therefore Poodle isA Dog (2-step).
   - Poodle isA Toy. Toy isA Dog. Dog isA Canine... (N-step chain)

3. "can ?x Fly" (găsește cine poate zbura)
   Proof actual necesar - COMPLEX:
   - Tweety can Fly (dacă e direct în KB)
   - SAU: Tweety isA Sparrow. Sparrow isA Bird. Bird can Fly.
          Applied inheritance rule. Therefore Tweety can Fly. (3+ steps)
   - PLUS: Check negations (Opus cannot fly despite being Bird)

4. "has Patient1 ?symptom" (găsește proprietățile)
   Proof actual necesar:
   - has Patient1 Fever (direct lookup)
   - has Patient1 Cough (direct lookup)

COMPLEXITATE ESTIMATĂ:
- Query directe (has X ?y): 1 step per result
- Query isA transitive: 1-10 steps per result (depinde de depth)
- Query cu inheritance (can ?x Y): 3-10 steps per result (isA chain + rule)
- Query cu reguli: 5+ steps per result
`);

console.log('═'.repeat(80));
console.log('PROPUNERE: FORMAT DEMONSTRAȚIE PENTRU QUERY');
console.log('═'.repeat(80));
console.log(`
EXEMPLU pentru "What is a Bird?" (@q isA ?x Bird):

Current expected_nl:
  "Sparrow is a Bird. Songbird is a Bird. Tweety is a Bird."

Proposed expected_nl cu demonstrație:
  "Query: isA ?x Bird. Results with proofs:
   1. Sparrow isA Bird (direct fact).
   2. Songbird isA Bird (direct fact).
   3. Tweety isA Bird. Proof: Tweety isA Sparrow. Sparrow isA Songbird. Songbird isA Bird. (3-step chain)
   4. FlightlessBird isA Bird (direct fact).
   5. Penguin isA Bird. Proof: Penguin isA FlightlessBird. FlightlessBird isA Bird. (2-step chain)
   6. Opus isA Bird. Proof: Opus isA Penguin. Penguin isA FlightlessBird. FlightlessBird isA Bird. (3-step chain)"

COMPLEXITATE IMPLEMENTARE:
- Runtime trebuie să returneze nu doar rezultatele, ci și calea de demonstrație
- Pentru fiecare rezultat, trebuie păstrat proof tree-ul
- Formatare NL a proof-ului per rezultat
`);

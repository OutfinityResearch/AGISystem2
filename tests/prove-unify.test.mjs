import { Session } from '../src/runtime/session.mjs';

const session = new Session({ geometry: 2048 });

// Setup from suite 20
const learnResult = session.learn(`
  isA John Teacher
  isA John Parent
  hasProperty Teacher Educated
  hasProperty Parent Caring
  @compBase isA ?comp ?base
  @baseProp hasProperty ?base ?prop
  @compAnd And $compBase $baseProp
  @compConc hasProperty ?comp ?prop
  @compRule Implies $compAnd $compConc
`);

console.log('Learn result:', learnResult);
console.log('KB Facts:', session.kbFacts.length);
console.log('Rules:', session.rules.length);

session.rules.forEach((r, i) => {
  console.log('Rule', i, r.name, 'hasVariables:', r.hasVariables);
  console.log('  conclusionVars:', r.conclusionVars);
  console.log('  conditionVars:', r.conditionVars);
  if (r.conditionParts) {
    console.log('  conditionParts type:', r.conditionParts.type);
    if (r.conditionParts.parts) {
      r.conditionParts.parts.forEach((p, j) => {
        console.log(`    part ${j}: type=${p.type}, hasAST=${!!p.ast}`);
        if (p.ast) {
          console.log(`      ast op:`, p.ast.operator?.name);
        }
      });
    }
  }
});

console.log('\n--- Testing hasProperty John Caring ---');
// Check KB for relevant facts
console.log('KB hasProperty facts:');
session.kbFacts.forEach(f => {
  if (f.metadata?.operator === 'hasProperty') {
    console.log('  ', f.metadata.operator, f.metadata.args?.join(' '));
  }
});
console.log('KB isA facts:');
session.kbFacts.forEach(f => {
  if (f.metadata?.operator === 'isA') {
    console.log('  ', f.metadata.operator, f.metadata.args?.join(' '));
  }
});

const result = session.prove('@goal hasProperty John Caring');
console.log('Prove success:', result.success);
console.log('Prove valid:', result.valid);
console.log('Prove reason:', result.reason);
console.log('Steps:', result.steps?.length);
if (result.steps) {
  result.steps.forEach((s, i) => console.log(`  ${i}: ${s.operation || s.fact || JSON.stringify(s)}`));
}

console.log('\n--- Testing hasProperty John Educated ---');
const result2 = session.prove('@goal hasProperty John Educated');
console.log('Prove success:', result2.success);
console.log('Steps:', result2.steps?.length);
if (result2.steps) {
  result2.steps.forEach((s, i) => console.log(`  ${i}: ${s.operation || s.fact || JSON.stringify(s)}`));
}

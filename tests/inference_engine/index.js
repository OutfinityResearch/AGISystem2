const InferenceEngine = require('../../src/reason/inference_engine');

async function run({ profile }) {
  const engine = new InferenceEngine({});

  let ok = true;

  // Test 1: Direct fact lookup
  {
    const facts = [
      { subject: 'Dog', relation: 'IS_A', object: 'mammal' }
    ];

    const result = engine.inferDirect('Dog', 'IS_A', 'mammal', facts);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    ok = ok && result.method === 'direct';
    if (!ok) console.log('FAIL: direct fact lookup');
  }

  // Test 2: Transitive inference
  {
    const facts = [
      { subject: 'Dog', relation: 'IS_A', object: 'mammal' },
      { subject: 'mammal', relation: 'IS_A', object: 'animal' },
      { subject: 'animal', relation: 'IS_A', object: 'living_thing' }
    ];

    const result = engine.inferTransitive('Dog', 'IS_A', 'living_thing', facts);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    ok = ok && result.method === 'transitive';
    ok = ok && result.proof && result.proof.steps && result.proof.steps.length === 3;
    if (!ok) console.log('FAIL: transitive inference');
  }

  // Test 3: Symmetric inference
  {
    engine.setRelationProperties('MARRIED_TO', { symmetric: true });

    const facts = [
      { subject: 'Alice', relation: 'MARRIED_TO', object: 'Bob' }
    ];

    const result = engine.inferSymmetric('Bob', 'MARRIED_TO', 'Alice', facts);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    ok = ok && result.method === 'symmetric';
    if (!ok) console.log('FAIL: symmetric inference');
  }

  // Test 4: Inverse inference
  {
    const facts = [
      { subject: 'Alice', relation: 'PARENT_OF', object: 'Bob' }
    ];

    const result = engine.inferInverse('Bob', 'CHILD_OF', 'Alice', facts);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    ok = ok && result.method === 'inverse';
    if (!ok) console.log('FAIL: inverse inference');
  }

  // Test 5: Property inheritance
  {
    const facts = [
      { subject: 'mammal', relation: 'HAS_PROPERTY', object: 'warm_blooded' },
      { subject: 'Dog', relation: 'IS_A', object: 'mammal' }
    ];

    const result = engine.inferInheritance('Dog', 'HAS_PROPERTY', 'warm_blooded', facts, 10);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    ok = ok && result.method === 'inheritance';
    ok = ok && result.inheritedFrom === 'mammal';
    if (!ok) console.log('FAIL: property inheritance');
  }

  // Test 6: Default reasoning - typical case
  {
    engine.registerDefault({
      name: 'birds_fly',
      typicalType: 'bird',
      property: 'CAN',
      value: 'fly',
      exceptions: ['Penguin', 'Ostrich']
    });

    const facts = [
      { subject: 'Tweety', relation: 'IS_A', object: 'bird' }
    ];

    const result = engine.inferDefault('Tweety', 'CAN', 'fly', facts);
    ok = ok && result.truth === 'TRUE_DEFAULT';
    if (!ok) console.log('FAIL: default reasoning typical case');
  }

  // Test 7: Default reasoning - exception case
  {
    const facts = [
      { subject: 'Pete', relation: 'IS_A', object: 'Penguin' },
      { subject: 'Penguin', relation: 'IS_A', object: 'bird' }
    ];

    const result = engine.inferDefault('Pete', 'CAN', 'fly', facts);
    ok = ok && result.truth === 'FALSE';
    ok = ok && result.reason === 'exception_applies';
    if (!ok) console.log('FAIL: default reasoning exception case');
  }

  // Test 8: Composition rule
  {
    engine.registerRule({
      name: 'grandparent',
      head: { subject: '?x', relation: 'GRANDPARENT_OF', object: '?z' },
      body: [
        { subject: '?x', relation: 'PARENT_OF', object: '?y' },
        { subject: '?y', relation: 'PARENT_OF', object: '?z' }
      ]
    });

    const facts = [
      { subject: 'Alice', relation: 'PARENT_OF', object: 'Bob' },
      { subject: 'Bob', relation: 'PARENT_OF', object: 'Charlie' }
    ];

    const result = engine.inferComposition('Alice', 'GRANDPARENT_OF', 'Charlie', facts, 5);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    ok = ok && result.rule === 'grandparent';
    if (!ok) console.log('FAIL: composition rule');
  }

  // Test 9: Complete infer (finds best method)
  {
    const facts = [
      { subject: 'Dog', relation: 'IS_A', object: 'mammal' },
      { subject: 'mammal', relation: 'IS_A', object: 'animal' }
    ];

    const result = engine.infer('Dog', 'IS_A', 'animal', facts);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    // Should find via transitive
    ok = ok && result.method === 'transitive';
    if (!ok) console.log('FAIL: complete infer');
  }

  // Test 10: Forward chaining
  {
    const facts = [
      { subject: 'A', relation: 'IS_A', object: 'B' },
      { subject: 'B', relation: 'IS_A', object: 'C' }
    ];

    const derived = engine.forwardChain(facts, 10);
    const hasAtoC = derived.some(
      f => f.subject === 'A' && f.relation === 'IS_A' && f.object === 'C'
    );
    ok = ok && hasAtoC;
    if (!ok) console.log('FAIL: forward chaining');
  }

  // Test 11: Forward chaining with symmetric expansion
  {
    engine.setRelationProperties('EQUIVALENT_TO', { symmetric: true, transitive: true });

    const facts = [
      { subject: 'X', relation: 'EQUIVALENT_TO', object: 'Y' }
    ];

    const derived = engine.forwardChain(facts, 10);
    const hasReverse = derived.some(
      f => f.subject === 'Y' && f.relation === 'EQUIVALENT_TO' && f.object === 'X'
    );
    ok = ok && hasReverse;
    if (!ok) console.log('FAIL: forward chain symmetric');
  }

  // Test 12: Case-insensitive matching
  {
    const facts = [
      { subject: 'Dog', relation: 'IS_A', object: 'Mammal' }
    ];

    const result = engine.inferDirect('dog', 'IS_A', 'mammal', facts);
    ok = ok && result.truth === 'TRUE_CERTAIN';
    if (!ok) console.log('FAIL: case-insensitive matching');
  }

  return { ok, tests: 12 };
}

module.exports = { run };

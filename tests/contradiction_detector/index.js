const ContradictionDetector = require('../../src/reason/contradiction_detector');

async function run({ profile }) {
  const detector = new ContradictionDetector({});

  let ok = true;

  // Test 1: Disjoint type violation
  {
    const facts = [
      { subject: 'Cat', relation: 'DISJOINT_WITH', object: 'Dog' },
      { subject: 'Fluffy', relation: 'IS_A', object: 'Cat' },
      { subject: 'Fluffy', relation: 'IS_A', object: 'Dog' }
    ];

    const report = detector.detectAll(facts);
    ok = ok && !report.consistent;
    ok = ok && report.contradictions.length > 0;
    ok = ok && report.contradictions[0].type === 'DISJOINT_VIOLATION';
    if (!ok) console.log('FAIL: disjoint type violation detection');
  }

  // Test 2: No contradiction for valid types
  {
    const facts = [
      { subject: 'Cat', relation: 'DISJOINT_WITH', object: 'Dog' },
      { subject: 'Fluffy', relation: 'IS_A', object: 'Cat' },
      { subject: 'Rex', relation: 'IS_A', object: 'Dog' }
    ];

    const report = detector.detectAll(facts);
    ok = ok && report.consistent;
    if (!ok) console.log('FAIL: should be consistent with valid types');
  }

  // Test 3: Functional relation violation
  {
    detector.registerFunctionalRelation('BORN_IN');

    const facts = [
      { subject: 'Alice', relation: 'BORN_IN', object: 'Paris' },
      { subject: 'Alice', relation: 'BORN_IN', object: 'London' }
    ];

    const report = detector.detectAll(facts);
    ok = ok && !report.consistent;
    ok = ok && report.contradictions.some(c => c.type === 'FUNCTIONAL_VIOLATION');
    if (!ok) console.log('FAIL: functional violation detection');
  }

  // Test 4: Taxonomic cycle detection
  {
    const facts = [
      { subject: 'A', relation: 'IS_A', object: 'B' },
      { subject: 'B', relation: 'IS_A', object: 'C' },
      { subject: 'C', relation: 'IS_A', object: 'A' }
    ];

    const report = detector.detectAll(facts);
    ok = ok && !report.consistent;
    ok = ok && report.contradictions.some(c => c.type === 'TAXONOMIC_CYCLE');
    if (!ok) console.log('FAIL: taxonomic cycle detection');
  }

  // Test 5: Would contradict prediction
  {
    const existingFacts = [
      { subject: 'Cat', relation: 'DISJOINT_WITH', object: 'Dog' },
      { subject: 'Fluffy', relation: 'IS_A', object: 'Cat' }
    ];

    const newFact = { subject: 'Fluffy', relation: 'IS_A', object: 'Dog' };
    const result = detector.wouldContradict(newFact, existingFacts);

    ok = ok && result.wouldContradict === true;
    if (!ok) console.log('FAIL: wouldContradict prediction');
  }

  // Test 6: Cardinality max violation
  {
    const detector2 = new ContradictionDetector({});
    detector2.registerCardinalityConstraint('Person', 'HAS_BIOLOGICAL_PARENT', 0, 2);

    const facts = [
      { subject: 'Alice', relation: 'IS_A', object: 'Person' },
      { subject: 'Alice', relation: 'HAS_BIOLOGICAL_PARENT', object: 'Bob' },
      { subject: 'Alice', relation: 'HAS_BIOLOGICAL_PARENT', object: 'Carol' },
      { subject: 'Alice', relation: 'HAS_BIOLOGICAL_PARENT', object: 'Dave' }
    ];

    const report = detector2.detectAll(facts);
    ok = ok && !report.consistent;
    ok = ok && report.contradictions.some(c => c.type === 'CARDINALITY_MAX_VIOLATION');
    if (!ok) console.log('FAIL: cardinality max violation');
  }

  // Test 7: Inherited disjointness
  {
    const facts = [
      { subject: 'mammal', relation: 'DISJOINT_WITH', object: 'reptile' },
      { subject: 'Dog', relation: 'IS_A', object: 'mammal' },
      { subject: 'Fluffy', relation: 'IS_A', object: 'Dog' },
      { subject: 'Fluffy', relation: 'IS_A', object: 'reptile' }
    ];

    const report = detector.detectAll(facts);
    ok = ok && !report.consistent;
    if (!ok) console.log('FAIL: inherited disjointness detection');
  }

  return { ok, tests: 7 };
}

module.exports = { run };

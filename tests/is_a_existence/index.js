/**
 * Tests for IS_A with Existence Tracking (v3.0)
 * DS(/tests/is_a_existence)
 *
 * Tests:
 * - deduceIsAWithExistence() basic functionality
 * - Transitive chain with min(existence) tracking
 * - IS_A variant relations (IS_A_CERTAIN, IS_A_PROVEN, etc.)
 * - Existence filtering with minExistence option
 * - Path tracking through existence-aware BFS
 */

const ConceptStore = require('../../src/knowledge/concept_store');
const Reasoner = require('../../src/reason/reasoner');

async function run() {
  const dims = 16;
  const results = [];

  // Test 1: Basic deduceIsAWithExistence with CERTAIN facts
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Dog', relation: 'IS_A', object: 'Animal' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Dog', 'Animal');
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 127 &&
               result.method === 'transitive' &&
               result.depth === 1;
    results.push({ name: 'basic_certain_fact', ok });
  }

  // Test 2: Transitive chain with min(existence) - all CERTAIN
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Poodle', relation: 'IS_A', object: 'Dog' });
    store.addFact({ subject: 'Dog', relation: 'IS_A', object: 'Mammal' });
    store.addFact({ subject: 'Mammal', relation: 'IS_A', object: 'Animal' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Poodle', 'Animal');
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 127 &&
               result.depth === 3;
    results.push({ name: 'transitive_chain_all_certain', ok });
  }

  // Test 3: Transitive chain with mixed existence - min propagates
  {
    const store = new ConceptStore(dims);
    store.addFact(
      { subject: 'Unicorn', relation: 'IS_A', object: 'Horse' },
      { existence: store.EXISTENCE.POSSIBLE } // 0
    );
    store.addFact(
      { subject: 'Horse', relation: 'IS_A', object: 'Mammal' },
      { existence: store.EXISTENCE.CERTAIN } // 127
    );
    store.addFact(
      { subject: 'Mammal', relation: 'IS_A', object: 'Animal' },
      { existence: store.EXISTENCE.CERTAIN } // 127
    );
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Unicorn', 'Animal');
    // Chain: Unicorn --(0)--> Horse --(127)--> Mammal --(127)--> Animal
    // Min existence along path: min(127, 0, 127, 127) = 0
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 0 && // POSSIBLE - the weakest link
               result.depth === 3;
    results.push({ name: 'transitive_chain_min_existence', ok });
  }

  // Test 4: minExistence filtering - reject low existence paths
  {
    const store = new ConceptStore(dims);
    store.addFact(
      { subject: 'Bigfoot', relation: 'IS_A', object: 'Primate' },
      { existence: store.EXISTENCE.UNPROVEN } // -64
    );
    store.addFact(
      { subject: 'Primate', relation: 'IS_A', object: 'Mammal' },
      { existence: store.EXISTENCE.CERTAIN }
    );
    const reasoner = new Reasoner(store);

    // Require at least POSSIBLE (0) - should reject UNPROVEN path
    const result = reasoner.deduceIsAWithExistence('Bigfoot', 'Mammal', {
      minExistence: store.EXISTENCE.POSSIBLE
    });
    const ok = result.truth === 'UNKNOWN'; // Path exists but below threshold
    results.push({ name: 'min_existence_filtering', ok });
  }

  // Test 5: DISJOINT_WITH returns FALSE with IMPOSSIBLE existence
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Cat', relation: 'IS_A', object: 'Feline' });
    store.addFact({ subject: 'Cat', relation: 'DISJOINT_WITH', object: 'Canine' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Cat', 'Canine');
    const ok = result.truth === 'FALSE' &&
               result.existence === -127 &&
               result.method === 'disjoint';
    results.push({ name: 'disjoint_returns_impossible', ok });
  }

  // Test 6: IS_A_CERTAIN variant uses existence=127
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Human', relation: 'IS_A_CERTAIN', object: 'Mortal' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Human', 'Mortal');
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 127;
    results.push({ name: 'is_a_certain_variant', ok });
  }

  // Test 7: IS_A_PROVEN variant uses existence=64
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Higgs', relation: 'IS_A_PROVEN', object: 'Boson' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Higgs', 'Boson');
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 64;
    results.push({ name: 'is_a_proven_variant', ok });
  }

  // Test 8: IS_A_POSSIBLE variant uses existence=0
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'DarkMatter', relation: 'IS_A_POSSIBLE', object: 'Matter' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('DarkMatter', 'Matter');
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 0;
    results.push({ name: 'is_a_possible_variant', ok });
  }

  // Test 9: IS_A_UNPROVEN variant uses existence=-64
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Ether', relation: 'IS_A_UNPROVEN', object: 'Medium' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Ether', 'Medium');
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === -64;
    results.push({ name: 'is_a_unproven_variant', ok });
  }

  // Test 10: Multiple paths - returns highest existence path
  {
    const store = new ConceptStore(dims);
    // Path 1: Dragon -> Reptile -> Animal (POSSIBLE)
    store.addFact(
      { subject: 'Dragon', relation: 'IS_A', object: 'Reptile' },
      { existence: store.EXISTENCE.POSSIBLE }
    );
    store.addFact({ subject: 'Reptile', relation: 'IS_A', object: 'Animal' });

    // Path 2: Dragon -> MythicalCreature -> Creature -> Animal (UNPROVEN)
    store.addFact(
      { subject: 'Dragon', relation: 'IS_A', object: 'MythicalCreature' },
      { existence: store.EXISTENCE.UNPROVEN }
    );
    store.addFact({ subject: 'MythicalCreature', relation: 'IS_A', object: 'Creature' });
    store.addFact({ subject: 'Creature', relation: 'IS_A', object: 'Animal' });

    const reasoner = new Reasoner(store);
    const result = reasoner.deduceIsAWithExistence('Dragon', 'Animal');

    // Should prefer Path 1 with POSSIBLE (0) over Path 2 with UNPROVEN (-64)
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 0; // POSSIBLE - the better path
    results.push({ name: 'multiple_paths_best_existence', ok });
  }

  // Test 11: Path tracking included in result
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Labrador', relation: 'IS_A', object: 'Dog' });
    store.addFact({ subject: 'Dog', relation: 'IS_A', object: 'Canine' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Labrador', 'Canine');
    const ok = result.path &&
               result.path.length === 3 &&
               result.path[0].toLowerCase() === 'labrador' &&
               result.path[2].toLowerCase() === 'canine';
    results.push({ name: 'path_tracking', ok });
  }

  // Test 12: Unknown subject returns UNKNOWN with existence=0
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Dog', relation: 'IS_A', object: 'Animal' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Unknown', 'Animal');
    const ok = result.truth === 'UNKNOWN' &&
               result.method === 'unknown_subject';
    results.push({ name: 'unknown_subject', ok });
  }

  // Test 13: No path returns UNKNOWN
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Cat', relation: 'IS_A', object: 'Feline' });
    store.addFact({ subject: 'Dog', relation: 'IS_A', object: 'Canine' });
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Cat', 'Canine');
    const ok = result.truth === 'UNKNOWN' &&
               result.method === 'no_path';
    results.push({ name: 'no_path_unknown', ok });
  }

  // Test 14: Mixed IS_A and IS_A_PROVEN in chain
  {
    const store = new ConceptStore(dims);
    store.addFact({ subject: 'Electron', relation: 'IS_A_PROVEN', object: 'Lepton' }); // 64
    store.addFact({ subject: 'Lepton', relation: 'IS_A', object: 'Fermion' }); // 127
    store.addFact({ subject: 'Fermion', relation: 'IS_A', object: 'Particle' }); // 127
    const reasoner = new Reasoner(store);

    const result = reasoner.deduceIsAWithExistence('Electron', 'Particle');
    // Chain: Electron --(64)--> Lepton --(127)--> Fermion --(127)--> Particle
    // Min = 64
    const ok = result.truth === 'TRUE_CERTAIN' &&
               result.existence === 64;
    results.push({ name: 'mixed_relations_chain', ok });
  }

  // Summary
  const passed = results.filter(r => r.ok).length;
  const total = results.length;

  for (const r of results) {
    if (!r.ok) {
      console.log(`  FAIL: ${r.name}`);
    }
  }

  return { ok: passed === total, passed, total, results };
}

module.exports = { run };

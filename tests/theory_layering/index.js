/**
 * Theory Layering Test Suite
 *
 * Tests TheoryLayer, TheoryStack, and their integration with Reasoner
 */

const TheoryLayer = require('../../src/knowledge/theory_layer');
const TheoryStack = require('../../src/knowledge/theory_stack');
const BoundedDiamond = require('../../src/core/bounded_diamond');
const ConceptStore = require('../../src/knowledge/concept_store');
const Reasoner = require('../../src/reason/reasoner');

async function run({ profile }) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    errors: []
  };

  function test(name, fn) {
    results.total++;
    try {
      fn();
      results.passed++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  const DIMS = 64;

  // ======= TheoryLayer Tests =======

  test('TheoryLayer: constructor creates valid layer', () => {
    const layer = new TheoryLayer(DIMS, {
      id: 'test_layer',
      label: 'Test Layer',
      priority: 5
    });

    if (layer.id !== 'test_layer') throw new Error('Wrong id');
    if (layer.dimensions !== DIMS) throw new Error('Wrong dimensions');
    if (layer.priority !== 5) throw new Error('Wrong priority');
    if (!layer.definitionMask) throw new Error('Missing definitionMask');
  });

  test('TheoryLayer: covers() tracks dimension mask', () => {
    const layer = new TheoryLayer(DIMS, { id: 'mask_test' });

    if (layer.covers(0)) throw new Error('Should not cover dim 0 initially');

    layer.setDimension(0, 10, 20);
    layer.setDimension(7, -5, 5);
    layer.setDimension(8, 0, 100);

    if (!layer.covers(0)) throw new Error('Should cover dim 0');
    if (!layer.covers(7)) throw new Error('Should cover dim 7');
    if (!layer.covers(8)) throw new Error('Should cover dim 8');
    if (layer.covers(1)) throw new Error('Should not cover dim 1');
  });

  test('TheoryLayer: applyTo() creates new diamond with overrides', () => {
    const baseDiamond = new BoundedDiamond('base', 'Base Concept', DIMS);
    baseDiamond.minValues[0] = 0;
    baseDiamond.maxValues[0] = 50;
    baseDiamond.center[0] = 25;

    const layer = new TheoryLayer(DIMS, { id: 'override' });
    layer.setDimension(0, 100, 127);

    const result = layer.applyTo(baseDiamond);

    // Original should be unchanged
    if (baseDiamond.minValues[0] !== 0) throw new Error('Original min changed');
    if (baseDiamond.maxValues[0] !== 50) throw new Error('Original max changed');

    // Result should have overrides
    if (result.minValues[0] !== 100) throw new Error('Override min not applied');
    if (result.maxValues[0] !== 127) throw new Error('Override max not applied');
  });

  test('TheoryLayer: toJSON() and fromJSON() roundtrip', () => {
    const layer = new TheoryLayer(DIMS, {
      id: 'roundtrip',
      label: 'Roundtrip Test',
      priority: 3,
      metadata: { source: 'test' }
    });
    layer.setDimension(5, 10, 20);
    layer.addFact({ subject: 'A', relation: 'IS_A', object: 'B' });

    const json = layer.toJSON();
    const restored = TheoryLayer.fromJSON(json);

    if (restored.id !== 'roundtrip') throw new Error('ID not preserved');
    if (restored.priority !== 3) throw new Error('Priority not preserved');
    if (!restored.covers(5)) throw new Error('Mask not preserved');
    if (restored.facts.length !== 1) throw new Error('Facts not preserved');
  });

  // ======= TheoryStack Tests =======

  test('TheoryStack: push/pop layers', () => {
    const stack = new TheoryStack({ dimensions: DIMS });

    if (stack.depth() !== 0) throw new Error('Should start empty');

    const layer1 = new TheoryLayer(DIMS, { id: 'layer1' });
    const layer2 = new TheoryLayer(DIMS, { id: 'layer2' });

    stack.push(layer1);
    if (stack.depth() !== 1) throw new Error('Depth should be 1');

    stack.push(layer2);
    if (stack.depth() !== 2) throw new Error('Depth should be 2');

    const popped = stack.pop();
    if (popped.id !== 'layer2') throw new Error('Should pop layer2');
    if (stack.depth() !== 1) throw new Error('Depth should be 1 after pop');
  });

  test('TheoryStack: compose() applies layers to diamond', () => {
    const stack = new TheoryStack({ dimensions: DIMS });

    const baseDiamond = new BoundedDiamond('base', 'Base', DIMS);
    baseDiamond.minValues[0] = 0;
    baseDiamond.maxValues[0] = 100;

    // Layer 1: override dim 0
    const layer1 = new TheoryLayer(DIMS, { id: 'l1', priority: 1 });
    layer1.setDimension(0, 50, 80);

    // Layer 2: override dim 1
    const layer2 = new TheoryLayer(DIMS, { id: 'l2', priority: 2 });
    layer2.setDimension(1, 10, 30);

    stack.push(layer1);
    stack.push(layer2);

    const composed = stack.compose(baseDiamond);

    if (composed.minValues[0] !== 50) throw new Error('Layer1 override not applied');
    if (composed.maxValues[0] !== 80) throw new Error('Layer1 override not applied');
    if (composed.minValues[1] !== 10) throw new Error('Layer2 override not applied');
  });

  test('TheoryStack: conflicts() detects empty intersection', () => {
    const stack = new TheoryStack({ dimensions: DIMS });

    const layer1 = new TheoryLayer(DIMS, { id: 'conflict1' });
    layer1.setDimension(0, 0, 10);

    const layer2 = new TheoryLayer(DIMS, { id: 'conflict2' });
    layer2.setDimension(0, 50, 60); // Non-overlapping!

    stack.push(layer1);
    stack.push(layer2);

    const baseDiamond = new BoundedDiamond('base', 'Base', DIMS);
    const report = stack.conflicts(baseDiamond);

    if (!report.hasConflicts) throw new Error('Should detect conflicts');
    if (report.layerConflicts.length === 0) throw new Error('Should have layer conflicts');
  });

  test('TheoryStack: snapshot() and restore()', () => {
    const stack = new TheoryStack({ dimensions: DIMS });

    const layer = new TheoryLayer(DIMS, { id: 'snap_layer', priority: 5 });
    stack.push(layer);

    const snap = stack.snapshot();
    if (snap.layerCount !== 1) throw new Error('Wrong layer count');

    stack.clear();
    if (stack.depth() !== 0) throw new Error('Should be empty after clear');

    stack.restore(snap);
    if (stack.depth() !== 1) throw new Error('Should have 1 layer after restore');

    const restored = stack.getActiveLayers()[0];
    if (restored.id !== 'snap_layer') throw new Error('Wrong layer restored');
  });

  test('TheoryStack: pushContext/popContext for nested counterfactuals', () => {
    const stack = new TheoryStack({ dimensions: DIMS });

    const layer1 = new TheoryLayer(DIMS, { id: 'base_layer' });
    stack.push(layer1);

    // Save context
    stack.pushContext('cf1');
    if (stack.depth() !== 1) throw new Error('Depth should still be 1');

    // Add counterfactual layer
    const cfLayer = new TheoryLayer(DIMS, { id: 'counterfactual' });
    stack.push(cfLayer);
    if (stack.depth() !== 2) throw new Error('Depth should be 2');

    // Restore context
    stack.popContext();
    if (stack.depth() !== 1) throw new Error('Depth should be 1 after restore');

    const layers = stack.getActiveLayers();
    if (layers[0].id !== 'base_layer') throw new Error('Wrong layer after restore');
  });

  // ======= Reasoner Integration Tests =======

  test('Reasoner: composeConcept uses TheoryStack', () => {
    const store = new ConceptStore(DIMS);

    // Create a concept with a diamond
    const concept = store.ensureConcept('TestConcept');
    const diamond = new BoundedDiamond('test', 'TestConcept', DIMS);
    diamond.minValues[0] = 0;
    diamond.maxValues[0] = 50;
    concept.diamonds = [diamond];

    const stack = new TheoryStack({ dimensions: DIMS });
    const layer = new TheoryLayer(DIMS, { id: 'test_override' });
    layer.setDimension(0, 100, 127);
    stack.push(layer);

    const reasoner = new Reasoner({ store, stack });
    const composed = reasoner.composeConcept('TestConcept', stack);

    if (composed.minValues[0] !== 100) throw new Error('Stack not applied by Reasoner');
    if (composed.maxValues[0] !== 127) throw new Error('Stack not applied by Reasoner');
  });

  test('Reasoner: composeConcept without stack returns base', () => {
    const store = new ConceptStore(DIMS);

    const concept = store.ensureConcept('BaseConcept');
    const diamond = new BoundedDiamond('base', 'BaseConcept', DIMS);
    diamond.minValues[0] = 10;
    diamond.maxValues[0] = 20;
    concept.diamonds = [diamond];

    const reasoner = new Reasoner({ store });
    const composed = reasoner.composeConcept('BaseConcept', null);

    if (composed.minValues[0] !== 10) throw new Error('Base not returned');
    if (composed.maxValues[0] !== 20) throw new Error('Base not returned');
  });

  test('Reasoner: composeConcept with array of layers', () => {
    const store = new ConceptStore(DIMS);

    const concept = store.ensureConcept('ArrayTest');
    const diamond = new BoundedDiamond('arr', 'ArrayTest', DIMS);
    diamond.minValues[0] = 0;
    concept.diamonds = [diamond];

    const layer1 = new TheoryLayer(DIMS, { id: 'arr1' });
    layer1.setDimension(0, 50, 60);

    const reasoner = new Reasoner({ store });
    const composed = reasoner.composeConcept('ArrayTest', [layer1]);

    if (composed.minValues[0] !== 50) throw new Error('Array layer not applied');
  });

  // ======= Report =======

  return {
    ok: results.failed === 0,
    passed: results.passed,
    failed: results.failed,
    total: results.total,
    errors: results.errors
  };
}

module.exports = { run };

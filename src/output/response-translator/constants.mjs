export const META_OPERATORS = [
  'abduce', 'whatif', 'similar', 'analogy', 'symbolic_analogy',
  'property_analogy', 'difference', 'induce', 'bundle', 'deduce',
  'explain'
];

export const RESERVED_SYMBOLS = new Set([
  'ForAll', 'And', 'Or', 'Not', 'Implies', 'Exists',
  'isA', 'has', 'can', 'must', 'causes', 'implies',
  'true', 'false',
  'yes', 'no'
]);

export const RELIABLE_METHODS = new Set([
  'direct',
  'symbolic',
  'transitive',
  'property_inheritance',
  'rule_derived',
  'symbolic_supplement',
  'macro',
  'theory'
]);

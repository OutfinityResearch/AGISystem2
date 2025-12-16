/**
 * Debug script for FSP binding issues
 */

import { fractalSemanticStrategy } from './src/hdc/strategies/fractal-semantic.mjs';

const { createRandom, bind, similarity } = fractalSemanticStrategy;

console.log('=== FSP Debug Script ===\n');

// Create small vectors for debugging
const v1 = createRandom(10, 42);
const v2 = createRandom(10, 43);

console.log('v1:', v1.toArray());
console.log('v2:', v2.toArray());
console.log('v1 size:', v1.size());
console.log('v2 size:', v2.size());

// Test binding
const bound = bind(v1, v2);
console.log('\nBound result:', bound.toArray());
console.log('Bound size:', bound.size());

// Test self-inverse
const unbound = bind(bound, v2);
console.log('\nUnbound result:', unbound.toArray());
console.log('Unbound size:', unbound.size());

// Test similarity
const sim1 = similarity(v1, unbound);
const sim2 = similarity(v1, v2);

console.log('\nSimilarities:');
console.log('similarity(v1, unbound):', sim1);
console.log('similarity(v1, v2):', sim2);

// Test with even smaller vectors
console.log('\n=== Testing with size 5 ===');
const small1 = createRandom(5, 42);
const small2 = createRandom(5, 43);

console.log('small1:', small1.toArray());
console.log('small2:', small2.toArray());

const boundSmall = bind(small1, small2);
console.log('boundSmall:', boundSmall.toArray());

const unboundSmall = bind(boundSmall, small2);
console.log('unboundSmall:', unboundSmall.toArray());

const simSmall = similarity(small1, unboundSmall);
console.log('similarity(small1, unboundSmall):', simSmall);

// Test commutative property
console.log('\n=== Testing commutative property ===');
const comm1 = bind(small1, small2);
const comm2 = bind(small2, small1);

console.log('bind(a,b):', comm1.toArray());
console.log('bind(b,a):', comm2.toArray());

const simComm = similarity(comm1, comm2);
console.log('similarity(bind(a,b), bind(b,a)):', simComm);
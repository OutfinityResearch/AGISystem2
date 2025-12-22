/**
 * Suite 14 - Meta-Query Operators (DS17)
 *
 * Stress tests for similar/analogy/difference/induce/bundle operators with
 * overlapping properties, negations, and mixed domains.
 * These cases are intended to drive implementation of DS17 meta-operators.
 */

export const name = 'Meta-Query Operators';
export const description = 'Similar, analogy, difference, induce, bundle with ranked answers and traces';

export const theories = ['05-logic.sys2', 'Geography/01-relations.sys2'];

export const steps = [
  // === SETUP: Multi-domain facts with shared/unique properties ===
  {
    action: 'learn',
    input_nl: 'Vehicles, animals, tools with overlapping properties for similarity/analogy; capitals for analogies.',
    input_dsl: `
      # Vehicles
      isA Car Vehicle
      has Car Wheels
      has Car Engine
      has Car Seats
      can Car Transport
      isA Truck Vehicle
      has Truck Wheels
      has Truck Engine
      has Truck Bed
      can Truck Transport
      can Truck Haul
      isA Bicycle Vehicle
      has Bicycle Wheels
      has Bicycle Pedals
      can Bicycle Transport
      Difference Truck Car
      Difference Car Bicycle

      # Birds and fish
      isA Bird Animal
      can Bird Fly
      has Bird Wings
      isA Sparrow Bird
      has Sparrow Beak
      can Sparrow Chirp
      isA Hawk Bird
      can Hawk Hunt
      can Hawk Fly
      isA Fish Animal
      can Fish Swim
      has Fish Gills
      isA Trout Fish
      has Trout Spots

      # Tools
      isA Hammer Tool
      has Hammer Handle
      has Hammer Head
      isA Mallet Tool
      has Mallet Handle
      has Mallet Head
      isA Screwdriver Tool
      has Screwdriver Handle
      has Screwdriver Tip
      has Screwdriver Shaft
      can Hammer Pound
      can Mallet Pound
      can Screwdriver Turn

      # Capitals for analogies
      isA Paris City
      isA Berlin City
      isA France Country
      isA Germany Country
      isCapitalOf Paris France
      isCapitalOf Berlin Germany
    `,
    expected_nl: 'Learned 50 facts'
  },

  // === SIMILAR: Hammer with ranked neighbor Mallet (tools) ===
  {
    action: 'query',
    input_nl: 'What is similar to a Hammer?',
    input_dsl: '@q similar Hammer ?entity',
    expected_nl: [
      'Mallet is similar to Hammer.',
      'Screwdriver is similar to Hammer.'
    ],
    proof_nl: [
      'shared Tool, Handle, Head, and Pound',
      'shared Tool and Handle'
    ]
  },

  // === SIMILAR: Car with ranked neighbors ===
  {
    action: 'query',
    input_nl: 'What is similar to a Car?',
    input_dsl: '@q similar Car ?entity',
    expected_nl: [
      'Truck is similar to Car.',
      'Bicycle is similar to Car.'
    ],
    proof_nl: [
      'shared Vehicle, Wheels, Engine, and Transport',
      'shared Vehicle, Wheels, and Transport'
    ]
  },

  // === SIMILAR: Sparrow vs Hawk (shared bird props) ===
  {
    action: 'query',
    input_nl: 'What is similar to a Sparrow?',
    input_dsl: '@q similar Sparrow ?entity',
    expected_nl: [
      'Hawk is similar to Sparrow.'
    ],
    proof_nl: [
      'shared Bird'
    ]
  },

  // === ANALOGY: Truck:Haul :: Bicycle:? (transport ability) ===
  {
    action: 'query',
    input_nl: 'Truck is to Haul as Bicycle is to what?',
    input_dsl: '@q analogy Truck Haul Bicycle ?ability',
    expected_nl: [
      'Truck is to Haul as Bicycle is to Transport.'
    ],
    proof_nl: [
      'Truck can Haul maps to Bicycle can Transport'
    ]
  },

  // === ANALOGY: Capital:Country pattern (Paris isCapitalOf France)
  {
    action: 'query',
    input_nl: 'Paris is to France as Berlin is to what?',
    input_dsl: '@q analogy Paris France Berlin ?answer',
    expected_nl: [
      'Paris is to France as Berlin is to Germany.'
    ],
    proof_nl: [
      'Paris isCapitalOf France maps to Berlin isCapitalOf Germany'
    ]
  },

  // === ANALOGY: Bird:Fly :: Fish:? ===
  {
    action: 'query',
    input_nl: 'Bird is to Fly as Fish is to what?',
    input_dsl: '@q analogy Bird Fly Fish ?ability',
    expected_nl: [
      'Bird is to Fly as Fish is to Swim.'
    ],
    proof_nl: [
      'Bird can Fly maps to Fish can Swim'
    ]
  },

  // === DIFFERENCE: Car vs Truck (highlight unique props) ===
  {
    action: 'query',
    input_nl: 'What distinguishes a Car from a Truck?',
    input_dsl: '@q difference Car Truck ?feature',
    expected_nl: [
      'Car differs from Truck.'
    ],
    proof_nl: [
      'Car has Seats. Truck has Bed and Haul.'
    ]
  },

  // === DIFFERENCE: Hammer vs Screwdriver ===
  {
    action: 'query',
    input_nl: 'What distinguishes a Hammer from a Screwdriver?',
    input_dsl: '@q difference Hammer Screwdriver ?feature',
    expected_nl: [
      'Hammer differs from Screwdriver.'
    ],
    proof_nl: [
      'Hammer has Head and Pound. Screwdriver has Tip, Shaft, and Turn.'
    ]
  },

  // === DIFFERENCE: Car vs Bicycle (engine vs pedals) ===
  {
    action: 'query',
    input_nl: 'What distinguishes a Car from a Bicycle?',
    input_dsl: '@q difference Car Bicycle ?feature',
    expected_nl: [
      'Car differs from Bicycle.'
    ],
    proof_nl: [
      'Car has Engine and Seats. Bicycle has Pedals.'
    ]
  },

  // === BUNDLE: Composite bird pattern should preserve Fly ===
  {
    action: 'query',
    input_nl: 'Bundle Sparrow and Hawk: what can the bundle do?',
    input_dsl: '@q bundle Sparrow Hawk ?ability',
    expected_nl: [
      'Sparrow and Hawk combined have Bird, Beak, Chirp, Hunt, and Fly.'
    ],
    proof_nl: [
      'union of Sparrow and Hawk properties'
    ]
  },

  // === INDUCE: Fish vs Trout (no direct common properties, only inheritance) ===
  {
    action: 'query',
    input_nl: 'Induce common properties of Fish and Trout.',
    input_dsl: '@q induce Fish Trout ?property',
    expected_nl: [
      'Fish and Trout have no common properties.'
    ],
    proof_nl: [
      'empty intersection'
    ]
  },

  // === INDUCE: Common bird properties (deeper intersection) ===
  {
    action: 'query',
    input_nl: 'Induce common properties of Sparrow and Hawk.',
    input_dsl: '@q induce Sparrow Hawk ?property',
    expected_nl: [
      'Sparrow and Hawk share Bird.'
    ],
    proof_nl: [
      'intersection of Sparrow and Hawk properties'
    ]
  },

  // === ANALOGY DEEP: Car:Engine :: Bicycle:? (property-based, multiple answers) ===
  {
    action: 'query',
    input_nl: 'Car is to Engine as Bicycle is to what?',
    input_dsl: '@q analogy Car Engine Bicycle ?part',
    expected_nl: [
      'Car is to Engine as Bicycle is to Wheels.',
      'Car is to Engine as Bicycle is to Pedals.'
    ],
    proof_nl: [
      'Car has Engine maps to Bicycle has Wheels',
      'Car has Engine maps to Bicycle has Pedals'
    ]
  },

  // === BUNDLE DEEP: Bundle vehicles Car, Truck, Bicycle then look for shared ===
  {
    action: 'query',
    input_nl: 'Bundle vehicles Car, Truck, Bicycle: what properties remain shared?',
    input_dsl: '@q bundle Car Truck Bicycle ?vehicleProp',
    expected_nl: [
      'Car, Truck, and Bicycle combined have Vehicle, Wheels, Engine, Seats, Transport, Bed, Haul, and Pedals.'
    ],
    proof_nl: [
      'union of Car, Truck, and Bicycle properties'
    ]
  },

  // === NEGATIVE SIMILAR: Unknown entity produces no results but clear trace ===
  {
    action: 'query',
    input_nl: 'What is similar to QuarkX?',
    input_dsl: '@q similar QuarkX ?entity',
    expected_nl: [
      'No results'
    ],
    proof_nl: [
      'No results'
    ]
  }
];

export default { name, description, theories, steps };

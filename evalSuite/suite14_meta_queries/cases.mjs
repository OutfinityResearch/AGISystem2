/**
 * Suite 14 - Meta-Query Operators (DS17)
 *
 * Stress tests for similar/analogy/difference/induce/bundle operators with
 * overlapping properties, negations, and mixed domains.
 * These cases are intended to drive implementation of DS17 meta-operators.
 */

export const name = 'Meta-Query Operators';
export const description = 'Similar, analogy, difference, induce, bundle with ranked answers and traces';

export const theories = ['05-logic.sys2'];

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
    expected_nl: 'Learned 46 facts'
  },

  // === SIMILAR: Hammer with ranked neighbor Mallet (tools) ===
  {
    action: 'query',
    input_nl: 'What is similar to a Hammer?',
    input_dsl: '@q similar Hammer ?entity',
    expected_nl: 'Answer: Mallet. Proof: Hammer and Mallet share Handle, Head, and Pound capability; Screwdriver rejected due to Tip/Shaft/Turn.'
  },

  // === SIMILAR: Car with ranked neighbors ===
  {
    action: 'query',
    input_nl: 'What is similar to a Car?',
    input_dsl: '@q similar Car ?entity',
    expected_nl: 'Answer: Truck. Bicycle. Proof: Car shares Wheels/Engine/Transport with Truck; shares Wheels/Transport with Bicycle; ranked by overlap.'
  },

  // === SIMILAR: Sparrow vs Hawk (shared bird props) ===
  {
    action: 'query',
    input_nl: 'What is similar to a Sparrow?',
    input_dsl: '@q similar Sparrow ?entity',
    expected_nl: 'Answer: Hawk. Proof: Sparrow and Hawk share Bird, Wings, Fly; Hawk adds Hunt so still closest neighbor.'
  },

  // === ANALOGY: Truck:Haul :: Bicycle:? (transport ability) ===
  {
    action: 'query',
    input_nl: 'Truck is to Haul as Bicycle is to what?',
    input_dsl: '@q analogy Truck Haul Bicycle ?ability',
    expected_nl: 'Answer: Transport. Proof: Analogy maps vehicle→capability (Haul); Bicycle closest capability is Transport.'
  },

  // === ANALOGY: Country:Capital pattern ===
  {
    action: 'query',
    input_nl: 'France is to Paris as Germany is to what?',
    input_dsl: '@q analogy France Paris Germany ?answer',
    expected_nl: 'Answer: Berlin. Proof: Paris isCapitalOf France; Berlin isCapitalOf Germany.'
  },

  // === ANALOGY: Bird:Fly :: Fish:? ===
  {
    action: 'query',
    input_nl: 'Bird is to Fly as Fish is to what?',
    input_dsl: '@q analogy Bird Fly Fish ?ability',
    expected_nl: 'Answer: Swim. Proof: Bird primary ability Fly; Fish primary ability Swim.'
  },

  // === DIFFERENCE: Car vs Truck (highlight unique props) ===
  {
    action: 'query',
    input_nl: 'What distinguishes a Car from a Truck?',
    input_dsl: '@q difference Car Truck ?feature',
    expected_nl: 'Answer: Bed. Haul. Proof: Truck-only Bed/Haul vs shared Wheels/Engine/Transport.'
  },

  // === DIFFERENCE: Hammer vs Screwdriver ===
  {
    action: 'query',
    input_nl: 'What distinguishes a Hammer from a Screwdriver?',
    input_dsl: '@q difference Hammer Screwdriver ?feature',
    expected_nl: 'Answer: Head. Tip. Proof: Hammer has Head/Pound; Screwdriver has Tip/Shaft/Turn; shared Handle filtered.'
  },

  // === DIFFERENCE: Car vs Bicycle (engine vs pedals) ===
  {
    action: 'query',
    input_nl: 'What distinguishes a Car from a Bicycle?',
    input_dsl: '@q difference Car Bicycle ?feature',
    expected_nl: 'Answer: Engine. Seats. Pedals. Proof: Car-only Engine/Seats vs Bicycle-only Pedals; both share Wheels/Transport.'
  },

  // === BUNDLE: Composite bird pattern should preserve Fly ===
  {
    action: 'query',
    input_nl: 'Bundle Sparrow and Hawk: what can the bundle do?',
    input_dsl: '@q bundle Sparrow Hawk ?ability',
    expected_nl: 'Answer: Fly. Hunt. Proof: Bundle retains shared Fly and Hawk-contributed Hunt.'
  },

  // === INDUCE: Common mammal-like properties across fish? (should be empty) ===
  {
    action: 'query',
    input_nl: 'Induce common properties of Fish and Trout.',
    input_dsl: '@q induce Fish Trout ?property',
    expected_nl: 'Answer: Gills. Swim. Proof: Intersection of Fish and Trout properties.'
  },

  // === INDUCE: Common bird properties (deeper intersection) ===
  {
    action: 'query',
    input_nl: 'Induce common properties of Sparrow and Hawk.',
    input_dsl: '@q induce Sparrow Hawk ?property',
    expected_nl: 'Answer: Wings. Fly. Proof: Intersection of Sparrow and Hawk properties; Hunt/Chirp excluded.'
  },

  // === ANALOGY DEEP: Car:Engine :: Bicycle:? (uses difference signal) ===
  {
    action: 'query',
    input_nl: 'Car is to Engine as Bicycle is to what?',
    input_dsl: '@q analogy Car Engine Bicycle ?part',
    expected_nl: 'Answer: Pedals. Proof: Engine is unique to Car among vehicles; Pedals unique to Bicycle.'
  },

  // === BUNDLE DEEP: Bundle vehicles Car, Truck, Bicycle then look for shared ===
  {
    action: 'query',
    input_nl: 'Bundle vehicles Car, Truck, Bicycle: what properties remain shared?',
    input_dsl: '@q bundle Car Truck Bicycle ?vehicleProp',
    expected_nl: 'Answer: Wheels. Transport. Proof: Bundle keeps common vehicle features; other props average out.'
  },

  // === NEGATIVE SIMILAR: Unknown entity produces no results but clear trace ===
  {
    action: 'query',
    input_nl: 'What is similar to QuarkX?',
    input_dsl: '@q similar QuarkX ?entity',
    expected_nl: 'Cannot find similar entities for QuarkX.'
  }
];

export default { name, description, theories, steps };

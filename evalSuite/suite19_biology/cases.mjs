/**
 * Suite 19 - Simplified Biological Pathways
 *
 * Models taxonomy, cellular respiration, and metabolic causation with
 * multi-step proofs and queries.
 */

export const name = 'Biological Pathways';
export const description = 'Taxonomy + metabolism + causal chains with proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Taxonomy and pathways ===
  {
    action: 'learn',
    input_nl: 'Define animal taxonomy, cellular structures, and a respiration pathway.',
    input_dsl: `
      # Taxonomy
      isA Mammal Animal
      isA Human Mammal
      isA Cell Eukaryote
      isA Eukaryote Organism

      # Structures and abilities
      has Human Cell
      has Cell Mitochondria
      can Mitochondria Respire
      can Human ConsumeGlucose

      # Respiration pathway
      causes Glucose Glycolysis
      causes Glycolysis Pyruvate
      causes Pyruvate KrebsCycle
      causes KrebsCycle NADH
      causes NADH ElectronTransport
      causes ElectronTransport ATP

      # Rule: If cell has mitochondria and is eukaryote -> can Respire
      @c1 has ?c Mitochondria
      @c2 isA ?c Eukaryote
      @cond And $c1 $c2
      @respRule implies $cond (can ?c Respire)

      # Rule: If organism has cell that can respire -> organism can Respire
      @c3 has ?org ?cell
      @c4 can ?cell Respire
      @cond2 And $c3 $c4
      @orgResp implies $cond2 (can ?org Respire)
    `,
    expected_nl: 'Learned 22 facts'
  },

  // === PROVE: Respiration chain from mitochondria rule ===
  {
    action: 'prove',
    input_nl: 'Can Human respire?',
    input_dsl: '@goal can Human Respire',
    expected_nl: 'True: Human can Respire. Proof: Human has Cell. Cell has Mitochondria. Cell isA Eukaryote. Rule: has ?c Mitochondria AND isA ?c Eukaryote implies can ?c Respire. Therefore Cell can Respire. Rule: has ?org ?cell AND can ?cell Respire implies can ?org Respire. Therefore Human can Respire.'
  },

  // === PROVE: ATP production chain ===
  {
    action: 'prove',
    input_nl: 'Does consuming glucose produce ATP?',
    input_dsl: '@goal causes Glucose ATP',
    expected_nl: 'True: Glucose causes ATP. Proof: Glucose causes Glycolysis. Glycolysis causes Pyruvate. Pyruvate causes KrebsCycle. KrebsCycle causes NADH. NADH causes ElectronTransport. ElectronTransport causes ATP. Transitive chain verified (5 hops). Therefore Glucose causes ATP.'
  },

  // === QUERY: What steps lead from Glucose to ElectronTransport? ===
  {
    action: 'query',
    input_nl: 'List the causal path from Glucose to ElectronTransport.',
    input_dsl: '@q causes Glucose ?stage',
    expected_nl: 'Answer: Glycolysis. Pyruvate. KrebsCycle. NADH. ElectronTransport. Proof: Glucose causes Glycolysis -> Pyruvate -> KrebsCycle -> NADH -> ElectronTransport.'
  },

  // === NEGATIVE: Respiration without mitochondria blocked ===
  {
    action: 'prove',
    input_nl: 'Can a Prokaryote respire via mitochondria?',
    input_dsl: '@goal can Prokaryote Respire',
    expected_nl: 'Cannot prove: Prokaryote can Respire. Search: Rule requires has ?c Mitochondria and isA ?c Eukaryote; Prokaryote lacks Mitochondria and Eukaryote type. No path found.'
  },

  // === SETUP 2: Immune response and severity with conjunction ===
  {
    action: 'learn',
    input_nl: 'Add immune cascade and severity rule for VirusX with risk factors.',
    input_dsl: `
      causes VirusX CytokineStorm
      causes CytokineStorm OrganFailure
      has Human RiskFactor
      causes VirusX Infection

      @s1 has ?host RiskFactor
      @s2 causes VirusX Infection
      @sCond And $s1 $s2
      @sevRule implies $sCond (causes VirusX SevereOutcome)

      causes SevereOutcome OrganFailure

      # Inhibition: DrugD prevents ElectronTransport
      @negET causes DrugD ElectronTransport
      Not $negET
    `,
    expected_nl: 'Learned 8 facts'
  },

  // === PROVE: VirusX causes OrganFailure via immune cascade ===
  {
    action: 'prove',
    input_nl: 'Does VirusX lead to organ failure for a high-risk human?',
    input_dsl: '@goal causes VirusX OrganFailure',
    expected_nl: 'True: VirusX causes OrganFailure. Proof: VirusX causes Infection. Human has RiskFactor. And condition satisfied; rule implies VirusX causes SevereOutcome. SevereOutcome causes OrganFailure. Transitive chain verified (1 hops). Therefore VirusX causes OrganFailure.'
  },

  // === PROVE: DrugD cannot cause ElectronTransport (negation) ===
  {
    action: 'prove',
    input_nl: 'Does DrugD cause ElectronTransport?',
    input_dsl: '@goal causes DrugD ElectronTransport',
    expected_nl: 'Cannot prove: DrugD causes ElectronTransport. Search: Explicit Not(causes DrugD ElectronTransport) present; negation blocks inference.'
  }
];

export default { name, description, theories, steps };

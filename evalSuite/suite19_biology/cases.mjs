/**
 * Suite 19 - Simplified Biological Pathways
 *
 * Models taxonomy, cellular respiration, and metabolic causation.
 * Uses correct DS02 syntax with @var references for And conditions.
 */

export const name = 'Biological Pathways';
export const description = 'Taxonomy + metabolism + causal chains with proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Taxonomy and respiration pathway ===
  {
    action: 'learn',
    input_nl: 'Define animal taxonomy, cellular structures, and respiration pathway.',
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

      # Respiration pathway (6 steps)
      causes Glucose Glycolysis
      causes Glycolysis Pyruvate
      causes Pyruvate KrebsCycle
      causes KrebsCycle NADH
      causes NADH ElectronTransport
      causes ElectronTransport ATP
    `,
    expected_nl: 'Learned 13 facts'
  },

  {
    action: 'learn',
    input_nl: 'Add respiration rules with And conditions.',
    input_dsl: `
      # Rule: cell with mitochondria AND eukaryote can respire
      @r1c1 has ?c Mitochondria
      @r1c2 isA ?c Eukaryote
      @r1cond And $r1c1 $r1c2
      @r1conseq can ?c Respire
      implies $r1cond $r1conseq

      # Rule: organism with cell that can respire -> organism can respire
      @r2c1 has ?org ?cell
      @r2c2 can ?cell Respire
      @r2cond And $r2c1 $r2c2
      @r2conseq can ?org Respire
      implies $r2cond $r2conseq
    `,
    expected_nl: 'Learned 10 facts'
  },

  // === PROVE: Cell can respire via rule ===
  {
    action: 'prove',
    input_nl: 'Can Cell respire?',
    input_dsl: '@goal can Cell Respire',
    expected_nl: 'True: Cell can Respire. Proof: has Cell Mitochondria. isA Cell Eukaryote. And condition satisfied. Rule implies can Cell Respire.'
  },

  // === PROVE: Human can respire via chain ===
  {
    action: 'prove',
    input_nl: 'Can Human respire?',
    input_dsl: '@goal can Human Respire',
    expected_nl: 'True: Human can Respire. Proof: has Human Cell. can Cell Respire. And condition satisfied. Rule implies can Human Respire.'
  },

  // === PROVE: ATP production via causal chain ===
  {
    action: 'prove',
    input_nl: 'Does glucose cause ATP production?',
    input_dsl: '@goal causes Glucose ATP',
    expected_nl: 'True: Glucose causes ATP. Proof: causes Glucose Glycolysis. causes Glycolysis Pyruvate. causes Pyruvate KrebsCycle. causes KrebsCycle NADH. causes NADH ElectronTransport. causes ElectronTransport ATP. Transitive chain (6 hops).'
  },

  // === QUERY: What does glucose cause? ===
  {
    action: 'query',
    input_nl: 'What does glucose cause in the pathway?',
    input_dsl: '@q causes Glucose ?stage',
    expected_nl: 'Glucose causes Glycolysis. Glucose causes Pyruvate. Glucose causes KrebsCycle. Glucose causes NADH. Glucose causes ElectronTransport. Glucose causes ATP. Proof: Transitive closure of causes chain.'
  },

  // === NEGATIVE: Prokaryote cannot respire (missing conditions) ===
  {
    action: 'prove',
    input_nl: 'Can Prokaryote respire?',
    input_dsl: '@goal can Prokaryote Respire',
    expected_nl: 'Cannot prove: Prokaryote can Respire. Search: No has Prokaryote Mitochondria. And condition not satisfied. No applicable rules.'
  },

  // === SETUP 2: Virus severity rule ===
  {
    action: 'learn',
    input_nl: 'Add virus severity rule with risk factors.',
    input_dsl: `
      causes VirusX CytokineStorm
      causes CytokineStorm OrganFailure
      has Human RiskFactor
      causes VirusX Infection

      # Rule: host with risk factor AND virus infection -> severe outcome
      @sev1 has ?host RiskFactor
      @sev2 causes VirusX Infection
      @sevCond And $sev1 $sev2
      @sevConseq causes VirusX SevereOutcome
      implies $sevCond $sevConseq

      causes SevereOutcome OrganFailure

      # Negation: DrugD blocks ElectronTransport
      @negET causes DrugD ElectronTransport
      Not $negET
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === PROVE: VirusX causes organ failure via severity ===
  {
    action: 'prove',
    input_nl: 'Does VirusX cause organ failure?',
    input_dsl: '@goal causes VirusX OrganFailure',
    expected_nl: 'True: VirusX causes OrganFailure. Proof: has Human RiskFactor. causes VirusX Infection. And satisfied. Rule implies causes VirusX SevereOutcome. causes SevereOutcome OrganFailure. Transitive chain.'
  },

  // === NEGATIVE: DrugD blocked by negation ===
  {
    action: 'prove',
    input_nl: 'Does DrugD cause ElectronTransport?',
    input_dsl: '@goal causes DrugD ElectronTransport',
    expected_nl: 'Cannot prove: DrugD causes ElectronTransport. Search: Found Not(causes DrugD ElectronTransport). Negation blocks inference.'
  }
];

export default { name, description, theories, steps };

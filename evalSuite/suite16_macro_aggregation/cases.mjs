/**
 * Suite 16 - Macro Aggregation & Composed Concepts
 *
 * Exercises true Sys2DSL macros that assemble anonymous substructures and
 * materialize only selected facts into the KB. Forces reasoning/proofs over
 * macro-generated concepts and their exposed conclusions.
 *
 * Syntax follows DS02-DSL-Syntax.md:
 * - Macros defined with @Name:export graph params ... end
 * - No parenthesized expressions in implies; use @var references
 * - Anonymous facts (no @) go directly to KB
 */

export const name = 'Macro Aggregation';
export const description = 'Macros that build complex concepts from anonymous facts, then query/prove over outputs.';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Define macros inline and invoke them ===
  {
    action: 'learn',
    input_nl: 'Define earthquakeEvent graph that creates hazard facts and causal chains.',
    input_dsl: `
      # Macro: earthquakeEvent creates hazard with causal/temporal structure
      @EQ:earthquakeEvent graph epicenter magnitude effect
          isA $effect Hazard
          isA $epicenter Epicenter
          @shock causes $epicenter SeismicShock
          @mag magnitude $epicenter $magnitude
          causes $effect InfrastructureDamage
          causes InfrastructureDamage EvacuationNeeded
          before $effect EvacuationStart
          before EvacuationStart ReliefDeployment
          return $effect
      end

      # Invoke graph to create earthquake events
      @eq1 earthquakeEvent CityA 7.5 CityPowerDown
      @eq2 earthquakeEvent CityB 6.8 PortDamage
    `,
    expected_nl: 'Learned 14 facts'
  },

  {
    action: 'learn',
    input_nl: 'Define outbreak graph for virus with infection chains.',
    input_dsl: `
      # Macro: outbreak creates virus with infection causation
      @OB:outbreak graph pathogen r0 location
          isA $pathogen Virus
          isA $pathogen Pathogen
          @r reproductionNumber $pathogen $r0
          affects $pathogen $location
          causes $pathogen Infection
          causes Infection Symptoms
          causes Symptoms Hospitalization
          return $pathogen
      end

      # Invoke macro
      @ob1 outbreak VirusX 2.8 MetroA
      @ob2 outbreak VirusY 1.3 MetroB
    `,
    expected_nl: 'Learned 14 facts'
  },

  {
    action: 'learn',
    input_nl: 'Define disasterResponse graph with obligations and temporal ordering.',
    input_dsl: `
      # Macro: disasterResponse with responder obligations
      @DR:disasterResponse graph hazard responderTeam
          isA $responderTeam Responder
          assigned $responderTeam $hazard
          must $responderTeam Assist
          must $responderTeam Coordinate
          can $responderTeam DeploySupplies
          before Assessment Response
          before Response Recovery
          return $hazard
      end

      # Invoke macro
      @dr1 disasterResponse CityPowerDown TeamAlpha
      @dr2 disasterResponse PortDamage TeamBeta
    `,
    expected_nl: 'Learned 12 facts'
  },

  {
    action: 'learn',
    input_nl: 'Add global causal rules and an implies rule using correct And syntax.',
    input_dsl: `
      # Global causal rules
      causes Hazard SupplyChainDisruption
      causes Hazard PublicPanic
      causes Hospitalization ICUOverload

      # Rule: Virus causing infection implies public health emergency
      # Correct syntax: build condition and consequence separately
      @cond1 causes ?X Infection
      @cond2 isA ?X Virus
      @conj And $cond1 $cond2
      @conseq causes ?X PublicHealthEmergency
      implies $conj $conseq

      # Explicit negation: CityPowerDown not in SafeZone
      @neg1 locatedIn CityPowerDown SafeZone
      Not $neg1
    `,
    expected_nl: 'Learned 10 facts'
  },

  // === PROVE: Hazard chain from earthquake graph output ===
  {
    action: 'prove',
    input_nl: 'Does CityPowerDown cause supply chain disruption?',
    input_dsl: '@goal causes CityPowerDown SupplyChainDisruption',
    expected_nl: 'True: CityPowerDown causes SupplyChainDisruption. Proof: CityPowerDown isA Hazard. Hazard causes SupplyChainDisruption. Transitive via isA inheritance.'
  },

  // === PROVE: Temporal chain from earthquake ===
  {
    action: 'prove',
    input_nl: 'Is CityPowerDown before ReliefDeployment?',
    input_dsl: '@goal before CityPowerDown ReliefDeployment',
    expected_nl: 'True: CityPowerDown is before ReliefDeployment. Proof: before CityPowerDown EvacuationStart. before EvacuationStart ReliefDeployment. Transitive chain (2 hops).'
  },

  // === PROVE: Responder obligation from graph ===
  {
    action: 'prove',
    input_nl: 'Must TeamAlpha assist?',
    input_dsl: '@goal must TeamAlpha Assist',
    expected_nl: 'True: TeamAlpha must Assist. Proof: disasterResponse graph set must TeamAlpha Assist via assigned TeamAlpha CityPowerDown.'
  },

  // === NEGATIVE: Blocked by explicit negation ===
  {
    action: 'prove',
    input_nl: 'Is CityPowerDown in SafeZone?',
    input_dsl: '@goal locatedIn CityPowerDown SafeZone',
    expected_nl: 'Cannot prove: CityPowerDown locatedIn SafeZone. Search: Found Not(locatedIn CityPowerDown SafeZone). Negation blocks inference.'
  },

  // === QUERY: List all hazards ===
  {
    action: 'query',
    input_nl: 'What entities are hazards?',
    input_dsl: '@q isA ?x Hazard',
    expected_nl: 'CityPowerDown is a hazard. PortDamage is a hazard. Proof: earthquakeEvent graph exposed isA CityPowerDown Hazard and isA PortDamage Hazard.'
  },

  // === PROVE: Virus outbreak leads to hospitalization ===
  {
    action: 'prove',
    input_nl: 'Does VirusX cause hospitalization?',
    input_dsl: '@goal causes VirusX Hospitalization',
    expected_nl: 'True: VirusX causes Hospitalization. Proof: VirusX causes Infection. Infection causes Symptoms. Symptoms causes Hospitalization. Transitive chain (3 hops).'
  },

  // === PROVE: Public health emergency via implies rule ===
  {
    action: 'prove',
    input_nl: 'Does VirusX cause a public health emergency?',
    input_dsl: '@goal causes VirusX PublicHealthEmergency',
    expected_nl: 'True: VirusX causes PublicHealthEmergency. Proof: VirusX isA Virus. VirusX causes Infection. And condition satisfied. Rule implies causes VirusX PublicHealthEmergency.'
  },

  // === QUERY: Which hazards cause supply chain disruption? ===
  {
    action: 'query',
    input_nl: 'What causes supply chain disruption?',
    input_dsl: '@q causes ?x SupplyChainDisruption',
    expected_nl: 'Hazard causes SupplyChainDisruption. CityPowerDown causes SupplyChainDisruption. PortDamage causes SupplyChainDisruption. Proof: Direct fact and inheritance via isA Hazard.'
  },

  // === NEGATIVE: VirusY should also trigger (same rule applies) ===
  {
    action: 'prove',
    input_nl: 'Does VirusY cause a public health emergency?',
    input_dsl: '@goal causes VirusY PublicHealthEmergency',
    expected_nl: 'True: VirusY causes PublicHealthEmergency. Proof: VirusY isA Virus. VirusY causes Infection. And condition satisfied. Rule implies causes VirusY PublicHealthEmergency.'
  }
];

export default { name, description, theories, steps };

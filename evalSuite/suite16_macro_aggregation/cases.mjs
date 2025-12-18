/**
 * Suite 16 - Macro Aggregation & Composed Concepts
 *
 * Exercises true Sys2DSL macros that assemble anonymous substructures and
 * materialize only selected facts into the KB. Forces reasoning/proofs over
 * macro-generated concepts and their exposed conclusions.
 */

export const name = 'Macro Aggregation';
export const description = 'Macros that build complex concepts from anonymous facts, then query/prove over outputs.';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Define macros and invoke them (only some facts exposed) ===
  {
    action: 'learn',
    input_nl: 'Define macros for earthquakeEvent, outbreak, disasterResponse, supplyRoute; invoke them and expose only hazards/casualties/shipments.',
    input_dsl: `
      # Define macros (Sys2DSL syntax)
      @Earthquake:earthquakeEvent macro epicenter magnitude effect
          @shock causes $epicenter SeismicShock
          @mag magnitude $epicenter $magnitude
          isA $effect Hazard        # Exposed to KB
          isA $epicenter Epicenter  # Exposed to KB
          return $effect
      end

      @Outbreak:outbreak macro pathogen r0 location
          isA $pathogen Virus       # Exposed to KB
          @r reproductionNumber $pathogen $r0
          @loc affects $pathogen $location
          causes $pathogen Infection
          return $pathogen
      end

      # Invoke macros (should create hazard/virus facts)
      @eq1 earthquakeEvent EpicenterA 7.5 CityPowerDown
      @eq2 earthquakeEvent EpicenterB 6.8 PortDamage
      @ob1 outbreak VirusX 2.8 MetroA
      @ob2 outbreak VirusY 1.3 MetroB
      @dr1 disasterResponse CityPowerDown MetroA
      @sr1 supplyRoute FactoryA HubX CityZ
      @sr2 supplyRoute FactoryB HubY CityZ

      # Global rules applied to exposed facts
      causes Hazard SupplyChainDisruption
      causes Hazard PublicPanic
      causes Infection Hospitalization
      causes Hospitalization ICUOverload
      implies (causes Virus Infection) (causes Virus PublicHealthEmergency)
      # Negation example: Hazard not located in SafeZone
      @neg1 locatedIn CityPowerDown SafeZone
      Not $neg1
    `,
    expected_nl: 'Learned 32 facts'
  },

  // === PROVE: Hazard chain from earthquake macro output ===
  {
    action: 'prove',
    input_nl: 'Does an earthquake imply supply chain disruption? (via exposed Hazard)',
    input_dsl: '@goal causes CityPowerDown SupplyChainDisruption',
    expected_nl: 'True: CityPowerDown causes SupplyChainDisruption. Proof: CityPowerDown is a hazard. Hazard causes SupplyChainDisruption.'
  },

  // === PROVE: Disaster response chain (temporal + obligation) ===
  {
    action: 'prove',
    input_nl: 'Does CityPowerDown trigger relief deployment?',
    input_dsl: '@goal before CityPowerDown ReliefDeployment',
    expected_nl: 'True: CityPowerDown is before ReliefDeployment. Proof: CityPowerDown is before EvacuationStart. EvacuationStart is before ReliefDeployment.'
  },

  {
    action: 'prove',
    input_nl: 'Must the Responder assist in this disaster?',
    input_dsl: '@goal must Responder Assist',
    expected_nl: 'True: Responder must Assist. Proof: disasterResponse sets obligation must Responder Assist.'
  },

  // === NEGATIVE PROVE: Hazard location blocked by explicit negation ===
  {
    action: 'prove',
    input_nl: 'Is CityPowerDown located in SafeZone?',
    input_dsl: '@goal locatedIn CityPowerDown SafeZone',
    expected_nl: 'Cannot prove: CityPowerDown locatedIn SafeZone. Search: Not(locatedIn CityPowerDown SafeZone) present; negation blocks inference.'
  },

  // === QUERY: Which hazards come from earthquake macros? ===
  {
    action: 'query',
    input_nl: 'List hazards produced by earthquakes.',
    input_dsl: '@q isA ?hazard Hazard',
    expected_nl: 'Answer: CityPowerDown. PortDamage. Proof: earthquakeEvent(EpicenterA,7.5,CityPowerDown) and earthquakeEvent(EpicenterB,6.8,PortDamage) exposed Hazard tags.'
  },

  // === PROVE: Virus outbreak leads to hospitalization (macro→rule→chain) ===
  {
    action: 'prove',
    input_nl: 'Does an outbreak of VirusX lead to hospitalization?',
    input_dsl: '@goal causes VirusX Hospitalization',
    expected_nl: 'True: VirusX causes Hospitalization. Proof: VirusX is a Virus. Virus causes Infection. Infection causes Hospitalization. Transitive chain verified (2 hops). Therefore VirusX causes Hospitalization.'
  },

  // === PROVE: Public health emergency via implied rule from macro ===
  {
    action: 'prove',
    input_nl: 'Does a virus outbreak imply a public health emergency?',
    input_dsl: '@goal causes VirusX PublicHealthEmergency',
    expected_nl: 'True: VirusX causes PublicHealthEmergency. Proof: VirusX is a Virus. Rule: causes Virus Infection implies causes Virus PublicHealthEmergency. Therefore VirusX causes PublicHealthEmergency.'
  },

  // === QUERY: Which macro-produced hazards cause supply chain issues? ===
  {
    action: 'query',
    input_nl: 'Which hazards propagate to supply chain disruption?',
    input_dsl: '@q causes ?hazard SupplyChainDisruption',
    expected_nl: 'Answer: Hazard. CityPowerDown. PortDamage. Proof: Hazard causes SupplyChainDisruption; CityPowerDown and PortDamage are Hazards from earthquakeEvent and inherit the causal edge.'
  },

  // === QUERY: Which destinations become fulfilled via supply routes? ===
  {
    action: 'query',
    input_nl: 'Which destinations become fulfilled via supply routes?',
    input_dsl: '@q causes ShipmentReady Fulfilled',
    expected_nl: 'Answer: Fulfilled. Proof: ShipmentReady causes Delivery. Delivery causes Fulfilled.'
  },

  // === PROVE: Supply route temporal chain ===
  {
    action: 'prove',
    input_nl: 'Is ShipmentReady before Fulfilled?',
    input_dsl: '@goal before ShipmentReady Fulfilled',
    expected_nl: 'True: ShipmentReady is before Fulfilled. Proof: ShipmentReady is before Departure. Departure is before Arrival. Arrival is before Fulfilled. Transitive chain verified (3 hops). Therefore ShipmentReady is before Fulfilled.'
  },

  // === NEGATIVE: Outbreak with low R0 should not imply PublicHealthEmergency ===
  {
    action: 'prove',
    input_nl: 'Does VirusY cause a public health emergency?',
    input_dsl: '@goal causes VirusY PublicHealthEmergency',
    expected_nl: 'Cannot prove: VirusY causes PublicHealthEmergency. Search: VirusY is a Virus. Rule requires causes Virus Infection; explicit cause missing for VirusY. No transitive path to PublicHealthEmergency.'
  }
];

export default { name, description, theories, steps };

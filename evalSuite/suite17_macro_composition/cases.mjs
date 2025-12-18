/**
 * Suite 17 - Macro Composition (Sys2DSL semantics)
 *
 * Demonstrates macros that assemble anonymous sub-structures across roles,
 * temporal, causal, and obligations, expose only selected facts to KB,
 * and require proofs/queries over the derived concepts.
 * Expected NL is split into Answer/Proof for query-style cases.
 */

export const name = 'Macro Composition';
export const description = 'Sys2DSL macro execution with hidden internals and explicit proofs over outputs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Invoke missionPlan + manufacturing + serviceContract macros ===
  {
    action: 'learn',
    input_nl: 'Invoke missionPlan, manufacturingBatch, and serviceContract macros; expose only macro outputs and derived rules.',
    input_dsl: `
      # Mission plan (roles + temporal + obligations)
      @mp1 missionPlan TeamAlpha Secure ReactorSite

      # Manufacturing batches (causal + partOf + locatedIn)
      @mfg1 manufacturingBatch SupplierA Steel Beam FactoryNorth
      @mfg2 manufacturingBatch SupplierB Lithium Battery FactorySouth

      # Service contract (modal + before)
      @svc1 serviceContract ProviderX ClientY Maintenance GoldSLA

      # Additional relations/rules for reasoning depth
      isA HQ City
      locatedIn ReactorSite CountryZ
      locatedIn FactoryNorth CountryZ
      locatedIn FactorySouth CountryZ
      before QA ProductReady
      causes ProductReady Exportable
      implies (can ResponseTeam Mobilize) (must ResponseTeam Train)
    `,
    expected_nl: 'Learned 26 facts'
  },

  // === NEGATION: Explicitly block a location assignment ===
  {
    action: 'learn',
    input_nl: 'Add explicit negation: TeamAlpha not located in ReactorSite.',
    input_dsl: `
      @neg_loc locatedIn TeamAlpha ReactorSite
      Not $neg_loc
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PROVE: Mission plan obligations and temporal chain ===
  {
    action: 'prove',
    input_nl: 'Must TeamAlpha coordinate as part of the mission plan?',
    input_dsl: '@goal must TeamAlpha Coordinate',
    expected_nl: 'True: TeamAlpha must Coordinate. Proof: missionPlan sets must TeamAlpha Protect; rule implies must TeamAlpha Coordinate.'
  },

  {
    action: 'prove',
    input_nl: 'Is Deployment before Completion in the mission plan?',
    input_dsl: '@goal before Deployment Completion',
    expected_nl: 'True: Deployment is before Completion. Proof: missionPlan defines Deployment before Completion.'
  },

  // === QUERY: Mission capabilities/obligations ===
  {
    action: 'query',
    input_nl: 'What can and must TeamAlpha do?',
    input_dsl: '@q must TeamAlpha ?duty',
    expected_nl: 'Answer: Protect. Coordinate. Train. Proof: missionPlan sets must Protect; rule implies must Coordinate; can Mobilize implies must Train.'
  },

  // === NEGATIVE PROVE: Location blocked by explicit Not ===
  {
    action: 'prove',
    input_nl: 'Is TeamAlpha located in ReactorSite?',
    input_dsl: '@goal locatedIn TeamAlpha ReactorSite',
    expected_nl: 'Cannot prove: TeamAlpha locatedIn ReactorSite. Search: Explicit Not(locatedIn TeamAlpha ReactorSite) present; negation blocks inference.'
  },

  // === PROVE: Manufacturing causal chain to ProductReady ===
  {
    action: 'prove',
    input_nl: 'Does SupplierA ultimately produce ProductReady?',
    input_dsl: '@goal causes SupplierA ProductReady',
    expected_nl: 'True: SupplierA causes ProductReady. Proof: SupplierA causes Supplies. Supplies causes Production. Production causes QA. QA causes ProductReady. Transitive chain verified (3 hops). Therefore SupplierA causes ProductReady.'
  },

  // === PROVE: ProductReady implies Exportable ===
  {
    action: 'prove',
    input_nl: 'Does QA completion imply exportable goods?',
    input_dsl: '@goal causes QA Exportable',
    expected_nl: 'True: QA causes Exportable. Proof: QA causes ProductReady. ProductReady causes Exportable. Transitive chain verified (1 hops). Therefore QA causes Exportable.'
  },

  // === QUERY: Which products belong to the supply chain? ===
  {
    action: 'query',
    input_nl: 'Which products are part of the supply chain?',
    input_dsl: '@q partOf ?product SupplyChain',
    expected_nl: 'Answer: Beam. Battery. Proof: manufacturingBatch marks Beam and Battery partOf SupplyChain.'
  },

  // === PROVE: Service contract obligations and temporal ordering ===
  {
    action: 'query',
    input_nl: 'What must ProviderX do under the service contract?',
    input_dsl: '@q must ProviderX ?duty',
    expected_nl: 'Answer: Deliver. ProvideAccess. Proof: serviceContract sets must Deliver; rule implies must ProvideAccess.'
  },

  {
    action: 'prove',
    input_nl: 'Is ProviderX delivery before ClientY payment?',
    input_dsl: '@goal before ProviderX Deliver ClientY Pay',
    expected_nl: 'True: ProviderX Deliver is before ClientY Pay. Proof: serviceContract sets before $provider Deliver $client Pay.'
  },

  // === NEGATIVE: Manufacturing without causes path (SupplierB to Exportable?) ===
  {
    action: 'prove',
    input_nl: 'Does SupplierB directly cause Exportable?',
    input_dsl: '@goal causes SupplierB Exportable',
    expected_nl: 'Cannot prove: SupplierB causes Exportable. Search: SupplierB causes Supplies -> Production -> QA -> ProductReady; Exportable requires ProductReady edge; no direct link from SupplierB.'
  }
];

export default { name, description, theories, steps };

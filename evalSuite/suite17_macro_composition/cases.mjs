/**
 * Suite 17 - Macro Composition (Sys2DSL semantics)
 *
 * Demonstrates macros that assemble structures across roles, temporal,
 * causal, and obligations. Uses correct DS02 syntax with @var references.
 */

export const name = 'Macro Composition';
export const description = 'Sys2DSL macro execution with hidden internals and explicit proofs over outputs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Define missionPlan macro and invoke ===
  {
    action: 'learn',
    input_nl: 'Define missionPlan macro with team obligations and temporal structure.',
    input_dsl: `
      # Macro: missionPlan sets up team with obligations and timeline
      @MP:missionPlan macro team objective location
          isA $team ResponseTeam
          locatedIn $team HQ
          can $team Mobilize
          must $team Protect
          assigned $team $objective
          locatedIn $objective $location
          before Deployment Completion
          before Planning Deployment
          causes $objective Safety
          return $objective
      end

      # Rule: team that can mobilize must train (correct And syntax)
      @r1cond can ?T Mobilize
      @r1conseq must ?T Train
      implies $r1cond $r1conseq

      # Rule: team that must protect must also coordinate
      @r2cond must ?T Protect
      @r2conseq must ?T Coordinate
      implies $r2cond $r2conseq

      # Invoke macro
      @mp1 missionPlan TeamAlpha Secure ReactorSite
    `,
    expected_nl: 'Learned 16 facts'
  },

  // === SETUP: Define manufacturingBatch macro ===
  {
    action: 'learn',
    input_nl: 'Define manufacturingBatch macro with supply chain causation.',
    input_dsl: `
      # Macro: manufacturingBatch creates supply chain facts
      @MFG:manufacturingBatch macro supplier material product plant
          isA $supplier Supplier
          isA $plant Factory
          has $supplier $material
          locatedIn $supplier $plant
          causes $supplier Supplies
          causes Supplies Production
          causes Production QA
          causes QA ProductReady
          partOf $product SupplyChain
          return $product
      end

      # Invoke macros
      @mfg1 manufacturingBatch SupplierA Steel Beam FactoryNorth
      @mfg2 manufacturingBatch SupplierB Lithium Battery FactorySouth

      # Additional fact
      causes ProductReady Exportable
    `,
    expected_nl: 'Learned 19 facts'
  },

  // === NEGATION: Block location ===
  {
    action: 'learn',
    input_nl: 'Add explicit negation: TeamAlpha not located in ReactorSite.',
    input_dsl: `
      @neg_loc locatedIn TeamAlpha ReactorSite
      Not $neg_loc
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PROVE: Team obligation from implies rule ===
  {
    action: 'prove',
    input_nl: 'Must TeamAlpha coordinate?',
    input_dsl: '@goal must TeamAlpha Coordinate',
    expected_nl: 'True: TeamAlpha must Coordinate. Proof: must TeamAlpha Protect. Rule: must ?T Protect implies must ?T Coordinate. Therefore must TeamAlpha Coordinate.'
  },

  // === PROVE: Team must train via can Mobilize rule ===
  {
    action: 'prove',
    input_nl: 'Must TeamAlpha train?',
    input_dsl: '@goal must TeamAlpha Train',
    expected_nl: 'True: TeamAlpha must Train. Proof: can TeamAlpha Mobilize. Rule: can ?T Mobilize implies must ?T Train. Therefore must TeamAlpha Train.'
  },

  // === PROVE: Temporal chain ===
  {
    action: 'prove',
    input_nl: 'Is Planning before Completion?',
    input_dsl: '@goal before Planning Completion',
    expected_nl: 'True: Planning is before Completion. Proof: before Planning Deployment. before Deployment Completion. Transitive chain (2 hops).'
  },

  // === NEGATIVE: Location blocked by negation ===
  {
    action: 'prove',
    input_nl: 'Is TeamAlpha located in ReactorSite?',
    input_dsl: '@goal locatedIn TeamAlpha ReactorSite',
    expected_nl: 'Cannot prove: TeamAlpha locatedIn ReactorSite. Search: Found Not(locatedIn TeamAlpha ReactorSite). Negation blocks inference.'
  },

  // === QUERY: What must TeamAlpha do? ===
  {
    action: 'query',
    input_nl: 'What must TeamAlpha do?',
    input_dsl: '@q must TeamAlpha ?duty',
    expected_nl: 'TeamAlpha must Protect. TeamAlpha must Train. TeamAlpha must Coordinate. Proof: Direct fact and derived via implies rules.'
  },

  // === PROVE: Manufacturing causal chain ===
  {
    action: 'prove',
    input_nl: 'Does SupplierA cause ProductReady?',
    input_dsl: '@goal causes SupplierA ProductReady',
    expected_nl: 'True: SupplierA causes ProductReady. Proof: causes SupplierA Supplies. causes Supplies Production. causes Production QA. causes QA ProductReady. Transitive chain (4 hops).'
  },

  // === PROVE: QA to Exportable ===
  {
    action: 'prove',
    input_nl: 'Does QA cause Exportable?',
    input_dsl: '@goal causes QA Exportable',
    expected_nl: 'True: QA causes Exportable. Proof: causes QA ProductReady. causes ProductReady Exportable. Transitive chain (2 hops).'
  },

  // === QUERY: What is part of SupplyChain? ===
  {
    action: 'query',
    input_nl: 'What products are in the supply chain?',
    input_dsl: '@q partOf ?x SupplyChain',
    expected_nl: 'Beam is partOf SupplyChain. Battery is partOf SupplyChain. Proof: manufacturingBatch macro exposed partOf facts.'
  },

  // === PROVE: SupplierB also causes ProductReady (same chain) ===
  {
    action: 'prove',
    input_nl: 'Does SupplierB cause ProductReady?',
    input_dsl: '@goal causes SupplierB ProductReady',
    expected_nl: 'True: SupplierB causes ProductReady. Proof: causes SupplierB Supplies. causes Supplies Production. causes Production QA. causes QA ProductReady. Transitive chain (4 hops).'
  }
];

export default { name, description, theories, steps };

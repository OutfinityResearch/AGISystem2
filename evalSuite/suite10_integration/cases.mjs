/**
 * Suite 10 - Complex Integration
 *
 * Multi-domain reasoning with all operators: isA, has, can, must, causes, before.
 * Tests: cross-domain queries, varied operators, deep mixed chains.
 */

export const name = 'Complex Integration';
export const description = 'Multi-domain with all operators mixed';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Medical + Legal + Temporal domains + Deep chain ===
  {
    action: 'learn',
    input_nl: 'Multi-domain: Medical taxonomy, court hierarchy, temporal sequence, modal abilities, deep biological chain.',
    input_dsl: `
      isA COVID ViralDisease
      isA ViralDisease Infectious
      isA Infectious Disease
      isA Disease MedicalCondition
      hasSymptom Patient1 Fever
      hasSymptom Patient1 Cough
      can DrSmith Prescribe
      can DrSmith Diagnose
      must DrSmith HelpPatients
      isA DistrictCourt TrialCourt
      isA TrialCourt Court
      isA Court LegalBody
      isA LegalBody Institution
      appealsTo DistrictCourt AppealsCourt
      appealsTo AppealsCourt SupremeCourt
      before Arrest Trial
      before Trial Verdict
      before Verdict Sentencing
      causes Crime Investigation
      causes Investigation Arrest
      causes Arrest Trial
      isA Protein Macromolecule
      isA Macromolecule Biomolecule
      isA Biomolecule Compound
      isA Compound Chemical
      isA Chemical Substance
      isA Substance Matter
      isA Hemoglobin Protein
    `,
    expected_nl: 'Learned 28 facts'
  },

  // === PROVE: 4-step medical (COVID->MedicalCondition) ===
  {
    action: 'prove',
    input_nl: 'Is COVID a MedicalCondition?',
    input_dsl: '@goal isA COVID MedicalCondition',
    expected_nl: 'True: COVID is a medicalcondition. Proof: COVID is a viraldisease. ViralDisease is an infectious. Infectious is a disease. Disease is a medicalcondition.'
  },

  // === PROVE: 4-step court (DistrictCourt->Institution) ===
  {
    action: 'prove',
    input_nl: 'Is DistrictCourt an Institution?',
    input_dsl: '@goal isA DistrictCourt Institution',
    expected_nl: 'True: DistrictCourt is an institution. Proof: DistrictCourt is a trialcourt. TrialCourt is a court. Court is a legalbody. LegalBody is an institution.'
  },

  // === PROVE: 3-step temporal (Arrest->Sentencing) ===
  {
    action: 'prove',
    input_nl: 'Is Arrest before Sentencing?',
    input_dsl: '@goal before Arrest Sentencing',
    expected_nl: 'True: Arrest is before Sentencing. Proof: Arrest is before Trial. Trial is before Verdict. Verdict is before Sentencing.'
  },

  // === PROVE: 3-step causal (Crime->Trial) ===
  {
    action: 'prove',
    input_nl: 'Does Crime cause Trial?',
    input_dsl: '@goal causes Crime Trial',
    expected_nl: 'True: Crime causes Trial. Proof: Crime causes Investigation. Investigation causes Arrest. Arrest causes Trial.'
  },

  // === PROVE: Appeal transitive (DistrictCourt->SupremeCourt) ===
  {
    action: 'prove',
    input_nl: 'Does DistrictCourt appeal to SupremeCourt?',
    input_dsl: '@goal appealsTo DistrictCourt SupremeCourt',
    expected_nl: 'True: DistrictCourt appeals to SupremeCourt. Proof: DistrictCourt appeals to AppealsCourt. AppealsCourt appeals to SupremeCourt.'
  },

  // === PROVE: 5-step compound chain (Hemoglobin->Compound) ===
  {
    action: 'prove',
    input_nl: 'Is Hemoglobin a Compound?',
    input_dsl: '@goal isA Hemoglobin Compound',
    expected_nl: 'True: Hemoglobin is a compound'
  },

  // === PROVE: 6-step (Hemoglobin->Substance) ===
  {
    action: 'prove',
    input_nl: 'Is Hemoglobin a Substance?',
    input_dsl: '@goal isA Hemoglobin Substance',
    expected_nl: 'True: Hemoglobin is a substance'
  },

  // === QUERY: Patient symptoms ===
  {
    action: 'query',
    input_nl: 'What symptoms does Patient1 have?',
    input_dsl: '@q hasSymptom Patient1 ?symptom',
    expected_nl: 'Patient1 has Fever. Patient1 has Cough.'
  },

  // === QUERY: What can DrSmith do ===
  {
    action: 'query',
    input_nl: 'What can DrSmith do?',
    input_dsl: '@q can DrSmith ?ability',
    expected_nl: 'DrSmith can Prescribe. DrSmith can Diagnose.'
  },

  // === CROSS-DOMAIN NEGATIVE: Medical vs Legal ===
  {
    action: 'prove',
    input_nl: 'Is COVID a Court?',
    input_dsl: '@goal isA COVID Court',
    expected_nl: 'Cannot prove: COVID is a court'
  },
  {
    action: 'prove',
    input_nl: 'Does Verdict cause COVID?',
    input_dsl: '@goal causes Verdict COVID',
    expected_nl: 'Cannot prove: Verdict causes COVID'
  },

  // === PROVE: 7-step deep biological chain ===
  {
    action: 'prove',
    input_nl: 'Is Hemoglobin Matter? (7-step biological chain)',
    input_dsl: '@goal isA Hemoglobin Matter',
    expected_nl: 'True: Hemoglobin is matter. Proof: Hemoglobin is a protein. Protein is a macromolecule. Macromolecule is a biomolecule. Biomolecule is a compound. Compound is a chemical. Chemical is a substance. Substance is matter.'
  }
];

export default { name, description, theories, steps };

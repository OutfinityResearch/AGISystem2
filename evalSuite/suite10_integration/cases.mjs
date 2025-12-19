/**
 * Suite 10 - Complex Integration (Deep Chains)
 *
 * Multi-domain reasoning with all operators and deep chains.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Complex Integration';
export const description = 'Multi-domain with all operators and deep chains';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Multi-domain with deep hierarchies ===
  {
    action: 'learn',
    input_nl: 'Multi-domain: Deep medical taxonomy (6 levels), deep legal hierarchy (5 levels), causal chains (5 steps), temporal chains (5 steps), deep biological (7 levels).',
    input_dsl: `
      isA COVID ViralDisease
      isA ViralDisease Infectious
      isA Infectious Disease
      isA Disease MedicalCondition
      isA MedicalCondition HealthIssue
      isA HealthIssue Problem
      hasSymptom Patient1 Fever
      hasSymptom Patient1 Cough
      hasSymptom Patient1 Fatigue
      can DrSmith Prescribe
      can DrSmith Diagnose
      must DrSmith HelpPatients
      isA DistrictCourt TrialCourt
      isA TrialCourt LowerCourt
      isA LowerCourt Court
      isA Court LegalBody
      isA LegalBody Institution
      isA Institution Organization
      appealsTo DistrictCourt AppealsCourt
      appealsTo AppealsCourt SupremeCourt
      before Complaint Filing
      before Filing Investigation
      before Investigation Arrest
      before Arrest Trial
      before Trial Verdict
      before Verdict Sentencing
      causes Crime Investigation
      causes Investigation Evidence
      causes Evidence Arrest
      causes Arrest Prosecution
      causes Prosecution Trial
      isA Hemoglobin Protein
      isA Protein Macromolecule
      isA Macromolecule Biomolecule
      isA Biomolecule OrganicCompound
      isA OrganicCompound Chemical
      isA Chemical Substance
      isA Substance Matter
    `,
    expected_nl: 'Learned 38 facts'
  },

  // === PROVE: 6-step medical (COVID->Problem) ===
  {
    action: 'prove',
    input_nl: 'Is COVID a Problem? (6-step medical chain)',
    input_dsl: '@goal isA COVID Problem',
    expected_nl: 'True: COVID is a problem. Proof: COVID isA ViralDisease. ViralDisease isA Infectious. Infectious isA Disease. Disease isA MedicalCondition. MedicalCondition isA HealthIssue. HealthIssue isA Problem.'
  },

  // === PROVE: 5-step medical (COVID->HealthIssue) ===
  {
    action: 'prove',
    input_nl: 'Is COVID a HealthIssue? (5-step medical chain)',
    input_dsl: '@goal isA COVID HealthIssue',
    expected_nl: 'True: COVID is a healthissue. Proof: COVID isA ViralDisease. ViralDisease isA Infectious. Infectious isA Disease. Disease isA MedicalCondition. MedicalCondition isA HealthIssue.'
  },

  // === PROVE: 6-step court (DistrictCourt->Organization) ===
  {
    action: 'prove',
    input_nl: 'Is DistrictCourt an Organization? (6-step legal chain)',
    input_dsl: '@goal isA DistrictCourt Organization',
    expected_nl: 'True: DistrictCourt is an organization. Proof: DistrictCourt isA TrialCourt. TrialCourt isA LowerCourt. LowerCourt isA Court. Court isA LegalBody. LegalBody isA Institution. Institution isA Organization.'
  },

  // === PROVE: 5-step court (DistrictCourt->Institution) ===
  {
    action: 'prove',
    input_nl: 'Is DistrictCourt an Institution? (5-step legal chain)',
    input_dsl: '@goal isA DistrictCourt Institution',
    expected_nl: 'True: DistrictCourt is an institution. Proof: DistrictCourt isA TrialCourt. TrialCourt isA LowerCourt. LowerCourt isA Court. Court isA LegalBody. LegalBody isA Institution.'
  },

  // === PROVE: 6-step temporal (Complaint->Sentencing) ===
  {
    action: 'prove',
    input_nl: 'Is Complaint before Sentencing? (6-step temporal chain)',
    input_dsl: '@goal before Complaint Sentencing',
    expected_nl: 'True: Complaint is before Sentencing. Proof: Complaint is before Filing. Filing is before Investigation. Investigation is before Arrest. Arrest is before Trial. Trial is before Verdict. Verdict is before Sentencing.'
  },

  // === PROVE: 5-step temporal (Filing->Verdict) ===
  {
    action: 'prove',
    input_nl: 'Is Filing before Verdict? (5-step temporal chain)',
    input_dsl: '@goal before Filing Verdict',
    expected_nl: 'True: Filing is before Verdict. Proof: Filing is before Investigation. Investigation is before Arrest. Arrest is before Trial. Trial is before Verdict. Transitive chain verified (4 hops). Therefore Filing is before Verdict.'
  },

  // === PROVE: 5-step causal (Crime->Trial) ===
  {
    action: 'prove',
    input_nl: 'Does Crime cause Trial? (5-step causal chain)',
    input_dsl: '@goal causes Crime Trial',
    expected_nl: 'True: Crime causes Trial. Proof: Crime causes Investigation. Investigation causes Evidence. Evidence causes Arrest. Arrest causes Prosecution. Prosecution causes Trial.'
  },

  // === PROVE: Appeal transitive with search trace ===
  {
    action: 'prove',
    input_nl: 'Does DistrictCourt appeal to SupremeCourt? (2-step appeal chain)',
    input_dsl: '@goal appealsTo DistrictCourt SupremeCourt',
    expected_nl: 'True: DistrictCourt appeals to SupremeCourt. Proof: DistrictCourt appeals to AppealsCourt. AppealsCourt appeals to SupremeCourt. Therefore DistrictCourt appeals to SupremeCourt.'
  },

  // === PROVE: 7-step biological (Hemoglobin->Matter) ===
  {
    action: 'prove',
    input_nl: 'Is Hemoglobin Matter? (7-step biological chain)',
    input_dsl: '@goal isA Hemoglobin Matter',
    expected_nl: 'True: Hemoglobin is matter. Proof: Hemoglobin isA Protein. Protein isA Macromolecule. Macromolecule isA Biomolecule. Biomolecule isA OrganicCompound. OrganicCompound isA Chemical. Chemical isA Substance. Substance isA Matter.'
  },

  // === PROVE: 5-step biological (Hemoglobin->Chemical) ===
  {
    action: 'prove',
    input_nl: 'Is Hemoglobin a Chemical? (5-step biological chain)',
    input_dsl: '@goal isA Hemoglobin Chemical',
    expected_nl: 'True: Hemoglobin is a chemical. Proof: Hemoglobin isA Protein. Protein isA Macromolecule. Macromolecule isA Biomolecule. Biomolecule isA OrganicCompound. OrganicCompound isA Chemical.'
  },

  // === NEGATIVE: Cross-domain medical vs legal with search trace ===
  {
    action: 'prove',
    input_nl: 'Is COVID a Court? (cross-domain - should fail)',
    input_dsl: '@goal isA COVID Court',
    expected_nl: 'Cannot prove: COVID is a court. Search: COVID isA ViralDisease. ViralDisease isA Infectious. Infectious isA Disease. Disease isA MedicalCondition. MedicalCondition isA HealthIssue. HealthIssue isA Problem. No path exists from COVID to Court.'
  },

  // === NEGATIVE: Reverse causation with search trace ===
  {
    action: 'prove',
    input_nl: 'Does Trial cause Crime? (reverse causation - should fail)',
    input_dsl: '@goal causes Trial Crime',
    expected_nl: 'Cannot prove: Trial causes Crime. Search: Searched causes Trial ?next in KB. Not found. Trial has no outgoing causes relations. Reverse path: Crime -> Investigation -> Evidence -> Arrest -> Prosecution -> Trial. Path exists in opposite direction only. Causal direction violated.'
  },

  // === NEGATIVE: Reverse temporal with search trace ===
  {
    action: 'prove',
    input_nl: 'Is Sentencing before Complaint? (reverse temporal - should fail)',
    input_dsl: '@goal before Sentencing Complaint',
    expected_nl: 'Cannot prove: Sentencing is before Complaint. Search: Searched before Sentencing ?next in KB. Not found. Sentencing has no outgoing before relations. Reverse path: Complaint -> Filing -> Investigation -> Arrest -> Trial -> Verdict -> Sentencing. Path exists in opposite direction only. Temporal order violated.'
  },

  // === QUERY: Patient symptoms ===
  {
    action: 'query',
    input_nl: 'What symptoms does Patient1 have?',
    input_dsl: '@q hasSymptom Patient1 ?symptom',
    expected_nl: 'Patient1 has fatigue. Patient1 has fever. Patient1 has cough. Proof: hasSymptom Patient1 Fatigue. hasSymptom Patient1 Fever. hasSymptom Patient1 Cough.'
  },

  // === QUERY: What can DrSmith do ===
  {
    action: 'query',
    input_nl: 'What can DrSmith do?',
    input_dsl: '@q can DrSmith ?ability',
    expected_nl: 'DrSmith can Prescribe. DrSmith can Diagnose. Proof: can DrSmith Prescribe. can DrSmith Diagnose.'
  }
];

export default { name, description, theories, steps };

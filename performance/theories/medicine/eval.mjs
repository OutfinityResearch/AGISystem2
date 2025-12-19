export const min_complex = 100;

export const testCases = [
  {
    name: "Myocardial Infarction Diagnosis and Treatment",
    theorems: ["Myocardial_Infarction"],
    expected_nl: [
      "Patient presents with chest pain",
      "Patient presents with dyspnea",
      "Chest pain indicates heart attack",
      "Heart attack is severe and life threatening",
      "Heart attack requires aspirin treatment",
      "Heart attack requires nitroglycerin treatment",
      "Heart attack requires emergency hospital care"
    ],
    proof_nl: [
      "Given patient presents with chest pain and dyspnea",
      "Chest pain indicates heart attack condition",
      "Heart attack is severe and life threatening",
      "Therefore heart attack requires aspirin and nitroglycerin treatment",
      "And requires emergency hospital care"
    ]
  },

  {
    name: "Hypertension Management",
    theorems: ["Hypertension"],
    expected_nl: [
      "Patient presents with high blood pressure",
      "High blood pressure is chronic condition",
      "High blood pressure increases stroke risk",
      "High blood pressure increases heart disease risk",
      "High blood pressure requires antihypertensive treatment",
      "Requires diet and exercise modification"
    ],
    proof_nl: [
      "Given patient presents with high blood pressure",
      "High blood pressure is chronic over years",
      "It increases risk for stroke and heart disease",
      "Therefore requires antihypertensive treatment",
      "And lifestyle modifications including diet and exercise"
    ]
  },

  {
    name: "Atrial Fibrillation and Stroke Prevention",
    theorems: ["Atrial_Fibrillation"],
    expected_nl: [
      "Patient presents with irregular heartbeat",
      "Patient presents with palpitations",
      "Irregular heartbeat indicates atrial fibrillation",
      "Atrial fibrillation increases stroke risk",
      "Atrial fibrillation causes blood clots in atrium",
      "Atrial fibrillation requires anticoagulant treatment",
      "Atrial fibrillation requires INR monitoring"
    ],
    proof_nl: [
      "Given patient has irregular heartbeat and palpitations",
      "This indicates atrial fibrillation condition",
      "Atrial fibrillation increases stroke risk by causing blood clots",
      "Therefore requires anticoagulant treatment",
      "With INR monitoring"
    ]
  },

  {
    name: "Heart Failure Treatment",
    theorems: ["Heart_Failure"],
    expected_nl: [
      "Patient presents with edema",
      "Patient presents with dyspnea",
      "Patient presents with fatigue",
      "Edema indicates heart failure",
      "Heart failure caused by weakened heart pump function",
      "Heart failure requires diuretic treatment",
      "Heart failure requires ACE inhibitor treatment"
    ],
    proof_nl: [
      "Given patient presents with edema, dyspnea, and fatigue",
      "These symptoms indicate heart failure",
      "Heart failure is caused by weakened heart pump function",
      "Therefore requires diuretic to remove excess fluid",
      "And ACE inhibitor to improve heart function"
    ]
  },

  {
    name: "Coronary Artery Disease Management",
    theorems: ["Coronary_Artery_Disease"],
    expected_nl: [
      "Patient presents with angina pectoris",
      "Coronary artery narrowing caused by plaque",
      "Angina pectoris indicates coronary artery disease",
      "High cholesterol is risk factor for coronary artery disease",
      "Coronary artery disease requires statin treatment",
      "May require angioplasty procedure"
    ],
    proof_nl: [
      "Given patient presents with angina pectoris",
      "Coronary arteries are narrowed by plaque buildup",
      "This indicates coronary artery disease",
      "High cholesterol is a risk factor",
      "Therefore requires statin treatment",
      "And may require angioplasty procedure"
    ]
  },

  {
    name: "Deep Vein Thrombosis Treatment",
    theorems: ["Deep_Vein_Thrombosis"],
    expected_nl: [
      "Patient presents with leg swelling",
      "Patient presents with leg pain",
      "Leg swelling indicates deep vein thrombosis",
      "Deep vein thrombosis forms clot in deep leg vein",
      "Deep vein thrombosis increases pulmonary embolism risk",
      "Deep vein thrombosis requires heparin treatment",
      "Deep vein thrombosis requires warfarin treatment"
    ],
    proof_nl: [
      "Given patient has leg swelling and pain",
      "This indicates deep vein thrombosis",
      "Clot forms in deep vein of leg",
      "This increases risk of pulmonary embolism",
      "Therefore requires anticoagulation with heparin and warfarin"
    ]
  },

  {
    name: "Pulmonary Embolism Emergency",
    theorems: ["Pulmonary_Embolism"],
    expected_nl: [
      "Patient presents with shortness of breath",
      "Patient presents with chest pain",
      "Shortness of breath indicates pulmonary embolism",
      "Pulmonary embolism caused by clot in pulmonary artery",
      "Pulmonary embolism is severe and life threatening",
      "Pulmonary embolism requires thrombolysis treatment",
      "Pulmonary embolism requires oxygen support"
    ],
    proof_nl: [
      "Given patient has shortness of breath and chest pain",
      "This indicates pulmonary embolism",
      "Caused by clot blocking pulmonary artery",
      "This is a severe life threatening condition",
      "Therefore requires immediate thrombolysis to dissolve clot",
      "And oxygen support"
    ]
  },

  {
    name: "Pneumonia Treatment",
    theorems: ["Pneumonia"],
    expected_nl: [
      "Patient presents with fever",
      "Patient presents with cough",
      "Patient presents with chest pain",
      "Fever indicates pneumonia",
      "Pneumonia caused by bacterial lung infection",
      "Pneumonia requires antibiotic treatment",
      "Pneumonia may require oxygen support"
    ],
    proof_nl: [
      "Given patient has fever, cough, and chest pain",
      "These symptoms indicate pneumonia",
      "Pneumonia is caused by bacterial infection of lung",
      "Therefore requires antibiotic treatment",
      "And may require oxygen support in severe cases"
    ]
  },

  {
    name: "Asthma Management",
    theorems: ["Asthma"],
    expected_nl: [
      "Patient presents with wheezing",
      "Patient presents with dyspnea",
      "Wheezing indicates asthma",
      "Asthma caused by airway inflammation and constriction",
      "Asthma triggered by allergens",
      "Asthma requires bronchodilator treatment",
      "Asthma requires corticosteroid treatment"
    ],
    proof_nl: [
      "Given patient has wheezing and dyspnea",
      "This indicates asthma",
      "Asthma involves airway inflammation and constriction",
      "Can be triggered by allergens",
      "Therefore requires bronchodilator to open airways",
      "And corticosteroid to reduce inflammation"
    ]
  },

  {
    name: "COPD Management",
    theorems: ["COPD"],
    expected_nl: [
      "Patient presents with chronic cough",
      "Patient presents with dyspnea",
      "Patient presents with sputum",
      "Chronic cough indicates COPD",
      "Smoking is risk factor for COPD",
      "COPD causes airflow obstruction",
      "COPD requires bronchodilator treatment",
      "COPD requires oxygen support"
    ],
    proof_nl: [
      "Given patient has chronic cough, dyspnea, and sputum production",
      "These symptoms indicate COPD",
      "Smoking is primary risk factor",
      "COPD causes airflow obstruction",
      "Therefore requires bronchodilator treatment",
      "And oxygen support"
    ]
  },

  {
    name: "Tuberculosis Treatment Protocol",
    theorems: ["Tuberculosis"],
    expected_nl: [
      "Patient presents with persistent cough",
      "Patient presents with night sweats",
      "Patient presents with weight loss",
      "Persistent cough indicates tuberculosis",
      "Tuberculosis caused by mycobacterium lung infection",
      "Tuberculosis is contagious through airborne transmission",
      "Tuberculosis requires rifampin treatment",
      "Tuberculosis requires isoniazid treatment",
      "Tuberculosis requires six month treatment duration"
    ],
    proof_nl: [
      "Given patient has persistent cough, night sweats, and weight loss",
      "These symptoms indicate tuberculosis",
      "TB is caused by Mycobacterium infection",
      "It is contagious via airborne transmission",
      "Therefore requires rifampin and isoniazid treatment",
      "For at least six months duration"
    ]
  },

  {
    name: "Stroke Emergency Management",
    theorems: ["Stroke"],
    expected_nl: [
      "Patient presents with hemiparesis",
      "Patient presents with facial drooping",
      "Patient presents with speech difficulty",
      "Hemiparesis indicates stroke",
      "Stroke caused by brain artery occlusion with clot",
      "Stroke is severe and life threatening",
      "Stroke requires immediate TPA treatment",
      "TPA has three hour time window"
    ],
    proof_nl: [
      "Given patient has hemiparesis, facial drooping, and speech difficulty",
      "These symptoms indicate stroke",
      "Stroke caused by clot occluding brain artery",
      "This is a life threatening emergency",
      "Therefore requires immediate TPA treatment",
      "Must be given within three hour window"
    ]
  },

  {
    name: "Alzheimer's Disease Management",
    theorems: ["Alzheimers_Disease"],
    expected_nl: [
      "Patient presents with memory loss",
      "Patient presents with confusion",
      "Patient presents with personality change",
      "Memory loss indicates Alzheimer disease",
      "Alzheimer disease caused by brain neuron degeneration",
      "Characterized by amyloid beta plaques in brain",
      "Alzheimer disease is progressive and irreversible",
      "Donepezil may support cognition in Alzheimer disease"
    ],
    proof_nl: [
      "Given patient has memory loss, confusion, and personality changes",
      "These symptoms indicate Alzheimer's disease",
      "Disease caused by brain neuron degeneration",
      "Characterized by amyloid-beta plaques",
      "It is progressive and irreversible",
      "Donepezil may temporarily support cognitive function"
    ]
  },

  {
    name: "Parkinson's Disease Treatment",
    theorems: ["Parkinsons_Disease"],
    expected_nl: [
      "Patient presents with resting tremor",
      "Patient presents with bradykinesia",
      "Patient presents with rigidity",
      "Resting tremor indicates Parkinson disease",
      "Parkinson disease caused by loss of dopamine neurons in substantia nigra",
      "Parkinson disease is progressive and chronic",
      "Parkinson disease requires levodopa treatment",
      "Parkinson disease requires carbidopa treatment"
    ],
    proof_nl: [
      "Given patient has resting tremor, bradykinesia, and rigidity",
      "These symptoms indicate Parkinson's disease",
      "Caused by loss of dopamine-producing neurons",
      "It is a progressive chronic condition",
      "Therefore requires levodopa and carbidopa treatment",
      "To replace lost dopamine"
    ]
  },

  {
    name: "Multiple Sclerosis Diagnosis",
    theorems: ["Multiple_Sclerosis"],
    expected_nl: [
      "Patient presents with visual disturbance",
      "Patient presents with weakness",
      "Patient presents with numbness",
      "Visual disturbance indicates multiple sclerosis",
      "Multiple sclerosis caused by nerve axon demyelination",
      "Multiple sclerosis is autoimmune immune attack",
      "Multiple sclerosis has relapsing remitting pattern",
      "Multiple sclerosis requires interferon treatment"
    ],
    proof_nl: [
      "Given patient has visual disturbances, weakness, and numbness",
      "These symptoms indicate multiple sclerosis",
      "MS caused by immune system attacking myelin",
      "It is an autoimmune disease",
      "Has relapsing-remitting pattern",
      "Therefore requires interferon treatment"
    ]
  },

  {
    name: "Epilepsy Management",
    theorems: ["Epilepsy"],
    expected_nl: [
      "Patient presents with seizure",
      "Patient presents with loss of consciousness",
      "Seizure indicates epilepsy",
      "Epilepsy caused by abnormal brain electrical activity",
      "Epilepsy is recurrent and chronic",
      "Epilepsy requires anticonvulsant treatment",
      "Epilepsy requires EEG monitoring"
    ],
    proof_nl: [
      "Given patient has seizures with loss of consciousness",
      "This indicates epilepsy",
      "Epilepsy caused by abnormal brain electrical activity",
      "It is a recurrent chronic condition",
      "Therefore requires anticonvulsant medication",
      "And EEG monitoring"
    ]
  },

  {
    name: "Type 1 Diabetes Management",
    theorems: ["Diabetes_Type1"],
    expected_nl: [
      "Patient presents with hyperglycemia",
      "Patient presents with polyuria",
      "Patient presents with polydipsia",
      "Hyperglycemia indicates type 1 diabetes",
      "Type 1 diabetes caused by pancreatic beta cell destruction",
      "Type 1 diabetes is autoimmune immune attack",
      "Type 1 diabetes requires insulin treatment",
      "Type 1 diabetes requires blood glucose monitoring"
    ],
    proof_nl: [
      "Given patient has hyperglycemia, polyuria, and polydipsia",
      "These symptoms indicate type 1 diabetes",
      "Caused by autoimmune destruction of pancreatic beta cells",
      "This is an autoimmune condition",
      "Therefore requires lifelong insulin therapy",
      "With blood glucose monitoring"
    ]
  },

  {
    name: "Type 2 Diabetes Treatment",
    theorems: ["Diabetes_Type2"],
    expected_nl: [
      "Patient presents with hyperglycemia",
      "Patient presents with fatigue",
      "Hyperglycemia indicates type 2 diabetes",
      "Type 2 diabetes caused by tissue insulin resistance",
      "Obesity is risk factor for type 2 diabetes",
      "Type 2 diabetes requires metformin treatment",
      "Requires diet and exercise modification"
    ],
    proof_nl: [
      "Given patient has hyperglycemia and fatigue",
      "This indicates type 2 diabetes",
      "Caused by insulin resistance in tissues",
      "Obesity is a major risk factor",
      "Therefore requires metformin treatment",
      "And lifestyle modifications with diet and exercise"
    ]
  },

  {
    name: "Hypothyroidism Treatment",
    theorems: ["Hypothyroidism"],
    expected_nl: [
      "Patient presents with fatigue",
      "Patient presents with weight gain",
      "Patient presents with cold intolerance",
      "Fatigue indicates hypothyroidism",
      "Hypothyroidism caused by thyroid gland underfunctioning",
      "Hypothyroidism leads to metabolism dysfunction",
      "Hypothyroidism requires levothyroxine treatment",
      "Hypothyroidism requires TSH monitoring"
    ],
    proof_nl: [
      "Given patient has fatigue, weight gain, and cold intolerance",
      "These symptoms indicate hypothyroidism",
      "Caused by insufficient thyroid hormone production",
      "Leads to slowed metabolism",
      "Therefore requires levothyroxine replacement",
      "With TSH monitoring"
    ]
  },

  {
    name: "Chronic Kidney Disease Management",
    theorems: ["Chronic_Kidney_Disease"],
    expected_nl: [
      "Patient presents with proteinuria",
      "Patient presents with edema",
      "Patient presents with fatigue",
      "Proteinuria indicates chronic kidney disease",
      "Chronic kidney disease caused by kidney nephron damage",
      "Diabetes is risk factor for chronic kidney disease",
      "Chronic kidney disease is progressive to renal failure",
      "Chronic kidney disease requires ACE inhibitor treatment",
      "May require dialysis procedure"
    ],
    proof_nl: [
      "Given patient has proteinuria, edema, and fatigue",
      "These symptoms indicate chronic kidney disease",
      "Caused by progressive damage to kidney nephrons",
      "Diabetes is a major risk factor",
      "Disease progresses to renal failure",
      "Therefore requires ACE inhibitor treatment",
      "And may require dialysis"
    ]
  },

  {
    name: "Urinary Tract Infection Treatment",
    theorems: ["Urinary_Tract_Infection"],
    expected_nl: [
      "Patient presents with dysuria",
      "Patient presents with frequency",
      "Patient presents with urgency",
      "Dysuria indicates urinary tract infection",
      "Urinary tract infection caused by bacterial infection",
      "E coli is most common UTI pathogen",
      "Urinary tract infection requires antibiotic treatment"
    ],
    proof_nl: [
      "Given patient has dysuria, frequency, and urgency",
      "These symptoms indicate UTI",
      "UTI caused by bacterial infection of urinary tract",
      "E. coli is the most common pathogen",
      "Therefore requires antibiotic treatment"
    ]
  },

  {
    name: "Sepsis Emergency Management",
    theorems: ["Sepsis"],
    expected_nl: [
      "Patient presents with SIRS",
      "Patient presents with hypotension",
      "Patient presents with tachycardia",
      "SIRS indicates sepsis",
      "Sepsis caused by bacterial blood infection",
      "Sepsis is severe and life threatening",
      "Septic shock is emergency complication",
      "Sepsis requires immediate broad spectrum antibiotic treatment",
      "Sepsis requires IV fluid support"
    ],
    proof_nl: [
      "Given patient has SIRS, hypotension, and tachycardia",
      "These symptoms indicate sepsis",
      "Sepsis caused by bloodstream bacterial infection",
      "It is a life threatening emergency",
      "Can progress to septic shock",
      "Therefore requires immediate broad-spectrum antibiotics",
      "And IV fluid support"
    ]
  },

  {
    name: "Rheumatoid Arthritis Treatment",
    theorems: ["Rheumatoid_Arthritis"],
    expected_nl: [
      "Patient presents with joint pain",
      "Patient presents with morning stiffness",
      "Patient presents with joint swelling",
      "Joint pain indicates rheumatoid arthritis",
      "Rheumatoid arthritis caused by joint synovium inflammation",
      "Rheumatoid arthritis is autoimmune immune attack",
      "Rheumatoid arthritis causes cartilage destruction",
      "Rheumatoid arthritis requires methotrexate treatment",
      "May require biologic treatment"
    ],
    proof_nl: [
      "Given patient has joint pain, morning stiffness, and swelling",
      "These symptoms indicate rheumatoid arthritis",
      "RA caused by autoimmune attack on joint synovium",
      "It is an autoimmune disease",
      "Progressively destroys cartilage",
      "Therefore requires methotrexate treatment",
      "And may require biologic agents"
    ]
  },

  {
    name: "Systemic Lupus Erythematosus",
    theorems: ["Systemic_Lupus_Erythematosus"],
    expected_nl: [
      "Patient presents with malar rash",
      "Patient presents with joint pain",
      "Patient presents with fatigue",
      "Malar rash indicates systemic lupus erythematosus",
      "SLE caused by autoantibody attack on multiple organs",
      "SLE is autoimmune systemic disease",
      "SLE affects multiple organ systems",
      "SLE requires hydroxychloroquine treatment",
      "SLE requires corticosteroid treatment"
    ],
    proof_nl: [
      "Given patient has malar rash, joint pain, and fatigue",
      "These symptoms indicate systemic lupus erythematosus",
      "SLE caused by autoantibodies attacking multiple organs",
      "It is a systemic autoimmune disease",
      "Affects multiple organ systems",
      "Therefore requires hydroxychloroquine treatment",
      "And corticosteroids"
    ]
  },

  {
    name: "Anemia Diagnosis and Treatment",
    theorems: ["Anemia"],
    expected_nl: [
      "Patient presents with pallor",
      "Patient presents with fatigue",
      "Patient presents with dyspnea",
      "Pallor indicates anemia",
      "Anemia caused by hemoglobin and red blood cell deficiency",
      "Iron deficiency is common cause of anemia",
      "Iron deficiency anemia requires iron supplement treatment",
      "Anemia requires CBC monitoring"
    ],
    proof_nl: [
      "Given patient has pallor, fatigue, and dyspnea",
      "These symptoms indicate anemia",
      "Anemia caused by low hemoglobin and RBC levels",
      "Iron deficiency is the most common cause",
      "Therefore requires iron supplementation",
      "With CBC monitoring"
    ]
  },

  {
    name: "Beta Blocker Mechanism and Indications",
    theorems: ["Beta_Blockers"],
    expected_nl: [
      "Beta blocker is cardiovascular drug class",
      "Beta blocker blocks beta adrenergic receptor",
      "Beta blocker decreases heart rate",
      "Beta blocker decreases blood pressure",
      "Beta blocker is indicated for hypertension",
      "Beta blocker is indicated for angina"
    ],
    proof_nl: [
      "Beta blockers are cardiovascular drugs",
      "They work by blocking beta-adrenergic receptors",
      "This decreases heart rate and blood pressure",
      "Therefore indicated for treating hypertension",
      "And angina"
    ]
  },

  {
    name: "ACE Inhibitor Mechanism",
    theorems: ["ACE_Inhibitors"],
    expected_nl: [
      "ACE inhibitor is cardiovascular drug class",
      "ACE inhibitor inhibits ACE enzyme",
      "ACE inhibitor prevents angiotensin 1 to angiotensin 2 conversion",
      "ACE inhibitor causes vasodilation",
      "ACE inhibitor decreases blood pressure",
      "ACE inhibitor is indicated for hypertension",
      "ACE inhibitor is indicated for heart failure"
    ],
    proof_nl: [
      "ACE inhibitors are cardiovascular drugs",
      "They inhibit the ACE enzyme",
      "This prevents conversion of angiotensin I to angiotensin II",
      "Causing vasodilation and lowered blood pressure",
      "Therefore indicated for hypertension and heart failure"
    ]
  },

  {
    name: "Statin Mechanism and Benefits",
    theorems: ["Statins"],
    expected_nl: [
      "Statin is lipid drug class",
      "Statin inhibits HMG CoA reductase enzyme",
      "Statin decreases cholesterol synthesis",
      "Statin lowers LDL cholesterol",
      "Statin is indicated for hyperlipidemia",
      "Statin reduces cardiovascular risk"
    ],
    proof_nl: [
      "Statins are lipid-lowering drugs",
      "They inhibit HMG-CoA reductase enzyme",
      "This decreases cholesterol synthesis",
      "Lowering LDL cholesterol levels",
      "Therefore indicated for hyperlipidemia",
      "And reduce cardiovascular disease risk"
    ]
  },

  {
    name: "Warfarin and NSAID Interaction",
    theorems: ["Warfarin_NSAID_Interaction"],
    expected_nl: [
      "Warfarin is anticoagulant",
      "NSAID is analgesic",
      "Warfarin and NSAID combination increases GI bleeding risk",
      "Warfarin inhibits blood clotting",
      "NSAID damages GI tract mucosa",
      "Warfarin and NSAID combination is contraindicated"
    ],
    proof_nl: [
      "Warfarin is an anticoagulant drug",
      "NSAIDs are analgesic drugs",
      "Warfarin inhibits blood clotting",
      "NSAIDs damage GI mucosa",
      "Together they greatly increase GI bleeding risk",
      "Therefore this combination is contraindicated"
    ]
  },

  {
    name: "Echocardiography Procedure",
    theorems: ["Echocardiography"],
    expected_nl: [
      "Echocardiography is diagnostic cardiac procedure",
      "Echocardiography uses ultrasound to image heart",
      "Echocardiography evaluates cardiac function",
      "Echocardiography visualizes valve abnormality",
      "Echocardiography is indicated for heart failure",
      "Echocardiography is noninvasive and safe"
    ],
    proof_nl: [
      "Echocardiography is a diagnostic cardiac procedure",
      "It uses ultrasound to image the heart",
      "Evaluates cardiac function and visualizes valve abnormalities",
      "Indicated for heart failure evaluation",
      "It is noninvasive and safe"
    ]
  },

  {
    name: "MRI Imaging Advantages",
    theorems: ["MRI_Scan"],
    expected_nl: [
      "MRI is diagnostic radiology procedure",
      "MRI uses magnetic field for imaging",
      "MRI creates detailed images",
      "MRI is excellent for soft tissue imaging",
      "MRI has no radiation and is safer",
      "MRI is contraindicated with metal implants"
    ],
    proof_nl: [
      "MRI is a diagnostic radiology procedure",
      "It uses magnetic fields for imaging",
      "Creates detailed images excellent for soft tissue",
      "Does not use radiation making it safer than CT",
      "However contraindicated in patients with metal implants"
    ]
  },

  {
    name: "Colonoscopy Screening",
    theorems: ["Colonoscopy"],
    expected_nl: [
      "Colonoscopy is diagnostic GI procedure",
      "Colonoscopy uses endoscope to examine colon",
      "Colonoscopy visualizes polyps",
      "Colonoscopy can remove polyps therapeutically",
      "Colonoscopy is indicated for colorectal cancer screening",
      "Colonoscopy requires bowel preparation"
    ],
    proof_nl: [
      "Colonoscopy is a GI diagnostic procedure",
      "Uses endoscope to visualize the colon",
      "Can detect and therapeutically remove polyps",
      "Indicated for colorectal cancer screening",
      "Requires bowel preparation beforehand"
    ]
  },

  {
    name: "Cardiologist Specialty",
    theorems: ["Cardiologist"],
    expected_nl: [
      "Cardiologist is cardiology specialist",
      "Cardiologist specializes in heart disease",
      "Cardiologist performs echocardiography procedure",
      "Cardiologist performs cardiac catheterization procedure",
      "Cardiologist manages heart failure condition",
      "Cardiologist manages arrhythmia condition"
    ],
    proof_nl: [
      "Cardiologists are specialists in cardiology",
      "They specialize in heart disease",
      "Perform procedures like echocardiography and cardiac catheterization",
      "Manage conditions including heart failure and arrhythmias"
    ]
  },

  {
    name: "Neurologist Expertise",
    theorems: ["Neurologist"],
    expected_nl: [
      "Neurologist is neurology specialist",
      "Neurologist specializes in neurological disorders",
      "Neurologist interprets EEG",
      "Neurologist manages epilepsy condition",
      "Neurologist manages stroke condition",
      "Neurologist manages Parkinson disease condition"
    ],
    proof_nl: [
      "Neurologists are specialists in neurology",
      "They specialize in neurological disorders",
      "Interpret EEGs and manage conditions",
      "Including epilepsy, stroke, and Parkinson's disease"
    ]
  },

  {
    name: "Diabetes Complications",
    theorems: ["Diabetes_Complications"],
    expected_nl: [
      "Diabetes is chronic metabolic disease",
      "Diabetes causes diabetic retinopathy complication",
      "Diabetes causes diabetic neuropathy complication",
      "Diabetes causes diabetic nephropathy complication",
      "Hyperglycemia damages blood vessel microvasculature",
      "Glycemic control prevents diabetes complications",
      "Diabetes requires regular eye exam screening"
    ],
    proof_nl: [
      "Diabetes is a chronic metabolic disease",
      "Long-term hyperglycemia damages microvasculature",
      "This causes complications including retinopathy, neuropathy, and nephropathy",
      "Good glycemic control prevents these complications",
      "Regular eye exams are required for screening"
    ]
  },

  {
    name: "Metabolic Syndrome",
    theorems: ["Metabolic_Syndrome"],
    expected_nl: [
      "Metabolic syndrome is cluster of risk factors",
      "Metabolic syndrome includes obesity component",
      "Metabolic syndrome includes hypertension component",
      "Metabolic syndrome includes dyslipidemia component",
      "Metabolic syndrome includes insulin resistance component",
      "Metabolic syndrome increases type 2 diabetes risk",
      "Metabolic syndrome increases cardiovascular disease risk",
      "Metabolic syndrome requires lifestyle modification management"
    ],
    proof_nl: [
      "Metabolic syndrome is a cluster of risk factors",
      "Including obesity, hypertension, dyslipidemia, and insulin resistance",
      "These increase risk of type 2 diabetes",
      "And cardiovascular disease",
      "Therefore requires lifestyle modification management"
    ]
  },

  {
    name: "Acute Coronary Syndrome Spectrum",
    theorems: ["Acute_Coronary_Syndrome"],
    expected_nl: [
      "Acute coronary syndrome is spectrum of cardiac ischemia",
      "Acute coronary syndrome includes STEMI type",
      "Acute coronary syndrome includes NSTEMI type",
      "Acute coronary syndrome includes unstable angina type",
      "Atherosclerotic plaque rupture causes acute coronary syndrome",
      "Thrombosis causes acute coronary syndrome",
      "Acute coronary syndrome requires urgent revascularization",
      "Acute coronary syndrome requires antiplatelet treatment"
    ],
    proof_nl: [
      "Acute coronary syndrome is a spectrum of cardiac ischemia",
      "Includes STEMI, NSTEMI, and unstable angina",
      "Caused by atherosclerotic plaque rupture and thrombosis",
      "Therefore requires urgent revascularization",
      "And antiplatelet therapy"
    ]
  },

  {
    name: "Antibiotic Resistance Crisis",
    theorems: ["Antibiotic_Resistance"],
    expected_nl: [
      "Antibiotic resistance is public health problem",
      "Antibiotic resistance is caused by antibiotic overuse",
      "Bacteria develop resistance through mutation mechanism",
      "MRSA is example of antibiotic resistance",
      "VRE is example of antibiotic resistance",
      "MDR TB is example of antibiotic resistance",
      "Antimicrobial stewardship is solution to antibiotic resistance",
      "Appropriate antibiotic use prevents antibiotic resistance"
    ],
    proof_nl: [
      "Antibiotic resistance is a global public health threat",
      "Caused by antibiotic overuse",
      "Bacteria develop resistance through mutations",
      "Examples include MRSA, VRE, and MDR-TB",
      "Solution requires antimicrobial stewardship",
      "And appropriate antibiotic use to prevent resistance"
    ]
  },

  {
    name: "Palliative Care Approach",
    theorems: ["Palliative_Care"],
    expected_nl: [
      "Palliative care is holistic care approach",
      "Palliative care focuses on symptom management",
      "Palliative care improves quality of life goal",
      "Palliative care addresses pain",
      "Palliative care addresses psychological distress",
      "Palliative care is appropriate for terminal illness",
      "Palliative care involves interdisciplinary team"
    ],
    proof_nl: [
      "Palliative care is a holistic care approach",
      "Focuses on symptom management and quality of life",
      "Addresses pain and psychological distress",
      "Appropriate for patients with terminal illness",
      "Involves an interdisciplinary team"
    ]
  },

  {
    name: "Myasthenia Gravis Diagnosis",
    theorems: ["Myasthenia_Gravis"],
    expected_nl: [
      "Myasthenia gravis is autoimmune neuromuscular junction condition",
      "Myasthenia gravis is caused by antibodies blocking and destroying acetylcholine receptor",
      "Fluctuating weakness is symptom of myasthenia gravis",
      "Ptosis is symptom of myasthenia gravis",
      "Diplopia is symptom of myasthenia gravis",
      "Weakness worsens with activity and fatigue",
      "Myasthenia gravis is diagnosed by tensilon test",
      "Myasthenia gravis requires pyridostigmine treatment",
      "Myasthenic crisis is emergency complication of myasthenia gravis"
    ],
    proof_nl: [
      "Myasthenia gravis is an autoimmune disease",
      "Antibodies block and destroy acetylcholine receptors at neuromuscular junction",
      "Patients present with fluctuating weakness, ptosis, and diplopia",
      "Weakness worsens with activity and fatigue",
      "Diagnosed by tensilon test",
      "Requires pyridostigmine treatment",
      "Can have myasthenic crisis as emergency complication"
    ]
  },

  {
    name: "Diabetic Ketoacidosis Emergency",
    theorems: ["Diabetic_Ketoacidosis"],
    expected_nl: [
      "Diabetic ketoacidosis is emergency life threatening condition",
      "Diabetic ketoacidosis is caused by absolute insulin deficiency and ketosis",
      "Diabetic ketoacidosis shows elevated blood glucose lab",
      "Diabetic ketoacidosis shows elevated ketones lab",
      "Diabetic ketoacidosis shows metabolic acidosis lab",
      "Kussmaul respiration is symptom of diabetic ketoacidosis",
      "Diabetic ketoacidosis requires immediate IV insulin treatment",
      "Diabetic ketoacidosis requires IV fluids and electrolytes support"
    ],
    proof_nl: [
      "Diabetic ketoacidosis is a life-threatening emergency",
      "Caused by absolute insulin deficiency leading to ketosis",
      "Labs show elevated blood glucose, ketones, and metabolic acidosis",
      "Patient has Kussmaul respirations",
      "Therefore requires immediate IV insulin treatment",
      "And IV fluids with electrolyte replacement"
    ]
  },

  {
    name: "Aortic Dissection Emergency",
    theorems: ["Aortic_Dissection"],
    expected_nl: [
      "Aortic dissection is emergency life threatening condition",
      "Aortic dissection is caused by aortic intima tear and blood dissection",
      "Hypertension is risk factor for aortic dissection",
      "Tearing chest pain is symptom of aortic dissection",
      "Back pain is symptom of aortic dissection",
      "Aortic dissection has blood pressure asymmetry in arms finding",
      "Aortic dissection is diagnosed by CT angiography imaging",
      "Aortic dissection requires immediate beta blocker and blood pressure control treatment",
      "Type A dissection may require emergency surgery"
    ],
    proof_nl: [
      "Aortic dissection is a life-threatening emergency",
      "Caused by tear in aortic intima with blood dissecting through layers",
      "Hypertension is a major risk factor",
      "Patient has tearing chest pain and back pain",
      "Blood pressure asymmetry between arms is a key finding",
      "Diagnosed by CT angiography",
      "Requires immediate beta blocker and blood pressure control",
      "Type A dissection may require emergency surgery"
    ]
  },

  {
    name: "Preeclampsia in Pregnancy",
    theorems: ["Preeclampsia"],
    expected_nl: [
      "Preeclampsia is pregnancy hypertensive complication condition",
      "Preeclampsia is caused by placenta vascular development dysfunction",
      "Preeclampsia presents after twenty weeks gestation",
      "Proteinuria is symptom of preeclampsia in pregnancy",
      "Hypertension is symptom of preeclampsia in pregnancy",
      "Preeclampsia can progress to eclampsia",
      "Preeclampsia requires magnesium sulfate treatment",
      "Delivery cures preeclampsia definitively"
    ],
    proof_nl: [
      "Preeclampsia is a hypertensive complication of pregnancy",
      "Caused by dysfunction in placental vascular development",
      "Occurs after 20 weeks gestation",
      "Characterized by proteinuria and hypertension",
      "Can progress to eclampsia",
      "Requires magnesium sulfate treatment",
      "Delivery is the definitive cure"
    ]
  },

  {
    name: "Alcohol Withdrawal Syndrome",
    theorems: ["Alcohol_Withdrawal"],
    expected_nl: [
      "Alcohol withdrawal is withdrawal syndrome from alcohol condition",
      "Alcohol withdrawal is caused by sudden cessation of chronic alcohol use",
      "Tremor is symptom of alcohol withdrawal",
      "Agitation is symptom of alcohol withdrawal",
      "Diaphoresis is symptom of alcohol withdrawal",
      "Alcohol withdrawal can progress to delirium tremens",
      "Delirium tremens is severe and life threatening",
      "Alcohol withdrawal requires benzodiazepine treatment",
      "Alcohol withdrawal requires CIWA score monitoring"
    ],
    proof_nl: [
      "Alcohol withdrawal is a withdrawal syndrome",
      "Caused by sudden cessation of chronic alcohol use",
      "Presents with tremor, agitation, and diaphoresis",
      "Can progress to life-threatening delirium tremens",
      "Therefore requires benzodiazepine treatment",
      "With CIWA score monitoring"
    ]
  },

  {
    name: "ARDS Critical Care",
    theorems: ["Acute_Respiratory_Distress_Syndrome"],
    expected_nl: [
      "ARDS is critical life threatening condition",
      "ARDS is caused by alveolar capillary membrane inflammation",
      "ARDS leads to gas exchange dysfunction",
      "Severe hypoxemia is symptom of ARDS",
      "Bilateral infiltrates are symptom of ARDS",
      "Sepsis or pneumonia triggers ARDS cause",
      "ARDS requires mechanical ventilation treatment",
      "ARDS uses low tidal volume strategy"
    ],
    proof_nl: [
      "ARDS is a critical life-threatening condition",
      "Caused by inflammation of alveolar-capillary membrane",
      "Leads to severe gas exchange dysfunction",
      "Presents with severe hypoxemia and bilateral infiltrates",
      "Triggered by conditions like sepsis or pneumonia",
      "Requires mechanical ventilation treatment",
      "Using low tidal volume ventilation strategy"
    ]
  },

  {
    name: "Guillain-Barre Syndrome",
    theorems: ["Guillain_Barre_Syndrome"],
    expected_nl: [
      "Guillain Barre syndrome is autoimmune peripheral nerve condition",
      "Guillain Barre syndrome is caused by peripheral nerve demyelination by antibodies",
      "Ascending paralysis is symptom of Guillain Barre syndrome",
      "Diminished reflexes are symptom of Guillain Barre syndrome",
      "Viral infection often precedes Guillain Barre syndrome",
      "Guillain Barre syndrome can cause respiratory failure",
      "Guillain Barre syndrome requires IVIG treatment",
      "Guillain Barre syndrome requires plasmapheresis treatment",
      "Guillain Barre syndrome requires respiratory function monitoring"
    ],
    proof_nl: [
      "Guillain-Barre syndrome is an autoimmune condition",
      "Antibodies cause demyelination of peripheral nerves",
      "Presents with ascending paralysis and diminished reflexes",
      "Often preceded by viral infection",
      "Can cause respiratory failure",
      "Therefore requires IVIG or plasmapheresis treatment",
      "With close respiratory function monitoring"
    ]
  },

  {
    name: "Adrenal Crisis Emergency",
    theorems: ["Adrenal_Crisis"],
    expected_nl: [
      "Adrenal crisis is emergency life threatening condition",
      "Adrenal crisis is caused by acute severe cortisol deficiency",
      "Severe hypotension is symptom of adrenal crisis",
      "Shock is symptom of adrenal crisis",
      "Stress from infection or surgery triggers adrenal crisis",
      "Adrenal crisis requires immediate IV hydrocortisone emergency treatment",
      "Adrenal crisis requires IV fluids and electrolytes support"
    ],
    proof_nl: [
      "Adrenal crisis is a life-threatening emergency",
      "Caused by acute severe cortisol deficiency",
      "Presents with severe hypotension and shock",
      "Often triggered by stress like infection or surgery",
      "Requires immediate IV hydrocortisone",
      "And IV fluids with electrolyte replacement"
    ]
  },

  {
    name: "Sickle Cell Crisis Management",
    theorems: ["Sickle_Cell_Crisis"],
    expected_nl: [
      "Sickle cell crisis is acute complication of sickle cell disease condition",
      "Sickle cell crisis is caused by microvasculature occlusion by sickled red blood cells",
      "Dehydration or infection triggers sickle cell crisis",
      "Severe body pain is symptom of sickle cell crisis",
      "Sickle cell crisis can cause organ damage",
      "Sickle cell crisis requires aggressive hydration management",
      "Sickle cell crisis requires opioid pain control treatment",
      "Severe vaso occlusive crisis may require exchange transfusion procedure"
    ],
    proof_nl: [
      "Sickle cell crisis is acute complication of sickle cell disease",
      "Caused by sickled RBCs occluding microvasculature",
      "Triggered by dehydration or infection",
      "Presents with severe body pain",
      "Can cause organ damage",
      "Requires aggressive hydration management",
      "And opioid pain control",
      "Severe cases may require exchange transfusion"
    ]
  }
];

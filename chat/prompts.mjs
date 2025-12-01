/**
 * DS(/chat/prompts.mjs) - LLM Prompt Templates
 *
 * Contains all prompt templates used for natural language processing:
 * - Intent detection (what does the user want?)
 * - Fact extraction (convert NL to triples)
 * - Question parsing (convert NL to canonical form)
 * - Response generation (convert results to NL)
 *
 * @module chat/prompts
 */

/**
 * System prompt for the AGISystem2 assistant
 */
export const SYSTEM_PROMPT = `You are AGISystem2. Your ONLY job is translating to Sys2DSL.

FOR EVERY USER MESSAGE:
1. If teaching facts: output @fNNN ASSERT subject RELATION object
2. If asking question: output @qNNN ASK subject RELATION object

NEVER skip DSL generation. NEVER answer directly. ALWAYS output DSL FIRST.

RELATION TABLE:
is/are a/an → IS_A | in/at/located → LOCATED_IN | has/have → HAS
causes → CAUSES | helps → HELPS | requires → REQUIRES | can → CAN

CONCEPT RULES:
- lowercase for types (dog, mammal)
- Capitalized for instances (Fido, Tokyo)
- underscore for multi-word (living_thing)
- no articles (a/an/the)
- singular form

Example response for "Is Tokyo in Europe?":
[DSL Representation]
  @q001 ASK Tokyo LOCATED_IN Europe`;

/**
 * Build prompt to detect user intent
 * @param {string} userMessage - The user's input
 * @returns {string} Prompt for intent detection
 */
export function buildIntentPrompt(userMessage) {
  return `Analyze this user message and determine the intent.

User message: "${userMessage}"

Respond with JSON only:
{
  "intent": "teach" | "ask" | "import" | "manage_theory" | "list" | "help" | "other",
  "confidence": 0.0-1.0,
  "details": {
    // For "teach": {"facts": [{"subject": "X", "relation": "Y", "object": "Z"}, ...]}
    // For "ask": {"question": "canonical form", "type": "yes_no" | "what" | "why" | "how"}
    // For "import": {"filepath": "path if mentioned"}
    // For "manage_theory": {"action": "create" | "switch" | "list" | "delete", "name": "theory name"}
    // For "list": {"what": "facts" | "concepts" | "theories"}
  }
}`;
}

/**
 * Build prompt to extract facts from natural language
 * @param {string} text - Natural language text containing facts
 * @returns {string} Prompt for fact extraction
 */
export function buildFactExtractionPrompt(text) {
  return `Extract facts from this text as Subject-Relation-Object triples.

Text: "${text}"

IMPORTANT RULES:
1. Each subject and object must be a CONCEPT NAME (single word or underscore_connected)
2. NEVER use descriptions as objects (wrong: "Belongs to my neighbor", correct: "NeighborProperty")
3. For properties/attributes, use IS_A with a concept (e.g., "Water IS_A liquid" not "Water HAS_PROPERTY liquid")
4. For numeric values, create a concept (e.g., "Celsius100" not "100")
5. Concepts should be lowercase for types, Capitalized for instances/individuals
6. Relations are ALWAYS UPPERCASE with underscores
7. CUSTOM VERBS ARE ALLOWED! Convert any verb to UPPERCASE (e.g., "kills" → "KILLS", "loves" → "LOVES")
8. Work with ANY language - extract the semantic structure regardless of language

Common relations (use these when applicable):
- IS_A: category/type membership (e.g., "Dog IS_A mammal", "Fido IS_A dog")
- PART_OF: mereological (e.g., "Wheel PART_OF car")
- CAUSES / CAUSED_BY: causation (e.g., "Fire CAUSES smoke")
- LOCATED_IN: location (e.g., "Paris LOCATED_IN France")
- REQUIRES: dependencies (e.g., "Driving REQUIRES license")
- PERMITS / PROHIBITED_BY / PERMITTED_BY: permissions/rules
- DISJOINT_WITH: mutual exclusion (e.g., "mortal DISJOINT_WITH immortal")
- OWNS / OWNED_BY: ownership

BUT you can also use CUSTOM RELATIONS when the text uses specific verbs:
- "D kills A" → D KILLS A
- "Lion eats Zebra" → Lion EATS Zebra
- "D omoara A" (Romanian for "D kills A") → D OMOARA A or D KILLS A
- "toate X fac Y" (Romanian for "all X do Y") → X DOES Y
- "A loves B" → A LOVES B

For quantifiers like "all/toate/every":
- "All dogs bark" → dog BARKS (the type, not individuals)
- "Toate pisicile mananca soareci" → pisica MANANCA soarece

BAD examples (DO NOT do this):
- "Fido HAS_PROPERTY Belongs to my neighbor" ❌
- "Water HAS_PROPERTY liquid" ❌
- Returning empty facts when there's clearly a verb relating two concepts ❌

GOOD examples (DO this):
- "Fido OWNED_BY Neighbor" ✓
- "Water IS_A liquid" ✓
- "D KILLS A" ✓ (custom verb)
- "Cat CHASES Mouse" ✓ (custom verb)

Respond with JSON only:
{
  "facts": [
    {"subject": "Subject1", "relation": "RELATION", "object": "Object1"},
    ...
  ],
  "ambiguous": ["any phrases that were unclear"],
  "confidence": 0.0-1.0
}`;
}

/**
 * Build prompt to convert natural language question to Sys2DSL query
 * @param {string} question - Natural language question
 * @returns {string} Prompt for DSL generation
 */
export function buildQuestionPrompt(question) {
  return `Generate a Sys2DSL query for this natural language question.

Question: "${question}"

OUTPUT FORMAT - respond with ONLY this JSON (no explanation):
{
  "type": "yes_no",
  "canonical": { "subject": "X", "relation": "REL", "object": "Y" },
  "confidence": 0.9
}

SYNTAX RULES:
- subject/object: concept names, lowercase for types (dog, mammal), Capitalized for instances (Fido, Tokyo)
- relation: UPPERCASE with underscores (IS_A, LOCATED_IN, CAUSES)
- Remove articles (a, an, the) from concepts
- Singular form (dogs→dog, animals→animal)
- Multi-word concepts use underscore (living_thing, software_engineer)

RELATION MAPPING:
"is a/an" → IS_A | "in/located in" → LOCATED_IN | "causes/cause" → CAUSES
"has/have" → HAS | "part of" → PART_OF | "helps/help" → HELPS
"requires/needs" → REQUIRES | "can/able to" → CAN | "permits/allows" → PERMITS
"prohibits/forbids" → PROHIBITED_BY | Any other verb → UPPERCASE (eats→EATS)

EXAMPLES:
"Is Fido a dog?" → {"type":"yes_no","canonical":{"subject":"Fido","relation":"IS_A","object":"dog"},"confidence":0.95}
"Is Tokyo in Europe?" → {"type":"yes_no","canonical":{"subject":"Tokyo","relation":"LOCATED_IN","object":"Europe"},"confidence":0.95}
"Do doctors help patients?" → {"type":"yes_no","canonical":{"subject":"doctor","relation":"HELPS","object":"patient"},"confidence":0.95}
"Does fire cause smoke?" → {"type":"yes_no","canonical":{"subject":"fire","relation":"CAUSES","object":"smoke"},"confidence":0.95}
"Is a bird a mammal?" → {"type":"yes_no","canonical":{"subject":"bird","relation":"IS_A","object":"mammal"},"confidence":0.95}
"Does Tesla have wheels?" → {"type":"yes_no","canonical":{"subject":"Tesla","relation":"HAS","object":"wheel"},"confidence":0.95}
"Is a software engineer an engineer?" → {"type":"yes_no","canonical":{"subject":"software_engineer","relation":"IS_A","object":"engineer"},"confidence":0.95}
"Can a drone fly over a hospital?" → {"type":"yes_no","canonical":{"subject":"drone","relation":"CAN","object":"fly_over_hospital"},"confidence":0.9}

Respond with JSON only:`;
}

/**
 * Build prompt to generate natural language response
 * @param {object} result - The result from AGISystem2
 * @param {string} originalQuestion - The user's original question
 * @returns {string} Prompt for response generation
 */
export function buildResponsePrompt(result, originalQuestion) {
  return `Generate a natural language response for this query result.

Original question: "${originalQuestion}"
Result: ${JSON.stringify(result, null, 2)}

Guidelines:
- Be concise but informative
- For TRUE_CERTAIN: Answer affirmatively with confidence
- For FALSE: Answer negatively and explain why (e.g., "No, X is not Y because X is a Z and Z is disjoint with Y")
- For UNKNOWN: Say you don't have enough information
- For PLAUSIBLE: Say it's likely/possible but not certain
- If there's a proof or explanation in the result, use it to explain
- Use the same language as the original question

Respond with the natural language answer only (no JSON).`;
}

/**
 * Build prompt to detect contradictions
 * @param {object} newFact - The new fact being added
 * @param {object[]} existingFacts - Existing facts that might conflict
 * @returns {string} Prompt for contradiction detection
 */
export function buildContradictionPrompt(newFact, existingFacts) {
  return `Check if this new fact contradicts existing knowledge.

New fact: ${newFact.subject} ${newFact.relation} ${newFact.object}

Existing facts:
${existingFacts.map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')}

Consider:
1. Direct contradictions (opposite facts)
2. Logical inconsistencies
3. Violations of known constraints

Respond with JSON only:
{
  "contradicts": true | false,
  "severity": "none" | "potential" | "direct",
  "conflicts": [
    {"fact": "Subject REL Object", "reason": "explanation"}
  ],
  "suggestion": "suggest creating new theory if contradiction found"
}`;
}

/**
 * Build prompt to generate facts for missing concepts
 * Used in ontology auto-discovery cycle
 * @param {object[]} missingConcepts - Concepts not in knowledge base
 * @param {string} questionContext - The original question for context
 * @param {object[]} existingFacts - Existing facts for context
 * @returns {string} Prompt for fact generation
 */
export function buildOntologyFactsPrompt(missingConcepts, questionContext, existingFacts = []) {
  const conceptList = missingConcepts.map(c =>
    `- ${c.name} (${c.suggestedType || 'unknown type'})`
  ).join('\n');

  const existingContext = existingFacts.length > 0
    ? `\nExisting facts in knowledge base:\n${existingFacts.slice(0, 20).map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')}`
    : '';

  return `Generate facts to define these missing concepts in context of a question.

Question context: "${questionContext}"

Missing concepts that need definition:
${conceptList}
${existingContext}

IMPORTANT RULES:
1. Generate 5-15 facts per concept to define it well
2. ALWAYS include an IS_A fact for each concept (e.g., "Doctor IS_A profession")
3. Include relevant properties and relationships
4. Use ONLY these standard relations:
   - IS_A: category/type (REQUIRED for each concept)
   - HAS_PROPERTY: attributes
   - PART_OF / HAS_PART: composition
   - CAUSES / CAUSED_BY: causation
   - LOCATED_IN / CONTAINS: location
   - REQUIRES / REQUIRED_BY: dependencies
   - PERMITS / PERMITTED_BY / PROHIBITS / PROHIBITED_BY: rules
   - CAN / CANNOT: abilities
   - DISJOINT_WITH: mutual exclusion
5. Be consistent with existing facts if provided
6. Focus on facts relevant to answering the question
7. Use lowercase for general types, Capitalized for specific instances

Example for "Doctor" in context "Can a doctor treat a patient?":
- Doctor IS_A profession
- Doctor IS_A medical_professional
- Doctor HAS_PROPERTY medical_license
- Doctor CAN treat
- Doctor CAN diagnose
- Doctor REQUIRES medical_training
- treatment REQUIRES Doctor
- Patient TREATED_BY Doctor

Respond with JSON only:
{
  "facts": [
    {"subject": "Concept", "relation": "RELATION", "object": "OtherConcept"},
    ...
  ],
  "conceptsCovered": ["list of concepts that were defined"],
  "confidence": 0.0-1.0
}`;
}

/**
 * Build prompt to suggest a theory name
 * @param {object[]} facts - Facts in the new theory branch
 * @param {string} reason - Why the branch was created
 * @returns {string} Prompt for theory naming
 */
export function buildTheoryNamePrompt(facts, reason) {
  return `Suggest a descriptive name for a new knowledge theory.

Reason for creating: ${reason}

Key facts:
${facts.slice(0, 5).map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')}

Respond with JSON only:
{
  "suggested_name": "short_descriptive_name",
  "description": "Brief description of what this theory represents"
}`;
}

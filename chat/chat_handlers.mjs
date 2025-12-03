/**
 * DS(/chat/chat_handlers.mjs) - Chat Intent Handlers
 *
 * Implements handlers for different user intents:
 * - Teaching new facts
 * - Asking questions
 * - Importing files
 * - Theory management
 * - Listing knowledge
 *
 * @module chat/chat_handlers
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  buildFactExtractionPrompt,
  buildQuestionPrompt,
  buildResponsePrompt,
  buildContradictionPrompt,
  buildTheoryNamePrompt,
  buildOntologyFactsPrompt
} from './prompts.mjs';

/**
 * Lightweight lexical normalization for deterministic logic demos.
 * Maps natural language words (EN/RO) to base ontology concept names.
 */
const LOGIC_LEXICON = {
  // Human / person
  man: 'human',
  men: 'human',
  human: 'human',
  humans: 'human',
  person: 'human',
  people: 'human',
  om: 'human',
  oameni: 'human',

  // Mortality
  mortal: 'mortal',
  mortals: 'mortal',
  muritor: 'mortal',
  muritori: 'mortal'
};

// Irregular plural → singular normalization for concept names
const IRREGULAR_PLURALS = {
  people: 'person',
  men: 'man',
  women: 'woman',
  children: 'child',
  mice: 'mouse',
  geese: 'goose',
  teeth: 'tooth',
  feet: 'foot',
  // Romanian basics
  oameni: 'om',
  copii: 'copil'
};

function normalizeConceptToken(token) {
  const w = String(token).trim().toLowerCase();

  // Explicit mappings first (logic lexicon, irregular plurals)
  if (LOGIC_LEXICON[w]) return LOGIC_LEXICON[w];
  if (IRREGULAR_PLURALS[w]) return IRREGULAR_PLURALS[w];

  // Heuristic singularization – only for all-lowercase concept-like names
  if (!/^[a-z_]+$/.test(w)) return w;

  if (w.endsWith('ies') && w.length > 3) {
    return w.slice(0, -3) + 'y'; // stories -> story
  }
  if (w.endsWith('ses') || w.endsWith('xes') || w.endsWith('zes') || w.endsWith('ches') || w.endsWith('shes')) {
    return w.slice(0, -2); // boxes -> box
  }
  if (w.endsWith('s') && !w.endsWith('ss')) {
    return w.slice(0, -1); // dogs -> dog
  }

  return w;
}

function normalizeConceptName(name) {
  return normalizeConceptToken(name);
}

/**
 * Deterministic fact extraction for simple syllogistic patterns.
 * Supports minimal English/Romanian forms like:
 *  - "Socrates is a human."
 *  - "Humans are mortal."
 *  - "All men are mortal."
 */
function extractFactsDeterministic(message) {
  const facts = [];
  const sentences = String(message)
    .split(/[.\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    // Pattern: "All X are Y" / "Every X is/are Y"
    let m = lower.match(/^(all|every)\s+([a-z_]+)\s+(?:are|is)\s+([a-z_]+)\s*$/);
    if (m) {
      const subject = normalizeConceptName(m[2]);
      const object = normalizeConceptName(m[3]);
      facts.push({ subject, relation: 'IS_A', object });
      continue;
    }

    // Pattern: "X are Y"
    m = lower.match(/^([a-z_]+)\s+are\s+([a-z_]+)\s*$/);
    if (m) {
      const subject = normalizeConceptName(m[1]);
      const object = normalizeConceptName(m[2]);
      facts.push({ subject, relation: 'IS_A', object });
      continue;
    }

    // Pattern: "X is a/an Y"
    m = lower.match(/^(.+?)\s+is\s+(?:a|an)\s+([a-z_]+)\s*$/);
    if (m) {
      const rawSubject = m[1].trim();
      const object = normalizeConceptName(m[2]);
      facts.push({ subject: rawSubject, relation: 'IS_A', object });
      continue;
    }

    // Pattern: "X is Y" (no article)
    m = lower.match(/^(.+?)\s+is\s+([a-z_]+)\s*$/);
    if (m) {
      const rawSubject = m[1].trim();
      const object = normalizeConceptName(m[2]);
      facts.push({ subject: rawSubject, relation: 'IS_A', object });
      continue;
    }

    // Romanian: "X este un/ o Y" / "X e un/ o Y"
    m = lower.match(/^(.+?)\s+(?:este|e)\s+(?:un|o)\s+([a-z_]+)\s*$/);
    if (m) {
      const rawSubject = m[1].trim();
      const object = normalizeConceptName(m[2]);
      facts.push({ subject: rawSubject, relation: 'IS_A', object });
      continue;
    }
  }

  return facts;
}

/**
 * Configuration for ontology auto-discovery
 */
export const ONTOLOGY_CONFIG = {
  maxIterations: 5,           // Maximum MISSING → generate cycles
  minFactsPerConcept: 5,      // Minimum facts to generate per concept
  maxFactsPerConcept: 15,     // Maximum facts to generate per concept
  enabled: true               // Enable/disable auto-discovery
};

/**
 * Configuration for contradiction checking
 */
export const CONTRADICTION_CONFIG = {
  enableLLMSemanticCheck: false,  // LLM semantic check causes false positives
  enableDeterministicCheck: true, // Keep deterministic check (DISJOINT_WITH, etc.)
  blockOnContradiction: true      // If true, don't add facts when contradictions found
};

// Import InferenceEngine and ContradictionDetector
const require = createRequire(import.meta.url);
const InferenceEngine = require('../src/reason/inference_engine.js');
const ContradictionDetector = require('../src/reason/contradiction_detector.js');

/**
 * Handle teaching new facts
 * @param {object} ctx - Context with llmAgent, session
 * @param {string} message - User message
 * @param {object} details - Intent details
 * @returns {Promise<{response: string, actions: object[]}>}
 */
export async function handleTeach(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

  // Extract facts using LLM
  const prompt = buildFactExtractionPrompt(message);
  let facts = [];
  let usedDeterministic = false;

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'extract-facts' }
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      facts = parsed.facts || [];
    }
  } catch (err) {
    if (details?.facts) {
      facts = details.facts;
    }
  }

  // Keep only well-formed triples; if nothing usable, we'll try deterministic parse
  facts = (facts || []).filter(
    (f) => f && typeof f.subject === 'string' && typeof f.relation === 'string' && typeof f.object === 'string'
  );

  // Normalize plural/singular for concept-style names (lowercase) in LLM facts
  facts = facts.map((f) => {
    const out = { ...f };
    if (out.subject && out.subject === out.subject.toLowerCase()) {
      out.subject = normalizeConceptName(out.subject);
    }
    if (out.object && out.object === out.object.toLowerCase()) {
      out.object = normalizeConceptName(out.object);
    }
    return out;
  });

  // Deterministic fallback for simple logical statements
  if (!facts || facts.length === 0) {
    const deterministicFacts = extractFactsDeterministic(message);
    if (deterministicFacts.length > 0) {
      facts = deterministicFacts;
      usedDeterministic = true;
    }
  }

  // Debug: record what we think the extracted facts are
  if (facts && facts.length > 0) {
    actions.push({
      type: 'fact_extraction',
      source: details?.facts ? 'intent_details' : (usedDeterministic ? 'deterministic' : 'llm'),
      facts: facts.map((f) => ({ subject: f.subject, relation: f.relation, object: f.object }))
    });
  }

  if (facts.length === 0) {
    return {
      response: "I couldn't extract any facts from that. Could you rephrase? " +
        "Try something like: 'Dogs are animals' or 'Fire causes smoke'.",
      actions: []
    };
  }

  // Check for contradictions before adding (if enabled)
  let contradictions = [];
  if (CONTRADICTION_CONFIG.enableDeterministicCheck || CONTRADICTION_CONFIG.enableLLMSemanticCheck) {
    contradictions = await checkContradictions(ctx, facts);
  }

  // If blocking on contradictions is enabled and we found some, ask user
  if (CONTRADICTION_CONFIG.blockOnContradiction && contradictions.length > 0) {
    const suggestion = await suggestTheoryBranch(ctx, facts, contradictions);

    // Set pending action for confirmation
    if (ctx.setPendingAction) {
      ctx.setPendingAction('create_theory_branch', {
        facts,
        contradictions,
        suggestion
      });
    }

    return {
      response: `I noticed potential contradictions with existing knowledge:\n` +
        contradictions.map(c => `- ${c.reason}`).join('\n') +
        `\n\nWould you like me to create a new theory branch? ` +
        `Suggested name: "${suggestion.name}"`,
      actions: [{ type: 'contradiction_detected', contradictions, suggestion }]
    };
  }

  // Add facts to current session (even if contradictions were found, unless blocking)
  const added = [];
  let factIdx = 0;
  for (const fact of facts) {
    try {
      session.run([`@learn${factIdx} ${fact.subject} ${fact.relation} ${fact.object}`]);
      factIdx++;
      added.push(fact);
      actions.push({ type: 'fact_added', fact });
    } catch (err) {
      actions.push({ type: 'fact_failed', fact, error: err.message });
    }
  }

  const responseText = added.length > 0
    ? `Got it! I've learned ${added.length} fact(s):\n` +
      added.map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n')
    : "I couldn't add any facts. There might have been an issue.";

  return { response: responseText, actions };
}

/**
 * Perform ontology auto-discovery cycle
 * Recursively finds missing concepts and generates facts for them
 *
 * @param {object} ctx - Context with llmAgent, session
 * @param {string} message - Original question for context
 * @param {number} iteration - Current iteration (for recursion limit)
 * @returns {Promise<{factsAdded: number, iterations: number, conceptsDiscovered: string[]}>}
 */
async function performOntologyDiscovery(ctx, message, iteration = 0) {
  const { llmAgent, session } = ctx;
  const maxIterations = ONTOLOGY_CONFIG.maxIterations;

  if (!ONTOLOGY_CONFIG.enabled || iteration >= maxIterations) {
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  // Step 1: Check for missing concepts
  let missingResult;
  try {
    const env = session.run([`@m MISSING "${message.replace(/"/g, '\\"')}"`]);
    missingResult = env.m;
  } catch (err) {
    // MISSING command not available or failed
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  // If no missing concepts, we're done
  if (!missingResult || !missingResult.missing || missingResult.missing.length === 0) {
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  const missingConcepts = missingResult.missing;

  // Step 2: Get existing facts for context
  const factsEnv = session.run(['@r any FACTS_MATCHING any']);
  const existingFacts = factsEnv.r || [];

  // Step 3: Generate facts for missing concepts using LLM
  const prompt = buildOntologyFactsPrompt(missingConcepts, message, existingFacts);
  let generatedFacts = [];

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'generate-ontology-facts' }
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      generatedFacts = parsed.facts || [];
    }
  } catch (err) {
    // LLM failed, return what we have
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  // Step 4: Add generated facts to knowledge base
  let factsAdded = 0;
  const conceptsDiscovered = new Set();

  for (const fact of generatedFacts) {
    if (!fact.subject || !fact.relation || !fact.object) continue;

    try {
      session.run([`@disc${factsAdded} ${fact.subject} ${fact.relation} ${fact.object}`]);
      factsAdded++;
      conceptsDiscovered.add(fact.subject);
      conceptsDiscovered.add(fact.object);
    } catch (err) {
      // Skip failed facts (might be duplicates or invalid)
    }
  }

  // Step 5: If we added facts, recurse to check for more missing concepts
  if (factsAdded > 0) {
    const nextResult = await performOntologyDiscovery(ctx, message, iteration + 1);
    return {
      factsAdded: factsAdded + nextResult.factsAdded,
      iterations: nextResult.iterations,
      conceptsDiscovered: [...conceptsDiscovered, ...nextResult.conceptsDiscovered]
    };
  }

  return {
    factsAdded,
    iterations: iteration + 1,
    conceptsDiscovered: [...conceptsDiscovered]
  };
}

/**
 * Handle questions
 */
export async function handleAsk(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

  // Step 0: Perform ontology auto-discovery before answering
  let discoveryResult = { factsAdded: 0, iterations: 0, conceptsDiscovered: [] };
  try {
    discoveryResult = await performOntologyDiscovery(ctx, message);
    if (discoveryResult.factsAdded > 0) {
      actions.push({
        type: 'ontology_discovery',
        factsAdded: discoveryResult.factsAdded,
        iterations: discoveryResult.iterations,
        conceptsDiscovered: discoveryResult.conceptsDiscovered
      });
    }
  } catch (err) {
    // Discovery failed, continue with query anyway
  }

  const prompt = buildQuestionPrompt(message);
  let parsedQuestion = null;

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'parse-question' }
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedQuestion = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    // Continue with best effort
  }

  // If LLM returned an empty or unusable object (e.g., {} from a fake LLM),
  // fall back to deterministic parsing.
  if (!parsedQuestion || typeof parsedQuestion.type !== 'string') {
    parsedQuestion = null;
  }

  // Deterministic fallback for simple yes/no "IS_A" questions
  if (!parsedQuestion) {
    const fallback = fallbackParseYesNoQuestion(message);
    if (fallback) {
      parsedQuestion = fallback;
    }
  }

  // Deterministic fallback for simple causal questions
  if (!parsedQuestion) {
    const causalFallback = fallbackParseCausalQuestion(message);
    if (causalFallback) {
      parsedQuestion = causalFallback;
    }
  }

  let result;
  try {
    // Get all facts for inference (now includes discovered facts)
    const env = session.run(['@r any FACTS_MATCHING any']);
    const facts = env.r || [];

    if (parsedQuestion?.type === 'yes_no' && parsedQuestion.canonical) {
      const { subject, relation, object } = parsedQuestion.canonical;

      // Always add the query action if we have canonical form (for DSL representation)
      // This ensures [DSL Representation] is always shown in debug mode
      const canonicalQuery = {
        subject: subject || '?',
        relation: relation || 'IS_A',
        object: object || '?'
      };

      if (subject && relation && object) {
        // Use InferenceEngine for better reasoning
        const inferenceEngine = new InferenceEngine({});
        const inferResult = inferenceEngine.infer(subject, relation, object, facts);

        result = {
          truth: inferResult.truth,
          method: inferResult.method,
          confidence: inferResult.confidence || 0,
          proof: inferResult.proof || null
        };

        // If InferenceEngine returns UNKNOWN, try additional inference strategies
        if (result.truth === 'UNKNOWN') {
          // Strategy 1: Argument type inference
          // "A EATS food?" with facts "A EATS b" and "b IS_A food" => TRUE
          const argTypeResult = checkArgumentTypeInference(subject, relation, object, facts);
          if (argTypeResult.truth !== 'UNKNOWN') {
            result = argTypeResult;
          }
          // Strategy 2: For IS_A relations, check negative inference via DISJOINT_WITH
          else if (relation === 'IS_A') {
            const negativeResult = checkNegativeInference(subject, object, facts, inferenceEngine);
            if (negativeResult.truth === 'FALSE') {
              result = negativeResult;
            } else {
              // Apply closed-world assumption for IS_A if we have knowledge about the subject
              const subjectTypes = getAllTypes(subject, facts);
              if (subjectTypes.length > 0) {
                // We know what types the subject has, and target is not among them
                result = {
                  truth: 'FALSE',
                  method: 'closed_world_assumption',
                  confidence: 0.8,
                  explanation: `${subject} is known to be: ${subjectTypes.join(', ')}. There is no path to ${object}.`,
                  proof: {
                    steps: [
                      { fact: `${subject} has known types: ${subjectTypes.join(', ')}`, justification: 'known_types' },
                      { fact: `No IS_A path exists from ${subject} to ${object}`, justification: 'no_transitive_path' },
                      { conclusion: `Under closed-world assumption, ${subject} is not a ${object}` }
                    ]
                  }
                };
              }
            }
          }
        }
      } else {
        // Incomplete parse - still record what we could extract
        result = {
          truth: 'UNKNOWN',
          method: 'incomplete_parse',
          confidence: 0,
          explanation: `Could not fully parse question. Extracted: subject=${subject || '?'}, relation=${relation || '?'}, object=${object || '?'}`
        };
      }

      // Always add query action to ensure DSL is shown
      actions.push({ type: 'query', query: canonicalQuery, result });
    } else if (parsedQuestion?.type === 'causes' || parsedQuestion?.type === 'effects') {
      const subject = parsedQuestion.canonical?.subject || '';
      const causeFacts = facts.filter(f =>
        (f.relation === 'CAUSES' && f.subject.toLowerCase() === subject.toLowerCase()) ||
        (f.relation === 'CAUSED_BY' && f.object.toLowerCase() === subject.toLowerCase())
      );
      result = { causes: causeFacts.map(f => f.relation === 'CAUSES' ? f.object : f.subject) };
      actions.push({ type: 'causes_query', result });
    } else if (parsedQuestion?.type === 'list') {
      const subject = parsedQuestion.canonical?.subject || '';
      const matchingFacts = facts.filter(f =>
        f.subject.toLowerCase().includes(subject.toLowerCase()) ||
        f.object.toLowerCase().includes(subject.toLowerCase())
      );
      result = { facts: matchingFacts };
      actions.push({ type: 'list_facts', result });
    } else {
      // General query - try to extract subject/relation/object and use inference
      const env2 = session.run([`@q ASK "${message}"`]);
      result = env2.q || env2.result || {};
      // Include a placeholder query object so DSL representation can be generated
      actions.push({ type: 'query', query: { subject: '?', relation: 'QUERY', object: message }, result });
    }
  } catch (err) {
    result = { error: err.message };
    actions.push({ type: 'query_error', error: err.message });
  }

  const nlResponse = await generateResponse(ctx, result, message);
  return { response: nlResponse, actions };
}

/**
 * Fallback parser for simple yes/no questions about type membership.
 * Examples:
 *  - "Is Socrates a human?"
 *  - "Is Socrates mortal?"
 *  - "Este Socrate un om?"
 */
function fallbackParseYesNoQuestion(message) {
  const trimmed = String(message).trim().replace(/\?+$/, '');

  // English: "Is X a/an Y"
  let m = trimmed.match(/^Is\s+(.+?)\s+(?:a|an)\s+(.+)$/i);
  if (m) {
    const subject = m[1].trim();
    const object = normalizeConceptName(m[2]);
    return {
      type: 'yes_no',
      canonical: {
        subject,
        relation: 'IS_A',
        object
      }
    };
  }

  // English: "Is X Y"
  m = trimmed.match(/^Is\s+(.+?)\s+(.+)$/i);
  if (m) {
    const subject = m[1].trim();
    const object = normalizeConceptName(m[2]);
    return {
      type: 'yes_no',
      canonical: {
        subject,
        relation: 'IS_A',
        object
      }
    };
  }

  // Romanian: "Este X un/ o Y" / "E X un/ o Y"
  m = trimmed.match(/^(?:Este|E)\s+(.+?)\s+(?:un|o)\s+(.+)$/i);
  if (m) {
    const subject = m[1].trim();
    const object = normalizeConceptName(m[2]);
    return {
      type: 'yes_no',
      canonical: {
        subject,
        relation: 'IS_A',
        object
      }
    };
  }

  return null;
}

/**
 * Fallback parser for simple causal questions.
 * Example:
 *  - "What does heat cause?"
 */
function fallbackParseCausalQuestion(message) {
  const trimmed = String(message).trim().replace(/\?+$/, '');

  // English: "What does X cause?"
  const m = trimmed.match(/^What\s+does\s+(.+?)\s+cause$/i);
  if (m) {
    const subject = normalizeConceptName(m[1]);
    return {
      type: 'causes',
      canonical: {
        subject
      }
    };
  }

  return null;
}

/**
 * Check for negative inference using DISJOINT_WITH
 * E.g., "Is Sparky a mammal?" when Sparky IS_A bird and bird DISJOINT_WITH mammal
 */
function checkNegativeInference(subject, targetType, facts, inferenceEngine) {
  // Find all types of subject
  const subjectTypes = getAllTypes(subject, facts);

  // Check if any of subject's types are disjoint with targetType
  for (const subjectType of subjectTypes) {
    // Direct disjointness
    const disjoint = facts.find(f =>
      f.relation === 'DISJOINT_WITH' &&
      ((f.subject.toLowerCase() === subjectType.toLowerCase() && f.object.toLowerCase() === targetType.toLowerCase()) ||
       (f.object.toLowerCase() === subjectType.toLowerCase() && f.subject.toLowerCase() === targetType.toLowerCase()))
    );

    if (disjoint) {
      return {
        truth: 'FALSE',
        method: 'disjoint_inference',
        confidence: 1.0,
        explanation: `${subject} is a ${subjectType}, and ${subjectType} is disjoint with ${targetType}`,
        proof: {
          steps: [
            { fact: `${subject} IS_A ${subjectType}`, justification: 'type_membership' },
            { fact: `${subjectType} DISJOINT_WITH ${targetType}`, justification: 'disjointness_constraint' },
            { conclusion: `Therefore ${subject} cannot be a ${targetType}` }
          ]
        }
      };
    }

    // Check ancestors of targetType for disjointness
    const targetAncestors = getAllTypes(targetType, facts);
    for (const ancestor of targetAncestors) {
      const ancestorDisjoint = facts.find(f =>
        f.relation === 'DISJOINT_WITH' &&
        ((f.subject.toLowerCase() === subjectType.toLowerCase() && f.object.toLowerCase() === ancestor.toLowerCase()) ||
         (f.object.toLowerCase() === subjectType.toLowerCase() && f.subject.toLowerCase() === ancestor.toLowerCase()))
      );

      if (ancestorDisjoint) {
        return {
          truth: 'FALSE',
          method: 'inherited_disjoint_inference',
          confidence: 0.95,
          explanation: `${subject} is a ${subjectType}, which is disjoint with ${ancestor} (ancestor of ${targetType})`,
          proof: {
            steps: [
              { fact: `${subject} IS_A ${subjectType}`, justification: 'type_membership' },
              { fact: `${targetType} IS_A ${ancestor}`, justification: 'type_hierarchy' },
              { fact: `${subjectType} DISJOINT_WITH ${ancestor}`, justification: 'disjointness_constraint' }
            ]
          }
        };
      }
    }
  }

  return { truth: 'UNKNOWN', method: 'no_disjoint_found' };
}

/**
 * Get all types (direct and inherited) for an entity
 */
function getAllTypes(entity, facts) {
  const types = new Set();
  const queue = [entity.toLowerCase()];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const directTypes = facts
      .filter(f => f.relation === 'IS_A' && f.subject.toLowerCase() === current)
      .map(f => f.object.toLowerCase());

    for (const t of directTypes) {
      types.add(t);
      queue.push(t);
    }
  }

  return Array.from(types);
}

/**
 * Check argument type inference
 * E.g., "A EATS food?" with facts "A EATS b" and "b IS_A food" => TRUE
 * This checks if subject has the given relation with any instance of the object type
 */
function checkArgumentTypeInference(subject, relation, objectType, facts) {
  const subjectLower = subject.toLowerCase();
  const relationUpper = relation.toUpperCase();
  const objectTypeLower = objectType.toLowerCase();

  // Find all facts where subject has this relation with something
  const relatedFacts = facts.filter(f =>
    f.subject.toLowerCase() === subjectLower &&
    f.relation.toUpperCase() === relationUpper
  );

  // For each related object, check if it IS_A objectType
  for (const fact of relatedFacts) {
    const relatedObject = fact.object;
    const objectTypes = getAllTypes(relatedObject, facts);

    // Direct match: the related object IS the type we're asking about
    if (relatedObject.toLowerCase() === objectTypeLower) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'direct_type_match',
        confidence: 1,
        explanation: `${subject} ${relation} ${relatedObject}, and ${relatedObject} is exactly ${objectType}`,
        proof: {
          steps: [
            { fact: `${subject} ${relation} ${relatedObject}`, justification: 'direct_fact' },
            { conclusion: `Therefore ${subject} ${relation} ${objectType}` }
          ]
        }
      };
    }

    // Type inference: the related object is an instance of objectType
    if (objectTypes.includes(objectTypeLower)) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'argument_type_inference',
        confidence: 0.95,
        explanation: `${subject} ${relation} ${relatedObject}, and ${relatedObject} IS_A ${objectType}`,
        proof: {
          steps: [
            { fact: `${subject} ${relation} ${relatedObject}`, justification: 'direct_fact' },
            { fact: `${relatedObject} IS_A ${objectType}`, justification: 'type_membership' },
            { conclusion: `Therefore ${subject} ${relation} something that is ${objectType}` }
          ]
        }
      };
    }
  }

  // Also check reverse: maybe objectType instances have this relation with subject
  // E.g., "food EATEN_BY A?" with "b EATEN_BY A" and "b IS_A food"
  const reverseRelatedFacts = facts.filter(f =>
    f.object.toLowerCase() === subjectLower &&
    f.relation.toUpperCase() === relationUpper
  );

  for (const fact of reverseRelatedFacts) {
    const relatedSubject = fact.subject;
    const subjectTypes = getAllTypes(relatedSubject, facts);

    if (relatedSubject.toLowerCase() === objectTypeLower ||
        subjectTypes.includes(objectTypeLower)) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'argument_type_inference_reverse',
        confidence: 0.95,
        explanation: `${relatedSubject} ${relation} ${subject}, and ${relatedSubject} IS_A ${objectType}`,
        proof: {
          steps: [
            { fact: `${relatedSubject} ${relation} ${subject}`, justification: 'direct_fact' },
            { fact: `${relatedSubject} IS_A ${objectType}`, justification: 'type_membership' }
          ]
        }
      };
    }
  }

  return { truth: 'UNKNOWN', method: 'no_argument_type_match' };
}

/**
 * Handle file imports
 */
export async function handleImport(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

  let filepath = details?.filepath;
  if (!filepath) {
    const pathMatch = message.match(/(?:import|load|read)\s+(?:file\s+)?["']?([^\s"']+)["']?/i);
    if (pathMatch) {
      filepath = pathMatch[1];
    }
  }

  if (!filepath) {
    return {
      response: "Please specify a file path, e.g., 'import file theories/my_facts.txt'",
      actions: []
    };
  }

  const resolvedPath = path.isAbsolute(filepath)
    ? filepath
    : path.resolve(process.cwd(), filepath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      response: `File not found: ${resolvedPath}`,
      actions: [{ type: 'import_error', error: 'File not found', path: resolvedPath }]
    };
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

    let totalFacts = 0;
    for (const line of lines.slice(0, 100)) {
      const prompt = buildFactExtractionPrompt(line);
      try {
        const response = await llmAgent.complete({
          prompt,
          mode: 'fast',
          context: { intent: 'extract-facts-import' }
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const fact of (parsed.facts || [])) {
            try {
              session.run([`@imp${totalFacts} ${fact.subject} ${fact.relation} ${fact.object}`]);
              totalFacts++;
            } catch {
              // Skip failed facts
            }
          }
        }
      } catch {
        // Skip failed lines
      }
    }

    actions.push({ type: 'import_success', path: resolvedPath, factsImported: totalFacts });
    return {
      response: `Imported ${totalFacts} facts from ${path.basename(resolvedPath)}`,
      actions
    };
  } catch (err) {
    return {
      response: `Error reading file: ${err.message}`,
      actions: [{ type: 'import_error', error: err.message }]
    };
  }
}

/**
 * Handle theory management commands
 */
export async function handleTheoryManagement(ctx, message, details) {
  const { session, theoriesRoot, setCurrentTheory, currentTheory } = ctx;
  const actions = [];
  const lower = message.toLowerCase();

  if (lower.includes('create') || lower.includes('new')) {
    const nameMatch = message.match(/(?:create|new)\s+(?:theory\s+)?["']?([a-zA-Z0-9_]+)["']?/i);
    const name = nameMatch?.[1] || `theory_${Date.now()}`;

    session.run([`@r ${name} THEORY_PUSH any`]);
    setCurrentTheory(name);
    actions.push({ type: 'theory_created', name });

    return {
      response: `Created new theory branch: "${name}". All new facts will be added to this context.`,
      actions
    };
  }

  if (lower.includes('pop') || lower.includes('discard')) {
    const env = session.run(['@r any THEORY_POP any']);
    actions.push({ type: 'theory_popped', result: env.r });

    return {
      response: `Discarded current theory layer. Returned to previous context.`,
      actions
    };
  }

  if (lower.includes('list') || lower.includes('show')) {
    const env = session.run(['@r any LIST_THEORIES any']);
    const theories = env.r || {};
    actions.push({ type: 'theories_listed', theories });

    return {
      response: `Current theory stack:\n${JSON.stringify(theories, null, 2)}`,
      actions
    };
  }

  if (lower.includes('save')) {
    const nameMatch = message.match(/save\s+(?:as\s+)?["']?([a-zA-Z0-9_]+)["']?/i);
    const name = nameMatch?.[1] || currentTheory;
    const filepath = path.join(theoriesRoot, `${name}.sys2dsl`);

    const env = session.run(['@r any FACTS_MATCHING any']);
    const facts = env.r || [];
    const content = facts.map(f => `${f.subject} ${f.relation} ${f.object}`).join('\n');
    fs.writeFileSync(filepath, content, 'utf8');

    actions.push({ type: 'theory_saved', name, path: filepath });
    return {
      response: `Saved theory "${name}" to ${filepath}`,
      actions
    };
  }

  return {
    response: `Theory management commands:\n` +
      `- "create new theory [name]" - create a new theory branch\n` +
      `- "pop theory" - discard current layer\n` +
      `- "list theories" - show theory stack\n` +
      `- "save theory [name]" - save current theory to file`,
    actions
  };
}

/**
 * Handle list commands
 */
export async function handleList(ctx, details) {
  const { session } = ctx;
  const what = details?.what || 'facts';
  const actions = [];

  if (what === 'facts' || what === 'all') {
    const env = session.run(['@r any FACTS_MATCHING any']);
    const facts = env.r || [];
    actions.push({ type: 'facts_listed', facts });

    if (facts.length === 0) {
      return { response: 'No facts stored yet. Teach me something!', actions };
    }

    return {
      response: `Current facts (${facts.length}):\n` +
        facts.slice(0, 20).map(f => `- ${f.subject} ${f.relation} ${f.object}`).join('\n') +
        (facts.length > 20 ? `\n... and ${facts.length - 20} more` : ''),
      actions
    };
  }

  if (what === 'concepts') {
    const conceptStore = session.engine.conceptStore;
    const concepts = conceptStore.listConcepts();
    actions.push({ type: 'concepts_listed', concepts });

    return {
      response: `Known concepts (${concepts.length}):\n${concepts.slice(0, 30).join(', ')}` +
        (concepts.length > 30 ? ` ... and ${concepts.length - 30} more` : ''),
      actions
    };
  }

  if (what === 'theories') {
    return handleTheoryManagement(ctx, 'list theories', {});
  }

  return {
    response: `You can list: facts, concepts, or theories`,
    actions
  };
}

/**
 * Handle help command
 */
export function handleHelp() {
  return {
    response: `AGISystem2 Chat Help

I can help you manage knowledge through natural conversation:

**Teaching facts:**
- "Dogs are animals"
- "Fire causes smoke"
- "Paris is located in France"

**Asking questions:**
- "Is a dog an animal?"
- "What causes smoke?"
- "Tell me about Paris"

**Importing files:**
- "Import file my_facts.txt"

**Managing theories (knowledge contexts):**
- "Create new theory medical_knowledge"
- "List theories"
- "Save theory as my_theory"

**Listing knowledge:**
- "List all facts"
- "Show me the concepts"

I automatically detect contradictions and suggest creating theory branches when needed.`,
    actions: [{ type: 'help_shown' }]
  };
}

/**
 * Check for contradictions with existing facts
 * Uses deterministic ContradictionDetector first, LLM as supplementary check
 */
export async function checkContradictions(ctx, newFacts) {
  const { llmAgent, session } = ctx;
  const contradictions = [];

  // Get existing facts from session
  const env = session.run(['@r any FACTS_MATCHING any']);
  const existingFacts = env.r || [];

  // Convert to format ContradictionDetector expects
  const existingFactObjects = existingFacts.map(f => {
    if (typeof f === 'string') {
      const parts = f.split(/\s+/);
      return { subject: parts[0], relation: parts[1], object: parts.slice(2).join(' ') };
    }
    return f;
  });

  // Step 1: Deterministic contradiction detection (if enabled)
  if (CONTRADICTION_CONFIG.enableDeterministicCheck) {
    const detector = new ContradictionDetector();

    // Evaluate contradictions on the combined set of existing + all new facts.
    // This ensures contradictions between multiple new facts in the same
    // teaching batch are detected (e.g., "Cats are mammals. Cats are fish.").
    const allFacts = [...existingFactObjects, ...newFacts];
    const report = detector.detectAll(allFacts);

    if (!report.consistent) {
      for (const newFact of newFacts) {
        for (const c of report.contradictions) {
          const involvesNew =
            (c.facts && c.facts.some(f =>
              f.subject === newFact.subject &&
              f.relation === newFact.relation &&
              f.object === newFact.object
            )) ||
            (c.entity === newFact.subject);

          if (involvesNew) {
            contradictions.push({
              newFact,
              conflicts: [{ reason: c.explanation }],
              reason: c.explanation,
              type: c.type
            });
          }
        }
      }
    }
  }

  // Step 2: LLM semantic check (if enabled and deterministic found nothing)
  // Note: This is disabled by default as it causes many false positives
  if (CONTRADICTION_CONFIG.enableLLMSemanticCheck && contradictions.length === 0 && llmAgent) {
    for (const newFact of newFacts) {
      const prompt = buildContradictionPrompt(newFact, existingFacts);

      try {
        const response = await llmAgent.complete({
          prompt,
          mode: 'fast',
          context: { intent: 'check-contradiction' }
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.contradicts && result.severity !== 'none') {
            contradictions.push({
              newFact,
              conflicts: result.conflicts,
              reason: result.conflicts?.[0]?.reason || 'Potential contradiction detected',
              type: 'LLM_SEMANTIC'
            });
          }
        }
      } catch {
        // Continue without LLM check
      }
    }
  }

  return contradictions;
}

/**
 * Suggest a theory branch name
 */
export async function suggestTheoryBranch(ctx, facts, contradictions) {
  const { llmAgent } = ctx;
  const reason = contradictions.map(c => c.reason).join('; ');
  const prompt = buildTheoryNamePrompt(facts, reason);

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'suggest-theory-name' }
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        name: result.suggested_name || `alternative_${Date.now()}`,
        description: result.description || 'Alternative theory branch'
      };
    }
  } catch {
    // Fallback
  }

  return {
    name: `alternative_${Date.now()}`,
    description: 'Alternative theory branch'
  };
}

/**
 * Generate natural language response
 */
export async function generateResponse(ctx, result, originalQuestion) {
  const { llmAgent } = ctx;
  const prompt = buildResponsePrompt(result, originalQuestion);

  try {
    const response = await llmAgent.complete({
      prompt,
      mode: 'fast',
      context: { intent: 'generate-response' }
    });
    return response.trim();
  } catch {
    if (result.truth !== undefined) {
      return result.truth === 'TRUE_CERTAIN' || result.truth === true
        ? 'Yes, that appears to be true based on what I know.'
        : result.truth === 'FALSE_CERTAIN' || result.truth === false
          ? 'No, that doesn\'t seem to be the case.'
          : 'I\'m not certain about that.';
    }
    return JSON.stringify(result, null, 2);
  }
}

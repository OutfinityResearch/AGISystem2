/**
 * DS(/chat/handlers_ask.mjs) - Question handling and response generation
 *
 * Contains chat intent handlers and helpers for answering questions:
 * - handleAsk: main question handler
 * - generateResponse: NL response generation from structured result
 */

import { createRequire } from 'node:module';
import {
  buildQuestionPrompt,
  buildResponsePrompt,
  buildOntologyFactsPrompt
} from './prompts.mjs';
import {
  normalizeConceptName,
  fallbackParseYesNoQuestion,
  fallbackParseCausalQuestion,
  getAllTypes,
  checkArgumentTypeInference,
  checkNegativeInference
} from './handler_utils.mjs';

const require = createRequire(import.meta.url);
const InferenceEngine = require('../src/reason/inference_engine.js');

/**
 * Perform ontology auto-discovery cycle (MISSING → facts → recurse).
 */
async function performOntologyDiscovery(ctx, message, iteration = 0, config) {
  const { llmAgent, session } = ctx;
  const maxIterations = config.maxIterations;

  if (!config.enabled || iteration >= maxIterations) {
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  let missingResult;
  try {
    const env = session.run([`@m MISSING "${message.replace(/"/g, '\\"')}"`]);
    missingResult = env.m;
  } catch {
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  if (!missingResult || !missingResult.missing || missingResult.missing.length === 0) {
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  const missingConcepts = missingResult.missing;

  const factsEnv = session.run(['@r any FACTS_MATCHING any']);
  const existingFacts = factsEnv.r || [];

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
  } catch {
    return { factsAdded: 0, iterations: iteration, conceptsDiscovered: [] };
  }

  let factsAdded = 0;
  const conceptsDiscovered = new Set();

  for (const fact of generatedFacts) {
    if (!fact.subject || !fact.relation || !fact.object) continue;

    try {
      session.run([`@disc${factsAdded} ${fact.subject} ${fact.relation} ${fact.object}`]);
      factsAdded++;
      conceptsDiscovered.add(fact.subject);
      conceptsDiscovered.add(fact.object);
    } catch {
      // Skip invalid/duplicate
    }
  }

  if (factsAdded > 0) {
    const nextResult = await performOntologyDiscovery(ctx, message, iteration + 1, config);
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

export async function handleAsk(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

  // Ontology auto-discovery before answering
  if (ctx.ontologyConfig) {
    try {
      const discoveryResult = await performOntologyDiscovery(ctx, message, 0, ctx.ontologyConfig);
      if (discoveryResult.factsAdded > 0) {
        actions.push({
          type: 'ontology_discovery',
          factsAdded: discoveryResult.factsAdded,
          iterations: discoveryResult.iterations,
          conceptsDiscovered: discoveryResult.conceptsDiscovered
        });
      }
    } catch {
      // Discovery failure is non-fatal
    }
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
  } catch {
    // keep parsedQuestion = null
  }

  if (!parsedQuestion || typeof parsedQuestion.type !== 'string') {
    parsedQuestion = null;
  }

  if (!parsedQuestion) {
    const fallback = fallbackParseYesNoQuestion(message);
    if (fallback) {
      parsedQuestion = fallback;
    }
  }

  if (!parsedQuestion) {
    const causalFallback = fallbackParseCausalQuestion(message);
    if (causalFallback) {
      parsedQuestion = causalFallback;
    }
  }

  let result;
  try {
    const env = session.run(['@r any FACTS_MATCHING any']);
    const facts = env.r || [];

    if (parsedQuestion?.type === 'yes_no' && parsedQuestion.canonical) {
      const { subject, relation, object } = parsedQuestion.canonical;
      const canonicalQuery = {
        subject: subject || '?',
        relation: relation || 'IS_A',
        object: object || '?'
      };

      if (subject && relation && object) {
        const inferenceEngine = new InferenceEngine({});
        const inferResult = inferenceEngine.infer(subject, relation, object, facts);

        result = {
          truth: inferResult.truth,
          method: inferResult.method,
          confidence: inferResult.confidence || 0,
          proof: inferResult.proof || null
        };

        if (result.truth === 'UNKNOWN') {
          const argTypeResult = checkArgumentTypeInference(subject, relation, object, facts);
          if (argTypeResult.truth !== 'UNKNOWN') {
            result = argTypeResult;
          } else if (relation === 'IS_A') {
            const negativeResult = checkNegativeInference(subject, object, facts);
            if (negativeResult.truth === 'FALSE') {
              result = negativeResult;
            } else {
              const subjectTypes = getAllTypes(subject, facts);
              if (subjectTypes.length > 0) {
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
        result = {
          truth: 'UNKNOWN',
          method: 'incomplete_parse',
          confidence: 0,
          explanation: `Could not fully parse question. Extracted: subject=${subject || '?'}, relation=${relation || '?'}, object=${object || '?'}`
        };
      }

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
      const env2 = session.run([`@q ASK "${message}"`]);
      result = env2.q || env2.result || {};
      actions.push({ type: 'query', query: { subject: '?', relation: 'QUERY', object: message }, result });
    }
  } catch (err) {
    result = { error: err.message };
    actions.push({ type: 'query_error', error: err.message });
  }

  const nlResponse = await generateResponse(ctx, result, message);
  return { response: nlResponse, actions };
}

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


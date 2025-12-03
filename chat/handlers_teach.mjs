/**
 * DS(/chat/handlers_teach.mjs) - Teaching & contradiction handlers
 *
 * Contains chat intent handlers and helpers for teaching facts:
 * - handleTeach: teach new facts from NL
 * - ONTOLOGY_CONFIG / CONTRADICTION_CONFIG: behaviour knobs
 * - checkContradictions / suggestTheoryBranch: contradiction handling
 */

import { createRequire } from 'node:module';
import {
  buildFactExtractionPrompt,
  buildContradictionPrompt,
  buildTheoryNamePrompt
} from './prompts.mjs';
import {
  normalizeConceptName,
  extractFactsDeterministic
} from './handler_utils.mjs';

const require = createRequire(import.meta.url);
const ContradictionDetector = require('../src/reason/contradiction_detector.js');

/**
 * Configuration for ontology auto-discovery (exported for callers).
 * Currently only used in question handling but kept here for global config.
 */
export const ONTOLOGY_CONFIG = {
  maxIterations: 5,
  minFactsPerConcept: 5,
  maxFactsPerConcept: 15,
  enabled: true
};

/**
 * Configuration for contradiction checking.
 */
export const CONTRADICTION_CONFIG = {
  enableLLMSemanticCheck: false,
  enableDeterministicCheck: true,
  blockOnContradiction: true
};

/**
 * Handle teaching new facts
 */
export async function handleTeach(ctx, message, details) {
  const { llmAgent, session } = ctx;
  const actions = [];

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

  facts = (facts || []).filter(
    (f) => f && typeof f.subject === 'string' && typeof f.relation === 'string' && typeof f.object === 'string'
  );

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

  if (!facts || facts.length === 0) {
    const deterministicFacts = extractFactsDeterministic(message);
    if (deterministicFacts.length > 0) {
      facts = deterministicFacts;
      usedDeterministic = true;
    }
  }

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

  let contradictions = [];
  if (CONTRADICTION_CONFIG.enableDeterministicCheck || CONTRADICTION_CONFIG.enableLLMSemanticCheck) {
    contradictions = await checkContradictions(ctx, facts);
  }

  if (CONTRADICTION_CONFIG.blockOnContradiction && contradictions.length > 0) {
    const suggestion = await suggestTheoryBranch(ctx, facts, contradictions);

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
 * Check for contradictions with existing facts.
 * Uses deterministic ContradictionDetector first, LLM as supplementary check.
 */
export async function checkContradictions(ctx, newFacts) {
  const { llmAgent, session } = ctx;
  const contradictions = [];

  const env = session.run(['@r any FACTS_MATCHING any']);
  const existingFacts = env.r || [];

  const existingFactObjects = existingFacts.map(f => {
    if (typeof f === 'string') {
      const parts = f.split(/\s+/);
      return { subject: parts[0], relation: parts[1], object: parts.slice(2).join(' ') };
    }
    return f;
  });

  if (CONTRADICTION_CONFIG.enableDeterministicCheck) {
    const detector = new ContradictionDetector();
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
 * Suggest a theory branch name using LLM, with deterministic fallback.
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


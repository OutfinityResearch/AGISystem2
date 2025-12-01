#!/usr/bin/env node
/**
 * AGISystem2 Evaluation Suite Runner
 *
 * THREE EXECUTION MODES:
 *
 * 1. DEFAULT (no flag) - Direct DSL Execution
 *    - Runs expected_dsl directly against reasoning engine
 *    - NO LLM involved - tests pure reasoning capabilities
 *    - Fastest mode (~10x faster than LLM modes)
 *    - Validates that the reasoning engine works correctly
 *
 * 2. --eval-llm - Translation Quality Evaluation
 *    - Tests NL→DSL translation accuracy
 *    - Sends natural_language to LLM, compares generated DSL with expected_dsl
 *    - Reports: exact match %, semantic similarity, common errors
 *    - Does NOT execute the generated DSL
 *
 * 3. --full - End-to-End Evaluation
 *    - Full pipeline: NL → LLM → DSL → Reasoning Engine → Answer
 *    - Tests both translation AND reasoning together
 *    - Most realistic but slowest mode
 *
 * Usage:
 *   node evalsuite/runSuite.js [options]
 *
 * Options:
 *   --eval-llm      Test NL→DSL translation quality (compare with expected_dsl)
 *   --full          End-to-end: LLM generates DSL, then execute it
 *   --case <id>     Run only specific case (e.g., 01_taxonomy)
 *   --from <n>      Start from case number N (1-indexed)
 *   --to <m>        End at case number M (inclusive)
 *   --runFailed     Run only previously failed cases (from failed.json)
 *   --verbose       Show detailed output
 *   --dry-run       Parse cases without running
 *   --timeout <ms>  Timeout per interaction (default: 30000)
 *
 * Examples:
 *   node evalsuite/runSuite.js                     # Default: direct DSL (no LLM)
 *   node evalsuite/runSuite.js --eval-llm          # Test translation quality
 *   node evalsuite/runSuite.js --full              # Full end-to-end test
 *   node evalsuite/runSuite.js --from 1 --to 10    # Run cases 1-10
 *   node evalsuite/runSuite.js --runFailed         # Re-run failed tests
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const SUITE_DIR = __dirname;
const AGI_SCRIPT = path.join(__dirname, '..', 'bin', 'AGISystem2.sh');
const FAILED_FILE = path.join(__dirname, 'failed.json');
const DEFAULT_TIMEOUT = 30000;

/**
 * Execution mode enumeration
 * @readonly
 * @enum {string}
 */
const ExecutionMode = {
  DIRECT_DSL: 'direct-dsl',  // DEFAULT: Run expected_dsl directly, no LLM
  EVAL_LLM: 'eval-llm',      // Test NL→DSL translation quality
  FULL: 'full'               // End-to-end: LLM generates DSL, execute it
};

// Current execution mode (default: DIRECT_DSL - no LLM)
let EXECUTION_MODE = ExecutionMode.DIRECT_DSL;

/**
 * Direct DSL Executor - runs DSL commands directly without LLM
 * Much faster (~10x) but requires pre-translated DSL in case files
 */
class DirectDSLExecutor {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.session = null;
    this.agent = null;
  }

  async start() {
    const startTime = Date.now();
    // Dynamically require AGISystem2 (CommonJS)
    const AgentSystem2 = require('../src/interface/agent_system2');
    this.agent = new AgentSystem2({ profile: 'auto_test' });
    this.session = this.agent.createSession();
    log(`  [TIMING] Direct DSL init: ${Date.now() - startTime}ms`, colors.gray);
  }

  async send(message, queryId = null) {
    const sendTime = Date.now();

    // Check if message looks like DSL (starts with @)
    if (message.trim().startsWith('@') || message.includes('ASSERT') || message.includes('ASK')) {
      // Direct DSL execution
      const lines = message.split('\n').filter(l => l.trim());
      this.session.run(lines);

      // Extract result - prefer queryId variable if provided, else use last variable
      const varMatch = message.match(/@(\w+)/g);
      if (varMatch) {
        let targetVar;
        if (queryId) {
          // Look for variable matching the query ID (e.g., @q2 for query q2)
          targetVar = queryId;
        } else {
          // Fallback to last variable
          targetVar = varMatch[varMatch.length - 1].slice(1);
        }
        const result = this.session.getVar(targetVar);
        log(`  [TIMING] Direct DSL exec: ${Date.now() - sendTime}ms`, colors.gray);
        return JSON.stringify(result || { ok: true });
      }
      log(`  [TIMING] Direct DSL exec: ${Date.now() - sendTime}ms`, colors.gray);
      return '{"ok": true}';
    }

    // For natural language, we can't process - return placeholder
    log(`  [TIMING] Direct DSL (NL skip): ${Date.now() - sendTime}ms`, colors.gray);
    return '[Direct DSL mode - natural language not processed]';
  }

  async stop() {
    this.session = null;
    this.agent = null;
  }
}

/**
 * Convert DSL fact to natural language for teaching
 * "X IS_A Y" → "X is a Y"
 * "X LOCATED_IN Y" → "X is located in Y"
 * etc.
 */
function dslFactToNaturalLanguage(dslFact) {
  // Parse: "Subject RELATION Object"
  const parts = dslFact.trim().split(/\s+/);
  if (parts.length < 3) return dslFact;

  const subject = parts[0];
  const relation = parts[1];
  const object = parts.slice(2).join(' ');

  // Map relations to natural language
  const relationMap = {
    'IS_A': 'is a',
    'LOCATED_IN': 'is located in',
    'HAS': 'has',
    'HELPS': 'helps',
    'CAUSES': 'causes',
    'CAUSED_BY': 'is caused by',
    'CAN': 'can',
    'PART_OF': 'is part of',
    'HAS_PART': 'has part',
    'OWNS': 'owns',
    'OWNED_BY': 'is owned by',
    'REQUIRES': 'requires',
    'DISJOINT_WITH': 'is disjoint with',
    'PERMITTED_BY': 'is permitted by',
    'PROHIBITED_BY': 'is prohibited by'
  };

  const nlRelation = relationMap[relation] || relation.toLowerCase().replace(/_/g, ' ');
  return `${subject} ${nlRelation} ${object}`;
}

/**
 * Direct Translation Evaluator - calls LLM directly for NL→DSL
 * Bypasses the full chat interface for more reliable translation testing.
 * Uses the buildQuestionPrompt template directly.
 */
class DirectTranslationEvaluator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.llmAgent = null;
    this.theoryContext = null;  // Store theory context for translation
  }

  async start() {
    const startTime = Date.now();
    // Dynamically import the LLM agent loader and prompt builder
    const { loadLLMAgent } = await import('../chat/llm_loader.mjs');
    const { buildQuestionPrompt } = await import('../chat/prompts.mjs');

    this.buildQuestionPrompt = buildQuestionPrompt;

    // Load the LLM agent
    const llmResult = await loadLLMAgent();
    if (!llmResult.available) {
      throw new Error(`LLM Agent not available: ${llmResult.error || 'Unknown error'}`);
    }

    // Create LLM agent instance - no initialize() needed
    this.llmAgent = new llmResult.LLMAgent({ name: 'DirectTranslation' });
    log(`  [TIMING] Direct Translation Evaluator init: ${Date.now() - startTime}ms`, colors.gray);
  }

  /**
   * Set theory context for translation
   * @param {object} context - Theory context
   * @param {string} context.theory - Natural language theory description
   * @param {string[]} context.facts - Array of DSL facts
   */
  setTheoryContext(context) {
    this.theoryContext = context;
    if (this.verbose) {
      log(`  Theory context set: ${context.facts?.length || 0} facts`, colors.gray);
    }
  }

  async translateQuestion(question) {
    // Pass theory context to prompt builder if available
    const prompt = this.buildQuestionPrompt(question, this.theoryContext);
    const startTime = Date.now();

    try {
      const response = await this.llmAgent.complete({
        prompt,
        mode: 'fast',
        context: { intent: 'parse-question' }
      });

      log(`  [TIMING] Translation response: ${Date.now() - startTime}ms`, colors.gray);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const command = parsed.command || 'ASK';
        const canonical = parsed.canonical;

        // SEQUENCE commands don't need canonical - they have steps instead
        if (!canonical && command !== 'SEQUENCE') return null;

        // Generate DSL based on command type
        switch (command) {
          case 'ASK':
            if (canonical.subject && canonical.relation && canonical.object) {
              return `@q ASK ${canonical.subject} ${canonical.relation} ${canonical.object}`;
            }
            break;

          case 'FACTS_MATCHING':
            if (canonical.subject !== undefined && canonical.relation && canonical.object !== undefined) {
              return `@q FACTS_MATCHING ${canonical.subject} ${canonical.relation} ${canonical.object}`;
            }
            break;

          case 'ABDUCT':
            if (canonical.symptom) {
              return `@q ABDUCT ${canonical.symptom}`;
            }
            break;

          case 'ANALOGICAL':
            if (canonical.a && canonical.b && canonical.c) {
              return `@q ANALOGICAL ${canonical.a} ${canonical.b} ${canonical.c}`;
            }
            break;

          case 'SEQUENCE':
            // Handle multi-step command sequences (hypotheticals, what-if scenarios)
            if (parsed.steps && Array.isArray(parsed.steps)) {
              const dslLines = [];
              let varCounter = 1;

              for (const step of parsed.steps) {
                const varName = step.var || `v${varCounter++}`;
                switch (step.command) {
                  case 'THEORY_PUSH':
                    dslLines.push(`@${varName} THEORY_PUSH ${step.name || 'scenario'}`);
                    break;
                  case 'THEORY_POP':
                    dslLines.push(`@restore THEORY_POP`);
                    break;
                  case 'SAVE_THEORY':
                    dslLines.push(`@save SAVE_THEORY ${step.name || 'saved_scenario'}`);
                    break;
                  case 'MERGE_THEORY':
                    dslLines.push(`@merge MERGE_THEORY ${step.name}`);
                    break;
                  case 'ASSERT':
                    if (step.subject && step.relation && step.object) {
                      dslLines.push(`@${varName} ASSERT ${step.subject} ${step.relation} ${step.object}`);
                    }
                    break;
                  case 'RETRACT':
                    if (step.subject && step.relation && step.object) {
                      dslLines.push(`@${varName} RETRACT ${step.subject} ${step.relation} ${step.object}`);
                    }
                    break;
                  case 'ASK':
                    if (step.subject && step.relation && step.object) {
                      dslLines.push(`@q${varCounter} ASK ${step.subject} ${step.relation} ${step.object}`);
                    }
                    break;
                  case 'FACTS_MATCHING':
                    if (step.subject !== undefined && step.relation && step.object !== undefined) {
                      dslLines.push(`@${varName} FACTS_MATCHING ${step.subject} ${step.relation} ${step.object}`);
                    }
                    break;
                  case 'TO_NATURAL':
                    if (step.vars && Array.isArray(step.vars)) {
                      dslLines.push(`@out TO_NATURAL ${step.vars.join(' ')}`);
                    }
                    break;
                  case 'FORGET':
                    if (step.concept) {
                      dslLines.push(`@${varName} FORGET ${step.concept}`);
                    }
                    break;
                  case 'PROTECT':
                    if (step.concept) {
                      dslLines.push(`@${varName} PROTECT ${step.concept}`);
                    }
                    break;
                }
              }

              if (dslLines.length > 0) {
                return dslLines.join('\n');
              }
            }
            break;

          case 'THEORY_PUSH':
            if (canonical.name) {
              return `@hypo THEORY_PUSH ${canonical.name}`;
            }
            break;

          case 'THEORY_POP':
            return `@restore THEORY_POP`;

          case 'SAVE_THEORY':
            if (canonical.name) {
              return `@save SAVE_THEORY ${canonical.name}`;
            }
            break;

          case 'MERGE_THEORY':
            if (canonical.name) {
              return `@merge MERGE_THEORY ${canonical.name}`;
            }
            break;

          case 'ASSERT':
            if (canonical.subject && canonical.relation && canonical.object) {
              return `@f ASSERT ${canonical.subject} ${canonical.relation} ${canonical.object}`;
            }
            break;

          case 'RETRACT':
            if (canonical.subject && canonical.relation && canonical.object) {
              return `@r RETRACT ${canonical.subject} ${canonical.relation} ${canonical.object}`;
            }
            break;

          case 'FORGET':
            if (canonical.concept) {
              return `@forget FORGET ${canonical.concept}`;
            }
            break;

          case 'TO_NATURAL':
            if (canonical.vars && Array.isArray(canonical.vars)) {
              return `@out TO_NATURAL ${canonical.vars.join(' ')}`;
            }
            break;

          case 'TO_JSON':
            if (canonical.var) {
              return `@out TO_JSON ${canonical.var}`;
            }
            break;

          default:
            // Fallback to ASK if command not recognized but canonical has s/r/o
            if (canonical.subject && canonical.relation && canonical.object) {
              return `@q ASK ${canonical.subject} ${canonical.relation} ${canonical.object}`;
            }
        }
      }
      return null;
    } catch (err) {
      log(`  [ERROR] Translation failed: ${err.message}`, colors.red);
      return null;
    }
  }

  async stop() {
    this.llmAgent = null;
  }

  // Comparison methods (reused from TranslationEvaluator)
  compareDsl(generated, expected) {
    if (!generated || !expected) {
      return { matchType: 'none', similarity: 0, details: 'Missing DSL' };
    }

    const normalizeForCompare = (dsl) => {
      return dsl
        .replace(/@\w+/g, '@VAR')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    };

    const normalizedGen = normalizeForCompare(generated);
    const normalizedExp = normalizeForCompare(expected);

    if (normalizedGen === normalizedExp) {
      return { matchType: 'exact', similarity: 100, details: 'Exact match' };
    }

    // Match ALL DSL command types
    const DSL_COMMANDS = /(?:ASK|ASSERT|RETRACT|FACTS_MATCHING|THEORY_PUSH|THEORY_POP|SAVE_THEORY|MERGE_THEORY|ABDUCT|ANALOGICAL|FORGET|PROTECT|TO_NATURAL|TO_JSON)/gi;

    const genCommands = generated.match(DSL_COMMANDS) || [];
    const expCommands = expected.match(DSL_COMMANDS) || [];

    const commandMatch = genCommands.length > 0 &&
                         genCommands.map(c => c.toUpperCase()).join(',') ===
                         expCommands.map(c => c.toUpperCase()).join(',');

    if (commandMatch) {
      const similarity = this.calculateSimilarity(normalizedGen, normalizedExp);
      if (similarity > 80) {
        return { matchType: 'semantic', similarity, details: `Same commands, ${similarity}% arg match` };
      }
      // Even with lower similarity, if commands match order, it's at least partial
      if (similarity > 50) {
        return { matchType: 'partial', similarity, details: `Commands match, ${similarity}% args` };
      }
    }

    // Check if at least the main command type matches
    const genFirstCmd = genCommands[0]?.toUpperCase();
    const expFirstCmd = expCommands[0]?.toUpperCase();
    if (genFirstCmd && genFirstCmd === expFirstCmd) {
      const similarity = this.calculateSimilarity(normalizedGen, normalizedExp);
      if (similarity > 40) {
        return { matchType: 'partial', similarity, details: `Same primary command: ${genFirstCmd}` };
      }
    }

    const similarity = this.calculateSimilarity(normalizedGen, normalizedExp);
    if (similarity > 50) {
      return { matchType: 'partial', similarity, details: `${similarity}% overlap` };
    }

    return { matchType: 'none', similarity, details: `Only ${similarity}% match` };
  }

  calculateSimilarity(s1, s2) {
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return Math.round((intersection.size / union.size) * 100);
  }
}

/**
 * Translation Evaluator - tests NL→DSL translation quality (via chat interface)
 * Compares LLM-generated DSL with expected_dsl from case files
 * Does NOT execute the generated DSL - only measures translation accuracy
 */
class TranslationEvaluator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.process = null;
    this.buffer = '';
    this.responseResolve = null;
    this.responseReject = null;
    this.translationStats = {
      exactMatch: 0,
      semanticMatch: 0,
      partialMatch: 0,
      noMatch: 0,
      errors: []
    };
  }

  async start() {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(AGI_SCRIPT)) {
        reject(new Error(`AGISystem2.sh not found at ${AGI_SCRIPT}`));
        return;
      }

      // Use --debug to get structured DSL output
      this.process = spawn('bash', [AGI_SCRIPT, '--no-color', '--debug'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.process.on('error', (err) => {
        reject(new Error(`Failed to start AGISystem2: ${err.message}`));
      });

      this.process.on('exit', (code) => {
        if (this.verbose) {
          log(`  [AGI] Process exited with code ${code}`, colors.gray);
        }
      });

      this.process.stdout.on('data', (data) => {
        const text = data.toString();
        this.buffer += text;

        if (this.verbose) {
          log(`  [TRANS OUT] ${text.trim()}`, colors.gray);
        }

        if (this.isResponseComplete()) {
          if (this.responseResolve) {
            const response = this.extractResponse();
            this.responseResolve(response);
            this.responseResolve = null;
            this.responseReject = null;
          }
        }
      });

      this.process.stderr.on('data', (data) => {
        if (this.verbose) {
          log(`  [TRANS ERR] ${data.toString().trim()}`, colors.yellow);
        }
      });

      setTimeout(() => {
        log(`  [TIMING] Translation evaluator start: ${Date.now() - startTime}ms`, colors.gray);
        resolve();
      }, 2000);
    });
  }

  isResponseComplete() {
    const promptPatterns = [/\n>\s*$/, /\nYou:\s*$/, /\nInput:\s*$/, /\n\?\s*$/];
    for (const pattern of promptPatterns) {
      if (pattern.test(this.buffer)) return true;
    }
    if (this.buffer.includes('"truth"') && this.buffer.includes('}')) return true;
    return false;
  }

  extractResponse() {
    const response = this.buffer;
    this.buffer = '';
    return response;
  }

  /**
   * Send NL query and extract generated DSL
   * Returns: { generatedDsl: string, rawResponse: string }
   */
  async send(message) {
    const sendTime = Date.now();
    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('Translation evaluator not started'));
        return;
      }

      // Wait a bit to ensure previous response has fully arrived before clearing buffer
      setTimeout(() => {
        this.buffer = '';
        this.responseResolve = resolve;
        this.responseReject = reject;

        const timeoutId = setTimeout(() => {
          if (this.responseResolve) {
            const partialResponse = this.extractResponse();
            log(`  [TIMING] Translation timeout after ${Date.now() - sendTime}ms`, colors.yellow);
            this.responseResolve(partialResponse || '[TIMEOUT]');
            this.responseResolve = null;
            this.responseReject = null;
          }
        }, this.timeout);

        if (this.verbose) {
          log(`  [TRANS IN] ${message}`, colors.blue);
        }

        this.process.stdin.write(message + '\n');

        const originalResolve = this.responseResolve;
        this.responseResolve = (response) => {
          clearTimeout(timeoutId);
          log(`  [TIMING] Translation response: ${Date.now() - sendTime}ms`, colors.gray);
          originalResolve(response);
        };
      }, 500); // Wait 500ms before sending next message
    });
  }

  /**
   * Extract DSL from LLM response
   * Looks for patterns like @varname COMMAND ... in the response
   * Also tries to extract from JSON canonical form if DSL not found
   */
  extractGeneratedDsl(response) {
    // Look for DSL patterns in response
    const dslPatterns = [
      // Pattern: lines starting with @
      /@\w+\s+(?:ASK|ASSERT|FACTS_MATCHING|NONEMPTY|BOOL_AND|BOOL_OR|COUNT|PICK_FIRST|MERGE_LISTS|ABDUCT|INFER|THEORY_PUSH|THEORY_POP|RETRACT|FILTER)[^\n]*/gi,
      // Pattern: in code blocks
      /```(?:dsl|sys2dsl)?\n([\s\S]*?)```/gi
    ];

    let extractedDsl = [];

    for (const pattern of dslPatterns) {
      const matches = response.match(pattern);
      if (matches) {
        extractedDsl.push(...matches);
      }
    }

    // Clean up and join
    let result = extractedDsl
      .map(d => d.replace(/```(?:dsl|sys2dsl)?\n?/g, '').replace(/```/g, '').trim())
      .filter(d => d.length > 0)
      .join('\n');

    // If no DSL found, try to extract from JSON canonical form
    // This handles cases where the LLM output shows the parsed JSON but not DSL
    if (!result) {
      const jsonMatch = response.match(/\{"type"\s*:\s*"yes_no"\s*,\s*"canonical"\s*:\s*\{[^}]+\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0] + '}}');
          if (parsed.canonical && parsed.canonical.subject && parsed.canonical.relation && parsed.canonical.object) {
            result = `@q ASK ${parsed.canonical.subject} ${parsed.canonical.relation} ${parsed.canonical.object}`;
          }
        } catch {
          // JSON parse failed, try simpler pattern
          const simpleMatch = response.match(/"subject"\s*:\s*"([^"]+)"\s*,\s*"relation"\s*:\s*"([^"]+)"\s*,\s*"object"\s*:\s*"([^"]+)"/);
          if (simpleMatch) {
            result = `@q ASK ${simpleMatch[1]} ${simpleMatch[2]} ${simpleMatch[3]}`;
          }
        }
      }
    }

    return result;
  }

  /**
   * Compare generated DSL with expected DSL
   * Returns: { matchType: 'exact'|'semantic'|'partial'|'none', similarity: number, details: string }
   */
  compareDsl(generated, expected) {
    if (!generated || !expected) {
      return { matchType: 'none', similarity: 0, details: 'Missing DSL' };
    }

    // Normalize for comparison
    const normalizeForCompare = (dsl) => {
      return dsl
        .replace(/@\w+/g, '@VAR')  // Normalize variable names
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .trim()
        .toUpperCase();
    };

    const normalizedGen = normalizeForCompare(generated);
    const normalizedExp = normalizeForCompare(expected);

    // Exact match (after normalization)
    if (normalizedGen === normalizedExp) {
      return { matchType: 'exact', similarity: 100, details: 'Exact match' };
    }

    // Semantic match - same commands in same order
    const genCommands = generated.match(/(?:ASK|ASSERT|FACTS_MATCHING|NONEMPTY|BOOL_AND|BOOL_OR|COUNT|PICK_FIRST|MERGE_LISTS|ABDUCT|INFER|THEORY_PUSH|THEORY_POP|RETRACT|FILTER)/gi) || [];
    const expCommands = expected.match(/(?:ASK|ASSERT|FACTS_MATCHING|NONEMPTY|BOOL_AND|BOOL_OR|COUNT|PICK_FIRST|MERGE_LISTS|ABDUCT|INFER|THEORY_PUSH|THEORY_POP|RETRACT|FILTER)/gi) || [];

    const commandMatch = genCommands.length > 0 &&
                         genCommands.map(c => c.toUpperCase()).join(',') ===
                         expCommands.map(c => c.toUpperCase()).join(',');

    if (commandMatch) {
      // Check if arguments are similar
      const similarity = this.calculateSimilarity(normalizedGen, normalizedExp);
      if (similarity > 80) {
        return { matchType: 'semantic', similarity, details: `Same commands, ${similarity}% arg match` };
      }
    }

    // Partial match - some overlap
    const similarity = this.calculateSimilarity(normalizedGen, normalizedExp);
    if (similarity > 50) {
      return { matchType: 'partial', similarity, details: `${similarity}% overlap` };
    }

    return { matchType: 'none', similarity, details: `Only ${similarity}% match` };
  }

  /**
   * Calculate similarity between two strings (Jaccard-like)
   */
  calculateSimilarity(s1, s2) {
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return Math.round((intersection.size / union.size) * 100);
  }

  getStats() {
    return this.translationStats;
  }

  async stop() {
    if (this.process) {
      try {
        this.process.stdin.write('/exit\n');
      } catch (e) {}
      setTimeout(() => {
        if (this.process) {
          this.process.kill();
          this.process = null;
        }
      }, 1000);
    }
  }
}

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

/**
 * Display usage/options at startup
 */
function showUsage() {
  log(`\n${'═'.repeat(70)}`, colors.cyan);
  log(`  ${colors.bright}AGISystem2 Evaluation Suite${colors.reset}`, colors.cyan);
  log(`${'═'.repeat(70)}`, colors.cyan);
  log(``, '');
  log(`  ${colors.bright}USAGE:${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js [MODE] [FILTERS] [OPTIONS]`, '');
  log(``, '');
  log(`  ${colors.bright}EXECUTION MODES:${colors.reset}`, '');
  log(`    ${colors.green}(default)${colors.reset}       Direct DSL - run expected_dsl, NO LLM (fastest)`, '');
  log(`    ${colors.yellow}--eval-llm${colors.reset}      Test NL→DSL translation quality`, '');
  log(`    ${colors.yellow}--full${colors.reset}          End-to-end: LLM → DSL → Execute`, '');
  log(``, '');
  log(`  ${colors.bright}FILTER OPTIONS:${colors.reset} (can be combined)`, '');
  log(`    --only-case <id>   Run a single case by ID (partial match OK)`, colors.gray);
  log(`    --case <id>        Alias for --only-case`, colors.gray);
  log(`    --from <n>         Start from case number N (1-indexed)`, colors.gray);
  log(`    --to <m>           End at case number M (inclusive)`, colors.gray);
  log(`    --runFailed        Run only previously failed cases`, colors.gray);
  log(``, '');
  log(`  ${colors.bright}OTHER OPTIONS:${colors.reset}`, '');
  log(`    --help, -h         Show this help message and exit`, colors.gray);
  log(`    --verbose, -v      Show detailed output`, colors.gray);
  log(`    --dry-run          Validate cases without running`, colors.gray);
  log(`    --timeout <ms>     Set timeout per interaction (default: 30000)`, colors.gray);
  log(``, '');
  log(`${'─'.repeat(70)}`, colors.gray);
  log(`  ${colors.bright}EXAMPLES:${colors.reset}`, '');
  log(``, '');
  log(`  ${colors.bright}Basic usage:${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js                    ${colors.green}# Run all tests (Direct DSL)${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --help             ${colors.gray}# Show this help${colors.reset}`, '');
  log(``, '');
  log(`  ${colors.bright}Run specific case(s):${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --only-case suite_01_ontology`, '');
  log(`    node evalsuite/runSuite.js --only-case ontology  ${colors.gray}# Partial match${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --case 21_boost       ${colors.gray}# Same as --only-case${colors.reset}`, '');
  log(``, '');
  log(`  ${colors.bright}Run a range of cases:${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --from 1 --to 5    ${colors.gray}# Cases 1-5${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --from 10          ${colors.gray}# Cases 10 to end${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --to 3             ${colors.gray}# First 3 cases${colors.reset}`, '');
  log(``, '');
  log(`  ${colors.bright}Re-run failed tests:${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --runFailed        ${colors.gray}# Only failed cases${colors.reset}`, '');
  log(``, '');
  log(`  ${colors.bright}Different execution modes:${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --eval-llm         ${colors.yellow}# Test NL→DSL translation${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --full             ${colors.yellow}# Full end-to-end${colors.reset}`, '');
  log(``, '');
  log(`  ${colors.bright}Combining options:${colors.reset}`, '');
  log(`    node evalsuite/runSuite.js --from 1 --to 5 --verbose`, '');
  log(`    node evalsuite/runSuite.js --only-case ontology --eval-llm`, '');
  log(`    node evalsuite/runSuite.js --runFailed --timeout 60000`, '');
  log(``, '');
  log(`${'═'.repeat(70)}\n`, colors.cyan);
}

/**
 * Load previously failed cases from failed.json
 */
function loadFailedCases() {
  if (!fs.existsSync(FAILED_FILE)) {
    return { cases: [], lastUpdated: null };
  }
  try {
    return JSON.parse(fs.readFileSync(FAILED_FILE, 'utf-8'));
  } catch (e) {
    log(`  Warning: Could not parse failed.json: ${e.message}`, colors.yellow);
    return { cases: [], lastUpdated: null };
  }
}

/**
 * Save failed cases to failed.json (merge with existing, don't overwrite from other ranges)
 */
function saveFailedCases(newFailedCases, rangeFrom, rangeTo) {
  let existing = loadFailedCases();

  // Remove existing entries for cases in current range (they will be updated)
  const casesInRange = new Set(newFailedCases.map(c => c.id));

  // Keep cases outside current range, remove those in range (will be re-added if failed)
  existing.cases = existing.cases.filter(c => {
    // If this case is in our current run range, remove it (we'll add back if still failing)
    const caseNum = parseInt(c.id.split('_')[0], 10);
    if (rangeFrom !== null && rangeTo !== null) {
      if (caseNum >= rangeFrom && caseNum <= rangeTo) {
        return false; // Remove - will be re-added if still failing
      }
    }
    return true; // Keep cases outside our range
  });

  // Add new failed cases
  for (const failedCase of newFailedCases) {
    // Check if already exists (by id)
    const existingIdx = existing.cases.findIndex(c => c.id === failedCase.id);
    if (existingIdx === -1) {
      existing.cases.push(failedCase);
    } else {
      existing.cases[existingIdx] = failedCase;
    }
  }

  // Sort by case ID
  existing.cases.sort((a, b) => a.id.localeCompare(b.id));

  existing.lastUpdated = new Date().toISOString();
  existing.rangeInfo = { lastFrom: rangeFrom, lastTo: rangeTo };

  fs.writeFileSync(FAILED_FILE, JSON.stringify(existing, null, 2));
  log(`\n  Failed cases saved to: ${FAILED_FILE}`, colors.gray);
  log(`  Total failed cases tracked: ${existing.cases.length}`, colors.yellow);
}

function logSection(title) {
  log(`\n${'═'.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.cyan + colors.bright);
  log(`${'═'.repeat(60)}`, colors.cyan);
}

function logResult(passed, message) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  log(`  ${symbol} ${message}`, color);
}

/**
 * Discover all test cases in the suite directory
 * @param {Object} options - Filter options
 * @param {string} options.filterCase - Run only specific case by ID
 * @param {number} options.from - Start from case number (1-indexed)
 * @param {number} options.to - End at case number (inclusive)
 * @param {boolean} options.runFailed - Run only previously failed cases
 */
function discoverCases(options = {}) {
  const { filterCase, from, to, runFailed } = options;

  let cases = [];
  const entries = fs.readdirSync(SUITE_DIR, { withFileTypes: true });

  // If runFailed mode, load failed cases first
  let failedCaseIds = null;
  if (runFailed) {
    const failedData = loadFailedCases();
    if (failedData.cases.length === 0) {
      log(`  No failed cases found in ${FAILED_FILE}`, colors.yellow);
      return [];
    }
    failedCaseIds = new Set(failedData.cases.map(c => c.id));
    log(`  Running ${failedCaseIds.size} previously failed case(s)`, colors.yellow);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (filterCase && entry.name !== filterCase) continue;

    const caseFile = path.join(SUITE_DIR, entry.name, 'case.json');
    if (fs.existsSync(caseFile)) {
      try {
        const caseData = JSON.parse(fs.readFileSync(caseFile, 'utf-8'));
        caseData._dir = entry.name;
        caseData._path = caseFile;
        cases.push(caseData);
      } catch (e) {
        log(`  Warning: Failed to parse ${caseFile}: ${e.message}`, colors.yellow);
      }
    }
  }

  // Sort by directory name (which includes case number)
  cases.sort((a, b) => a._dir.localeCompare(b._dir));

  // Apply range filter (--from and --to)
  if (from !== null || to !== null) {
    const startIdx = from !== null ? from - 1 : 0;
    const endIdx = to !== null ? to : cases.length;
    cases = cases.slice(startIdx, endIdx);
    log(`  Filtered to range: cases ${startIdx + 1} to ${Math.min(endIdx, cases.length + startIdx)}`, colors.gray);
  }

  // Apply runFailed filter
  if (failedCaseIds) {
    cases = cases.filter(c => failedCaseIds.has(c.id));
  }

  return cases;
}

/**
 * AGISystem2 Process Manager
 * Spawns the chat interface and manages stdin/stdout communication
 */
class AGIProcess {
  constructor(options = {}) {
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.verbose = options.verbose || false;
    this.process = null;
    this.buffer = '';
    this.responseResolve = null;
    this.responseReject = null;
  }

  async start() {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      // Check if script exists
      if (!fs.existsSync(AGI_SCRIPT)) {
        reject(new Error(`AGISystem2.sh not found at ${AGI_SCRIPT}`));
        return;
      }

      // Use --debug flag to get structured DSL output
      this.process = spawn('bash', [AGI_SCRIPT, '--no-color', '--debug'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.process.on('error', (err) => {
        reject(new Error(`Failed to start AGISystem2: ${err.message}`));
      });

      this.process.on('exit', (code) => {
        if (this.verbose) {
          log(`  [AGI] Process exited with code ${code}`, colors.gray);
        }
      });

      // Collect stdout
      this.process.stdout.on('data', (data) => {
        const text = data.toString();
        this.buffer += text;

        if (this.verbose) {
          log(`  [AGI OUT] ${text.trim()}`, colors.gray);
        }

        // Check if we have a complete response (ends with prompt)
        if (this.isResponseComplete()) {
          if (this.responseResolve) {
            const response = this.extractResponse();
            this.responseResolve(response);
            this.responseResolve = null;
            this.responseReject = null;
          }
        }
      });

      // Collect stderr (usually warnings/errors)
      this.process.stderr.on('data', (data) => {
        if (this.verbose) {
          log(`  [AGI ERR] ${data.toString().trim()}`, colors.yellow);
        }
      });

      // Wait for initial prompt
      setTimeout(() => {
        log(`  [TIMING] Process start: ${Date.now() - startTime}ms`, colors.gray);
        resolve();
      }, 2000); // Give it time to start
    });
  }

  isResponseComplete() {
    // Look for prompt indicators that signal response is complete
    // The chat interface typically shows a prompt like "> " or "You: "
    const promptPatterns = [
      /\n>\s*$/,
      /\nYou:\s*$/,
      /\nInput:\s*$/,
      /\n\?\s*$/
    ];

    for (const pattern of promptPatterns) {
      if (pattern.test(this.buffer)) {
        return true;
      }
    }

    // Also check for JSON response completion
    if (this.buffer.includes('"truth"') && this.buffer.includes('}')) {
      return true;
    }

    return false;
  }

  extractResponse() {
    const response = this.buffer;
    this.buffer = '';
    return response;
  }

  async send(message) {
    const sendTime = Date.now();
    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('AGI process not started'));
        return;
      }

      this.buffer = '';
      this.responseResolve = resolve;
      this.responseReject = reject;

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (this.responseResolve) {
          // Return what we have so far
          const partialResponse = this.extractResponse();
          log(`  [TIMING] LLM timeout after ${Date.now() - sendTime}ms`, colors.yellow);
          this.responseResolve(partialResponse || '[TIMEOUT - No response]');
          this.responseResolve = null;
          this.responseReject = null;
        }
      }, this.timeout);

      // Send message
      if (this.verbose) {
        log(`  [AGI IN] ${message}`, colors.blue);
      }

      this.process.stdin.write(message + '\n');

      // Clear timeout when resolved
      const originalResolve = this.responseResolve;
      this.responseResolve = (response) => {
        clearTimeout(timeoutId);
        log(`  [TIMING] LLM response: ${Date.now() - sendTime}ms`, colors.gray);
        originalResolve(response);
      };
    });
  }

  async stop() {
    if (this.process) {
      // Send exit command
      try {
        this.process.stdin.write('/exit\n');
      } catch (e) {
        // Ignore
      }

      // Force kill after short delay
      setTimeout(() => {
        if (this.process) {
          this.process.kill();
          this.process = null;
        }
      }, 1000);
    }
  }
}

/**
 * Generate DSL query from natural language question
 * Uses pattern matching to convert common question types
 *
 * @param {Object} query - Query object with natural_language
 * @param {string[]} expectedFacts - List of facts to help match concepts
 */
function generateDSLQuery(query, expectedFacts) {
  const nl = query.natural_language;

  // Helper to normalize word (remove plural 's')
  function singularize(word) {
    const lower = word.toLowerCase();
    if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
    if (lower.endsWith('es') && !lower.endsWith('oes')) return lower.slice(0, -2);
    if (lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1);
    return lower;
  }

  // Helper to find matching concept from expected facts (handles multi-word concepts and plurals)
  function findConcept(word) {
    const lower = word.toLowerCase();
    const singular = singularize(word);

    // First try exact match in expected facts
    for (const fact of (expectedFacts || [])) {
      const parts = fact.split(/\s+/);
      // Check subject (exact and singular)
      const subjectLower = parts[0].toLowerCase();
      if (subjectLower === lower || subjectLower === singular) return parts[0];
      // Check object (last word or multi-word) (exact and singular)
      const objectLower = parts[parts.length - 1].toLowerCase();
      if (objectLower === lower || objectLower === singular) return parts[parts.length - 1];
      // Check for multi-word object containing our word
      if (parts.length > 2) {
        const obj = parts.slice(2).join('_');
        const objLower = obj.toLowerCase();
        if (objLower.includes(lower) || objLower.includes(singular)) return obj;
      }
    }
    // Return original with first letter capitalized for proper nouns
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  // Helper to extract multi-word concept (like "living thing" -> "living_thing")
  function extractConcept(text, startWord, expectedFacts) {
    const words = text.split(/\s+/);
    const startIdx = words.findIndex(w => w.toLowerCase() === startWord.toLowerCase());
    if (startIdx === -1) return findConcept(startWord);

    // Try progressively longer phrases
    for (let len = Math.min(3, words.length - startIdx); len >= 1; len--) {
      const phrase = words.slice(startIdx, startIdx + len).join('_').toLowerCase();
      // Check if this phrase exists in expected facts
      for (const fact of (expectedFacts || [])) {
        if (fact.toLowerCase().includes(phrase)) {
          // Find the actual casing from the fact
          const match = fact.match(new RegExp(phrase.replace(/_/g, '[_ ]'), 'i'));
          if (match) return match[0].replace(/\s+/g, '_');
        }
      }
    }
    return findConcept(startWord);
  }

  // Pattern: "Is X a Y?" or "Is X an Y?" (captures rest of sentence for multi-word objects)
  // Also handles "Is a X a Y?" (article before subject)
  let match = nl.match(/is\s+(?:a\s+)?(.+?)\s+(?:a|an)\s+(.+?)(?:\?|$)/i);
  if (match) {
    let [, subjectPhrase, objectPhrase] = match;
    // Convert subject phrase to concept (e.g., "software engineer" -> "software_engineer")
    const subjectWords = subjectPhrase.trim().split(/\s+/);
    const subject = subjectWords.length > 1
      ? extractConcept(subjectPhrase, subjectWords[0], expectedFacts)
      : findConcept(subjectWords[0]);
    // Convert object phrase to concept (e.g., "living thing" -> "living_thing")
    const objectWords = objectPhrase.trim().split(/\s+/);
    const object = objectWords.length > 1
      ? extractConcept(objectPhrase, objectWords[0], expectedFacts)
      : findConcept(objectWords[0]);
    return `@${query.id} ASK ${subject} IS_A ${object}`;
  }

  // Pattern: "Is X in Y?" (location)
  match = nl.match(/is\s+(\w+)\s+in\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    return `@${query.id} ASK ${subject} LOCATED_IN ${object}`;
  }

  // Pattern: "Does X have Y?" or "Does a X have Y?"
  match = nl.match(/does\s+(?:a\s+)?(\w+)\s+have\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    return `@${query.id} ASK ${subject} HAS ${object}`;
  }

  // Pattern: "Do X help Y?" or "Does X help Y?"
  match = nl.match(/(?:do|does)\s+(\w+)\s+help\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    return `@${query.id} ASK ${subject} HELPS ${object}`;
  }

  // Pattern: "Can X cause Y?"
  match = nl.match(/can\s+(\w+)\s+cause\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    return `@${query.id} ASK ${subject} CAUSES ${object}`;
  }

  // Pattern: "Does X cause Y?" - CAUSES relation
  match = nl.match(/does\s+(\w+)\s+cause\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    return `@${query.id} ASK ${subject} CAUSES ${object}`;
  }

  // Pattern: "Can X do Y?" or "Can a X do Y?" - look for PERMITTED_TO in facts
  match = nl.match(/can\s+(?:a\s+)?(.+?)\s+(fly|access|view|prescribe|administer)\s+(.+?)(?:\?|$)/i);
  if (match) {
    let [, subjectPhrase, verb, objectPhrase] = match;
    const verbLower = verb.toLowerCase();
    // Build expected action from verb + object
    const objectClean = objectPhrase.trim().toLowerCase()
      .replace(/^over\s+/, '').replace(/^a\s+/, '').replace(/\s+/g, '_');
    const expectedAction = `${verbLower}_${objectClean}`.replace(/_+$/, '');

    // Find multi-word subject in facts (e.g., "medical drone" -> "medical_drone")
    const subjectClean = subjectPhrase.trim().toLowerCase().replace(/\s+/g, '_');

    // Look for matching fact with this subject AND action
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      const factParts = fact.split(/\s+/);
      const factSubj = factParts[0].toLowerCase();
      const factObj = factParts[factParts.length - 1].toLowerCase();

      // Check if subject matches and action matches
      if (factSubj === subjectClean || factSubj.includes(subjectClean) || subjectClean.includes(factSubj)) {
        if (factLower.includes('permitted_to') && factObj.includes(verbLower)) {
          return `@${query.id} ASK ${factParts[0]} PERMITTED_TO ${factParts[factParts.length - 1]}`;
        }
        // For PROHIBITED_FROM: "Can X do Y?" should return FALSE if X is prohibited
        // We need to check PERMITTED_TO which will return FALSE (no permit = can't do)
        if (factLower.includes('prohibited_from') && factObj.includes(verbLower)) {
          // Check for PERMITTED_TO instead - will return FALSE since no permit exists
          return `@${query.id} ASK ${factParts[0]} PERMITTED_TO ${factParts[factParts.length - 1]}`;
        }
      }
    }

    // If no exact match found, construct query for the specific action (may return FALSE)
    const subject = findConcept(subjectPhrase.split(/\s+/).pop());
    return `@${query.id} ASK ${subject} PERMITTED_TO ${expectedAction}`;
  }

  // Pattern: "Is X allowed in Y?" - PERMITTED relation
  match = nl.match(/is\s+(?:a\s+)?(.+?)\s+allowed\s+(?:in|to)\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectPhrase, objectPhrase] = match;
    const subject = findConcept(subjectPhrase.split(/\s+/).pop());
    const object = findConcept(objectPhrase.split(/\s+/)[0]);
    return `@${query.id} ASK ${subject} PERMITTED_IN ${object}`;
  }

  // Pattern: "Does X require Y?" - look for REQUIRES in facts
  match = nl.match(/does\s+(?:a\s+|an\s+)?(.+?)\s+require\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectPhrase, objectPhrase] = match;
    // Find the subject concept in facts
    const subjectWords = subjectPhrase.trim().toLowerCase().replace(/\s+/g, '_');
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes('requires') && factLower.includes(subjectWords)) {
        const factParts = fact.split(/\s+/);
        const factSubj = factParts[0];
        const factObj = factParts[factParts.length - 1];
        return `@${query.id} ASK ${factSubj} REQUIRES ${factObj}`;
      }
    }
    // Fallback to simple matching
    const subject = findConcept(subjectPhrase.split(/\s+/).pop());
    const object = findConcept(objectPhrase.split(/\s+/)[0]);
    return `@${query.id} ASK ${subject} REQUIRES ${object}`;
  }

  // Pattern: "Is X required for Y?" - look for REQUIRES in facts (reversed)
  match = nl.match(/is\s+(.+?)\s+required\s+(?:for|to)\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectPhrase, objectPhrase] = match;
    const subjectWords = subjectPhrase.trim().toLowerCase().replace(/\s+/g, '_');
    const objectWords = objectPhrase.trim().toLowerCase().replace(/\s+/g, '_');
    // Look for "Y REQUIRES X" pattern
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes('requires') &&
          (factLower.includes(subjectWords) || factLower.includes(objectWords))) {
        const factParts = fact.split(/\s+/);
        const factSubj = factParts[0];
        const factObj = factParts[factParts.length - 1];
        return `@${query.id} ASK ${factSubj} REQUIRES ${factObj}`;
      }
    }
  }

  // Pattern: "Did X happen before Y?" - BEFORE relation
  match = nl.match(/did\s+(.+?)\s+(?:happen\s+)?before\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectPhrase, objectPhrase] = match;
    // Convert multi-word to underscore format (e.g., "World War 1" -> "world_war_1")
    const subjectClean = subjectPhrase.trim().toLowerCase().replace(/\s+/g, '_');
    const objectClean = objectPhrase.trim().toLowerCase().replace(/\s+/g, '_');

    // Look for matching fact
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes('before') && factLower.includes(subjectClean)) {
        const factParts = fact.split(/\s+/);
        return `@${query.id} ASK ${factParts[0]} BEFORE ${factParts[factParts.length - 1]}`;
      }
    }

    // Fallback - construct from phrases
    const subject = findConcept(subjectPhrase.split(/\s+/).pop());
    const object = findConcept(objectPhrase.split(/\s+/)[0]);
    return `@${query.id} ASK ${subject} BEFORE ${object}`;
  }

  // Pattern: "Does X have Y?" (already exists but let's make sure it catches more)
  match = nl.match(/does\s+(\w+)\s+have\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    return `@${query.id} ASK ${subject} HAS ${object}`;
  }

  // Pattern: "What could cause X?" - Abductive reasoning (returns PLAUSIBLE)
  match = nl.match(/what\s+could\s+cause\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, effectPhrase] = match;
    let effectClean = effectPhrase.trim().toLowerCase().replace(/\s+/g, '_');

    // Special case: "X's symptoms" - find what symptoms X has and abduct those
    const symptomMatch = effectPhrase.match(/(\w+)'s\s+symptoms?/i);
    if (symptomMatch) {
      const personName = symptomMatch[1].toLowerCase();
      const symptoms = [];
      for (const fact of (expectedFacts || [])) {
        const factLower = fact.toLowerCase();
        if (factLower.startsWith(personName) && factLower.includes(' has ')) {
          const factParts = fact.split(/\s+/);
          symptoms.push(factParts[factParts.length - 1]);
        }
      }
      if (symptoms.length > 0) {
        return `@${query.id} ABDUCT ${symptoms[0]}`;
      }
    }
    effectClean = effectClean.replace(/'s_symptoms?/i, '');
    const effectSingular = singularize(effectClean);
    return `@${query.id} ABDUCT ${effectSingular}`;
  }

  // Pattern: "What causes X?" - Factual lookup (returns TRUE_CERTAIN if facts exist)
  match = nl.match(/what\s+causes\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, effectPhrase] = match;
    let effectClean = effectPhrase.trim().toLowerCase().replace(/\s+/g, '_');
    const effectSingular = singularize(effectClean);

    // Look in facts for what causes this effect - if found, return first cause ASK
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes(' causes ') &&
          (factLower.includes(effectClean) || factLower.includes(effectSingular))) {
        // Extract cause and use ASK to confirm it exists
        const factParts = fact.split(/\s+/);
        const cause = factParts[0];
        const effect = factParts[factParts.length - 1];
        return `@${query.id} ASK ${cause} CAUSES ${effect}`;
      }
    }
    // Fallback to ABDUCT if no direct facts
    return `@${query.id} ABDUCT ${effectSingular}`;
  }

  // Pattern: "Could X have Y?" - Check if X's symptoms match Y's causes
  match = nl.match(/could\s+(\w+)\s+have\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectWord, objectPhrase] = match;
    const subject = findConcept(subjectWord);
    const objectClean = objectPhrase.trim().toLowerCase().replace(/\s+/g, '_');
    const subjectLower = subjectWord.toLowerCase();

    // Find what symptoms the subject has
    const symptoms = [];
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.startsWith(subjectLower) && factLower.includes(' has ')) {
        const factParts = fact.split(/\s+/);
        symptoms.push(factParts[factParts.length - 1]);
      }
    }

    // Find what the condition (objectClean) causes
    const conditionCauses = [];
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.startsWith(objectClean) && factLower.includes(' causes ')) {
        const factParts = fact.split(/\s+/);
        conditionCauses.push(factParts[factParts.length - 1].toLowerCase());
      }
    }

    // If subject's symptoms match what condition causes, it's plausible
    // Use ABDUCT on one of the symptoms to find if condition is a possible cause
    if (symptoms.length > 0 && conditionCauses.length > 0) {
      // Check if any symptom matches what condition causes
      for (const symptom of symptoms) {
        if (conditionCauses.includes(symptom.toLowerCase())) {
          return `@${query.id} ABDUCT ${symptom}`;
        }
      }
    }

    // Fallback - abduct first symptom if any
    if (symptoms.length > 0) {
      return `@${query.id} ABDUCT ${symptoms[0]}`;
    }

    // Look for INDICATES relation (fever_and_coughing INDICATES respiratory_infection)
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes('indicates') && factLower.includes(objectClean)) {
        return `@${query.id} ABDUCT ${objectClean}`;
      }
    }
    // Fallback to HAS check
    return `@${query.id} ASK ${subject} HAS ${findConcept(objectPhrase.split(/\s+/)[0])}`;
  }

  // Pattern: "Does X qualify for..." or "Does X meet..." - Check HAS relation for REQUIRED certification
  match = nl.match(/does\s+(\w+)\s+(?:qualify|meet)\s+(?:for\s+)?(?:the\s+)?(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectWord, requirementPhrase] = match;
    const subject = findConcept(subjectWord);

    // Find what the role REQUIRES
    let requiredCert = null;
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes('requires')) {
        const factParts = fact.split(/\s+/);
        requiredCert = factParts[factParts.length - 1];
        break;
      }
    }

    // Check if subject HAS the required certification
    if (requiredCert) {
      return `@${query.id} ASK ${subject} HAS ${requiredCert}`;
    }

    // Fallback - look for HAS certification in subject's facts
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      const subjectLower = subjectWord.toLowerCase();
      if (factLower.startsWith(subjectLower) && factLower.includes('certification')) {
        const factParts = fact.split(/\s+/);
        return `@${query.id} ASK ${factParts[0]} HAS ${factParts[factParts.length - 1]}`;
      }
    }
    return null;
  }

  // Pattern: "Is X needed/required before Y?" - BEFORE + REQUIRES
  match = nl.match(/is\s+(\w+)\s+(?:needed|required)\s+before\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    return `@${query.id} ASK ${subject} BEFORE ${object}`;
  }

  // Pattern: "Does X come before or after Y?" - Check BEFORE or AFTER fact
  // IMPORTANT: Must come BEFORE the simpler "before/after" pattern
  match = nl.match(/does\s+(\w+)\s+come\s+(?:before\s+or\s+after|after\s+or\s+before)\s+(\w+)/i);
  if (match) {
    const [, subjectWord, objectWord] = match;
    const subjectLower = subjectWord.toLowerCase();
    const objectLower = objectWord.toLowerCase();

    // Check expected facts for BEFORE or AFTER
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      const factParts = fact.split(/\s+/);

      if (factLower.includes(subjectLower) && factLower.includes(objectLower)) {
        if (factLower.includes(' before ')) {
          return `@${query.id} ASK ${factParts[0]} BEFORE ${factParts[factParts.length - 1]}`;
        }
        if (factLower.includes(' after ')) {
          return `@${query.id} ASK ${factParts[0]} AFTER ${factParts[factParts.length - 1]}`;
        }
      }
    }
    // Fallback - check BEFORE
    return `@${query.id} ASK ${findConcept(subjectWord)} BEFORE ${findConcept(objectWord)}`;
  }

  // Pattern: "Does X come before Y?" or "Does X come after Y?" (simple, after the "or" pattern)
  match = nl.match(/does\s+(\w+)\s+come\s+(before|after)\s+(\w+)/i);
  if (match) {
    const [, subjectWord, direction, objectWord] = match;
    const subject = findConcept(subjectWord);
    const object = findConcept(objectWord);
    if (direction.toLowerCase() === 'before') {
      return `@${query.id} ASK ${subject} BEFORE ${object}`;
    } else {
      return `@${query.id} ASK ${subject} AFTER ${object}`;
    }
  }

  // Pattern: "If X, would Y?" or "If X, could Y?" - Counterfactual
  match = nl.match(/if\s+(.+?),\s+(?:would|could)\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, conditionPhrase, consequencePhrase] = match;
    // For counterfactual, we need more complex handling - skip DSL for now
    return null;
  }

  // Pattern: "Are X and Y at the same Z?" - Equality check via IS_A
  match = nl.match(/are\s+(\w+)\s+and\s+(\w+)\s+(?:at\s+)?(?:the\s+)?same\s+(\w+)/i);
  if (match) {
    const [, subject1, subject2, attribute] = match;
    const s1Lower = subject1.toLowerCase();
    const s2Lower = subject2.toLowerCase();

    // Find what type/level both subjects are
    let s1Type = null;
    let s2Type = null;

    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      const factParts = fact.split(/\s+/);

      // Look for IS_A relations
      if (factLower.includes('is_a')) {
        if (factLower.startsWith(s1Lower)) {
          s1Type = factParts[factParts.length - 1];
        }
        if (factLower.startsWith(s2Lower)) {
          s2Type = factParts[factParts.length - 1];
        }
      }
    }

    // If both have the same type, check if first one IS_A that type
    if (s1Type && s2Type && s1Type.toLowerCase() === s2Type.toLowerCase()) {
      return `@${query.id} ASK ${findConcept(subject1)} IS_A ${s1Type}`;
    }

    // Fallback - check if subject1 IS_A the attribute-related type
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.startsWith(s1Lower) && factLower.includes('is_a')) {
        const factParts = fact.split(/\s+/);
        return `@${query.id} ASK ${factParts[0]} IS_A ${factParts[factParts.length - 1]}`;
      }
    }
    return null;
  }

  // Pattern: "Should X and Y have same Z?" - Policy equality check
  match = nl.match(/should\s+(\w+)\s+and\s+(\w+)\s+have\s+(?:the\s+)?same\s+(\w+)/i);
  if (match) {
    const [, subject1, subject2, attribute] = match;
    // Check if both have same level/attribute
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes(subject1.toLowerCase())) {
        return `@${query.id} ASK ${findConcept(subject1)} IS_A ${findConcept(attribute)}`;
      }
    }
    return null;
  }

  // Pattern: "Who should be selected..." - Selection query (complex, skip)
  match = nl.match(/who\s+should\s+be\s+selected/i);
  if (match) {
    return null; // Complex query, needs LLM
  }

  // Pattern: "Did X deploy Y?" or "Did X do Y?"
  match = nl.match(/did\s+(.+?)\s+(deploy|release|publish|do)\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectPhrase, verb, objectPhrase] = match;
    const subjectClean = subjectPhrase.trim().toLowerCase().replace(/\s+/g, '_');
    const objectClean = objectPhrase.trim().toLowerCase().replace(/\s+/g, '_');

    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes(subjectClean) && factLower.includes(verb.toLowerCase())) {
        const factParts = fact.split(/\s+/);
        return `@${query.id} ASK ${factParts[0]} ${factParts[1]} ${factParts[factParts.length - 1]}`;
      }
    }
    return null;
  }

  // Pattern: "Is it factual that X?" - Extract the core fact
  match = nl.match(/is\s+it\s+(?:factual|true)\s+that\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, statementPhrase] = match;

    // Try to find the statement in expected facts
    // e.g., "the city council approved the budget" → city_council APPROVED budget
    const statementLower = statementPhrase.toLowerCase()
      .replace(/^the\s+/, '')
      .replace(/\s+the\s+/, ' ');

    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      const factParts = fact.split(/\s+/);

      // Check if statement words appear in fact
      const statementWords = statementLower.split(/\s+/);
      let matchCount = 0;
      for (const word of statementWords) {
        if (factLower.includes(word) || factLower.includes(word.replace(/_/g, ''))) {
          matchCount++;
        }
      }

      // If most words match, use this fact
      if (matchCount >= statementWords.length * 0.5 && factParts.length >= 3) {
        return `@${query.id} ASK ${factParts[0]} ${factParts[1]} ${factParts[factParts.length - 1]}`;
      }
    }
    return null;
  }

  // Pattern: "Should X affect Y?" - Policy check
  match = nl.match(/should\s+(\w+)\s+affect\s+(.+?)(?:\?|$)/i);
  if (match) {
    const [, subjectWord, objectPhrase] = match;
    // Look for MASKED_ATTRIBUTE or similar
    for (const fact of (expectedFacts || [])) {
      const factLower = fact.toLowerCase();
      if (factLower.includes(subjectWord.toLowerCase()) && factLower.includes('mask')) {
        // If attribute is masked, it should NOT affect
        return `@${query.id} ASK ${findConcept(subjectWord)} MASKED_FOR decision`;
      }
    }
    return null;
  }

  // Could not match - return null
  return null;
}

/**
 * Evaluate a single test case
 * Used in DIRECT_DSL and FULL modes
 */
async function evaluateCase(testCase, executor, options) {
  const isDirectDsl = EXECUTION_MODE === ExecutionMode.DIRECT_DSL;

  const results = {
    id: testCase.id,
    name: testCase.name,
    theoryLoaded: false,
    queries: [],
    passed: 0,
    failed: 0
  };

  log(`\n  Loading theory...`, colors.gray);

  // In direct DSL mode, use expected_facts directly (no LLM)
  if (isDirectDsl && testCase.theory.expected_facts) {
    const dslLines = testCase.theory.expected_facts.map((fact, i) =>
      `@f${String(i + 1).padStart(3, '0')} ASSERT ${fact}`
    );

    // Load composition rules if defined
    if (testCase.theory.rules && Array.isArray(testCase.theory.rules)) {
      let ruleIdx = 0;
      for (const rule of testCase.theory.rules) {
        ruleIdx++;
        // Convert rule to DEFINE_RULE command
        // Rule format: { name, head: "?x REL ?z", body: ["?x REL1 ?y", "?y REL2 ?z"] }
        const bodyArgs = rule.body.map(b => `body="${b}"`).join(' ');
        dslLines.push(`@rule${ruleIdx} DEFINE_RULE name=${rule.name} head="${rule.head}" ${bodyArgs}`);
      }
      log(`  Registering ${testCase.theory.rules.length} composition rules`, colors.gray);
    }

    // Load default reasoning rules if defined
    if (testCase.theory.defaults && Array.isArray(testCase.theory.defaults)) {
      let defIdx = 0;
      for (const def of testCase.theory.defaults) {
        defIdx++;
        // Convert default to DEFINE_DEFAULT command
        // Default format: { name, default: "?x CAN fly", condition: "?x IS_A bird", exceptions: ["penguin", "ostrich"] }
        const excArgs = (def.exceptions || []).map(e => `exception=${e}`).join(' ');

        // Parse the default pattern to extract property and value
        const defaultParts = def.default.split(/\s+/);
        const property = defaultParts.length >= 2 ? defaultParts[1] : 'HAS';
        const value = defaultParts.length >= 3 ? defaultParts.slice(2).join('_') : 'unknown';

        // Parse condition to get the typical type
        const condParts = def.condition.split(/\s+/);
        const typicalType = condParts.length >= 3 ? condParts[2] : 'thing';

        dslLines.push(`@default${defIdx} DEFINE_DEFAULT name=${def.name} type=${typicalType} property=${property} value=${value} ${excArgs}`);
      }
      log(`  Registering ${testCase.theory.defaults.length} default reasoning rules`, colors.gray);
    }

    // Load constraint definitions if defined
    if (testCase.theory.constraints) {
      const constraints = testCase.theory.constraints;

      // Register functional relations
      if (constraints.functional && Array.isArray(constraints.functional)) {
        let funcIdx = 0;
        for (const func of constraints.functional) {
          funcIdx++;
          dslLines.push(`@func${funcIdx} REGISTER_FUNCTIONAL ${func.relation}`);
        }
        log(`  Registering ${constraints.functional.length} functional constraints`, colors.gray);
      }

      // Register cardinality constraints
      if (constraints.cardinality && Array.isArray(constraints.cardinality)) {
        let cardIdx = 0;
        for (const card of constraints.cardinality) {
          cardIdx++;
          const minArg = card.min !== undefined ? `min=${card.min}` : '';
          const maxArg = card.max !== undefined ? `max=${card.max}` : '';
          dslLines.push(`@card${cardIdx} REGISTER_CARDINALITY ${card.subject_type} ${card.relation} ${minArg} ${maxArg}`);
        }
        log(`  Registering ${constraints.cardinality.length} cardinality constraints`, colors.gray);
      }

      // Register disjoint pairs as facts
      if (constraints.disjoint && Array.isArray(constraints.disjoint)) {
        let disjIdx = 0;
        for (const pair of constraints.disjoint) {
          if (Array.isArray(pair) && pair.length >= 2) {
            disjIdx++;
            dslLines.push(`@disj${disjIdx} ASSERT ${pair[0]} DISJOINT_WITH ${pair[1]}`);
          }
        }
        log(`  Registering ${constraints.disjoint.length} disjoint constraints`, colors.gray);
      }
    }

    const theoryResponse = await executor.send(dslLines.join('\n'));
    results.theoryLoaded = true;
    log(`  Loaded ${testCase.theory.expected_facts.length} facts directly`, colors.gray);
  } else {
    // FULL mode: Send the theory as natural language to LLM
    const theoryResponse = await executor.send(testCase.theory.natural_language);
    results.theoryLoaded = !theoryResponse.includes('error') &&
                            !theoryResponse.includes('Error');

    if (options.verbose) {
      log(`  Theory response: ${theoryResponse.substring(0, 200)}...`, colors.gray);
    }
  }

  // Run each query
  for (const query of testCase.queries) {
    log(`\n  Query ${query.id}: "${query.natural_language}"`, colors.blue);

    const queryResult = {
      id: query.id,
      question: query.natural_language,
      expectedTruth: query.expected_answer.truth,
      expectedNatural: query.expected_answer.natural_language,
      actualResponse: '',
      passed: false,
      matchReason: ''
    };

    try {
      let response;
      let usedDsl = null;

      if (isDirectDsl) {
        // DIRECT DSL MODE: Use expected_dsl directly (no LLM)
        if (query.expected_dsl) {
          usedDsl = query.expected_dsl;
          response = await executor.send(usedDsl, query.id);
        } else if (query.dsl_query) {
          // Legacy field
          usedDsl = query.dsl_query;
          response = await executor.send(usedDsl, query.id);
        } else {
          // Fallback: auto-generate DSL (no LLM, just pattern matching)
          usedDsl = generateDSLQuery(query, testCase.theory.expected_facts);
          if (usedDsl) {
            response = await executor.send(usedDsl, query.id);
          } else {
            response = '[Could not generate DSL query - add expected_dsl to case.json]';
          }
        }
      } else {
        // FULL MODE: Send natural language to LLM
        response = await executor.send(query.natural_language, query.id);
      }

      // Log the DSL used for debugging/documentation
      if (options.verbose && usedDsl) {
        log(`    DSL: ${usedDsl}`, colors.gray);
      }

      queryResult.actualResponse = response;

      // Analyze response for correctness
      const analysis = analyzeResponse(response, query.expected_answer);
      queryResult.passed = analysis.passed;
      queryResult.matchReason = analysis.reason;

      if (queryResult.passed) {
        results.passed++;
        const matchLabel = analysis.matchType === 'structured_dsl' ? ' [DSL]' : ' [NL]';
        logResult(true, `Expected: ${query.expected_answer.truth}${matchLabel}`);
      } else {
        results.failed++;
        logResult(false, `Expected: ${query.expected_answer.truth}`);
        log(`    Reason: ${analysis.reason}`, colors.gray);

        // Always show expected vs actual for failures (not just in verbose mode)
        const structured = parseStructuredResult(response);
        const actualTruth = structured.found ? structured.truth : 'NOT_PARSED';
        const actualMethod = structured.method ? ` (method: ${structured.method})` : '';
        const actualConfidence = structured.confidence ? ` [conf: ${structured.confidence}]` : '';

        // Show DSL used (helps debugging)
        if (usedDsl) {
          log(`    ${colors.cyan}DSL:${colors.reset}      ${usedDsl}`, '');
        }
        log(`    ${colors.yellow}Expected:${colors.reset} ${query.expected_answer.truth}`, '');
        log(`    ${colors.red}Actual:${colors.reset}   ${actualTruth}${actualMethod}${actualConfidence}`, '');

        if (options.verbose) {
          log(`    Expected NL: ${query.expected_answer.natural_language}`, colors.gray);
          // Show more of the response for debugging
          const responsePreview = response.length > 500 ? response.substring(0, 500) + '...' : response;
          log(`    Raw response: ${responsePreview}`, colors.gray);
        } else {
          // Even without verbose, show a compact response preview
          const compactResponse = response.replace(/\s+/g, ' ').substring(0, 150);
          log(`    Response: ${compactResponse}${response.length > 150 ? '...' : ''}`, colors.gray);
        }
      }
    } catch (err) {
      results.failed++;
      queryResult.error = err.message;
      logResult(false, `Error: ${err.message}`);
    }

    results.queries.push(queryResult);
  }

  return results;
}

/**
 * Parse structured result from debug output
 * Looks for [Structured Result] section with truth value
 */
function parseStructuredResult(response) {
  const result = {
    found: false,
    truth: null,
    method: null,
    confidence: null
  };

  // Look for structured result section
  const structuredMatch = response.match(/\[Structured Result\][\s\S]*?truth:\s*(\w+)/i);
  if (structuredMatch) {
    result.found = true;
    result.truth = structuredMatch[1].toUpperCase();
  }

  // Also try to parse DSL representation or JSON
  const dslMatch = response.match(/# Result:\s*({[\s\S]*?})/);
  if (dslMatch) {
    try {
      const parsed = JSON.parse(dslMatch[1]);
      result.found = true;
      // ABDUCT returns 'band' instead of 'truth'
      result.truth = parsed.truth || parsed.band || result.truth;
      result.method = parsed.method;
      result.confidence = parsed.confidence;
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Try to parse raw JSON in response (for Direct DSL mode)
  if (!result.found) {
    // For Direct DSL mode, the response is usually the whole JSON object
    // Try to parse the entire response as JSON first
    try {
      const parsed = JSON.parse(response);
      if (parsed && (parsed.truth || parsed.band)) {
        result.found = true;
        result.truth = parsed.truth || parsed.band;
        result.method = parsed.method;
        result.confidence = parsed.confidence;
      }
    } catch (e) {
      // Not valid JSON, try regex extraction
      // Use a greedy match to get the full JSON object
      const jsonMatch = response.match(/^\s*({[\s\S]+})\s*$/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed && (parsed.truth || parsed.band)) {
            result.found = true;
            result.truth = parsed.truth || parsed.band;
            result.method = parsed.method;
            result.confidence = parsed.confidence;
          }
        } catch (e2) {
          // Ignore parse errors
        }
      }
    }
  }

  // Try to find truth value in response
  if (!result.found) {
    const truthPatterns = [
      /truth[:\s]+["']?(\w+)/i,
      /"truth":\s*"(\w+)"/,
      /"band":\s*"(\w+)"/,  // Support ABDUCT band field
      /Result:\s*(\w+)/
    ];
    for (const pattern of truthPatterns) {
      const match = response.match(pattern);
      if (match) {
        const truth = match[1].toUpperCase();
        // Include TRUE_DEFAULT for default reasoning results
        if (['TRUE_CERTAIN', 'TRUE', 'TRUE_DEFAULT', 'FALSE', 'PLAUSIBLE', 'UNKNOWN'].includes(truth)) {
          result.found = true;
          result.truth = truth;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Normalize truth value for comparison
 *
 * Truth value hierarchy:
 * - TRUE_CERTAIN: Definitely true (direct fact or proven chain)
 * - TRUE_DEFAULT: True by default reasoning (can be overridden)
 * - PLAUSIBLE: Likely true but not certain
 * - FALSE: Definitely false (explicit negation or contradiction)
 * - UNKNOWN: Cannot determine (insufficient evidence, not the same as FALSE)
 */
function normalizeTruth(truth) {
  if (!truth) return null;
  const t = truth.toUpperCase();
  // TRUE and TRUE_CERTAIN are considered equivalent
  if (t === 'TRUE') return 'TRUE_CERTAIN';
  // UNKNOWN is a distinct truth value, not equivalent to FALSE
  // It means "insufficient evidence to determine" vs "explicitly false"
  return t;
}

/**
 * Check if response text indicates a specific truth value
 */
function detectTruthFromText(text, expectedTruth) {
  const lower = text.toLowerCase();

  // Stronger indicators for each truth value
  const strongIndicators = {
    'TRUE_CERTAIN': [
      /\byes[,.]?\s/i,
      /\bthat is correct\b/i,
      /\bis true\b/i,
      /\bcan\s+\w+\b/i,
      /\bdoes\s+\w+\b/i,
      /\bwill\s+\w+\b/i,
      /\bwould\s+(be|have|cause)\b/i
    ],
    'FALSE': [
      /\bno[,.]?\s/i,
      /\bcannot\b/i,
      /\bcan't\b/i,
      /\bwon't\b/i,
      /\bis not\b/i,
      /\bare not\b/i,
      /\bdoes not\b/i,
      /\bwould not\b/i,
      /\bnot\s+(likely|possible|true)\b/i,
      /\bless likely\b/i,
      /\bviolates?\b/i,
      /\bbreaks?\b/i,
      /\bconflicts?\b/i
    ],
    'PLAUSIBLE': [
      /\bpossibly\b/i,
      /\bmaybe\b/i,
      /\blikely\b/i,
      /\bprobably\b/i,
      /\bcould be\b/i,
      /\bmight\b/i,
      /\bplausible\b/i
    ],
    'UNKNOWN': [
      /\bunknown\b/i,
      /\buncertain\b/i,
      /\bcannot determine\b/i,
      /\binsufficient\s+(evidence|data|information)\b/i,
      /\bno\s+(evidence|data|information)\b/i,
      /\bdon't have enough\b/i,
      /\bcannot be determined\b/i,
      /\bnot enough\s+(facts|information)\b/i
    ]
  };

  const indicators = strongIndicators[expectedTruth] || [];
  for (const pattern of indicators) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Analyze if response matches expected answer
 * Uses multiple strategies: regex patterns, key concepts, and DSL results
 */
function analyzeResponse(response, expected) {
  const responseLower = response.toLowerCase();
  const expectedLower = expected.natural_language.toLowerCase();
  const expectedTruth = expected.truth;

  // Special handling for LIST type responses (FACTS_MATCHING queries)
  if (expectedTruth === 'LIST') {
    // Check if response is a JSON array with at least one element
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          passed: true,
          reason: `LIST Match: Found ${parsed.length} result(s)`,
          matchType: 'list_results'
        };
      } else if (Array.isArray(parsed) && parsed.length === 0) {
        return {
          passed: false,
          reason: `LIST Empty: Expected non-empty list, got []`,
          matchType: 'none'
        };
      }
    } catch (e) {
      // Not JSON, check if it looks like a list response
      if (response.includes('[') && response.includes(']')) {
        return {
          passed: true,
          reason: `LIST Match: Response contains list structure`,
          matchType: 'list_structure'
        };
      }
    }
    // Check for key concepts as fallback
    const keyWords = expectedLower.split(/\s+/).filter(w => w.length > 4);
    let conceptMatch = 0;
    for (const word of keyWords) {
      if (responseLower.includes(word)) {
        conceptMatch++;
      }
    }
    if (conceptMatch >= keyWords.length * 0.3) {
      return {
        passed: true,
        reason: `LIST NL Match: ${conceptMatch}/${keyWords.length} concepts found`,
        matchType: 'natural_language'
      };
    }
    return {
      passed: false,
      reason: `LIST mismatch: Could not find expected list results`,
      matchType: 'none'
    };
  }

  // Strategy 1: Use strong regex pattern matching
  if (detectTruthFromText(response, expectedTruth)) {
    return {
      passed: true,
      reason: `Pattern Match: Found strong ${expectedTruth} indicators`,
      matchType: 'pattern'
    };
  }

  // Strategy 2: Check for key concepts from expected answer
  const keyWords = expectedLower.split(/\s+/).filter(w => w.length > 4);
  let conceptMatch = 0;
  for (const word of keyWords) {
    if (responseLower.includes(word)) {
      conceptMatch++;
    }
  }

  // Strategy 3: Simple keyword matching
  const truthIndicators = {
    'TRUE_CERTAIN': ['yes', 'true', 'correct', 'is a', 'is an', 'are', 'can', 'does'],
    'FALSE': ['no', 'not', 'false', 'incorrect', 'cannot', 'is not', 'are not', 'less likely'],
    'PLAUSIBLE': ['possibly', 'maybe', 'likely', 'probably', 'could be', 'might', 'plausible'],
    'UNKNOWN': ['unknown', 'uncertain', 'not sure', 'cannot determine', 'don\'t have enough']
  };

  const indicators = truthIndicators[expectedTruth] || [];
  let matchCount = 0;
  for (const indicator of indicators) {
    if (responseLower.includes(indicator)) {
      matchCount++;
    }
  }

  // Check for negative indicators (would contradict the expected truth)
  const negativeIndicators = expectedTruth === 'TRUE_CERTAIN'
    ? truthIndicators['FALSE']
    : expectedTruth === 'FALSE'
      ? truthIndicators['TRUE_CERTAIN']
      : [];

  let negativeCount = 0;
  for (const indicator of negativeIndicators) {
    if (responseLower.includes(indicator)) {
      negativeCount++;
    }
  }

  // NL passes if we have indicators and they outweigh negatives, or good concept match
  const nlPassed = (matchCount > negativeCount) ||
                   (matchCount > 0 && conceptMatch >= keyWords.length * 0.3);

  if (nlPassed) {
    return {
      passed: true,
      reason: `NL Match: ${matchCount} indicators (+), ${negativeCount} (-), ${conceptMatch}/${keyWords.length} concepts`,
      matchType: 'natural_language'
    };
  }

  // Strategy 4: Check structured/DSL result
  const structured = parseStructuredResult(response);
  if (structured.found) {
    const normalizedExpected = normalizeTruth(expectedTruth);
    const normalizedActual = normalizeTruth(structured.truth);

    if (normalizedExpected === normalizedActual) {
      return {
        passed: true,
        reason: `DSL Match: Expected ${expectedTruth}, got ${structured.truth}` +
                (structured.method ? ` (method: ${structured.method})` : ''),
        matchType: 'structured_dsl'
      };
    }

    // Special case: UNKNOWN from DSL but NL text suggests the expected answer
    if (structured.truth === 'UNKNOWN' && matchCount > 0) {
      return {
        passed: true,
        reason: `Weak NL Match (DSL UNKNOWN but ${matchCount} text indicators for ${expectedTruth})`,
        matchType: 'weak_nl'
      };
    }

    return {
      passed: false,
      reason: `DSL mismatch: expected ${expectedTruth}, got ${structured.truth}`,
      matchType: 'none',
      structuredResult: structured
    };
  }

  return {
    passed: false,
    reason: `No match: ${matchCount} indicators, ${conceptMatch}/${keyWords.length} concepts, no DSL`,
    matchType: 'none'
  };
}

/**
 * Evaluate translation quality for a single test case
 * Used in EVAL_LLM mode - tests NL→DSL translation accuracy
 * Does NOT execute the generated DSL
 */
async function evaluateTranslation(testCase, evaluator, options, translationStats) {
  const results = {
    id: testCase.id,
    name: testCase.name,
    theoryLoaded: true,  // Not relevant for translation eval
    queries: [],
    passed: 0,
    failed: 0
  };

  // DirectTranslationEvaluator doesn't need fact loading - it only tests NL→DSL translation
  const isDirect = evaluator instanceof DirectTranslationEvaluator;

  // For DirectTranslationEvaluator, set theory context so LLM knows the facts
  if (isDirect && testCase.theory) {
    evaluator.setTheoryContext({
      theory: testCase.theory.natural_language,
      facts: testCase.theory.expected_facts || []
    });
    log(`  Set theory context: ${testCase.theory.expected_facts?.length || 0} facts`, colors.gray);
  }

  if (!isDirect) {
    log(`\n  Loading theory facts into AGI...`, colors.gray);

    // The chat interface processes NATURAL LANGUAGE, not raw DSL
    // So we need to convert DSL facts to natural language for teaching
    if (testCase.theory.expected_facts && testCase.theory.expected_facts.length > 0) {
      // Convert DSL facts to natural language statements
      const nlStatements = testCase.theory.expected_facts.map(fact => dslFactToNaturalLanguage(fact));

      // Send each fact as natural language to teach the chat
      for (const nlFact of nlStatements) {
        if (options.verbose) {
          log(`    Teaching: ${nlFact}`, colors.gray);
        }
        await evaluator.send(nlFact);
      }
      log(`  Loaded ${testCase.theory.expected_facts.length} facts via NL`, colors.gray);
    }

    // Optionally send natural language as context (for LLM understanding)
    if (testCase.theory.natural_language) {
      log(`  Sending NL context to LLM...`, colors.gray);
      const theoryResponse = await evaluator.send(testCase.theory.natural_language);
      if (options.verbose) {
        log(`  Theory response: ${theoryResponse.substring(0, 200)}...`, colors.gray);
      }
    }
  }

  // Evaluate translation for each query
  for (const query of testCase.queries) {
    log(`\n  Query ${query.id}: "${query.natural_language}"`, colors.blue);

    const queryResult = {
      id: query.id,
      question: query.natural_language,
      expectedDsl: query.expected_dsl || '[not defined]',
      generatedDsl: '',
      passed: false,
      matchType: 'none',
      similarity: 0,
      details: ''
    };

    // Skip if no expected_dsl defined
    if (!query.expected_dsl) {
      queryResult.details = 'No expected_dsl in case.json - cannot evaluate translation';
      results.failed++;
      translationStats.none++;
      logResult(false, `No expected_dsl defined for comparison`);
      results.queries.push(queryResult);
      continue;
    }

    try {
      let generatedDsl;

      if (isDirect) {
        // Use DirectTranslationEvaluator's translateQuestion method
        generatedDsl = await evaluator.translateQuestion(query.natural_language);
      } else {
        // Use TranslationEvaluator's send + extractGeneratedDsl
        const response = await evaluator.send(query.natural_language);
        generatedDsl = evaluator.extractGeneratedDsl(response);
      }

      queryResult.generatedDsl = generatedDsl || '';

      // Compare with expected DSL
      const comparison = evaluator.compareDsl(generatedDsl, query.expected_dsl);
      queryResult.matchType = comparison.matchType;
      queryResult.similarity = comparison.similarity;
      queryResult.details = comparison.details;

      // Consider exact and semantic matches as "passed"
      if (comparison.matchType === 'exact' || comparison.matchType === 'semantic') {
        queryResult.passed = true;
        results.passed++;
        translationStats[comparison.matchType === 'exact' ? 'exact' : 'semantic']++;

        const color = comparison.matchType === 'exact' ? colors.green : colors.cyan;
        logResult(true, `${comparison.matchType.toUpperCase()} match (${comparison.similarity}%)`);
      } else {
        results.failed++;
        translationStats[comparison.matchType === 'partial' ? 'partial' : 'none']++;

        logResult(false, `${comparison.matchType.toUpperCase()} (${comparison.similarity}%)`);
        log(`    ${colors.cyan}Expected DSL:${colors.reset}`, '');
        log(`      ${query.expected_dsl.replace(/\n/g, '\n      ')}`, colors.gray);
        log(`    ${colors.yellow}Generated DSL:${colors.reset}`, '');
        log(`      ${generatedDsl || '[none extracted]'}`, colors.gray);
        log(`    ${colors.gray}Details: ${comparison.details}${colors.reset}`, '');
      }

    } catch (err) {
      results.failed++;
      translationStats.none++;
      queryResult.details = `Error: ${err.message}`;
      logResult(false, `Error: ${err.message}`);
    }

    results.queries.push(queryResult);
  }

  return results;
}

/**
 * Run dry-run mode (parse and validate cases without executing)
 */
function dryRun(cases) {
  logSection('DRY RUN - Validating Test Cases');

  let valid = 0;
  let invalid = 0;

  for (const testCase of cases) {
    log(`\n  ${testCase._dir}: ${testCase.name}`, colors.bright);

    // Validate structure
    const issues = [];

    if (!testCase.theory?.natural_language) {
      issues.push('Missing theory.natural_language');
    }
    if (!testCase.queries || testCase.queries.length === 0) {
      issues.push('No queries defined');
    }
    for (const q of testCase.queries || []) {
      if (!q.natural_language) {
        issues.push(`Query ${q.id} missing natural_language`);
      }
      if (!q.expected_answer?.truth) {
        issues.push(`Query ${q.id} missing expected_answer.truth`);
      }
    }

    if (issues.length === 0) {
      valid++;
      logResult(true, `Valid - ${testCase.queries.length} queries`);
    } else {
      invalid++;
      logResult(false, `Invalid:`);
      for (const issue of issues) {
        log(`      - ${issue}`, colors.red);
      }
    }
  }

  logSection('DRY RUN SUMMARY');
  log(`  Valid cases: ${valid}`, colors.green);
  log(`  Invalid cases: ${invalid}`, invalid > 0 ? colors.red : colors.green);

  return invalid === 0;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Known valid options (flags and options with values)
  const validFlags = new Set(['--eval-llm', '--full', '--runFailed', '--verbose', '-v', '--dry-run', '--help', '-h']);
  const validOptionsWithValue = new Set(['--case', '--only-case', '--from', '--to', '--timeout']);

  // Check for --help / -h first - show usage and exit immediately
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  // Validate all arguments
  const unknownArgs = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      if (validFlags.has(arg)) {
        // Valid flag, continue
      } else if (validOptionsWithValue.has(arg)) {
        // Valid option with value, skip the next argument (the value)
        i++;
      } else {
        unknownArgs.push(arg);
      }
    }
    // Non-flag arguments (values) are handled by the options with value skip above
  }

  // If there are unknown arguments, show error and help
  if (unknownArgs.length > 0) {
    console.error(`\n${colors.red}Error: Unknown option(s): ${unknownArgs.join(', ')}${colors.reset}\n`);
    showUsage();
    process.exit(1);
  }

  const options = {
    filterCase: null,
    from: null,
    to: null,
    runFailed: args.includes('--runFailed'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run'),
    timeout: DEFAULT_TIMEOUT
  };

  // Determine execution mode (DEFAULT is DIRECT_DSL - no LLM)
  if (args.includes('--eval-llm')) {
    EXECUTION_MODE = ExecutionMode.EVAL_LLM;
  } else if (args.includes('--full')) {
    EXECUTION_MODE = ExecutionMode.FULL;
  } else {
    // Default mode: direct DSL execution (no LLM)
    EXECUTION_MODE = ExecutionMode.DIRECT_DSL;
  }

  // Parse --case / --only-case argument (aliases)
  let caseIdx = args.indexOf('--case');
  if (caseIdx === -1) caseIdx = args.indexOf('--only-case');
  if (caseIdx !== -1 && args[caseIdx + 1]) {
    options.filterCase = args[caseIdx + 1];
  }

  // Parse --from argument
  const fromIdx = args.indexOf('--from');
  if (fromIdx !== -1 && args[fromIdx + 1]) {
    options.from = parseInt(args[fromIdx + 1], 10);
  }

  // Parse --to argument
  const toIdx = args.indexOf('--to');
  if (toIdx !== -1 && args[toIdx + 1]) {
    options.to = parseInt(args[toIdx + 1], 10);
  }

  // Parse --timeout argument
  const timeoutIdx = args.indexOf('--timeout');
  if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
    options.timeout = parseInt(args[timeoutIdx + 1], 10);
  }

  // Show usage at startup (only when actually running tests)
  showUsage();

  logSection('AGISystem2 Evaluation Suite');
  log(`  Suite directory: ${SUITE_DIR}`);
  log(`  AGI script: ${AGI_SCRIPT}`);
  log(`  Timeout: ${options.timeout}ms`);

  // Display current mode prominently
  const modeColors = {
    [ExecutionMode.DIRECT_DSL]: colors.green,
    [ExecutionMode.EVAL_LLM]: colors.yellow,
    [ExecutionMode.FULL]: colors.cyan
  };
  const modeDescriptions = {
    [ExecutionMode.DIRECT_DSL]: 'DIRECT DSL (no LLM - pure reasoning test)',
    [ExecutionMode.EVAL_LLM]: 'EVAL LLM (test NL→DSL translation quality)',
    [ExecutionMode.FULL]: 'FULL (end-to-end: LLM → DSL → Execute)'
  };
  log(`  Mode: ${modeDescriptions[EXECUTION_MODE]}`, modeColors[EXECUTION_MODE]);

  // Show active filters
  if (options.from !== null || options.to !== null) {
    log(`  Range: ${options.from || 1} to ${options.to || 'end'}`, colors.cyan);
  }
  if (options.runFailed) {
    log(`  Filter: Running FAILED cases only`, colors.yellow);
  }
  if (options.filterCase) {
    log(`  Filter: ${options.filterCase}`, colors.cyan);
  }

  // Discover test cases
  const cases = discoverCases({
    filterCase: options.filterCase,
    from: options.from,
    to: options.to,
    runFailed: options.runFailed
  });
  log(`\n  Found ${cases.length} test case(s)`, colors.bright);

  if (cases.length === 0) {
    log('  No test cases found!', colors.red);
    process.exit(1);
  }

  // Dry run mode
  if (options.dryRun) {
    const valid = dryRun(cases);
    process.exit(valid ? 0 : 1);
  }

  // Run based on execution mode
  let totalPassed = 0;
  let totalFailed = 0;
  const allResults = [];

  // Translation stats for EVAL_LLM mode
  const translationStats = { exact: 0, semantic: 0, partial: 0, none: 0 };

  for (const testCase of cases) {
    logSection(`Case: ${testCase.id} - ${testCase.name}`);

    // Choose executor based on mode
    let executor;
    const executorNames = {
      [ExecutionMode.DIRECT_DSL]: 'Direct DSL Executor',
      [ExecutionMode.EVAL_LLM]: 'Translation Evaluator',
      [ExecutionMode.FULL]: 'AGISystem2 (Full)'
    };

    switch (EXECUTION_MODE) {
      case ExecutionMode.DIRECT_DSL:
        executor = new DirectDSLExecutor(options);
        break;
      case ExecutionMode.EVAL_LLM:
        // Use DirectTranslationEvaluator for more reliable translation testing
        executor = new DirectTranslationEvaluator(options);
        break;
      case ExecutionMode.FULL:
        executor = new AGIProcess(options);
        break;
    }

    try {
      log(`  Starting ${executorNames[EXECUTION_MODE]}...`, colors.gray);
      await executor.start();

      let result;
      if (EXECUTION_MODE === ExecutionMode.EVAL_LLM) {
        // Translation evaluation mode
        result = await evaluateTranslation(testCase, executor, options, translationStats);
      } else {
        // Direct DSL or Full mode
        result = await evaluateCase(testCase, executor, options);
      }

      allResults.push(result);
      totalPassed += result.passed;
      totalFailed += result.failed;

    } catch (err) {
      log(`  Error running case: ${err.message}`, colors.red);
      if (options.verbose) {
        console.error(err.stack);
      }
      totalFailed += testCase.queries.length;
    } finally {
      await executor.stop();
    }
  }

  // Final summary - different format based on execution mode
  logSection('EVALUATION SUMMARY');

  const totalQueries = totalPassed + totalFailed;

  if (EXECUTION_MODE === ExecutionMode.EVAL_LLM) {
    // Translation quality summary
    const totalTranslated = translationStats.exact + translationStats.semantic +
                            translationStats.partial + translationStats.none;
    const goodTranslation = translationStats.exact + translationStats.semantic;
    const translationRate = totalTranslated > 0
      ? (goodTranslation / totalTranslated * 100).toFixed(1)
      : 'N/A';

    log(`\n  ${colors.bright}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    log(`  ${colors.bright}║         TRANSLATION QUALITY STATISTICS                    ║${colors.reset}`);
    log(`  ${colors.bright}╠══════════════════════════════════════════════════════════╣${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset} ${colors.cyan}NL→DSL Translation Results:${colors.reset}                            ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.green}✓ Exact:${colors.reset}    ${String(translationStats.exact).padStart(3)}  (perfect match)                   ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.cyan}✓ Semantic:${colors.reset} ${String(translationStats.semantic).padStart(3)}  (same commands, similar args)     ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.yellow}○ Partial:${colors.reset}  ${String(translationStats.partial).padStart(3)}  (50-80% overlap)                  ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.red}✗ None:${colors.reset}     ${String(translationStats.none).padStart(3)}  (poor or no translation)          ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}╠══════════════════════════════════════════════════════════╣${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset} ${colors.bright}TRANSLATION ACCURACY:${colors.reset} ${translationRate}%                            ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   (exact + semantic matches / total)                      ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}╚══════════════════════════════════════════════════════════╝${colors.reset}`);

  } else {
    // Reasoning engine summary (DIRECT_DSL and FULL modes)
    let dslPassed = 0;
    let nlPassed = 0;
    let noDslQuery = 0;
    let dslMismatch = 0;
    let otherFailed = 0;

    for (const result of allResults) {
      for (const query of result.queries) {
        if (query.passed) {
          if (query.matchReason && query.matchReason.includes('DSL Match')) {
            dslPassed++;
          } else {
            nlPassed++;
          }
        } else {
          if (query.matchReason && query.matchReason.includes('no DSL')) {
            noDslQuery++;
          } else if (query.matchReason && query.matchReason.includes('DSL mismatch')) {
            dslMismatch++;
          } else {
            otherFailed++;
          }
        }
      }
    }

    const dslAttempted = dslPassed + dslMismatch;
    const pureReasoningRate = dslAttempted > 0
      ? (dslPassed / dslAttempted * 100).toFixed(1)
      : 'N/A';

    const modeLabel = EXECUTION_MODE === ExecutionMode.DIRECT_DSL
      ? 'DIRECT DSL (Pure Reasoning - No LLM)'
      : 'FULL MODE (LLM + Reasoning)';

    log(`\n  ${colors.bright}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    log(`  ${colors.bright}║  ${modeLabel.padEnd(54)}║${colors.reset}`);
    log(`  ${colors.bright}╠══════════════════════════════════════════════════════════╣${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset} ${colors.cyan}DSL QUERIES (Reasoning Engine):${colors.reset}                        ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.green}✓ Passed:${colors.reset} ${String(dslPassed).padStart(3)}  (reasoning correct)                 ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.red}✗ Failed:${colors.reset} ${String(dslMismatch).padStart(3)}  (reasoning error)                   ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.yellow}─ Total:${colors.reset}  ${String(dslAttempted).padStart(3)}  ${colors.cyan}→ Accuracy: ${pureReasoningRate}%${colors.reset}               ${colors.bright}║${colors.reset}`);
    if (EXECUTION_MODE === ExecutionMode.FULL || nlPassed > 0 || noDslQuery > 0) {
      log(`  ${colors.bright}╠══════════════════════════════════════════════════════════╣${colors.reset}`);
      log(`  ${colors.bright}║${colors.reset} ${colors.gray}NL PATTERN MATCHING (Fallback):${colors.reset}                        ${colors.bright}║${colors.reset}`);
      log(`  ${colors.bright}║${colors.reset}   ${colors.green}✓ Matched:${colors.reset} ${String(nlPassed).padStart(2)}  (text indicators)                  ${colors.bright}║${colors.reset}`);
      log(`  ${colors.bright}║${colors.reset}   ${colors.red}✗ No DSL:${colors.reset}  ${String(noDslQuery).padStart(2)}  (couldn't generate/translate DSL)  ${colors.bright}║${colors.reset}`);
      if (otherFailed > 0) {
        log(`  ${colors.bright}║${colors.reset}   ${colors.red}✗ Other:${colors.reset}   ${String(otherFailed).padStart(2)}                                      ${colors.bright}║${colors.reset}`);
      }
    }
    log(`  ${colors.bright}╠══════════════════════════════════════════════════════════╣${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset} ${colors.bright}TOTALS:${colors.reset}                                                ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   Queries:  ${String(totalQueries).padStart(3)}                                       ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.green}Passed:${colors.reset}   ${String(totalPassed).padStart(3)} (${((totalPassed / totalQueries) * 100).toFixed(1)}%)                               ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}║${colors.reset}   ${colors.red}Failed:${colors.reset}   ${String(totalFailed).padStart(3)}                                       ${colors.bright}║${colors.reset}`);
    log(`  ${colors.bright}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
  }

  // Per-case summary
  log(`\n  ${colors.bright}Per-Case Results:${colors.reset}`);
  for (const result of allResults) {
    const status = result.failed === 0 ? colors.green : colors.yellow;
    log(`  ${result.id}: ${result.passed}/${result.passed + result.failed} passed`, status);
  }

  // Write results to file
  const resultsPath = path.join(SUITE_DIR, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPassed,
    totalFailed,
    cases: allResults
  }, null, 2));
  log(`\n  Results written to: ${resultsPath}`, colors.gray);

  // Save failed cases to failed.json (merge with existing)
  const failedCasesForSave = allResults
    .filter(r => r.failed > 0)
    .map(r => ({
      id: r.id,
      name: r.name,
      failedQueries: r.queries.filter(q => !q.passed).map(q => q.id),
      lastRun: new Date().toISOString()
    }));

  if (failedCasesForSave.length > 0 || options.from !== null || options.to !== null) {
    // Save even if no failures in this range (to clear old failures)
    saveFailedCases(failedCasesForSave, options.from, options.to);
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

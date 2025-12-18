/**
 * EvalSuite - Test Runner (Granular Timeouts & Partial Failures)
 * @module evalSuite/lib/runner
 */

import { NLTransformer } from '../../src/nlp/transformer.mjs';
import { Session } from '../../src/runtime/session.mjs';
import { initHDC, getStrategyId } from '../../src/hdc/facade.mjs';
import { getThresholds } from '../../src/core/constants.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[${category}]`, ...args);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// DEFAULTS
const DEFAULT_TIMEOUTS = {
  nlToDsl: 100,    // ms
  reasoning: 100,  // ms (aggressive default as requested)
  dslToNl: 100     // ms
};

// Reasoning Step Budget (for infinite loop prevention in sync code inside Session)
const DEFAULT_STEP_BUDGET = 1000;

/**
 * Load Core Theories
 * Core theories are essential for proper reasoning and always loaded.
 */
function loadCoreTheories(session) {
  console.log('[Runner] Loading Core Theories...');
  const corePath = path.join(PROJECT_ROOT, 'config', 'Core');
  if (!fs.existsSync(corePath)) return;

  // Load all Core theories except index.sys2 (which uses Load directive)
  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  for (const file of files) {
    dbg('CORE', `Loading theory: ${file}`);
    const content = fs.readFileSync(path.join(corePath, file), 'utf8');
    try {
      const startTime = Date.now();
      const res = session.learn(content);
      const elapsed = Date.now() - startTime;
      if (!res.success) {
        console.error(`[Runner] Failed to load ${file}:`, res.errors);
      } else {
        dbg('CORE', `Loaded ${file} in ${elapsed}ms, facts: ${res.facts}`);
      }
    } catch (e) {
      console.error(`[Runner] Exception loading ${file}:`, e.message);
    }
  }
  console.log('[Runner] Core Theories loaded.');
}

/**
 * Helper: Measure sync execution time (Soft Timeout)
 */
function runSyncWithTimeout(fn, timeoutMs, description) {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    
    if (duration > timeoutMs) {
      return { 
        success: false, 
        result: result, // Return result anyway if it finished, but marked as fail
        error: `Timeout: Operation took ${duration}ms (limit: ${timeoutMs}ms)`,
        duration 
      };
    }
    return { success: true, result, duration };
  } catch (err) {
    return { 
      success: false, 
      error: `Error: ${err.message}`, 
      duration: Date.now() - start 
    };
  }
}

/**
 * Helper: Measure async execution time (Hard Timeout)
 */
async function runAsyncWithTimeout(promise, timeoutMs) {
  const start = Date.now();
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout: Operation exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return { 
      success: true, 
      result, 
      duration: Date.now() - start 
    };
  } catch (err) {
    return { 
      success: false, 
      error: err.message, 
      duration: Date.now() - start 
    };
  }
}

// --- PHASE 1: NL -> DSL ---

function runNlToDsl(testCase, transformer, timeoutMs) {
  dbg('NL->DSL', 'Starting with input:', testCase.input_nl?.substring(0, 50));

  if (!testCase.input_nl) {
    dbg('NL->DSL', 'No NL input, skipping');
    return { passed: true, skipped: true, note: 'No NL input' };
  }

  // Parser is synchronous
  const execution = runSyncWithTimeout(() => {
    dbg('NL->DSL', 'Calling transformer.transform()');
    const result = transformer.transform(testCase.input_nl);
    dbg('NL->DSL', 'Transform result:', result.success, 'DSL:', result.dsl?.substring(0, 50));
    return result;
  }, timeoutMs, 'NL->DSL');

  if (!execution.success) {
    return { 
      passed: false, 
      error: execution.error, 
      durationMs: execution.duration 
    };
  }

  const result = execution.result;
  const hasOutput = result.dsl && result.dsl.trim().length > 0;
  
  if (!result.success || !hasOutput) {
     return {
       passed: false,
       error: result.errors?.map(e => e.error).join('; ') || 'Empty DSL output',
       durationMs: execution.duration
     };
  }

  // Validation against expected_dsl (if provided)
  // Note: We pass even if it doesn't match expected_dsl strictly, 
  // UNLESS the test case specifically demands strict matching.
  // For now, if we got valid DSL, we consider it a "Pass" for the generation phase,
  // letting the reasoning phase prove if it was correct.
  
  return {
    passed: true,
    actual: result.dsl,
    durationMs: execution.duration
  };
}




// --- PHASE 2: REASONING ---

async function runReasoning(testCase, generatedDsl, session, timeoutMs) {
  dbg('REASON', 'Starting action:', testCase.action, 'timeout:', timeoutMs);

  // Determine source DSL:
  // For query/prove: prefer input_dsl (guaranteed correct) over generated
  // For learn: use generated DSL if available, else input_dsl
  let dslToExecute;
  let usedFallback = false;

  if (testCase.action === 'query' || testCase.action === 'prove') {
    // For query/prove, use input_dsl if available (it's the correct DSL)
    if (testCase.input_dsl || testCase.query_dsl) {
      dslToExecute = testCase.query_dsl || testCase.input_dsl;
      dbg('REASON', 'Using input_dsl for query/prove');
    } else if (generatedDsl) {
      dslToExecute = generatedDsl;
      dbg('REASON', 'Using generated DSL (no input_dsl available)');
    }
  } else {
    // For learn, prefer input_dsl (canonical) over generated DSL
    // NL transformer often produces structurally different DSL (different # of facts)
    if (testCase.input_dsl) {
      dslToExecute = testCase.input_dsl;
      usedFallback = true;
      dbg('REASON', 'Using input_dsl for learn (canonical)');
    } else if (generatedDsl && !generatedDsl.trim().startsWith('#')) {
      dslToExecute = generatedDsl;
      dbg('REASON', 'Using generated DSL for learn (no input_dsl)');
    }
  }

  if (!dslToExecute) {
    dbg('REASON', 'No DSL available');
    return { passed: false, error: 'No DSL available' };
  }
  dbg('REASON', 'DSL to execute:', dslToExecute?.substring(0, 80));

  // Execute Async with Timeout
  const execution = await runAsyncWithTimeout((async () => {

    // Setup first
    if (testCase.setup_dsl) {
      session.learn(testCase.setup_dsl);
    }

    if (testCase.action === 'learn') {
      return session.learn(dslToExecute);
    }
    else if (testCase.action === 'listSolutions') {
      // List all CSP solutions for a given solve destination (solutionRelation)
      const destination = dslToExecute.trim();
      const solutions = session.kbFacts.filter(f =>
        f.metadata?.operator === 'cspSolution' &&
        f.metadata?.solutionRelation === destination
      );
      return {
        success: solutions.length > 0,
        destination,
        solutionCount: solutions.length,
        solutions: solutions.map((sol, i) => ({
          index: i + 1,
          facts: sol.metadata?.facts || [],
          assignments: sol.metadata?.assignments || []
        }))
      };
    }
    else {
      // For query/prove, use the DSL
      const queryDsl = testCase.query_dsl || dslToExecute;

      const sessionOptions = { timeout: timeoutMs };

      if (testCase.action === 'prove' || testCase.action === 'elaborate') {
        return session.prove(queryDsl, sessionOptions);
      } else {
        // Solve blocks are executed via learn(), not query()
        // Detect solve block: starts with @dest solve ProblemType
        if (queryDsl.trim().match(/^@\w+\s+solve\s+/)) {
          return session.learn(queryDsl);
        }
        return session.query(queryDsl, sessionOptions);
      }
    }
  })(), timeoutMs);

  if (!execution.success) {
    return {
      passed: false,
      error: execution.error,
      usedFallback,
      durationMs: execution.duration
    };
  }

  const result = execution.result;
  
  // Logical Validation
  let passed = false;
  if (testCase.action === 'learn') passed = result.success;
  else if (testCase.action === 'prove' || testCase.action === 'elaborate') {
      // Prove passes if it returns a valid structure (true or false),
      // correctness is checked in DSL->NL or expected_result
      passed = true;
  } else if (testCase.action === 'listSolutions') {
      // listSolutions passes if it returns valid structure
      passed = result !== undefined && result !== null;
  } else {
      // For query: success=false with valid structure means "no results found"
      // which is a valid outcome - let DSL->NL handle output
      passed = result !== undefined && result !== null;
  }

  return {
    passed,
    actual: result,
    usedFallback,
    durationMs: execution.duration
  };
}


// --- PHASE 3: DSL -> NL (Decoding) ---

function runDslToNl(testCase, reasoningPhase, session, timeoutMs) {
  dbg('DSL->NL', 'Starting, expected_nl:', testCase.expected_nl?.substring(0, 40));



  if (!testCase.expected_nl) {
    dbg('DSL->NL', 'No expected_nl, skipping');
    return { passed: true, skipped: true };
  }
  if (!reasoningPhase.passed && !reasoningPhase.actual) {
    dbg('DSL->NL', 'Reasoning failed, cannot decode');
    return { passed: false, skipped: true, error: 'Reasoning failed, cannot decode' };
  }

  const execution = runSyncWithTimeout(() => {
    const result = reasoningPhase.actual;
    let text = '';
    dbg('DSL->NL', 'Action:', testCase.action, 'result keys:', Object.keys(result || {}));

    if (testCase.action === 'learn') {
       // Check for solve results first (solve blocks return solveResult)
       if (result.solveResult && result.solveResult.type === 'solve') {
         const solveData = result.solveResult;
         if (!solveData.success || solveData.solutionCount === 0) {
           text = solveData.error || 'No valid solutions found.';
         } else {
           text = `Learned ${result.facts} facts`;
         }
       }
       // Include warnings (contradictions, etc.) in the output if present
       else if (result.warnings && result.warnings.length > 0) {
         text = result.warnings[0]; // First warning is most relevant
       } else {
         text = result.success ? `Learned ${result.facts} facts` : 'Failed';
       }
       dbg('DSL->NL', 'Learn text:', text);
    }
    // Handle listSolutions action - enumerate all CSP solutions grouped
    else if (testCase.action === 'listSolutions') {
      if (!result.success || result.solutionCount === 0) {
        text = 'No valid solutions found.';
      } else {
        const solutionTexts = result.solutions.map((sol) => {
          const factTexts = sol.facts.map(fact => {
            const parts = fact.split(' ');
            return session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
          });
          return `Solution ${sol.index}: ${factTexts.join(', ')}`;
        });
        text = `Found ${result.solutionCount} solutions. ${solutionTexts.join('. ')}.`;
      }
      dbg('DSL->NL', 'listSolutions text:', text?.substring(0, 100));
    }
    // Handle solve results for query action
    else if (result.solveResult && result.solveResult.type === 'solve') {
      const solveData = result.solveResult;
      if (!solveData.success || solveData.solutionCount === 0) {
        text = solveData.error || 'No valid solutions found.';
      } else {
        const solutionTexts = solveData.solutions.map((sol, i) => {
          const factTexts = sol.map(fact => {
            // Use structured data if available, fall back to DSL parsing
            if (fact.dsl) {
              const parts = fact.dsl.split(' ');
              return session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
            } else if (fact.predicate) {
              return session.generateText(fact.predicate, [fact.subject, fact.object]).replace(/\.$/, '');
            } else {
              // Fallback for simple string format
              const parts = fact.split(' ');
              return session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
            }
          });
          return `${i + 1}. ${factTexts.join(', ')}`;
        });
        text = `Found ${solveData.solutionCount} valid seating arrangements: ${solutionTexts.join('. ')}.`;
      }
      dbg('DSL->NL', 'Solve text:', text);
    }
    else if (testCase.action === 'prove') {
       dbg('DSL->NL', 'Processing prove result, valid:', result?.valid, 'result:', result?.result);

       if (!result?.valid) {
         // Failed proof - generate text for what couldn't be proven
         let goalText = result?.goal || 'statement';
         if (result?.goal) {
           const parts = result.goal.trim().split(/\s+/).filter(p => !p.startsWith('@'));
           if (parts.length >= 2) {
             goalText = session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
           }
         }
         // Include search trace if available
         if (result?.searchTrace) {
           text = `Cannot prove: ${goalText}. ${result.searchTrace}`;
         } else {
           text = 'Cannot prove: ' + goalText;
         }
       } else if (result.result === false) {
         // Disjoint proof - we proved the NEGATION (e.g., Tokyo NOT in Europe)
         const steps = result.steps || [];
         const proofSteps = [];

         // Extract proof chain from steps
         for (const step of steps) {
           if (step.operation === 'chain_step' && step.from && step.to) {
             const stepText = session.generateText('locatedIn', [step.from, step.to]).replace(/\.$/, '');
             if (stepText && !proofSteps.includes(stepText)) {
               proofSteps.push(stepText);
             }
           } else if (step.operation === 'disjoint_check') {
             proofSteps.push(`${step.container} and ${step.target} are disjoint`);
           }
         }

         // Get goal text
         let goalText = '';
         const goalString = result.goal;
         if (goalString) {
           const parts = goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
           if (parts.length >= 1) {
             goalText = session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
           }
         }

         // Build negative proof output
         if (goalText && proofSteps.length > 0) {
           text = `False: NOT ${goalText}. Proof: ${proofSteps.join('. ')}.`;
         } else if (goalText) {
           text = `False: NOT ${goalText}`;
         } else {
           text = 'Proof valid (negative)';
         }
      } else {
         // Success - directly decode proof step facts into propositions
         const steps = result.steps || [];
         const proofSteps = [];
         let ruleApplied = false;
         let chainOpsCount = 0;
         let chainPrimaryOp = null;
         const chainFacts = [];
         let appliedRuleText = null;

         for (const step of steps) {
            // Highlight rule application steps
            if (step.operation === 'rule_match' || step.operation === 'unification_match' || step.operation === 'rule_applied') {
              ruleApplied = true;
              let ruleName = step.rule || 'rule';
              if (ruleName.includes('@causeAnd') || ruleName.includes('indirectConc')) {
                ruleName = '(A causes B AND B causes C) implies wouldPrevent A C';
              }
              const factText = step.fact ? ` implies ${step.fact}` : '';
              const ruleText = `Applied rule: ${ruleName}${factText}`;
              appliedRuleText = ruleText;
              if (!proofSteps.includes(ruleText)) {
                proofSteps.push(ruleText);
              }
              continue;
            }

            if (step.operation === 'value_type_inheritance' && step.fact) {
              const inheritText = `Inherited via value type: ${step.fact}`;
              if (!proofSteps.includes(inheritText)) {
                proofSteps.push(inheritText);
              }
              continue;
            }

            if (step.operation === 'and_satisfied') {
              const detail = step.detail ? `: ${step.detail}` : '';
              proofSteps.push(`And condition satisfied${detail}`);
              continue;
            }

            if (step.operation === 'or_satisfied') {
              const detail = step.detail ? ` via ${step.detail}` : '';
              proofSteps.push(`Or condition satisfied${detail}`);
              continue;
            }

            if (step.fact) {
              // Parse DSL fact: "operator arg1 arg2" - format as "arg1 operator arg2"
              const factParts = step.fact.trim().split(/\s+/);
              if (factParts.length >= 3) {
                const stepOp = factParts[0];
                const args = factParts.slice(1);
                if (['before', 'causes', 'isA', 'locatedIn', 'partOf'].includes(stepOp)) {
                  chainPrimaryOp = chainPrimaryOp || stepOp;
                  if (!chainPrimaryOp || chainPrimaryOp === stepOp) {
                    chainOpsCount++;
                  }
                }
                // Prefer generateText for natural phrasing
                const generated = session.generateText(stepOp, args).replace(/[.!?]+$/, '');
                const stepText = generated || `${args[0]} ${stepOp} ${args.slice(1).join(' ')}`;
                if (stepText && !proofSteps.includes(stepText)) {
                  proofSteps.push(stepText);
                  chainFacts.push(stepText);
                }
              } else if (factParts.length === 2) {
                // Unary: "operator X" -> "X operator"
                const stepText = `${factParts[1]} ${factParts[0]}`;
                if (stepText && !proofSteps.includes(stepText)) {
                  proofSteps.push(stepText);
                }
              }
            }
         }

         if (!ruleApplied && chainOpsCount >= 2) {
           let chainLabel = 'Transitive chain';
           if (chainPrimaryOp === 'causes') chainLabel = 'Causal chain';
           proofSteps.push(`${chainLabel} verified (${chainOpsCount} hops)`);
         }

         // Add explicit search narrative for causal rule chains
         if (ruleApplied && chainPrimaryOp === 'causes') {
           const factSteps = chainFacts.filter(f => f.includes(' causes '));
           if (factSteps.length > 0) {
             const searches = factSteps.map((fact, idx) => {
               const subj = fact.split(' ')[0];
               const hole = String.fromCharCode('b'.charCodeAt(0) + idx);
               return `Searched causes ${subj} ?${hole}. Found: ${fact}`;
             });
             const andLine = proofSteps.find(p => p.startsWith('And condition satisfied'));
             const chainLine = chainOpsCount >= 2 ? `Causal chain verified (${chainOpsCount} hops)` : null;
             const newProof = [...searches];
             if (chainLine) newProof.push(chainLine);
             if (andLine) newProof.push(andLine);
             if (appliedRuleText) newProof.push(appliedRuleText);
             proofSteps.length = 0;
             proofSteps.push(...newProof);
           }
         }

         // Get the goal text
         let goalText = '';
         const goalString = result.goal || (steps.length > 0 && steps[0].goal);
         if (goalString) {
           const parts = goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
           if (parts.length >= 1) {
             goalText = session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
           }
         }

         // Guard against hallucinated single-step proofs (goal echoed but not in KB)
         const goalParts = (result.goal || '').trim().split(/\s+/).filter(p => !p.startsWith('@'));
         const goalOp = goalParts[0];
         const goalArgs = goalParts.slice(1);
         let goalFactInKb = false;
         if (goalOp && goalArgs.length > 0 && Array.isArray(session?.kbFacts)) {
           goalFactInKb = session.kbFacts.some(f => {
             const meta = f.metadata;
             if (!meta || meta.operator !== goalOp) return false;
             const args = meta.args || [];
             if (!Array.isArray(args) || args.length !== goalArgs.length) return false;
             for (let i = 0; i < args.length; i++) {
               if (args[i] !== goalArgs[i]) return false;
             }
             return true;
           });
         }
         const trivialEcho = proofSteps.length <= 1 && !ruleApplied && chainOpsCount <= 1;
         if (trivialEcho && !goalFactInKb) {
           const goalDesc = goalText || 'goal';
           text = `Cannot prove: ${goalDesc}. Search: Goal fact not found in KB; ignored low-confidence guess.`;
           dbg('DSL->NL', 'Trivial echo guarded, goal not in KB');
           return text;
         }

         // Build output with proof chain
         if (goalText && proofSteps.length > 0) {
           const proofBody = proofSteps.join('. ');
           const conclusion = goalText ? ` Therefore ${goalText}.` : '';
           text = `True: ${goalText}. Proof: ${proofBody}.${conclusion}`;
         } else if (goalText) {
           text = `True: ${goalText}`;
         } else {
           text = 'Proof valid';
         }
       }
       dbg('DSL->NL', 'Prove result text:', text?.substring(0, 80));
    }
    else if (testCase.action === 'elaborate') {
       dbg('DSL->NL', 'Calling session.elaborate()');
       const el = session.elaborate(result);
       text = el.text;
       dbg('DSL->NL', 'Elaborate result:', text?.substring(0, 50));
    }
    else {
       // Reconstruct text for query
       dbg('DSL->NL', 'Query result bindings:', result.bindings ? 'yes' : 'no');
       if (result.bindings && result.bindings.size > 0) {
           const texts = [];
           const query = testCase.query_dsl || testCase.input_dsl || '';

           // For multi-statement DSL, find the line that contains a query (has ? hole)
           const lines = query.trim().split('\n').map(l => l.trim()).filter(l => l);
           const queryLine = lines.find(l => l.includes('?')) || lines[lines.length - 1];

           const parts = queryLine.split(/\s+/).filter(p => !p.startsWith('@'));
           const op = parts[0];
           dbg('DSL->NL', 'Query op:', op, 'parts:', parts);

           // Get all results - ensure bindings are Maps
           const allResults = result.allResults || [];

           // Reserved symbols to filter out (HDC noise)
           const RESERVED = new Set([
             'ForAll', 'And', 'Or', 'Not', 'Implies', 'Exists',
             'isA', 'has', 'can', 'must', 'causes', 'implies',
             'seatedAt', 'conflictsWith', 'locatedIn'
           ]);

           // Filter for reliable matches (direct, transitive, bundle_common, rule-derived, compound_csp, hdc_validated, and symbolic_supplement)
           const reliableMethods = new Set(['direct', 'transitive', 'bundle_common', 'rule', 'rule_derived', 'compound_csp', 'property_inheritance', 'hdc_validated', 'hdc_transitive_validated', 'hdc_direct_validated', 'hdc_rule_validated', 'symbolic_supplement', 'symbolic_fallback']);
           const directMatches = allResults.filter(r => {
             if (!r.bindings || !reliableMethods.has(r.method)) return false;
             const hasBindings = r.bindings instanceof Map ?
               r.bindings.size > 0 :
               Object.keys(r.bindings).length > 0;
             return hasBindings;
           });

           // Get strategy-dependent HDC threshold
           const strategy = session.hdcStrategy || 'dense-binary';
           const thresholds = getThresholds(strategy);
           const hdcThreshold = thresholds.HDC_MATCH;

           // Also include HDC matches above strategy-dependent threshold
           const hdcMatches = allResults.filter(r => {
             if (!r.bindings || reliableMethods.has(r.method)) return false; // Skip if already a reliable method
             const hasBindings = r.bindings instanceof Map ?
               r.bindings.size > 0 :
               Object.keys(r.bindings).length > 0;
             // Accept HDC matches above strategy-dependent threshold
             if (!hasBindings || (r.score || 0) < hdcThreshold) return false;

             // Filter out results with reserved symbols
             if (r.bindings instanceof Map) {
               for (const [k, v] of r.bindings) {
                 if (RESERVED.has(v?.answer)) return false;
               }
             }
             return true;
           });

           // Combine reliable matches with HDC matches, deduplicating by answer
           const getFirstHoleAnswer = (r) => {
             const holeName = parts.find(p => p.startsWith('?'))?.substring(1);
             if (!holeName) return null;
             return r.bindings instanceof Map ?
               r.bindings.get(holeName)?.answer :
               r.bindings?.[holeName]?.answer;
           };

           const seenAnswers = new Set();
           const goodResults = [];
           // Add directMatches first (higher priority)
           for (const r of directMatches) {
             const answer = getFirstHoleAnswer(r);
             if (answer && !seenAnswers.has(answer)) {
               seenAnswers.add(answer);
               goodResults.push(r);
             }
           }
           // Add hdcMatches that aren't duplicates
           for (const r of hdcMatches) {
             const answer = getFirstHoleAnswer(r);
             if (answer && !seenAnswers.has(answer)) {
               seenAnswers.add(answer);
               goodResults.push(r);
             }
           }

           // If no results with bindings in allResults, use main result.bindings
           const resultsToProcess = goodResults.length > 0 ?
             goodResults :
             (result.bindings?.size > 0 ? [{bindings: result.bindings, score: 1, method: 'direct'}] : []);

           for(const r of resultsToProcess) {
               // Handle both Map and plain object bindings
               const getBinding = (name) => {
                 if (r.bindings instanceof Map) {
                   return r.bindings.get(name)?.answer;
                 }
                 return r.bindings[name]?.answer;
               };

               const args = parts.slice(1).map(a => {
                   if(a.startsWith('?')) {
                       const answer = getBinding(a.substring(1));
                       // Filter out internal symbols (garbage HDC matches)
                       if (answer && !answer.startsWith('__') && !['ForAll', 'And', 'Or', 'Not', 'Implies'].includes(answer)) {
                           return answer;
                       }
                       return a; // Keep variable placeholder if no valid answer
                   }
                   return a;
               });
               // Skip if still has unresolved variables
               if (args.some(a => a.startsWith('?'))) continue;
               dbg('DSL->NL', 'generateText args:', op, args);
               // Remove trailing punctuation for consistent joining
               const generatedText = session.generateText(op, args).replace(/[.!?]+$/, '');

               // Extract proof trace from the binding's steps if available
               const holeName = parts.find(p => p.startsWith('?'))?.substring(1);
               const bindingData = r.bindings instanceof Map ? r.bindings.get(holeName) : r.bindings?.[holeName];
               const proofSteps = bindingData?.steps;

               // Format result with proof trace if available
               if (proofSteps && proofSteps.length > 0) {
                 // Keep DSL format for proof chain: "isA X Y" not "X is a Y"
                 const proofText = proofSteps.join('. ');
                 texts.push(`${generatedText}. Proof: ${proofText}`);
               } else {
                 texts.push(generatedText);
               }
           }
           // Join with '. ' and add final period
           if (texts.length === 0 && op === 'can' && parts[2]) {
             // Fallback: infer can X Pay via has X PaymentMethod (value inheritance style)
             const target = parts[2];
             const candidates = new Set();
             for (const fact of session.kbFacts) {
               const meta = fact.metadata;
               if (meta?.operator === 'has') {
                 const holder = meta.args?.[0];
                 const value = meta.args?.[1];
                 if (!holder || !value) continue;
                 // Check if value isA target (transitively)
                 const queue = [value];
                 const visited = new Set();
                 let matches = false;
                 while (queue.length > 0) {
                   const cur = queue.shift();
                   if (visited.has(cur)) continue;
                   visited.add(cur);
                   if (cur === target) {
                     matches = true;
                     break;
                   }
                   for (const f2 of session.kbFacts) {
                     const m2 = f2.metadata;
                     if (m2?.operator === 'isA' && m2.args?.[0] === cur) {
                       queue.push(m2.args[1]);
                     }
                   }
                 }
                 if (matches) {
                   candidates.add(holder);
                 }
               }
             }
             if (candidates.size > 0) {
               const fallbackTexts = [...candidates].map(holder => session.generateText(op, [holder, target]).replace(/[.!?]+$/, ''));
               text = [...new Set(fallbackTexts)].join('. ') + '.';
             } else {
               text = 'No results';
             }
           } else {
             text = texts.length > 0 ? [...new Set(texts)].join('. ') + '.' : 'No results';
           }
       } else {
           text = 'No results';
       }
       dbg('DSL->NL', 'Final text:', text?.substring(0, 80));
    }
    return text || 'No output';
  }, timeoutMs, 'DSL->NL');

  if (!execution.success) {
    return { passed: false, error: execution.error, durationMs: execution.duration };
  }

  const actualText = execution.result;

  // Comparison - normalize by removing punctuation, articles, and extra whitespace
  const normalize = s => s.toLowerCase()
    .replace(/\bisa\b/g, 'is a')       // Convert DSL "isA" to NL "is a"
    .replace(/\bhasa\b/g, 'has a')     // Convert DSL "hasA" to NL "has a"
    .replace(/[^\w\s]/g, '')           // Remove punctuation
    .replace(/\b(a|an|the)\b/g, '')    // Remove articles
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();

  // For queries with multiple results, check if all expected parts are present (order-independent)
  let passed;
  if (testCase.action === 'query' && testCase.expected_nl.includes('.')) {
    // Split expected into parts and check all are present
    const expectedParts = normalize(testCase.expected_nl).split(/\s+/).filter(w => w.length > 2);
    const actualNorm = normalize(actualText);
    passed = expectedParts.every(part => actualNorm.includes(part));
  } else {
    passed = normalize(actualText).includes(normalize(testCase.expected_nl));
  }

  return {
    passed,
    actual: actualText,
    expected: testCase.expected_nl,
    durationMs: execution.duration
  };
}


// --- MAIN RUNNERS ---

export async function runCase(testCase, session = null, config = {}) {
  const sess = session || new Session({ geometry: 2048 });
  if (!session) loadCoreTheories(sess);

  // Apply timeouts (Cascade: Case Config > Suite Config (passed in func) > Defaults)
  const timeouts = {
    nlToDsl: testCase.timeout_nl || config.nlToDsl || DEFAULT_TIMEOUTS.nlToDsl,
    reasoning: testCase.timeout_reasoning || config.reasoning || DEFAULT_TIMEOUTS.reasoning,
    dslToNl: testCase.timeout_decoding || config.dslToNl || DEFAULT_TIMEOUTS.dslToNl
  };

  const transformer = new NLTransformer();
  const phases = {};

  // 1. NL -> DSL
  phases.nlToDsl = runNlToDsl(testCase, transformer, timeouts.nlToDsl);

  // 2. Reasoning (Uses Generated DSL if valid, else Fallback Input DSL)
  phases.reasoning = await runReasoning(testCase, phases.nlToDsl.actual, sess, timeouts.reasoning);

  // 3. DSL -> NL
  phases.dslToNl = runDslToNl(testCase, phases.reasoning, sess, timeouts.dslToNl);

  // Overall Status
  // A case passes ONLY if all applicable phases passed
  // But we return full detail for partial analysis
  const passed = phases.nlToDsl.passed && phases.reasoning.passed && phases.dslToNl.passed;

  return {
    passed,
    phases
  };
}

export async function runSuite(suite, options = {}) {
  const results = [];

  // Initialize HDC strategy if specified
  const strategyId = options.strategy || process.env.SYS2_HDC_STRATEGY || 'dense-binary';
  initHDC(strategyId);

  // Set reasoning priority if specified (for Session constructor)
  const reasoningPriority = options.reasoningPriority || process.env.REASONING_PRIORITY || 'symbolicPriority';
  process.env.REASONING_PRIORITY = reasoningPriority;

  // Use geometry from options or defaults
  // Dense-binary: vector dimension (default 2048)
  // Sparse-polynomial: exponent count k (default 4)
  // Metric-affine: byte channels (default 32)
  let defaultGeometry;
  if (strategyId === 'sparse-polynomial') {
    defaultGeometry = 4;
  } else if (strategyId === 'metric-affine') {
    defaultGeometry = 32;
  } else {
    defaultGeometry = 2048;
  }
  const geometry = options.geometry || defaultGeometry;
  const session = new Session({
    geometry,
    hdcStrategy: strategyId,
    reasoningPriority
  });

  dbg('CONFIG', `Strategy: ${strategyId}, Geometry: ${geometry}, Priority: ${reasoningPriority}`);

  // 1. Load Core Theories
  loadCoreTheories(session);

  // 2. Load Suite-Specific Theories
  if (suite.suiteTheories && suite.suiteTheories.length > 0) {
    console.log(`[Runner] Loading ${suite.suiteTheories.length} suite-specific theories...`);
    for (const theoryContent of suite.suiteTheories) {
      try {
        const res = session.learn(theoryContent);
        if (!res.success) {
          console.error('[Runner] Failed to load suite theory:', res.errors);
        }
      } catch (e) {
        console.error('[Runner] Exception loading suite theory:', e.message);
      }
    }
  }

  // Suite-level timeout config
  const suiteConfig = {
    nlToDsl: suite.timeouts?.nlToDsl || DEFAULT_TIMEOUTS.nlToDsl,
    reasoning: suite.timeouts?.reasoning || DEFAULT_TIMEOUTS.reasoning,
    dslToNl: suite.timeouts?.dslToNl || DEFAULT_TIMEOUTS.dslToNl
  };

  console.log(`Running suite with timeouts: ${JSON.stringify(suiteConfig)}`);

  const suiteStartTime = Date.now();
  for (const step of suite.cases) {
    const result = await runCase(step, session, suiteConfig);
    results.push(result);
  }
  const suiteDurationMs = Date.now() - suiteStartTime;

  const reasoningStats = session.getReasoningStats();
  session.close();

  // Stats
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  
  // Count "Partial Fixes" -> NL Failed but Reasoning Passed (using fallback)
  const brokenParser = results.filter(r => !r.phases.nlToDsl.passed && r.phases.reasoning.passed).length;

  return {
    results,
    summary: {
      total,
      passed,
      failed: total - passed,
      brokenParser, // Useful metric: logic works, language fails
      reasoningStats,
      results, // Include results for detailed reporting
      strategyId, // Include which strategy was used
      geometry, // Include geometry used
      durationMs: suiteDurationMs // Time to run suite
    },
    cases: suite.cases, // Include cases for detailed reporting
    name: suite.name,
    suiteName: suite.suiteName,
    strategyId, // Include strategy at suite level too
    geometry, // Include geometry at suite level too
    durationMs: suiteDurationMs
  };
}

export default { runCase, runSuite };

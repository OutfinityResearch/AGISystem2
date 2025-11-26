/**
 * DS(/theory/dsl_engine.js) - Sys2DSL Engine
 *
 * Main entry point for executing Sys2DSL scripts.
 * Composes modular command handlers for different capabilities.
 *
 * Architecture:
 * - DSLParser: Parsing and variable resolution
 * - DSLCommandsCore: Basic commands (ASK, ASSERT, etc.)
 * - DSLCommandsMemory: Memory management (FORGET, BOOST, etc.)
 * - DSLCommandsTheory: Theory layers (PUSH, POP, etc.)
 * - DSLCommandsReasoning: Logic (INFER, PROVE, etc.)
 * - DSLCommandsOutput: Formatting (TO_NATURAL, EXPLAIN, etc.)
 *
 * @module theory/dsl_engine
 */

const ContradictionDetector = require('../reason/contradiction_detector');
const InferenceEngine = require('../reason/inference_engine');
const DSLParser = require('./dsl_parser');
const DSLCommandsCore = require('./dsl_commands_core');
const DSLCommandsMemory = require('./dsl_commands_memory');
const DSLCommandsTheory = require('./dsl_commands_theory');
const DSLCommandsReasoning = require('./dsl_commands_reasoning');
const DSLCommandsInference = require('./dsl_commands_inference');
const DSLCommandsOutput = require('./dsl_commands_output');

class TheoryDSLEngine {
  constructor({ api, conceptStore, config }) {
    this.api = api;
    this.conceptStore = conceptStore;
    this.config = config;

    // Initialize parser
    this.parser = new DSLParser();

    // Initialize reasoning engines
    this.contradictionDetector = new ContradictionDetector({
      store: conceptStore,
      config
    });
    this.inferenceEngine = new InferenceEngine({
      store: conceptStore,
      detector: this.contradictionDetector,
      config
    });

    // Initialize command handlers
    this.coreCommands = new DSLCommandsCore({
      api,
      conceptStore,
      config,
      parser: this.parser
    });

    this.memoryCommands = new DSLCommandsMemory({
      conceptStore,
      parser: this.parser
    });

    this.theoryCommands = new DSLCommandsTheory({
      conceptStore,
      parser: this.parser
    });

    this.reasoningCommands = new DSLCommandsReasoning({
      conceptStore,
      contradictionDetector: this.contradictionDetector,
      parser: this.parser,
      coreCommands: this.coreCommands
    });

    this.inferenceCommands = new DSLCommandsInference({
      inferenceEngine: this.inferenceEngine,
      parser: this.parser
    });

    this.outputCommands = new DSLCommandsOutput({
      parser: this.parser
    });
  }

  /**
   * Execute a Sys2DSL script.
   * @param {string[]} lines - Script lines
   * @param {Object} options - Execution options
   * @returns {Object} - Variable environment after execution
   */
  runScript(lines, options = {}) {
    const env = { ...(options.initialEnv || {}) };
    this._contextFacts = Array.isArray(options.contextFacts)
      ? options.contextFacts.slice()
      : [];

    const statements = this.parser.splitIntoStatements(lines || []);
    const order = this.parser.topologicalOrder(statements);

    for (const stmt of order) {
      const facts = this._getFacts(this._contextFacts);
      const value = this._executeCommand(stmt.command, stmt.args, env, facts);
      env[stmt.varName] = value;
    }

    return env;
  }

  _getFacts(contextFacts) {
    const base = this.conceptStore && typeof this.conceptStore.getFacts === 'function'
      ? this.conceptStore.getFacts()
      : [];
    if (!contextFacts || contextFacts.length === 0) {
      return base;
    }
    return base.concat(contextFacts);
  }

  _executeCommand(command, argTokens, env, facts) {
    // Route to appropriate command handler
    switch (command) {
      // Core Commands
      case 'ASK':
        return this.coreCommands.cmdAsk(argTokens, env);
      case 'ASSERT':
        return this.coreCommands.cmdAssert(argTokens, env);
      case 'CF':
        return this.coreCommands.cmdCounterfactual(argTokens, env);
      case 'ABDUCT':
        return this.coreCommands.cmdAbduct(argTokens, env);
      case 'FACTS_MATCHING':
        return this.coreCommands.cmdFactsMatching(argTokens, env, facts);
      case 'ALL_REQUIREMENTS_SATISFIED':
        return this.coreCommands.cmdAllRequirementsSatisfied(argTokens, env);

      // Boolean Operations
      case 'BOOL_AND':
        return this.coreCommands.cmdBoolAnd(argTokens, env);
      case 'BOOL_OR':
        return this.coreCommands.cmdBoolOr(argTokens, env);
      case 'BOOL_NOT':
        return this.coreCommands.cmdBoolNot(argTokens, env);
      case 'NONEMPTY':
        return this.coreCommands.cmdNonEmpty(argTokens, env);

      // List Operations
      case 'MERGE_LISTS':
        return this.coreCommands.cmdMergeLists(argTokens, env);
      case 'PICK_FIRST':
        return this.coreCommands.cmdPickFirst(argTokens, env);
      case 'PICK_LAST':
        return this.coreCommands.cmdPickLast(argTokens, env);
      case 'COUNT':
        return this.coreCommands.cmdCount(argTokens, env);
      case 'FILTER':
        return this.coreCommands.cmdFilter(argTokens, env);
      case 'POLARITY_DECIDE':
        return this.coreCommands.cmdPolarityDecide(argTokens, env);

      // Concept/Relation Binding
      case 'BIND_CONCEPT':
        return this.coreCommands.cmdBindConcept(argTokens, env);
      case 'BIND_POINT':
        return this.coreCommands.cmdBindPoint(argTokens, env);
      case 'BIND_RELATION':
        return this.coreCommands.cmdBindRelation(argTokens, env);
      case 'DEFINE_CONCEPT':
        return this.coreCommands.cmdDefineConcept(argTokens, env);
      case 'DEFINE_RELATION':
        return this.coreCommands.cmdDefineRelation(argTokens, env);
      case 'INSPECT':
        return this.coreCommands.cmdInspect(argTokens, env);
      case 'LITERAL':
        return this.coreCommands.cmdLiteral(argTokens, env);

      // Masking
      case 'MASK_PARTITIONS':
        return this.coreCommands.cmdMaskPartitions(argTokens);
      case 'MASK_DIMS':
        return this.coreCommands.cmdMaskDims(argTokens);
      case 'ASK_MASKED':
        return this.coreCommands.cmdAskMasked(argTokens, env);

      // Memory Management
      case 'RETRACT':
        return this.memoryCommands.cmdRetract(argTokens, env);
      case 'GET_USAGE':
        return this.memoryCommands.cmdGetUsage(argTokens, env);
      case 'FORGET':
        return this.memoryCommands.cmdForget(argTokens, env);
      case 'BOOST':
        return this.memoryCommands.cmdBoost(argTokens, env);
      case 'PROTECT':
        return this.memoryCommands.cmdProtect(argTokens, env);
      case 'UNPROTECT':
        return this.memoryCommands.cmdUnprotect(argTokens, env);

      // Theory Management
      case 'LIST_THEORIES':
        return this.theoryCommands.cmdListTheories();
      case 'LOAD_THEORY':
        return this.theoryCommands.cmdLoadTheory(argTokens, env);
      case 'SAVE_THEORY':
        return this.theoryCommands.cmdSaveTheory(argTokens, env);
      case 'MERGE_THEORY':
        return this.theoryCommands.cmdMergeTheory(argTokens, env);
      case 'THEORY_PUSH':
        return this.theoryCommands.cmdTheoryPush(argTokens, env);
      case 'THEORY_POP':
        return this.theoryCommands.cmdTheoryPop();
      case 'RESET_SESSION':
        return this.theoryCommands.cmdResetSession();

      // Reasoning Commands
      case 'VALIDATE':
        return this.reasoningCommands.cmdValidate(argTokens, env, facts);
      case 'PROVE':
        return this.reasoningCommands.cmdProve(argTokens, env, facts);
      case 'HYPOTHESIZE':
        return this.reasoningCommands.cmdHypothesize(argTokens, env, facts);
      case 'ANALOGICAL':
        return this.reasoningCommands.cmdAnalogical(argTokens, env);

      // Contradiction Detection
      case 'CHECK_CONTRADICTION':
        return this.reasoningCommands.cmdCheckContradiction(argTokens, env, facts);
      case 'CHECK_WOULD_CONTRADICT':
        return this.reasoningCommands.cmdCheckWouldContradict(argTokens, env, facts);
      case 'REGISTER_FUNCTIONAL':
        return this.reasoningCommands.cmdRegisterFunctional(argTokens, env);
      case 'REGISTER_CARDINALITY':
        return this.reasoningCommands.cmdRegisterCardinality(argTokens, env);

      // Inference Commands
      case 'INFER':
        return this.inferenceCommands.cmdInfer(argTokens, env, facts);
      case 'FORWARD_CHAIN':
        return this.inferenceCommands.cmdForwardChain(argTokens, env, facts);
      case 'DEFINE_RULE':
        return this.inferenceCommands.cmdDefineRule(argTokens, env);
      case 'DEFINE_DEFAULT':
        return this.inferenceCommands.cmdDefineDefault(argTokens, env);
      case 'WHY':
        return this.inferenceCommands.cmdWhy(argTokens, env, facts);

      // Output/Export Commands
      case 'TO_NATURAL':
        return this.outputCommands.cmdToNatural(argTokens, env);
      case 'TO_JSON':
        return this.outputCommands.cmdToJson(argTokens, env);
      case 'EXPLAIN':
        return this.outputCommands.cmdExplain(argTokens, env);
      case 'FORMAT':
        return this.outputCommands.cmdFormat(argTokens, env);
      case 'SUMMARIZE':
        return this.outputCommands.cmdSummarize(argTokens, env);

      default:
        throw new Error(`Unknown DSL command '${command}'`);
    }
  }
}

module.exports = TheoryDSLEngine;

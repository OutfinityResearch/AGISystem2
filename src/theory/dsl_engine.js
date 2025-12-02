/**
 * DS(/theory/dsl_engine.js) - Sys2DSL Engine v3.0
 *
 * Main entry point for executing Sys2DSL v3.0 strict triple syntax.
 * Composes modular command handlers for different capabilities.
 *
 * v3.0 Syntax: @variable Subject VERB Object
 * - VERB is the command (extracted from position 2)
 * - Subject and Object are passed to command handlers
 * - @_ prefix = assertion/effectful, @varName = query/capture result
 *
 * Architecture:
 * - DSLParser: Parsing and variable resolution (v3.0 strict)
 * - DSLCommandsCore: Basic commands (relation verbs become assertions/queries)
 * - DSLCommandsMemory: Memory management (FORGET, BOOST, etc.)
 * - DSLCommandsTheory: Theory layers (PUSH, POP, etc.)
 * - DSLCommandsReasoning: Logic (INFER, PROVE, etc.)
 * - DSLCommandsOutput: Formatting (TO_NATURAL, EXPLAIN, etc.)
 *
 * @module theory/dsl_engine
 */

const ContradictionDetector = require('../reason/contradiction_detector');
const InferenceEngine = require('../reason/inference_engine');
const DimensionRegistry = require('../core/dimension_registry');
const DSLParser = require('./dsl_parser');
const DSLCommandsCore = require('./dsl_commands_core');
const DSLCommandsMemory = require('./dsl_commands_memory');
const DSLCommandsTheory = require('./dsl_commands_theory');
const DSLCommandsReasoning = require('./dsl_commands_reasoning');
const DSLCommandsInference = require('./dsl_commands_inference');
const DSLCommandsOutput = require('./dsl_commands_output');
const DSLCommandsOntology = require('./dsl_commands_ontology');
const DSLCommandsHighLevel = require('./dsl_commands_highlevel');

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
      inferenceEngine: this.inferenceEngine,
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

    this.highLevelCommands = new DSLCommandsHighLevel({
      coreCommands: this.coreCommands,
      inferenceCommands: this.inferenceCommands,
      reasoningCommands: this.reasoningCommands,
      memoryCommands: this.memoryCommands,
      theoryCommands: this.theoryCommands,
      outputCommands: this.outputCommands,
      parser: this.parser
    });

    // Initialize ontology introspection commands
    this.ontologyCommands = new DSLCommandsOntology({
      conceptStore,
      parser: this.parser,
      dimRegistry: DimensionRegistry.getShared()
    });
  }

  /**
   * Execute a Sys2DSL v3.0 script.
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
      // v3.0: Pass statement with subject, object, command, and varName
      const value = this._executeCommand(stmt, env, facts);
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

  /**
   * Execute a v3.0 statement.
   * v3.0 Syntax: @variable Subject VERB Object
   *
   * @param {Object} stmt - Parsed statement {varName, command, subject, object, args}
   * @param {Object} env - Variable environment
   * @param {Array} facts - Available facts
   * @returns {*} - Command result
   */
  _executeCommand(stmt, env, facts) {
    const { varName, command, subject, object, args } = stmt;

    // Expand variable references in subject and object
    const expandedSubject = this.parser.expandString(subject, env);
    const expandedObject = this.parser.expandString(object, env);
    const argTokens = [expandedSubject, expandedObject];

    // Route to appropriate command handler based on VERB
    switch (command) {
      // =========================================================================
      // Query/Fact Commands
      // =========================================================================
      case 'FACTS':
      case 'FACTS_MATCHING':
        return this.coreCommands.cmdFactsMatching(argTokens, env, facts);
      case 'FACTS_WITH_RELATION':
        return this.coreCommands.cmdFactsWithRelation(argTokens, env, facts);
      case 'FACTS_WITH_OBJECT':
        return this.coreCommands.cmdFactsWithObject(argTokens, env, facts);
      case 'INSTANCES_OF':
        return this.coreCommands.cmdInstancesOf(argTokens, env, facts);
      case 'ALL_REQUIREMENTS_SATISFIED':
        return this.coreCommands.cmdAllRequirementsSatisfied(argTokens, env);

      // =========================================================================
      // Boolean Operations
      // NOTE: Pass raw tokens for variable resolution - don't string-expand
      // =========================================================================
      case 'BOOL_AND':
      case 'AND':
        return this.coreCommands.cmdBoolAnd([subject, object], env);
      case 'BOOL_OR':
      case 'OR':
        return this.coreCommands.cmdBoolOr([subject, object], env);
      case 'BOOL_NOT':
      case 'NOT':
        return this.coreCommands.cmdBoolNot([subject, object], env);
      case 'NONEMPTY':
        return this.coreCommands.cmdNonEmpty([subject, object], env);

      // =========================================================================
      // List Operations
      // NOTE: Pass raw tokens for variable resolution - don't string-expand
      // =========================================================================
      case 'MERGE_LISTS':
      case 'MERGE':
        return this.coreCommands.cmdMergeLists([subject, object], env);
      case 'PICK_FIRST':
      case 'FIRST':
        return this.coreCommands.cmdPickFirst([subject, object], env);
      case 'PICK_LAST':
      case 'LAST':
        return this.coreCommands.cmdPickLast([subject, object], env);
      case 'COUNT':
        return this.coreCommands.cmdCount([subject, object], env);
      case 'FILTER':
        return this.coreCommands.cmdFilter([subject, object], env);
      case 'POLARITY_DECIDE':
        return this.coreCommands.cmdPolarityDecide([subject, object], env);

      // =========================================================================
      // Concept/Relation Binding
      // =========================================================================
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
        // Pass raw tokens - cmdInspect will resolve variables itself
        return this.coreCommands.cmdInspect([subject, object], env);
      case 'LITERAL':
        return this.coreCommands.cmdLiteral(argTokens, env);

      // =========================================================================
      // Dimension Operations (v3.0)
      // =========================================================================
      case 'DIM_PAIR':
        // Create dimension-value pair: @bp boiling_point DIM_PAIR 100
        return this.coreCommands.cmdDimPair(expandedSubject, expandedObject, env);
      case 'SET_DIM':
        // Set dimension on concept: @var Water SET_DIM $bp
        // NOTE: Pass raw object for variable resolution (don't string-expand objects)
        return this.coreCommands.cmdSetDim(expandedSubject, object, env);
      case 'HAS_DIM':
        // Query dimension: @q Water HAS_DIM $bp
        // NOTE: Pass raw object for variable resolution (don't string-expand objects)
        return this.coreCommands.cmdHasDim(expandedSubject, object, env);

      // =========================================================================
      // Masking
      // =========================================================================
      case 'MASK_PARTITIONS':
        return this.coreCommands.cmdMaskPartitions(argTokens);
      case 'MASK_DIMS':
        return this.coreCommands.cmdMaskDims(argTokens);
      case 'ASK_MASKED':
        return this.coreCommands.cmdAskMasked(argTokens, env);
      case 'MASK':
        return this.highLevelCommands.cmdMask(argTokens);

      // =========================================================================
      // Memory Management (v3.0 verb names)
      // =========================================================================
      case 'RETRACT':
        return this.memoryCommands.cmdRetract(argTokens, env);
      case 'USAGE':
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
      case 'MEMORY':
        return this.highLevelCommands.cmdMemory(argTokens, env);

      // =========================================================================
      // Theory Management (v3.0 verb names)
      // =========================================================================
      case 'THEORIES':
      case 'LIST_THEORIES':
        return this.theoryCommands.cmdListTheories();
      case 'LOAD':
      case 'LOAD_THEORY':
        // v3.0: @_ theoryName LOAD any
        return this.theoryCommands.cmdLoadTheory([expandedSubject], env);
      case 'SAVE':
      case 'SAVE_THEORY':
        // v3.0: @_ theoryName SAVE any
        return this.theoryCommands.cmdSaveTheory([expandedSubject], env);
      case 'MERGE':
      case 'MERGE_THEORY':
        return this.theoryCommands.cmdMergeTheory(argTokens, env);
      case 'DELETE':
      case 'DELETE_THEORY':
        return this.theoryCommands.cmdDeleteTheory([expandedSubject], env);
      case 'INFO':
      case 'THEORY_INFO':
        return this.theoryCommands.cmdTheoryInfo([expandedSubject], env);
      case 'PUSH':
      case 'THEORY_PUSH':
        // v3.0: @_ layerName PUSH any
        return this.theoryCommands.cmdTheoryPush([expandedSubject], env);
      case 'POP':
      case 'THEORY_POP':
        return this.theoryCommands.cmdTheoryPop();
      case 'COMMIT':
        return this.theoryCommands.cmdCommit();
      case 'RESET':
      case 'RESET_SESSION':
        return this.theoryCommands.cmdResetSession();
      case 'MANAGE_THEORY':
        return this.highLevelCommands.cmdManageTheory(argTokens, env);

      // =========================================================================
      // Reasoning Commands
      // =========================================================================
      case 'VALIDATE':
        return this.reasoningCommands.cmdValidate(argTokens, env, facts);
      case 'PROVE':
        return this.reasoningCommands.cmdProve(argTokens, env, facts);
      case 'HYPOTHESIZE':
        return this.reasoningCommands.cmdHypothesize(argTokens, env, facts);
      case 'ANALOGICAL':
        return this.reasoningCommands.cmdAnalogical(argTokens, env);
      case 'ABDUCT':
        // v3.0: @hyp observation ABDUCT any
        return this.coreCommands.cmdAbduct([expandedSubject], env);
      case 'CF':
      case 'COUNTERFACTUAL':
        return this.coreCommands.cmdCounterfactual(argTokens, env);

      // =========================================================================
      // Contradiction Detection
      // =========================================================================
      case 'CHECK_CONTRADICTION':
        return this.reasoningCommands.cmdCheckContradiction(argTokens, env, facts);
      case 'CHECK_WOULD_CONTRADICT':
      case 'WOULD_CONTRADICT':
        return this.reasoningCommands.cmdCheckWouldContradict(argTokens, env, facts);
      case 'REGISTER_FUNCTIONAL':
        return this.reasoningCommands.cmdRegisterFunctional(argTokens, env);
      case 'REGISTER_CARDINALITY':
        return this.reasoningCommands.cmdRegisterCardinality(argTokens, env);

      // =========================================================================
      // Inference Commands
      // =========================================================================
      case 'INFER':
        return this.inferenceCommands.cmdInfer(argTokens, env, facts);
      case 'FORWARD_CHAIN':
        return this.inferenceCommands.cmdForwardChain(argTokens, env, facts);
      case 'WHY':
        return this.inferenceCommands.cmdWhy(argTokens, env, facts);
      case 'DEFINE_RULE':
        return this.inferenceCommands.cmdDefineRule(argTokens, env);
      case 'DEFINE_DEFAULT':
        return this.inferenceCommands.cmdDefineDefault(argTokens, env);
      case 'CLEAR_RULES':
        return this.inferenceCommands.cmdClearRules();

      // =========================================================================
      // Output/Export Commands
      // =========================================================================
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
      case 'FORMAT_RESULT':
        return this.highLevelCommands.cmdFormat(argTokens, env);
      case 'SUMMARIZE_FACTS':
        return this.highLevelCommands.cmdSummarize(argTokens, env, facts);
      case 'EXPLAIN_QUERY':
        return this.highLevelCommands.cmdExplain(argTokens, env, facts);

      // =========================================================================
      // Ontology Introspection Commands
      // =========================================================================
      case 'EXPLAIN_CONCEPT':
        return this.ontologyCommands.cmdExplainConcept(argTokens, env);
      case 'MISSING':
        return this.ontologyCommands.cmdMissing(argTokens, env);
      case 'WHAT_IS':
        return this.ontologyCommands.cmdWhatIs(argTokens, env);

      // =========================================================================
      // High-level consolidated commands
      // =========================================================================
      case 'QUERY':
        return this.highLevelCommands.cmdQuery(argTokens, env, facts);
      case 'WHATIF':
        return this.highLevelCommands.cmdWhatif(argTokens, env);
      case 'SUGGEST':
        return this.highLevelCommands.cmdSuggest(argTokens, env);

      // =========================================================================
      // Default: Treat as relation verb
      // =========================================================================
      default:
        // In v3.0, ALL statements are relations between points
        // Unrecognized VERBs are treated as semantic relations
        // The relation may have side effects (creating the fact if needed)
        // and returns a result point with truth value
        return this._handleRelation(expandedSubject, command, expandedObject);
    }
  }

  /**
   * Handle semantic relation: @varName Subject VERB Object
   * All statements are relations - they query and potentially create facts
   * Returns a point with truth value
   */
  _handleRelation(subject, relation, object) {
    this.parser.validateNoPropertyValue(subject, 'subject');
    this.parser.validateNoPropertyValue(object, 'object');

    // First, check if the relation exists (query)
    const question = `${subject} ${relation} ${object}`;
    const result = this.api.ask(question);

    // If relation doesn't exist, create it (side effect)
    if (result.truth === 'UNKNOWN' || result.truth === 'FALSE') {
      const sentence = `${subject} ${relation} ${object}`;
      this.api.ingest(sentence);
      // Return success with the newly created relation
      return {
        truth: 'TRUE_CERTAIN',
        created: true,
        subject,
        relation,
        object
      };
    }

    // Return the query result
    return result;
  }
}

module.exports = TheoryDSLEngine;

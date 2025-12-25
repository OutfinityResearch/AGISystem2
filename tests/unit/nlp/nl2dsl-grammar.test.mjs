import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetRefCounter } from '../../../src/nlp/nl2dsl/utils.mjs';
import { translateContextWithGrammar, translateQuestionWithGrammar } from '../../../src/nlp/nl2dsl/grammar.mjs';

describe('NL→DSL grammar translator (low-hardcoding)', () => {
  beforeEach(() => resetRefCounter());

  test('normalizes inverted copula questions ("Is X a Y?") into @goal:goal', () => {
    const goal = translateQuestionWithGrammar('Is Anne an animal?');
    assert.equal(goal, '@goal:goal isA Anne Animal');
  });

  test('normalizes inverted auxiliary questions ("Does X verb Y?") into @goal:goal', () => {
    const goal = translateQuestionWithGrammar('Does Anne like Bob?');
    assert.equal(goal, '@goal:goal likes Anne Bob');
  });

  test('emits persistent negation facts as anonymous Not $ref', () => {
    const { dsl, errors } = translateContextWithGrammar('Anne does not like Bob.');
    assert.deepEqual(errors, []);
    const lines = dsl.split('\n').map(l => l.trim()).filter(Boolean);
    assert.equal(lines.length, 2);
    assert.ok(lines[0].startsWith('@base'), 'first line should bind base reference');
    assert.ok(/^Not\s+\$base\d+$/.test(lines[1]), 'second line should be anonymous Not $baseN');
    assert.ok(!lines[1].startsWith('@'), 'negation fact must be persistent (no @dest)');
  });

  test('rejects unknown verbs/operators (must exist in Core operator catalog)', () => {
    const { dsl, errors } = translateContextWithGrammar('Anne frobnicates Bob.');
    assert.equal(dsl.trim(), '');
    assert.equal(errors.length, 1);
    assert.match(errors[0].error, /Unknown operator 'frobnicat/i);
  });

  test('strips dataset annotations like [BG], [FOL] from input', () => {
    const { dsl, errors } = translateContextWithGrammar('[BG] All cats are animals.');
    assert.deepEqual(errors, []);
    assert.ok(dsl.includes('isA'), 'should parse after stripping [BG]');
    assert.ok(!dsl.includes('[BG]'), 'should not contain annotation');
  });

  test('handles multi-word proper names (Robert Lewandowski → RobertLewandowski)', () => {
    const goal = translateQuestionWithGrammar('Robert Lewandowski is a striker.');
    assert.ok(goal, 'should produce a goal');
    assert.ok(goal.includes('RobertLewandowski'), 'should collapse proper name');
    assert.ok(goal.includes('Striker'), 'should have type');
  });

  test('parses multi-word proper names in copula facts', () => {
    const { dsl, errors } = translateContextWithGrammar('Robert Lewandowski is a striker.');
    assert.deepEqual(errors, []);
    assert.ok(dsl.includes('RobertLewandowski'), 'should collapse proper name');
    assert.ok(dsl.includes('isA'), 'should use isA');
  });

  test('expands copula disjunction questions into multiple goals when enabled', () => {
    const goal = translateQuestionWithGrammar(
      'Stella is a gorpus, a zumpus, or an impus.',
      { expandCompoundQuestions: true }
    );
    assert.ok(goal);
    assert.match(goal, /\/\/ goal_logic:Or/);
    assert.match(goal, /@goal:goal isA Stella Gorpus/);
    assert.match(goal, /@goal1:goal isA Stella Zumpus/);
    assert.match(goal, /@goal2:goal isA Stella Impus/);
  });

  test('expands copula conjunction into multiple goals without duplicating the subject ("Sally is ... and Sally is ...")', () => {
    const goal = translateQuestionWithGrammar(
      'Sally is a lempus and Sally is not a dumpus and Sally is a brimpus.',
      { expandCompoundQuestions: true }
    );
    assert.ok(goal);
    assert.match(goal, /\/\/ goal_logic:And/);
    assert.match(goal, /@goal:goal isA Sally Lempus/);
    assert.match(goal, /@goal1:goal Not \(isA Sally Dumpus\)/);
    assert.match(goal, /@goal2:goal isA Sally Brimpus/);
    assert.ok(!goal.includes('SallyIsNotADumpus'), `should not synthesize a fake type, got: ${goal}`);
  });

  test('parses intransitive questions as hasProperty (Space sucks → hasProperty Space suck)', () => {
    const goal = translateQuestionWithGrammar('Space sucks.');
    assert.equal(goal, '@goal:goal hasProperty Space suck');
  });

  test('parses locative copula (Mary is in the kitchen → in Mary Kitchen)', () => {
    const { dsl, errors } = translateContextWithGrammar('Mary is in the kitchen.');
    assert.deepEqual(errors, []);
    assert.ok(/\bin Mary Kitchen\b/.test(dsl), `expected locative relation, got: ${dsl}`);
  });

  test('parses relational-noun copula (Harry is the parent of Jack → parent Harry Jack)', () => {
    const { dsl, errors } = translateContextWithGrammar('Harry is the parent of Jack.');
    assert.deepEqual(errors, []);
    assert.ok(/\bparent Harry Jack\b/.test(dsl), `expected relation, got: ${dsl}`);
  });

  test('parses copula coordination even when items repeat the subject ("Wren is X, Wren is Y")', () => {
    const { dsl, errors } = translateContextWithGrammar('Wren is a numpus, Wren is a brimpus, and Wren is not a sterpus.');
    assert.deepEqual(errors, []);
    assert.ok(/\bisA Wren Numpus\b/.test(dsl), `expected isA Wren Numpus, got: ${dsl}`);
    assert.ok(/\bisA Wren Brimpus\b/.test(dsl), `expected isA Wren Brimpus, got: ${dsl}`);
    assert.ok(!dsl.includes('WrenIsABrimpus'), `should not synthesize fake type tokens, got: ${dsl}`);
    assert.ok(/\bNot\s+\$base\d+\b/.test(dsl), `expected persistent negation Not $baseN, got: ${dsl}`);
  });

  test('parses movement to location (Mary went to the kitchen → at Mary Kitchen)', () => {
    const { dsl, errors } = translateContextWithGrammar('Mary went to the kitchen.');
    assert.deepEqual(errors, []);
    assert.ok(/\bat Mary Kitchen\b/.test(dsl), `expected at relation, got: ${dsl}`);
  });

  test('parses pickup/drop as has/Not has', () => {
    const up = translateContextWithGrammar('Mary picked up the apple.');
    assert.deepEqual(up.errors, []);
    assert.ok(/\bhas Mary Apple\b/.test(up.dsl), `expected has relation, got: ${up.dsl}`);

    const down = translateContextWithGrammar('Mary dropped the apple.');
    assert.deepEqual(down.errors, []);
    assert.ok(/\bNot \$base\d+\b/.test(down.dsl), 'expected persistent negation Not $baseN');
  });

  test('sanitizes type tokens with hyphens (mind-reading → Mindreading)', () => {
    const { dsl, errors } = translateContextWithGrammar('All mind-reading things are shapes.');
    assert.deepEqual(errors, []);
    assert.ok(!dsl.includes('Mind-reading'), 'hyphenated type must be sanitized');
    assert.ok(dsl.includes('mindreading') || dsl.includes('Mindreading'), 'sanitized token must remain');
  });

  test('sanitizes reserved keyword verbs to avoid lexer keywords (begin → begin_op)', () => {
    const { dsl, errors } = translateContextWithGrammar('All plates begin with the number 34.', { autoDeclareUnknownOperators: true });
    assert.deepEqual(errors, []);
    assert.ok(dsl.includes('begin_op') || dsl.includes('@begin_op:begin_op'), 'reserved keyword verb must be rewritten');
    assert.ok(!dsl.includes('\nbegin '), 'should not emit keyword operator "begin"');
  });

  test('nests And groups beyond MAX_POSITIONS (no And statement binds >20 refs)', () => {
    const sentence =
      'All alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega students are humans.';
    const { dsl, errors } = translateContextWithGrammar(sentence);
    assert.deepEqual(errors, []);
    const lines = dsl.split('\n').filter(Boolean);
    const andLines = lines.filter(l => /\bAnd\b/.test(l));
    assert.ok(andLines.length >= 2, 'should nest And into multiple statements');
    for (const l of andLines) {
      const refs = (l.match(/\$/g) || []).length;
      assert.ok(refs <= 20, `And line must not exceed 20 refs: ${l}`);
    }
  });

  test('parses existential goals ("There is an animal" → query isA ?x Animal)', () => {
    const goal = translateQuestionWithGrammar('There is an animal.');
    assert.equal(goal, '@goal:goal isA ?x Animal');
  });

  test('parses inverted existential questions ("Is there an animal?" → Exists x ...)', () => {
    const goal = translateQuestionWithGrammar('Is there an animal?');
    assert.equal(goal, '@goal:goal isA ?x Animal');
  });

  test('adds existence hints from quantifiers ("certain animals, including humans")', () => {
    const { dsl, errors } = translateContextWithGrammar(
      'Monkeypox virus can occur in certain animals, including humans.',
      { autoDeclareUnknownOperators: true }
    );
    assert.deepEqual(errors, []);
    assert.match(dsl, /\bisA\s+\w+\s+Animal\b/, `expected Animal existence, got: ${dsl}`);
    assert.match(dsl, /\bisA\s+\w+\s+Human\b/, `expected Human existence, got: ${dsl}`);
  });

  test('parses WH-questions as queries (What is Sarah? → isA Sarah ?x)', () => {
    const goal = translateQuestionWithGrammar('What is Sarah?');
    assert.equal(goal, '@goal:goal isA Sarah ?x');
  });

  test('parses WH-property questions as hasProperty queries (What color is the cat? → hasProperty Cat ?x)', () => {
    const goal = translateQuestionWithGrammar('What color is the cat?');
    assert.equal(goal, '@goal:goal hasProperty Cat ?x');
  });

  test('normalizes "have <noun phrase>" consistently as hasProperty (no fake isA type)', () => {
    const sent = 'All students who have part-time jobs offered by the university are students who work in the library.';
    const { dsl, errors } = translateContextWithGrammar(sent);
    assert.deepEqual(errors, []);
    assert.match(dsl, /hasProperty\s+\?x\s+part_?time_job_offered_by_university/i, `expected hasProperty job, got: ${dsl}`);
    assert.match(dsl, /hasProperty\s+\?x\s+work_in_library/i, `expected hasProperty work_in_library, got: ${dsl}`);
    assert.ok(!/HaveParttimeJobsOfferedByTheUniversity/.test(dsl), `should not synthesize a type for "have ...", got: ${dsl}`);
    assert.match(dsl, /Implies/, `expected Implies rule, got: ${dsl}`);
  });

  test('parses adjective+preposition relations (Mice are afraid of wolves → Mouse -> afraid ?x Wolf)', () => {
    const { dsl, errors } = translateContextWithGrammar('Mice are afraid of wolves.', { autoDeclareUnknownOperators: true });
    assert.deepEqual(errors, []);
    assert.match(dsl, /@afraid:afraid __Relation/);
    assert.match(dsl, /isA\s+\?x\s+Mouse/);
    assert.match(dsl, /afraid\s+\?x\s+Wolf/);
    assert.match(dsl, /Implies/);
  });

  test('parses "What is X afraid of?" as a relation query', () => {
    const goal = translateQuestionWithGrammar('What is Emily afraid of?');
    assert.match(goal, /\/\/ action:query/);
    assert.match(goal, /@goal:goal afraid Emily \?x/);
  });

  test('treats multi-word copula predicates as types (bile duct cancer)', () => {
    const { dsl, errors } = translateContextWithGrammar('All cholangiocarcinoma is bile duct cancer.');
    assert.deepEqual(errors, []);
    assert.match(dsl, /isA\s+\?x\s+Cholangiocarcinoma/);
    assert.match(dsl, /isA\s+\?x\s+BileDuctCancer/);
    assert.match(dsl, /Implies/);
  });

  test('parses universal negative rules (No plants are fungi → Plant -> Not(Fungus))', () => {
    const { dsl, errors } = translateContextWithGrammar('No plants are fungi.');
    assert.deepEqual(errors, []);
    assert.match(dsl, /isA\s+\?x\s+Plant/);
    assert.match(dsl, /Not/);
    assert.match(dsl, /Implies/);
  });

  test('parses existential facts (Some pets are rabbits → exists_ent isA Pet + Rabbit)', () => {
    const { dsl, errors } = translateContextWithGrammar('Some pets are rabbits.');
    assert.deepEqual(errors, []);
    assert.match(dsl, /isA\s+exists_ent_[a-f0-9]{10}\s+Pet/);
    assert.match(dsl, /isA\s+exists_ent_[a-f0-9]{10}\s+Rabbit/);
  });

  test('parses quantified existential questions as Exists goals with action:prove', () => {
    const goal = translateQuestionWithGrammar('Some pets do not have fur.');
    assert.match(goal, /\/\/ action:prove/);
    assert.match(goal, /@goal:goal Exists \?x/);
    assert.match(goal, /Not/);
  });

  test('parses quantified universal negatives as Not(Exists...) with action:prove', () => {
    const goal = translateQuestionWithGrammar('No plants are mushrooms.');
    assert.match(goal, /\/\/ action:prove/);
    assert.match(goal, /@goal:goal Not \(Exists \?x/);
  });

  test('expands "neither ... nor ..." into two Not goals', () => {
    const goal = translateQuestionWithGrammar(
      'Dried Thai chilies are neither a product of Baked by Melissa nor a bakery.',
      { expandCompoundQuestions: true }
    );
    assert.match(goal, /\/\/ goal_logic:And/);
    assert.match(goal, /Not \(isA DriedThaiChilies/);
    assert.ok(goal.split('\n').filter(l => l.startsWith('@goal')).length >= 2);
  });

  test('parses have/no as Not(hasProperty) facts (Platypus have no teeth)', () => {
    const { dsl, errors } = translateContextWithGrammar('Platypus have no teeth.');
    assert.deepEqual(errors, []);
    assert.match(dsl, /@base\d+\s+hasProperty Platypus teeth/);
    assert.match(dsl, /Not\s+\$base\d+/);
  });

  test('parses "with no" copula questions into compound goals (X are mammals with no teeth)', () => {
    const goal = translateQuestionWithGrammar('Platypus are mammals with no teeth.', { expandCompoundQuestions: true });
    assert.match(goal, /\/\/ goal_logic:And/);
    assert.match(goal, /@goal:goal isA Platypus Mammal/);
    assert.match(goal, /@goal1:goal Not \(hasProperty Platypus teeth\)/);
  });
});

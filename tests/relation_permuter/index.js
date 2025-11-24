const RelationPermuter = require('../../src/core/relation_permuter');
const Config = require('../../src/support/config');

async function run() {
  const config = new Config().load({ profile: 'auto_test' });
  const dims = config.get('dimensions');
  const permuter = new RelationPermuter(dims, config.get('relationSeed'));
  permuter.bootstrapDefaults();

  const causes = permuter.getPermutation('CAUSES');
  const causedBy = permuter.getPermutation('CAUSED_BY');
  const eq = permuter.getPermutation('EQUIVALENT_TO');
  const eqInv = permuter.getInversePermutation('EQUIVALENT_TO');

  const sameEq = eq.length === eqInv.length;
  let allOk = sameEq;
  const causesDiff = causes.some((v, i) => v !== causedBy[i]);
  allOk = allOk && causesDiff;

  const perm1 = permuter.getPermutation('CAUSES');
  const perm2 = permuter.getPermutation('CAUSES');
  let same = perm1.length === perm2.length;
  for (let i = 0; i < perm1.length && same; i += 1) {
    if (perm1[i] !== perm2[i]) {
      same = false;
    }
  }
  allOk = allOk && same;

  return { ok: allOk };
}

module.exports = { run };


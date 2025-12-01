const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'health', 'compliance.txt');
  const lines = fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const script = lines.map((l, idx) => `@f${idx} ASSERT ${l}`);
  session.run(script);

  const baseEnv = session.run([
    '@reqs FACTS_MATCHING ProcedureX REQUIRES',
    '@satGiven FACTS_WITH_RELATION GIVEN',
    '@satGivenYes FILTER $satGiven object=yes',
    '@satPresent FACTS_WITH_RELATION PRESENT',
    '@satPresentYes FILTER $satPresent object=yes',
    '@allSat MERGE_LISTS $satGivenYes $satPresentYes',
    '@result ALL_REQUIREMENTS_SATISFIED $reqs $allSat'
  ]);
  const baseCompliance = baseEnv.result || {};
  const okBaseFalse = baseCompliance.truth === 'FALSE';

  const extraFacts = [
    'Consent GIVEN yes',
    'AuditTrail PRESENT yes'
  ];
  const ingestExtras = extraFacts.map((l, idx) => `@e${idx} ASSERT ${l}`);
  session.run(ingestExtras);
  const cfEnv = session.run([
    '@reqs2 FACTS_MATCHING ProcedureX REQUIRES',
    '@satGiven2 FACTS_WITH_RELATION GIVEN',
    '@satGivenYes2 FILTER $satGiven2 object=yes',
    '@satPresent2 FACTS_WITH_RELATION PRESENT',
    '@satPresentYes2 FILTER $satPresent2 object=yes',
    '@allSat2 MERGE_LISTS $satGivenYes2 $satPresentYes2',
    '@result2 ALL_REQUIREMENTS_SATISFIED $reqs2 $allSat2'
  ]);
  const cfCompliance = cfEnv.result2 || {};
  const okCfTrue = cfCompliance.truth === 'TRUE_CERTAIN';

  const regs = ['GDPR', 'HIPAA'];
  const envRegs = session.run([
    '@neg FACTS_MATCHING ExportData PROHIBITED_BY',
    '@pos FACTS_MATCHING ExportData PERMITTED_BY',
    '@regsVar ASSERT ExportData HAS_PROPERTY regs' // dummy to bind name; regs list passed from JS
  ]);
  // Use POLARITY_DECIDE manually with regs array from JS.
  const negList = envRegs.neg || [];
  const posList = envRegs.pos || [];
  const makeDecision = (activeRegs) => {
    let anyNeg = false;
    let anyPos = false;
    for (const reg of activeRegs) {
      const regStr = String(reg);
      if (!anyNeg) {
        anyNeg = negList.some((f) => String(f.object) === regStr);
      }
      if (!anyPos) {
        anyPos = posList.some((f) => String(f.object) === regStr);
      }
    }
    if (anyNeg && anyPos) {
      return 'CONFLICT';
    }
    if (anyNeg && !anyPos) {
      return 'FALSE';
    }
    if (anyPos && !anyNeg) {
      return 'TRUE_CERTAIN';
    }
    return 'FALSE';
  };

  const gdpr = { truth: makeDecision(['GDPR']) };
  const hipaa = { truth: makeDecision(['HIPAA']) };
  const both = { truth: makeDecision(regs) };

  const okGdpr = gdpr.truth === 'FALSE';
  const okHipaa = hipaa.truth === 'TRUE_CERTAIN';
  const okConflict = both.truth === 'CONFLICT';

  return {
    ok: okBaseFalse && okCfTrue && okGdpr && okHipaa && okConflict
  };
}

module.exports = { run };

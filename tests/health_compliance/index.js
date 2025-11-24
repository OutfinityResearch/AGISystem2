const fs = require('fs');
const path = require('path');
const EngineAPI = require('../../src/interface/api');

async function run({ profile }) {
  const api = new EngineAPI({ profile });

  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'health', 'compliance.txt');
  const lines = fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    api.ingest(line);
  }

  const baseCompliance = api.checkProcedureCompliance('ProcedureX');
  const okBaseFalse = baseCompliance.truth === 'FALSE';

  const extraFacts = [
    'Consent GIVEN yes',
    'AuditTrail PRESENT yes'
  ];
  const cfCompliance = api.checkProcedureCompliance('ProcedureX', extraFacts);
  const okCfTrue = cfCompliance.truth === 'TRUE_CERTAIN';

  const gdpr = api.checkExport('ExportData', ['GDPR']);
  const hipaa = api.checkExport('ExportData', ['HIPAA']);
  const both = api.checkExport('ExportData', ['GDPR', 'HIPAA']);

  const okGdpr = gdpr.truth === 'FALSE';
  const okHipaa = hipaa.truth === 'TRUE_CERTAIN';
  const okConflict = both.truth === 'CONFLICT';

  return {
    ok: okBaseFalse && okCfTrue && okGdpr && okHipaa && okConflict
  };
}

module.exports = { run };


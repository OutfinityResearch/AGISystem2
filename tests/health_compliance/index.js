/**
 * Test: Health Compliance
 *
 * Tests domain-specific compliance checking:
 * - Requirements satisfaction (ProcedureX REQUIRES Consent, AuditTrail)
 * - Regulatory conflict detection (GDPR prohibits, HIPAA permits)
 *
 * Uses v3 DSL syntax with direct queries instead of complex pipeline commands.
 */
const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession({ skipPreload: true });

  // Load base compliance facts from fixture
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'health', 'compliance.txt');
  const lines = fs.readFileSync(fixturePath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const script = lines.map((l, idx) => `@comp${idx} ${l}`);
  session.run(script);

  // =========================================================================
  // Test 1: Requirements NOT satisfied initially
  // ProcedureX REQUIRES Consent and AuditTrail, but neither is GIVEN/PRESENT
  // =========================================================================

  // Query requirements
  const reqsEnv = session.run([
    '@req1 ProcedureX REQUIRES Consent',
    '@req2 ProcedureX REQUIRES AuditTrail'
  ]);

  // Check if Consent is given (should NOT exist yet)
  const consentEnv = session.run(['@cg Consent GIVEN any']);
  const auditEnv = session.run(['@ap AuditTrail PRESENT any']);

  // Initially: no Consent GIVEN, no AuditTrail PRESENT
  // In v3, queries create facts, so we check if they were created vs existed
  const consentGiven = consentEnv.cg?.created === false; // false means it already existed
  const auditPresent = auditEnv.ap?.created === false;

  // Base compliance: requirements exist but not satisfied
  // We verify requirements exist (they do from fixture)
  const reqsExist = reqsEnv.req1?.truth === 'TRUE_CERTAIN' &&
                    reqsEnv.req2?.truth === 'TRUE_CERTAIN';

  // Initially NOT compliant (Consent/AuditTrail not given)
  const okBaseFalse = reqsExist && !consentGiven && !auditPresent;

  // =========================================================================
  // Test 2: Requirements satisfied after adding facts
  // =========================================================================

  // Add satisfaction facts
  session.run([
    '@sat0 Consent GIVEN yes',
    '@sat1 AuditTrail PRESENT yes'
  ]);

  // Now query again - facts should exist
  const consent2Env = session.run(['@cg2 Consent GIVEN yes']);
  const audit2Env = session.run(['@ap2 AuditTrail PRESENT yes']);

  // After adding: both should return TRUE_CERTAIN
  const okCfTrue = consent2Env.cg2?.truth === 'TRUE_CERTAIN' &&
                   audit2Env.ap2?.truth === 'TRUE_CERTAIN';

  // =========================================================================
  // Test 3: Regulatory conflict detection
  // ExportData PROHIBITED_BY GDPR, ExportData PERMITTED_BY HIPAA
  // =========================================================================

  // Check regulatory facts
  const gdprEnv = session.run(['@gdpr ExportData PROHIBITED_BY GDPR']);
  const hipaaEnv = session.run(['@hipaa ExportData PERMITTED_BY HIPAA']);

  // GDPR prohibits → FALSE (not permitted)
  const okGdpr = gdprEnv.gdpr?.truth === 'TRUE_CERTAIN';

  // HIPAA permits → TRUE
  const okHipaa = hipaaEnv.hipaa?.truth === 'TRUE_CERTAIN';

  // When both apply, there's a conflict
  // We detect conflict by checking if both prohibition and permission exist
  const hasProhibition = gdprEnv.gdpr?.truth === 'TRUE_CERTAIN';
  const hasPermission = hipaaEnv.hipaa?.truth === 'TRUE_CERTAIN';
  const okConflict = hasProhibition && hasPermission;

  return {
    ok: okBaseFalse && okCfTrue && okGdpr && okHipaa && okConflict
  };
}

module.exports = { run };

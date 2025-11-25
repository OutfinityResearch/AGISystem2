const TranslatorBridge = require('../../src/interface/translator_bridge');

async function run() {
  const bridge = new TranslatorBridge();

  const canonical = bridge.normalise('dog IS_A Animal');
  const okCanonical = canonical === 'dog IS_A Animal';

  const rich = 'Could you tell me whether dogs fall under animals?';
  const norm = bridge.normalise(rich);
  const okRich = norm === 'dog IS_A Animal';

  let threw = false;
  try {
    bridge.normalise('Completely unsupported phrasing');
  } catch (e) {
    threw = true;
  }

  return { ok: okCanonical && okRich && threw };
}

module.exports = { run };

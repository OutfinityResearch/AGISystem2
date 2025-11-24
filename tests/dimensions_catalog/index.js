const fs = require('fs');
const path = require('path');

async function run() {
  const filePath = path.join(process.cwd(), 'data', 'init', 'dimensions.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const spec = JSON.parse(raw);
  const axes = spec.axes || [];

  let ok = true;
  const seen = new Set();
  for (const axis of axes) {
    if (seen.has(axis.index)) {
      ok = false;
      break;
    }
    seen.add(axis.index);
    if (axis.partition === 'ontology' && (axis.index < 0 || axis.index > 255)) {
      ok = false;
      break;
    }
    if (axis.partition === 'axiology' && (axis.index < 256 || axis.index > 383)) {
      ok = false;
      break;
    }
    if (axis.partition === 'empirical' && axis.index < 384) {
      ok = false;
      break;
    }
  }

  return { ok };
}

module.exports = { run };


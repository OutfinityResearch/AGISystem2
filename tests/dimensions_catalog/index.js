const fs = require('fs');
const path = require('path');
const DimensionRegistry = require('../../src/core/dimension_registry');

async function run() {
  const filePath = path.join(process.cwd(), 'data', 'init', 'dimensions.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const spec = JSON.parse(raw);
  const axes = spec.axes || [];

  let ok = true;
  const errors = [];
  const seen = new Set();

  // Validate axes
  for (const axis of axes) {
    if (seen.has(axis.index)) {
      errors.push(`Duplicate axis index: ${axis.index}`);
      ok = false;
      break;
    }
    seen.add(axis.index);
    if (axis.partition === 'ontology' && (axis.index < 0 || axis.index > 255)) {
      errors.push(`Ontology axis ${axis.name} has invalid index ${axis.index}`);
      ok = false;
      break;
    }
    if (axis.partition === 'axiology' && (axis.index < 256 || axis.index > 383)) {
      errors.push(`Axiology axis ${axis.name} has invalid index ${axis.index}`);
      ok = false;
      break;
    }
    if (axis.partition === 'empirical' && axis.index < 384) {
      errors.push(`Empirical axis ${axis.name} has invalid index ${axis.index}`);
      ok = false;
      break;
    }
  }

  // Build axis name set for validation
  const axisNames = new Set(axes.map(a => a.name));

  // Validate propertyMappings - each property must map to an existing axis
  if (spec.propertyMappings) {
    for (const [prop, axisName] of Object.entries(spec.propertyMappings)) {
      if (!axisNames.has(axisName)) {
        errors.push(`Property '${prop}' maps to non-existent axis '${axisName}'`);
        ok = false;
      }
    }
  }

  // Validate relationMappings - each relation must map to existing axes
  if (spec.relationMappings) {
    for (const [rel, relAxes] of Object.entries(spec.relationMappings)) {
      if (!Array.isArray(relAxes)) {
        errors.push(`Relation '${rel}' mapping must be an array`);
        ok = false;
        continue;
      }
      for (const axisName of relAxes) {
        if (!axisNames.has(axisName)) {
          errors.push(`Relation '${rel}' maps to non-existent axis '${axisName}'`);
          ok = false;
        }
      }
    }
  }

  // Test DimensionRegistry functionality
  DimensionRegistry.resetShared();
  const registry = new DimensionRegistry({ spec });

  // Test property lookup
  if (spec.propertyMappings && spec.propertyMappings.temperature) {
    const tempAxis = registry.getPropertyAxis('temperature');
    if (tempAxis === undefined) {
      errors.push('DimensionRegistry.getPropertyAxis failed for temperature');
      ok = false;
    }
  }

  // Test relation lookup
  if (spec.relationMappings && spec.relationMappings.IS_A) {
    const isaAxes = registry.getRelationAxes('IS_A');
    if (!Array.isArray(isaAxes) || isaAxes.length === 0) {
      errors.push('DimensionRegistry.getRelationAxes failed for IS_A');
      ok = false;
    }
  }

  if (errors.length > 0) {
    console.error('Dimension catalog errors:', errors);
  }

  return { ok, errors };
}

module.exports = { run };


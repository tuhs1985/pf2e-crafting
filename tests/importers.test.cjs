const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { materialMetadata } = require('../build-items-db.cjs');
const { extractTables, buildDatabase } = require('../build-materials-db.cjs');
const items = require('../src/data/items.db.json');
const materials = require('../src/data/materials.db.json');
const snapshot = require('../data/materials.source.json');

test('new item metadata leaves all original item fields unchanged', () => {
  const previous = JSON.parse(execFileSync('git', ['show', 'HEAD:src/data/items.db.json'], { maxBuffer: 5e6 }));
  for (const key of ['r', 'c', 'b', 'p', 'n', 'i']) assert.deepEqual(items[key], previous[key]);
  assert.equal(items.m.length, items.n.length);
});

test('metadata distinguishes armor, weapons, and shields and preserves bundle prices', () => {
  const meta = name => items.m[items.n.indexOf(name)];
  assert.equal(meta('Longsword')[0], 'weapon');
  assert.equal(meta('Full Plate')[0], 'armor');
  assert.equal(meta('Full Plate')[1], 5);
  assert.equal(meta('Steel Shield')[0], 'shield');
  assert.equal(meta('Arrows')[4], 10);
  assert.deepEqual(materialMetadata({ type: 'weapon', system: { bulk: { value: 1 },
    material: { type: 'silver', grade: 'low' } } }).slice(0, 4), ['weapon', 1, 'silver', 'low']);
});

test('material file rebuilds offline with all five pricing groups', () => {
  assert.deepEqual(buildDatabase(snapshot), materials);
  assert.deepEqual([...new Set(materials.items.map(row => row.kind))].sort(), ['armor', 'buckler', 'shield', 'tower', 'weapon']);
  const silver = materials.items.find(row => row.kind === 'weapon' && row.material === 'silver' && row.grade === 'low');
  assert.equal(silver.basePriceGp + silver.pricePerBulkGp, 44);
  assert.equal(silver.minimumMaterialBaseGp + silver.minimumMaterialPerBulkGp, 2.2);
  assert.ok(!materials.items.some(row => row.material === 'adamantine' && row.grade === 'low'));
});

test('importer rejects executable source and broken tables', () => {
  assert.throws(() => extractTables('const WEAPON_MATERIAL_VALUATION_DATA = runCode();'));
  assert.throws(() => buildDatabase({ tables: {} }));
  assert.throws(() => materialMetadata({ name: 'Bad', system: { price: { per: 0 } } }));
});

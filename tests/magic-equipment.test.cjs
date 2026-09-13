const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const filename = path.join(__dirname, '../src/utils', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, require: createRequire(filename) };
  vm.runInNewContext(code, context);
  return context.exports;
}
const { magicEquipmentKind, magicEquipmentOptions, applyMagicEquipment } = load('magicEquipment.ts');

test('magic presets exclude shields, enchanted items, and existing precious materials', () => {
  assert.equal(magicEquipmentKind('weapon'), 'weapon');
  assert.equal(magicEquipmentKind('armor'), 'armor');
  for (const type of ['shield', 'equipment', 'consumable', 'ammo']) assert.equal(magicEquipmentKind(type), null);
  assert.equal(magicEquipmentKind('weapon', false), null);
  assert.equal(magicEquipmentKind('armor', true, 'silver'), null);
});

test('all twelve preset levels and prices match the reference tables', () => {
  assert.equal(JSON.stringify(magicEquipmentOptions.weapon.map(x => [x.level,x.price])), JSON.stringify([[2,35],[4,100],[10,1000],[12,2000],[16,10000],[19,40000]]));
  assert.equal(JSON.stringify(magicEquipmentOptions.armor.map(x => [x.level,x.price])), JSON.stringify([[5,160],[8,500],[11,1400],[14,4500],[18,24000],[20,70000]]));
});

test('magic pricing includes the base item and preserves rarity and higher base level', () => {
  const base = { name: 'Full Plate', level: 2, rarity: 'Common', price: 30 };
  const result = applyMagicEquipment(magicEquipmentOptions.armor[0], base);
  assert.equal(result.price, 160);
  assert.equal(result.level, 5);
  assert.equal(result.name, 'Full Plate (+1)');
  assert.equal(base.price, 30);
  const rare = applyMagicEquipment(magicEquipmentOptions.weapon[0], {name:'Custom', level:6, rarity:'Rare'});
  assert.equal(rare.level, 6);
  assert.equal(rare.rarity, 'Rare');
});

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
const { materialKind, findMaterial, materialAmounts, parseCarriedBulk, applyMaterial } = load('materials.ts');
const { formatSummary, calculateCraftingDC } = load('crafting.ts');
const silver = findMaterial('weapon', 'silver', 'low');

test('weapons, armor, and shields enable materials', () => {
  assert.equal(materialKind('weapon'), 'weapon');
  assert.equal(materialKind('armor'), 'armor');
  assert.equal(materialKind('shield'), 'shield');
  for (const kind of ['ammo', 'consumable', 'equipment', '']) assert.equal(materialKind(kind), null);
});

test('Treasure Vault shields use the pinned Foundry pricing groups', () => {
  for (const base of ['buckler', 'casters-targe', 'dart-shield', 'gauntlet-buckler', 'heavy-rondache', 'klar']) {
    assert.equal(materialKind('shield', base), 'buckler');
  }
  for (const base of ['fortress-shield', 'tower-shield']) assert.equal(materialKind('shield', base), 'tower');
  for (const base of ['harnessed-shield', 'hide-shield', 'meteor-shield', 'razor-disc', 'salvo-shield', 'swordstealer-shield']) {
    assert.equal(materialKind('shield', base), 'shield');
  }
});

test('shield prices and material requirements do not scale with Bulk', () => {
  const buckler = findMaterial('buckler', 'silver', 'low');
  const shield = findMaterial('shield', 'silver', 'low');
  assert.equal(materialAmounts(buckler, 0.1).price, 30);
  assert.equal(materialAmounts(shield, 1).price, 34);
  assert.equal(materialAmounts(shield, 100).price, 34);
  assert.equal(materialAmounts(shield, NaN).minimum, 1.7);
  const tower = findMaterial('tower', 'duskwood', 'standard');
  assert.ok(tower);
  assert.equal(materialAmounts(tower, 5).price, tower.basePriceGp);
  assert.equal(materialAmounts(tower, 5).minimum, tower.basePriceGp / 8);
  assert.equal(findMaterial('tower', 'silver', 'low'), undefined);
});

test('silver longsword has full price 44, material minimum 2.2, and level 2 DC', () => {
  const result = applyMaterial(silver, { carriedBulk: 1, level: 0, rarity: 'common', price: 1 });
  assert.equal(result.price, 44);
  assert.equal(result.minimum, 2.2);
  assert.equal(result.level, 2);
  assert.equal(calculateCraftingDC(result.level, result.rarity, 0), 16);
});

test('armor uses carried Bulk and the armor price table', () => {
  assert.equal(parseCarriedBulk('4', 'armor'), 5);
  const result = materialAmounts(findMaterial('armor', 'silver', 'low'), 5);
  assert.equal(result.price, 210);
  assert.equal(result.minimum, 10.5);
  assert.equal(materialAmounts(silver, 0.1).price, 44);
  assert.equal(materialAmounts(silver, 1.1).price, 44);
});

test('Bulk notation and malformed input are handled without guessed prices', () => {
  assert.equal(parseCarriedBulk('L', 'weapon'), 0.1);
  assert.equal(parseCarriedBulk('-', 'weapon'), 0);
  for (const value of ['', 'many', '-1', 'Infinity']) assert.equal(parseCarriedBulk(value, 'weapon'), null);
});

test('materials do not lower existing level or rarity', () => {
  const result = applyMaterial(silver, { carriedBulk: 1, level: 15, rarity: 'rare', price: 100 });
  assert.equal(result.level, 15);
  assert.equal(result.rarity, 'rare');
  assert.equal(findMaterial('weapon', 'adamantine', 'low'), undefined);
});

test('existing materials are not charged twice and grade changes use the original value', () => {
  const input = { carriedBulk: 1, level: 2, rarity: 'common', price: 100,
    existingMaterial: 'silver', existingGrade: 'low' };
  assert.equal(applyMaterial(silver, input).price, 100);
  assert.equal(applyMaterial(findMaterial('weapon', 'silver', 'standard'), input).price, 1024);
  assert.equal(applyMaterial(silver, input).price, 100);
});

const base = { character: 'Test', itemName: 'Longsword', itemLevel: 2,
  itemRarity: 'common', itemCategory: 'sword', itemBulk: '1', itemCost: 44,
  quantity: 1, hasFormula: true, formulaOption: '', startDate: '2026-09-12',
  characterLevel: 9, proficiency: 'expert', useAssurance: false,
  craftingDC: 16, dcAdjustment: 0, craftingRoll: 20, setupDays: 1, additionalDays: 0,
  preciousMaterial: { name: 'Silver', grade: 'Low-grade', minimumGpPerItem: 2.2 } };

test('summary shows precious material included, not added to cost', () => {
  const result = formatSummary(base, 'Success', '2026-09-12');
  assert.match(result, /Longsword \(Silver, Low-grade\)/);
  assert.match(result, /\*\*Cost:\*\* 44 gp \(includes at least 2\.2 gp of silver\)/);
});

test('downtime, discounts, quantity, and formula expense keep the published material minimum', () => {
  assert.match(formatSummary({ ...base, additionalDays: 1 }, 'Success', '2026-09-13'),
    /40 gp \(reduced by 4 gp\) \(includes at least 2\.2 gp of silver\)/);
  assert.match(formatSummary({ ...base, costModifier: '-50%' }, 'Success', '2026-09-12'),
    /22 gp \(includes at least 2\.2 gp of silver\)/);
  assert.match(formatSummary({ ...base, quantity: 2 }, 'Success', '2026-09-12'),
    /88 gp \(includes at least 4\.4 gp of silver\)/);
  assert.match(formatSummary({ ...base, hasFormula: false, formulaOption: 'buy' }, 'Success', '2026-09-12'),
    /46 gp \(includes \+2 gp for formula\) \(includes at least 2\.2 gp of silver\)/);
});

test('failed summaries distinguish the initial material requirement from lost cost', () => {
  const failure = formatSummary(base, 'Failure', '2026-09-12');
  assert.match(failure, /\*\*Cost:\*\* 0 gp/);
  assert.match(failure, /0 gp lost; 22 gp recoverable \(initial supply required at least 2\.2 gp of silver\)/);
  const critical = formatSummary(base, 'Critical Failure', '2026-09-12');
  assert.match(critical, /2\.2 gp lost; 19\.8 gp recoverable/);
});

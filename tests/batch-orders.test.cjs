const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const modules = {};
function load(name) {
  if (modules[name]) return modules[name];
  const source = fs.readFileSync(path.join(__dirname, '../src/utils', `${name}.ts`), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, URL, require: specifier => load(specifier.replace('./', '')) };
  vm.runInNewContext(code, context);
  return modules[name] = context.exports;
}
const batch = load('batchOrders');
const layout = load('sheetLayout');
const input = {
  character: 'Kosta', characterLevel: 15, proficiency: 'legendary',
  clientName: 'Alice', itemName: 'Striking', itemLevel: 4, itemRarity: 'common',
  itemCategory: 'equipment', itemBulk: '0', itemCost: 65, quantity: 1,
  hasFormula: true, formulaOption: '', startDate: '2026-10-29',
  setupDays: 1, additionalDays: 2, useAssurance: false, naturalRoll: '',
  craftingDC: 19, dcAdjustment: 0, craftingRoll: 25,
};
const form = {
  character: 'Kosta', characterLevel: '15', proficiency: 'legendary', clientName: 'Alice', clientDiscordId: '',
  itemName: 'Striking', itemLevel: '4', itemRarity: 'common', itemCategory: 'equipment', itemBulk: '0', itemCost: '65',
  costModifier: '', useMaterial: false, useMagic: false, magicIndex: 0, useUpgrade: false, upgradeChoice: 0,
  runeTransfer: '', selectedMaterial: 'silver', selectedGrade: 'low', quantity: 1, hasFormula: true, formulaOption: '',
  startDate: '2026-10-29', additionalDays: '2', useAssurance: false, naturalRoll: '', craftingDC: '', dcAdjustment: '',
  craftingRoll: '25', discordRollLink: '', addCraftingFee: false, feeOverride: '',
};
const order = (id, changes = {}) => ({ id, input: { ...input, ...changes }, form: { ...form }, overlapAllowed: false });

test('inclusive date checks catch shared days and allow the following day', () => {
  const first = order('a');
  assert.equal(batch.orderEndDate(first.input), '2026-10-31');
  assert.equal(batch.orderConflicts(order('b', { startDate: '2026-10-31' }), [first]).length, 1);
  assert.equal(batch.orderConflicts(order('b', { startDate: '2026-11-01' }), [first]).length, 0);
  assert.equal(batch.orderConflicts(order('b', { startDate: '2026-10-29' }), [first]).length, 1);
  assert.equal(batch.orderConflicts(first, [first]).length, 0);
});

test('failures occupy setup days only, including natural-roll result changes', () => {
  for (const craftingRoll of [5, 15]) {
    const failed = order('a', { craftingRoll, setupDays: 2, additionalDays: 20 });
    assert.equal(batch.orderEndDate(failed.input), '2026-10-30');
    assert.equal(batch.orderConflicts(order('b', { startDate: '2026-10-31' }), [failed]).length, 0);
  }
  assert.equal(batch.orderEndDate(order('a', { craftingRoll: 19, naturalRoll: '1' }).input), '2026-10-29');
  assert.equal(batch.orderEndDate(order('a', { startDate: '2026-12-31' }).input), '2027-01-02');
});

test('edits retain order position and immediately reveal new date conflicts', () => {
  const first = order('a');
  const second = order('b', { startDate: '2026-11-01', clientName: 'Bob' });
  const changed = { ...first, input: { ...first.input, additionalDays: 4 }, overlapAllowed: true };
  const orders = batch.replaceOrder([first, second], changed);
  assert.equal(orders[0].id, 'a');
  assert.equal(orders[1].input.clientName, 'Bob');
  assert.equal(batch.orderConflicts(changed, orders)[0].id, 'b');
  assert.equal(batch.orderConflicts(changed, orders.filter(o => o.id !== 'b')).length, 0);
});

test('Discord combines independent summaries; sheet copy applies one layout to all rows', () => {
  const orders = [order('a'), order('b', { itemName: 'Flaming', clientName: 'Bob', startDate: '2026-11-01' })];
  const text = batch.batchSummary(orders);
  assert.equal((text.match(/\*\*Character:\*\*/g) || []).length, 2);
  assert.ok(text.includes('for Alice'));
  assert.ok(text.includes('for Bob'));
  const columns = layout.defaultSheetLayout();
  const rows = batch.batchSheet(orders, columns).split('\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].split('\t')[10], 'Alice');
  assert.equal(rows[1].split('\t')[10], 'Bob');
  const withHeaders = batch.batchSheet(orders, columns, true).split('\n');
  assert.equal(withHeaders.length, 3);
  assert.ok(withHeaders[0].startsWith('Activity\t'));
  const custom = [{ id: 10, label: 'Customer', enabled: true }, { id: 'blank-1', label: '', enabled: true },
    { id: 12, label: 'Expense', enabled: true, negative: true }];
  assert.equal(batch.batchSheet(orders, custom).split('\n')[0], 'Alice\t\t-32.5');
});

test('saved batches retain draft edits, customization, overrides, and stable IDs', () => {
  const upgraded = order('a', { upgradeFrom: 'Striking', itemName: 'Striking (Greater)', itemCost: 1000 });
  upgraded.form.useUpgrade = true; upgraded.form.upgradeChoice = 1; upgraded.overlapAllowed = true;
  const session = { version: 1, orders: [upgraded], draft: { ...form, useMaterial: true, selectedMaterial: 'silver' }, editingId: 'a' };
  const restored = batch.parseBatch(JSON.stringify(session));
  assert.equal(restored.editingId, 'a');
  assert.equal(restored.orders[0].input.upgradeFrom, 'Striking');
  assert.equal(restored.orders[0].form.upgradeChoice, 1);
  assert.equal(restored.orders[0].overlapAllowed, true);
  assert.equal(restored.draft.selectedMaterial, 'silver');
  assert.equal(restored.draft.useMaterial, true);
  const extra = JSON.parse(JSON.stringify(session));
  extra.orders[0].input.unexpectedScript = 'alert(1)';
  extra.draft.unexpectedScript = 'alert(1)';
  const cleaned = batch.parseBatch(JSON.stringify(extra));
  assert.equal(cleaned.orders[0].input.unexpectedScript, undefined);
  assert.equal(cleaned.draft.unexpectedScript, undefined);
});

test('invalid or incompatible saved batches are rejected safely', () => {
  for (const data of [null, {}, { version: 2, orders: [], draft: form },
    { version: 1, orders: [order('a'), order('a')], draft: form },
    { version: 1, orders: [order('a', { startDate: '2026-02-30' })], draft: form },
    { version: 1, orders: [order('a', { additionalDays: -1 })], draft: form },
    { version: 1, orders: [order('a'), order('b', { character: 'Other' })], draft: form },
    { version: 1, orders: [], draft: { ...form, quantity: '<script>' } },
    { version: 1, orders: [order('a', { costModifier: 'alert(1)' })], draft: form },
  ]) assert.throws(() => batch.parseBatch(JSON.stringify(data)));
  assert.equal(batch.validDate('2028-02-29'), true);
  assert.equal(batch.validDate('2026-02-29'), false);
});

test('blank fields retain the single-order defaults and survive saving', () => {
  const empty = order('empty', { character: '', characterLevel: 0, itemName: '', itemLevel: 0,
    itemCost: 0, startDate: '', craftingDC: 0, craftingRoll: 0 });
  empty.form = { ...form, character: '', characterLevel: '', itemName: '', itemLevel: '',
    itemCost: '', startDate: '', craftingDC: '', craftingRoll: '' };
  const restored = batch.parseBatch(JSON.stringify({ version: 1, orders: [empty], draft: empty.form, editingId: null }));
  assert.equal(restored.orders[0].input.craftingRoll, 0);
  assert.equal(restored.orders[0].input.itemCost, 0);
  assert.equal(restored.orders[0].input.startDate, '');
  assert.equal(batch.orderConflicts(empty, [order('other', { startDate: '' })]).length, 0);
  assert.ok(batch.batchSummary(restored.orders).includes('(0)'));
});

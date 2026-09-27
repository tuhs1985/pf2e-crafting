const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function compile(file, requireFn = () => { throw new Error('Unexpected import'); }) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, require: requireFn };
  vm.runInNewContext(code, context);
  return context.exports;
}

const crafting = compile('src/utils/crafting.ts');
const layout = compile('src/utils/sheetLayout.ts');
const { formatSheetRow, SHEET_COLUMNS } = compile('src/utils/sheetOutput.ts',
  specifier => specifier === './sheetLayout' ? layout : crafting);

const input = {
  character: 'Kosta', itemName: 'Striking (Major)', itemLevel: 19,
  itemRarity: 'uncommon', itemCategory: 'equipment', itemBulk: '0',
  itemCost: 30000, quantity: 1, hasFormula: true, formulaOption: '',
  startDate: '2026-09-27', characterLevel: 19, proficiency: 'legendary',
  useAssurance: false, naturalRoll: '20', craftingDC: 41, dcAdjustment: 2,
  craftingRoll: 43, setupDays: 1, additionalDays: 3,
  upgradeFrom: 'Striking (Greater)',
};

test('sheet row follows pictured columns without a header and uses completion date', () => {
  assert.equal(SHEET_COLUMNS.length, 12);
  assert.deepEqual(formatSheetRow(input, 'Critical Success', '2026-09-30').split('\t'), [
    'Upgrade', '2026-09-30', 'Kosta',
    '1 x Striking (Major) (from Striking (Greater))', 'Critical Success',
    '19', 'uncommon; Custom +2', '41', 'FALSE', '43', 'None', '',
  ]);
});

test('failed attempt uses setup end date and Assurance maps to a sheet checkbox', () => {
  const row = formatSheetRow({ ...input, upgradeFrom: undefined, useAssurance: true },
    'Failure', '2026-09-30').split('\t');
  assert.equal(row[0], 'Crafting');
  assert.equal(row[1], '2026-09-27');
  assert.equal(row[8], 'TRUE');
  assert.equal(row[10], 'None');
});

test('sheet Client prefers the name, with ID fallback', () => {
  assert.equal(formatSheetRow({ ...input, clientName: 'Alice', clientDiscordId: '695405739405082675' }, 'Success', '2026-09-30').split('\t')[10], 'Alice');
  assert.equal(formatSheetRow({ ...input, clientDiscordId: '695405739405082675' }, 'Success', '2026-09-30').split('\t')[10],
    '695405739405082675');
});

test('default sheet copy omits the optional Discord roll link column', () => {
  const row = formatSheetRow(input, 'Success', '2026-09-30');
  const defaultLayout = layout.defaultSheetLayout();
  assert.equal(defaultLayout[11].enabled, false);
  assert.equal(layout.formatLayoutRow(row, defaultLayout).split('\t').length, 11);
  assert.equal(layout.formatLayoutWithHeaders(row, defaultLayout).split('\n')[0].split('\t').length, 11);
});

test('enabling the optional Discord roll link column copies the entered URL', () => {
  const link = 'https://discord.com/channels/123/456/789';
  const row = formatSheetRow({ ...input, discordRollLink: link }, 'Success', '2026-09-30');
  const columns = layout.defaultSheetLayout();
  columns[11].enabled = true;
  assert.equal(layout.formatLayoutRow(row, columns).split('\t')[11], link);
  assert.equal(layout.formatLayoutWithHeaders(row, columns).split('\n')[0].split('\t')[11], 'Discord roll link');
});

test('text is one cell and cannot become a spreadsheet formula', () => {
  const row = formatSheetRow({ ...input, character: '=SUM(1,1)\nnext', itemName: '@cmd\tother' },
    'Success', '2026-09-30').split('\t');
  assert.equal(row.length, 12);
  assert.equal(row[2], "'=SUM(1,1) next");
  assert.equal(row[3], "1 x @cmd other (from Striking (Greater))");
});

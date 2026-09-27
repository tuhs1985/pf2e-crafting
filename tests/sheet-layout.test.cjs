const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/sheetLayout.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(code, context);
const { defaultSheetLayout, validateSheetLayout, parseSheetLayout, serializeSheetLayout,
  formatLayoutRow, formatLayoutWithHeaders } = context.exports;

test('column layout changes order, visibility, and header names without changing values', () => {
  const columns = defaultSheetLayout();
  columns[0].label = 'Task';
  columns[1].enabled = false;
  const moved = [columns[10], ...columns.slice(0, 10)];
  const row = Array.from({ length: 11 }, (_, index) => `value${index}`).join('\t');
  assert.equal(formatLayoutRow(row, moved), ['value10', 'value0', ...Array.from({ length: 8 }, (_, index) => `value${index + 2}`)].join('\t'));
  assert.equal(formatLayoutWithHeaders(row, moved).split('\n')[0].split('\t')[1], 'Task');
});

test('layout backup round trips and rejects missing, duplicate, or unsafe columns', () => {
  const original = defaultSheetLayout();
  const restored = parseSheetLayout(serializeSheetLayout(original));
  assert.equal(JSON.stringify(restored), JSON.stringify(original));
  assert.throws(() => validateSheetLayout(original.slice(1)));
  assert.throws(() => validateSheetLayout(original.map((column, index) => index === 1 ? { ...column, id: 0 } : column)));
  assert.throws(() => validateSheetLayout(original.map(column => ({ ...column, enabled: false }))));
  assert.throws(() => validateSheetLayout(original.map((column, index) => index === 0 ? { ...column, label: 'a\tb' } : column)));
  assert.throws(() => parseSheetLayout('<script>alert(1)</script>'));
});

test('eleven-column saved layouts gain the new roll link column hidden', () => {
  const legacy = defaultSheetLayout().slice(0, 11);
  legacy[0].label = 'Work';
  const migrated = validateSheetLayout(legacy);
  assert.equal(migrated.length, 12);
  assert.equal(migrated[0].label, 'Work');
  assert.equal(migrated[11].label, 'Discord roll link');
  assert.equal(migrated[11].enabled, false);
});

test('formula-looking imported header text is escaped when copied', () => {
  const columns = defaultSheetLayout();
  columns[0].label = '=HYPERLINK("bad")';
  assert.equal(formatLayoutWithHeaders('one\ttwo', columns).split('\n')[0].split('\t')[0], '\'=HYPERLINK("bad")');
});

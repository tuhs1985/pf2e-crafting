const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Compile in memory so these checks do not overwrite the website distribution.
const source = fs.readFileSync(path.join(__dirname, '../src/utils/crafting.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { formatSummary, calculateEndDate, calculateSetupDays, getResultType, applyCostModifier } = context.exports;

test('arithmetic adjusts the existing price with precedence and parentheses', () => {
  for (const [expression, expected] of [
    ['(50-25+10)', 135], ['-25+10', 85], ['2+3*4', 114],
    ['(2+3)*4', 120], ['10/2', 105], ['-(25-10)', 85],
    [' .5 + .25 ', 100.75], ['0.3-0.1', 100.2], ['5--2', 107],
  ]) assert.equal(applyCostModifier(100, expression), expected, expression);
});

test('invalid arithmetic and mixed percentages are rejected instead of partially parsed', () => {
  for (const expression of ['(50-25+10)-50%', '50%+10', '2+', '(2+3', '2 3',
    '2(3)', '10/0', '1/(2-2)', 'NaN', 'Infinity', 'Math.random()', '5gp', '2**3']) {
    assert.throws(() => applyCostModifier(100, expression), undefined, expression);
    assert.notEqual(context.exports.getCostModifierError(expression), '', expression);
  }
  assert.equal(context.exports.getCostModifierError('-25+10'), '');
  assert.equal(context.exports.getCostModifierError(''), '');
});

test('explicit positive percentages are markups, including decimals and whitespace', () => {
  for (const [modifier, expected] of [
    ['+50%', 1500], ['50%', 1500], [' +12.5% ', 1125],
    ['+50 %', 1500], ['-50%', 500], ['-12.5%', 875],
    ['+0%', 1000], ['+50', 1050], ['-50', 950], ['', 1000],
  ]) {
    assert.equal(applyCostModifier(1000, modifier), expected, modifier);
  }
});

const base = {
  character: 'Test', itemName: 'Example', itemLevel: 1,
  itemRarity: 'common', itemCategory: '', itemBulk: '',
  itemCost: 100, quantity: 1, hasFormula: true, formulaOption: '',
  startDate: '2026-09-30', characterLevel: 1, proficiency: 'trained',
  useAssurance: false, craftingDC: 15, dcAdjustment: 0,
  craftingRoll: 10, setupDays: 1, additionalDays: 5,
};

function summary(overrides = {}) {
  const input = { ...base, ...overrides };
  return formatSummary(input, getResultType(input.craftingDC, input.craftingRoll),
    calculateEndDate(input.startDate, input.setupDays, input.additionalDays));
}

test('signed and unsigned percentage markups produce identical summaries', () => {
  for (const craftingRoll of [5, 10, 15, 25]) {
    assert.equal(summary({ craftingRoll, costModifier: '+50%' }),
      summary({ craftingRoll, costModifier: '50%' }));
  }
});

test('decimal discounts and flat adjustments do not expose floating point noise', () => {
  assert.equal(applyCostModifier(10, '-90%'), 1);
  assert.equal(applyCostModifier(0.3, '-0.1'), 0.2);
  assert.match(summary({ itemCost: 10, costModifier: '-90%', craftingRoll: 15,
    additionalDays: 0 }), /\*\*Cost:\*\* 1 gp\n/);
});

test('discounted price reaches the correct half-price reduction limit', () => {
  assert.match(summary({ itemCost: 10, costModifier: '-90%', craftingRoll: 15,
    additionalDays: 100 }), /\*\*Cost:\*\* 0\.5 gp \(reduced by 0\.5 gp\)/);
});

test('batch multiplication is normalized before flooring the reduction limit', () => {
  assert.match(summary({ itemCost: 0.29, quantity: 2, craftingRoll: 15,
    additionalDays: 100 }), /\*\*Cost:\*\* 0\.29 gp \(reduced by 0\.29 gp\)/);
});

test('legitimate fractional copper prices are preserved', () => {
  assert.equal(applyCostModifier(0.01, '-50%'), 0.005);
  assert.match(summary({ itemCost: 0.01, costModifier: '-50%', craftingRoll: 15,
    additionalDays: 0 }), /\*\*Cost:\*\* 0\.005 gp\n/);
});

test('formula choices determine setup time and ownership ignores stale choices', () => {
  for (const formulaOption of ['', 'work', 'buy']) {
    assert.equal(calculateSetupDays({ hasFormula: true, formulaOption }), 1);
    assert.equal(calculateSetupDays({ hasFormula: false, formulaOption }),
      formulaOption === 'buy' ? 1 : 2);
  }
});

test('owned formula never adds a purchase charge, even with a stale buy choice', () => {
  for (const craftingRoll of [5, 10, 15, 25]) {
    assert.equal(summary({ craftingRoll, formulaOption: 'buy', hasFormula: true }),
      summary({ craftingRoll }));
  }
});

test('failure recovers all supplied materials and spends only setup days', () => {
  const output = summary();
  assert.match(output, /\*\*Days:\*\* 09\/30\n/);
  assert.match(output, /\*\*Cost:\*\* 0 gp\n/);
  assert.match(output, /0 gp lost; 50 gp recoverable/);
  assert.doesNotMatch(output, /\*\*Outcome:\*\*/);
  assert.doesNotMatch(output, /reduced by/);
});

test('critical failure loses ten percent of supplied materials', () => {
  const output = summary({ craftingRoll: 5 });
  assert.match(output, /\*\*Cost:\*\* 5 gp\n/);
  assert.match(output, /5 gp lost; 45 gp recoverable/);
});

test('two setup days cross the month boundary without additional days', () => {
  assert.match(summary({ hasFormula: false, formulaOption: 'work', setupDays: 2 }),
    /\*\*Days:\*\* 09\/30-10\/01\n/);
});

test('formula purchase remains an expense on both failed outcomes', () => {
  for (const craftingRoll of [10, 5]) {
    const output = summary({ hasFormula: false, formulaOption: 'buy', craftingRoll });
    assert.match(output, new RegExp(`\\*\\*Cost:\\*\\* ${craftingRoll === 10 ? 1 : 6} gp`));
    assert.match(output, /includes \+1 gp for formula; formula retained/);
  }
});

test('critical failure applies adjusted batch price and handles free items', () => {
  assert.match(summary({ quantity: 4, costModifier: '-20%', craftingRoll: 5 }),
    /16 gp lost; 144 gp recoverable/);
  assert.match(summary({ itemCost: 0, craftingRoll: 5 }), /0 gp lost; 0 gp recoverable/);
});

test('small prices retain fractional copper without floating point noise', () => {
  assert.match(summary({ itemCost: 0.01, craftingRoll: 5 }),
    /0.0005 gp lost; 0.0045 gp recoverable/);
});

test('success and critical success keep their original cost and dates', () => {
  for (const [craftingRoll, cost] of [[15, 99], [25, 98.5]]) {
    const output = summary({ craftingRoll });
    assert.match(output, /\*\*Days:\*\* 09\/30-10\/05\n/);
    assert.ok(output.includes(`**Cost:** ${cost} gp`));
    assert.doesNotMatch(output, /recoverable|not completed/);
  }
});

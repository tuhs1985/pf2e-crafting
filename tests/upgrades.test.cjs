const { test } = require('node:test');
const assert = require('node:assert/strict');
const { upgradeLinks } = require('../upgrade-paths.cjs');
const db = require('../src/data/items.db.json');
const { VARIANTS } = require('../handwraps-variants.cjs');

function linksFor(name) {
  const index = db.n.indexOf(name);
  assert.ok(index >= 0, name);
  return db.u[index].map(prior => db.n[prior]);
}

test('known permanent upgrades offer all cheaper lower versions', () => {
  assert.deepEqual(linksFor('Striking (Major)'), ['Striking', 'Striking (Greater)']);
  assert.deepEqual(linksFor('Weapon Potency (+3)'), ['Weapon Potency (+1)', 'Weapon Potency (+2)']);
  assert.deepEqual(linksFor('Sturdy Shield (Greater)'),
    ['Sturdy Shield (Minor)', 'Sturdy Shield (Lesser)', 'Sturdy Shield (Moderate)']);
});

test('handwrap rune combinations include each published predecessor', () => {
  for (const { name, level, cost } of VARIANTS) {
    const index = db.n.indexOf(name);
    assert.ok(index >= 0, name);
    assert.equal(db.i[index][5], level);
    assert.equal(db.p[db.i[index][3]], cost);
  }
  assert.deepEqual(linksFor('Handwraps of Mighty Blows (+1 Striking)'),
    ['Handwraps of Mighty Blows']);
  assert.deepEqual(linksFor('Handwraps of Mighty Blows (+3 Major Striking)'), [
    'Handwraps of Mighty Blows',
    'Handwraps of Mighty Blows (+1 Striking)',
    'Handwraps of Mighty Blows (+2 Striking)',
    'Handwraps of Mighty Blows (+2 Greater Striking)',
    'Handwraps of Mighty Blows (+3 Greater Striking)',
  ]);
});

test('distinct variants, consumables, and equal-price versions are excluded', () => {
  assert.deepEqual(linksFor('Aeon Stone (Amber Sphere)'), []);
  assert.deepEqual(linksFor('Healing Potion (Greater)'), []);
  assert.deepEqual(linksFor('Mycoweave Shield (Major)'), []);
});

test('new unclear variants do not generate upgrade links', () => {
  const row = (name, level, cost, consumable=false) =>
    ({ name, level, cost, consumable, metadata: ['equipment'] });
  assert.deepEqual(upgradeLinks([row('Stone (Red)', 1, 10), row('Stone (Blue)', 2, 20)]), [[], []]);
  assert.deepEqual(upgradeLinks([row('Charm', 1, 10), row('Charm (Greater)', 2, 20, true)]), [[], []]);
  assert.deepEqual(upgradeLinks([row('Charm', 1, 10), row('Charm (Greater)', 2, 10)]), [[], []]);
});

// Deliberately narrow tier vocabulary. A shared name stem alone does not mean
// two items are versions of one another (Aeon Stones are a counterexample).
const TIERS = new Set(['minor', 'lesser', 'moderate', 'greater', 'major', 'true', 'supreme']);
const { BASE: HANDWRAPS, VARIANTS: HANDWRAPS_VARIANTS } = require('./handwraps-variants.cjs');

function tierName(name) {
  const match = name.match(/^(.*) \(([^()]*)\)$/);
  if (!match) return { stem: name, tiered: false };
  const suffix = match[2].toLowerCase();
  const tiered = TIERS.has(suffix) || /^\+[123]$/.test(suffix) || /^type (?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(suffix);
  return { stem: match[1], tiered };
}

function upgradeLinks(items) {
  const groups = new Map();
  items.forEach((item, index) => {
    if (item.consumable) return;
    const { stem, tiered } = tierName(item.name);
    const group = groups.get(stem) ?? [];
    group.push({ ...item, index, tiered });
    groups.set(stem, group);
  });
  const links = items.map(() => []);
  for (const group of groups.values()) {
    if (group.length < 2 || !group.some(item => item.tiered) ||
        group.some(item => item.name !== tierName(item.name).stem && !item.tiered) ||
        new Set(group.map(item => item.metadata[0])).size !== 1) continue;
    for (const target of group) {
      // Level and price both must improve. Equal-price or anomalous source rows
      // must not produce free or backwards upgrades.
      links[target.index] = group
        .filter(prior => prior.index !== target.index && prior.level < target.level && prior.cost < target.cost)
        .sort((a, b) => a.level - b.level || a.cost - b.cost)
        .map(prior => prior.index);
    }
  }
  const handwrapNames = new Set([HANDWRAPS, ...HANDWRAPS_VARIANTS.map(item => item.name)]);
  const handwraps = items.map((item, index) => ({ ...item, index }))
    .filter(item => handwrapNames.has(item.name) && !item.consumable)
    .sort((a, b) => a.level - b.level || a.cost - b.cost);
  if (handwraps.some(item => item.name === HANDWRAPS)) {
    for (const target of handwraps) {
      links[target.index] = handwraps
        .filter(prior => prior.level < target.level && prior.cost < target.cost &&
          prior.metadata[0] === target.metadata[0])
        .map(prior => prior.index);
    }
  }
  return links;
}

module.exports = { tierName, upgradeLinks };

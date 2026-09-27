// GM Core's typical rune combinations are listed separately on Archives of
// Nethys (https://2e.aonprd.com/Equipment.aspx?ID=3086), but Foundry stores
// only the 35 gp +1 handwraps as an equipment row.
// The base Foundry row already represents the first combination.
const BASE = 'Handwraps of Mighty Blows';
const VARIANTS = [
  ['+1 Striking', 4, 100],
  ['+2 Striking', 10, 1000],
  ['+2 Greater Striking', 12, 2000],
  ['+3 Greater Striking', 16, 10000],
  ['+3 Major Striking', 19, 40000],
].map(([suffix, level, cost]) => ({ name: `${BASE} (${suffix})`, level, cost }));

module.exports = { BASE, VARIANTS };
